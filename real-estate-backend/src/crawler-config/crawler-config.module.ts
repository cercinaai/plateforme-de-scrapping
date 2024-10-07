import { Module } from "@nestjs/common";
import { CrawlerConfigController } from "./crawler-config.controller";
import { CrawlerConfigService } from "./crawler-config.service";
import { MongooseModule } from "@nestjs/mongoose";
import { CrawlerConfig, CrawlerConfigSchema } from "src/models/CrawlerConfig.schema";
import { AuthModule } from "../auth/auth.module";


@Module({
    imports: [
        MongooseModule.forFeature([{ name: CrawlerConfig.name, schema: CrawlerConfigSchema }]),
        AuthModule
    ],
    controllers: [CrawlerConfigController],
    providers: [CrawlerConfigService],
})
export class CrawlerConfigModule { }