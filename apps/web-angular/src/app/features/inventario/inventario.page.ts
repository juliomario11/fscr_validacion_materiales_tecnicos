import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AdjuntoRespuesta } from '../../shared/models/adjunto-respuesta';
import { Material } from '../../shared/models/material';
import { EstadoPrecarga, RespuestaMaterial } from '../../shared/models/respuesta-material';
import { AuthService } from '../../shared/services/auth.service';
import { MaterialesService } from '../../shared/services/materiales.service';
import { RespuestasService } from '../../shared/services/respuestas.service';

type TipoPreview = 'imagen' | 'pdf';

interface GrupoMateriales {
  readonly categoria: string;
  readonly materiales: readonly Material[];
}

@Component({
  selector: 'app-inventario-page',
  imports: [FormsModule, DatePipe],
  templateUrl: './inventario.page.html',
  styleUrl: './inventario.page.scss',
})
export class InventarioPage implements OnInit, OnDestroy {
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
  protected readonly serial = signal('');
  protected readonly archivo = signal<File | null>(null);

  protected readonly guardando = signal(false);
  protected readonly errorGuardado = signal<string | null>(null);
  protected readonly quitandoId = signal<number | null>(null);

  protected readonly subiendoAdjunto = signal(false);
  protected readonly errorAdjunto = signal<string | null>(null);
  protected readonly procesandoAdjuntoId = signal<number | null>(null);

  protected readonly procesandoPrecargaId = signal<number | null>(null);
  protected readonly errorPrecarga = signal<string | null>(null);

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
   * Fila MANUAL (`origen='manual'`) ya guardada para el material
   * seleccionado, si existe -- nunca una fila `precargado`: esas se
   * validan aparte (ver `precargadosPendientes`/`misPrecargados` y la
   * sección de precarga en la plantilla), no se editan desde este
   * formulario. Reactivo sobre `respuestasService.borrador()`: cada vez que
   * se sube un adjunto o se guarda la cantidad, esto se recalcula solo y la
   * sección de adjuntos del material seleccionado se actualiza sin recargar
   * nada.
   */
  protected readonly respuestaSeleccionada = computed<RespuestaMaterial | null>(() => {
    const id = this.materialSeleccionadoId();
    if (id === null) return null;
    return (
      this.respuestasService
        .borrador()
        .find((respuesta) => respuesta.materialId === id && respuesta.origen === 'manual') ?? null
    );
  });

  /** Materiales agregados manualmente -- la tabla "Mi selección actual" (con Editar/Quitar) solo muestra estos, nunca los precargados. */
  protected readonly misManuales = computed(() =>
    this.respuestasService.borrador().filter((respuesta) => respuesta.origen === 'manual'),
  );

  /** Todos los ítems precargados del cron (validados o no) -- una sola lista para la sección "Materiales que el sistema tiene registrados para ti". */
  protected readonly misPrecargados = computed(() =>
    this.respuestasService.borrador().filter((respuesta) => respuesta.origen === 'precargado'),
  );

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

  /**
   * No basta con "hay algo en borrador" -- si quedan ítems precargados sin
   * validar, el backend rechaza la confirmación final
   * (`PrecargaSinValidarException`). Se bloquea "Continuar" antes de
   * llegar a esa pantalla para no hacer descubrir el error hasta el final.
   */
  protected readonly puedeContinuar = computed(
    () =>
      this.respuestasService.borrador().length > 0 &&
      this.respuestasService.precargadosPendientes().length === 0,
  );

  public ngOnInit(): void {
    this.cargarDatos();
  }

  /**
   * Secuencial a propósito (mis-respuestas primero, catálogo después) y NO
   * en paralelo: así el catálogo de selección jamás llega a pedirse -- ni
   * por lo tanto a pintarse -- cuando el empleado ya confirmó todo (ej.
   * vuelve a loguearse con su cédula tiempo después). Con las dos llamadas
   * en paralelo existía una ventana real en la que esta pantalla se
   * alcanzaba a mostrar antes de que resolviera la redirección.
   */
  protected cargarDatos(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);

