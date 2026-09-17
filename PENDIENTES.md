# Pendientes

Backlog de este primer commit. Sin numeración formal todavía (proyecto
recién arrancado) — cuando crezca, adoptar el mismo estilo de
`fscr_proveedores_factura/PENDIENTES.md` (código corto + prioridad).

## Funcionales

- **Reapertura de encuesta confirmada**: hoy `PUT/DELETE /mis-respuestas/:materialId`
  responde 409 si la respuesta ya está `confirmado`. No hay forma de que un
  colaborador corrija un error después de enviar. Falta decidir si existe
  un mecanismo (ej. un admin la reabre) y quién puede activarlo.
- **Panel de resultados**: no existe ninguna pantalla para que negocio
  consulte qué declaró cada colaborador. Hoy solo es consultable por SQL
  directo en el schema `validacion_materiales_tecnicos` de Supabase.
- **Limpieza de adjuntos huérfanos**: al eliminar una respuesta en borrador,
  el `ON DELETE CASCADE` limpia la fila de `encuesta_adjuntos` pero el
  archivo binario en el bucket `validacion-materiales-adjuntos` de Supabase
  Storage queda huérfano. Ver `TODO` en
  `apps/api/src/encuesta-materiales/application/use-case/eliminar-respuesta.use-case.ts`.
- **Vista previa/descarga de adjuntos**: el backend no expone todavía un
  endpoint para descargar o previsualizar un adjunto ya subido; el frontend
  solo muestra nombre de archivo + fecha.

## Seguridad / operación

- El archivo `Personal_Completo.xlsx` que apareció en la raíz del repo
  durante el desarrollo de este primer commit **no se incluyó** (repo
  público, nombre sugiere datos de personal). Si su contenido debe vivir en
  algún lugar del proyecto, debe ser en un almacenamiento privado, nunca en
  este repositorio.
- Sin tests de los adapters de Supabase (`infrastructure/supabase/*`) ni
  tests end-to-end del frontend — solo hay un test e2e de humo
  (`apps/api/test/health.e2e-spec.ts`) que cubre health + 401 + validación
  de body en login.
- Sin CI configurado (igual que el proyecto hermano) — el despliegue en
  DigitalOcean App Platform corre `npm run build` en cada push a `main`
  (`deploy_on_push: true`), sin gate de tests antes de mergear.
