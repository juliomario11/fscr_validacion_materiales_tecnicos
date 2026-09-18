import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AdjuntoRespuesta } from '../../shared/models/adjunto-respuesta';
import { Material } from '../../shared/models/material';
import { RespuestaMaterial } from '../../shared/models/respuesta-material';
import { AuthService } from '../../shared/services/auth.service';
import { MaterialesService } from '../../shared/services/materiales.service';
import { RespuestasService } from '../../shared/services/respuestas.service';

type TipoPreview = 'imagen' | 'pdf';

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
export class EncuestaPage implements OnInit, OnDestroy {
  protected readonly auth = inject(AuthService);
  protected readonly materialesService = inject(MaterialesService);
  protected readonly respuestasService = inject(RespuestasService);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);

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

  protected readonly subiendoAdjunto = signal(false);
  protected readonly errorAdjunto = signal<string | null>(null);
  protected readonly procesandoAdjuntoId = signal<number | null>(null);

  protected readonly previewNombre = signal<string | null>(null);
  protected readonly previewTipo = signal<TipoPreview | null>(null);
  private previewObjectUrl: string | null = null;
  protected readonly previewUrl = signal<string | null>(null);
  protected readonly previewSafeUrl = computed<SafeResourceUrl | null>(() => {
    const url = this.previewUrl();
    if (!url || this.previewTipo() !== 'pdf') return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  /** Muestra "Cargo · Departamento" junto al nombre, omitiendo lo que venga null. */
  protected readonly metaEmpleado = computed<string | null>(() => {
    const usuario = this.auth.user();
    if (!usuario) return null;
    const partes = [usuario.cargo, usuario.departamento].filter(
      (valor): valor is string => !!valor && valor.trim() !== '',
    );
    return partes.length > 0 ? partes.join(' · ') : null;
  });

  protected readonly materialSeleccionado = computed<Material | null>(() => {
    const id = this.materialSeleccionadoId();
    if (!id) return null;
    return this.materialesService.catalogo().find((material) => material.id === id) ?? null;
  });

  /**
   * Respuesta ya guardada (borrador) para el material seleccionado, si existe.
   * Reactivo sobre `respuestasService.borrador()`: cada vez que se sube un
   * adjunto o se guarda la cantidad, esto se recalcula solo y la sección de
   * adjuntos del material seleccionado se actualiza sin recargar nada.
   */
  protected readonly respuestaSeleccionada = computed<RespuestaMaterial | null>(() => {
    const id = this.materialSeleccionadoId();
    if (id === null) return null;
    return this.respuestasService.borrador().find((respuesta) => respuesta.materialId === id) ?? null;
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
    this.errorAdjunto.set(null);
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
    this.errorAdjunto.set(null);
  }

  protected onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivo.set(input.files?.[0] ?? null);
  }

  /**
   * Guarda solo cantidad/observaciones (upsert). La subida de adjuntos es una
   * acción independiente (ver `subirAdjuntoActual`) que se habilita apenas la
   * respuesta existe, así el material seleccionado se mantiene visible con su
   * lista de adjuntos y la opción de "Adjuntar otra evidencia" siempre
   * disponible -- no se oculta tras la primera subida.
   */
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
          this.guardando.set(false);
        },
        error: () => {
          this.guardando.set(false);
          this.errorGuardado.set('No fue posible guardar el material. Intenta nuevamente.');
        },
      });
  }

  /**
   * Sube el archivo elegido para el material ya guardado en "mi lista". Tras
   * un éxito limpia el `<input type="file">` (vía la referencia de plantilla)
   * y el signal `archivo`, pero deja todo lo demás igual para poder repetir
   * la acción tantas veces como el backend lo permita (máximo 5 -- si se
   * excede, el backend responde 400 y ese mensaje se muestra tal cual).
   */
  protected subirAdjuntoActual(inputArchivo: HTMLInputElement): void {
    const respuesta = this.respuestaSeleccionada();
    const archivo = this.archivo();
    if (!respuesta || !archivo || this.subiendoAdjunto()) return;

    this.subiendoAdjunto.set(true);
    this.errorAdjunto.set(null);

    this.respuestasService.subirAdjunto(respuesta.materialId, archivo).subscribe({
      next: () => {
        this.subiendoAdjunto.set(false);
        this.archivo.set(null);
        inputArchivo.value = '';
      },
      error: (error: unknown) => {
        this.subiendoAdjunto.set(false);
        this.errorAdjunto.set(this.extraerMensajeError(error));
      },
    });
  }

  /**
   * Descarga el binario como blob y lo muestra en el modal de vista previa
   * (imagen o iframe de PDF según la extensión). El object URL se libera al
   * cerrar el modal (`cerrarPreview`) o al abrir/otra vista previa.
   */
  protected verAdjunto(adjunto: AdjuntoRespuesta): void {
    if (this.procesandoAdjuntoId()) return;
    this.errorAdjunto.set(null);
    this.procesandoAdjuntoId.set(adjunto.id);

    this.respuestasService.descargarAdjunto(adjunto.id).subscribe({
      next: (blob) => {
        this.procesandoAdjuntoId.set(null);
        this.liberarPreviewUrl();
        const url = URL.createObjectURL(blob);
        this.previewObjectUrl = url;
        this.previewUrl.set(url);
        this.previewNombre.set(adjunto.nombreArchivo);
        this.previewTipo.set(this.esPdf(adjunto.nombreArchivo) ? 'pdf' : 'imagen');
      },
      error: () => {
        this.procesandoAdjuntoId.set(null);
        this.errorAdjunto.set('No fue posible cargar la vista previa del adjunto.');
      },
    });
  }

  protected cerrarPreview(): void {
    this.liberarPreviewUrl();
    this.previewUrl.set(null);
    this.previewNombre.set(null);
    this.previewTipo.set(null);
  }

  /** Mismo fetch por blob que `verAdjunto`, pero fuerza la descarga con un `<a download>` temporal. */
  protected descargarAdjunto(adjunto: AdjuntoRespuesta): void {
    if (this.procesandoAdjuntoId()) return;
    this.errorAdjunto.set(null);
    this.procesandoAdjuntoId.set(adjunto.id);

    this.respuestasService.descargarAdjunto(adjunto.id).subscribe({
      next: (blob) => {
        this.procesandoAdjuntoId.set(null);
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = adjunto.nombreArchivo;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.procesandoAdjuntoId.set(null);
        this.errorAdjunto.set('No fue posible descargar el adjunto.');
      },
    });
  }

  private liberarPreviewUrl(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
  }

  private esPdf(nombreArchivo: string): boolean {
    return nombreArchivo.toLowerCase().endsWith('.pdf');
  }

  /** El backend (NestJS) responde `{ message: string | string[] }` en los 400; se muestra tal cual, sin inventar un mensaje propio. */
  private extraerMensajeError(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.error && typeof error.error === 'object') {
      const mensaje = (error.error as { message?: unknown }).message;
      if (Array.isArray(mensaje)) return mensaje.join(' ');
      if (typeof mensaje === 'string' && mensaje.trim() !== '') return mensaje;
    }
    return 'No fue posible subir el adjunto. Intenta nuevamente.';
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

  public ngOnDestroy(): void {
    this.liberarPreviewUrl();
  }
}
