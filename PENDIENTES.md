# Pendientes

Backlog de este primer commit. Sin numeración formal todavía (proyecto
recién arrancado) — cuando crezca, adoptar el mismo estilo de
`fscr_proveedores_factura/PENDIENTES.md` (código corto + prioridad).

## Funcionales

- **Reapertura de inventario confirmado**: hoy `PUT/DELETE /mis-respuestas/:materialId`
  responde 409 si la respuesta ya está `confirmado`. No hay forma de que un
  colaborador corrija un error después de enviar. Falta decidir si existe
  un mecanismo (ej. un admin la reabre) y quién puede activarlo.
- **Panel de resultados**: no existe ninguna pantalla para que negocio
  consulte qué declaró cada colaborador. Hoy solo es consultable por SQL
  directo en el schema `validacion_materiales_tecnicos` de Supabase.
- **Limpieza de adjuntos huérfanos**: al eliminar una respuesta en borrador,
  el `ON DELETE CASCADE` limpia la fila de `inventario_adjuntos` en Supabase
  pero el archivo binario en disco (`DOCUMENTS_STORAGE_PATH` del servidor)
  queda huérfano. Ver `TODO` en
  `apps/api/src/inventario-materiales/application/use-case/eliminar-respuesta.use-case.ts`.
- **Sin backup del disco de adjuntos**: los archivos viven en
  `/var/lib/fscr/adjuntos_inventario_tecnicos` en el servidor Ubuntu real, sin
  ningún respaldo automatizado -- si se pierde ese disco, se pierden todas
  las fotos/soportes subidos (la metadata en Supabase sobrevive, los
  binarios no). Mismo riesgo que ya está documentado para
  `fscr_proveedores_factura`.
- **Vista previa/descarga de adjuntos**: el backend no expone todavía un
  endpoint para descargar o previsualizar un adjunto ya subido; el frontend
  solo muestra nombre de archivo + fecha.

## Operación — despliegue en el servidor Ubuntu

- **Vhost de Apache2 para el puerto 8082**: `deploy.sh` ya lo automatiza
  (crea `/etc/apache2/sites-available/fscr-validacion-materiales.conf` si
  no existe, agrega `Listen 8082`, habilita módulos y el sitio) — pendiente
  solo de **correrlo una vez en el servidor real** para confirmar que
  aplica limpio (`apache2ctl configtest` antes de recargar) y no afecta a
  `fscr_proveedores.conf` (puerto 80/9100) ni `sgi.conf` (puerto 8081).
- **`pm2 startup`**: confirmar si ya está configurado en el servidor para
  que los procesos pm2 sobrevivan un reinicio (`fscr-api` de
  `fscr_proveedores_factura` puede ya tenerlo) y replicarlo para
  `fscr-validacion-materiales-api` si hace falta.
- **DNS/`ServerName`**: el vhost usa `ServerName validacion-materiales.factproveedores`,
  que no resuelve por DNS real — no importa porque el acceso es directo por
  IP:puerto (`http://100.74.71.100:8082`) vía Tailscale, igual que `sgi`. Si
  en el futuro se necesita un dominio público real, hay que revisarlo.

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
