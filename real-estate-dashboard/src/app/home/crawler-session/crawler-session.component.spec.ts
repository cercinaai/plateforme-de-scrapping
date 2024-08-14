import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrawlerSessionComponent } from './crawler-session.component';

describe('CrawlerSessionComponent', () => {
  let component: CrawlerSessionComponent;
  let fixture: ComponentFixture<CrawlerSessionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrawlerSessionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrawlerSessionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
