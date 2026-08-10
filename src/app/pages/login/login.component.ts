import { Component, inject, ChangeDetectorRef } from '@angular/core';
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
  private cdr = inject(ChangeDetectorRef); // Forzamos la actualización de la vista

  cargando = false;
  mostrarModal = false;
  tipoModal: 'cargando' | 'exito' | 'error' = 'cargando';
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

    // 1. Abrimos el modal en estado 'cargando'
    this.cargando = true;
    this.mostrarModal = true;
    this.tipoModal = 'cargando';
    this.errorLogin = null;
    this.cdr.detectChanges(); // Refresca UI inmediatamente

    try {
      const { email, password } = this.loginForm.value;
      
      const res = await this.supabaseService.login(email, password).catch((err) => {
        return { data: null, error: err };
      });

      // 2. Si falla la clave o el email
      if (!res || res.error) {
        console.warn('Error detectado en login:', res?.error);
        this.errorLogin = 'Email o contraseña incorrectos.';
        this.tipoModal = 'error';
        this.cargando = false;
        this.cdr.detectChanges(); // <-- OBLIGA A ANGULAR A CAMBIAR EL MODAL A ERROR
        return;
      }

      // 3. Si ingresó bien
      const perfil = await this.supabaseService.obtenerPerfilUsuario().catch(() => null);

      this.tipoModal = 'exito';
      this.cdr.detectChanges();

      setTimeout(async () => {
        this.cerrarModal();
        if (perfil?.rol === 'admin') {
          await this.router.navigate(['/admin']);
        } else if (perfil?.rol === 'empleado') {
          await this.router.navigate(['/empleados']);
        } else {
          await this.router.navigate(['/home']);
        }
      }, 1000);

    } catch (err: any) {
      console.error('Error imprevisto en Login:', err);
      this.errorLogin = 'Email o contraseña incorrectos.';
      this.tipoModal = 'error';
      this.cdr.detectChanges();
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.cdr.detectChanges();
  }
}