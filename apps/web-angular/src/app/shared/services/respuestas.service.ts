import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AdjuntoRespuesta } from '../models/adjunto-respuesta';
import {
  ConfirmarEnvioResponse,
  EstadoPrecarga,
  GuardarRespuestaPayload,
  RespuestaMaterial,
} from '../models/respuesta-material';

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

  public readonly borrador = computed(() =>
    this.misRespuestasState().filter((respuesta) => respuesta.estado === 'borrador'),
  );
  public readonly confirmadas = computed(() =>
    this.misRespuestasState().filter((respuesta) => respuesta.estado === 'confirmado'),
  );
  /** Ítems que vinieron del cron de las 5 AM y todavía no se validaron ("sí lo tengo" / "ya no lo tengo"). */
  public readonly precargadosPendientes = computed(() =>
    this.borrador().filter((respuesta) => respuesta.origen === 'precargado' && respuesta.estadoPrecarga === null),
  );

  public cargarMisRespuestas(): Observable<RespuestaMaterial[]> {
    return this.http
      .get<RespuestaMaterial[]>(`${environment.apiBaseUrl}/mis-respuestas`)
      .pipe(tap((respuestas) => this.misRespuestasState.set(respuestas)));
  }

  public guardarRespuesta(
    materialId: number,
    payload: GuardarRespuestaPayload,
  ): Observable<RespuestaMaterial> {
    return this.http
      .put<RespuestaMaterial>(`${environment.apiBaseUrl}/mis-respuestas/${materialId}`, payload)
      .pipe(tap((respuesta) => this.upsertLocal(respuesta)));
  }

  /** "Sí lo tengo" / "ya no lo tengo" sobre un ítem precargado puntual (identificado por su `id` de fila, no por `materialId`). */
  public confirmarPrecarga(respuestaId: number, estado: EstadoPrecarga): Observable<RespuestaMaterial> {
    return this.http
      .patch<RespuestaMaterial>(`${environment.apiBaseUrl}/mis-respuestas/precargados/${respuestaId}`, {
        estado,
      })
      .pipe(tap((respuesta) => this.upsertLocal(respuesta)));
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
}
