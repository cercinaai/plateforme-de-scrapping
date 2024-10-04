import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { authGuard } from './guards/auth.guard';
import { LoginComponent } from './login/login.component';
import { CrawlerSessionComponent } from './home/crawler-session/crawler-session.component';
import { DataListComponent } from './home/data-list/data-list.component';
import { NavigationComponent } from './home/navigation/navigation.component';
import { CrawlerConfigComponent } from './home/crawler-config/crawler-config.component';

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
                redirectTo: 'navigator',
                pathMatch: 'full'
            },
            {
                path: 'navigator',
                component: NavigationComponent
            },
            {
                path: 'crawler-session',
                component: CrawlerSessionComponent
            },
            {
                path: 'data-list',
                component: DataListComponent
            },
            {
                path: 'crawler-config',
                component: CrawlerConfigComponent
            }
        ]
    },
    {
        path: 'login',
        component: LoginComponent
    }
];
