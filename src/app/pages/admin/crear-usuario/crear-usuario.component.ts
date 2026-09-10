import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../services/supabase.service';

@Component({
  selector: 'app-crear-usuario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crear-usuario.component.html',
  styleUrl: './crear-usuario.component.scss'
})
export class CrearUsuarioComponent implements OnInit {
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  cargando = false;
  localIdAdmin: number | null = null;

  nuevoUsuario = {
    nombre: '',
    email: '',
    password: '',
    rol: 'empleado',
    local_id: null as number | null
  };

  async ngOnInit() {
    await this.cargarPerfilAdmin();
  }

  async cargarPerfilAdmin() {
    try {
      // Obtenemos el perfil del admin logueado para extraer su local_id exacto (ej. Barbería San Lorenzo)
      const perfilAdmin = await this.supabaseService.obtenerPerfilUsuario();
      if (perfilAdmin && perfilAdmin.local_id !== undefined && perfilAdmin.local_id !== null) {
        this.localIdAdmin = Number(perfilAdmin.local_id);
        this.nuevoUsuario.local_id = this.localIdAdmin;
      }
      this.cdr.detectChanges();
    } catch (err) {
      console.error('Error al obtener el local_id del administrador:', err);
    }
  }

  async registrarEmpleado() {
    if (!this.nuevoUsuario.nombre || !this.nuevoUsuario.email || !this.nuevoUsuario.password) {
      alert('Por favor completá todos los campos obligatorios.');
      return;
    }

    if (!this.nuevoUsuario.local_id) {
      alert('Atención: No se pudo determinar la barbería del Administrador. Volvé a iniciar sesión.');
      return;
    }

    this.cargando = true;

    const datosLimpios = {
      nombre: this.nuevoUsuario.nombre.trim(),
      email: this.nuevoUsuario.email.trim(),
      password: this.nuevoUsuario.password,
      rol: this.nuevoUsuario.rol,
      local_id: Number(this.nuevoUsuario.local_id)
    };

    const { error } = await this.supabaseService.crearNuevoEmpleado(datosLimpios);

    this.cargando = false;

    if (error) {
      alert('Error al registrar usuario: ' + error.message);
    } else {
      alert(`¡Usuario ${datosLimpios.email} registrado con éxito en tu barbería!`);
      this.router.navigate(['/admin']);
    }
  }

  volverAlAdmin() {
    this.router.navigate(['/admin']);
  }
}