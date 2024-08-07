import { Component, inject, OnInit } from '@angular/core';
import { CrawlerSessionService } from '../../services/crawler-session.service';
import { CrawlerSession } from '../../models/crawlerSession.model';
import { first } from 'rxjs';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-crawler-session',
  standalone: true,
  imports: [ToastModule,CommonModule],
  providers: [MessageService],
  templateUrl: './crawler-session.component.html',
  styleUrl: './crawler-session.component.scss'
})
export class CrawlerSessionComponent implements OnInit {
  private crawlerSessionService = inject(CrawlerSessionService);
  private messageService = inject(MessageService);
  private page = 1;
  private limit = 4;
  public crawlerSessions!: CrawlerSession[];
  public selectedCrawlerOrigin!: string;
  ngOnInit(): void {
    this.getData();
  }

  public getData() {
    this.crawlerSessionService.crawlerSession(this.page, this.limit).pipe(first()).subscribe({
      next: (data) => {
        this.crawlerSessions = data;
      },
      error: (error) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
      }
    })
  }
  selectCrawlerOrigin(origin: string) {
    this.selectedCrawlerOrigin = origin;
  }
  
}
