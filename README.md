# FSCR — Validación de Materiales Técnicos

Encuesta interna para que los técnicos de campo de FSCR declaren, uno por
uno, qué materiales/herramientas del catálogo técnico tienen actualmente en
su poder (cantidad, observaciones y evidencia fotográfica opcional).

No es una comparación automática contra el inventario real (Geproc/bdgeproc)
— es una autodeclaración: el colaborador elige de una lista cerrada, sin que
el sistema le diga qué se supone que tiene asignado.

## Stack

Monorepo con dos proyectos npm independientes desplegados como un solo
servicio, igual al patrón de `fscr_proveedores_factura`:

```
apps/
  api/            NestJS 11, arquitectura hexagonal — package.json propio
  web-angular/    Angular 21 standalone + signals — package.json propio
```

- **Backend:** NestJS + TypeScript, sin ORM — acceso a Supabase vía PostgREST
  con la `service_role` key (RLS está habilitado sin políticas en las 4
  tablas del dominio: solo el backend puede leer/escribir).
- **Frontend:** Angular standalone, consume la API con `withCredentials`
  (sesión en cookie httpOnly).
- **Base de datos:** Supabase Postgres, schema `validacion_materiales_tecnicos`
  (proyecto compartido con otros dominios FSCR — `equipos_fscr`,
  `proveedores_fscr`, etc. — sin relación entre sí).
- **Despliegue:** DigitalOcean App Platform, un solo servicio Node sobre
  Ubuntu (`.do/app.yaml`), igual que `fscr_proveedores_factura`.

## Autenticación

Decisión de negocio para este primer alcance: **login solo por cédula, sin
contraseña**. El backend valida que la cédula exista y esté activa en
`empleados_encuesta` (whitelist de ~113 colaboradores habilitados) y emite
una sesión firmada en cookie httpOnly. El `empleadoId` siempre se deriva de
esa sesión — ningún endpoint acepta un `empleadoId` que venga del cliente.

## Flujo de la encuesta

1. El colaborador entra con su cédula.
2. Busca y selecciona un material del catálogo (358 ítems, 11 categorías),
   indica la cantidad que tiene (en la unidad de medida propia del
   material) y observaciones opcionales; puede adjuntar una foto/soporte.
3. Puede seguir agregando materiales, editarlos o quitarlos mientras su
   respuesta esté en estado `borrador`.
4. Antes de enviar, ve un **resumen de confirmación de solo lectura** con
   todo lo seleccionado.
5. Al confirmar, todas sus respuestas en borrador pasan a `confirmado` con
   fecha de confirmación (hora de Bogotá) — ya no se pueden editar desde
   este primer alcance.

## Variables de entorno

Ver `apps/api/.env.example`. Los secretos reales (`SUPABASE_SERVICE_ROLE_KEY`,
`SESSION_SECRET`) se configuran en la UI de DigitalOcean App Platform, nunca
se commitean.

## Desarrollo local

```bash
# Backend (puerto 9100)
npm --prefix apps/api install
cp apps/api/.env.example apps/api/.env   # completar con valores reales
npm --prefix apps/api run start:prod

# Frontend (puerto 4200, apunta a localhost:9100 en dev)
npm --prefix apps/web-angular install
npm --prefix apps/web-angular start
```

## Validación (pre-commit / pre-PR)

```bash
npm run typecheck   # tsc (API) + ng build development (Angular)
npm run api:test    # Jest
npm run build       # build completo, igual al que corre en DigitalOcean
```

## Estado de este primer commit — qué falta

Ver [`ESTRUCTURA.md`](ESTRUCTURA.md) para el detalle de carpetas y
[`PENDIENTES.md`](PENDIENTES.md) para el backlog. En resumen, quedan fuera
de este primer alcance (documentado con `TODO` en el código donde aplica):

- Reabrir una encuesta ya confirmada (hoy es definitivo).
- Borrado de adjuntos huérfanos en Supabase Storage al eliminar una
  respuesta en borrador (el registro en BD sí se limpia por `ON DELETE
  CASCADE`, el archivo binario no).
- Vista/panel para que alguien de negocio consulte los resultados agregados
  de la encuesta (hoy los datos solo se pueden consultar por SQL directo en
  Supabase).
- Tests end-to-end del frontend y tests de los adapters de Supabase del
  backend (hoy solo hay un test e2e de humo del módulo de auth/health).
