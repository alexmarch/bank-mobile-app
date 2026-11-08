import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform, Vibration } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthProvider';

export type IncomingCall = { id: string; staffName: string; status: string };

type CallContextValue = { incoming: IncomingCall | null; clear: () => void; open: (call: IncomingCall) => void };

const CallContext = createContext<CallContextValue>({ incoming: null, clear: () => undefined, open: () => undefined });

const POLL_MS = 3000;
const RING_PATTERN = [0, 800, 600];

export const useIncomingCall = () => useContext(CallContext);

// While the app is open the incoming call is found by polling; with the app closed the push opens /call.
export function CallProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const onCallScreen = useRef(false);
  const handled = useRef<string | null>(null);
  onCallScreen.current = pathname === '/call';

  const open = useCallback((call: IncomingCall) => {
    setIncoming(call);
    if (!onCallScreen.current) router.push('/call');
  }, [router]);

  const clear = useCallback(() => {
    setIncoming(null);
    Vibration.cancel();
  }, []);

  useEffect(() => {
    if (!session || Platform.OS === 'web') return;
    let stopped = false;
    const poll = async () => {
      if (AppState.currentState !== 'active') return;
      try {
        const result = await api.get('/calls/incoming');
        const call = result?.call as IncomingCall | null;
        if (stopped || !call || handled.current === call.id) return;
        handled.current = call.id;
        open(call);
      } catch {
        // The next tick retries.
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [session, open]);

  useEffect(() => {
    if (incoming?.status === 'ringing' && Platform.OS !== 'web') Vibration.vibrate(RING_PATTERN, true);
    return () => Vibration.cancel();
  }, [incoming?.id, incoming?.status]);

  const value = useMemo(() => ({ incoming, clear, open }), [incoming, clear, open]);
  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}
