import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-cancelar-turno',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cancelar-turnos.component.html',
  styleUrls: ['./cancelar-turnos.component.scss']
})
export class CancelarTurnoComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private supabaseService = inject(SupabaseService);

  turnoId: string | null = null;
  turno: any = null;
  cargando = true;
  procesando = false;
  canceladoConExito = false;
  errorMensaje = '';

  async ngOnInit() {
    this.turnoId = this.route.snapshot.paramMap.get('id');

    if (this.turnoId) {
      await this.obtenerDetalleTurno();
    } else {
      this.errorMensaje = 'El enlace de cancelación no es válido.';
      this.cargando = false;
    }
  }

  async obtenerDetalleTurno() {
    try {
      const { data, error } = await this.supabaseService.obtenerReservaPorId(this.turnoId!);
      if (error || !data) {
        this.errorMensaje = 'No se encontró la reserva o ya fue eliminada.';
      } else {
        this.turno = data;
      }
    } catch (err) {
      this.errorMensaje = 'Error al consultar la reserva.';
    } finally {
      this.cargando = false;
    }
  }

  async confirmarCancelacion() {
    if (!this.turnoId) return;

    this.procesando = true;
    try {
      // Actualizamos el estado a rechazado/cancelado
      const { error } = await this.supabaseService.actualizarEstadoReserva(this.turnoId, 'rechazado');
      if (error) throw error;

      this.canceladoConExito = true;
    } catch (err) {
      alert('No se pudo cancelar el turno. Intenta nuevamente.');
    } finally {
      this.procesando = false;
    }
  }
}