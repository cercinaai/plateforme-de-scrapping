import { BadRequestException, Controller, Get, NotFoundException, Query, UseGuards } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { AuthGuard } from "@nestjs/passport";
import { Throttle } from "@nestjs/throttler";
import { Model } from "mongoose";
import { RealEstateAuthGuard } from "../auth/guard/RealEstate.guard";
import { Ad } from "../models/ad.schema";
import { CrawlerSession } from "../models/crawlerSession.schema";


@Controller('data-provider')
export class DataProviderController {

    constructor(@InjectModel(CrawlerSession.name) private crawlerSessionModel: Model<CrawlerSession>, @InjectModel(Ad.name) private adModel: Model<Ad>) { }

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
    async get_ad(
        @Query('page') page = 1,
        @Query('origin') origin?: string[],
        @Query('category') category?: string[],
        @Query('minPrice') minPrice?: number,
        @Query('maxPrice') maxPrice?: number,
        @Query('minSurface') minSurface?: number,
        @Query('maxSurface') maxSurface?: number,
        @Query('minRooms') minRooms?: number,
        @Query('maxRooms') maxRooms?: number,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('city') city?: string,
        @Query('postalCode') postalCode?: string,
        @Query('departmentCode') departmentCode?: string,
        @Query('regionCode') regionCode?: string,
        @Query('lat') lat?: number,
        @Query('lon') lon?: number,
        @Query('radius') radius = 5000,
    ): Promise<Ad[]> {

        const skip = (page - 1) * 20;
        const filters: any = {};
        if (origin && origin.length > 0) filters.origin = { $in: origin };
        if (category && category.length > 0) filters.category = { $in: category };
        if (minPrice || maxPrice) filters.price = {};
        if (minPrice) filters.price.$gte = minPrice;
        if (maxPrice) filters.price.$lte = maxPrice;
        if (minSurface || maxSurface) filters.surface = {};
        if (minSurface) filters.surface.$gte = minSurface;
        if (maxSurface) filters.surface.$lte = maxSurface;
        if (minRooms || maxRooms) filters.rooms = {};
        if (minRooms) filters.rooms.$gte = minRooms;
        if (maxRooms) filters.rooms.$lte = maxRooms;
        if (startDate || endDate) filters.creationDate = {};
        if (startDate) filters.creationDate.$gte = new Date(startDate);
        if (endDate) filters.creationDate.$lte = new Date(endDate);

        if (city) filters['location.city'] = city;
        if (postalCode) filters['location.postalCode'] = postalCode;
        if (departmentCode) filters['location.departmentCode'] = departmentCode;
        if (regionCode) filters['location.regionCode'] = regionCode;

        if (lat && lon) {
            filters['location.coordinates'] = {
                $geoWithin: {
                    $centerSphere: [[lon, lat], radius / 6378.1]
                }
            };
        }
        return this.adModel.find(filters).sort({ creationDate: -1 }).skip(skip).limit(20);
    }

    @Throttle({ short: { limit: 2, ttl: 1000 }, long: { limit: 5, ttl: 60000 } })
    @UseGuards(RealEstateAuthGuard)
    @Get('single-ad')
    async get_single_ad(@Query('_id') _id?: string, @Query('adId') adId?: string,): Promise<Ad> {
        if (!_id && !adId) {
            throw new BadRequestException('Either _id or adId must be provided');
        }
        let ad: Ad | null = null;

        if (_id) {
            ad = await this.adModel.findById(_id);
        } else if (adId) {
            ad = await this.adModel.findOne({ adId });
        }
        if (!ad) {
            throw new NotFoundException('Ad not found');
        }
        return ad;
    }

}