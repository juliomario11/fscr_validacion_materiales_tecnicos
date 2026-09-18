import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { MaterialesService } from '../../shared/services/materiales.service';
import { RespuestasService } from '../../shared/services/respuestas.service';

@Component({
  selector: 'app-inventario-confirmar-page',
  imports: [],
  templateUrl: './inventario-confirmar.page.html',
  styleUrl: './inventario-confirmar.page.scss',
})
export class InventarioConfirmarPage implements OnInit {
  protected readonly materialesService = inject(MaterialesService);
  protected readonly respuestasService = inject(RespuestasService);
  private readonly router = inject(Router);

  /** El backend rechaza la confirmación final si queda algún precargado sin validar -- se bloquea el botón antes de que eso ocurra. */
  protected readonly faltanPrecargadosPorValidar = computed(
    () => this.respuestasService.precargadosPendientes().length > 0,
  );

  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal<string | null>(null);
  protected readonly confirmando = signal(false);
  protected readonly errorConfirmar = signal<string | null>(null);

  public ngOnInit(): void {
    // Se vuelve a pedir siempre (no solo se confía en el signal en memoria de
    // RespuestasService) para que un refresh de página en esta pantalla no
    // muestre una tabla vacía o desactualizada.
    this.cargando.set(true);
    this.errorCarga.set(null);

    let pendientes = this.materialesService.catalogo().length > 0 ? 1 : 2;
    const onDone = () => {
      pendientes -= 1;
      if (pendientes === 0) {
        this.cargando.set(false);
        if (this.respuestasService.borrador().length === 0) {
          void this.router.navigateByUrl('/inventario');
        }
      }
    };
    const onError = () => {
      this.errorCarga.set('No fue posible cargar tu selección. Vuelve a intentarlo.');
      onDone();
    };

    if (pendientes === 2) {
      this.materialesService.cargarCatalogo().subscribe({ next: onDone, error: onError });
    }
    this.respuestasService.cargarMisRespuestas().subscribe({ next: onDone, error: onError });
  }

  protected volverAEditar(): void {
    void this.router.navigateByUrl('/inventario');
  }

  protected confirmarEnvio(): void {
    if (this.confirmando()) return;
    this.confirmando.set(true);
    this.errorConfirmar.set(null);

    this.respuestasService.confirmarEnvio().subscribe({
      next: () => {
        this.confirmando.set(false);
        void this.router.navigateByUrl('/inventario/gracias');
      },
      error: () => {
        this.confirmando.set(false);
        this.errorConfirmar.set('No fue posible confirmar el envío. Intenta nuevamente.');
      },
    });
  }
}
