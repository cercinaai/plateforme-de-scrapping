import { HttpService } from "@nestjs/axios";
import { Process, Processor } from "@nestjs/bull";
import { Logger, Scope } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Job } from "bull";
import { Model } from "mongoose";
import { Ad, AdDocument } from "../../models/ad.schema";
import { BienIciCategoryMapping } from "../models/Category.type";
import { EstateOptionDocument } from "src/models/estateOption.schema";



@Processor({ name: 'data-processing', scope: Scope.DEFAULT })
export class BienIciIngestion {
    private readonly logger = new Logger(BienIciIngestion.name);

    constructor(@InjectModel(Ad.name) private adModel: Model<Ad>, private configService: ConfigService, private readonly httpService: HttpService) { }

    @Process('bienici-ingestion')
    async ingest(job: Job) {
        try {
            for (let data of job.data.data_ingestion) {
                let cleaned_data = await this.clean_data(data);
                await this.process_data(cleaned_data);
            }
            this.logger.log(`Job ${job.id} has been processed successfully`);
            await job.moveToCompleted(`job-${job.id}-bienici-ingestion-completed`, false);
        } catch (error) {
            await job.moveToFailed(error, false);
            this.logger.error(error);
        }
    }

    private async clean_data(data: any): Promise<Partial<AdDocument>> {
        const getFirstValidNumber = (value: any): number => {
            if (Array.isArray(value)) {
                return value.find(v => typeof v === 'number' && !isNaN(v)) || 0;
            }
            return typeof value === 'number' && !isNaN(value) ? value : 0;
        };

        return {
            origin: 'bienici',
            adId: data.id.toString(),
            reference: data.reference || '',
            creationDate: new Date(data.publicationDate),
            lastCheckDate: new Date(data.modificationDate),
            title: data.title,
            type: data.adType,
            category: BienIciCategoryMapping[data.propertyType] || 'Autre',
            publisher: {
                name: data.contactRelativeData.contactNameToDisplay,
                storeUrl: data.agencyFeeUrl,
                phoneNumber: data.contactRelativeData.phoneToDisplay // Assuming the first phone display if available
            },
            description: data.description,
            url: data.url,
            pictureUrl: data.photos.length ? data.photos[0].url : '',
            pictureUrls: data.photos.map((photo: any) => photo.url),
            location: {
                city: data.city || 'NO CITY',
                postalCode: data.postalCode,
                departmentCode: data.departmentCode,
                regionCode: '',
                coordinates: {
                    lat: data.blurInfo?.position?.lat || 0,
                    lon: data.blurInfo?.position?.lon || 0,
                },
            },
            price: getFirstValidNumber(data.price),
            rooms: getFirstValidNumber(data.roomsQuantity) || 0,
            bedrooms: data.bedroomsQuantity || 0,
            surface: getFirstValidNumber(data.surfaceArea) || 0,
            landSurface: data.landSurfaceArea || 0,
            floor: data.floor || null,
            buildingFloors: data.floorQuantity || null,
            energyGrade: data.energyClassification || '',
            gasGrade: data.greenhouseGazClassification || '',
            options: this.extractOptions(data) as EstateOptionDocument,
            history: [],
            duplicates: [],
        };
    }

    private extractOptions(data: any): Partial<EstateOptionDocument> {
        return {
            hasTerrace: data.hasTerrace || false,
            hasCellar: data.hasCellar || false,
            hasBalcony: data.hasBalcony || false,
            hasGarden: data.hasGarden || false,
            workToDo: data.workToDo || false,
            hasAirConditioning: data.hasAirConditioning || false,
            hasFirePlace: data.hasFirePlace || false,
            hasElevator: data.hasElevator || false,
            hasAlarm: data.hasAlarm || false,
            hasDoorCode: data.hasDoorCode || false,
            hasCaretaker: data.hasCaretaker || false,
            hasIntercom: data.hasIntercom || false,
            hasPool: data.hasPool || false,
            hasSeparateToilet: data.hasSeparateToilet || false,
            isDisabledPeopleFriendly: data.isDisabledPeopleFriendly || false,
            hasUnobstructedView: data.hasUnobstructedView || false,
            exposition: data.exposition || null,
            parkingPlacesQuantity: data.parkingPlacesQuantity || null
        }
    }

    private async process_data(data: Partial<AdDocument>) {
        const existingAd = await this.adModel.findOne({ origin: data.origin, adId: data.adId });
        if (existingAd) {
            // Update existing ad with the same origin
            await this.adModel.findByIdAndUpdate(existingAd._id, {
                ...data,
                lastCheckDate: new Date()
            });
        } else {
            // Handle duplicates with different origins by location
            const duplicates = await this.findDuplicatesByLocation(data.location.coordinates.lat, data.location.coordinates.lon);
            const newAdDoc = new this.adModel(data);
            await newAdDoc.save();
            for (const duplicate of duplicates) {
                await this.adModel.findByIdAndUpdate(duplicate._id, {
                    $addToSet: { duplicates: newAdDoc._id }
                });
                await this.adModel.findByIdAndUpdate(newAdDoc._id, {
                    $addToSet: { duplicates: duplicate._id }
                });
            }
        }
    }

    private async findDuplicatesByLocation(lat: number, lon: number, radius: number = 0.01): Promise<AdDocument[]> {
        return this.adModel.find({
            'location.coordinates': {
                $geoWithin: {
                    $centerSphere: [[lon, lat], radius / 6378.1]
                }
            }
        }).exec();
    }

}