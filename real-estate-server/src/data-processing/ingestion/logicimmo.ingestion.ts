import { HttpService } from "@nestjs/axios";
import { Process, Processor } from "@nestjs/bull";
import { Logger, Scope } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Job } from "bull";
import { Model } from "mongoose";
import { Ad, AdDocument } from "../../models/ad.schema";
import { logicImmoCategoryMapping } from "../models/Category.type";
import { EstateOptionDocument } from "src/models/estateOption.schema";
import { lastValueFrom } from "rxjs";

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
            creationDate: data.creationDate,
            lastCheckDate: data.lastCheckDate,
            title: data.title || '',
            type: data.type_use || '',
            category: logicImmoCategoryMapping[data.estate_type] || "Autre",
            publisher: {
                name: data.agencyName,
                storeUrl: data.agencyUrl,
                phoneNumber: data.agencyPhoneNumber
            },
            description: data.description || '',
            url: `https://www.logic-immo.com/detail-vente-${data.id}.htm`,
            pictureUrl: data.pictureUrl || '',
            pictureUrls: data.pictureUrls || [],
            location: {
                city: data.city || '',
                postalCode: data.zip_code,
                departmentCode: data.province,
                regionCode: data.city ? await this.extract_region_code(data.city) : 'NO REGION',
                coordinates: {
                    lat: parseFloat(data.geolocation.split(',')[0]),
                    lon: parseFloat(data.geolocation.split(',')[1]),
                },
            },
            price: data.price,
            rooms: parseInt(data.nb_rooms) || 0,
            bedrooms: parseInt(data.nb_bedrooms) || 0,
            surface: parseFloat(data.indoor_surface) || 0,
            landSurface: parseFloat(data.land_surface) || 0,
            floor: null,
            buildingFloors: null,
            energyGrade: data.energy_certificate || '',
            gasGrade: data.gas_certificate || '',
            options: this.extractOptions(data.options) as EstateOptionDocument,
            history: [],
            duplicates: [],
        };
    }
    private extractOptions(data: any): Partial<EstateOptionDocument> {
        let estateOption: Partial<EstateOptionDocument> = {};
        for (let option of data) {
            const trimmedItem = option.trim();
            if (trimmedItem.includes('Terrasse/Balcon') && trimmedItem.includes('Terrasse')) {
                estateOption.hasTerrace = true;
                continue;
            }
            if (trimmedItem.includes('Terrasse/Balcon') && trimmedItem.includes('Balcon')) {
                estateOption.hasBalcony = true;
                continue;
            }
            if (trimmedItem.includes('Cave')) {
                estateOption.hasCellar = true;
                continue;
            }
            if (trimmedItem.includes('Ascenseur')) {
                estateOption.hasElevator = true;
                continue;
            }
            if (trimmedItem.includes('Piscine')) {
                estateOption.hasPool = true;
                continue;
            }
            if (trimmedItem.includes('Garage')) {
                estateOption.hasGarage = true;
                continue;
            }
            if (trimmedItem.includes('Jardin/Terrain') && trimmedItem.includes('Jardin')) {
                estateOption.hasGarden = true;
                continue;
            }
            if (trimmedItem.includes('Air conditionné')) {
                estateOption.hasAirConditioning = true;
                continue;
            }
            if (trimmedItem.includes('Accès Handicapé')) {
                estateOption.isDisabledPeopleFriendly = true;
                continue;
            }
            if (trimmedItem.includes('Gardien')) {
                estateOption.hasCaretaker = true;
                continue;
            }
        }
        return estateOption;
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

    private async extract_region_code(commune_name: string): Promise<string> {
        const response = await lastValueFrom(this.httpService.get(`https://geo.api.gouv.fr/communes?nom=${commune_name}`));
        return response.data[0].codeRegion;
    }
}   