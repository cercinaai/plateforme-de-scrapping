import { Component, inject, OnInit } from '@angular/core';
import { CrawlerSessionService } from '../../services/crawler-session.service';
import { CrawlerSession } from '../../models/crawlerSession.model';
import { first } from 'rxjs';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
@Component({
  selector: 'app-crawler-session',
  standalone: true,
  imports: [ToastModule, CommonModule, FormsModule, MatIconModule, RouterModule],
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
  public selectedCrawlerOrigin!: number | null;
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
  }

  selectCrawlerOrigin(index: number) {
    this.selectedCrawlerOrigin = index;
  }
  clearDates() {
    this.startDate = null;
    this.endDate = null;
    this.filterSessions();
  }

  filterSessions() {
    if (!this.startDate || !this.endDate) {
      this.getData();
      return;
    }
    if (this.endDate < this.startDate) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'La date de fin doit être superieure a la date de depart' });
      return
    }
    if (this.startDate > this.endDate) {
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

  getTotalSuccessPercentage(index: number) {
    const session = this.crawlerSessions[index];
    const total_success = session.crawlers_stats.reduce((acc, curr) => acc + (curr.success_requests || 0), 0);
    const total_requests = session.crawlers_stats.reduce((acc, curr) => acc + (curr.total_requests || 0), 0);
    return (total_success / total_requests) * 100;
  }

  getTotalFailurePercentage(index: number) {
    const session = this.crawlerSessions[index];
    const total_failures = session.crawlers_stats.reduce((acc, curr) => acc + (curr.failed_requests || 0), 0);
    const total_requests = session.crawlers_stats.reduce((acc, curr) => acc + (curr.total_requests || 0), 0);
    return (total_failures / total_requests) * 100;
  }


  returnTotalDataGrabbed(session: CrawlerSession) {
    return session.crawlers_stats.reduce((acc, curr) => acc + curr.total_data_grabbed, 0);
  }
  returnTotalRequests(session: CrawlerSession) {
    return session.crawlers_stats.reduce((acc, curr) => acc + (curr.total_requests || 0), 0);
  }

  returnTotalSuccessRequests(session: CrawlerSession) {
    return session.crawlers_stats.reduce((acc, curr) => acc + (curr.success_requests || 0), 0);
  }

  returnTotalFailedRequests(session: CrawlerSession) {
    return session.crawlers_stats.reduce((acc, curr) => acc + (curr.failed_requests || 0), 0);
  }


  returnElapsedTime(): string {
    if (!this.selectedSession || this.selectedCrawlerOrigin === null) return 'N/A';
    const startDate = new Date(this.selectedSession.crawlers_stats[this.selectedCrawlerOrigin].started_at);
    const endDate = new Date(this.selectedSession.crawlers_stats[this.selectedCrawlerOrigin].finished_at);
    const diff = Math.abs(endDate.getTime() - startDate.getTime());
    const days = Math.floor(diff / (1000 * 3600 * 24));
    const hours = Math.floor((diff % (1000 * 3600 * 24)) / (1000 * 3600));
    const minutes = Math.floor((diff % (1000 * 3600)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    let daysString = days > 0 ? `${days}j ` : '';
    let hoursString = hours > 0 ? `${hours}h ` : '';
    let minutesString = minutes > 0 ? `${minutes}m ` : '';
    let secondsString = seconds > 0 ? `${seconds}s` : '';
    return daysString + hoursString + minutesString + secondsString;
  }
}
