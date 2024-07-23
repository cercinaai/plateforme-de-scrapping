import { Injectable } from "@nestjs/common";
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';

@Injectable()
export class CrawlerService {

    constructor(@InjectQueue('crawler') private crawlerQueue: Queue) { }

    async startPeriodicCrawlers() {
        await this.crawlerQueue.add('boncoin-crawler', {})
        await this.crawlerQueue.add('seloger-crawler', {})
    }

}