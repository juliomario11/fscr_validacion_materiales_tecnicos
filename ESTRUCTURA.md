# Estructura del proyecto

Dos proyectos npm independientes (`package.json` propio cada uno),
desplegados juntos como un solo servicio Node.

```
apps/
  api/                          NestJS 11, arquitectura hexagonal
    src/
      main.ts                   Bootstrap: CORS, helmet, ValidationPipe,
                                 serving de estáticos de Angular si
                                 FSCR_SERVE_STATIC=true
      app.module.ts
      common/
        guards/session-auth.guard.ts       Guard global (APP_GUARD); @Public() para opt-out
        decorators/{public,current-empleado}.decorator.ts
        filters/domain-exceptions.filter.ts Mapea excepciones de dominio -> HTTP
        services/session-token.service.ts   Firma/verifica el JWT de sesión (jose)
        utils/cookie.util.ts               Lee la cookie de sesión (sin cookie-parser)
      encuesta-materiales/
        domain/
          entity/            Material, EmpleadoEncuesta, RespuestaEncuesta, AdjuntoEncuesta
          repository/        Interfaces (sin implementación)
        application/
          dto/               Request/Response contracts (class-validator)
          use-case/          Un caso de uso por archivo
          exception/         Excepciones de negocio del dominio
          services/adjunto-validation.ts  Nombre seguro, extension+mime real (file-type), tamaño máx
        infrastructure/
          supabase/          Adapters PostgREST (fetch nativo + service_role key)
          storage/           FilesystemAdjuntosStorage -- disco del servidor (DOCUMENTS_STORAGE_PATH), no Supabase Storage
        presentation/
          controller/        auth, health, materiales, respuestas
    test/                     e2e de humo (Jest + supertest)

  web-angular/                 Angular 21 standalone + signals
    src/app/
      features/
        auth/                 Login por cédula
        encuesta/              Selección de materiales, "mi lista", resumen
                               de confirmación, pantalla de agradecimiento
      shared/
        services/              AuthService, MaterialesService, RespuestasService
        interceptors/           Adjunta withCredentials; redirige a /login en 401
        guards/                 authGuard funcional
        models/                 Material, RespuestaMaterial, AdjuntoRespuesta
```

## Base de datos: Supabase

Un solo proyecto Supabase compartido con otros dominios FSCR
(`equipos_fscr`, `proveedores_fscr`, `bdgeproc` — sin relación entre sí).
Este proyecto es dueño exclusivo del schema `validacion_materiales_tecnicos`:

| Tabla | Filas iniciales | Notas |
|-------|------------------|-------|
| `materiales` | 358 | Catálogo cerrado; `categoria` es una de 11 valores fijos asignados por agentes IA a partir de la descripción |
| `empleados_encuesta` | 113 | Whitelist; cédula+nombre tomados directo del negocio, no de `bdgeproc` (cobertura no confiable — ver `equipos_fscr.bodegas.responsable_usuario_legado`) |
| `encuesta_respuestas` | 0 | Una fila por (empleado, material); `UNIQUE(empleado_id, material_id)`; `estado` borrador/confirmado; `serial` (texto, nullable) para el número de serie cuando aplica -- ej. computadores -- no es obligatorio para el resto de materiales |
| `encuesta_adjuntos` | 0 | Solo metadata (`storage_path` relativo); el binario vive en disco del servidor, `DOCUMENTS_STORAGE_PATH` |

RLS habilitado sin políticas en las 4 tablas — deny-all salvo `service_role`.
El backend es el único que puede leer/escribir; cualquier política para
`anon`/`authenticated` queda pendiente de diseño si en el futuro se necesita
acceso directo desde el cliente (hoy no lo necesita: todo pasa por la API).

## Deploy

- **Local:** dos terminales — API en 9100 (default de `.env.example`;
  usar el puerto libre que corresponda si se corre junto a otro backend
  local), `ng serve` en 4200.
- **Servidor Ubuntu (real, producción):** `factproveedores` vía Tailscale
  (`100.74.71.100`). `deploy.sh` compila y reinicia pm2 (proceso
  `fscr-validacion-materiales-api`, puerto interno **18082**) y crea/gestiona
  un `VirtualHost *:8082` dedicado de Apache2 (mismo patrón que `sgi.conf`
  en el mismo servidor): Apache sirve el build de Angular directamente
  (`DocumentRoot`) y hace `ProxyPass /api` hacia `localhost:18082`. No
  comparte vhost ni puerto con `fscr_proveedores_factura` (público 80,
  interno 9100) ni con `sgi` (público 8081). La config de Apache vive en
  `/etc/apache2` del servidor, no en este repo — solo el `deploy.sh` que la
  genera. Ver "Deploy en el servidor Ubuntu" en `README.md`.
- **DigitalOcean App Platform:** alternativa vía `.do/app.yaml` +
  Secrets en la UI, `deploy_on_push: true` sobre `main` — no es el método
  usado hoy.

Health check: `GET /api/v1/validacion-materiales/health`.
