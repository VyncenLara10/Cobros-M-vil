/**
 * hooks/useSeguimientoEquipo.ts
 * Datos REALES para app/(tabs)/admin.tsx: ubicación en vivo de cada gestor
 * (public.ubicaciones_gestor) + su ruta del día (servicios asignados hoy,
 * con la dirección/coords del cliente). Se refresca sola cada 20s y además
 * escucha cambios en tiempo real (Realtime) si está habilitado en el proyecto.
 *
 * Si Supabase no está configurado, cae a los recorridos simulados de
 * data/seguimiento.ts (modo demo) para que la pantalla se siga viendo.
 */

import { RECORRIDOS_HOY, RecorridoGestor, Parada, EstadoParada } from '@/data/seguimiento';
import { suscribirse } from '@/hooks/realtime/suscripcionCompartida';
import { supabase, supabaseConfigurado } from '@/lib/supabase';
import { RolGestor, TipoServicio } from '@/types';
import { useEffect, useState } from 'react';

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

function haceTiempo(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'justo ahora';
  if (min < 60) return `hace ${min} min`;
  return `hace ${Math.floor(min / 60)} h`;
}

function estadoAParada(servicio: { estado: string; fase: string | null }): EstadoParada {
  if (servicio.estado === 'completado') return 'completado';
  if (servicio.estado === 'no_localizado' || servicio.estado === 'fallido') return 'no_localizado';
  if (servicio.estado === 'activo') return servicio.fase === 'en_sitio' ? 'en_sitio' : 'en_camino';
  return 'pendiente';
}

export function useSeguimientoEquipo() {
  const [recorridos, setRecorridos] = useState<RecorridoGestor[]>(supabaseConfigurado ? [] : RECORRIDOS_HOY);
  const [cargando, setCargando] = useState(supabaseConfigurado);

  useEffect(() => {
    if (!supabaseConfigurado) return;
    let cancelado = false;

    async function cargar() {
      setCargando((c) => (recorridos.length === 0 ? true : c));
      const inicioHoy = new Date();
      inicioHoy.setHours(0, 0, 0, 0);

      const [{ data: ubicaciones, error: errUbi }, { data: perfiles, error: errPer }] = await Promise.all([
        supabase.from('ubicaciones_gestor').select('*'),
        supabase.from('perfiles').select('id, nombre, rol, telefono, avatar_iniciales').neq('rol', 'admin'),
      ]);
      if (cancelado) return;
      if (errUbi || errPer || !ubicaciones || !perfiles) {
        setCargando(false);
        return;
      }

      const gestorIds = ubicaciones.map((u: any) => u.gestor_id);
      const { data: servicios } = gestorIds.length
        ? await supabase
            .from('servicios')
            .select('id, tipo, estado, fase, fecha_asignacion, gestor_id, cliente:clientes(nombre, direccion, zona, lat, lng)')
            .in('gestor_id', gestorIds)
            .gte('fecha_asignacion', inicioHoy.toISOString())
            .order('fecha_asignacion', { ascending: true })
        : { data: [] as any[] };
      if (cancelado) return;

      const porGestor = new Map<string, any[]>();
      (servicios ?? []).forEach((s: any) => {
        const arr = porGestor.get(s.gestor_id) ?? [];
        arr.push(s);
        porGestor.set(s.gestor_id, arr);
      });
      const perfilPorId = new Map(perfiles.map((p: any) => [p.id, p]));

      const out: RecorridoGestor[] = ubicaciones
        .filter((u: any) => perfilPorId.has(u.gestor_id))
        .map((u: any) => {
          const perfil = perfilPorId.get(u.gestor_id)!;
          const paradas: Parada[] = (porGestor.get(u.gestor_id) ?? []).map((s: any, i: number) => ({
            orden: i + 1,
            servicioId: s.id,
            cliente: s.cliente?.nombre ?? 'Cliente',
            tipo: s.tipo as TipoServicio,
            direccion: s.cliente?.direccion ?? 'Sin dirección registrada',
            zona: s.cliente?.zona ?? '',
            // Si el cliente no tiene coordenadas capturadas aún, se ubica junto
            // al gestor para no romper el mini-mapa (mejor que inventar un punto).
            lat: s.cliente?.lat != null ? Number(s.cliente.lat) : Number(u.lat),
            lng: s.cliente?.lng != null ? Number(s.cliente.lng) : Number(u.lng),
            estado: estadoAParada(s),
          }));
          return {
            gestorId: u.gestor_id,
            nombre: perfil.nombre,
            rol: perfil.rol as RolGestor,
            avatar: perfil.avatar_iniciales || inicialesDe(perfil.nombre),
            telefono: perfil.telefono ?? '',
            ultimoPing: haceTiempo(u.actualizado_en),
            bateria: u.bateria ?? 0,
            actual: { lat: Number(u.lat), lng: Number(u.lng) },
            paradas,
          };
        });

      setRecorridos(out);
      setCargando(false);
    }

    cargar();
    const intervalo = setInterval(cargar, 20_000);

    // Dos filtros sobre el mismo topic: el registro compartido crea un canal
    // por (topic, filtro) y nunca vuelve a llamar .on() tras subscribe().
    const desuscribirUbicaciones = suscribirse(
      'seguimiento-admin',
      { event: '*', schema: 'public', table: 'ubicaciones_gestor' },
      cargar,
    );
    const desuscribirServicios = suscribirse(
      'seguimiento-admin',
      { event: '*', schema: 'public', table: 'servicios' },
      cargar,
    );

    return () => {
      cancelado = true;
      clearInterval(intervalo);
      desuscribirUbicaciones();
      desuscribirServicios();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { recorridos, cargando };
}
