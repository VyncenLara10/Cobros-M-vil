export interface Resultado {
  ok: boolean;
  error?: string;
}

export const OK: Resultado = { ok: true };
const fail = (error: string): Resultado => ({ ok: false, error });

// ─── Límites de longitud (evitan payloads gigantes y desbordes) ──────────────
export const MAX = {
  nombre: 60,
  apellido: 60,
  dpi: 13,
  nit: 12,
  telefono: 9,        
  direccion: 120,
  colonia: 60,
  municipio: 50,
  zona: 2,
  email: 100,
  monto: 12,
  notas: 500,
  observaciones: 500,
  generico: 200,
} as const;

// ─── Sanitización (whitelist por tipo de campo) ──────────────────────────────

/** Solo dígitos. Para DPI, NIT, teléfono, montos enteros. */
export const soloDigitos = (v: string) => v.replace(/[^\d]/g, '');

/** Letras (con tildes y ñ), espacios y apóstrofe. Para nombres. */
export const soloLetras = (v: string) => v.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s']/g, '');

/** Número decimal: dígitos y un solo punto. Para dinero. */
export function soloDecimal(v: string): string {
  const limpio = v.replace(/[^\d.]/g, '');
  const partes = limpio.split('.');
  if (partes.length <= 1) return limpio;
  return `${partes[0]}.${partes.slice(1).join('').slice(0, 2)}`;
}

/**
 * Texto libre seguro (direcciones, notas): quita los caracteres que se usan
 * típicamente en inyección y en XSS. Deja letras, números, espacios y
 * puntuación común.
 */
