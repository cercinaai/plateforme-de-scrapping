import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatRadioModule } from '@angular/material/radio';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { JobOfferService } from '../../services/job-offer.service';
import { JobOffer } from '../../models/job-offer';
import { JobOfferDetailsComponent } from '../job-offer-details/job-offer-details.component';

@Component({
  selector: 'app-job-offer-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatIconModule,
    MatExpansionModule,
    MatSlideToggleModule,
    MatRadioModule,
    MatDividerModule,
    MatSelectModule,
    MatDialogModule,
  ],
  templateUrl: './job-offer-list.component.html',
  styleUrls: ['./job-offer-list.component.scss'],
})
export class JobOfferListComponent implements OnInit {
  private jobOfferService = inject(JobOfferService);
  private dialog = inject(MatDialog);

  public displayedColumns: string[] = ['title', 'location', 'salary', 'contract', 'publicationDate', 'actions'];
  public dataSource!: MatTableDataSource<JobOffer>;
  public isLoading = false;
  public expandFilters = false;

  public filters: {
    keyword?: string;
    location?: string;
    contractType?: string;
    workTime?: string;
    experience?: string;
    qualification?: string;
    specialties?: string[];
  } = {};
  

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnInit(): void {
    this.dataSource = new MatTableDataSource<JobOffer>();
    this.loadJobOffers();
  }

  loadJobOffers(filters: any = {}): void {
    this.isLoading = true;
    this.jobOfferService.getJobOffers(filters).subscribe({
      next: (offers) => {
        this.dataSource.data = offers.map((offer) => ({
          ...offer,
        }));
        this.dataSource.paginator = this.paginator;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch job offers', err);
        this.isLoading = false;
      },
    });
  }
  
  applyFilters(): void {
    this.expandFilters = false;
    console.log('Filters applied:', this.filters);
    this.loadJobOffers(this.filters);
  }
  
  clearFilters(): void {
    this.filters = {};
    this.expandFilters = false;
    this.loadJobOffers();
  }
  
  

  // applyFilters(): void {
  //   this.expandFilters = false;
  //   console.log('Filters:', this.filters);
  //   this.loadJobOffers(); // Update this to pass filter params if applicable
  // }

  // clearFilters(): void {
  //   this.filters = {};
  //   this.expandFilters = false;
  //   this.loadJobOffers();
  // }

  openJobDetails(offer: JobOffer): void {
    this.dialog.open(JobOfferDetailsComponent, {
      data: offer,
      width: '60%',
      maxWidth: '800px',
    });
  }

  pageChange(event: PageEvent): void {
    console.log('Page event:', event);
  }
}
