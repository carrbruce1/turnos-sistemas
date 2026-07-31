import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }

  // Método para guardar reservas (el que ya tenías)
  async crearReserva(reservaData: any) {
    return await this.supabase
      .from('reservas')
      .insert([reservaData]);
  }

  // -------------------------------------------------------------
  // MÉTODOS DE AUTENTICACIÓN Y PERFIL (AGREGAR ESTOS TRES):
  // -------------------------------------------------------------

  // 1. Iniciar sesión con Supabase Auth
  async login(email: string, password: string) {
    return await this.supabase.auth.signInWithPassword({
      email,
      password
    });
  }

  // 2. Obtener la sesión actual del usuario
  async obtenerSesion() {
    const { data } = await this.supabase.auth.getSession();
    return data.session;
  }

  // 3. Obtener el perfil del usuario logueado (para saber si es 'admin' o 'empleado')
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

    return data; // Retorna el objeto { id, nombre, rol, ... }
  }

  // 4. Cerrar sesión
  async logout() {
    return await this.supabase.auth.signOut();
  }
}