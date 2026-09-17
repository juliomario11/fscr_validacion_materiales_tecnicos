/** América/Bogotá = UTC-5 todo el año (no observa horario de verano). */
const BOGOTA_OFFSET_MS = -5 * 60 * 60 * 1000;

/**
 * Devuelve el instante actual como un timestamp "naive" (SIN sufijo de zona
 * horaria, p. ej. `"2026-09-17T09:23:01.456"`) que representa la hora de
 * pared de Bogotá.
 *
 * Pensado para `encuesta_respuestas.fecha_confirmacion`, una columna
 * Postgres `timestamp` (sin `with time zone`): Postgres almacena ese tipo de
 * columna literalmente tal cual se envía, sin ninguna conversión de zona
 * horaria -- si mandáramos un ISO-8601 con `Z` (instante UTC), quedaría
 * grabado como si esos dígitos YA fueran hora Bogotá (5 horas adelantado).
 *
 * Truco: se desplaza el instante UTC 5 horas hacia atrás y se formatea con
 * `toISOString()` (que siempre imprime en UTC) quitándole el sufijo `Z` --
 * los dígitos de año/mes/día/hora resultantes ya son los de la hora de
 * pared de Bogotá, listos para que Postgres los tome tal cual.
 */
export function nowBogotaNaiveIso(): string {
  const bogotaShifted = new Date(Date.now() + BOGOTA_OFFSET_MS);
  return bogotaShifted.toISOString().replace('Z', '');
}
