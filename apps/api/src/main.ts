import 'reflect-metadata';
import { existsSync } from 'fs';
import { join } from 'path';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import dotenv from 'dotenv';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';

import { AppModule } from './app.module';

dotenv.config();

const PLACEHOLDER_PATTERN = /^REEMPLAZAR/i;

/** Advierte (no bloquea el arranque) si faltan secretos requeridos para que los endpoints reales funcionen -- mismo criterio que el proyecto hermano. */
function validarConfiguracion(logger: Logger): void {
  const requeridas: Array<{ key: string; value: string | undefined }> = [
    { key: 'SUPABASE_URL', value: process.env.SUPABASE_URL },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', value: process.env.SUPABASE_SERVICE_ROLE_KEY },
    { key: 'SESSION_SECRET', value: process.env.SESSION_SECRET },
  ];
  const faltantes = requeridas
    .filter(({ value }) => !value || PLACEHOLDER_PATTERN.test(value))
    .map(({ key }) => key);

  if (faltantes.length > 0) {
    logger.warn(
      `[bootstrap] Configuración incompleta al iniciar: ${faltantes.join(', ')}. ` +
        'Los endpoints que dependen de estos secretos (login, materiales, mis-respuestas) fallarán hasta definirlos en el entorno.',
    );
  } else {
    logger.log('[bootstrap] Configuración de Supabase y de sesión detectada.');
  }
}

function parseAllowedOrigins(value: string | undefined): string[] {
  const raw = value && value.trim().length > 0 ? value : 'http://localhost:4200';
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

async function bootstrap(): Promise<void> {
  const logger = new Logger('bootstrap');
  validarConfiguracion(logger);

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(helmet());

  const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);
  logger.log(`[bootstrap] CORS habilitado (credentials) para: ${allowedOrigins.join(', ')}`);
  app.enableCors({
    origin: (origin, callback) => {
      // Sin `Origin` (curl, health checks del propio hosting) -- permitir.
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
    // Necesario para que el navegador adjunte/reciba la cookie httpOnly de sesión.
    credentials: true,
    maxAge: 600,
    optionsSuccessStatus: 204,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // `FSCR_SERVE_STATIC=true` -- producción: un solo servicio Node sirve el
  // build de Angular (mismo patrón que fscr_proveedores_factura). El build
  // por defecto de `@angular/build:application` sin `outputPath` propio cae
  // en `dist/<project-name>/browser` -- ver apps/web-angular/angular.json.
  if (process.env.FSCR_SERVE_STATIC === 'true') {
    const staticDir = join(__dirname, '../../web-angular/dist/web-angular/browser');
    if (existsSync(staticDir)) {
      app.useStaticAssets(staticDir);
      const expressApp = app.getHttpAdapter().getInstance();
      // Express 5 (path-to-regexp v8) ya no acepta '*' a secas como comodín
      // -- exige nombrar el parámetro: '/{*splat}'.
      expressApp.get('/{*splat}', (req: Request, res: Response, next: NextFunction) => {
        if (req.path.startsWith('/api/')) {
          next();
          return;
        }
        res.sendFile(join(staticDir, 'index.html'));
      });
      logger.log(`[bootstrap] Sirviendo build de Angular desde ${staticDir}`);
    } else {
      logger.warn(
        `[bootstrap] FSCR_SERVE_STATIC=true pero no se encontró el build de Angular en ${staticDir}. ` +
          'Corre "npm run web-angular:build" en la raíz del repo antes de arrancar en este modo.',
      );
    }
  }

  const port = Number(process.env.FSCR_API_PORT || process.env.PORT || 9100);
  await app.listen(port);
  logger.log(`[bootstrap] Escuchando en el puerto ${port}`);
}

void bootstrap();
