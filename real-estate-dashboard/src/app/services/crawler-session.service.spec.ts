import { TestBed } from '@angular/core/testing';

import { CrawlerSessionService } from './crawler-session.service';

describe('CrawlerSessionService', () => {
  let service: CrawlerSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CrawlerSessionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
