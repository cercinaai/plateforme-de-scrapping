import { Component, inject, OnInit } from '@angular/core';
import { CrawlerSessionService } from '../../services/crawler-session.service';
import { CrawlerSession } from '../../models/crawlerSession.model';
import { first } from 'rxjs';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-crawler-session',
  standalone: true,
  imports: [ToastModule,CommonModule,FormsModule],
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
  public selectedSession: CrawlerSession | null = null;
  public selectedCrawlerOrigin!: string | null;
  public startDate!: Date | null;
  public endDate!: Date | null;
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
  selectSession(index: number) {
    this.selectedSession = this.crawlerSessions[index];
    this.selectCrawlerOrigin('bienici');
  }

  selectCrawlerOrigin(crawlerOrigin: string) {
    this.selectedCrawlerOrigin = crawlerOrigin;
  }
  clearDates() {
    this.startDate = null;
    this.endDate = null;
    this.filterSessions();
}
  filterSessions() {
    if(!this.startDate || !this.endDate) {
      this.getData();
      return;
    }
    if(this.endDate < this.startDate) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'La date de fin doit être superieure a la date de depart' });
      return
    }
    if(this.startDate > this.endDate) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'La date de depart doit être inferieure a la date de fin' });
      return
    }
    this.crawlerSessionService.dateRangeCrawlerSession(this.startDate, this.endDate).pipe(first()).subscribe({
      next: (data) => {
        this.crawlerSessions = data;
      },
      error: (error) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
      }
    })
  }

  onScroll(event: any) {
    const { scrollTop, scrollHeight, clientHeight } = event.target;
    if (scrollTop + clientHeight >= scrollHeight) {
      this.loadMoreSessions();
    }
  }

  loadMoreSessions() {
    this.page += 1;
    this.crawlerSessionService.crawlerSession(this.page, this.limit).pipe(first()).subscribe({
      next: (data) => {
        this.crawlerSessions = [...this.crawlerSessions, ...data];
      },
      error: (error) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
      }
    })
  }

  getTotalSuccessPercentage(index:number) {
    const session = this.crawlerSessions[index];
    const total_success = (session.bienici.success_requests || 0) + (session.logicimmo.success_requests || 0) + (session.boncoin.success_requests || 0) + (session.seloger.success_requests || 0);
    const total_requests = (session.bienici.total_request || 0) + (session.logicimmo.total_request || 0) + (session.boncoin.total_request || 0) + (session.seloger.total_request || 0);
    return (total_success / total_requests) * 100;
  }

  getTotalFailurePercentage(index:number) {
    const session = this.crawlerSessions[index];
    const total_failures = (session.bienici.failed_requests || 0) + (session.logicimmo.failed_requests || 0) + (session.boncoin.failed_requests || 0) + (session.seloger.failed_requests || 0);
    const total_requests = (session.bienici.total_request || 0) + (session.logicimmo.total_request || 0) + (session.boncoin.total_request || 0) + (session.seloger.total_request || 0);
    return (total_failures / total_requests) * 100;
  }
  
}
