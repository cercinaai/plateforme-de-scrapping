import { BadRequestException, Controller, Get, NotFoundException, Query, UseGuards } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { AuthGuard } from "@nestjs/passport";
import { Throttle } from "@nestjs/throttler";
import { Model } from "mongoose";
import { RealEstateAuthGuard } from "../auth/guard/RealEstate.guard";
import { Ad } from "../models/ad.schema";
import { CrawlerSession } from "../models/crawlerSession.schema";
import { FrenshDepartments, FrenshRegions } from "src/models/frensh-territory";


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
        @Query('lat') lat?: number,
        @Query('lon') lon?: number,
        @Query('radius') radius = 5000,
        @Query('isRecent') isRecent?: boolean,
        @Query('hasTerrace') hasTerrace?: boolean,
        @Query('hasCellar') hasCellar?: boolean,
        @Query('hasBalcony') hasBalcony?: boolean,
        @Query('hasGarden') hasGarden?: boolean,
        @Query('workToDo') workToDo?: boolean,
        @Query('hasAirConditioning') hasAirConditioning?: boolean,
        @Query('hasFirePlace') hasFirePlace?: boolean,
        @Query('hasElevator') hasElevator?: boolean,
        @Query('hasAlarm') hasAlarm?: boolean,
        @Query('hasDoorCode') hasDoorCode?: boolean,
        @Query('hasCaretaker') hasCaretaker?: boolean,
        @Query('hasIntercom') hasIntercom?: boolean,
        @Query('hasPool') hasPool?: boolean,
        @Query('hasSeparateToilet') hasSeparateToilet?: boolean,
        @Query('isDisabledPeopleFriendly') isDisabledPeopleFriendly?: boolean,
        @Query('hasUnobstructedView') hasUnobstructedView?: boolean,
        @Query('hasGarage') hasGarage?: boolean,
        @Query('exposition') exposition?: string,
        @Query('parkingPlacesQuantity') parkingPlacesQuantity?: number,
    ): Promise<Ad[]> {

        const skip = (page - 1) * 20;
        let filters: any = {};
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
        if (city) {
            filters = {
                ...filters,
                ...this.extractFiltersByCity(city)
            }
        } else if (lat && lon) {
            filters['location.coordinates'] = {
                $geoWithin: {
                    $centerSphere: [[lon, lat], radius / 6378.1]
                }
            };
        }
        if (typeof isRecent !== 'undefined') filters['options.isRecent'] = isRecent;
        if (typeof hasTerrace !== 'undefined') filters['options.hasTerrace'] = hasTerrace;
        if (typeof hasCellar !== 'undefined') filters['options.hasCellar'] = hasCellar;
        if (typeof hasBalcony !== 'undefined') filters['options.hasBalcony'] = hasBalcony;
        if (typeof hasGarden !== 'undefined') filters['options.hasGarden'] = hasGarden;
        if (typeof workToDo !== 'undefined') filters['options.workToDo'] = workToDo;
        if (typeof hasAirConditioning !== 'undefined') filters['options.hasAirConditioning'] = hasAirConditioning;
        if (typeof hasFirePlace !== 'undefined') filters['options.hasFirePlace'] = hasFirePlace;
        if (typeof hasElevator !== 'undefined') filters['options.hasElevator'] = hasElevator;
        if (typeof hasAlarm !== 'undefined') filters['options.hasAlarm'] = hasAlarm;
        if (typeof hasDoorCode !== 'undefined') filters['options.hasDoorCode'] = hasDoorCode;
        if (typeof hasCaretaker !== 'undefined') filters['options.hasCaretaker'] = hasCaretaker;
        if (typeof hasIntercom !== 'undefined') filters['options.hasIntercom'] = hasIntercom;
        if (typeof hasPool !== 'undefined') filters['options.hasPool'] = hasPool;
        if (typeof hasSeparateToilet !== 'undefined') filters['options.hasSeparateToilet'] = hasSeparateToilet;
        if (typeof isDisabledPeopleFriendly !== 'undefined') filters['options.isDisabledPeopleFriendly'] = isDisabledPeopleFriendly;
        if (typeof hasUnobstructedView !== 'undefined') filters['options.hasUnobstructedView'] = hasUnobstructedView;
        if (typeof hasGarage !== 'undefined') filters['options.hasGarage'] = hasGarage;
        if (exposition) filters['options.exposition'] = exposition;
        if (typeof parkingPlacesQuantity !== 'undefined') filters['options.parkingPlacesQuantity'] = parkingPlacesQuantity;

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

    private extractFiltersByCity(city: string): object {
        // Clean city name
        city = city.toLowerCase();
        city = city.replace(/[^a-zA-Z0-9]/g, '');
        // CHECK IF CITY IS A REGION OR A DEPARTMENT
        const isRegion = FrenshRegions.find(region => region.nom.toLowerCase() === city.toLowerCase());
        if (isRegion) {
            return { 'location.regionCode': isRegion.code };
        }
        const isDepartment = FrenshDepartments.find(department => department.nom.toLowerCase() === city.toLowerCase());
        if (isDepartment) {
            return { 'location.departmentCode': isDepartment.code };
        }
        return { 'location.city': city };
    }

}