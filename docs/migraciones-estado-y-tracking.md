# Estado de migraciones y tracking (Supabase remoto)

> Última actualización: 2026-06-22. Mantener vivo este doc cuando se apliquen o difieran migraciones.

## Cómo se aplican las migraciones en este proyecto

No hay entorno local ni `config.toml`: la BD es **remota**. Las migraciones se aplican contra el
proyecto remoto (`mgowuyflhiavquztxpqh`), históricamente a mano (SQL editor / Management API),
**no** por el CLI de Supabase. Consecuencia: `supabase_migrations.schema_migrations` quedó
desincronizado del estado real durante un tiempo.

**Regla práctica:** no confíes en `supabase migration list` para saber qué está aplicado.
Verificá objeto por objeto en remoto (existencia de tabla/función/trigger/columna/enum) cuando
haya dudas.

## Drift detectado y resuelto (2026-06-22)

Una auditoría encontró código ya mergeado a `dev` que usaba objetos de BD inexistentes en remoto
(3 features rotos en runtime). Con autorización del dueño de la BD (Samir) se aplicaron:

| Migración | Qué arreglaba | Verificación |
|---|---|---|
| `20260621150000_add_notif_participacion_en_revision` | El enum `tipo_notificacion_enum` no tenía `participacion_en_revision`; cualquier INSERT de esa notificación fallaba | label presente en el enum |
| `20260622164248_create_egresados_fwd` | `egresados_fwd_oficial` no existía → `verificarEgresado()` (admin/actions.ts, RNF-38) devolvía `database_error` | tabla creada, RLS on, 2 políticas, 0 filas |
| `20260622200000_rf41_trigger_entregable_final` | Sin el trigger, un entregable `final` quedaba en `enviado` y no pasaba a `en_revision` (RF-41) | trigger + función + RPC presentes |

Nota sobre `egresados_fwd_oficial`: la migración trae un seed de prueba
(`test-egresado@example.com`). Se aplicó **borrando ese row**; la tabla queda vacía para sembrar
el padrón real de egresados cuando exista.

## Tracking: backfill de `schema_migrations`

`schema_migrations` pasó de **50 → 57** versiones. Se registraron las 3 aplicadas arriba más las
4 que ya estaban aplicadas pero sin trackear: `20260622120000`, `20260622130000`,
`20260622140000` (trigger de activación por correo) y `20260622150000` (limpieza de huérfanos).
Ahora la tabla refleja la realidad: 57 aplicadas, 2 archivos del repo intencionalmente pendientes.

## Migraciones intencionalmente SIN aplicar

- `20260621140000_plazo_vence_pg_cron` — RF-33 (Should), **diferido**. No rompe nada hoy (no hay
  cron agendado ni código que la llame). Aplicarla es inofensivo (idempotente); para activar RF-33
  hay que además agendar el job horario con `cron.schedule(...)` (pg_cron ya está habilitado).
- `20260622210000_activar_borrado_huerfanos_oauth` — pasa el cron de huérfanos OAuth a
  `p_dry_run=false`. **Pre-staged**: aplicar solo cuando existan candidatos (la BD aún no tiene
  cuentas huérfanas de 30+ días; lo más temprano ~julio 2026). Ver el flujo de auth.

## CAVEAT: no correr `supabase db push` global

Con el tracking en 57, un `supabase db push` aplicaría las 2 versiones untracked de arriba,
**incluido el flip `210000`**, que NO debe aplicarse todavía. Mientras esas dos sigan pendientes:
aplicar migraciones **de a una** por Management API, o sacar `210000` del directorio hasta que toque.
