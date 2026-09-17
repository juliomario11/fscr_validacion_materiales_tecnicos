/**
 * Interfaz compartida por `environment.ts` y `environment.prod.ts`. Vive en su
 * propio archivo (en vez de reexportarse desde `environment.ts`) porque el
 * `fileReplacements` de `angular.json` sustituye el CONTENIDO de
 * `environment.ts` por el de `environment.prod.ts` en builds de producción:
 * si `environment.prod.ts` importara el tipo desde `./environment`, esa
 * importación terminaría resolviendo contra sí mismo (import circular) en
 * lugar de contra el archivo de desarrollo.
 */
export interface AppEnvironment {
  readonly production: boolean;
  readonly apiBaseUrl: string;
}
