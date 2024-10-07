import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { CrawlerConfig } from '../../models/crawlerConfig.model';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { MatDividerModule } from '@angular/material/divider';
import { SplitterModule } from 'primeng/splitter';
import { CrawlerConfigService } from '../../services/crawler-config.service';
import { first } from 'rxjs';
import { MessageService } from 'primeng/api';
@Component({
  selector: 'app-crawler-config',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    FormsModule,
    MatDividerModule,
    SplitterModule
  ],
  providers: [CrawlerConfigService, MessageService],
  templateUrl: './crawler-config.component.html',
  styleUrl: './crawler-config.component.scss',
})
export class CrawlerConfigComponent implements OnInit {
  private crawlerConfigService = inject(CrawlerConfigService);
  private messageService = inject(MessageService);
  public crawler_config!: CrawlerConfig;
  public containerToOpen!: 'api_key' | 'proxy' | 'boncoin' | 'bienici' | 'logicimmo' | 'seloger' | null;
  public keyGenerated: boolean = false;
  public proxyUrls: string[] = [];
  ngOnInit(): void {
    this._grab_crawler_config();
  }


  public toggleCrawler(): void {
    this.containerToOpen = null;
    if (this.crawler_config.can_crawl) {
      this.descactivateCrawler();
      return;
    }
    this.activateCrawler();
  }

  public toggleContainer(container: 'api_key' | 'proxy' | 'boncoin' | 'bienici' | 'logicimmo' | 'seloger'): void {
    if (this.containerToOpen === container) {
      this.containerToOpen = null;
      return;
    }
    if (container === 'proxy') {
      this.proxyUrls = [...this.crawler_config.proxy_urls];
    }
    this.containerToOpen = container
  }

  public generateNewApiKey() {
    const prefix = "cercina-";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const keyLength = 16;
    let randomPart = "";
    for (let i = 0; i < keyLength; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      randomPart += characters[randomIndex];
    }
    const apiKey = prefix + randomPart;
    this.crawler_config.api_key = apiKey;
    this.keyGenerated = true;
  }
  public copyApiKey() {
    navigator.clipboard.writeText(this.crawler_config.api_key);
  }

  public removeProxy(index: number): void {
    this.proxyUrls = this.proxyUrls.filter((proxy, i) => i !== index);
  };

  public addProxy(): void {
    this.proxyUrls = [...this.proxyUrls, ''];
  };

  public resetProxies(): void {
    this.proxyUrls = this.crawler_config.proxy_urls;
  }
  public calculateRawValue(value: number, limit: number): string {
    return Math.round((value / 100) * limit) + '';
  }

  public saveProxy(): void {
    // DATABASE INTERACTION
    this.crawler_config.proxy_urls = this.proxyUrls
    this.containerToOpen = null
    this.saveCrawlerConfig();
  };

  private activateCrawler(): void {
    this.crawler_config.can_crawl = true;
    this.saveCrawlerConfig();
  }

  private descactivateCrawler(): void {
    this.crawler_config.can_crawl = false;
    this.saveCrawlerConfig();
  }


  private saveCrawlerConfig(): void {

  }



  private _grab_crawler_config(): void {
    this.crawlerConfigService.getCrawlerConfig().pipe(first()).subscribe({
      next: (data) => {
        console.log(data);
        this.crawler_config = data;
      },
      error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'NO CRAWLER CONFIG FOUND' })
    });
  }

}
