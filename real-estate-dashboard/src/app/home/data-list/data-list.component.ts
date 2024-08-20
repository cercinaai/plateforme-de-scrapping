import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { DataListService } from '../../services/data-list.service';
import { Ad_Model } from '../../models/Ads.model';
import { first } from 'rxjs';
import { MatSliderModule } from '@angular/material/slider';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatRadioModule } from '@angular/material/radio';
import { MatIconModule } from '@angular/material/icon';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
@Component({
  selector: 'app-data-list',
  standalone: true,
  imports: [ToastModule, CommonModule, FormsModule, MatSliderModule, MatTableModule, MatPaginatorModule,
    MatSortModule, MatDatepickerModule, MatIconModule, MatExpansionModule, MatSlideToggleModule, MatRadioModule],
  providers: [MessageService],
  templateUrl: './data-list.component.html',
  styleUrl: './data-list.component.scss'
})
export class DataListComponent implements OnInit {
  private dataListService = inject(DataListService);
  private messageService = inject(MessageService);
  public findByCoordinates: boolean = false;
  public ads_filter: {
    date?: {
      key_display: 'Plage de dates'
      startDate?: {
        filter_key: 'startDate'
        value: Date
      },
      endDate?: {
        filter_key: 'endDate'
        value: Date
      }
    },
    origin?: {
      key_display: 'Origine du robot'
      filter_key: 'origin'
      value: string[]
    },
    category?: {
      key_display: 'Catégorie'
      filter_key: 'category'
      value: string[]
    },
    price?: {
      key_display: 'Plage de Prix'
      min: {
        filter_key: 'minPrice'
        value: number
      }
      max: {
        filter_key: 'maxPrice'
        value: number
      }
    }
    surface?: {
      key_display: 'Plage de Surface'
      min: {
        filter_key: 'minSurface'
        value: number
      }
      max: {
        filter_key: 'maxSurface'
        value: number
      }
    }
    romms?: {
      key_display: 'Plage des chambres'
      min: {
        filter_key: 'minRooms'
        value: number
      }
      max: {
        filter_key: 'maxRooms'
        value: number
      }
    }
    location?: {
      key_display: 'Localisation'
      byCity?: {
        city: {
          filter_key: 'city'
          value: string
        },
        postalCode: {
          filter_key: 'postalCode'
          value: string
        }
      }
      ByExtactLocation?: {
        lat: {
          filter_key: 'lat'
          value: number
        },
        lon: {
          filter_key: 'lon'
          value: number
        }
        radius: {
          filter_key: 'radius'
          value: number
        }
      }
    }
    orderBy?: {
      key_display: 'Trier par'
      filter_key: 'orderBy'
      value: 'price' | 'Date'
    }
  } = {}
  displayedColumns: string[] = ['title', 'origin', 'price', 'surface', 'category'];
  dataSource = new MatTableDataSource<Ad_Model>([]);
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  selectedAd!: Ad_Model | null;

  ngOnInit(): void {
    this._getData();
  }

