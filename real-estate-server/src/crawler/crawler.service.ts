import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { BoncoinCrawler } from "./boncoin/boncoin.crawler";
import { crawlerInterface } from "./utils/crawler.interface";
import { crawler_healthCheck_negative, crawler_healthCheck_positive } from "./utils/crawler.type";

@Injectable()
export class CrawlerService {
    private crawler_list: crawlerInterface[] = [new BoncoinCrawler()];

    constructor(private eventEmitter: EventEmitter2) {

    }

    async startPeriodicCrawlers() {
        for (const crawler of this.crawler_list) {
            await crawler.start_crawler();
        }
    }

    crawler_healthCheck(): Array<crawler_healthCheck_positive | crawler_healthCheck_negative> {
        return this.crawler_list.map((crawler) => crawler.crawler_healthCheck())
    }

}