import { BadRequestException, Controller, Get, NotFoundException, Query, StreamableFile, UseGuards } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Throttle } from "@nestjs/throttler";
import { Model } from "mongoose";
import { RealEstateAuthGuard } from "../auth/guard/RealEstate.guard";
import { Ad } from "../models/ad.schema";
import { CrawlerSession } from "../models/crawlerSession.schema";
import { DataProviderService } from "./data-provider.service";
import { FilterAdsDto } from "./utils/adsFilterDTO";
import { createReadStream } from "fs";
import { json2csv } from 'json-2-csv';

@Controller('data-provider')
export class DataProviderController {

    constructor(@InjectModel(CrawlerSession.name) private crawlerSessionModel: Model<CrawlerSession>, @InjectModel(Ad.name) private adModel: Model<Ad>, private dataProviderService: DataProviderService) { }

    @Throttle({ short: { limit: 2, ttl: 1000 }, long: { limit: 5, ttl: 60000 } })
    @UseGuards(RealEstateAuthGuard)
    @Get('crawler-session')
    async get_crawler_session(@Query('page') page = 1, @Query('limit') limit = 4): Promise<CrawlerSession[]> {
        const skip = (page - 1) * limit;
        return this.crawlerSessionModel.find().sort({ session_date: -1 }).skip(skip).limit(limit);
    }

    @Throttle({ short: { limit: 2, ttl: 1000 }, long: { limit: 5, ttl: 60000 } })
    @UseGuards(RealEstateAuthGuard)
    @Get('date-range-crawler')
    async get_date_range_crawler(@Query('startDate') startDate: string, @Query('endDate') endDate: string): Promise<CrawlerSession[]> {
        return this.crawlerSessionModel.find({ session_date: { $gte: startDate, $lte: endDate } }).sort({ session_date: -1 });
    }

    @Throttle({ short: { limit: 2, ttl: 1000 }, long: { limit: 5, ttl: 60000 } })
    @UseGuards(RealEstateAuthGuard)
    @Get('ad-list')
    async get_ad(@Query() query: FilterAdsDto): Promise<Ad[] | { ads: Ad[], total: number }> {
        return this.dataProviderService.filterAdsList(query);
    }

    @Throttle({ short: { limit: 2, ttl: 1000 }, long: { limit: 5, ttl: 60000 } })
    @UseGuards(RealEstateAuthGuard)
    @Get('single-ad')
    async get_single_ad(@Query('_id') _id?: string, @Query('adId') adId?: string,): Promise<Ad> {
        if (!_id && !adId) {
            throw new BadRequestException('Either _id or adId must be provided');
        }
        if (_id) {
            return await this.adModel.findById(_id).catch(() => { throw new NotFoundException('Ad not found') });
        }
        if (adId) {
            return await this.adModel.findOne({ adId }).catch(() => { throw new NotFoundException('Ad not found') });
        }
    }

    @Throttle({ short: { limit: 2, ttl: 1000 }, long: { limit: 5, ttl: 60000 } })
    @UseGuards(RealEstateAuthGuard)
    @Get('similar-ads')
    async get_similar_ads(@Query('_id') _id: string): Promise<Ad[]> {
        // Fetch the ad by its ID
        const ad = await this.adModel.findById(_id);
        if (!ad) {
            throw new NotFoundException('Ad not found');
        }

        // Define a price range, for example, ±20% of the current ad price
        const priceRange = {
            $gte: ad.price * 0.8, // 20% less than the ad price
            $lte: ad.price * 1.2  // 20% more than the ad price
        };

        const coordinates = [ad.location.coordinates.lon, ad.location.coordinates.lat];

        // Query for similar ads based on category, location, and price range
        const ads = await this.adModel.find({
            _id: { $ne: _id },
            category: ad.category, // Same category
            'location.coordinates': {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates
                    },
                    $maxDistance: 100000 // Maximum distance in meters, can be adjusted
                }
            },
            price: priceRange // Price range
        }).limit(10);

        // If no ads found within the geospatial range, return ads only based on category and price
        if (ads.length === 0) {
            return this.adModel.find({
                _id: { $ne: _id },
                category: ad.category, // Same category
                price: priceRange // Price range
            }).limit(10);
        }

        return ads;
    }

    @Throttle({ short: { limit: 2, ttl: 1000 }, long: { limit: 5, ttl: 60000 } })
    @UseGuards(RealEstateAuthGuard)
    @Get('export-ads-csv')
    async export_ads_csv(@Query() query: FilterAdsDto): Promise<StreamableFile> {
        const ads_to_export = await this.dataProviderService.filterAdsList(query, false);
        const file_content = json2csv(ads_to_export as object[], { checkSchemaDifferences: true });
        const filename = `ads-${Date.now()}.csv`;
        const file = Buffer.from(file_content, 'utf-8');
        return new StreamableFile(file, { type: 'text/csv', disposition: `attachment; filename=${filename}` });
    }

}