import { Component, OnInit, inject, signal } from '@angular/core';

import { AuthService } from '../../shared/services/auth.service';
import { RespuestasService } from '../../shared/services/respuestas.service';

@Component({
  selector: 'app-encuesta-gracias-page',
  imports: [],
  templateUrl: './encuesta-gracias.page.html',
  styleUrl: './encuesta-gracias.page.scss',
})
export class EncuestaGraciasPage implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly respuestasService = inject(RespuestasService);

  protected readonly cargando = signal(true);

  public ngOnInit(): void {
    // `confirmarEnvio()` (invocado en la pantalla anterior) ya deja las
    // respuestas confirmadas en el signal compartido de RespuestasService,
    // pero volvemos a pedir GET /mis-respuestas como fallback por si se
    // llega a esta pantalla directamente (ej. refresh de página).
    if (this.respuestasService.confirmadas().length > 0) {
      this.cargando.set(false);
      return;
    }
    this.cargando.set(true);
    this.respuestasService.cargarMisRespuestas().subscribe({
      next: () => this.cargando.set(false),
      error: () => this.cargando.set(false),
    });
  }
}