  private _getData(): void {
    this.dataListService.getAds({ limit: 20 }).pipe(first()).subscribe({
      next: (ads) => {
        this.dataSource.data = ads;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
      },
      error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message })
    })
  }

  public filterAds(): void {
    const filter = this._extract_filters();
    this.dataListService.getAds(filter).pipe(first()).subscribe({
      next: (ads) => {
        this.dataSource.data = ads;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
      },
      error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message })
    })
  }

  public pageChange(event: PageEvent): void {
    // NEXT PAGE CLICKED
    if (!event.previousPageIndex || event.pageIndex > event.previousPageIndex) {
      let filter = this._extract_filters();
      filter.page = event.pageIndex + 1;
      this.dataListService.getAds(filter).pipe(first()).subscribe({
        next: (ads) => {
          this.dataSource.data = [...this.dataSource.data, ...ads];
        },
        error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message })
      })
    }
  }


  public clearFilters(): void {
    this.ads_filter = {}
    this.paginator.firstPage();
    this._getData();
  }


  public removeFilter(key: string): void {
    // this.page = 1
    // this.limit = 10
    // this._getData();
  }

  public applyDateFilter(value: Event): void {
    if ((value.target as any)['id'] === 'start-date') {
      this.ads_filter.date = {
        ...this.ads_filter.date,
        key_display: 'Plage de dates',
        startDate: {
          filter_key: 'startDate',
          value: (value.target as any).value,
        }
      }
      return;
    }
    if ((value.target as any)['id'] === 'end-date') {
      this.ads_filter.date = {
        ...this.ads_filter.date,
        key_display: 'Plage de dates',
        endDate: {
          filter_key: 'endDate',
          value: (value.target as any).value,
        }
      }
      return;
    }
  }

  public applyOriginFilter(value: string): void {
    if (this.ads_filter.origin?.value.includes(value)) {
      this.ads_filter.origin = {
        ...this.ads_filter.origin,
        value: this.ads_filter.origin?.value.filter((item) => item !== value),
      }
      return;
    }
    this.ads_filter.origin = {
      ...this.ads_filter.origin,
      key_display: 'Origine du robot',
      filter_key: "origin",
      value: [...this.ads_filter.origin?.value || [], value],
    }
  }

  public applyCategoryFilter(value: string): void {
    if (this.ads_filter.category?.value.includes(value)) {
      this.ads_filter.category = {
        ...this.ads_filter.category,
        value: this.ads_filter.category?.value.filter((item) => item !== value),
      }
      return;
    }
    this.ads_filter.category = {
      ...this.ads_filter.category,
      key_display: 'Catégorie',
      filter_key: "category",
      value: [...this.ads_filter.category?.value || [], value],
    }
  }
  public applyPriceFilter(value: Event): void {
    if ((value.target as any)['id'] === 'min-price') {
      this.ads_filter.price = {
        key_display: 'Plage de Prix',
        min: {
          filter_key: 'minPrice',
          value: (value.target as any).value,
        },
        max: {
          filter_key: 'maxPrice',
          value: (value.target as any)['nextElementSibling'].value,
        }
      }
      return;
    }
    if ((value.target as any)['id'] === 'max-price') {
      this.ads_filter.price = {
        key_display: 'Plage de Prix',
        min: {
          filter_key: 'minPrice',
          value: (value.target as any)['previousElementSibling'].value,
        },
        max: {
          filter_key: 'maxPrice',
          value: (value.target as any).value,
        }
      }
    }
  }

  public applySurfaceAreaFilter(value: Event): void {
    if ((value.target as any)['id'] === 'min-surface') {
      this.ads_filter.surface = {
        key_display: 'Plage de Surface',
        min: {
          filter_key: 'minSurface',
          value: (value.target as any).value,
        },
        max: {
          filter_key: 'maxSurface',
          value: (value.target as any)['nextElementSibling'].value,
        }
      }
      return;
    }
    if ((value.target as any)['id'] === 'max-surface') {
      this.ads_filter.surface = {
        key_display: 'Plage de Surface',
        min: {
          filter_key: 'minSurface',
          value: (value.target as any)['previousElementSibling'].value,
        },
        max: {
          filter_key: 'maxSurface',
          value: (value.target as any).value,
        }
      }
    }
  }

  public applyRoomsFilter(value: Event): void {
    if ((value.target as any)['id'] === 'min-rooms') {
      this.ads_filter.romms = {
        key_display: 'Plage des chambres',
        min: {
          filter_key: 'minRooms',
          value: (value.target as any).value,
        },
        max: {
          filter_key: 'maxRooms',
          value: (value.target as any)['nextElementSibling'].value,
        }
      }
      return;
    }
    if ((value.target as any)['id'] === 'max-rooms') {
      this.ads_filter.romms = {
        key_display: 'Plage des chambres',
        min: {
          filter_key: 'minRooms',
          value: (value.target as any)['previousElementSibling'].value,
        },
        max: {
          filter_key: 'maxRooms',
          value: (value.target as any).value,
        }
      }
    }
  }

  public applyLocationFilter(value: any): void { }

  public applyOrderByFilter(value: string): void { }


  public selectAd(ad: Ad_Model): void {
    this.selectedAd = ad;
  }

  public priceFormat(value: number): string {
    return `${value}K`
  }
  public surfaceAreaFormat(value: number): string {
    return `${value}m`
  }

  private _extract_filters(): any {
    const { date, origin, category, price, surface, romms, location, orderBy } = this.ads_filter;
    const filter: any = {}
    if (date) {
      filter.startDate = date.startDate?.value
      filter.endDate = date.endDate?.value
    }
    if (origin) {
      filter.origin = origin.value
    }
    if (category) {
      filter.category = category.value
    }
    if (price) {
      filter.minPrice = price.min.value
      filter.maxPrice = price.max.value
    }
    if (surface) {
      filter.minSurface = surface.min.value
      filter.maxSurface = surface.max.value
    }
    if (romms) {
      filter.minRooms = romms.min.value
      filter.maxRooms = romms.max.value
    }
    if (location) {
      if (location.byCity) {
        filter.city = location.byCity.city.value
        filter.postalCode = location.byCity.postalCode.value
      }
      if (location.ByExtactLocation) {
        filter.lat = location.ByExtactLocation.lat.value
        filter.lon = location.ByExtactLocation.lon.value
        filter.radius = location.ByExtactLocation.radius.value
      }
    }
    if (orderBy) {
      filter.orderBy = orderBy.value
    }
    return filter;
  }
}
