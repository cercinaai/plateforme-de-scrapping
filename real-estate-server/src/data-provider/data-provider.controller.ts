import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { AuthGuard } from "@nestjs/passport";
import { Throttle } from "@nestjs/throttler";
import { Model } from "mongoose";
import { CrawlerSession } from "src/models/crawlerSession.schema";


@Controller('data-provider')
export class DataProviderController {

    constructor(@InjectModel(CrawlerSession.name) private crawlerSessionModel: Model<CrawlerSession>) { }

    @Throttle({ short: { limit: 2, ttl: 1000 }, long: { limit: 5, ttl: 60000 } })
    @UseGuards(AuthGuard('jwt'))
    @Get('crawler-session')
    async get_crawler_session(@Query('page') page = 1, @Query('limit') limit = 4): Promise<CrawlerSession[]> {
        const skip = (page - 1) * limit;
        return this.crawlerSessionModel.find().sort({ session_date: -1 }).skip(skip).limit(limit);
    }

    @Throttle({ short: { limit: 2, ttl: 1000 }, long: { limit: 5, ttl: 60000 } })
    @UseGuards(AuthGuard('jwt'))
    @Get('date-range-crawler')
    async get_date_range_crawler(@Query('startDate') startDate: string, @Query('endDate') endDate: string): Promise<CrawlerSession[]> {
        return this.crawlerSessionModel.find({ session_date: { $gte: startDate, $lte: endDate } }).sort({ session_date: -1 });
    }
}