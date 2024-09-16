import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Ad } from "src/models/ad.schema";
import { FrenshDepartments, FrenshRegions } from "src/models/frensh-territory";
import { FilterAdsDto } from "./utils/adsFilterDTO";


@Injectable()
export class DataProviderService {

    constructor(@InjectModel(Ad.name) private adModel: Model<Ad>) { }


    async filterAdsList(query: FilterAdsDto, withPagination = true): Promise<Ad[] | { ads: Ad[], total: number }> {
        let filters: any = {};
        let sort: any = {};
        if (withPagination) {
            query.page = query.page || 1;
            query.limit = query.limit || 20;
        }
        if (query.origin && query.origin.length > 0) filters.origin = { $in: query.origin };
        if (query.category && query.category.length > 0) filters.category = { $in: query.category };
        if (query.minPrice || query.maxPrice) filters.price = {};
        if (query.minPrice) filters.price.$gte = query.minPrice;
        if (query.maxPrice) filters.price.$lte = query.maxPrice;
        if (query.minSurface || query.maxSurface) filters.surface = {};
        if (query.minSurface) filters.surface.$gte = query.minSurface;
        if (query.maxSurface) filters.surface.$lte = query.maxSurface;
        if (query.minRooms || query.maxRooms) filters.rooms = {};
        if (query.minRooms) filters.rooms.$gte = query.minRooms;
        if (query.maxRooms) filters.rooms.$lte = query.maxRooms;
        if (query.startDate || query.endDate) filters.creationDate = {};
        if (query.startDate) filters.creationDate.$gte = new Date(query.startDate);
        if (query.endDate) filters.creationDate.$lte = new Date(query.endDate);
        if (query.city) {
            filters = {
                ...filters,
                ...this.extractFiltersByCity(query.city)
            }
        } else if (query.lat && query.lon) {
            filters['location.coordinates'] = {
                $geoWithin: {
                    $centerSphere: [[query.lon, query.lat], (query.radius || 5000) / 6378.1]
                }
            };
        }
        if (query.sortBy === 'DATE') {
            query.sortOrder = query.sortOrder || 'DESC';
            if (query.sortOrder === 'ASC') sort.creationDate = 1;
            if (query.sortOrder === 'DESC') sort.creationDate = -1;
        } else if (query.sortBy === 'PRICE') {
            query.sortOrder = query.sortOrder || 'ASC';
            if (query.sortOrder === 'ASC') sort.price = 1;
            if (query.sortOrder === 'DESC') sort.price = -1;
        } else if (query.sortBy === 'SURFACE') {
            query.sortOrder = query.sortOrder || 'ASC';
            if (query.sortOrder === 'ASC') sort.surface = 1;
            if (query.sortOrder === 'DESC') sort.surface = -1;
        }
        if (typeof query.isRecent !== 'undefined') filters['options.isRecent'] = query.isRecent;
        if (typeof query.hasTerrace !== 'undefined') filters['options.hasTerrace'] = query.hasTerrace;
        if (typeof query.hasCellar !== 'undefined') filters['options.hasCellar'] = query.hasCellar;
        if (typeof query.hasBalcony !== 'undefined') filters['options.hasBalcony'] = query.hasBalcony;
        if (typeof query.hasGarden !== 'undefined') filters['options.hasGarden'] = query.hasGarden;
        if (typeof query.workToDo !== 'undefined') filters['options.workToDo'] = query.workToDo;
        if (typeof query.hasAirConditioning !== 'undefined') filters['options.hasAirConditioning'] = query.hasAirConditioning;
        if (typeof query.hasFirePlace !== 'undefined') filters['options.hasFirePlace'] = query.hasFirePlace;
        if (typeof query.hasElevator !== 'undefined') filters['options.hasElevator'] = query.hasElevator;
        if (typeof query.hasAlarm !== 'undefined') filters['options.hasAlarm'] = query.hasAlarm;
        if (typeof query.hasDoorCode !== 'undefined') filters['options.hasDoorCode'] = query.hasDoorCode;
        if (typeof query.hasCaretaker !== 'undefined') filters['options.hasCaretaker'] = query.hasCaretaker;
        if (typeof query.hasIntercom !== 'undefined') filters['options.hasIntercom'] = query.hasIntercom;
        if (typeof query.hasPool !== 'undefined') filters['options.hasPool'] = query.hasPool;
        if (typeof query.hasSeparateToilet !== 'undefined') filters['options.hasSeparateToilet'] = query.hasSeparateToilet;
        if (typeof query.isDisabledPeopleFriendly !== 'undefined') filters['options.isDisabledPeopleFriendly'] = query.isDisabledPeopleFriendly;
        if (typeof query.hasUnobstructedView !== 'undefined') filters['options.hasUnobstructedView'] = query.hasUnobstructedView;
        if (typeof query.hasGarage !== 'undefined') filters['options.hasGarage'] = query.hasGarage;
        if (query.exposition) filters['options.exposition'] = query.exposition;
        if (typeof query.parkingPlacesQuantity !== 'undefined') filters['options.parkingPlacesQuantity'] = query.parkingPlacesQuantity;

        // FIRE THE QUERY
        const ads = await this.adModel.find(filters).sort(sort).skip(withPagination ? (query.page - 1) * query.limit : 0).limit(withPagination ? query.limit : 0);
        if (query.showTotal) {
            const total = await this.adModel.countDocuments(filters);
            return { ads, total };
        }
        return ads;
    }




    private extractFiltersByCity(city: string): object {
        // Clean city name
        city = city.toLowerCase();
        // CHECK IF CITY IS A REGION OR A DEPARTMENT
        const isRegion = FrenshRegions.find(region => region.nom.toLowerCase() === city);
        if (isRegion) {
            return { 'location.regionCode': isRegion.code };
        }
        const isDepartment = FrenshDepartments.find(department => department.nom.toLowerCase() === city);
        if (isDepartment) {
            return { 'location.departmentCode': isDepartment.code };
        }
        return { 'location.city': city };
    }
}