/**
 * La API key de Maps SDK for Android se suministra desde EAS Environment.
 * Nunca guardarla en app.json, eas.json, ni usarla para llamar APIs de servidor.
 * La clave ES visible en el binario Android: restringirla en Google Cloud por
 * package name + SHA-1 del certificado EAS (y API: Maps SDK for Android).
 */
module.exports = ({ config }) => {
  const key = (process.env.GOOGLE_MAPS_ANDROID_API_KEY || '').trim();
  const enabled = !!key && process.env.EXPO_PUBLIC_MAPA_OFF !== '1';

  return {
    ...config,
    plugins: [
      ...(config.plugins || []),
      ...(enabled ? [['react-native-maps', { androidGoogleMapsApiKey: key }]] : []),
    ],
    extra: {
      ...config.extra,
      mapsEnabled: enabled,
    },
  };
};
