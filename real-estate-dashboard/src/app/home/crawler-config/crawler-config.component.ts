import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-crawler-config',
  standalone: true,
  imports: [
    CommonModule,
  ],
  templateUrl: './crawler-config.component.html',
  styleUrl: './crawler-config.component.scss',
})
export class CrawlerConfigComponent { }
