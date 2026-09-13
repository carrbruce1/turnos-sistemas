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

  // --- GESTIÓN DE LOCALES ---

  async obtenerLocales() {
    return await this.supabase
      .from('locales')
      .select('*');
  }

  // NUEVO MÉTODO: Permite obtener el local por su slug (ej: 'laovejanegra') o id de respaldo
  async obtenerLocalPorSlug(identifier: string | number) {
    const esNumero = !isNaN(Number(identifier));
    const columna = esNumero ? 'id' : 'slug';

    const { data, error } = await this.supabase
      .from('locales')
      .select('*')
      .eq(columna, identifier)
      .maybeSingle();

    if (error) {
      console.error('Error al obtener el local por slug/id:', error);
      return null;
    }

    return data;
  }

  async obtenerLocalPorId(localId: string | number) {
    const { data, error } = await this.supabase
      .from('locales')
      .select('*')
      .eq('id', localId)
      .maybeSingle();

    if (error) {
      console.error('Error al obtener el local:', error);
      return null;
    }

    return data;
  }

  // --- GESTIÓN DE RESERVAS ---

  async crearReserva(reservaData: any) {
    return await this.supabase
      .from('reservas')
      .insert([reservaData]);
  }

  async obtenerReservas() {
    return await this.supabase
      .from('reservas')
      .select('*')
      .order('fecha', { ascending: true });
  }

  // Obtener reservas filtradas por local_id (int8)
  async obtenerReservasPorLocal(localId: string | number) {
    return await this.supabase
      .from('reservas')
      .select('*')
      .eq('local_id', localId)
      .order('fecha', { ascending: true });
  }

  async obtenerReservaPorId(id: string | number) {
    return await this.supabase
      .from('reservas')
      .select('*')
      .eq('id', id)
      .maybeSingle();
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
      .select('id, nombre, rol, local_id')
      .eq('rol', 'empleado');
  }

  async crearNuevoEmpleado(datos: { nombre: string; email: string; password?: string; rol: string; local_id?: number }) {
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
            rol: datos.rol,
            local_id: datos.local_id
          }
        ]);

      return { error: profileError };
    }

    return { error: new Error('No se pudo crear el usuario') };
  }

  async cancelarReserva(id: string | number) {
    return await this.supabase
      .from('reservas')
      .update({ estado: 'cancelado' })
      .eq('id', id);
  }
}