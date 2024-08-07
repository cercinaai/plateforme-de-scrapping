import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { authGuard } from './guards/auth.guard';
import { LoginComponent } from './login/login.component';
import { CrawlerSessionComponent } from './home/crawler-session/crawler-session.component';

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
                redirectTo: 'crawler-session',
                pathMatch: 'full'
            },
            {
                path: 'crawler-session',
                component : CrawlerSessionComponent
            }
        ]
    },
    {
        path: 'login',
        component: LoginComponent
    }
];
