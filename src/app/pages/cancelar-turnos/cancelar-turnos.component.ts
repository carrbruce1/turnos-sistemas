import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-cancelar-turnos',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './cancelar-turnos.component.html',
  styleUrls: ['./cancelar-turnos.component.scss']
})
export class CancelarTurnosComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private supabaseService = inject(SupabaseService);

  turnoId: string | number | null = null;
  turno: any = null;
  cargando = true;
  procesando = false;
  mensajeExito = false;
  errorMensaje = '';

  async ngOnInit() {
    // Captura el parámetro 'id' de la URL
    const idParam = this.route.snapshot.paramMap.get('id');

    if (!idParam) {
      this.errorMensaje = 'No se proporcionó un ID de turno válido.';
      this.cargando = false;
      return;
    }

    // Si es un número (ej: 24), lo parseamos a Number por si en la DB la columna 'id' es int/bigint
    this.turnoId = !isNaN(Number(idParam)) ? Number(idParam) : idParam;

    await this.obtenerDetalleTurno();
  }

  async obtenerDetalleTurno() {
    this.cargando = true;
    this.errorMensaje = '';

    try {
      const { data, error } = await this.supabaseService.obtenerReservaPorId(this.turnoId!);
      
      if (error) {
        console.error('Error Supabase al traer reserva:', error);
        this.errorMensaje = 'No pudimos encontrar la información de este turno.';
      } else if (!data) {
        this.errorMensaje = 'El turno especificado no existe.';
      } else {
        this.turno = data;
      }
    } catch (err: any) {
      console.error('Excepción al cargar turno:', err);
      this.errorMensaje = 'Ocurrió un error inesperado al conectar con el servidor.';
    } finally {
      this.cargando = false;
    }
  }

  async confirmarCancelacion() {
    if (!this.turnoId) return;

    this.procesando = true;
    try {
      const { error } = await this.supabaseService.cancelarReserva(this.turnoId);

      if (error) throw error;

      this.mensajeExito = true;
      if (this.turno) {
        this.turno.estado = 'cancelado';
      }
    } catch (err: any) {
      console.error('Error al cancelar reserva:', err);
      alert('No se pudo procesar la cancelación. Revisa tu conexión.');
    } finally {
      this.procesando = false;
    }
  }

  formatearFechaLatina(fechaStr: string): string {
    if (!fechaStr) return '';
    const partes = fechaStr.split('-');
    if (partes.length !== 3) return fechaStr;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
}