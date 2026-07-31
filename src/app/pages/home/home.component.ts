import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-reserva',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  private fb = inject(FormBuilder);
  private supabaseService = inject(SupabaseService);

  cargando = false;
  mensajeExito = false;
  
  // Variables para la lógica del calendario y horarios
  horariosDisponibles: string[] = ['10:00', '11:00', '16:00', '17:00', '18:00', '19:00'];
  horaSeleccionada: string | null = null;

  reservaForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    telefono: ['', [Validators.required, Validators.pattern(/^[0-9\s-+]+$/)]],
    email: ['', [Validators.required, Validators.email]],
    servicio: ['', [Validators.required]],
    fecha: ['', [Validators.required]],
    hora: ['', [Validators.required]]
  });

  f(campo: string) {
    return this.reservaForm.get(campo);
  }

  // Método cuando cambia la fecha en el calendario
  async onFechaChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const fecha = input.value;
  
  }

  // Método para seleccionar un bloque de hora
  seleccionarHora(hora: string) {
    this.horaSeleccionada = hora;
    this.reservaForm.patchValue({ hora });
  }

  async onSubmit() {
    if (this.reservaForm.invalid) {
      this.reservaForm.markAllAsTouched();
      return;
    }

    this.cargando = true;
    try {
      // Llamada al servicio
      const { error } = await this.supabaseService.crearReserva(this.reservaForm.value);
      if (error) throw error;

      this.mensajeExito = true;
      this.reservaForm.reset();
      this.horaSeleccionada = null;
    } catch (err: any) {
      console.error('Error al guardar la reserva:', err?.message || err);
      alert('Hubo un error al procesar la reserva. Intenta nuevamente.');
    } finally {
      this.cargando = false;
    }
  }
}