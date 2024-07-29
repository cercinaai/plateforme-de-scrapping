import { HttpService } from "@nestjs/axios";
import { Process, Processor } from "@nestjs/bull";
import { Logger, Scope } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Job } from "bull";
import { Model } from "mongoose";
import { Ad } from "src/models/ad.schema";
import * as fs from 'fs';
import { first } from "rxjs";


@Processor({ name: 'data-processing', scope: Scope.DEFAULT })
export class SelogerIngestion {

    private readonly logger = new Logger(SelogerIngestion.name);

    constructor(@InjectModel(Ad.name) private adModel: Model<Ad>, private configService: ConfigService, private readonly httpService: HttpService) { }

    @Process('seloger-ingestion')
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
        const getLandSurface = (tags: string[]) => {
            const landTag = tags.find(tag => tag.includes('Terrain'));
            return landTag ? parseInt(landTag.split(' ')[1].replace('m²', '')) : 0;
        };
        const getFloor = (tags: string[]) => {
            const floorTag = tags.find(tag => tag.includes('Étage'));
            return floorTag ? parseInt(floorTag.split(' ')[1].split('/')[0]) : null;
        }

        return {
            origin: 'seloger',
            adId: data.id.toString(),
            reference: data.publicationId.toString(),
            creationDate: new Date(),
            lastCheckDate: new Date(),
            title: data.title,
            type: data.transactionTypeId === 2 ? 'sale' : 'rent',
            category: data.estateType,
            publisher: {
                name: data.contact.contactName,
                storeUrl: data.contact.agencyLink || `https://www.seloger.com${data.contact.agencyPage}`,
                phoneNumber: data.contact.phoneNumber || null
            },
            description: data.description,
            url: data.classifiedURL,
            pictureUrl: `https://photos.seloger.com/photos/${data.photos[0]}`,
            pictureUrls: data.photos.map((photo: string) => `https://photos.seloger.com/photos/${photo}`),
            location: {
                city: data.cityLabel,
                postalCode: data.zipCode,
            },
            price: parseFloat(data.pricing.rawPrice),
            pricePerSquareMeter: parseFloat(data.pricing.squareMeterPrice.replace(' €', '').replace(' ', '')),
            rooms: data.rooms,
            bedrooms: data.bedroomCount,
            surface: data.surface,
            landSurface: getLandSurface(data.tags),
            floor: getFloor(data.tags),
            energyGrade: data.epc,
            options: data.tags,
            history: [],
            duplicates: [],
        };
    }

    private async process_data(data: any) {
        return data;
    }

    private async save_data(data: any, job: Job) {
        const ad = new this.adModel(data);
        await ad.save();
        return ad;
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