import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { AuthGuard } from "@nestjs/passport";
import { Throttle } from "@nestjs/throttler";
import { Model } from "mongoose";
import { Ad } from "src/models/ad.schema";
import { CrawlerSession } from "src/models/crawlerSession.schema";


@Controller('data-provider')
export class DataProviderController {

    constructor(@InjectModel(CrawlerSession.name) private crawlerSessionModel: Model<CrawlerSession>, @InjectModel(Ad.name) private adModel: Model<Ad>) { }

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

    @Throttle({ short: { limit: 2, ttl: 1000 }, long: { limit: 5, ttl: 60000 } })
    @UseGuards(AuthGuard('jwt'))
    @Get('ad-list')
    async get_ad(
        @Query('page') page = 1,
        @Query('limit') limit = 10,
        @Query('origin') origin?: string,
        @Query('type') type?: string,
        @Query('category') category?: string,
        @Query('minPrice') minPrice?: number,
        @Query('maxPrice') maxPrice?: number,
        @Query('minSurface') minSurface?: number,
        @Query('maxSurface') maxSurface?: number,
        @Query('minRooms') minRooms?: number,
        @Query('maxRooms') maxRooms?: number,
        @Query('minBedrooms') minBedrooms?: number,
        @Query('maxBedrooms') maxBedrooms?: number,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('city') city?: string,
        @Query('postalCode') postalCode?: string,
        @Query('departmentCode') departmentCode?: string,
        @Query('regionCode') regionCode?: string,
        @Query('lat') lat?: number,
        @Query('lon') lon?: number,
        @Query('radius') radius = 5000
    ): Promise<Ad[]> {
        const skip = (page - 1) * limit;
        const filters: any = {};
        if (origin) filters.origin = origin;
        if (type) filters.type = type;
        if (category) filters.category = category;
        if (minPrice || maxPrice) filters.price = {};
        if (minPrice) filters.price.$gte = minPrice;
        if (maxPrice) filters.price.$lte = maxPrice;
        if (minSurface || maxSurface) filters.surface = {};
        if (minSurface) filters.surface.$gte = minSurface;
        if (maxSurface) filters.surface.$lte = maxSurface;
        if (minRooms || maxRooms) filters.rooms = {};
        if (minRooms) filters.rooms.$gte = minRooms;
        if (maxRooms) filters.rooms.$lte = maxRooms;
        if (minBedrooms || maxBedrooms) filters.bedrooms = {};
        if (minBedrooms) filters.bedrooms.$gte = minBedrooms;
        if (maxBedrooms) filters.bedrooms.$lte = maxBedrooms;
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
                    $centerSphere: [[lon, lat], radius / 6378.1] // radius in meters converted to radians
                }
            };
        }
        return this.adModel.find(filters).sort({ created_at: -1 }).skip(skip).limit(limit);
    }

}