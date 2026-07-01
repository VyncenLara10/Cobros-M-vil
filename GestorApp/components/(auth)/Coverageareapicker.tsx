import { Colors, Radius, Spacing, Typography } from '@/constants/DesignTokens';
import { DEPARTAMENTOS, municipioTieneZonas, zonasDe } from '@/constants/Guatemala';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

/**
 * components/(auth)/Coverageareapicker.tsx
 *
 * Selector de zona de cobertura en cascada:
 *   1. Departamento
 *   2. Municipio (de ese departamento)
 *   3. Zonas del municipio (SOLO si el municipio maneja zonas; si no, se
 *      agrega el municipio completo como área de cobertura).
 *
 * El valor es una lista de áreas. Cada área = un municipio + (opcional) las
 * zonas específicas seleccionadas dentro de ese municipio.
 */

export interface AreaCobertura {
  departamento: string;
  municipio: string;
  /** Zonas seleccionadas. Vacío = todo el municipio / municipio sin zonas. */
  zonas: string[];
}

export type ZonaCobertura = AreaCobertura[];

interface CoverageAreaPickerProps {
  value: ZonaCobertura | null;
  onChange: (zona: ZonaCobertura) => void;
}

export default function CoverageAreaPicker({ value, onChange }: CoverageAreaPickerProps) {
  const areas = value ?? [];

  const [departamento, setDepartamento] = useState<string | null>(null);
  const [municipio, setMunicipio] = useState<string | null>(null);

  const municipios = useMemo(
    () => DEPARTAMENTOS.find((d) => d.nombre === departamento)?.municipios ?? [],
    [departamento],
  );
  const zonasDisponibles = municipio ? zonasDe(municipio) : [];
  const tieneZonas = municipio ? municipioTieneZonas(municipio) : false;

  // Área ya guardada para el municipio activo (para saber qué zonas marcar)
  const areaActual = areas.find((a) => a.municipio === municipio);

  const upsertArea = (nueva: AreaCobertura) => {
    const otras = areas.filter((a) => a.municipio !== nueva.municipio);
    onChange([...otras, nueva]);
  };

  const quitarArea = (mun: string) => {
    onChange(areas.filter((a) => a.municipio !== mun));
  };

  // Municipio SIN zonas → se agrega/quita como bloque completo
  const toggleMunicipioCompleto = () => {
    if (!departamento || !municipio) return;
    if (areaActual) quitarArea(municipio);
    else upsertArea({ departamento, municipio, zonas: [] });
  };

  // Municipio CON zonas → se marca/desmarca zona por zona
  const toggleZona = (zona: string) => {
    if (!departamento || !municipio) return;
    const previas = areaActual?.zonas ?? [];
    const nuevas = previas.includes(zona)
      ? previas.filter((z) => z !== zona)
      : [...previas, zona];

    if (nuevas.length === 0) quitarArea(municipio);
    else upsertArea({ departamento, municipio, zonas: nuevas });
  };

  const totalMunicipios = areas.length;

  return (
    <View>
      {/* Resumen de lo seleccionado */}
      <Text style={styles.contador}>
        {totalMunicipios === 0
          ? 'Selecciona al menos un municipio'
          : `${totalMunicipios} ${totalMunicipios === 1 ? 'área' : 'áreas'} de cobertura`}
      </Text>

      {areas.length > 0 && (
        <View style={styles.chipsResumen}>
          {areas.map((a) => (
            <View key={a.municipio} style={styles.chipResumen}>
              <Text style={styles.chipResumenText}>
                {a.municipio}
                {a.zonas.length > 0 ? ` · ${a.zonas.length} zona${a.zonas.length === 1 ? '' : 's'}` : ''}
              </Text>
              <Pressable onPress={() => quitarArea(a.municipio)} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Paso 1: Departamento */}
      <Text style={styles.pasoLabel}>1. Departamento</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowScroll}>
        {DEPARTAMENTOS.map((d) => {
          const activo = departamento === d.nombre;
          return (
            <Pressable
              key={d.nombre}
              onPress={() => {
                setDepartamento(d.nombre);
                setMunicipio(null);
              }}
              style={[styles.pill, activo && styles.pillActiva]}
            >
              <Text style={[styles.pillText, activo && styles.pillTextActiva]}>{d.nombre}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Paso 2: Municipio */}
      {departamento && (
        <>
          <Text style={styles.pasoLabel}>2. Municipio</Text>
          <View style={styles.grid}>
            {municipios.map((m) => {
              const activo = municipio === m;
              const yaAgregado = areas.some((a) => a.municipio === m);
              return (
                <Pressable
                  key={m}
                  onPress={() => setMunicipio(m)}
                  style={[styles.chip, activo && styles.chipActiva, yaAgregado && styles.chipAgregado]}
                >
                  {yaAgregado && (
                    <Ionicons name="checkmark" size={13} color={Colors.success} style={{ marginRight: 3 }} />
                  )}
                  <Text style={[styles.chipText, activo && styles.chipTextActiva]}>{m}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {/* Paso 3: Zonas (solo si el municipio maneja zonas) */}
      {municipio && (
        <>
          <Text style={styles.pasoLabel}>
            3. {tieneZonas ? `Zonas de ${municipio}` : 'Cobertura'}
          </Text>

          {tieneZonas ? (
            <>
              <Text style={styles.ayuda}>
                Marca las zonas que cubres. Si no marcas ninguna, se quita el municipio.
              </Text>
              <View style={styles.grid}>
                {zonasDisponibles.map((z) => {
                  const activa = areaActual?.zonas.includes(z) ?? false;
                  return (
                    <Pressable
                      key={z}
                      onPress={() => toggleZona(z)}
                      style={[styles.chip, activa && styles.chipActiva]}
                    >
                      {activa && (
                        <Ionicons name="checkmark" size={13} color={Colors.primary} style={{ marginRight: 3 }} />
                      )}
                      <Text style={[styles.chipText, activa && styles.chipTextActiva]}>{z}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : (
            <Pressable
              onPress={toggleMunicipioCompleto}
              style={[styles.municipioBloque, areaActual && styles.municipioBloqueActivo]}
            >
              <Ionicons
                name={areaActual ? 'checkmark-circle' : 'add-circle-outline'}
                size={20}
                color={areaActual ? Colors.success : Colors.textSecondary}
              />
              <Text style={styles.municipioBloqueText}>
                {areaActual
                  ? `${municipio} agregado a tu cobertura`
                  : `${municipio} no maneja zonas · tocar para cubrir todo el municipio`}
              </Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contador: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  chipsResumen: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  chipResumen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryMuted,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  chipResumenText: {
    ...Typography.micro,
    color: Colors.primary,
    fontWeight: '700',
    textTransform: 'none',
    letterSpacing: 0,
  },
  pasoLabel: {
    ...Typography.micro,
    color: Colors.textMuted,
    letterSpacing: 0.6,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  ayuda: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  rowScroll: {
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  pillActiva: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  pillText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  pillTextActiva: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipActiva: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
  },
  chipAgregado: {
    borderColor: Colors.success,
  },
  chipText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  chipTextActiva: {
    color: Colors.primary,
    fontWeight: '700',
  },
  municipioBloque: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
  },
  municipioBloqueActivo: {
    borderStyle: 'solid',
    borderColor: Colors.success,
    backgroundColor: Colors.successMuted,
  },
  municipioBloqueText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    flex: 1,
  },
});