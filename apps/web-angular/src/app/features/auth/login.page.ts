import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    cedula: ['', [Validators.required]],
  });

  protected submit(): void {
    this.form.markAllAsTouched();
    this.errorMessage.set(null);
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    const { cedula } = this.form.getRawValue();

    this.auth.login(cedula.trim()).subscribe({
      next: () => {
        void this.router.navigateByUrl('/encuesta');
      },
      error: (error: unknown) => {
        this.loading.set(false);
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.errorMessage.set('Cédula no encontrada o sin acceso a la encuesta.');
        } else {
          this.errorMessage.set('No fue posible validar la cédula. Intenta nuevamente.');
        }
      },
    });
  }
}
