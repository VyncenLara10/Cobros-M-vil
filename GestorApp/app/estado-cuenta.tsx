/** Portal limitado para candidatos: sin acceso a servicios ni datos del equipo. */
import { Colors, Spacing, Typography } from '@/constants/DesignTokens';
import { useSesion } from '@/domain/auth/sesion';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';

type Estado = 'pendiente' | 'aprobado' | 'rechazado';
type Solicitud = {
  id: string;
  estado: Estado;
  motivo_rechazo: string | null;
  creado_en: string;
  revisado_en: string | null;
};

const DOCUMENTOS = [
  ['doc_dpi_frente', 'DPI: frente'],
  ['doc_dpi_reverso', 'DPI: reverso'],
  ['doc_antecedentes_penales', 'Antecedentes penales'],
  ['doc_licencia', 'Licencia de conducir'],
  ['doc_tarjeta_circulacion', 'Tarjeta de circulación'],
  ['doc_foto_vehiculo', 'Fotografía del vehículo'],
  ['doc_carne_colegiado', 'Carné de colegiado'],
  ['doc_foto_perfil', 'Fotografía de perfil'],
] as const;

export default function EstadoCuenta() {
  const router = useRouter();
  const { cerrarSesion } = useSesion();
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [documentos, setDocumentos] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState<string | null>(null);

  const actualizar = useCallback(async () => {
    setCargando(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setMensaje('La sesión venció. Vuelve a iniciar sesión.');
      setCargando(false);
      return;
    }
    const { data, error } = await supabase.from('solicitudes_registro')
      .select('id, estado, motivo_rechazo, creado_en, revisado_en')
      .eq('perfil_id', auth.user.id)
      .order('creado_en', { ascending: false }).limit(1).maybeSingle();
    if (error) setMensaje('No se pudo consultar el estado: ' + error.message);
    else { setSolicitud(data); setMensaje(null); }
    setCargando(false);
  }, []);
  useEffect(() => { void actualizar(); }, [actualizar]);

  const elegirDocumento = async (columna: string) => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso necesario', 'Autoriza acceso a tus fotografías para reemplazar la papelería.');
      return;
    }
    const seleccionado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], quality: 0.8, allowsEditing: false,
    });
    if (seleccionado.canceled || !seleccionado.assets[0]?.uri) return;
    const uri = seleccionado.assets[0].uri;
    setProcesando(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw Error('Sesión vencida');
      const respuesta = await fetch(uri);
      const blob = await respuesta.blob();
      if (blob.size > 8 * 1024 * 1024) throw Error('Máximo 8 MB por documento');
      if (!['image/jpeg','image/png'].includes(blob.type)) {
        throw Error('Solo se permiten imágenes JPG o PNG');
      }
      const extension = blob.type === 'image/png' ? 'png' : 'jpg';
      // Nombre nuevo, nunca sobrescribe la evidencia rechazada.
      const ruta = `${auth.user.id}/${columna}_${Date.now()}.${extension}`;
      const { error } = await supabase.storage.from('documentos')
        .upload(ruta, blob, { contentType: blob.type, upsert: false });
      if (error) throw error;
      setDocumentos((prev) => ({ ...prev, [columna]: ruta }));
      setMensaje('Documento cargado. Envíalo a revisión cuando termines.');
    } catch (error) {
      Alert.alert('No se pudo subir', error instanceof Error ? error.message : 'Inténtalo de nuevo.');
    } finally { setProcesando(false); }
  };

  const reenviar = async () => {
    if (!solicitud || !Object.keys(documentos).length) return;
    setProcesando(true);
    const { error } = await supabase.rpc('reenviar_papeleria', {
      p_solicitud: solicitud.id, p_documentos: documentos,
    });
    setProcesando(false);
    if (error) { Alert.alert('No se pudo reenviar', error.message); return; }
    setDocumentos({});
    Alert.alert('Enviado', 'La empresa revisará nuevamente tu solicitud.');
    await actualizar();
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.background }}
      contentContainerStyle={{ padding: Spacing.xl, paddingTop: 64, gap: 18 }}>
      <Ionicons name="id-card-outline" size={42} color={Colors.primary}/>
      <Text style={[Typography.title, { color: Colors.textPrimary }]}>Estado de tu cuenta</Text>
      <Text style={{ color: Colors.textSecondary }}>
        Puedes consultar tu aprobación y corregir documentos. Los servicios de la empresa
        permanecerán bloqueados hasta que un administrador te autorice.
      </Text>
      {cargando ? <ActivityIndicator color={Colors.primary}/> : (
        <View style={{ backgroundColor: Colors.surface, borderRadius: 14, padding: 18, gap: 12 }}>
          <Text style={[Typography.subtitle, { color: Colors.textPrimary }]}>
            {solicitud?.estado === 'aprobado' ? 'Cuenta aprobada' :
              solicitud?.estado === 'rechazado' ? 'Correcciones necesarias' :
              solicitud ? 'Pendiente de revisión' : 'Solicitud aún no enviada'}
          </Text>
          <Text style={{ color: Colors.textSecondary }}>
            {solicitud?.estado === 'aprobado'
              ? 'Tu cuenta fue aprobada. Cierra sesión e ingresa nuevamente para abrir tus herramientas.'
              : solicitud?.estado === 'rechazado'
                ? 'Lee el motivo, reemplaza la papelería solicitada y envíala nuevamente.'
                : solicitud ? 'Estamos revisando tus datos. Consulta aquí cuando lo necesites.'
                  : 'No encontramos una solicitud asociada. Contacta a administración para recuperar tu registro.'}
          </Text>
          {solicitud?.motivo_rechazo ? (
            <Text style={{ color: Colors.textPrimary }}>
              Motivo de la revisión: {solicitud.motivo_rechazo}
            </Text>
          ) : null}
          {solicitud?.estado === 'rechazado' ? (
            <View style={{ gap: 12 }}>
              {DOCUMENTOS.map(([columna, nombre]) => (
                <Pressable key={columna} disabled={procesando} onPress={() => void elegirDocumento(columna)}
                  style={{ padding: 13, borderWidth: 1, borderColor: Colors.border, borderRadius: 9 }}>
                  <Text style={{ color: Colors.textPrimary }}>
                    {documentos[columna] ? '✓ ' : '+ '}{nombre}
                  </Text>
                </Pressable>
              ))}
              <Pressable disabled={procesando || !Object.keys(documentos).length}
                onPress={() => void reenviar()}
                style={{ backgroundColor: Colors.primary, padding: 15, borderRadius: 10, opacity: procesando ? 0.5 : 1 }}>
                <Text style={{ textAlign: 'center', color: '#fff', fontWeight: '700' }}>
                  {procesando ? 'Procesando…' : 'Enviar documentos corregidos'}
                </Text>
              </Pressable>
            </View>
          ) : null}
          {mensaje ? <Text style={{ color: Colors.textSecondary }}>{mensaje}</Text> : null}
          <Pressable onPress={() => void actualizar()} disabled={cargando}>
            <Text style={{ color: Colors.primary, fontWeight: '700' }}>Actualizar estado</Text>
          </Pressable>
        </View>
      )}
      <Pressable onPress={async () => { await cerrarSesion(); router.replace('/login'); }}
        style={{ padding: 15, borderWidth: 1, borderColor: Colors.border, borderRadius: 10 }}>
        <Text style={{ textAlign: 'center', color: Colors.textPrimary }}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}
