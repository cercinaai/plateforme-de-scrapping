import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { DataListService } from '../../services/data-list.service';
import { Ad_Model } from '../../models/Ads.model';
import { first } from 'rxjs';
import { MatSliderModule } from '@angular/material/slider';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MatExpansionModule } from '@angular/material/expansion';

@Component({
  selector: 'app-data-list',
  standalone: true,
  imports: [ToastModule, CommonModule, FormsModule, MatSliderModule, MatDatepickerModule, MatExpansionModule, IconFieldModule, InputIconModule, InputTextModule],
  providers: [MessageService],
  templateUrl: './data-list.component.html',
  styleUrl: './data-list.component.scss'
})
export class DataListComponent implements OnInit {
  private dataListService = inject(DataListService);
  private messageService = inject(MessageService);
  private page = 1;
  private limit = 10;
  public adsList!: Ad_Model[];
  public selectedAd: Ad_Model | null = null;


  ngOnInit(): void {
    this._getData();
  }

  private _getData(): void {
    this.dataListService.getAds({}).pipe(first()).subscribe({
      next: (ads) => this.adsList = ads,
      error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message })
    })
  }

  public filterAds(): void {

  }
  public priceFormat(value: number): string {
    return `${value}K`
  }
  public surfaceAreaFormat(value: number): string {
    return `${value}m`
  }
}
