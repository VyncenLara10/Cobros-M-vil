/**
 * TODO: reemplazar CUENTAS_DEMO por POST /api/auth/login contra Supabase Auth.
 * NUNCA dejar credenciales quemadas en producción.
 *
 * Seguridad ya implementada aquí (ver supabase/schema.sql para la versión
 * con backend real):
 *  - Bloqueo por intentos fallidos (MAX_INTENTOS en una ventana de tiempo).
 *  - Sesión guardada en SecureStore (cifrado del sistema) para poder
 *    desbloquear con Face ID / huella en vez de volver a escribir la clave.
 */

import { RolGestor } from '@/types';
import * as SecureStore from 'expo-secure-store';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

/** El admin no es un rol de gestor: es quien supervisa. */
export type RolApp = RolGestor | 'admin';

export const ROL_APP_LABEL: Record<RolApp, string> = {
  admin: 'Administrador',
  verificador: 'Verificador',
  cobrador: 'Cobrador',
  abogado: 'Abogado',
};

export interface Usuario {
  id: string;
  nombre: string;
  rol: RolApp;
  avatar: string;
  telefono: string;
  zona: string;
  numeroColegiado?: string;
}

interface CuentaDemo {
  usuario: string;
  clave: string;
  perfil: Usuario;
}

/** 4 accesos estáticos para la demo. */
export const CUENTAS_DEMO: CuentaDemo[] = [
  {
    usuario: 'admin',
    clave: 'admin123',
    perfil: { id: 'A-001', nombre: 'Andrea Gómez', rol: 'admin', avatar: 'AG', telefono: '5500-0001', zona: 'Central' },
  },
  {
    usuario: 'verificador',
    clave: 'verif123',
    perfil: { id: 'G-100', nombre: 'Carlos Ramírez', rol: 'verificador', avatar: 'CR', telefono: '5599-1000', zona: 'Guatemala Z.7 / Mixco' },
  },
  {
    usuario: 'cobrador',
    clave: 'cobro123',
    perfil: { id: 'G-001', nombre: 'Luis Pérez', rol: 'cobrador', avatar: 'LP', telefono: '5510-2233', zona: 'Guatemala Z.3 / Z.6' },
  },
  {
    usuario: 'abogado',
    clave: 'legal123',
    perfil: { id: 'G-003', nombre: 'Abog. Soto', rol: 'abogado', avatar: 'AS', telefono: '5533-6677', zona: 'Guatemala Z.10 / Z.9', numeroColegiado: '18452' },
  },
];

// ─── Permisos: qué pestañas ve cada rol ──────────────────────────────────────
// El admin supervisa (panel, gestores, reportes) y puede crear solicitudes.
// Los gestores trabajan en campo (servicios, mi perfil).
export const RUTAS_POR_ROL: Record<RolApp, string[]> = {
  admin: ['index', 'nuevo-servicio', 'admin', 'aprobaciones', 'gestores', 'reportes'],
  verificador: ['index', 'mi-perfil', 'nuevo-servicio'],
  cobrador: ['index', 'mi-perfil', 'nuevo-servicio'],
  abogado: ['index', 'mi-perfil', 'nuevo-servicio'],
};

export function puedeVer(rol: RolApp, ruta: string): boolean {
  return RUTAS_POR_ROL[rol].includes(ruta);
}

export const esAdmin = (u: Usuario | null) => u?.rol === 'admin';

// ─── Bloqueo por intentos fallidos ───────────────────────────────────────────
// Cliente-side por ahora (se reinicia si cierras la app). La tabla
// `bloqueos_acceso` en supabase/schema.sql ya deja lista la versión que
// persiste en el servidor y no se puede evadir reinstalando la app.

const MAX_INTENTOS = 5;
const VENTANA_BLOQUEO_MS = 15 * 60 * 1000; // 15 minutos

interface EstadoIntentos { fallos: number; bloqueadoHasta: number | null }
const intentosPorUsuario = new Map<string, EstadoIntentos>();

function minutosRestantes(hasta: number): number {
  return Math.max(1, Math.ceil((hasta - Date.now()) / 60000));
}

function registrarFallo(usuario: string): string {
  const clave = usuario.trim().toLowerCase();
  const actual = intentosPorUsuario.get(clave) ?? { fallos: 0, bloqueadoHasta: null };
  actual.fallos += 1;
  if (actual.fallos >= MAX_INTENTOS) {
    actual.bloqueadoHasta = Date.now() + VENTANA_BLOQUEO_MS;
    intentosPorUsuario.set(clave, actual);
    return `Demasiados intentos. Cuenta bloqueada ${minutosRestantes(actual.bloqueadoHasta)} min.`;
  }
  intentosPorUsuario.set(clave, actual);
  const restantes = MAX_INTENTOS - actual.fallos;
  return `Usuario o contraseña incorrectos. Te quedan ${restantes} intento${restantes === 1 ? '' : 's'}.`;
}

