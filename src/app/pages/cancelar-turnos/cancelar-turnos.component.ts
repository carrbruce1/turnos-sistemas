import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-cancelar-turno',
  standalone: true,
  imports: [CommonModule, RouterLink],
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
  mensajeExito = false;
  errorMensaje = '';

  async ngOnInit() {
    this.turnoId = this.route.snapshot.paramMap.get('id');

    if (!this.turnoId) {
      this.errorMensaje = 'No se proporcionó un ID de turno válido.';
      this.cargando = false;
      return;
    }

    await this.obtenerDetalleTurno();
  }

  async obtenerDetalleTurno() {
    this.cargando = true;
    try {
      const { data, error } = await this.supabaseService.obtenerReservaPorId(this.turnoId!);
      
      if (error || !data) {
        this.errorMensaje = 'El turno no existe o ya no se encuentra disponible.';
      } else {
        this.turno = data;
      }
    } catch (err: any) {
      console.error('Error al cargar turno:', err);
      this.errorMensaje = 'Ocurrió un error al cargar la información de tu turno.';
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
      alert('No se pudo cancelar el turno. Intenta nuevamente.');
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