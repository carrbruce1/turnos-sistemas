import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { RealtimeChannel } from '@supabase/supabase-js';

interface DiaMes {
  numero: number;
  fechaStr: string;
  esDelMes: boolean;
  deshabilitado?: boolean;
}

interface SlotHora {
  hora: string;
  ocupado: boolean;
}

interface DiaSemanaVista {
  nombreDia: string;
  numeroDia: number;
  fechaStr: string;
  horarios: SlotHora[];
}

@Component({
  selector: 'app-reserva',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private supabaseService = inject(SupabaseService);

  cargando = false;
  mostrarModal: boolean = false;
  tipoModal: 'cargando' | 'exito' | 'error' = 'cargando';
  resumenReservaModal: any = {
    nombre_cliente: '',
    servicio: '',
    fechaFormateada: '',
    hora: ''
  };

  mensajeExito = false;

  horariosHabituales: string[] = ['09:00', '10:00', '11:00', '16:00', '17:00', '18:00', '19:00'];

  fechaActualNavegacion = new Date();
  fechaSeleccionadaStr = this.formatearFechaISO(new Date());
  horaSeleccionada: string | null = null;

  diasMes: DiaMes[] = [];
  diasSemanaVista: DiaSemanaVista[] = [];
  nombreMesActual = '';

  reservasExistentes: any[] = [];
  private reservasSubscription: RealtimeChannel | null = null;

  reservaForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    telefono: ['', [Validators.required, Validators.pattern(/^[0-9\s-+]+$/)]],
    email: ['', [Validators.required, Validators.email]],
    servicio: ['', [Validators.required]],
    fecha: [this.fechaSeleccionadaStr, [Validators.required]],
    hora: ['', [Validators.required]]
  });

  async ngOnInit() {
    this.construirMiniCalendario();
    this.construirVistaSemanal();
    await this.cargarReservasDesdeSupabase();
    this.construirVistaSemanal();
    this.suscribirACambiosRealtime();
  }

  ngOnDestroy() {
    if (this.reservasSubscription) {
      this.supabaseService.removerCanal(this.reservasSubscription);
    }
  }

  // MÉTODO PARA EL SCROLL SUAVE EN COMPATIBILIDAD CON MÓVILES
  scrollToFormulario() {
    const el = document.getElementById('formulario-info');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.location.hash = 'formulario-info';
    }
  }

  // MÉTODO PARA SELECCIONAR SERVICIO DESDE LAS CARDS
  seleccionarServicio(servicio: string) {
    this.reservaForm.patchValue({ servicio });
    this.reservaForm.get('servicio')?.markAsTouched();
  }

  suscribirACambiosRealtime() {
    this.reservasSubscription = this.supabaseService.escucharCambiosReservas(async () => {
      await this.cargarReservasDesdeSupabase();
      this.construirVistaSemanal();
    });
  }

  f(campo: string) {
    return this.reservaForm.get(campo);
  }

  async cargarReservasDesdeSupabase() {
    try {
      const { data, error } = await this.supabaseService.obtenerReservas();
      if (!error && data) {
        this.reservasExistentes = data.filter((r: any) => {
          const est = r.estado ? String(r.estado).toLowerCase().trim() : '';
          return est !== 'cancelado' && est !== 'rechazado';
        });
      }
    } catch (err) {
      console.error('Error al cargar reservas:', err);
    }
  }

  formatearFechaISO(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  formatearFechaLatina(fechaStr: string): string {
    if (!fechaStr) return '';
    const partes = fechaStr.split('-');
    if (partes.length !== 3) return fechaStr;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  esFechaPasada(fechaStr: string): boolean {
    const hoyStr = this.formatearFechaISO(new Date());
    return fechaStr < hoyStr;
  }

  esSlotPasado(fechaStr: string, horaStr: string): boolean {
    const ahora = new Date();
    const hoyStr = this.formatearFechaISO(ahora);

    if (fechaStr < hoyStr) return true;

    if (fechaStr === hoyStr) {
      const [horaSlot, minSlot] = horaStr.split(':').map(Number);
      const horaActual = ahora.getHours();
      const minActual = ahora.getMinutes();

      if (horaSlot < horaActual) return true;
      if (horaSlot === horaActual && minSlot <= minActual) return true;
    }

    return false;
  }

  construirMiniCalendario() {
    const ano = this.fechaActualNavegacion.getFullYear();
    const mes = this.fechaActualNavegacion.getMonth();

    const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    this.nombreMesActual = `${nombresMeses[mes]} ${ano}`;

    const primerDiaMes = new Date(ano, mes, 1);
    const ultimoDiaMes = new Date(ano, mes + 1, 0);

    const offsetPrimerDia = primerDiaMes.getDay();
    const totalDias = ultimoDiaMes.getDate();

    this.diasMes = [];

    const diasMesAnterior = new Date(ano, mes, 0).getDate();
    for (let i = offsetPrimerDia - 1; i >= 0; i--) {
      const diaNum = diasMesAnterior - i;
      const d = new Date(ano, mes - 1, diaNum);
      const fStr = this.formatearFechaISO(d);
      this.diasMes.push({ 
        numero: diaNum, 
        fechaStr: fStr, 
        esDelMes: false,
        deshabilitado: true 
      });
    }

    for (let i = 1; i <= totalDias; i++) {
      const d = new Date(ano, mes, i);
      const fStr = this.formatearFechaISO(d);
      this.diasMes.push({ 
        numero: i, 
        fechaStr: fStr, 
        esDelMes: true,
        deshabilitado: this.esFechaPasada(fStr)
      });
    }
  }

  cambiarMes(delta: number) {
    this.fechaActualNavegacion = new Date(this.fechaActualNavegacion.getFullYear(), this.fechaActualNavegacion.getMonth() + delta, 1);
    this.construirMiniCalendario();
  }

  seleccionarDiaMiniCal(dia: DiaMes) {
    if (dia.deshabilitado) return;

    this.fechaSeleccionadaStr = dia.fechaStr;
    this.reservaForm.patchValue({ fecha: this.fechaSeleccionadaStr });
    
    const partes = dia.fechaStr.split('-');
    this.fechaActualNavegacion = new Date(+partes[0], +partes[1] - 1, +partes[2]);
    
    this.construirVistaSemanal();
  }

  construirVistaSemanal() {
    this.diasSemanaVista = [];
    const baseDate = new Date(this.fechaActualNavegacion);
    
    const nombresDias = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

    for (let i = 0; i < 5; i++) {
      const current = new Date(baseDate);
      current.setDate(baseDate.getDate() + i);

      const fStr = this.formatearFechaISO(current);
      const slots: SlotHora[] = this.horariosHabituales.map(h => {
        const estaOcupado = this.reservasExistentes.some(r => {
          const horaReserva = r.hora ? String(r.hora).substring(0, 5) : '';
          return r.fecha === fStr && horaReserva === h;
        });

        const esPasado = this.esSlotPasado(fStr, h);

        return { hora: h, ocupado: estaOcupado || esPasado };
      });

      this.diasSemanaVista.push({
        nombreDia: nombresDias[current.getDay()],
        numeroDia: current.getDate(),
        fechaStr: fStr,
        horarios: slots
      });
    }
  }

  cambiarSemana(deltaDias: number) {
    this.fechaActualNavegacion.setDate(this.fechaActualNavegacion.getDate() + (deltaDias * 5));
    this.construirMiniCalendario();
    this.construirVistaSemanal();
  }

  seleccionarSlot(fechaStr: string, hora: string) {
    if (this.esSlotPasado(fechaStr, hora)) return;

    this.fechaSeleccionadaStr = fechaStr;
    this.horaSeleccionada = hora;

    this.reservaForm.patchValue({
      fecha: fechaStr,
      hora: hora
    });
  }

  async onSubmit() {
    if (this.reservaForm.invalid) {
      this.reservaForm.markAllAsTouched();
      return;
    }

    this.cargando = true;
    this.mostrarModal = true;
    this.tipoModal = 'cargando';
    this.mensajeExito = false;

    const nuevaReserva = {
      nombre_cliente: this.reservaForm.value.nombre,
      telefono_cliente: this.reservaForm.value.telefono,
      email_cliente: this.reservaForm.value.email,
      servicio: this.reservaForm.value.servicio,
      fecha: this.reservaForm.value.fecha,
      hora: this.reservaForm.value.hora,
      estado: 'pendiente'
    };

    try {
      const { error } = await this.supabaseService.crearReserva(nuevaReserva);
      if (error) throw error;

      this.mensajeExito = true;
      this.tipoModal = 'exito';
      this.resumenReservaModal = {
        nombre_cliente: nuevaReserva.nombre_cliente,
        servicio: nuevaReserva.servicio,
        fechaFormateada: this.formatearFechaLatina(nuevaReserva.fecha),
        hora: nuevaReserva.hora
      };

      await this.cargarReservasDesdeSupabase();
      this.construirVistaSemanal();

      this.reservaForm.patchValue({
        nombre: '',
        telefono: '',
        email: '',
        servicio: '',
        hora: ''
      });
      this.horaSeleccionada = null;

    } catch (err: any) {
      console.error('Error al guardar reserva:', err?.message || err);
      this.tipoModal = 'error';
    } finally {
      this.cargando = false;
    }
  }

  cerrarModal() {
    this.mostrarModal = false;
  }
}