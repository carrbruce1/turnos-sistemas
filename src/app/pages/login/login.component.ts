import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);

  cargando = false;
  errorLogin: string | null = null;

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  f(campo: string) {
    return this.loginForm.get(campo);
  }

  async onSubmit() {
    if (loginFormInvalid(this.loginForm)) return;

    this.cargando = true;
    this.errorLogin = null;

    try {
      const { email, password } = this.loginForm.value;
      const { data, error } = await this.supabaseService.login(email, password);

      if (error) throw error;

      // Consultar el rol del usuario logueado
      const perfil = await this.supabaseService.obtenerPerfilUsuario();

      if (perfil?.rol === 'admin') {
        this.router.navigate(['/admin']);
      } else if (perfil?.rol === 'empleado') {
        this.router.navigate(['/empleado']);
      } else {
        this.router.navigate(['/']);
      }

    } catch (err: any) {
      this.errorLogin = 'Credenciales incorrectas o usuario no registrado.';
    } finally {
      this.cargando = false;
    }
  }
}

function loginFormInvalid(form: FormGroup): boolean {
  if (form.invalid) {
    form.markAllAsTouched();
    return true;
  }
  return false;
}
