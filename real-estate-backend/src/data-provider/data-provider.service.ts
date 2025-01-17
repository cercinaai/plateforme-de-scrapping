import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { realEstateAd } from "src/models/ad.schema";
import { FrenshDepartments, FrenshRegions } from "src/models/frensh-territory";
import { FilterAdsDto } from "./utils/adsFilterDTO";


@Injectable()
export class DataProviderService {

    constructor(@InjectModel(realEstateAd.name) private adModel: Model<realEstateAd>) { }


    async filterAdsList(query: FilterAdsDto): Promise<realEstateAd[] | { ads: realEstateAd[], total: number }> {
        let filters: any = {};
        let sort: any = {};
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
        } else if (query.sortBy === 'ACCURACY') {
            query.sortOrder = query.sortOrder || 'ASC';
            if (query.sortOrder === 'ASC') sort.adAccuracy = 1;
            if (query.sortOrder === 'DESC') sort.adAccuracy = -1;
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
        let ads: realEstateAd[];
        // FIRE THE QUERY
        if (query.page && query.limit) {
            ads = await this.adModel.find(filters).sort(sort).skip((query.page - 1) * query.limit).limit(query.limit);
        } else {
            ads = await this.adModel.find(filters).sort(sort);
        }
        if (query.showTotal) {
            const total = await this.adModel.countDocuments(filters);
            return { ads, total };
        }
        return ads;
    }




    private extractFiltersByCity(all_citys: string[]): object {
        if (typeof all_citys === 'string') all_citys = [all_citys];
        const region_to_find = FrenshRegions.filter(region => all_citys.find(city => city.toLowerCase() === region.nom.toLowerCase())).map(region => region.code);
        const department_to_find = FrenshDepartments.filter(department => all_citys.find(city => city.toLowerCase() === department.nom.toLowerCase())).map(department => department.code);
        const city_to_find = all_citys.filter(city => !FrenshRegions.find(region => region.nom.toLowerCase() === city.toLowerCase()) && !FrenshDepartments.find(department => department.nom.toLowerCase() === city.toLowerCase()));
        const orConditions = [];
        if (region_to_find.length > 0) {
            orConditions.push({ 'location.regionCode': { $in: region_to_find } });
        }

        if (department_to_find.length > 0) {
            orConditions.push({ 'location.departmentCode': { $in: department_to_find } });
        }

        if (city_to_find.length > 0) {
            orConditions.push({ 'location.city': { $in: city_to_find } });
        }

        return { $or: orConditions }
    }
}