/**
 * domain/auth/sesion.tsx
 * Sesión de la app conectada a Supabase Auth (tabla public.perfiles, ver
 * supabase/schema.sql). Si el proyecto NO tiene .env configurado
 * (EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY), cae
 * automáticamente al modo demo con las 4 CUENTAS_DEMO, para que el equipo
 * pueda seguir viendo avances de UI sin depender del backend.
 *
 * Qué hace en modo REAL (supabaseConfigurado === true):
 *  - iniciarSesion(correo, clave)      -> supabase.auth.signInWithPassword
 *  - completarMagicLink(codigoPkce)    -> supabase.auth.exchangeCodeForSession
 *    (se llama desde app/auth/callback.tsx cuando el usuario toca el enlace
 *    que le mandamos por correo, ver domain/auth/magicLink.ts)
 *  - Si el usuario tiene MFA (TOTP) activo, ambas rutas devuelven
 *    { requiereMfa: true } y hay que llamar a completarSegundoFactor(codigo).
 *  - Al cargar la perfil desde public.perfiles, si `activo` es false
 *    (solicitud aún no aprobada por el admin) se cierra la sesión y se
 *    muestra un mensaje — no se deja entrar.
 *  - La sesión de Supabase ya persiste sola (AsyncStorage, ver lib/supabase.ts).
 *    Además guardamos una copia liviana del perfil en SecureStore para
 *    pintar el botón de "Entrar con Face ID / huella" sin esperar red.
 */

import { supabase, supabaseConfigurado } from '@/lib/supabase';
import { RolGestor } from '@/types';
import * as SecureStore from 'expo-secure-store';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { completarDesafioMfaConCodigo, faltaSegundoFactor } from './mfa';

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

/** 4 accesos estáticos, solo se usan cuando NO hay Supabase configurado. */
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

// ─── Bloqueo por intentos fallidos (capa extra sobre lo que ya hace Supabase) ─
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
  return `Correo o contraseña incorrectos. Te quedan ${restantes} intento${restantes === 1 ? '' : 's'}.`;
}

function chequearBloqueo(usuario: string): string | null {
  const clave = usuario.trim().toLowerCase();
  const actual = intentosPorUsuario.get(clave);
  if (!actual?.bloqueadoHasta) return null;
  if (Date.now() >= actual.bloqueadoHasta) {
    intentosPorUsuario.delete(clave);
    return null;
  }
  return `Cuenta bloqueada por intentos fallidos. Intenta de nuevo en ${minutosRestantes(actual.bloqueadoHasta)} min.`;
}

function limpiarIntentos(usuario: string) {
  intentosPorUsuario.delete(usuario.trim().toLowerCase());
}

// ─── Perfil real (public.perfiles) ──────────────────────────────────────────

function inicialesDe(nombre: string): string {
  return (
    nombre
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || 'GX'
  );
}

async function cargarPerfilDesdeDB(userId: string): Promise<{ usuario: Usuario; activo: boolean } | null> {
  const { data, error } = await supabase.from('perfiles').select('*').eq('id', userId).single();
  if (error || !data) return null;
  const usuario: Usuario = {
    id: data.id,
    nombre: data.nombre,
    rol: data.rol,
    avatar: data.avatar_iniciales || inicialesDe(data.nombre),
    telefono: data.telefono ?? '',
    zona: data.zona ?? '',
    numeroColegiado: data.numero_colegiado ?? undefined,
  };
  return { usuario, activo: data.activo };
}

// ─── Sesión guardada localmente (para desbloquear con biometría) ────────────

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

export interface ResultadoLogin {
  ok: boolean;
  error?: string;
  /** true si el password/código fue correcto pero falta el código de la app de autenticación (MFA). */
  requiereMfa?: boolean;
}

interface SesionCtx {
  usuario: Usuario | null;
  cargando: boolean;
  iniciarSesion: (correo: string, clave: string) => Promise<ResultadoLogin>;
  /** Completa el login que empezó con el enlace mágico del correo (llamado desde app/auth/callback.tsx). */
  completarMagicLink: (codigoPkce: string) => Promise<ResultadoLogin>;
  /** Segundo paso cuando iniciarSesion/completarMagicLink devolvieron requiereMfa: true. */
  completarSegundoFactor: (codigo: string) => Promise<ResultadoLogin>;
  /** Acceso rápido SOLO disponible en modo demo (sin Supabase configurado). */
  entrarComo: (rol: RolApp) => void;
  cerrarSesion: () => Promise<void>;
  restaurarSesionGuardada: () => Promise<boolean>;
}

const Ctx = createContext<SesionCtx | null>(null);

