import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { authGuard } from './guards/auth.guard';
import { LoginComponent } from './login/login.component';
import { CrawlerSessionComponent } from './home/crawler-session/crawler-session.component';
import { DataListComponent } from './home/data-list/data-list.component';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
    },
    {
        path: 'home',
        component: HomeComponent,
        canActivate: [authGuard],
        children: [
            {
                path: '',
                redirectTo: 'data-list',
                pathMatch: 'full'
            },
            {
                path: 'crawler-session',
                component : CrawlerSessionComponent
            },
            {
                path:'data-list',
                component : DataListComponent
            }
        ]
    },
    {
        path: 'login',
        component: LoginComponent
    }
];
