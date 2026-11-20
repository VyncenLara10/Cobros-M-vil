# Pruebas de creación, notificaciones y asignación de servicios

**Contexto:** Expo SDK 56 + Supabase Cloud. Ejecutar sobre un proyecto **de pruebas**.
**No hacer merge a main ni probar con datos personales reales** antes de validar RLS.

## Diagnóstico sin exponer datos personales

En Supabase SQL Editor (proyecto al que apunta la APK):

```sql
-- La aplicación no debe mostrar "0 servicios" cuando hay filas visibles.
select s.id, s.tipo, s.estado,
       (s.gestor_id is not null) as asignado,
       (c.id is not null) as cliente_existe,
       s.creado_en
from public.servicios s
left join public.clientes c on c.id = s.cliente_id
order by s.creado_en desc limit 20;

-- Tres notificaciones por verificación/notificación son esperadas:
-- una para cada rol elegible. La campana del admin agrupa por servicio.
select n.referencia_id as servicio_id, count(*) as avisos
from public.notificaciones n
where n.tipo = 'servicio_nuevo'
group by n.referencia_id
order by count(*) desc;

-- Si hay referencias huérfanas, los avisos no abrirán un servicio.
select count(*) as avisos_sin_servicio
from public.notificaciones n
left join public.servicios s on s.id = n.referencia_id
where n.tipo = 'servicio_nuevo' and s.id is null;

-- Comprobar los nombres reales de las claves usadas por PostgREST.
select conname, pg_get_constraintdef(oid) as definicion
from pg_constraint
where conrelid = 'public.servicios'::regclass and contype = 'f'
order by conname;
```

**Nombres esperados:** `servicios_cliente_id_fkey` y `servicios_gestor_id_fkey`. Si los nombres difieren, ajustar el SELECT de `domain/servicios/servicios.ts` de acuerdo con la base, no desactivar RLS.

## Roles y tipos

| Rol | Cobro | Notificación | Verificación | Legal |
| --- | --- | --- | --- | --- |
| Administrador | Publica | Publica | Publica | Publica |
| Cobrador | Acepta | Acepta | Acepta | No |
| Verificador | No | Acepta | Acepta | No |
| Abogado | No | Acepta | Acepta | Acepta |

La tabla corresponde a `types.ts` y `public.rol_elegible`. Las reglas definitivas se aplican por RLS y `validar_cambio_servicio`. Un usuario no aprobado no debe ver servicios.

## Secuencia manual de prueba (cada tipo)

1. Instalar la **APK nueva** compilada desde `fix/security-onboarding-push-2026` y apuntando al proyecto Supabase correcto.
2. Entrar como un admin realmente activo (`perfiles.rol='admin' and activo=true`).
3. Desde **Solicitar**, publicar **un solo servicio ficticio**; el modal debe permitir abrir su ID real.
4. Volver a **Servicios**. Se debe recargar automáticamente; el servicio aparece como **pendiente**.
5. Iniciar sesión en otro dispositivo como un trabajador activo de un rol elegible. Debe recibir un solo aviso para ese servicio y verlo en su lista.
6. Abrir el aviso: el detalle debe existir y mostrar **Aceptar este servicio** (no opciones de gestión aún).
7. Aceptarlo. Verificar que pasa a **activo**, `gestor_id` corresponde al trabajador y se desbloquean sus datos.
8. En otro dispositivo con el mismo rol, comprobar que ya **no aparece en el pool pendiente**.
9. Completar el flujo especializado: cobro registra pago; notificación registra entrega; verificación domiciliar/laboral registra partes; legal registra gestión.
10. Probar **un rol no elegible** y confirmar que no puede consultar ni aceptar ese tipo, incluso intentando abrir la URL directamente.

**Privacidad:** antes de que el trabajador acepte, los datos privados de `clientes` pueden estar ocultos por RLS. El cliente en la tarjeta puede mostrar “Servicio pendiente de aceptar”; tras aceptarlo y recargar deben aparecer los datos autorizados.

## Problemas conocidos por separar de esta prueba

- El mapa queda desactivado en el perfil EAS `preview` por `EXPO_PUBLIC_MAPA_OFF=1`. No bloquea la creación o asignación.
- CI verifica instalación, TypeScript y lint; no prueba políticas RLS ni notificaciones push reales.
- Si `servicios` existe en SQL pero no se ve en la APK **nueva**, copiar el error visible en el panel. No volver a crear la misma solicitud a ciegas.
- Si fallan los avisos o el crédito, el nuevo formulario muestra una advertencia de guardado parcial con el ID del servicio.
