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
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.cargando = true;
    this.errorLogin = null;

    try {
      const { email, password } = this.loginForm.value;
      
      // 1. Iniciar sesión en Supabase
      const { data, error } = await this.supabaseService.login(email, password);
      if (error) throw error;

      // 2. Obtener el perfil para verificar el rol
      const perfil = await this.supabaseService.obtenerPerfilUsuario();

      // 3. Redireccionar según el rol (Asegurate que las rutas coincidan con tu app.routes.ts)
      if (perfil?.rol === 'admin') {
        await this.router.navigate(['/admin']); // Cambiado a /admin si tu ruta es 'admin'
      } else if (perfil?.rol === 'empleado') {
        await this.router.navigate(['/empleados']);
      } else {
        await this.router.navigate(['/home']);
      }

    } catch (err: any) {
      console.error('Error Login:', err);
      this.errorLogin = err.message || 'Credenciales incorrectas o usuario no registrado.';
    } finally {
      this.cargando = false;
    }
  }
}