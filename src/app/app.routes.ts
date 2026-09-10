import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { AdminComponent } from './pages/admin/admin.component';
import { LoginComponent } from './pages/login/login.component';
import { EmpleadosComponent } from './pages/empleados/empleados.component';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home/1', // Si entran a la raíz sin ID, va al local 1 por defecto
    pathMatch: 'full',
  },
  {
    path: 'home',
    redirectTo: 'home/1',
    pathMatch: 'full',
  },
  {
    path: 'home/:id', // Capta dinámicamente CUALQUIER local de tu barbería (1, 2, 3, etc.)
    component: HomeComponent,
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'empleados',
    component: EmpleadosComponent,
    canActivate: [authGuard],
  },
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [authGuard],
  },
  {
    path: 'crear-usuario',
    loadComponent: () => import('./pages/admin/crear-usuario/crear-usuario.component').then(m => m.CrearUsuarioComponent),
    canActivate: [authGuard],
  },
  {
    path: 'cancelar-turno/:id',
    loadComponent: () => import('./pages/cancelar-turnos/cancelar-turnos.component').then(m => m.CancelarTurnosComponent)
  },
  {
    path: '**',
    redirectTo: 'home/1', // Si escriben una URL rota, cae al local 1 de respaldo
  }
];