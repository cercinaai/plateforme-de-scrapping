import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CrawlerConfig } from "src/models/CrawlerConfig.schema";

@Injectable()
export class CrawlerConfigService {
    constructor(@InjectModel(CrawlerConfig.name) private crawlerConfigModel: Model<CrawlerConfig>) { }

    public getCrawlerConfig(): Promise<CrawlerConfig> {
        return this.crawlerConfigModel.findOne({})
    }

    public updateCrawlerConfig(crawlerConfig: CrawlerConfig): Promise<CrawlerConfig> {
        return this.crawlerConfigModel.findOneAndUpdate({}, crawlerConfig, { upsert: true, new: true })
    }

    public async updateCrawlerStatus(target: string, status: string): Promise<CrawlerConfig> {
        const updateField = `${target}.status`;
        const update = { [updateField]: status };
    
        const result = await this.crawlerConfigModel.updateOne({}, { $set: update });
        console.log("Update result:", result);
    
        if (result.modifiedCount === 0) {
            throw new Error("Status update failed");
        }
    
        return this.crawlerConfigModel.findOne({});
    }
    
    
    
    public async updateCrawlerTotal(target: string, nombre: number): Promise<CrawlerConfig> {
        const updateField = `${target}.nombre`;
        const update = { [updateField]: nombre };
    
        console.log('Updating total:', update); // DEBUG
        const result = await this.crawlerConfigModel.findOneAndUpdate({}, { $set: update }, { new: true });
        console.log('Update result:', result); // DEBUG
        return result;
    }
    
    
    
}