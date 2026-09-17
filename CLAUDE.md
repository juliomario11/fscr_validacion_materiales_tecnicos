# CLAUDE.md

Guía para sesiones futuras de Claude Code en este repositorio.

## Qué es este proyecto

Encuesta interna FSCR: ~113 técnicos de campo declaran qué materiales
técnicos tienen en su poder, eligiendo de un catálogo cerrado de 358 ítems.
Ver [`README.md`](README.md) para el flujo completo y [`ESTRUCTURA.md`](ESTRUCTURA.md)
para el árbol de carpetas.

## Antes de tocar el schema de Supabase

Este proyecto es dueño exclusivo del schema `validacion_materiales_tecnicos`
en un proyecto Supabase COMPARTIDO con otros dominios FSCR (`equipos_fscr`,
`proveedores_fscr`, `bdgeproc`, `facturacion_fscr`). Nunca asumas que estás
en un proyecto Supabase dedicado: antes de una migración, corre
`list_tables`/`execute_sql` para confirmar que sigues operando solo sobre
`validacion_materiales_tecnicos`.

RLS está habilitado sin políticas en las 4 tablas de este schema — deny-all
salvo `service_role`. Esa es una decisión deliberada (el backend es el único
consumidor), no un olvido: si algún día hace falta acceso directo desde el
cliente con la `anon key`, hay que diseñar políticas explícitas, no
simplemente deshabilitar RLS.

`bdgeproc` (schema legado replicado de Geproc) NO se usa como fuente de la
whitelist de empleados — su cobertura de estas cédulas específicas es baja
y su identidad no está verificada (mismo hallazgo que
`equipos_fscr.bodegas.responsable_usuario_legado` / EQM-34 en el proyecto
hermano). La whitelist en `empleados_encuesta` viene directo del negocio.

## Decisiones ya tomadas (no las reabras sin que el usuario lo pida)

- **Auth = solo cédula, sin contraseña.** Decisión de negocio explícita.
  El `empleadoId` siempre sale de la sesión (cookie httpOnly + JWT firmado
  con `jose`), nunca de un parámetro que mande el cliente.
- **Una vez confirmada, una respuesta no se puede editar** (409 en
  `PUT`/`DELETE`). Reabrir un envío confirmado es un pendiente sin resolver,
  no un bug — ver `PENDIENTES.md`.
- **Categorías de materiales**: 11 categorías amplias fijas (no una por tipo
  de producto), asignadas por agentes IA a partir de la descripción. Si se
  agregan materiales nuevos al catálogo, deben caer en una de esas 11 o
  requiere decisión explícita del negocio para agregar una categoría más.
- **`jose` se importa con `import()` dinámico** en `session-token.service.ts`
  porque es ESM-only y el proyecto compila a CommonJS — no lo cambies a
  `import` estático sin resolver antes el conflicto de módulos (ver
  comentario en el propio archivo). Por la misma razón, no hay test unitario
  que ejercite el signing real bajo Jest (Jest en CJS no soporta `import()`
  dinámico sin `--experimental-vm-modules`).

## Archivo excluido a propósito

`Personal_Completo.xlsx` apareció en la raíz del repo local durante el
desarrollo de este primer commit y NO se incluyó — el repositorio es
público y el nombre sugiere datos de personal. Si necesitas saber qué
contiene o dónde debe vivir, pregúntale al usuario antes de commitearlo.

## Validación antes de un commit/PR

```bash
npm run typecheck   # tsc (apps/api) + ng build development (apps/web-angular)
npm run api:test    # Jest
npm run build       # build completo, igual al que corre en DigitalOcean
```
