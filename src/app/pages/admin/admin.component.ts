import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { Router } from '@angular/router';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Reserva {
  id: string | number;
  local_id?: number;
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
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit, OnDestroy {
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  nombreUsuario: string = localStorage.getItem('usuario_nombre') || 'Admin';
  nombreBarberia: string = '';
  localIdUsuario: number | null = null;

  vistaActual: 'turnos' | 'historial' | 'calendario' = 'turnos';
  turnosTotales: Reserva[] = [];
  turnosFiltrados: Reserva[] = [];
  historialFiltrado: Reserva[] = [];
  estadoFiltro: string = 'en_proceso';
  cantidadEnProceso = 0;
  cantidadRechazados = 0;
  searchTerm: string = '';

  // ESTADOS DEL MODAL
  mostrarModal = false;
  tipoModal: 'cargando' | 'exito' | 'error' = 'cargando';
  mensajeModal = '';
  subtituloModal = '';

  private reservasSubscription: RealtimeChannel | null = null;

  async ngOnInit() {
    await this.cargarPerfilUsuario();
    await this.cargarTurnos();
    this.suscribirACambiosRealtime();
  }

  ngOnDestroy() {
    if (this.reservasSubscription) {
      this.supabaseService.removerCanal(this.reservasSubscription);
    }
  }

  suscribirACambiosRealtime() {
    this.reservasSubscription = this.supabaseService.escucharCambiosReservas(async () => {
      await this.cargarTurnos();
    });
  }

  async cargarPerfilUsuario() {
    const perfil = await this.supabaseService.obtenerPerfilUsuario();
    if (perfil) {
      if (perfil.nombre) {
        this.nombreUsuario = perfil.nombre;
        localStorage.setItem('usuario_nombre', perfil.nombre);
      }
      if (perfil.local_id !== undefined && perfil.local_id !== null) {
        this.localIdUsuario = Number(perfil.local_id);
        
        // Cargar el nombre de la barbería asociada al usuario
        try {
          const local = await this.supabaseService.obtenerLocalPorId(this.localIdUsuario);
          if (local) {
            this.nombreBarberia = local.Nombre || local.nombre || '';
          }
        } catch (err) {
          console.error('Error al obtener el nombre del local:', err);
        }
      }
      this.cdr.detectChanges();
    }
  }

  async cargarTurnos() {
    let dataRes: any[] | null = null;
    let errorRes: any = null;

    if (this.localIdUsuario !== null) {
      const res = await this.supabaseService.obtenerReservasPorLocal(this.localIdUsuario);
      dataRes = res.data;
      errorRes = res.error;
    } else {
      const res = await this.supabaseService.obtenerReservas();
      dataRes = res.data;
      errorRes = res.error;
    }

    if (!errorRes && dataRes) {
      this.turnosTotales = dataRes as Reserva[];
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

  async cambiarEstadoTurno(idTurno: string | number, nuevoEstado: 'confirmado' | 'finalizado' | 'rechazado') {
    this.mostrarModal = true;
    this.tipoModal = 'cargando';
    
    if (nuevoEstado === 'confirmado') {
      this.mensajeModal = 'Confirmando turno...';
      this.subtituloModal = 'Actualizando el registro en la base de datos.';
    } else if (nuevoEstado === 'finalizado') {
      this.mensajeModal = 'Finalizando turno...';
      this.subtituloModal = 'Actualizando el registro en la base de datos.';
    } else {
      this.mensajeModal = 'Cancelando turno...';
      this.subtituloModal = 'Procesando el cambio de estado.';
    }
    this.cdr.detectChanges();

    try {
      const { error } = await this.supabaseService.actualizarEstadoReserva(idTurno, nuevoEstado);

      if (!error) {
        await this.cargarTurnos();
        
        this.tipoModal = 'exito';
        if (nuevoEstado === 'confirmado') {
          this.mensajeModal = '¡Turno confirmado!';
        } else if (nuevoEstado === 'finalizado') {
          this.mensajeModal = '¡Turno finalizado!';
        } else {
          this.mensajeModal = 'El turno fue cancelado/rechazado.';
        }
        
        this.cdr.detectChanges();

        setTimeout(() => {
          this.cerrarModal();
        }, 1200);

      } else {
        throw error;
      }
    } catch (err) {
      console.error('Error al cambiar el estado:', err);
      this.tipoModal = 'error';
      this.mensajeModal = 'Ocurrió un error';
      this.subtituloModal = 'No se pudo actualizar el estado del turno. Reintentá nuevamente.';
      this.cdr.detectChanges();
    }
  }

  cancelarTurno(idTurno: string | number) {
    this.cambiarEstadoTurno(idTurno, 'rechazado');
  }

  // CONFIRMA EL TURNO Y ABRE WHATSAPP CON EL MENSAJE FORMATEADO EN TEXTO LARGO
  async confirmarYEnviarWhatsApp(turno: Reserva) {
    if (!turno.telefono_cliente) {
      this.mostrarModal = true;
      this.tipoModal = 'error';
      this.mensajeModal = 'Sin teléfono registrado';
      this.subtituloModal = 'Este cliente no tiene un número cargado para enviar WhatsApp.';
      this.cdr.detectChanges();
      return;
    }

    // 1. Cambia el estado del turno
    await this.cambiarEstadoTurno(turno.id, 'confirmado');

    // 2. Obtiene el nombre real del local desde Supabase usando el local_id del turno
    let nombreLocal = this.nombreBarberia || 'Nuestra Barbería';
    if (turno.local_id && turno.local_id !== this.localIdUsuario) {
      try {
        const local = await this.supabaseService.obtenerLocalPorId(turno.local_id);
        if (local) {
          nombreLocal = local.Nombre || local.nombre || nombreLocal;
        }
      } catch (err) {
        console.error('Error al obtener nombre del local:', err);
      }
    }

    // 3. Formatea el teléfono
    let telefono = turno.telefono_cliente.replace(/\D/g, '');
    if (!telefono.startsWith('54')) {
      telefono = `54${telefono}`;
    }

    // Usamos el formato en texto largo (ej: Viernes 11 de Septiembre)
    const fechaFormateada = this.formatearFechaLarga(turno.fecha);

    // 4. Armado del mensaje dinámico con el nombre del local
    const mensaje = `¡Hola *${turno.nombre_cliente || 'Cliente'}*! 👋\n\n` +
                    `Tu turno en *${nombreLocal}* ha sido *CONFIRMADO* 💈✂️\n\n` +
                    `📌 *Detalles de tu cita:*\n` +
                    `🔹 *Servicio:* ${turno.servicio || 'Corte'}\n` +
                    `📅 *Fecha:* ${fechaFormateada}\n` +
                    `⏰ *Hora:* ${turno.hora} hs\n\n` +
                    `📍 Te esperamos en nuestro local. Si necesitás reprogramar o cancelar, por favor avisanos con 24 horas de anticipación. ¡Muchas gracias!`;

    const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  }

  formatearFechaLatina(fechaStr: string): string {
    if (!fechaStr) return '';
    const partes = fechaStr.split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return fechaStr;
  }

  // MÉTODO PARA FORMATEAR A TEXTO LARGO ("Viernes 11 de Septiembre")
  formatearFechaLarga(fechaStr: string): string {
    if (!fechaStr) return '';
    
    // Forzamos hora local agregando T00:00:00 para evitar desfases por zona horaria UTC
    const fecha = new Date(fechaStr.includes('T') ? fechaStr : `${fechaStr}T00:00:00`);
    
    if (isNaN(fecha.getTime())) return fechaStr;

    const opciones: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    };

    const texto = fecha.toLocaleDateString('es-ES', opciones);
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.cdr.detectChanges();
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