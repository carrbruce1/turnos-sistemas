import { Component, inject } from '@angular/core';
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
export class CrearUsuarioComponent {
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);

  cargando = false;

  nuevoUsuario = {
    nombre: '',
    email: '',
    password: '',
    rol: 'empleado'
  };

// En crear-usuario.component.ts

async registrarEmpleado() {
  if (!this.nuevoUsuario.nombre || !this.nuevoUsuario.email || !this.nuevoUsuario.password) {
    alert('Por favor completá todos los campos.');
    return;
  }

  this.cargando = true;

  // Aplicamos trim() para eliminar espacios accidentales
  const datosLimpios = {
    ...this.nuevoUsuario,
    email: this.nuevoUsuario.email.trim()
  };

  const { error } = await this.supabaseService.crearNuevoEmpleado(datosLimpios);

  this.cargando = false;

  if (error) {
    alert('Error al registrar usuario: ' + error.message);
  } else {
    alert(`¡Usuario ${datosLimpios.email} registrado con éxito!`);
    this.router.navigate(['/admin']);
  }
}
  volverAlAdmin() {
    this.router.navigate(['/admin']);
  }
}