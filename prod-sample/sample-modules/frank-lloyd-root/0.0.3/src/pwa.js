export const defaultSplashScreen = 'http://localhost:3001/static/modules/frank-lloyd-root/0.0.3/assets/pwa-icon-512px.png';
export const defaultIcon = 'http://localhost:3001/static/modules/frank-lloyd-root/0.0.3/assets/pwa-icon-192px.png';
export const appleIcon = 'http://localhost:3001/static/modules/frank-lloyd-root/0.0.3/assets/pwa-icon-180px.png';

export const scope = '/';
// eslint-disable-next-line camelcase
export const start_url = '/success';
// eslint-disable-next-line camelcase
export const theme_color = '#FDB92D';

export default {
  enabled: true,
  scope,
  manifest: {
    scope,
    start_url,
    name: 'Frank Lloyd Root',
    short_name: 'frank lloyd root',
    display: 'standalone',
    theme_color,
    background_color: '#FFF',
    icons: [
      {
        src: appleIcon,
        type: 'image/png',
        sizes: '180x180',
      },
      {
        src: defaultIcon,
        type: 'image/png',
        sizes: '192x192',
      },
      {
        src: defaultSplashScreen,
        type: 'image/png',
        sizes: '512x512',
      },
    ],
  },
};
