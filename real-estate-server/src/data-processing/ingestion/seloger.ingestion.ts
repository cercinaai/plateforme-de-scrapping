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


@Processor({ name: 'data-processing', scope: Scope.DEFAULT })
export class SelogerIngestion {

    private readonly logger = new Logger(SelogerIngestion.name);

    constructor(@InjectModel(Ad.name) private adModel: Model<Ad>, private configService: ConfigService, private readonly httpService: HttpService) { }

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


        const missingFields: string[] = [];

        const cleanedData: Partial<AdDocument> = {
            origin: "seloger",
            adId: data.id ? data.id.toString() : missingFields.push("adId"),
            reference: data.publicationId ? data.publicationId.toString() : '',
            creationDate: new Date(), // assuming the current date since it's not provided
            lastCheckDate: new Date(), // assuming the current date since it's not provided
            title: data.title || '',
            type: data.transactionTypeId === 8 ? 'sale' : 'rent', // Assuming the mapping logic
            category: selogerCategoryMapping[data.estateTypeId] || 'Autre',
            publisher: {
                name: data.contact?.contactName || '',
                storeUrl: data.contact?.agencyLink || `https://www.seloger.com${data.contact?.agencyPage}`,
                phoneNumber: data.contact?.phoneNumber || ''
            },
            description: data.description || '',
            url: `https://www.seloger.com${data.classifiedURL}`,
            pictureUrl: data.photos.length ? `https://photos.seloger.com/photos/${data.photos[0]}` : '',
            pictureUrls: data.photos.map((photo: string) => `https://photos.seloger.com/photos/${photo}`),
            location: {
                city: data.cityLabel,
                postalCode: data.zipCode,
                ...await this.extract_location_code(data.cityLabel, data.zipCode),
                coordinates: {
                    lat: 46.2276,
                    lon: 2.2137
                }
            },
            price: data.pricing.rawPrice ? parseFloat(data.pricing.rawPrice) : missingFields.push("price"),
            rooms: data.rooms || 0,
            bedrooms: data.bedroomCount || 0,
            surface: data.surface || null,
            landSurface: null,
            floor: this.extractFloorFromTags(data.tags) || null,
            buildingFloors: null,
            energyGrade: data.epc || '',
            gasGrade: null,
            options: {} as EstateOptionDocument,
            history: [],
            duplicates: [],
        };
        return cleanedData;
    }

    private extractFloorFromTags(tags: string[]): number | null {
        const floorTag = tags.find(tag => tag.includes('Étage'));
        return floorTag ? parseInt(floorTag.split(' ')[1].split('/')[0]) : null;
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

    private async extract_location_code(city_name: string, postal_code: string): Promise<{ departmentCode: string, regionCode: string }> {
        if (!postal_code || !city_name) return { departmentCode: 'NO DEPARTMENT', regionCode: 'NO REGION' };
        const response = await lastValueFrom(this.httpService.get(`https://geo.api.gouv.fr/communes?nom=${city_name}&codePostal=${postal_code}`));
        return {
            departmentCode: response.data[0].codeDepartement || 'NO DEPARTMENT',
            regionCode: response.data[0].codeRegion || 'NO REGION'
        }
    }


}