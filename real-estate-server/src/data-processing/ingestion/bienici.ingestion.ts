import { HttpService } from "@nestjs/axios";
import { Process, Processor } from "@nestjs/bull";
import { Logger, Scope } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Job } from "bull";
import { Model } from "mongoose";
import { Ad } from "src/models/ad.schema";



@Processor({ name: 'data-processing', scope: Scope.DEFAULT })
export class BienIciIngestion {
    private readonly logger = new Logger(BienIciIngestion.name);

    constructor(@InjectModel(Ad.name) private adModel: Model<Ad>, private configService: ConfigService, private readonly httpService: HttpService) { }

    @Process('bienici-ingestion')
    async ingest(job: Job) {
        try {
            for (let data of job.data.data_ingestion) {
                let cleaned_data = await this.clean_data(data);
                let processed_data = await this.process_data(cleaned_data);
                await this.save_data(processed_data, job);
            }
            this.logger.log(`Job ${job.id} has been processed successfully`);
            await job.moveToCompleted()
        } catch (error) {
            this.logger.error(error);
        }
    }

    private async clean_data(data: any) {
        return {
            origin: 'bienici',
            adId: data.id.toString(),
            reference: data.reference || '',
            creationDate: new Date(data.publicationDate),
            lastCheckDate: new Date(data.modificationDate),
            title: data.title,
            type: data.adType,
            category: data.propertyType,
            publisher: {
                name: data.userRelativeData.accountIds[0], // Assuming first accountId as the publisher name
                storeUrl: '', // No store URL provided in the data
                phoneNumber: data.phoneDisplays.length ? data.phoneDisplays[0] : '' // Assuming the first phone display if available
            },
            description: data.description,
            url: `https://www.bienici.com/annonce/${data.id}`,
            pictureUrl: data.photos.length ? data.photos[0].url : '',
            pictureUrls: data.photos.map((photo: any) => photo.url),
            location: {
                city: data.city,
                postalCode: data.postalCode,
                departmentCode: data.departmentCode,
                regionCode: '', // No regionCode provided in the data
                coordinates: {
                    lat: data.blurInfo.position.lat,
                    lon: data.blurInfo.position.lon,
                },
            },
            price: data.price,
            originalPrice: 0, // No original price provided in the data
            pricePerSquareMeter: data.pricePerSquareMeter || 0,
            rooms: data.roomsQuantity || 0,
            bedrooms: data.bedroomsQuantity || 0,
            surface: data.surfaceArea || 0,
            landSurface: 0, // No land surface provided in the data
            floor: data.floor || null,
            buildingFloors: data.floorQuantity || null,
            energyGrade: data.energyClassification || '',
            gasGrade: data.greenhouseGazClassification || '',
            options: [], // No options provided in the data
            history: [], // Assuming empty history
            duplicates: [], // Assuming empty duplicates
        };
    }

    private async process_data(data: any) {
        return data;
    }

    private async save_data(data: any, job: Job) {
        // STARTING BY SAVING FILES AND CHANGING URLS
        // data.pictureUrl = await this.save_files([data.pictureUrl], job)[0];
        // data.pictureUrls = await this.save_files(data.pictureUrls, job);
        const ad = new this.adModel(data);
        await ad.save();
        return ad;
    }
}