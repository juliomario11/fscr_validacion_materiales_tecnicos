/**
 * Normaliza un nombre de archivo original a un slug seguro para usarlo como
 * segmento de ruta en Supabase Storage: sin acentos, sin espacios, sin
 * caracteres especiales -- conserva la extensión.
 */
export function slugificarNombreArchivo(nombreOriginal: string): string {
  const trimmed = (nombreOriginal || 'archivo').trim();
  const lastDot = trimmed.lastIndexOf('.');
  const base = lastDot > 0 ? trimmed.slice(0, lastDot) : trimmed;
  const ext = lastDot > 0 ? trimmed.slice(lastDot + 1) : '';

  const slugify = (value: string): string => {
    const slug = value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // quita acentos/diacríticos
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
    return slug || 'archivo';
  };

  const baseSlug = slugify(base);
  const extSlug = ext ? slugify(ext) : '';
  return extSlug ? `${baseSlug}.${extSlug}` : baseSlug;
}
