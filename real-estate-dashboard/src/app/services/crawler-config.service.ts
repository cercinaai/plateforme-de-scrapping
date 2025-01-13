import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { CrawlerConfig } from "../models/crawlerConfig.model";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";

@Injectable({
    providedIn: 'root'
})
export class CrawlerConfigService {
    private http = inject(HttpClient);

    public getCrawlerConfig(): Observable<CrawlerConfig> {
        return this.http.get<CrawlerConfig>(`${environment.api_url}/crawler-config/get-config`);
    }

    public updateCrawlerConfig(crawlerConfig: CrawlerConfig): Observable<CrawlerConfig> {
        return this.http.put<CrawlerConfig>(`${environment.api_url}/crawler-config/update-config`, crawlerConfig);
    }

    public updateCrawlerStatus(target: string, status: string): Observable<CrawlerConfig> {
        return this.http.put<CrawlerConfig>(`${environment.api_url}/crawler-config/update-status`, { target, status });
    }
    
    public updateCrawlerTotal(target: string, nombre: number): Observable<CrawlerConfig> {
        return this.http.put<CrawlerConfig>(`${environment.api_url}/crawler-config/update-nombre`, { target, nombre });
    }

    public migrateJobOffers(): Observable<any> {
  return this.http.post(`${environment.api_url}/job-offers/migrate`, {});
    }

    
    
}