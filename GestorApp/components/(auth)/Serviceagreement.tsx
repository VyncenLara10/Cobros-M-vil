import { Colors, Radius, Spacing, Typography } from '@/constants/DesignTokens';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

interface ServiceAgreementProps {
  aceptado: boolean;
  onChange: (aceptado: boolean) => void;
}

const TEXTO_ACUERDO = `1. OBJETO DEL ACUERDO

El presente acuerdo regula la relacion entre el gestor afiliado y la empresa para la prestacion de servicios de verificacion, gestion de cobro o gestion legal, segun el rol asignado.

2. NATURALEZA DE LA RELACION

El gestor reconoce que su vinculacion con la empresa es de caracter mercantil y no laboral. El gestor acepta servicios de forma voluntaria a traves de la aplicacion, sin obligacion de disponibilidad continua.

3. VERACIDAD DE LA INFORMACION

El gestor declara que toda la informacion y documentacion proporcionada durante el registro es veraz, vigente y le pertenece. La empresa se reserva el derecho de suspender o rechazar cuentas con informacion falsa o inconsistente.

4. EJECUCION DE SERVICIOS

El gestor se compromete a presentarse fisicamente en la direccion indicada para cada servicio aceptado, y a registrar evidencia de ubicacion y fotografica conforme lo solicite la aplicacion al iniciar y finalizar cada gestion.

5. CONDICIONES DE PAGO

El pago al gestor se realiza segun el esquema correspondiente a su rol: tarifa fija por verificacion, comision sobre monto efectivamente recuperado para gestion de cobro, o tarifa fija mas costas variables segun el tipo de gestion legal. Los pagos se liquidan a la cuenta bancaria registrada y verificada por el gestor.

6. CONFIDENCIALIDAD

El gestor se obliga a mantener confidencialidad sobre los datos de las personas y casos que le sean asignados, y a no utilizar dicha informacion para fines distintos a la ejecucion del servicio.

7. TRATAMIENTO DE DATOS

El gestor autoriza a la empresa a recolectar, almacenar y procesar sus datos personales, documentos de identificacion y ubicacion durante la ejecucion de servicios, con fines de verificacion de identidad y control de calidad del servicio prestado.

8. TERMINACION

Cualquiera de las partes puede dar por terminada la vinculacion en cualquier momento. La empresa puede suspender la cuenta del gestor de forma inmediata ante incumplimientos graves o reportes de mal comportamiento.`;

/**
 * Acuerdo de servicio que el gestor debe leer (scroll) y aceptar
 * mediante checkbox antes de continuar el registro. El texto es
 * de ejemplo / placeholder: debe ser revisado por un abogado antes
 * de usarse en produccion.
 */
export default function ServiceAgreement({
  aceptado,
  onChange,
}: ServiceAgreementProps) {
  const [haLlegadoAlFinal, setHaLlegadoAlFinal] = useState(false);

  const manejarScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const llegoAlFinal =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 24;
    if (llegoAlFinal) setHaLlegadoAlFinal(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.scrollWrap}>
        <ScrollView
          style={styles.scroll}
          onScroll={manejarScroll}
          scrollEventThrottle={32}
          nestedScrollEnabled
        >
          <Text style={styles.textoAcuerdo}>{TEXTO_ACUERDO}</Text>
        </ScrollView>
      </View>

      {!haLlegadoAlFinal ? (
        <Text style={styles.avisoScroll}>
          Desplazate hasta el final para poder aceptar el acuerdo
        </Text>
      ) : null}

      <Pressable
        style={styles.checkboxRow}
        onPress={() => haLlegadoAlFinal && onChange(!aceptado)}
        disabled={!haLlegadoAlFinal}
      >
        <View
          style={[
            styles.checkbox,
            aceptado && styles.checkboxChecked,
            !haLlegadoAlFinal && styles.checkboxDisabled,
          ]}
        >
          {aceptado ? <Ionicons name="checkmark" size={15} color="#fff" /> : null}
        </View>
        <Text style={styles.checkboxLabel}>
          He leido y acepto los terminos del acuerdo de servicio
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  scrollWrap: {
    height: 220,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.sm,
  },
  scroll: {
    padding: Spacing.lg,
  },
  textoAcuerdo: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  avisoScroll: {
    ...Typography.caption,
    color: Colors.warning,
    marginBottom: Spacing.sm,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxDisabled: {
    opacity: 0.4,
  },
  checkboxLabel: {
    ...Typography.caption,
    color: Colors.textPrimary,
    flex: 1,
  },
});