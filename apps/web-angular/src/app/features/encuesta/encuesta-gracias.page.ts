import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../shared/services/auth.service';
import { RespuestasService } from '../../shared/services/respuestas.service';

/** Solo en esta pantalla: sin aviso visible, a los 2 minutos se cierra la sesión sola. */
const MS_AUTOCIERRE = 2 * 60 * 1000;

@Component({
  selector: 'app-encuesta-gracias-page',
  imports: [],
  templateUrl: './encuesta-gracias.page.html',
  styleUrl: './encuesta-gracias.page.scss',
})
export class EncuestaGraciasPage implements OnInit, OnDestroy {
  protected readonly auth = inject(AuthService);
  protected readonly respuestasService = inject(RespuestasService);
  private readonly router = inject(Router);

  protected readonly cargando = signal(true);
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  public ngOnInit(): void {
    // `confirmarEnvio()` (invocado en la pantalla anterior) ya deja las
    // respuestas confirmadas en el signal compartido de RespuestasService,
    // pero volvemos a pedir GET /mis-respuestas como fallback por si se
    // llega a esta pantalla directamente (ej. refresh de página).
    if (this.respuestasService.confirmadas().length > 0) {
      this.cargando.set(false);
      this.iniciarAutocierre();
      return;
    }
    this.cargando.set(true);
    this.respuestasService.cargarMisRespuestas().subscribe({
      next: () => {
        this.cargando.set(false);
        this.iniciarAutocierre();
      },
      error: () => {
        this.cargando.set(false);
        this.iniciarAutocierre();
      },
    });
  }

  public ngOnDestroy(): void {
    this.detenerAutocierre();
  }

  private iniciarAutocierre(): void {
    this.timeoutId = setTimeout(() => this.cerrarSesion(), MS_AUTOCIERRE);
  }

  protected cerrarSesion(): void {
    this.detenerAutocierre();
    this.auth.logout().subscribe(() => void this.router.navigateByUrl('/login'));
  }

  private detenerAutocierre(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
