import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  public supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }

  // --- ESCUCHA EN TIEMPO REAL ---
  escucharCambiosReservas(callback: () => void): RealtimeChannel {
    return this.supabase
      .channel('public:reservas')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservas' },
        () => {
          callback();
        }
      )
      .subscribe();
  }

  removerCanal(channel: RealtimeChannel) {
    this.supabase.removeChannel(channel);
  }

  // --- GESTIÓN DE RESERVAS ---

  // 💡 CORREGIDO: Se agrega .select() para devolver el ID del turno recién creado
  async crearReserva(reservaData: any) {
    return await this.supabase
      .from('reservas')
      .insert([reservaData])
      .select();
  }

  async obtenerReservas() {
    return await this.supabase
      .from('reservas')
      .select('*')
      .order('fecha', { ascending: true });
  }

  async obtenerReservaPorId(id: string) {
    return await this.supabase
      .from('reservas')
      .select('*')
      .eq('id', id)
      .single();
  }

  async actualizarEstadoReserva(id: string | number, nuevoEstado: string) {
    return await this.supabase
      .from('reservas')
      .update({ estado: nuevoEstado })
      .eq('id', id)
      .select();
  }

  async asignarEmpleadoATurno(idTurno: string | number, idEmpleado: string, nuevoEstado: string) {
    return await this.supabase
      .from('reservas')
      .update({ 
        empleados_id: String(idEmpleado), 
        estado: nuevoEstado 
      })
      .eq('id', idTurno)
      .select();
  }

  // --- AUTENTICACIÓN Y PERFILES ---

  async login(email: string, password: string) {
    return await this.supabase.auth.signInWithPassword({
      email,
      password
    });
  }

  async obtenerSesion() {
    const { data } = await this.supabase.auth.getSession();
    return data.session;
  }

  async obtenerPerfilUsuario() {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) return null;

    const { data, error } = await this.supabase
      .from('perfiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error al obtener perfil:', error);
      return null;
    }

    return data; 
  }

  async logout() {
    return await this.supabase.auth.signOut();
  }

  async obtenerEmpleados() {
    return await this.supabase
      .from('perfiles')
      .select('id, nombre, rol')
      .eq('rol', 'empleado');
  }

  async crearNuevoEmpleado(datos: { nombre: string; email: string; password?: string; rol: string }) {
    const tempSupabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey,
      { auth: { persistSession: false } }
    );

    const { data: authData, error: authError } = await tempSupabase.auth.signUp({
      email: datos.email.trim(),
      password: datos.password || '123456'
    });

    if (authError) return { error: authError };

    if (authData.user) {
      const { error: profileError } = await this.supabase
        .from('perfiles')
        .insert([
          {
            id: authData.user.id,
            nombre: datos.nombre,
            rol: datos.rol
          }
        ]);

      return { error: profileError };
    }

    return { error: new Error('No se pudo crear el usuario') };
  }
}