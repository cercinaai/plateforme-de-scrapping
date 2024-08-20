import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Ad_Model } from '../models/Ads.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DataListService {

  private http = inject(HttpClient);

  public getAds(params: any): Observable<Ad_Model[]> {
    return this.http.get<Ad_Model[]>(`${environment.api_url}/data-provider/ad-list`, { params })
  }
}
