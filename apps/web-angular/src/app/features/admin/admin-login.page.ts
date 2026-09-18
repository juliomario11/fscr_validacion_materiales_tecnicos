import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AdminAuthService } from '../../shared/services/admin-auth.service';

@Component({
  selector: 'app-admin-login-page',
  imports: [ReactiveFormsModule],
  templateUrl: './admin-login.page.html',
  styleUrl: './admin-login.page.scss',
})
export class AdminLoginPage {
  private readonly adminAuth = inject(AdminAuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    usuario: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  protected submit(): void {
    this.form.markAllAsTouched();
    this.errorMessage.set(null);
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    const { usuario, password } = this.form.getRawValue();

    this.adminAuth.login(usuario.trim(), password).subscribe({
      next: () => {
        void this.router.navigateByUrl('/admin/empleados');
      },
      error: (error: unknown) => {
        this.loading.set(false);
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.errorMessage.set('Usuario o contraseña incorrectos.');
        } else {
          this.errorMessage.set('No fue posible iniciar sesión. Intenta nuevamente.');
        }
      },
    });
  }
}
