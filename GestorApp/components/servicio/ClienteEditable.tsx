/**
 * components/servicio/ClienteEditable.tsx
 * Bloque reutilizable para ACTUALIZAR los datos y la dirección del cliente
 * durante un servicio (a menudo la dirección o el teléfono en la BD están
 * desactualizados y el gestor los corrige en el lugar).
 *
 * - `useClienteEditable(cliente)` maneja el estado y calcula solo los cambios.
 * - `<ClienteEditableFields />` es la tarjeta plegable con los campos.
 *
 * Lo usan los formularios de verificación, cobro, notificación y legal.
 */

import FormInput from '@/components/(auth)/FormInput';
import { Colors, Radius, Spacing, Typography } from '@/constants/DesignTokens';
import { Cliente } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface CamposCliente {
  nombre: string;
  telefono: string;
  direccion: string;
  zona: string;
  municipio: string;
}

/** Estado editable del cliente + cálculo de los campos que cambiaron. */
export function useClienteEditable(cliente: Cliente) {
  const inicial: CamposCliente = {
    nombre: cliente.nombre ?? '',
    telefono: cliente.telefono ?? '',
    direccion: cliente.direccion ?? '',
    zona: cliente.zona ?? '',
    municipio: cliente.municipio ?? '',
  };
  const [valores, setValores] = useState<CamposCliente>(inicial);
  const setCampo = (k: keyof CamposCliente, v: string) => setValores((p) => ({ ...p, [k]: v }));

  const cambios = useMemo(() => {
    const out: Partial<CamposCliente> = {};
    (Object.keys(valores) as (keyof CamposCliente)[]).forEach((k) => {
      if (valores[k].trim() !== (inicial[k] ?? '').trim()) out[k] = valores[k].trim();
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valores]);

  return { valores, setCampo, cambios, huboCambios: Object.keys(cambios).length > 0 };
}

export function ClienteEditableFields({
  valores,
  setCampo,
  huboCambios,
  defaultAbierto = false,
}: {
  valores: CamposCliente;
  setCampo: (k: keyof CamposCliente, v: string) => void;
  huboCambios?: boolean;
  defaultAbierto?: boolean;
}) {
  const [abierto, setAbierto] = useState(defaultAbierto);

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.header} onPress={() => setAbierto((a) => !a)}>
        <Ionicons name="create-outline" size={16} color={Colors.primary} />
        <Text style={styles.headerText}>Actualizar datos del cliente</Text>
        {huboCambios && <View style={styles.dot} />}
        <Ionicons
          name={abierto ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={Colors.textMuted}
          style={{ marginLeft: 'auto' }}
        />
      </Pressable>

      {abierto && (
        <View style={styles.body}>
          <Text style={styles.hint}>Corrige lo que esté desactualizado. Se guarda al completar el servicio.</Text>
          <FormInput label="Nombre" value={valores.nombre} onChangeText={(t) => setCampo('nombre', t)} />
          <FormInput label="Teléfono" keyboardType="phone-pad" value={valores.telefono} onChangeText={(t) => setCampo('telefono', t)} />
          <FormInput label="Dirección" value={valores.direccion} onChangeText={(t) => setCampo('direccion', t)} />
          <View style={styles.row}>
            <View style={styles.half}>
              <FormInput label="Zona" value={valores.zona} onChangeText={(t) => setCampo('zona', t)} />
            </View>
            <View style={styles.half}>
              <FormInput label="Municipio" value={valores.municipio} onChangeText={(t) => setCampo('municipio', t)} />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 0.5, borderColor: Colors.border, marginBottom: Spacing.md, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md },
  headerText: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.warning },
  body: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, borderTopWidth: 0.5, borderTopColor: Colors.border },
  hint: { ...Typography.caption, color: Colors.textMuted, marginTop: Spacing.sm, marginBottom: Spacing.sm },
  row: { flexDirection: 'row', gap: Spacing.sm },
  half: { flex: 1 },
});