import { Process, Processor } from "@nestjs/bull";
import { Logger, Scope } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Job } from "bull";
import { Model } from "mongoose";
import { Ad, AdDocument } from "../../models/ad.schema";
import { ConfigService } from "@nestjs/config";
import * as fs from 'fs';
import { HttpService } from "@nestjs/axios";
import { first, lastValueFrom } from "rxjs";
import { boncoinCategoryMapping } from "../models/Category.type";
import { EstateOptionDocument } from "src/models/estateOption.schema";
import { calculateAdAccuracy } from "../utils/ad.utils";
import { FileProcessingService } from "../file-processing.service";

@Processor({ name: 'data-processing', scope: Scope.DEFAULT })
export class BoncoinIngestion {
    private readonly logger = new Logger(BoncoinIngestion.name);

    constructor(@InjectModel(Ad.name) private adModel: Model<Ad>, private readonly fileProcessingService: FileProcessingService, private readonly httpService: HttpService) { }

    @Process('boncoin-ingestion')
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
        const getValue = (attributes: any[], key: any) => {
            const attribute = attributes.find((attr: any) => attr.key === key);
            return attribute ? attribute.value : null;
        };

        const getValueLabel = (attributes: any[], key: string) => {
            const attribute = attributes.find(attr => attr.key === key);
            return attribute ? attribute.value_label : null;
        };


        return {
            origin: 'boncoin',
            adId: data.list_id.toString(),
            reference: getValue(data.attributes, 'custom_ref') || '',
            creationDate: new Date(data.first_publication_date),
            lastCheckDate: new Date(),
            title: data.subject,
            type: data.ad_type,
            category: boncoinCategoryMapping[getValueLabel(data.attributes, 'real_estate_type')] || 'Autre',
            publisher: {
                name: data.owner.name,
                storeUrl: data.owner.store_id ? `https://www.leboncoin.fr/boutique/${data.owner.store_id}` : '',
            },
            description: data.body || '',
            url: data.url,
            pictureUrl: await this.fileProcessingService.uploadFilesIntoBucket(data.images.thumb_url, 'l') as string,
            pictureUrls: await this.fileProcessingService.uploadFilesIntoBucket(data.images.urls, 'l') as string[],
            location: {
                city: data.location.city,
                postalCode: data.location.zipcode,
                ...await this.extract_location_code(data.location.city, data.location.zipcode),
                coordinates: {
                    lat: data.location.lat,
                    lon: data.location.lng,
                },
            },
            price: data.price[0],
            rooms: parseInt(getValue(data.attributes, 'rooms')) || 0,
            bedrooms: parseInt(getValue(data.attributes, 'bedrooms')) || 0,
            surface: parseInt(getValue(data.attributes, 'square')) || 0,
            landSurface: parseInt(getValue(data.attributes, 'land_plot_surface')) || 0,
            floor: parseInt(getValue(data.attributes, 'floor_number')) || null,
            buildingFloors: parseInt(getValue(data.attributes, 'nb_floors_building')) || null,
            energyGrade: getValueLabel(data.attributes, 'energy_rate') || '',
            gasGrade: getValueLabel(data.attributes, 'ges') || '',
            options: {} as EstateOptionDocument,
            history: [],
            duplicates: [],
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

    private async extract_location_code(city_name: string, postal_code: string): Promise<{ departmentCode: string, regionCode: string }> {
        if (!postal_code || !city_name) return { departmentCode: 'NO DEPARTMENT', regionCode: 'NO REGION' };
        const response = await lastValueFrom(this.httpService.get(`https://geo.api.gouv.fr/communes?nom=${city_name}&codePostal=${postal_code}`));
        return {
            departmentCode: response.data[0] ? response.data[0].codeDepartement : 'NO DEPARTMENT',
            regionCode: response.data[0] ? response.data[0].codeRegion : 'NO REGION'
        }
    }
}