export function SesionProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(supabaseConfigurado);

  // Al abrir la app: si Supabase ya tiene una sesión guardada (AsyncStorage)
  // y el perfil está activo, entra directo (sin volver a pedir credenciales).
  useEffect(() => {
    if (!supabaseConfigurado) {
      setCargando(false);
      return;
    }
    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (user) {
        if (await faltaSegundoFactor()) {
          // Hay sesión pero falta el código MFA: no autenticamos automático.
          setCargando(false);
          return;
        }
        const perfil = await cargarPerfilDesdeDB(user.id);
        if (perfil?.activo) {
          setUsuario(perfil.usuario);
          await guardarSesion(perfil.usuario);
        }
      }
      setCargando(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setUsuario(null);
        borrarSesionGuardada();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const valor = useMemo<SesionCtx>(
    () => ({
      usuario,
      cargando,

      iniciarSesion: async (correo, clave) => {
        if (!supabaseConfigurado) {
          const bloqueo = chequearBloqueo(correo);
          if (bloqueo) return { ok: false, error: bloqueo };
          const cuenta = CUENTAS_DEMO.find(
            (x) => x.usuario.toLowerCase() === correo.trim().toLowerCase() && x.clave === clave,
          );
          if (!cuenta) return { ok: false, error: registrarFallo(correo) };
          limpiarIntentos(correo);
          setUsuario(cuenta.perfil);
          await guardarSesion(cuenta.perfil);
          return { ok: true };
        }

        const bloqueo = chequearBloqueo(correo);
        if (bloqueo) return { ok: false, error: bloqueo };

        const { data, error } = await supabase.auth.signInWithPassword({
          email: correo.trim(),
          password: clave,
        });
        if (error || !data.user) return { ok: false, error: registrarFallo(correo) };

        if (await faltaSegundoFactor()) {
          return { ok: true, requiereMfa: true };
        }

        limpiarIntentos(correo);
        const perfil = await cargarPerfilDesdeDB(data.user.id);
        if (!perfil) {
          await supabase.auth.signOut();
          return { ok: false, error: 'No se encontró tu perfil. Contacta al administrador.' };
        }
        if (!perfil.activo) {
          await supabase.auth.signOut();
          return { ok: false, error: 'Tu cuenta está pendiente de aprobación por el administrador.' };
        }
        setUsuario(perfil.usuario);
        await guardarSesion(perfil.usuario);
        return { ok: true };
      },

      completarMagicLink: async (codigoPkce) => {
        if (!supabaseConfigurado) {
          return { ok: false, error: 'Conecta Supabase primero (ver .env.example).' };
        }
        const { data, error } = await supabase.auth.exchangeCodeForSession(codigoPkce);
        if (error || !data.user) {
          return { ok: false, error: 'El enlace ya venció o ya se usó. Pide uno nuevo.' };
        }

        if (await faltaSegundoFactor()) {
          return { ok: true, requiereMfa: true };
        }

        const perfil = await cargarPerfilDesdeDB(data.user.id);
        if (!perfil) {
          await supabase.auth.signOut();
          return { ok: false, error: 'No se encontró tu perfil. Contacta al administrador.' };
        }
        if (!perfil.activo) {
          await supabase.auth.signOut();
          return { ok: false, error: 'Tu cuenta está pendiente de aprobación por el administrador.' };
        }
        setUsuario(perfil.usuario);
        await guardarSesion(perfil.usuario);
        return { ok: true };
      },

      completarSegundoFactor: async (codigo) => {
        const r = await completarDesafioMfaConCodigo(codigo);
        if (!r.ok) return { ok: false, error: r.error };

        const { data } = await supabase.auth.getUser();
        if (!data.user) return { ok: false, error: 'Se venció la sesión, inicia de nuevo.' };

        const perfil = await cargarPerfilDesdeDB(data.user.id);
        if (!perfil) {
          await supabase.auth.signOut();
          return { ok: false, error: 'No se encontró tu perfil. Contacta al administrador.' };
        }
        if (!perfil.activo) {
          await supabase.auth.signOut();
          return { ok: false, error: 'Tu cuenta está pendiente de aprobación por el administrador.' };
        }
        setUsuario(perfil.usuario);
        await guardarSesion(perfil.usuario);
        return { ok: true };
      },

      /** Acceso rápido de demo: solo funciona si Supabase no está configurado. */
      entrarComo: (rol) => {
        if (supabaseConfigurado) return;
        const cuenta = CUENTAS_DEMO.find((x) => x.perfil.rol === rol);
        if (cuenta) {
          setUsuario(cuenta.perfil);
          guardarSesion(cuenta.perfil);
        }
      },

      cerrarSesion: async () => {
        setUsuario(null);
        await borrarSesionGuardada();
        if (supabaseConfigurado) await supabase.auth.signOut();
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