import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CrawlerConfig } from "src/models/CrawlerConfig.schema";

@Injectable()
export class CrawlerConfigService {
    constructor(@InjectModel(CrawlerConfig.name) private crawlerConfigModel: Model<CrawlerConfig>) {}

    public getCrawlerConfig() : Promise<CrawlerConfig> {
        return this.crawlerConfigModel.findOne()
    }

    public updateCrawlerConfig(crawlerConfig: CrawlerConfig) : Promise<CrawlerConfig> {
        return this.crawlerConfigModel.findOneAndUpdate({}, crawlerConfig, { upsert: true, new: true })
    }
}