import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule } from '@angular/forms';
import { JobOfferService } from '../../services/job-offer.service';
import { CommonModule } from '@angular/common';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-entreprises',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatPaginatorModule,
  ],
  templateUrl: './entreprises.component.html',
  styleUrls: ['./entreprises.component.scss'],
})
export class EntreprisesComponent implements OnInit {
  entreprises: { id: string; nom: string; emails: string[]; siteWeb?: string }[] = [];
  entreprisesForm: FormGroup;
  isLoading = false;

  // Pagination properties
  pageSize = 10;
  currentPage = 0;
  totalEntreprises = 0;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private fb: FormBuilder, private jobOfferService: JobOfferService) {
    this.entreprisesForm = this.fb.group({
      entreprisesForms: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    this.loadEntreprises();
  }

  loadEntreprises(): void {
    this.isLoading = true;
    this.jobOfferService.getEntreprisesWithEmails().subscribe({
      next: (data) => {
        this.entreprises = data.map((entreprise) => ({
          ...entreprise,
          emails: entreprise.emails.length > 0 ? entreprise.emails : [''],
          siteWeb: entreprise.siteWeb || '',
        }));
        this.totalEntreprises = this.entreprises.length;
        this.createForm();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch entreprises', err);
        this.isLoading = false;
      },
    });
  }

  createForm(): void {
    const entreprisesForms = this.entreprisesForm.get('entreprisesForms') as FormArray;
    entreprisesForms.clear();
    this.getCurrentPageEntreprises().forEach((entreprise) => {
      entreprisesForms.push(
        this.fb.group({
          emails: this.fb.array(entreprise.emails.map((email) => this.fb.control(email))),
          siteWeb: this.fb.control(entreprise.siteWeb),
        })
      );
    });
  }

  getCurrentPageEntreprises() {
    const startIndex = this.currentPage * this.pageSize;
    return this.entreprises.slice(startIndex, startIndex + this.pageSize);
  }

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex;
    this.createForm();
  }

  getEntreprisesFormsControls(): FormGroup[] {
    const entreprisesForms = this.entreprisesForm.get('entreprisesForms') as FormArray;
    return entreprisesForms.controls as FormGroup[];
  }

  emailsControls(index: number): FormArray {
    const entreprisesForms = this.entreprisesForm.get('entreprisesForms') as FormArray;
    return entreprisesForms.at(index).get('emails') as FormArray;
  }

  addEmailField(index: number): void {
    this.emailsControls(index).push(this.fb.control(''));
  }

  updateEmailsAndSite(index: number): void {
    const entreprisesForms = this.entreprisesForm.get('entreprisesForms') as FormArray;
    const formGroup = entreprisesForms.at(index) as FormGroup;
    const emails = (formGroup.get('emails') as FormArray).value;
    const siteWeb = formGroup.get('siteWeb')?.value;

    const validEmails = emails.filter((email: string) => email && email.trim() !== '');

    this.jobOfferService.updateEntrepriseDetails(this.entreprises[this.currentPage * this.pageSize + index].id, validEmails, siteWeb).subscribe({
      next: () => {
        alert('Emails and site updated successfully!');
        this.loadEntreprises();
      },
      error: (err) => {
        console.error('Failed to update emails and site', err);
        alert('Failed to update emails and site');
      },
    });
  }
}