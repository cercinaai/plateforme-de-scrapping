import { HttpService } from "@nestjs/axios";
import { Process, Processor } from "@nestjs/bull";
import { Logger, Scope } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Job } from "bull";
import { Model } from "mongoose";
import { Ad, AdDocument } from "../../models/ad.schema";
import { logicImmoCategoryMapping } from "../models/Category.type";

@Processor({ name: 'data-processing', scope: Scope.DEFAULT })
export class LogicImmoIngestion {
    private readonly logger = new Logger(LogicImmoIngestion.name);


    constructor(@InjectModel(Ad.name) private adModel: Model<Ad>, private configService: ConfigService, private readonly httpService: HttpService) { }

    @Process('logicimmo-ingestion')
    async ingest(job: Job) {
        try {
            for (let data of job.data.data_ingestion) {
                let cleaned_data = await this.clean_data(data);
                await this.process_data(cleaned_data);
            }
            this.logger.log(`Job ${job.id} has been processed successfully`);
            await job.moveToCompleted(`job-${job.id}-logicimmo-ingestion-completed`, false);
        } catch (error) {
            this.logger.error(error);
            job.moveToFailed(error, false);
        }
    }

    private async clean_data(data: any): Promise<Partial<AdDocument>> {
        return {
            origin: 'logic-immo',
            adId: data.id.toString(),
            reference: data.client_id || '',
            creationDate: new Date(),
            lastCheckDate: new Date(),
            title: data.title || data.name || '',
            type: data.type_use || '',
            category: logicImmoCategoryMapping[data.estate_type] || "Autre",
            publisher: {
                name: data.agencyName,
                storeUrl: data.agencyUrl,
                phoneNumber: ''
            },
            description: data.description || '',
            url: `https://www.logic-immo.com/detail-vente-${data.id}.htm`,
            pictureUrl: data.pictureUrl || '',
            pictureUrls: [],
            location: {
                city: data.city || '',
                postalCode: data.zip_code,
                departmentCode: data.province,
                regionCode: '',
                coordinates: {
                    lat: parseFloat(data.geolocation.split(',')[0]),
                    lon: parseFloat(data.geolocation.split(',')[1]),
                },
            },
            price: data.price,
            pricePerSquareMeter: 0,
            rooms: parseInt(data.nb_rooms) || 0,
            bedrooms: parseInt(data.nb_bedrooms) || 0,
            surface: parseFloat(data.indoor_surface) || 0,
            landSurface: parseFloat(data.land_surface) || 0,
            floor: null,
            buildingFloors: null,
            energyGrade: data.energy_certificate || '',
            gasGrade: '',
            options: [],
            history: [],
            duplicates: [],
            phoneNumber: '',
        };
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