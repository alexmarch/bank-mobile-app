import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { getPreference, setPreference } from '../preferences/storage';

const POLL_MS = 10_000;

type SupportChatState = {
  unread: number;
  setChatOpen: (open: boolean) => void;
  markSeen: (lastMessageId?: number) => void;
};

const SupportChatContext = createContext<SupportChatState>({ unread: 0, setChatOpen: () => {}, markSeen: () => {} });

export const useSupportChat = () => useContext(SupportChatContext);

let player: AudioPlayer | null = null;

function playChime() {
  try {
    player ??= createAudioPlayer(require('../../assets/sounds/notify.wav'));
    player.seekTo(0);
    player.play();
  } catch {
    // The chime is a nicety and must never break polling.
  }
}

// Support replies create no notification for the customer, so unread messages are tracked here.
export function SupportChatProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userKey = session?.user.email;
  const [unread, setUnread] = useState(0);
  const seenId = useRef<number | null>(null);
  const notifiedId = useRef<number | null>(null);
  const chatOpen = useRef(false);
  const messages = useRef<any[]>([]);
  const storageKey = userKey ? `support-chat-seen.${userKey.replace(/[^A-Za-z0-9._-]/g, '_')}` : null;

  const recount = useCallback(() => {
    const seen = seenId.current ?? 0;
    setUnread(messages.current.filter((message) => message.senderRole !== 'customer' && message.id > seen).length);
  }, []);

  const markSeen = useCallback((lastMessageId?: number) => {
    const latest = lastMessageId ?? Math.max(0, ...messages.current.map((message) => message.id));
    if (!latest || latest <= (seenId.current ?? 0)) return;
    seenId.current = latest;
    if (storageKey) void setPreference(storageKey, String(latest));
    recount();
  }, [recount, storageKey]);

  const setChatOpen = useCallback((open: boolean) => {
    chatOpen.current = open;
    if (open) markSeen();
  }, [markSeen]);

  useEffect(() => {
    seenId.current = null;
    notifiedId.current = null;
    messages.current = [];
    setUnread(0);
    if (!storageKey) return undefined;

    let active = true;
    const poll = async () => {
      try {
        const thread = await api.get('/me/support-chat');
        if (!active) return;
        messages.current = thread?.messages ?? [];
        const latest = Math.max(0, ...messages.current.map((message) => message.id));
        const latestStaff = Math.max(0, ...messages.current.filter((message) => message.senderRole !== 'customer').map((message) => message.id));

        if (seenId.current == null) {
          const stored = Number(await getPreference(storageKey));
          // The first run treats existing history as read.
          seenId.current = Number.isFinite(stored) && stored > 0 ? stored : latest;
          notifiedId.current = Math.max(seenId.current, latestStaff);
        }
        if (latestStaff > (notifiedId.current ?? 0)) {
          notifiedId.current = latestStaff;
          playChime();
        }
        if (chatOpen.current) markSeen(latest);
        else recount();
      } catch {
        // Offline or signed out: keep the last known badge.
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [markSeen, recount, storageKey]);

  const value = useMemo(() => ({ unread, setChatOpen, markSeen }), [unread, setChatOpen, markSeen]);
  return <SupportChatContext.Provider value={value}>{children}</SupportChatContext.Provider>;
}
