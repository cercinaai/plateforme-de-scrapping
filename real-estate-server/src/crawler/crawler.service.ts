import { Injectable } from "@nestjs/common";
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { crawler_healthCheck_negative, crawler_healthCheck_positive } from "./utils/crawler.type";
import { InjectModel } from "@nestjs/mongoose";
import { Ad } from "src/models/ad.schema";
import { Model } from "mongoose";

@Injectable()
export class CrawlerService {

    constructor(@InjectQueue('crawler') private crawlerQueue: Queue) { }

    async populate_database() {
        // await this.crawlerQueue.add('boncoin-crawler', {}, { attempts: 3, });
        // await this.crawlerQueue.add('seloger-crawler', {}, { attempts: 3, });

        await this.crawlerQueue.add('bienici-crawler', {}, { attempts: 3, });
        await this.crawlerQueue.add('logicimmo-crawler', {}, { attempts: 3, });
    }
    async heathCheck(): Promise<{ crawler_success: crawler_healthCheck_positive[], crawler_failure: crawler_healthCheck_negative[] }> {
        return {
            crawler_success: (await this.crawlerQueue.getCompleted()).map((job) => job.data),
            crawler_failure: (await this.crawlerQueue.getFailed()).map((job) => job.data),
        }
    }
}