import { Routes } from '@angular/router';
import { HomeComponent}  from './pages/home/home.component';
import { AdminComponent } from './pages/admin/admin.component';
import { LoginComponent } from './pages/login/login.component';
import { EmpleadosComponent } from './pages/empleados/empleados.component';

export const routes: Routes = [

    {
        path: "Home",
        component: HomeComponent,
    },
    {
        path: "login",
        component: LoginComponent,
    },
    {
        path: "empleados",
        component: EmpleadosComponent,
    },
    {
        path: "adminPanel",
        component: AdminComponent,
    },
    {

        path: '',
        redirectTo: "Home",
        pathMatch: "full",
    },
    {
        path: '**',
        redirectTo: "Home",
    }
];
