import { HttpService } from "@nestjs/axios";
import { Process, Processor } from "@nestjs/bull";
import { Logger, Scope } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Job } from "bull";
import { Model } from "mongoose";
import { Ad, AdDocument } from "src/models/ad.schema";



@Processor({ name: 'data-processing', scope: Scope.DEFAULT })
export class BienIciIngestion {
    private readonly logger = new Logger(BienIciIngestion.name);

    constructor(@InjectModel(Ad.name) private adModel: Model<Ad>, private configService: ConfigService, private readonly httpService: HttpService) { }

    @Process('bienici-ingestion')
    async ingest(job: Job) {
        try {
            for (let data of job.data.data_ingestion) {
                let cleaned_data = await this.clean_data(data);
                await this.process_data(cleaned_data, job);
            }
            this.logger.log(`Job ${job.id} has been processed successfully`);
            await job.moveToCompleted()
        } catch (error) {
            this.logger.error(error);
        }
    }

    private async clean_data(data: any): Promise<Partial<AdDocument>> {
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
            originalPrice: 0,
            pricePerSquareMeter: data.pricePerSquareMeter || 0,
            rooms: data.roomsQuantity || 0,
            bedrooms: data.bedroomsQuantity || 0,
            surface: data.surfaceArea || 0,
            landSurface: 0,
            floor: data.floor || null,
            buildingFloors: data.floorQuantity || null,
            energyGrade: data.energyClassification || '',
            gasGrade: data.greenhouseGazClassification || '',
            options: [],
            history: [],
            duplicates: [],
        };
    }

    private async process_data(data: Partial<AdDocument>, job: Job) {
        const duplicates = await this.findDuplicatesByLocation(data.location.coordinates.lat, data.location.coordinates.lon);
        if (duplicates.length === 0) {
            // No duplicates found, insert new ad
            const newAdDoc = new this.adModel(data);
            await newAdDoc.save();
        }
        let sameOriginAd = duplicates.find(ad => ad.origin === data.origin);
        if (sameOriginAd) {
            // Update existing ad with the same origin
            await this.adModel.findByIdAndUpdate(sameOriginAd._id, {
                ...data,
                lastCheckDate: new Date()
            });
            return;
        } else {
            // Handle duplicates with different origins
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
            return;
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