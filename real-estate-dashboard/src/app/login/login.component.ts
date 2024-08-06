import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { FormsModule, NgForm } from '@angular/forms';
import { first } from 'rxjs';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [MatIconModule,FormsModule,ToastModule],
  providers:[MessageService],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private router = inject(Router);
  private authService = inject(AuthService);
  private messageService = inject(MessageService);

  login(form:NgForm) {
      this.authService.login(form.value.username, form.value.password).pipe(first()).subscribe({
          next: () => this.router.navigate(['/home']),
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Invalid username or password' });
            form.reset()
          }
      })
  }

}
