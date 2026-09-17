import type { Request } from 'express';

import type { AdminTokenPayload } from '../services/admin-token.service';

/** `AdminAuthGuard` adjunta `admin` tras validar el Bearer token. */
export type RequestWithAdmin = Request & { admin?: AdminTokenPayload };
