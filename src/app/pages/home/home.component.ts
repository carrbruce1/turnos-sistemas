import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { RealtimeChannel } from '@supabase/supabase-js';

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
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  localData: any = null;
  localId: number = 1; // Fallback por defecto
  cargandoLocal = false;

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

ngOnInit() {
  this.route.paramMap.subscribe(async (params) => {
    const idParam = params.get('id');
    
    // Si viene un ID numérico en la URL, lo usa. Si no, usa el 1 por defecto.
    if (idParam && !isNaN(Number(idParam))) {
      this.localId = Number(idParam);
    } else {
      this.localId = 1;
    }

    this.actualizarNombreMes();
    this.construirVistaSemanal();
    await this.cargarDatosDeSupabase();

    this.cdr.detectChanges();
  });
}

  ngOnDestroy() {
    if (this.reservasSubscription) {
      this.supabaseService.removerCanal(this.reservasSubscription);
    }
  }

  async cargarDatosDeSupabase() {
    try {
      this.cargandoLocal = true;
      const data = await this.supabaseService.obtenerLocalPorId(this.localId);
      if (data) {
        this.localData = data;
      }
    } catch (err) {
      console.error('Error al consultar la tabla locales:', err);
    } finally {
      this.cargandoLocal = false;
    }

    await this.cargarReservasDesdeSupabase();
    this.construirVistaSemanal();
    this.suscribirACambiosRealtime();
  }

  obtenerNombreLocal(): string {
    return this.localData?.Nombre || this.localData?.nombre || 'CARGANDO LOCAL...';
  }

  obtenerUrlBanner(): string {
    const banner = this.localData?.banner_url || this.localData?.Banner_url;
    if (banner && banner.trim() !== '') {
      return banner.trim();
    }
    return 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=1600&auto=format&fit=crop';
  }

  scrollToFormulario() {
    setTimeout(() => {
      const el = document.getElementById('formulario-info');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  }

  seleccionarServicio(servicio: string) {
    this.reservaForm.patchValue({ servicio });
    this.reservaForm.get('servicio')?.markAsTouched();
  }

  suscribirACambiosRealtime() {
    this.reservasSubscription = this.supabaseService.escucharCambiosReservas(async () => {
      await this.cargarReservasDesdeSupabase();
      this.construirVistaSemanal();
      this.cdr.detectChanges();
    });
  }

  f(campo: string) {
    return this.reservaForm.get(campo);
  }

  async cargarReservasDesdeSupabase() {
    try {
      const res = await this.supabaseService.obtenerReservasPorLocal(this.localId);
      const data = res.data;
      const error = res.error;

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

  actualizarNombreMes() {
    const ano = this.fechaActualNavegacion.getFullYear();
    const mes = this.fechaActualNavegacion.getMonth();
    const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    this.nombreMesActual = `${nombresMeses[mes]} ${ano}`;
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

  cambiarSemana(delta: number) {
    this.fechaActualNavegacion.setDate(this.fechaActualNavegacion.getDate() + (delta * 5));
    this.actualizarNombreMes();
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
      local_id: this.localId,
      nombre_cliente: this.reservaForm.value.nombre,
      telefono_cliente: this.reservaForm.value.telefono,
      email_cliente: this.reservaForm.value.email,
      servicio: this.reservaForm.value.servicio,
      fecha: this.reservaForm.value.fecha,
      hora: this.reservaForm.value.hora,
      estado: 'pendiente'
    };

    try {
      const promesaCrear = this.supabaseService.crearReserva(nuevaReserva);
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout de red')), 8000)
      );

      const resultado: any = await Promise.race([promesaCrear, timeout]);
      const error = resultado?.error;

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
      this.cdr.detectChanges();
    }
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.cdr.detectChanges();
  }
}