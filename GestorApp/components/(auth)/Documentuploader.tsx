import { Colors, Radius, Spacing, Typography } from '@/constants/DesignTokens';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

export type EstadoDocumento = 'vacio' | 'cargado';

interface DocumentUploaderProps {
  titulo: string;
  descripcion?: string;
  obligatorio?: boolean;
  onChange?: (uri: string | null) => void;
}

/**
 * Selector de documento/foto. Solo guarda la imagen en memoria local
 * del dispositivo (useState), no hay subida real a ningun servidor.
 * Cuando se conecte el backend, el onChange(uri) es el punto donde
 * se dispara el upload real (multipart o presigned URL de S3).
 */
export default function DocumentUploader({
  titulo,
  descripcion,
  obligatorio,
  onChange,
}: DocumentUploaderProps) {
  const [uri, setUri] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoDocumento>('vacio');

  const seleccionarImagen = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert(
        'Permiso necesario',
        'Se necesita acceso a tus fotos para adjuntar el documento.',
      );
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    });

    if (!resultado.canceled && resultado.assets?.length) {
      const nuevaUri = resultado.assets[0].uri;
      setUri(nuevaUri);
      setEstado('cargado');
      onChange?.(nuevaUri);
    }
  };

  const quitarImagen = () => {
    setUri(null);
    setEstado('vacio');
    onChange?.(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>
          {titulo}
          {obligatorio ? <Text style={styles.required}> *</Text> : null}
        </Text>
        {estado === 'cargado' ? (
          <View style={styles.badgeOk}>
            <Ionicons name="checkmark-circle" size={13} color={Colors.success} />
            <Text style={styles.badgeOkText}>Adjuntado</Text>
          </View>
        ) : null}
      </View>
      {descripcion ? <Text style={styles.descripcion}>{descripcion}</Text> : null}

      {uri ? (
        <View style={styles.previewWrap}>
          <Image source={{ uri }} style={styles.preview} />
          <Pressable style={styles.removeButton} onPress={quitarImagen}>
            <Ionicons name="close-circle" size={22} color={Colors.danger} />
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.dropZone} onPress={seleccionarImagen}>
          <Ionicons name="cloud-upload-outline" size={26} color={Colors.textSecondary} />
          <Text style={styles.dropZoneText}>Tocar para adjuntar foto</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  titulo: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  required: {
    color: Colors.danger,
  },
  descripcion: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  badgeOk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeOkText: {
    ...Typography.micro,
    color: Colors.success,
    fontWeight: '600',
  },
  dropZone: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    gap: Spacing.sm,
  },
  dropZoneText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  previewWrap: {
    position: 'relative',
  },
  preview: {
    width: '100%',
    height: 160,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt,
  },
  removeButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: Radius.pill,
  },
});