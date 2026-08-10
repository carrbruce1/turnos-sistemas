import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { AdminComponent } from './pages/admin/admin.component';
import { LoginComponent } from './pages/login/login.component';
import { EmpleadosComponent } from './pages/empleados/empleados.component';
import { CrearUsuarioComponent } from './pages/admin/crear-usuario/crear-usuario.component';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home', 
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
    canActivate:[authGuard],
  },
  {
    path: "crear-usuario",
    loadComponent: () => import('./pages/admin/crear-usuario/crear-usuario.component').then(m => m.CrearUsuarioComponent),
    canActivate: [authGuard],
  },
  {
  path: 'cancelar-turno/:id',
  loadComponent: () => import('./pages/cancelar-turnos/cancelar-turnos.component').then(m => m.CancelarTurnoComponent)
},
  {
    path: '**',
    redirectTo: 'home',
  }
];