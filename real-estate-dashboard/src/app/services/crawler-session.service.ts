import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CrawlerSession } from '../models/crawlerSession.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CrawlerSessionService {
  private http = inject(HttpClient);


  public crawlerSession(page: number, limit: number): Observable<CrawlerSession[]> {
    return this.http.get<CrawlerSession[]>(`${environment.api_url}/data-provider/crawler-session?page=${page}&limit=${limit}`);
  }
}