function chequearBloqueo(usuario: string): string | null {
  const clave = usuario.trim().toLowerCase();
  const actual = intentosPorUsuario.get(clave);
  if (!actual?.bloqueadoHasta) return null;
  if (Date.now() >= actual.bloqueadoHasta) {
    intentosPorUsuario.delete(clave); // ventana vencida: se libera solo
    return null;
  }
  return `Cuenta bloqueada por intentos fallidos. Intenta de nuevo en ${minutosRestantes(actual.bloqueadoHasta)} min.`;
}

function limpiarIntentos(usuario: string) {
  intentosPorUsuario.delete(usuario.trim().toLowerCase());
}

// ─── Sesión guardada (para desbloquear con biometría) ────────────────────────

const CLAVE_SECURE_STORE = 'gestorapp_sesion';

async function guardarSesion(u: Usuario): Promise<void> {
  try {
    await SecureStore.setItemAsync(CLAVE_SECURE_STORE, JSON.stringify(u));
  } catch {
    // Web u otra plataforma sin SecureStore disponible: no rompe el login normal.
  }
}

async function borrarSesionGuardada(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(CLAVE_SECURE_STORE);
  } catch {
    // no-op
  }
}

/** true si hay una sesión guardada localmente (para mostrar el botón de biometría). */
export async function haySesionGuardada(): Promise<boolean> {
  try {
    const v = await SecureStore.getItemAsync(CLAVE_SECURE_STORE);
    return !!v;
  } catch {
    return false;
  }
}

async function leerSesionGuardada(): Promise<Usuario | null> {
  try {
    const v = await SecureStore.getItemAsync(CLAVE_SECURE_STORE);
    return v ? (JSON.parse(v) as Usuario) : null;
  } catch {
    return null;
  }
}

// ─── Contexto de sesión ──────────────────────────────────────────────────────

interface SesionCtx {
  usuario: Usuario | null;
  cargando: boolean;
  iniciarSesion: (usuario: string, clave: string) => { ok: boolean; error?: string };
  entrarComo: (rol: RolApp) => void;
  cerrarSesion: () => void;
  /** Restaura la sesión guardada en SecureStore (llamarlo DESPUÉS de que el biométrico confirmó la identidad). */
  restaurarSesionGuardada: () => Promise<boolean>;
}

const Ctx = createContext<SesionCtx | null>(null);

export function SesionProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando] = useState(false);

  const valor = useMemo<SesionCtx>(
    () => ({
      usuario,
      cargando,
      iniciarSesion: (u, c) => {
        const bloqueo = chequearBloqueo(u);
        if (bloqueo) return { ok: false, error: bloqueo };

        const cuenta = CUENTAS_DEMO.find(
          (x) => x.usuario.toLowerCase() === u.trim().toLowerCase() && x.clave === c,
        );
        if (!cuenta) return { ok: false, error: registrarFallo(u) };

        limpiarIntentos(u);
        setUsuario(cuenta.perfil);
        guardarSesion(cuenta.perfil);
        return { ok: true };
        // TODO: const r = await fetch('/api/auth/login', {...})
      },
      /** Acceso rápido de demo: entra directo con un rol, sin escribir clave. */
      entrarComo: (rol) => {
        const cuenta = CUENTAS_DEMO.find((x) => x.perfil.rol === rol);
        if (cuenta) {
          setUsuario(cuenta.perfil);
          guardarSesion(cuenta.perfil);
        }
      },
      cerrarSesion: () => {
        setUsuario(null);
        borrarSesionGuardada();
      },
      restaurarSesionGuardada: async () => {
        const guardado = await leerSesionGuardada();
        if (!guardado) return false;
        setUsuario(guardado);
        return true;
      },
    }),
    [usuario, cargando],
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useSesion(): SesionCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSesion debe usarse dentro de <SesionProvider>');
  return ctx;
}

/** Hook chico: sólo dice si YA hay una sesión guardada, para pintar el botón de biometría. */
export function useHaySesionGuardada(): boolean {
  const [hay, setHay] = useState(false);
  useEffect(() => {
    haySesionGuardada().then(setHay);
  }, []);
  return hay;
}
