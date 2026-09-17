import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { Material } from '../../shared/models/material';
import { RespuestaMaterial } from '../../shared/models/respuesta-material';
import { AuthService } from '../../shared/services/auth.service';
import { MaterialesService } from '../../shared/services/materiales.service';
import { RespuestasService } from '../../shared/services/respuestas.service';

interface GrupoMateriales {
  readonly categoria: string;
  readonly materiales: readonly Material[];
}

@Component({
  selector: 'app-encuesta-page',
  imports: [FormsModule, DatePipe],
  templateUrl: './encuesta.page.html',
  styleUrl: './encuesta.page.scss',
})
export class EncuestaPage implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly materialesService = inject(MaterialesService);
  protected readonly respuestasService = inject(RespuestasService);
  private readonly router = inject(Router);

  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal<string | null>(null);

  protected readonly filtroTexto = signal('');
  protected readonly materialSeleccionadoId = signal<number | null>(null);
  protected readonly cantidad = signal<number | null>(null);
  protected readonly observaciones = signal('');
  protected readonly archivo = signal<File | null>(null);

  protected readonly guardando = signal(false);
  protected readonly errorGuardado = signal<string | null>(null);
  protected readonly quitandoId = signal<number | null>(null);

  protected readonly materialSeleccionado = computed<Material | null>(() => {
    const id = this.materialSeleccionadoId();
    if (!id) return null;
    return this.materialesService.catalogo().find((material) => material.id === id) ?? null;
  });

  protected readonly idsEnLista = computed(
    () => new Set(this.respuestasService.borrador().map((respuesta) => respuesta.materialId)),
  );

  protected readonly gruposFiltrados = computed<GrupoMateriales[]>(() => {
    const texto = this.filtroTexto().trim().toLowerCase();
    const catalogo = this.materialesService.catalogo();
    const filtrados = texto
      ? catalogo.filter(
          (material) =>
            material.descripcion.toLowerCase().includes(texto) ||
            material.codigo.toLowerCase().includes(texto) ||
            material.categoria.toLowerCase().includes(texto),
        )
      : catalogo;

    const grupos = new Map<string, Material[]>();
    for (const material of filtrados) {
      const lista = grupos.get(material.categoria) ?? [];
      lista.push(material);
      grupos.set(material.categoria, lista);
    }
    return Array.from(grupos.entries())
      .sort(([categoriaA], [categoriaB]) => categoriaA.localeCompare(categoriaB))
      .map(([categoria, materiales]) => ({ categoria, materiales }));
  });

  protected readonly puedeContinuar = computed(() => this.respuestasService.borrador().length > 0);

  public ngOnInit(): void {
    this.cargarDatos();
  }

  protected cargarDatos(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);

    let pendientes = 2;
    const onDone = () => {
      pendientes -= 1;
      if (pendientes === 0) this.cargando.set(false);
    };
    const onError = () => {
      this.errorCarga.set('No fue posible cargar la información de la encuesta. Recarga la página.');
      onDone();
    };

    this.materialesService.cargarCatalogo().subscribe({ next: onDone, error: onError });
    this.respuestasService.cargarMisRespuestas().subscribe({ next: onDone, error: onError });
  }

  protected seleccionarMaterial(material: Material): void {
    this.materialSeleccionadoId.set(material.id);
    this.errorGuardado.set(null);
    this.archivo.set(null);

    const existente = this.respuestasService
      .borrador()
      .find((respuesta) => respuesta.materialId === material.id);
    this.cantidad.set(existente?.cantidad ?? null);
    this.observaciones.set(existente?.observaciones ?? '');
  }

  protected editar(respuesta: RespuestaMaterial): void {
    this.seleccionarMaterial(respuesta.material);
  }

  protected limpiarSeleccion(): void {
    this.materialSeleccionadoId.set(null);
    this.cantidad.set(null);
    this.observaciones.set('');
    this.archivo.set(null);
    this.errorGuardado.set(null);
  }

  protected onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivo.set(input.files?.[0] ?? null);
  }

  protected agregarAMiLista(): void {
    const material = this.materialSeleccionado();
    const cantidad = this.cantidad();
    if (!material || cantidad === null || cantidad <= 0 || this.guardando()) return;

    this.guardando.set(true);
    this.errorGuardado.set(null);

    this.respuestasService
      .guardarRespuesta(material.id, {
        cantidad,
        observaciones: this.observaciones().trim() || null,
      })
      .subscribe({
        next: () => {
          const archivo = this.archivo();
          if (!archivo) {
            this.guardando.set(false);
            this.limpiarSeleccion();
            return;
          }
          this.respuestasService.subirAdjunto(material.id, archivo).subscribe({
            next: () => {
              this.guardando.set(false);
              this.limpiarSeleccion();
            },
            error: () => {
              this.guardando.set(false);
              this.errorGuardado.set(
                'Se guardó la cantidad, pero el adjunto no se pudo subir. Edita el ítem para reintentar.',
              );
            },
          });
        },
        error: () => {
          this.guardando.set(false);
          this.errorGuardado.set('No fue posible guardar el material. Intenta nuevamente.');
        },
      });
  }

  protected quitar(respuesta: RespuestaMaterial): void {
    this.quitandoId.set(respuesta.materialId);
    this.respuestasService.eliminarRespuesta(respuesta.materialId).subscribe({
      next: () => {
        this.quitandoId.set(null);
        if (this.materialSeleccionadoId() === respuesta.materialId) this.limpiarSeleccion();
      },
      error: () => {
        this.quitandoId.set(null);
      },
    });
  }

  protected continuar(): void {
    if (!this.puedeContinuar()) return;
    void this.router.navigateByUrl('/encuesta/confirmar');
  }

  protected cerrarSesion(): void {
    this.auth.logout().subscribe(() => void this.router.navigateByUrl('/login'));
  }
}
