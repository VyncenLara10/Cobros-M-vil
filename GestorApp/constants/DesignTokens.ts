export const Colors = {
  primary: '#1A1A2E',
  primaryMuted: '#EEEEF5',
  background: '#F6F7FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F2F8',
  overlay: 'rgba(0,0,0,0.45)',
  textPrimary: '#1A1A2E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  borderStrong: '#D1D5DB',
  success: '#10B981',
  successMuted: '#ECFDF5',
  warning: '#F59E0B',
  warningMuted: '#FEF3C7',
  danger: '#EF4444',
  dangerMuted: '#FEF2F2',
  info: '#4F6EF7',
  infoMuted: '#EEF1FE',
  // aliases para compatibilidad
  text: '#1A1A2E',
  accent: '#4F6EF7',
  accentLight: '#EEF1FE',
} as const;

export const Spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48,
} as const;

export const Radius = {
  sm: 6, md: 10, lg: 14, xl: 20, pill: 999,
} as const;

export const Typography = {
  title:    { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  subtitle: { fontSize: 16, fontWeight: '600' as const },
  body:     { fontSize: 14, fontWeight: '400' as const, lineHeight: 21 },
  caption:  { fontSize: 13, fontWeight: '400' as const },
  micro:    { fontSize: 11, fontWeight: '400' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
} as const;

export const RoleColors = {
  verificador: { base: Colors.success,  muted: Colors.successMuted, text: '#065F46' },
  notificador: { base: '#06B6D4',        muted: '#ECFEFF',           text: '#0E7490' },
  cobrador:    { base: Colors.warning,  muted: Colors.warningMuted, text: '#92400E' },
  abogado:     { base: '#9B7BF0',        muted: 'rgba(155,123,240,0.14)', text: '#5B21B6' },
} as const;

export const TipoColors = {
  notificacion: { base: '#06B6D4',       muted: '#ECFEFF',               text: '#0E7490' },
  cobro:        { base: Colors.warning,  muted: Colors.warningMuted,     text: '#92400E' },
  verificacion: { base: Colors.success,  muted: Colors.successMuted,     text: '#065F46' },
  legal:        { base: '#9B7BF0',       muted: 'rgba(155,123,240,0.14)', text: '#5B21B6' },
} as const;

export const EstadoColors = {
  activo:        { base: Colors.success, muted: Colors.successMuted, text: '#065F46' },
  pendiente:     { base: Colors.warning, muted: Colors.warningMuted, text: '#92400E' },
  completado:    { base: Colors.info,    muted: Colors.infoMuted,    text: '#3B4FBD' },
  no_localizado: { base: Colors.danger,  muted: Colors.dangerMuted,  text: '#991B1B' },
  fallido:       { base: Colors.textMuted, muted: Colors.surfaceAlt, text: '#374151' },
} as const;