import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../shared/services/auth.service';
import { RespuestasService } from '../../shared/services/respuestas.service';

const SEGUNDOS_AUTOCIERRE = 30;

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

  /**
   * Cuenta regresiva para el cierre automático de sesión; `null` cuando el
   * usuario ya la canceló con "No, quiero revisar" (las respuestas siguen
   * confirmadas y no editables -- esto solo evita el logout automático).
   */
  protected readonly segundosRestantes = signal<number | null>(null);
  private intervaloId: ReturnType<typeof setInterval> | null = null;

  public ngOnInit(): void {
    // `confirmarEnvio()` (invocado en la pantalla anterior) ya deja las
    // respuestas confirmadas en el signal compartido de RespuestasService,
    // pero volvemos a pedir GET /mis-respuestas como fallback por si se
    // llega a esta pantalla directamente (ej. refresh de página).
    if (this.respuestasService.confirmadas().length > 0) {
      this.cargando.set(false);
      this.iniciarCuentaRegresiva();
      return;
    }
    this.cargando.set(true);
    this.respuestasService.cargarMisRespuestas().subscribe({
      next: () => {
        this.cargando.set(false);
        this.iniciarCuentaRegresiva();
      },
      error: () => {
        this.cargando.set(false);
        this.iniciarCuentaRegresiva();
      },
    });
  }

  public ngOnDestroy(): void {
    this.detenerCuentaRegresiva();
  }

  private iniciarCuentaRegresiva(): void {
    this.segundosRestantes.set(SEGUNDOS_AUTOCIERRE);
    this.intervaloId = setInterval(() => {
      const restante = (this.segundosRestantes() ?? 0) - 1;
      if (restante <= 0) {
        this.cerrarSesion();
        return;
      }
      this.segundosRestantes.set(restante);
    }, 1000);
  }

  /** Detiene el cierre automático -- NO reabre las respuestas, que siguen confirmadas y no editables. */
  protected seguirAqui(): void {
    this.detenerCuentaRegresiva();
    this.segundosRestantes.set(null);
  }

  protected cerrarSesion(): void {
    this.detenerCuentaRegresiva();
    this.auth.logout().subscribe(() => void this.router.navigateByUrl('/login'));
  }

  private detenerCuentaRegresiva(): void {
    if (this.intervaloId !== null) {
      clearInterval(this.intervaloId);
      this.intervaloId = null;
    }
  }
}
