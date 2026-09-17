import { CustomDecorator, SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca un handler (o un controller entero) como accesible SIN sesión
 * válida. `SessionAuthGuard` está registrado GLOBALMENTE (`APP_GUARD` en
 * `AppModule`) para que cualquier endpoint nuevo quede protegido por
 * defecto -- este decorator es la única forma explícita de optar por lo
 * contrario (login, logout, health).
 */
export const Public = (): CustomDecorator<typeof IS_PUBLIC_KEY> => SetMetadata(IS_PUBLIC_KEY, true);