export const textoSeguro = (v: string) =>
  v.replace(/[<>;`\\{}$]/g, '').replace(/--/g, '').replace(/\/\*/g, '');

/** Patrones sospechosos de inyección; se usa como último filtro al enviar. */
const PATRONES_PELIGROSOS = [
  /(\b)(select|insert|update|delete|drop|union|alter|truncate|exec)(\b)/i,
  /(--|\/\*|\*\/|;)/,
  /<\s*script/i,
  /javascript:/i,
];

export function contienePatronPeligroso(v: string): boolean {
  return PATRONES_PELIGROSOS.some((re) => re.test(v));
}

/** Validación transversal: longitud máxima + patrones peligrosos. */
export function validarSeguro(valor: string, max: number, campo = 'El campo'): Resultado {
  if (valor.length > max) return fail(`${campo} no puede exceder ${max} caracteres`);
  if (contienePatronPeligroso(valor)) return fail(`${campo} contiene caracteres no permitidos`);
  return OK;
}

// ─── Validadores por campo ───────────────────────────────────────────────────

/** DPI guatemalteco: exactamente 13 dígitos. */
export function validarDPI(valor: string, obligatorio = true): Resultado {
  const v = soloDigitos(valor);
  if (!v) return obligatorio ? fail('El DPI es obligatorio') : OK;
  if (v.length !== 13) return fail('El DPI debe tener exactamente 13 dígitos');
  if (/^0+$/.test(v)) return fail('DPI inválido');
  // Los 2 dígitos del departamento van de 01 a 22 en Guatemala.
  const depto = parseInt(v.slice(9, 11), 10);
  if (depto < 1 || depto > 22) return fail('El código de departamento del DPI no es válido');
  return OK;
}

/** Teléfono GT: 8 dígitos, empieza en 2,3,4,5,6,7. Acepta con o sin guion. */
export function validarTelefono(valor: string, obligatorio = true): Resultado {
  const v = soloDigitos(valor);
  if (!v) return obligatorio ? fail('El teléfono es obligatorio') : OK;
  if (v.length !== 8) return fail('El teléfono debe tener 8 dígitos');
  if (!/^[2-7]/.test(v)) return fail('Número de teléfono no válido en Guatemala');
  return OK;
}

/** Formatea 12345678 → 1234-5678 (solo para mostrar). */
export function formatearTelefono(valor: string): string {
  const v = soloDigitos(valor).slice(0, 8);
  return v.length > 4 ? `${v.slice(0, 4)}-${v.slice(4)}` : v;
}

/** Nombre / apellido: solo letras, mínimo 2 caracteres. */
export function validarNombre(valor: string, campo = 'El nombre', obligatorio = true): Resultado {
  const v = valor.trim();
  if (!v) return obligatorio ? fail(`${campo} es obligatorio`) : OK;
  if (v.length < 2) return fail(`${campo} es demasiado corto`);
  const largo = validarSeguro(v, MAX.nombre, campo);
  if (!largo.ok) return largo;
  if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s']+$/.test(v)) return fail(`${campo} solo puede contener letras`);
  return OK;
}

/** NIT guatemalteco: 8–12 dígitos, opcional 'K' final. */
export function validarNIT(valor: string, obligatorio = false): Resultado {
  const v = valor.replace(/[^\dkK]/g, '').toUpperCase();
  if (!v) return obligatorio ? fail('El NIT es obligatorio') : OK;
  if (!/^\d{7,11}[\dK]$/.test(v)) return fail('NIT inválido');
  return OK;
}

/** Dirección: texto seguro, mínimo 5 caracteres. */
export function validarDireccion(valor: string, obligatorio = true): Resultado {
  const v = valor.trim();
  if (!v) return obligatorio ? fail('La dirección es obligatoria') : OK;
  if (v.length < 5) return fail('La dirección es demasiado corta');
  return validarSeguro(v, MAX.direccion, 'La dirección');
}

/** Zona: 1–25 (zonas de la ciudad). */
export function validarZona(valor: string, obligatorio = false): Resultado {
  const v = soloDigitos(valor);
  if (!v) return obligatorio ? fail('La zona es obligatoria') : OK;
  const n = parseInt(v, 10);
  if (isNaN(n) || n < 1 || n > 25) return fail('La zona debe estar entre 1 y 25');
  return OK;
}

/** Email (opcional en la mayoría de formularios). */
export function validarEmail(valor: string, obligatorio = false): Resultado {
  const v = valor.trim();
  if (!v) return obligatorio ? fail('El correo es obligatorio') : OK;
  const largo = validarSeguro(v, MAX.email, 'El correo');
  if (!largo.ok) return largo;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return fail('Correo electrónico inválido');
  return OK;
}

/** Monto en quetzales: > 0 y con tope razonable. */
export function validarMonto(valor: string, obligatorio = true, max = 10_000_000): Resultado {
  const v = valor.trim();
  if (!v) return obligatorio ? fail('El monto es obligatorio') : OK;
  const n = parseFloat(v);
  if (isNaN(n)) return fail('El monto debe ser un número');
  if (n <= 0) return fail('El monto debe ser mayor que cero');
  if (n > max) return fail('El monto excede el máximo permitido');
  return OK;
}

/** Porcentaje de comisión: 0–100. */
export function validarPorcentaje(valor: string): Resultado {
  const n = parseFloat(valor);
  if (isNaN(n)) return fail('El porcentaje debe ser un número');
  if (n < 0 || n > 100) return fail('El porcentaje debe estar entre 0 y 100');
  return OK;
}

/** Notas / observaciones: texto libre acotado. */
export function validarNotas(valor: string, max = MAX.notas): Resultado {
  if (!valor) return OK;
  return validarSeguro(valor, max, 'Las notas');
}

/**
 * Contraseña robusta: mínimo 8 caracteres, al menos una mayúscula, una
 * minúscula, un número y un símbolo. Rechaza secuencias obvias y que el
 * usuario/correo aparezca dentro de la contraseña.
 */
export function validarPassword(valor: string, opciones?: { usuario?: string; correo?: string }): Resultado {
  const v = valor;
  if (!v) return fail('La contraseña es obligatoria');
  if (v.length < 8) return fail('Mínimo 8 caracteres');
  if (v.length > 72) return fail('La contraseña es demasiado larga');
  if (!/[a-z]/.test(v)) return fail('Debe incluir al menos una minúscula');
  if (!/[A-Z]/.test(v)) return fail('Debe incluir al menos una mayúscula');
  if (!/[0-9]/.test(v)) return fail('Debe incluir al menos un número');
  if (!/[^A-Za-z0-9]/.test(v)) return fail('Debe incluir al menos un símbolo (ej. !@#$%)');
  if (/(.)\1{2,}/.test(v)) return fail('No repitas el mismo carácter 3+ veces seguidas');

  const COMUNES = ['12345678', 'password', 'contrasena', 'contraseña', 'qwerty123', 'abc12345'];
  const bajo = v.toLowerCase();
  if (COMUNES.some((c) => bajo.includes(c))) return fail('Esa contraseña es demasiado común');

  const usuario = opciones?.usuario?.trim().toLowerCase();
  if (usuario && usuario.length >= 3 && bajo.includes(usuario)) return fail('La contraseña no puede contener tu usuario');
  const correoLocal = opciones?.correo?.split('@')[0]?.trim().toLowerCase();
  if (correoLocal && correoLocal.length >= 3 && bajo.includes(correoLocal)) return fail('La contraseña no puede contener tu correo');

  return OK;
}

/** Fuerza aproximada 0–4, para pintar un medidor visual (no reemplaza validarPassword). */
export function fuerzaPassword(valor: string): number {
  let puntos = 0;
  if (valor.length >= 8) puntos++;
  if (valor.length >= 12) puntos++;
  if (/[a-z]/.test(valor) && /[A-Z]/.test(valor)) puntos++;
  if (/[0-9]/.test(valor)) puntos++;
  if (/[^A-Za-z0-9]/.test(valor)) puntos++;
  return Math.min(puntos, 4);
}

/** Número de colegiado (abogados): 3–8 dígitos. */
export function validarColegiado(valor: string, obligatorio = true): Resultado {
  const v = soloDigitos(valor);
  if (!v) return obligatorio ? fail('El número de colegiado es obligatorio') : OK;
  if (v.length < 3 || v.length > 8) return fail('Número de colegiado inválido');
  return OK;
}

/**
 * Valida un objeto completo contra un mapa de reglas.
 * Devuelve { valido, errores } para pintar directo en los FormInput.
 */
export function validarFormulario<T extends Record<string, string>>(
  datos: T,
  reglas: Partial<Record<keyof T, (v: string) => Resultado>>,
): { valido: boolean; errores: Partial<Record<keyof T, string>> } {
  const errores: Partial<Record<keyof T, string>> = {};
  (Object.keys(reglas) as (keyof T)[]).forEach((campo) => {
    const regla = reglas[campo];
    if (!regla) return;
    const r = regla(datos[campo] ?? '');
    if (!r.ok && r.error) errores[campo] = r.error;
  });
  return { valido: Object.keys(errores).length === 0, errores };
}