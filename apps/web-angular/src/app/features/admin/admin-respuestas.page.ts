import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AdminAuthService } from '../../shared/services/admin-auth.service';
import { AdminRespuestasService } from '../../shared/services/admin-respuestas.service';

@Component({
  selector: 'app-admin-respuestas-page',
  imports: [DatePipe, RouterLink],
  templateUrl: './admin-respuestas.page.html',
  styleUrl: './admin-respuestas.page.scss',
})
export class AdminRespuestasPage implements OnInit {
  protected readonly adminAuth = inject(AdminAuthService);
  private readonly respuestasService = inject(AdminRespuestasService);
  private readonly router = inject(Router);

  protected readonly respuestas = this.respuestasService.respuestas;
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal<string | null>(null);

  public ngOnInit(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);
    this.respuestasService.cargarRespuestas().subscribe({
      next: () => this.cargando.set(false),
      error: () => {
        this.cargando.set(false);
        this.errorCarga.set('No fue posible cargar las respuestas. Intenta nuevamente.');
      },
    });
  }

  protected cerrarSesion(): void {
    this.adminAuth.logout();
    void this.router.navigateByUrl('/admin/login');
  }
}