    this.respuestasService.cargarMisRespuestas().subscribe({
      next: () => {
        const yaConfirmoTodo =
          this.respuestasService.borrador().length === 0 && this.respuestasService.confirmadas().length > 0;
        if (yaConfirmoTodo) {
          void this.router.navigateByUrl('/inventario/gracias');
          return;
        }
        this.cargarCatalogo();
      },
      error: () => {
        this.errorCarga.set('No fue posible cargar la información del inventario. Recarga la página.');
        this.cargando.set(false);
      },
    });
  }

  private cargarCatalogo(): void {
    this.materialesService.cargarCatalogo().subscribe({
      next: () => this.cargando.set(false),
      error: () => {
        this.errorCarga.set('No fue posible cargar la información del inventario. Recarga la página.');
        this.cargando.set(false);
      },
    });
  }

  protected seleccionarMaterial(material: Material): void {
    this.materialSeleccionadoId.set(material.id);
    this.errorGuardado.set(null);
    this.errorAdjunto.set(null);
    this.archivo.set(null);

    const existente = this.respuestasService
      .borrador()
      .find((respuesta) => respuesta.materialId === material.id && respuesta.origen === 'manual');
    this.cantidad.set(existente?.cantidad ?? null);
    this.observaciones.set(existente?.observaciones ?? '');
    this.serial.set(existente?.serial ?? '');
  }

  protected editar(respuesta: RespuestaMaterial): void {
    this.seleccionarMaterial(respuesta.material);
  }

  protected limpiarSeleccion(): void {
    this.materialSeleccionadoId.set(null);
    this.cantidad.set(null);
    this.observaciones.set('');
    this.serial.set('');
    this.archivo.set(null);
    this.errorGuardado.set(null);
    this.errorAdjunto.set(null);
  }

  /**
   * Sube el archivo apenas se elige en el `<input type="file">`, sin exigir
   * un click adicional -- antes se guardaba en `archivo` y solo se subía si
   * el usuario pulsaba "Adjuntar otra evidencia", lo que hacía creer que el
   * archivo ya estaba cargado cuando en realidad no se había enviado.
   */
  protected onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    input.value = '';
    if (!archivo) return;

    const respuesta = this.respuestaSeleccionada();
    if (!respuesta || this.subiendoAdjunto()) return;

    this.subiendoAdjunto.set(true);
    this.errorAdjunto.set(null);
    this.archivo.set(archivo);

    this.respuestasService.subirAdjunto(respuesta.materialId, archivo).subscribe({
      next: () => {
        this.subiendoAdjunto.set(false);
        this.archivo.set(null);
      },
      error: (error: unknown) => {
        this.subiendoAdjunto.set(false);
        this.archivo.set(null);
        this.errorAdjunto.set(this.extraerMensajeError(error));
      },
    });
  }

  /**
   * Guarda solo cantidad/observaciones (upsert). La subida de adjuntos es una
   * acción independiente (ver `onArchivoSeleccionado`) que se habilita apenas
   * la respuesta existe, así el material seleccionado se mantiene visible con
   * su lista de adjuntos y el campo para adjuntar evidencia siempre
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
        serial: this.serial().trim() || null,
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
   * El técnico (o el supervisor, en la misma sesión) valida un ítem
   * precargado puntual: "sí lo tengo" o "ya no lo tengo". Se puede cambiar
   * de opinión mientras siga en borrador -- vuelve a llamar este mismo
   * endpoint con el otro estado.
   */
  protected confirmarPrecarga(respuesta: RespuestaMaterial, estado: EstadoPrecarga): void {
    if (this.procesandoPrecargaId()) return;
    this.errorPrecarga.set(null);
    this.procesandoPrecargaId.set(respuesta.id);

    this.respuestasService.confirmarPrecarga(respuesta.id, estado).subscribe({
      next: () => this.procesandoPrecargaId.set(null),
      error: () => {
        this.procesandoPrecargaId.set(null);
        this.errorPrecarga.set('No fue posible registrar tu respuesta. Intenta nuevamente.');
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
    void this.router.navigateByUrl('/inventario/confirmar');
  }

  protected cerrarSesion(): void {
    this.auth.logout().subscribe(() => void this.router.navigateByUrl('/login'));
  }

  public ngOnDestroy(): void {
    this.liberarPreviewUrl();
  }
}
