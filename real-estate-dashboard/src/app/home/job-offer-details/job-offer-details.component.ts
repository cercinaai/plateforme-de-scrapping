import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { JobOffer } from '../../models/job-offer';

@Component({
  selector: 'app-job-offer-details',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './job-offer-details.component.html',
  styleUrls: ['./job-offer-details.component.scss'],
})
export class JobOfferDetailsComponent {
  constructor(
    public dialogRef: MatDialogRef<JobOfferDetailsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: JobOffer | null
  ) {}

  close(): void {
    this.dialogRef.close();
  }
}
