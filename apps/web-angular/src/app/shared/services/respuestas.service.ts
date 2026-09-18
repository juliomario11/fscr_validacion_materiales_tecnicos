import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { forkJoin, map, Observable, of, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AdjuntoRespuesta } from '../models/adjunto-respuesta';
import {
  ConfirmarEnvioResponse,
  EstadoPrecarga,
  GuardarRespuestaPayload,
  RespuestaMaterial,
} from '../models/respuesta-material';

/** Decisión sobre un ítem precargado, mientras vive SOLO en memoria del navegador (todavía no se escribió en la BD). */
export interface DecisionPrecargaLocal {
  readonly estado: EstadoPrecarga;
  readonly cantidad: number;
  /** Corrección opcional del serial que trajo el cron -- el original (`serialSistema`) nunca se toca. Solo aplica si `estado='confirmado'`. */
  readonly serial?: string | null;
  readonly observaciones?: string | null;
}

/**
 * Guarda `mis-respuestas` en un signal compartido para que la pantalla de
 * inventario, la de confirmación y la de agradecimiento lean el mismo estado
 * sin tener que repetir el `GET` en cada navegación (ej. "Volver a editar"
 * no pierde nada porque no se vuelve a pedir al servidor).
 */
@Injectable({ providedIn: 'root' })
export class RespuestasService {
  private readonly http = inject(HttpClient);

  private readonly misRespuestasState = signal<RespuestaMaterial[]>([]);
  public readonly misRespuestas = this.misRespuestasState.asReadonly();

  /**
   * Decisiones sobre ítems precargados ("sí lo tengo"/"ya no lo tengo" +
   * cantidad), tomadas por el técnico pero NO escritas en la BD todavía --
   * eso solo pasa al confirmar el envío completo (ver
   * `enviarDecisionesPrecarga`). Vive en este servicio (no en el
   * componente) para sobrevivir la navegación entre /inventario y
   * /inventario/confirmar.
   */
  private readonly decisionesPrecargaState = signal<ReadonlyMap<number, DecisionPrecargaLocal>>(new Map());
  public readonly decisionesPrecarga = this.decisionesPrecargaState.asReadonly();

  public readonly borrador = computed(() =>
    this.misRespuestasState().filter((respuesta) => respuesta.estado === 'borrador'),
  );
  public readonly confirmadas = computed(() =>
    this.misRespuestasState().filter((respuesta) => respuesta.estado === 'confirmado'),
  );
  /** `true` si algún ítem precargado en borrador todavía no tiene una decisión LOCAL tomada. */
  public readonly faltanDecisionesPrecarga = computed(() => {
    const decisiones = this.decisionesPrecargaState();
    return this.borrador()
      .filter((respuesta) => respuesta.origen === 'precargado')
      .some((respuesta) => !decisiones.has(respuesta.id));
  });

  public cargarMisRespuestas(): Observable<RespuestaMaterial[]> {
    return this.http.get<RespuestaMaterial[]>(`${environment.apiBaseUrl}/mis-respuestas`).pipe(
      tap((respuestas) => {
        this.misRespuestasState.set(respuestas);
        this.sembrarDecisionesDesdeServidor(respuestas);
      }),
    );
  }

