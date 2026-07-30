
import { Redirect } from 'expo-router';

export default function Index() {
  // TODO: revisar si hay sesión activa
  // const token = await AsyncStorage.getItem('token');
  // if (token) return <Redirect href="/(tabs)" />;

  return <Redirect href="/login" />;
}