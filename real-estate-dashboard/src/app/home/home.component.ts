import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterOutlet,RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  private router = inject(Router);
  
  onToggle(event: any): void {
      if (event.target.checked) {
        this.router.navigate(['/home/crawler-session']);
      } else {
        this.router.navigate(['/home/data-list']);

      }
    }
}