  /**
   * Si un intento anterior llegó a mandar el `PATCH` de un ítem precargado
   * (`enviarDecisionesPrecarga`) pero la confirmación global nunca se
   * completó (ej. el técnico cerró la app a mitad de camino, o falló la
   * red justo después), ese ítem queda con `estadoPrecarga` ya escrito en
   * la BD -- pero el mapa local de decisiones arranca vacío en cada carga
   * de página, así que sin esto el técnico tendría que repetir TODO desde
   * cero. Acá se "recupera" esa respuesta ya persistida, pero SOLO si
   * todavía no hay una decisión local para ese id, para no pisar algo que
   * ya esté editando en esta misma sesión.
   */
  private sembrarDecisionesDesdeServidor(respuestas: RespuestaMaterial[]): void {
    const yaValidados = respuestas.filter(
      (respuesta) => respuesta.origen === 'precargado' && respuesta.estadoPrecarga !== null,
    );
    if (yaValidados.length === 0) return;

    this.decisionesPrecargaState.update((mapa) => {
      let copia: Map<number, DecisionPrecargaLocal> | null = null;
      for (const respuesta of yaValidados) {
        if (mapa.has(respuesta.id)) continue;
        copia ??= new Map(mapa);
        copia.set(respuesta.id, {
          estado: respuesta.estadoPrecarga as EstadoPrecarga,
          cantidad: respuesta.cantidad,
          serial: respuesta.serial,
          observaciones: respuesta.observaciones,
        });
      }
      return copia ?? mapa;
    });
  }

  public guardarRespuesta(
    materialId: number,
    payload: GuardarRespuestaPayload,
  ): Observable<RespuestaMaterial> {
    return this.http
      .put<RespuestaMaterial>(`${environment.apiBaseUrl}/mis-respuestas/${materialId}`, payload)
      .pipe(tap((respuesta) => this.upsertLocal(respuesta)));
  }

  public decisionPrecargaLocal(respuestaId: number): DecisionPrecargaLocal | null {
    return this.decisionesPrecargaState().get(respuestaId) ?? null;
  }

  /** Solo guarda la decisión EN MEMORIA -- no llama al backend. Se puede llamar varias veces para cambiar de opinión antes de confirmar. */
  public establecerDecisionPrecargaLocal(respuestaId: number, decision: DecisionPrecargaLocal): void {
    this.decisionesPrecargaState.update((mapa) => {
      const copia = new Map(mapa);
      copia.set(respuestaId, decision);
      return copia;
    });
  }

  /**
   * Quita una decisión que todavía no es válida (ej. "ya no lo tengo" sin
   * observaciones todavía) -- así `faltanDecisionesPrecarga` sigue
   * bloqueando "Continuar" hasta que se complete correctamente.
   */
  public eliminarDecisionPrecargaLocal(respuestaId: number): void {
    this.decisionesPrecargaState.update((mapa) => {
      if (!mapa.has(respuestaId)) return mapa;
      const copia = new Map(mapa);
      copia.delete(respuestaId);
      return copia;
    });
  }

  /**
   * Envía TODAS las decisiones locales al backend (una llamada `PATCH` por
   * ítem, en paralelo) -- se llama justo antes de la confirmación global
   * (`confirmarEnvio`). Si no hay ninguna decisión pendiente, resuelve de
   * inmediato sin llamar a la red.
   */
  public enviarDecisionesPrecarga(): Observable<RespuestaMaterial[]> {
    const decisiones = Array.from(this.decisionesPrecargaState().entries());
    if (decisiones.length === 0) return of([]);

    const llamadas = decisiones.map(([respuestaId, decision]) =>
      this.http
        .patch<RespuestaMaterial>(`${environment.apiBaseUrl}/mis-respuestas/precargados/${respuestaId}`, {
          estado: decision.estado,
          cantidad: decision.estado === 'confirmado' ? decision.cantidad : undefined,
          serial: decision.estado === 'confirmado' ? decision.serial || undefined : undefined,
          observaciones: decision.observaciones || undefined,
        })
        .pipe(tap((respuesta) => this.upsertLocal(respuesta))),
    );
    return forkJoin(llamadas).pipe(
      map((respuestas) => {
        this.decisionesPrecargaState.set(new Map());
        return respuestas;
      }),
    );
  }

  public subirAdjunto(materialId: number, archivo: File): Observable<AdjuntoRespuesta> {
    const formData = new FormData();
    formData.append('archivo', archivo, archivo.name);
    return this.http
      .post<AdjuntoRespuesta>(
        `${environment.apiBaseUrl}/mis-respuestas/${materialId}/adjuntos`,
        formData,
      )
      .pipe(tap((adjunto) => this.agregarAdjuntoLocal(materialId, adjunto)));
  }

