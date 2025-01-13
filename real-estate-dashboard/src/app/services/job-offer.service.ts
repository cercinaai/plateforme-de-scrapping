import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";
import { JobOffer } from "../models/job-offer";

@Injectable({
  providedIn: 'root'
})
export class JobOfferService {
  private http = inject(HttpClient);

  // public getJobOffers(limit?: number, offset?: number): Observable<JobOffer[]> {
  //   let params = new HttpParams();
  //   if (limit !== undefined) {
  //     params = params.set('limit', limit.toString());
  //   }
  //   if (offset !== undefined) {
  //     params = params.set('offset', offset.toString());
  //   }
  //   return this.http.get<JobOffer[]>(`${environment.api_url}/job-offers`, { params });
  // }

  public getJobOffers(filters: any = {}): Observable<JobOffer[]> {
    return this.http.post<JobOffer[]>(`${environment.api_url}/job-offers`, filters);
  }

}
