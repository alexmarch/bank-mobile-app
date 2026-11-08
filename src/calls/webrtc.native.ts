type WebRTC = typeof import('react-native-webrtc');

let cached: WebRTC | null | undefined;

// The native module is missing in Expo Go; calls then report "unsupported" instead of crashing the app.
export function loadWebRTC(): WebRTC | null {
  if (cached !== undefined) return cached;
  try {
    cached = require('react-native-webrtc') as WebRTC;
  } catch {
    cached = null;
  }
  return cached;
}

type InCall = {
  start(options: { media: 'audio' }): void;
  stop(): void;
  setForceSpeakerphoneOn(flag: boolean): void;
};

// Routes call audio (earpiece by default, optionally the loudspeaker); silently absent in Expo Go.
export function loadInCallManager(): InCall | null {
  try {
    return require('react-native-incall-manager').default as InCall;
  } catch {
    return null;
  }
}
