import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.whisper.hub.pro',
  appName: 'WhisperHub Pro',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0a0a0a',
      overlaysWebView: true,
    },
    Keyboard: {
      resizeOnFullScreen: true,
      hideFormAccessoryBar: false,
    },
  },
};

export default config;
