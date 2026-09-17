import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';

describe('Bootstrap de AppModule (guard + filter global)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    // `main.ts` registra este pipe globalmente para el server real -- acá
    // hay que repetirlo a mano porque el test arma la app directamente con
    // `Test.createTestingModule(...)`, sin pasar por `bootstrap()`.
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health responde 200 {status: "ok"} sin requerir sesión', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/validacion-materiales/health')
      .expect(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('un endpoint protegido sin cookie de sesión responde 401 con envelope uniforme', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/validacion-materiales/materiales')
      .expect(401);
    expect(res.body).toEqual(
      expect.objectContaining({
        statusCode: 401,
        error: 'Unauthorized',
      }),
    );
  });

  it('POST /auth/login con cedula mal formada responde 400 (ValidationPipe)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/validacion-materiales/auth/login')
      .send({ cedula: 'no-numerico' })
      .expect(400);
  });
});
