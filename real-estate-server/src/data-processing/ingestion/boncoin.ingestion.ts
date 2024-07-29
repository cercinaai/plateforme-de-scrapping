import { Process, Processor } from "@nestjs/bull";
import { Logger, Scope } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Job } from "bull";
import { Model } from "mongoose";
import { Ad, AdDocument } from "src/models/ad.schema";
import { ConfigService } from "@nestjs/config";
import * as fs from 'fs';
import { HttpService } from "@nestjs/axios";
import { first } from "rxjs";

@Processor({ name: 'data-processing', scope: Scope.DEFAULT })
export class BoncoinIngestion {
    private readonly logger = new Logger(BoncoinIngestion.name);

    constructor(@InjectModel(Ad.name) private adModel: Model<Ad>, private configService: ConfigService, private readonly httpService: HttpService) { }

    @Process('boncoin-ingestion')
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
        const getValue = (attributes: any[], key: any) => {
            const attribute = attributes.find((attr: any) => attr.key === key);
            return attribute ? attribute.value : null;
        };

        const getValueLabel = (attributes: any[], key: string) => {
            const attribute = attributes.find(attr => attr.key === key);
            return attribute ? attribute.value_label : null;
        };

        return {
            origin: data.brand,
            adId: data.list_id.toString(),
            reference: getValue(data.attributes, 'custom_ref') || '',
            creationDate: new Date(data.first_publication_date),
            lastCheckDate: new Date(data.index_date),
            title: data.subject,
            type: data.ad_type,
            category: data.category_name,
            publisher: {
                name: data.owner.name,
                storeUrl: data.owner.store_id ? `https://www.leboncoin.fr/boutique/${data.owner.store_id}` : '',
            },
            description: data.body || '',
            url: data.url,
            pictureUrl: data.images.thumb_url,
            pictureUrls: data.images.urls,
            location: {
                city: data.location.city,
                postalCode: data.location.zipcode,
                departmentCode: data.location.department_id,
                regionCode: data.location.region_id,
                coordinates: {
                    lat: data.location.lat,
                    lon: data.location.lng,
                },
            },
            price: data.price[0],
            originalPrice: getValue(data.attributes, 'old_price') || 0,
            pricePerSquareMeter: getValue(data.attributes, 'price_per_square_meter') || 0,
            rooms: parseInt(getValue(data.attributes, 'rooms')) || 0,
            bedrooms: parseInt(getValue(data.attributes, 'bedrooms')) || 0,
            surface: parseInt(getValue(data.attributes, 'square')) || 0,
            landSurface: parseInt(getValue(data.attributes, 'land_plot_surface')) || 0,
            floor: parseInt(getValue(data.attributes, 'floor_number')) || null,
            buildingFloors: parseInt(getValue(data.attributes, 'nb_floors_building')) || null,
            energyGrade: getValueLabel(data.attributes, 'energy_rate') || '',
            gasGrade: getValueLabel(data.attributes, 'ges') || '',
            options: data.attributes.filter((attr: any) => attr.generic && attr.value_label).map((attr: any) => attr.value_label),
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

    private async save_files(files: string[], job: Job) {
        let transformed_files = [];
        for (let file of files) {
            const fileName = file.split('/').pop();
            transformed_files.push(fileName);
            const rootPath = this.configService.get<string>('ROOT_PATH');
            const uploadDir = this.configService.get<string>('UPLOAD_DIR');
            this.httpService.get(file, { responseType: 'arraybuffer' }).pipe(first()).subscribe({
                next: async (res) => {
                    const fileBuffer = Buffer.from(res.data, 'binary');
                    await fs.promises.writeFile(`${rootPath}/${uploadDir}/${fileName}`, fileBuffer);
                },
                error: async (err) => {
                    await job.moveToFailed(err);
                    job.update({
                        failedReason: err.message,
                        status: 'failed',
                        job_id: job.id.toLocaleString(),
                        error_date: new Date(),
                        crawler_origin: 'boncoin',
                        request_url: file,
                    })
                },
            });
        }
        return transformed_files;
    }
}