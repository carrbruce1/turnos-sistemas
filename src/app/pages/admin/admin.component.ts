import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { Router } from '@angular/router';

export interface Reserva {
  id: string | number;
  nombre_cliente?: string;
  telefono_cliente?: string;
  email_cliente?: string;
  servicio?: string;
  fecha: string;
  hora: string;
  estado: 'pendiente' | 'confirmado' | 'en_proceso' | 'finalizado' | 'rechazado';
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit {
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  nombreUsuario: string = localStorage.getItem('usuario_nombre') || 'Admin';
  vistaActual: 'turnos' | 'historial' | 'calendario' = 'turnos';
  turnosTotales: Reserva[] = [];
  turnosFiltrados: Reserva[] = [];
  historialFiltrado: Reserva[] = [];
  estadoFiltro: string = 'en_proceso';
  cantidadEnProceso = 0;
  cantidadRechazados = 0;
  searchTerm: string = '';

  async ngOnInit() {
    await Promise.all([
      this.cargarPerfilUsuario(),
      this.cargarTurnos()
    ]);
  }

  async cargarPerfilUsuario() {
    const perfil = await this.supabaseService.obtenerPerfilUsuario();
    if (perfil && perfil.nombre) {
      this.nombreUsuario = perfil.nombre;
      localStorage.setItem('usuario_nombre', perfil.nombre);
      this.cdr.detectChanges();
    }
  }

  async cargarTurnos() {
    const { data, error } = await this.supabaseService.obtenerReservas();

    if (!error && data) {
      this.turnosTotales = data as Reserva[];
      this.actualizarContadores();
      this.aplicarFiltros();
      this.cdr.detectChanges();
    }
  }

  actualizarContadores() {
    this.cantidadEnProceso = this.turnosTotales.filter(
      t => t.estado === 'en_proceso' || t.estado === 'pendiente' || t.estado === 'confirmado'
    ).length;

    this.cantidadRechazados = this.turnosTotales.filter(t => t.estado === 'rechazado').length;
  }

  verVista(vista: 'turnos' | 'historial' | 'calendario') {
    this.vistaActual = vista;
    this.aplicarFiltros();
  }

  filtrarPorEstado(estado: string) {
    this.estadoFiltro = estado;
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    const query = this.searchTerm.toLowerCase().trim();
    let baseTurnos = [];
    if (this.estadoFiltro === 'en_proceso') {
      baseTurnos = this.turnosTotales.filter(
        t => t.estado === 'en_proceso' || t.estado === 'pendiente' || t.estado === 'confirmado'
      );
    } else {
      baseTurnos = this.turnosTotales.filter(t => t.estado === this.estadoFiltro);
    }

    if (query) {
      this.turnosFiltrados = baseTurnos.filter(t =>
        (t.nombre_cliente && t.nombre_cliente.toLowerCase().includes(query)) ||
        (t.servicio && t.servicio.toLowerCase().includes(query)) ||
        (t.telefono_cliente && t.telefono_cliente.includes(query))
      );
    } else {
      this.turnosFiltrados = baseTurnos;
    }

    const baseHistorial = this.turnosTotales.filter(t => t.estado === 'finalizado');
    if (query) {
      this.historialFiltrado = baseHistorial.filter(t =>
        (t.nombre_cliente && t.nombre_cliente.toLowerCase().includes(query)) ||
        (t.servicio && t.servicio.toLowerCase().includes(query)) ||
        (t.telefono_cliente && t.telefono_cliente.includes(query))
      );
    } else {
      this.historialFiltrado = baseHistorial;
    }
  }

  async cambiarEstadoTurno(idTurno: string | number, nuevoEstado: 'finalizado' | 'rechazado') {
    const { error } = await this.supabaseService.actualizarEstadoReserva(idTurno, nuevoEstado);
    if (!error) {
      await this.cargarTurnos();
    } else {
      alert('Error al actualizar el estado del turno.');
    }
  }

  async cancelarTurno(idTurno: string | number) {
    const confirmacion = confirm('¿Estás seguro de que querés cancelar/rechazar este turno?');
    if (!confirmacion) return;

    await this.cambiarEstadoTurno(idTurno, 'rechazado');
  }

  avisarProximoCorteWhatsApp(turno: Reserva) {
    if (!turno.telefono_cliente) {
      alert('Este turno no tiene un número de teléfono registrado.');
      return;
    }

    const telefono = turno.telefono_cliente.replace(/\D/g, '');
    const mensaje = `Hola ${turno.nombre_cliente || ''}, te avisamos desde la barbería que en 30 minutos es tu turno de ${turno.servicio || 'corte'} (${turno.hora} hs). ¡Te esperamos!`;
    const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;

    window.open(url, '_blank');
  }

  cerrarSesion() {
    localStorage.removeItem('usuario_nombre');
    this.supabaseService.logout();
    this.router.navigate(['/login']);
  }

  navegarA(ruta: string) {
    this.router.navigate([`/${ruta}`]);
  }
}