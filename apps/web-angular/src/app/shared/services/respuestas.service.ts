import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AdjuntoRespuesta } from '../models/adjunto-respuesta';
import {
  ConfirmarEnvioResponse,
  GuardarRespuestaPayload,
  RespuestaMaterial,
} from '../models/respuesta-material';

/**
 * Guarda `mis-respuestas` en un signal compartido para que la pantalla de
 * encuesta, la de confirmación y la de agradecimiento lean el mismo estado
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

  public eliminarRespuesta(materialId: number): Observable<void> {
    return this.http
      .delete<void>(`${environment.apiBaseUrl}/mis-respuestas/${materialId}`)
      .pipe(
        tap(() =>
          this.misRespuestasState.update((lista) =>
            lista.filter((respuesta) => respuesta.materialId !== materialId),
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

  private upsertLocal(respuesta: RespuestaMaterial): void {
    this.misRespuestasState.update((lista) => {
      const index = lista.findIndex((item) => item.materialId === respuesta.materialId);
      if (index === -1) return [...lista, respuesta];
      const copia = [...lista];
      copia[index] = respuesta;
      return copia;
    });
  }

  private agregarAdjuntoLocal(materialId: number, adjunto: AdjuntoRespuesta): void {
    this.misRespuestasState.update((lista) =>
      lista.map((respuesta) =>
        respuesta.materialId === materialId
          ? { ...respuesta, adjuntos: [...(respuesta.adjuntos ?? []), adjunto] }
          : respuesta,
      ),
    );
  }
}
