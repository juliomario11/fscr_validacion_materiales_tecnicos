export class SupabaseConfigError extends Error {
  public readonly missingKeys: string[];

  public constructor(missingKeys: string[]) {
    super(
      missingKeys.length > 0
        ? `Configuración Supabase incompleta: ${missingKeys.join(', ')}`
        : 'Configuración Supabase incompleta',
    );
    this.name = 'SupabaseConfigError';
    this.missingKeys = missingKeys;
  }
}

export class SupabaseRequestError extends Error {
  public readonly status: number;
  public readonly path: string;
  public readonly body: string;
  /** Código de error Postgres/PostgREST (p. ej. `"23505"` unique_violation) extraído del cuerpo, o `null` si no se pudo parsear. */
  public readonly code: string | null;

  public constructor(status: number, path: string, body: string) {
    super(`Supabase request failed ${status}: ${body.slice(0, 200)}`);
    this.name = 'SupabaseRequestError';
    this.status = status;
    this.path = path;
    this.body = body;
    this.code = SupabaseRequestError.parseErrorCode(body);
  }

  private static parseErrorCode(body: string): string | null {
    if (!body || body.length === 0) return null;
    try {
      const parsed = JSON.parse(body) as { code?: unknown };
      if (typeof parsed.code === 'string' && parsed.code.length > 0) {
        return parsed.code;
      }
    } catch {
      // El cuerpo no es JSON válido; no hay código que extraer.
    }
    return null;
  }
}
