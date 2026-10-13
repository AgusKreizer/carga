import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'ar.carga.app',
  appName: 'Carga',
  webDir: 'dist',
  backgroundColor: '#0b0b0d',
  android: { backgroundColor: '#0b0b0d', allowMixedContent: false },
  server: { androidScheme: 'https' },
  plugins: {
    LocalNotifications: { smallIcon: 'ic_stat_icon', iconColor: '#ffb020' },
  },
}

export default config