  /** Igual que `subirAdjunto`, pero para una fila `origen='precargado'` -- identificada por su propio id, no por `materialId`. */
  public subirAdjuntoPrecarga(respuestaId: number, archivo: File): Observable<AdjuntoRespuesta> {
    const formData = new FormData();
    formData.append('archivo', archivo, archivo.name);
    return this.http
      .post<AdjuntoRespuesta>(
        `${environment.apiBaseUrl}/mis-respuestas/precargados/${respuestaId}/adjuntos`,
        formData,
      )
      .pipe(tap((adjunto) => this.agregarAdjuntoLocalPorRespuestaId(respuestaId, adjunto)));
  }

  /**
   * Trae el binario de un adjunto ya subido (`GET /mis-respuestas/adjuntos/:id/file`)
   * como blob, para vista previa (`URL.createObjectURL`) o descarga forzada
   * (`<a download>`) -- el backend responde el `Content-Type` real y requiere
   * la misma cookie de sesión que el resto (la agrega `authInterceptor`).
   */
  public descargarAdjunto(adjuntoId: number): Observable<Blob> {
    return this.http.get(`${environment.apiBaseUrl}/mis-respuestas/adjuntos/${adjuntoId}/file`, {
      responseType: 'blob',
      withCredentials: true,
    });
  }

  /** Borra la fila MANUAL de este material (el backend nunca borra precargados por esta vía -- solo hay una fila manual por material). */
  public eliminarRespuesta(materialId: number): Observable<void> {
    return this.http
      .delete<void>(`${environment.apiBaseUrl}/mis-respuestas/${materialId}`)
      .pipe(
        tap(() =>
          this.misRespuestasState.update((lista) =>
            lista.filter(
              (respuesta) => !(respuesta.materialId === materialId && respuesta.origen === 'manual'),
            ),
          ),
        ),
      );
  }

  public confirmarEnvio(): Observable<ConfirmarEnvioResponse> {
    return this.http
      .post<ConfirmarEnvioResponse>(`${environment.apiBaseUrl}/mis-respuestas/confirmar`, {})
      .pipe(
        tap((respuesta) => {
          for (const confirmada of respuesta.confirmadas) {
            this.upsertLocal(confirmada);
          }
        }),
      );
  }

  /**
   * Empareja por `id` (único por fila), NUNCA por `materialId` -- desde que
   * existe la precarga, un mismo material puede tener varias filas (varias
   * unidades serializadas precargadas, o una precargada + una manual). Un
   * `id` que todavía no está en la lista local es, por definición, una fila
   * recién creada (insert), no una actualización.
   */
  private upsertLocal(respuesta: RespuestaMaterial): void {
    this.misRespuestasState.update((lista) => {
      const index = lista.findIndex((item) => item.id === respuesta.id);
      if (index === -1) return [...lista, respuesta];
      const copia = [...lista];
      copia[index] = respuesta;
      return copia;
    });
  }

  private agregarAdjuntoLocal(materialId: number, adjunto: AdjuntoRespuesta): void {
    this.misRespuestasState.update((lista) =>
      lista.map((respuesta) =>
        respuesta.materialId === materialId && respuesta.origen === 'manual'
          ? { ...respuesta, adjuntos: [...(respuesta.adjuntos ?? []), adjunto] }
          : respuesta,
      ),
    );
  }

  private agregarAdjuntoLocalPorRespuestaId(respuestaId: number, adjunto: AdjuntoRespuesta): void {
    this.misRespuestasState.update((lista) =>
      lista.map((respuesta) =>
        respuesta.id === respuestaId
          ? { ...respuesta, adjuntos: [...(respuesta.adjuntos ?? []), adjunto] }
          : respuesta,
      ),
    );
  }
}
