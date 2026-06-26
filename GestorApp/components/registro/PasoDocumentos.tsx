import DocumentUploader from '@/components/(auth)/Documentuploader';
import { DatosRegistro } from '@/components/(auth)/tipos-registro';
import { Colors, Spacing, Typography } from '@/constants/DesignTokens';
import { StyleSheet, Text, View } from 'react-native';

interface PasoDocumentosProps {
  onCambiarCampo: <K extends keyof DatosRegistro>(campo: K, valor: DatosRegistro[K]) => void;
}

export default function PasoDocumentos({ onCambiarCampo }: PasoDocumentosProps) {
  return (
    <View>
      <Text style={styles.titulo}>Documentos de identidad</Text>
      <Text style={styles.subtitulo}>
        Estos documentos seran revisados por el equipo de verificacion
        antes de aprobar tu cuenta
      </Text>

      <DocumentUploader
        titulo="DPI - frente"
        obligatorio
        onChange={(uri) => onCambiarCampo('dpiFrenteUri', uri)}
      />

      <DocumentUploader
        titulo="DPI - reverso"
        obligatorio
        onChange={(uri) => onCambiarCampo('dpiReversoUri', uri)}
      />

      <DocumentUploader
        titulo="Antecedentes penales y policiacos"
        descripcion="Constancia vigente, no mayor a 3 meses"
        obligatorio
        onChange={(uri) => onCambiarCampo('antecedentesPenalesUri', uri)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  titulo: {
    ...Typography.title,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitulo: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
});