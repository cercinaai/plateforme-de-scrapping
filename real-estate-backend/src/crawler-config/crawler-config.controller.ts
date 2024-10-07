import { Controller, Get, Post, Put, UseGuards } from "@nestjs/common";
import { CrawlerConfigService } from "./crawler-config.service";
import { CrawlerConfig } from "src/models/CrawlerConfig.schema";
import { Throttle } from "@nestjs/throttler";
import { RealEstateAuthGuard } from "src/auth/guard/RealEstate.guard";



@Controller('crawler-config')
export class CrawlerConfigController {

    constructor(private readonly crawlerConfigService: CrawlerConfigService) { }

    @Throttle({ short: { limit: 2, ttl: 1000 }, long: { limit: 5, ttl: 60000 } })
    @UseGuards(RealEstateAuthGuard)
    @Get('get-config')
    async getCrawlerConfig(): Promise<CrawlerConfig> {
        return this.crawlerConfigService.getCrawlerConfig();
    }

    @Throttle({ short: { limit: 2, ttl: 1000 }, long: { limit: 5, ttl: 60000 } })
    @UseGuards(RealEstateAuthGuard)
    @Put('update-config')
    async updateCrawlerConfig(crawlerConfig: CrawlerConfig): Promise<CrawlerConfig> {
        return this.crawlerConfigService.updateCrawlerConfig(crawlerConfig);
    }
}