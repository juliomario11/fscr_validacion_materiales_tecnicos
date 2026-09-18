import { DatePipe, NgTemplateOutlet } from '@angular/common';
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
  imports: [FormsModule, DatePipe, NgTemplateOutlet],
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

  protected readonly errorPrecarga = signal<string | null>(null);
  protected readonly subiendoAdjuntoPrecargaId = signal<number | null>(null);

  /**
   * Valores que el técnico está tentativamente escribiendo por ítem
   * precargado (cantidad, corrección de serial, observaciones) -- viven
   * SOLO en este componente hasta que se pulsa "Sí, lo tengo"/"Ya no lo
   * tengo" (ahí pasan a `RespuestasService.establecerDecisionPrecargaLocal`,
   * y de ahí a la BD solo al confirmar el envío completo).
   */
  private readonly cantidadesPrecarga = signal<ReadonlyMap<number, number>>(new Map());
  private readonly observacionesPrecarga = signal<ReadonlyMap<number, string>>(new Map());
  /** Ids de ítems precargados donde el técnico marcó el check "¿Deseas adjuntar un archivo?" -- solo ahí se muestra el `<input type="file">`. */
  private readonly quiereAdjuntarPrecargaState = signal<ReadonlySet<number>>(new Set());
  /**
   * Ids de ítems precargados donde el técnico pulsó "Ya no lo tengo" --
   * despliega el campo de observaciones (obligatorio) aunque todavía no haya
   * una decisión LOCAL válida (esa solo se crea una vez que escribe algo).
   */
  private readonly eligiendoNegativaState = signal<ReadonlySet<number>>(new Set());
  /**
   * Ids de ítems precargados donde el técnico pulsó "Sí, lo tengo" -- a
   * diferencia de `decisionPrecarga`, esto NUNCA se borra mientras haya un
   * campo inválido (cantidad o serial real faltante): así el bloque de
   * detalle se mantiene desplegado para que pueda corregirlo, en vez de
   * colapsarse de golpe.
   */
  private readonly quiereConfirmarState = signal<ReadonlySet<number>>(new Set());
  /** `true`/`false` según el técnico responda si el serial del sistema coincide con el que tiene en mano -- `null` mientras no responda (se asume que coincide, sin bloquear nada). */
  private readonly coincideSerialState = signal<ReadonlyMap<number, boolean>>(new Map());
  /** Serial real, SOLO cuando `coincideSerialState` es `false` -- arranca vacío a propósito, nunca precargado con el valor viejo. */
  private readonly nuevosSerialesPrecarga = signal<ReadonlyMap<number, string>>(new Map());
  /**
   * Ids de ítems precargados que el técnico colapsó manualmente tras
   * completar los campos -- clave para que la página no se vuelva
   * kilométrica en un técnico con 80+ ítems asignados. Solo se puede
   * colapsar una vez hay una decisión LOCAL válida (`puedeColapsarDetalle`);
   * arranca vacío (desplegado) y se limpia cada vez que cambia de opinión
   * entre "sí"/"no" para que el nuevo modo se vea de una vez.
   */
  private readonly detalleColapsadoState = signal<ReadonlySet<number>>(new Set());

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

  /**
   * Agrupa los precargados por material -- cuando un técnico tiene varias
   * unidades seriadas del MISMO ítem (ej. 3 "MODEM FO HGU MITR" con serial
   * distinto), repetir la descripción completa 3 veces hace que las
   * tarjetas se vean casi idénticas y sea fácil perderse. Con más de un
   * ítem en el grupo, la plantilla muestra el nombre del material UNA
   * sola vez y cada fila queda reducida a su serial + los mismos
   * controles de siempre (nada cambia en cómo se guarda cada decisión --
   * sigue siendo independiente por `id`).
   */
  protected readonly gruposPrecargados = computed(() => {
    const grupos = new Map<number, RespuestaMaterial[]>();
    for (const respuesta of this.misPrecargados()) {
      const lista = grupos.get(respuesta.materialId) ?? [];
      lista.push(respuesta);
      grupos.set(respuesta.materialId, lista);
    }
    return Array.from(grupos.values());
  });

  /** "X de Y validados" a nivel de grupo -- mismo criterio que `progresoPrecarga`, pero solo sobre las filas de ese material. */
  protected validadosEnGrupo(grupo: readonly RespuestaMaterial[]): number {
    const decisiones = this.respuestasService.decisionesPrecarga();
    return grupo.filter((respuesta) => decisiones.has(respuesta.id)).length;
  }

  /** "X de Y validados" -- para la barra de progreso de la sección de precarga. */
  protected readonly progresoPrecarga = computed(() => {
    const decisiones = this.respuestasService.decisionesPrecarga();
    const precargados = this.misPrecargados();
    const validados = precargados.filter((respuesta) => decisiones.has(respuesta.id)).length;
    return { total: precargados.length, validados };
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

  /**
   * No basta con "hay algo en borrador" -- si quedan ítems precargados sin
   * validar, el backend rechaza la confirmación final
   * (`PrecargaSinValidarException`). Se bloquea "Continuar" antes de
   * llegar a esa pantalla para no hacer descubrir el error hasta el final.
   */
  protected readonly puedeContinuar = computed(
    () => this.respuestasService.borrador().length > 0 && !this.respuestasService.faltanDecisionesPrecarga(),
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

  protected cantidadPrecarga(respuestaId: number): number {
    return this.cantidadesPrecarga().get(respuestaId) ?? 1;
  }

  /**
   * Solo dígitos -- sin signo, sin punto decimal, sin notación científica.
   * `type="text" inputmode="numeric"` en vez de `type="number"` porque un
   * `<input type="number">` sigue dejando teclear "-"/"."/"e" aunque tenga
   * `min`/`step`; acá se limpia el valor tecleado carácter por carácter.
   */
  protected establecerCantidadPrecarga(respuesta: RespuestaMaterial, valorCrudo: string | number): void {
    const soloDigitos = String(valorCrudo).replace(/[^0-9]/g, '');
    const valor = soloDigitos === '' ? 0 : parseInt(soloDigitos, 10);
    this.cantidadesPrecarga.update((mapa) => new Map(mapa).set(respuesta.id, valor));
    this.reafirmarDecisionSiConfirmado(respuesta);
  }

  /**
   * Bloquea la tecla/caracter ANTES de que llegue a insertarse -- el
   * sanitizado de `establecerCantidadPrecarga` (sobre el valor ya
   * insertado) es un respaldo, pero en varios teclados de celular con
   * texto predictivo el carácter llega a verse un instante antes de
   * corregirse. `beforeinput` sí lo dispara tanto el teclado físico como
   * el virtual, a diferencia de `keydown`.
   */
  protected bloquearEntradaNoNumerica(event: InputEvent): void {
    if (event.data && /[^0-9]/.test(event.data)) {
      event.preventDefault();
    }
  }

  /** `true`/`false` si ya respondió, `null` si todavía no -- silencio se trata como "coincide" (no se corrige nada). */
  protected coincideSerial(respuestaId: number): boolean | null {
    return this.coincideSerialState().get(respuestaId) ?? null;
  }

  protected establecerCoincideSerial(respuesta: RespuestaMaterial, coincide: boolean): void {
    this.coincideSerialState.update((mapa) => new Map(mapa).set(respuesta.id, coincide));
    this.reafirmarDecisionSiConfirmado(respuesta);
  }

  /** Vacío mientras no escriba nada -- nunca se precarga con el serial viejo, justo para forzar a que teclee el real. */
  protected nuevoSerialPrecarga(respuestaId: number): string {
    return this.nuevosSerialesPrecarga().get(respuestaId) ?? '';
  }

  protected establecerNuevoSerialPrecarga(respuesta: RespuestaMaterial, valor: string): void {
    this.nuevosSerialesPrecarga.update((mapa) => new Map(mapa).set(respuesta.id, valor));
    this.reafirmarDecisionSiConfirmado(respuesta);
  }

  protected observacionesPrecargaValor(respuestaId: number): string {
    return this.observacionesPrecarga().get(respuestaId) ?? '';
  }

  protected establecerObservacionesPrecarga(respuesta: RespuestaMaterial, valor: string): void {
    this.observacionesPrecarga.update((mapa) => new Map(mapa).set(respuesta.id, valor));
    if (this.eligiendoNegativa(respuesta.id)) {
      this.actualizarDecisionNegativa(respuesta);
    } else {
      this.reafirmarDecisionSiConfirmado(respuesta);
    }
  }

  protected decisionPrecarga(respuestaId: number) {
    return this.respuestasService.decisionPrecargaLocal(respuestaId);
  }

  /** La sección de detalle (cantidad/serial/observaciones/adjuntar) solo se despliega una vez que el técnico dijo "sí, lo tengo" -- antes de eso solo se ven los dos botones. */
  protected precargaExpandida(respuestaId: number): boolean {
    return this.quiereConfirmarState().has(respuestaId);
  }

  /** El bloque de "por qué ya no lo tienes" se despliega apenas se pulsa el botón, aunque todavía no haya una decisión LOCAL válida (esa recién se crea cuando escribe la observación). */
  protected eligiendoNegativa(respuestaId: number): boolean {
    return this.eligiendoNegativaState().has(respuestaId);
  }

  /** Solo se puede colapsar el detalle una vez hay una decisión LOCAL válida guardada -- mientras falte un campo obligatorio, el detalle se mantiene visible. */
  protected puedeColapsarDetalle(respuestaId: number): boolean {
    return !!this.decisionPrecarga(respuestaId);
  }

  /** `true` = detalle visible (cantidad/serial/observaciones/adjuntar); `false` = colapsado a solo el encabezado + botones. */
  protected mostrarDetalle(respuestaId: number): boolean {
    return !this.detalleColapsadoState().has(respuestaId);
  }

  protected alternarDetalleColapsado(respuestaId: number): void {
    this.detalleColapsadoState.update((set) => {
      const copia = new Set(set);
      if (copia.has(respuestaId)) {
        copia.delete(respuestaId);
      } else {
        copia.add(respuestaId);
      }
      return copia;
    });
  }

  protected quiereAdjuntarPrecarga(respuestaId: number): boolean {
    return this.quiereAdjuntarPrecargaState().has(respuestaId);
  }

  protected alternarAdjuntarPrecarga(respuestaId: number, marcado: boolean): void {
    this.quiereAdjuntarPrecargaState.update((set) => {
      const copia = new Set(set);
      if (marcado) {
        copia.add(respuestaId);
      } else {
        copia.delete(respuestaId);
      }
      return copia;
    });
  }

  /**
   * El técnico (o el supervisor, en la misma sesión) valida un ítem
   * precargado puntual: "sí lo tengo" (revela cantidad/serial/observaciones,
   * con cantidad=1 por defecto) o "ya no lo tengo" (revela observaciones,
   * OBLIGATORIAS -- no se guarda ninguna decisión hasta que las escriba).
   * Esto SOLO queda en memoria (`RespuestasService.establecerDecisionPrecargaLocal`)
   * -- nada se escribe en la BD hasta confirmar el envío completo. Se puede
   * cambiar de opinión pulsando el otro botón en cualquier momento.
   */
  protected decidirPrecarga(respuesta: RespuestaMaterial, estado: EstadoPrecarga): void {
    this.errorPrecarga.set(null);
    // Cambiar de opinión (o simplemente reafirmarla) siempre muestra el
    // detalle de nuevo -- así el técnico ve de una vez los campos del modo
    // al que acaba de cambiar, en vez de tener que pulsar "Editar" aparte.
    this.detalleColapsadoState.update((set) => {
      if (!set.has(respuesta.id)) return set;
      const copia = new Set(set);
      copia.delete(respuesta.id);
      return copia;
    });

    if (estado === 'ya_no_lo_tiene') {
      this.alternarAdjuntarPrecarga(respuesta.id, false);
      this.quiereConfirmarState.update((set) => {
        if (!set.has(respuesta.id)) return set;
        const copia = new Set(set);
        copia.delete(respuesta.id);
        return copia;
      });
      this.eligiendoNegativaState.update((set) => new Set(set).add(respuesta.id));
      this.actualizarDecisionNegativa(respuesta);
      return;
    }

    this.eligiendoNegativaState.update((set) => {
      if (!set.has(respuesta.id)) return set;
      const copia = new Set(set);
      copia.delete(respuesta.id);
      return copia;
    });
    this.quiereConfirmarState.update((set) => new Set(set).add(respuesta.id));
    if (!this.cantidadesPrecarga().has(respuesta.id)) {
      this.cantidadesPrecarga.update((mapa) => new Map(mapa).set(respuesta.id, 1));
    }
    this.guardarDecisionConfirmado(respuesta);
  }

  /**
   * Mientras el técnico siga en modo "sí, lo tengo" (`quiereConfirmarState`,
   * que NO se borra ante un campo inválido), cada cambio en
   * cantidad/coincide-serial/serial-real/observaciones reintenta guardar la
   * decisión local al vuelo -- así no hace falta un botón "Guardar" aparte
   * para esos campos, y una corrección posterior a un campo inválido sí
   * vuelve a intentarlo (a diferencia de mirar `decisionPrecarga`, que puede
   * haberse borrado por inválida).
   */
  private reafirmarDecisionSiConfirmado(respuesta: RespuestaMaterial): void {
    if (!this.quiereConfirmarState().has(respuesta.id)) return;
    this.guardarDecisionConfirmado(respuesta);
  }

  private guardarDecisionConfirmado(respuesta: RespuestaMaterial): void {
    const cantidad = this.cantidadPrecarga(respuesta.id);
    if (!cantidad || cantidad < 1) {
      this.errorPrecarga.set('Ingresa una cantidad válida (mínimo 1).');
      this.respuestasService.eliminarDecisionPrecargaLocal(respuesta.id);
      return;
    }

    // El serial del sistema (`serialSistema`) es de solo lectura -- solo se
    // pide (y exige) un serial nuevo cuando el técnico marca explícitamente
    // que NO coincide con el que tiene en mano. Si coincide (o no ha
    // respondido todavía), no se manda `serial` -- el backend deja el valor
    // actual intacto, que ya es igual a `serialSistema`.
    let serialFinal: string | null = null;
    if (respuesta.serialSistema && this.coincideSerial(respuesta.id) === false) {
      const nuevoSerial = this.nuevoSerialPrecarga(respuesta.id).trim();
      if (!nuevoSerial) {
        this.errorPrecarga.set('Ingresa el serial real que tiene el equipo.');
        this.respuestasService.eliminarDecisionPrecargaLocal(respuesta.id);
        return;
      }
      serialFinal = nuevoSerial;
    }

    this.respuestasService.establecerDecisionPrecargaLocal(respuesta.id, {
      estado: 'confirmado',
      cantidad,
      serial: serialFinal,
      observaciones: this.observacionesPrecargaValor(respuesta.id).trim() || null,
    });
  }

  /**
   * Solo guarda la decisión "ya no lo tengo" cuando ya escribió una
   * observación -- mientras esté vacía, se quita cualquier decisión previa
   * (si la había) para que `faltanDecisionesPrecarga` siga bloqueando
   * "Continuar" hasta que la complete.
   */
  private actualizarDecisionNegativa(respuesta: RespuestaMaterial): void {
    const observaciones = this.observacionesPrecargaValor(respuesta.id).trim();
    if (!observaciones) {
      this.respuestasService.eliminarDecisionPrecargaLocal(respuesta.id);
      return;
    }
    this.respuestasService.establecerDecisionPrecargaLocal(respuesta.id, {
      estado: 'ya_no_lo_tiene',
      cantidad: 0,
      observaciones,
    });
  }

  /** Sube evidencia para un ítem precargado -- a diferencia de la decisión (sí/no), el adjunto se sube de inmediato: la fila ya existe en la BD desde que se materializó al loguearse. */
  protected onArchivoPrecargaSeleccionado(respuesta: RespuestaMaterial, event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    input.value = '';
    if (!archivo || this.subiendoAdjuntoPrecargaId()) return;

    this.errorPrecarga.set(null);
    this.subiendoAdjuntoPrecargaId.set(respuesta.id);

    this.respuestasService.subirAdjuntoPrecarga(respuesta.id, archivo).subscribe({
      next: () => this.subiendoAdjuntoPrecargaId.set(null),
      error: (error: unknown) => {
        this.subiendoAdjuntoPrecargaId.set(null);
        this.errorPrecarga.set(this.extraerMensajeError(error));
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
