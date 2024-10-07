import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Observable } from "rxjs";
import { CrawlerConfig } from "src/models/CrawlerConfig.schema";


@Injectable()
export class ApiKeyStrategy implements CanActivate {

    constructor(@InjectModel(CrawlerConfig.name) private crawlerConfigModel: Model<CrawlerConfig>) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const apiKey = request.headers['x-api-key'];
        if (!apiKey) {
            return false
        }
        const { api_key } = await this.crawlerConfigModel.findOne({});
        return api_key === apiKey;
    }
}