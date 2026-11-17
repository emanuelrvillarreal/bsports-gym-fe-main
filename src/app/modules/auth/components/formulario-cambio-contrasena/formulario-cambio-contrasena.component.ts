import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

import { ResetPassPayload } from '../../../../core/global-services/interfaces/auth-service.interfaces';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { InputPasswordComponent } from '../../../ui/input-password/input-password.component';
import { ValidacionFormularioDirective } from '../../../ui/validacion-formulario/validacion-formulario.directive';

type PasswordStrengthLevel = 'weak' | 'medium' | 'strong';

type PasswordStrength = {
  readonly level: PasswordStrengthLevel;
  readonly label: string;
  readonly activeSegments: number;
};

@Component({
  selector: 'app-formulario-cambio-contrasena',
  standalone: true,
  imports: [BotonComponent, InputPasswordComponent, ReactiveFormsModule, ValidacionFormularioDirective],
  templateUrl: './formulario-cambio-contrasena.component.html',
  styleUrl: './formulario-cambio-contrasena.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioCambioContrasenaComponent {
  private readonly formBuilder = new FormBuilder();

  readonly usuario = input('');
  readonly email = input('');
  readonly code = input('');
  readonly cargando = input(false);
  readonly mensajeErrorExterno = input('');
  readonly linkValido = input(true);

  readonly volverLogin = output<void>();
  readonly submitted = output<ResetPassPayload>();

  protected readonly intentoEnvio = signal(false);

  protected readonly formulario = this.formBuilder.nonNullable.group(
    {
      password: ['', [Validators.required]],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: [this.passwordMatchValidator()],
    },
  );
  private readonly passwordValue = toSignal(this.formulario.controls.password.valueChanges, {
    initialValue: this.formulario.controls.password.value,
  });
  private readonly confirmPasswordValue = toSignal(
    this.formulario.controls.confirmPassword.valueChanges,
    {
      initialValue: this.formulario.controls.confirmPassword.value,
    },
  );

  protected readonly passwordStrength = computed<PasswordStrength>(() => {
    const password = this.passwordValue().trim();
    return this.calculatePasswordStrength(password);
  });

  protected readonly tituloUsuario = computed(() => {
    const usuario = this.usuario().trim();
    return usuario || this.email().trim() || 'tu cuenta';
  });

  protected readonly passwordError = computed(() => {
    this.passwordValue();
    const control = this.formulario.controls.password;
    if (!this.debeMostrarError(control)) {
      return '';
    }
    if (control.hasError('required')) {
      return 'La nueva contraseña es obligatoria.';
    }
    return '';
  });

  protected readonly confirmPasswordError = computed(() => {
    this.passwordValue();
    this.confirmPasswordValue();
    const control = this.formulario.controls.confirmPassword;
    if (!this.debeMostrarError(control) && !this.formulario.hasError('passwordMismatch')) {
      return '';
    }
    if (control.hasError('required')) {
      return 'Repetí la contraseña.';
    }
    if (this.formulario.hasError('passwordMismatch')) {
      return 'Las contraseñas no coinciden.';
    }
    return '';
  });

  protected readonly mensajeContexto = computed(() => {
    if (!this.linkValido()) {
      return 'El enlace no es válido o está incompleto. Pedí uno nuevo desde el inicio de sesión.';
    }

    const email = this.email().trim();
    return email
      ? `Vas a cambiar la contraseña de ${email}.`
      : 'Elegí una contraseña nueva para continuar.';
  });

  protected readonly bloqueoEnvio = computed(() => this.cargando() || !this.linkValido());

  protected regresarALogin(): void {
    this.volverLogin.emit();
  }

  protected restablecer(): void {
    this.intentoEnvio.set(true);
    this.formulario.markAllAsTouched();

    if (this.formulario.invalid || !this.linkValido() || this.cargando()) {
      return;
    }

    const { password } = this.formulario.getRawValue();
    this.submitted.emit({
      email: this.email().trim().toLowerCase(),
      code: this.code().trim(),
      password: password.trim(),
    });
  }

  private debeMostrarError(control: AbstractControl): boolean {
    return control.touched || control.dirty || this.intentoEnvio();
  }

  private passwordMatchValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const password = control.get('password')?.value?.trim() ?? '';
      const confirmPassword = control.get('confirmPassword')?.value?.trim() ?? '';

      if (!password || !confirmPassword) {
        return null;
      }

      return password === confirmPassword ? null : { passwordMismatch: true };
    };
  }

  private calculatePasswordStrength(password: string): PasswordStrength {
    if (!password) {
      return { level: 'weak', label: 'Sin definir', activeSegments: 0 };
    }

    let score = 0;
    if (password.length >= 6) {
      score += 1;
    }
    if (/[A-Z]/.test(password)) {
      score += 1;
    }
    if (/\d/.test(password)) {
      score += 1;
    }
    if (password.length >= 10) {
      score += 1;
    }

    if (score <= 1) {
      return { level: 'weak', label: 'Débil', activeSegments: 1 };
    }

    if (score <= 3) {
      return { level: 'medium', label: 'Media', activeSegments: 2 };
    }

    return { level: 'strong', label: 'Fuerte', activeSegments: 3 };
  }
}
