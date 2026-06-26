import { Colors, Radius, Spacing, Typography } from '@/constants/DesignTokens';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface StepProgressProps {
  pasoActual: number;
  totalPasos: number;
  etiquetas: string[];
}

/**
 * Indicador horizontal de progreso para el flujo de registro,
 * que tiene varios pasos: datos personales, datos del rol,
 * documentos, cuenta bancaria, firma de acuerdo.
 */
export default function StepProgress({
  pasoActual,
  totalPasos,
  etiquetas,
}: StepProgressProps) {
  return (
    <View style={styles.container}>
      <View style={styles.barRow}>
        {Array.from({ length: totalPasos }).map((_, index) => {
          const numero = index + 1;
          const completado = numero < pasoActual;
          const activo = numero === pasoActual;
          return (
            <React.Fragment key={numero}>
              <View
                style={[
                  styles.dot,
                  completado && styles.dotCompletado,
                  activo && styles.dotActivo,
                ]}
              >
                <Text
                  style={[
                    styles.dotText,
                    (completado || activo) && styles.dotTextActivo,
                  ]}
                >
                  {numero}
                </Text>
              </View>
              {numero < totalPasos ? (
                <View
                  style={[
                    styles.linea,
                    numero < pasoActual && styles.lineaCompletada,
                  ]}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </View>
      <Text style={styles.etiquetaActual}>
        Paso {pasoActual} de {totalPasos} - {etiquetas[pasoActual - 1]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCompletado: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  dotActivo: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dotText: {
    ...Typography.micro,
    color: Colors.textMuted,
  },
  dotTextActivo: {
    color: '#FFFFFF',
  },
  linea: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.border,
    marginHorizontal: 4,
  },
  lineaCompletada: {
    backgroundColor: Colors.success,
  },
  etiquetaActual: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    fontWeight: '600',
  },
});