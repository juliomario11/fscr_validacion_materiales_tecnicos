import type { Request } from 'express';

import type { SessionEmpleado } from '../services/session-token.service';

/** `SessionAuthGuard` adjunta `empleado` tras validar la cookie de sesión. */
export type RequestWithEmpleado = Request & { empleado?: SessionEmpleado };
