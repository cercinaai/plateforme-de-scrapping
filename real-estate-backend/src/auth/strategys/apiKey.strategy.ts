import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Observable } from "rxjs";
import { CrawlerConfig } from "src/models/CrawlerConfig.schema";


@Injectable()
export class ApiKeyStrategy {

    constructor(@InjectModel(CrawlerConfig.name) private crawlerConfigModel: Model<CrawlerConfig>) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const apiKey = request.headers['x-api-key'];
        if (!apiKey) {
            return false
        }
        const crawlerConfig = await this.crawlerConfigModel.findOne({ apiKey: apiKey });
        if (!crawlerConfig) {
            return false
        }
        return true;
    }
}