import { useCallback, useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform, Pressable, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Text } from 'panelui-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { loadInCallManager, loadWebRTC } from '../calls/webrtc';
import { useIncomingCall, type IncomingCall } from '../calls/CallProvider';
import { usePreferences } from '../preferences/PreferencesProvider';

type Phase = 'loading' | 'ringing' | 'connecting' | 'connected' | 'ended' | 'declined' | 'missed' | 'failed';

const POLL_MS = 800;
const FINAL: Phase[] = ['ended', 'declined', 'missed', 'failed'];

const formatDuration = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

async function ensureMicrophone() {
  if (Platform.OS !== 'android') return true;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export default function CallScreen() {
  const { t } = usePreferences();
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();
  const { incoming, clear, open } = useIncomingCall();
  const [call, setCall] = useState<IncomingCall | null>(incoming);
  const [phase, setPhase] = useState<Phase>(incoming ? 'ringing' : 'loading');
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const session = useRef<any>({ stopped: false });

  const leave = useCallback(() => {
    clear();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [clear, router]);

  const cleanup = useCallback(() => {
    const current = session.current;
    current.stopped = true;
    clearInterval(current.timer);
    current.pc?.close();
    loadInCallManager()?.stop();
    current.stream?.getTracks().forEach((track: any) => track.stop());
  }, []);

  useEffect(() => {
    session.current = { stopped: false };
    return cleanup;
  }, [cleanup]);

  // Opened from a push with a cold start: look the ringing call up.
  useEffect(() => {
    if (call) return;
    void api.get('/calls/incoming').then((result) => {
      if (result?.call) {
        setCall(result.call);
        setPhase('ringing');
        open(result.call);
      } else leave();
    }).catch(leave);
  }, [call, leave, open]);

  const finish = useCallback((next: Phase) => {
    cleanup();
    clear();
    setPhase(next);
  }, [cleanup, clear]);

  // Detect that the operator hung up while the phone is still ringing.
  useEffect(() => {
    if (!call || phase !== 'ringing') return;
    const timer = setInterval(() => {
      api.get(`/calls/${call.id}`).then((result) => {
        if (result?.status === 'missed' || result?.status === 'ended') finish('missed');
      }).catch(() => undefined);
    }, 1500);
    return () => clearInterval(timer);
  }, [call, phase, finish]);

  useEffect(() => {
    if (phase !== 'connected') return;
    const startedAt = Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (!FINAL.includes(phase) || phase === 'failed') return;
    const timer = setTimeout(leave, 1500);
    return () => clearTimeout(timer);
  }, [phase, leave]);

  const fail = (message: string) => {
    if (call) void api.post(`/calls/${call.id}/end`, {}).catch(() => undefined);
    cleanup();
    clear();
    setError(message);
    setPhase('failed');
  };

  const decline = async () => {
    if (call) await api.post(`/calls/${call.id}/decline`, {}).catch(() => undefined);
    finish('declined');
  };

  const accept = async () => {
    if (!call) return;
    const webrtc = loadWebRTC();
    if (!webrtc) return fail('Calls need the installed app build (not Expo Go)');
    try {
      if (!(await ensureMicrophone())) return fail('Microphone access was denied');
      const current = session.current;
      setPhase('connecting');
      clear();
      const audio = loadInCallManager();
      audio?.start({ media: 'audio' });
      audio?.setForceSpeakerphoneOn(false);
      current.stream = await webrtc.mediaDevices.getUserMedia({ audio: true, video: false });
      const { iceServers } = await api.get('/calls/ice-servers');
      current.pc = new webrtc.RTCPeerConnection({ iceServers });
      current.stream.getTracks().forEach((track: any) => current.pc.addTrack(track, current.stream));
      current.pc.addEventListener('icecandidate', (event: any) => {
        if (event.candidate) void api.post(`/calls/${call.id}/signal`, { kind: 'ice', data: event.candidate.toJSON() }).catch(() => undefined);
      });
      current.pc.addEventListener('connectionstatechange', () => {
        const state = current.pc?.connectionState;
        if (state === 'connected') setPhase('connected');
        if (state === 'failed') fail('Connection failed');
      });
      current.after = 0;
      current.pending = [];
      current.remoteSet = false;
      await api.post(`/calls/${call.id}/accept`, {});

      const handle = async (signal: any) => {
        if (signal.kind === 'offer') {
          await current.pc.setRemoteDescription(new webrtc.RTCSessionDescription(signal.data));
          current.remoteSet = true;
          for (const candidate of current.pending.splice(0)) await current.pc.addIceCandidate(new webrtc.RTCIceCandidate(candidate));
          const answer = await current.pc.createAnswer();
          await current.pc.setLocalDescription(answer);
          await api.post(`/calls/${call.id}/signal`, { kind: 'answer', data: { type: answer.type, sdp: answer.sdp } });
        } else if (signal.kind === 'ice') {
          if (current.remoteSet) await current.pc.addIceCandidate(new webrtc.RTCIceCandidate(signal.data));
          else current.pending.push(signal.data);
        }
      };
      current.timer = setInterval(async () => {
        if (current.stopped || current.busy) return;
        current.busy = true;
        try {
          const result = await api.get(`/calls/${call.id}/signals?after=${current.after}`);
          for (const signal of result.signals) {
            current.after = Math.max(current.after, signal.id);
            await handle(signal);
          }
          if (['ended', 'missed', 'declined'].includes(result.status)) finish('ended');
        } catch {
          // Transient network errors are retried on the next tick.
        } finally {
          current.busy = false;
        }
      }, POLL_MS);
    } catch (caught: any) {
      fail(caught?.message ?? 'Connection failed');
    }
  };

  const hangUp = async () => {
    if (call) await api.post(`/calls/${call.id}/end`, {}).catch(() => undefined);
    finish('ended');
  };

  const toggleSpeaker = () => {
    const next = !speaker;
    loadInCallManager()?.setForceSpeakerphoneOn(next);
    setSpeaker(next);
  };

  const toggleMute = () => {
    const next = !muted;
    session.current.stream?.getAudioTracks().forEach((track: any) => {
      track.enabled = !next;
    });
    setMuted(next);
  };

  const status = phase === 'connected'
    ? formatDuration(seconds)
    : t({
      loading: 'Calling…',
      ringing: 'Incoming call',
      connecting: 'Connecting…',
      ended: 'Call ended',
      declined: 'Call declined',
      missed: 'Call ended',
      failed: 'Call failed',
    }[phase]);

  return (
    <View className="flex-1 items-center justify-between bg-[#14181f]" style={{ paddingTop: top + 64, paddingBottom: bottom + 48 }}>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <View className="items-center gap-4 px-6">
        <View className="h-28 w-28 items-center justify-center rounded-full bg-[#2D60FF]">
          <Ionicons color="#ffffff" name="person" size={56} />
        </View>
        <Text className="text-center text-white" size="2xl" weight="semibold">{call?.staffName ?? ''}</Text>
        <Text className="text-center text-white/70" size="base">{status}</Text>
        {error ? <Text className="text-center text-red-400" size="sm">{t(error)}</Text> : null}
      </View>

      {phase === 'ringing' ? (
        <View className="w-full flex-row justify-around px-10">
          <CircleButton color="#e5484d" icon="call" label={t('Decline')} onPress={decline} rotate />
          <CircleButton color="#30a46c" icon="call" label={t('Accept')} onPress={accept} />
        </View>
      ) : null}
      {phase === 'connecting' || phase === 'connected' ? (
        <View className="w-full flex-row justify-around px-6">
          <CircleButton color={muted ? '#ffffff' : '#ffffff33'} dark={muted} icon={muted ? 'mic-off' : 'mic'} label={t(muted ? 'Unmute' : 'Mute')} onPress={toggleMute} />
          <CircleButton color={speaker ? '#ffffff' : '#ffffff33'} dark={speaker} icon={speaker ? 'volume-high' : 'volume-medium'} label={t('Speaker')} onPress={toggleSpeaker} />
          <CircleButton color="#e5484d" icon="call" label={t('End call')} onPress={hangUp} rotate />
        </View>
      ) : null}
      {phase === 'failed' ? <CircleButton color="#ffffff33" icon="close" label={t('Close')} onPress={leave} /> : null}
      {phase === 'loading' || FINAL.includes(phase) && phase !== 'failed' ? <View /> : null}
    </View>
  );
}

function CircleButton({ color, icon, label, onPress, rotate, dark }: {
  color: string;
  icon: 'call' | 'mic' | 'mic-off' | 'close' | 'volume-high' | 'volume-medium';
  label: string;
  onPress: () => void;
  rotate?: boolean;
  dark?: boolean;
}) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" className="items-center gap-2" onPress={onPress}>
      <View className="h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: color }}>
        <Ionicons color={dark ? '#14181f' : '#ffffff'} name={icon} size={30} style={rotate ? { transform: [{ rotate: '135deg' }] } : undefined} />
      </View>
      <Text className="text-white/80" size="sm">{label}</Text>
    </Pressable>
  );
}
