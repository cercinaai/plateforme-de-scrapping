import { HttpService } from "@nestjs/axios";
import { Process, Processor } from "@nestjs/bull";
import { Logger, Scope } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Job } from "bull";
import { Model } from "mongoose";
import { Ad, AdDocument } from "../../models/ad.schema";
import { selogerCategoryMapping } from "../models/Category.type";
import { EstateOptionDocument } from "src/models/estateOption.schema";
import { lastValueFrom } from "rxjs";
import { calculateAdAccuracy } from "../utils/ad.utils";
import { FileProcessingService } from "../file-processing.service";


@Processor({ name: 'data-processing', scope: Scope.DEFAULT })
export class SelogerIngestion {

    private readonly logger = new Logger(SelogerIngestion.name);

    constructor(@InjectModel(Ad.name) private adModel: Model<Ad>, private readonly fileProcessingService: FileProcessingService, private readonly httpService: HttpService) { }

    @Process('seloger-ingestion')
    async ingest(job: Job) {
        try {
            for (let data of job.data.data_ingestion) {
                let cleaned_data = await this.clean_data(data);
                let accuracy_data = calculateAdAccuracy(cleaned_data);
                await this.process_data(accuracy_data);
            }
            this.logger.log(`Job ${job.id} has been processed successfully`);
            await job.moveToCompleted(`job-${job.id}-boncoin-ingestion-completed`)
        } catch (error) {
            this.logger.error(error);
            await job.moveToFailed(error, false);
        }
    }

    private async clean_data(data: any): Promise<Partial<AdDocument>> {
        const cleanedData: Partial<AdDocument> = {
            origin: "seloger",
            adId: data.id.toString() || 'N/A',
            reference: data.publicationId.toString() || 'N/A',
            creationDate: new Date(),
            lastCheckDate: new Date(),
            title: data.title || 'N/A',
            type: 'sale',
            category: selogerCategoryMapping[data.estateTypeId] || 'Autre',
            publisher: {
                name: data.contact?.contactName || '',
                storeUrl: data.contact?.agencyLink || `https://www.seloger.com${data.contact?.agencyPage}`,
                phoneNumber: data.contact?.phoneNumber || ''
            },
            description: data.description || 'N/A',
            url: `https://www.seloger.com${data.classifiedURL}`,
            pictureUrl: await this.fileProcessingService.uploadFilesIntoBucket(this.extractImageUrl(data.photos[0]), 's') as string,
            pictureUrls: await this.fileProcessingService.uploadFilesIntoBucket(data.photos.map((photo: string) => this.extractImageUrl(photo)), 's') as string[],
            location: {
                city: data.cityLabel,
                postalCode: data.zipCode,
                ...await this.extract_location_code(data.cityLabel, data.zipCode),
            },
            price: parseFloat(data.pricing.rawPrice) || 0,
            rooms: data.rooms || 0,
            bedrooms: data.bedroomCount || 0,
            surface: data.surface || null,
            landSurface: this.extractLandSurfaceFromTags(data.tags) || null,
            floor: this.extractFloorFromTags(data.tags) || null,
            buildingFloors: null,
            energyGrade: data.epc || '',
            gasGrade: null,
            options: this.extractOptions(data) as EstateOptionDocument,
            history: [],
            duplicates: [],
        };
        return cleanedData;
    }

    private extractFloorFromTags(tags: string[]): number | null {
        const floorTag = tags.find(tag => tag.includes('Étage'));
        return floorTag ? parseInt(floorTag.split(' ')[1].split('/')[0]) : null;
    }

    private extractLandSurfaceFromTags(tags: string[]): number | null {
        const landSurfaceTag = tags.find(tag => tag.includes('Terrain'));
        return landSurfaceTag ? parseInt(landSurfaceTag.split(' ')[1]) : null;
    }
    private extractOptions(data: any): Partial<EstateOptionDocument> {
        let estateOption: Partial<EstateOptionDocument> = {};
        const tags = data.tags || [];
        if (tags.includes('Terrasse')) {
            estateOption.hasTerrace = true;
        }
        if (tags.includes('Balcon')) {
            estateOption.hasBalcony = true;
        }
        if (tags.includes('Jardin')) {
            estateOption.hasGarden = true;
        }
        if (tags.includes('Cave')) {
            estateOption.hasCellar = true;
        }
        if (tags.includes('Garage')) {
            estateOption.hasGarage = true;
        }
        if (tags.includes('Ascenseur')) {
            estateOption.hasElevator = true;
        }
        if (tags.includes('Piscine')) {
            estateOption.hasPool = true;
        }
        if (tags.includes('Box') || tags.includes('Parking')) {
            estateOption.parkingPlacesQuantity = 1;
        }

        estateOption.isRecent = data.isNew || null;
        estateOption.exposition = null; // Not mentioned in the data provided
        return estateOption;
    }

    private extractImageUrl(url: string): string {
        if (!url) return null;
        if (url.includes('https://v.seloger.com')) {
            return url;
        }
        return `https://v.seloger.com/s/width/800/visuels${url}`
    }

    private async process_data(data: any) {
        const existingAd = await this.adModel.findOne({ origin: data.origin, adId: data.adId });
        if (existingAd) {
            // Update existing ad with the same origin
            await this.adModel.findByIdAndUpdate(existingAd._id, {
                ...data,
                lastCheckDate: new Date()
            });
        } else {
            const newAdDoc = new this.adModel(data);
            await newAdDoc.save();
        }
    }

    private async extract_location_code(city_name: string, postal_code: string): Promise<{
        departmentCode: string, regionCode: string, coordinates: {
            lat: number,
            lon: number
        }
    }> {
        if (!postal_code || !city_name) return { departmentCode: 'NO DEPARTMENT', regionCode: 'NO REGION', coordinates: { lat: 0, lon: 0 } };
        const response = await lastValueFrom(this.httpService.get(`https://geo.api.gouv.fr/communes?nom=${city_name}&codePostal=${postal_code}&fields=centre,codeDepartement,codeRegion`));
        return {
            departmentCode: response.data[0] ? response.data[0].codeDepartement : 'NO DEPARTMENT',
            regionCode: response.data[0] ? response.data[0].codeRegion : 'NO REGION',
            coordinates: {
                lon: response.data[0] ? response.data[0].centre.coordinates[0] : 0,
                lat: response.data[0] ? response.data[0].centre.coordinates[1] : 0
            }
        }
    }


}