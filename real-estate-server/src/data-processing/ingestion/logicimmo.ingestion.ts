import { HttpService } from "@nestjs/axios";
import { Process, Processor } from "@nestjs/bull";
import { Logger, Scope } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Job } from "bull";
import { Model } from "mongoose";
import { Ad, AdDocument } from "src/models/ad.schema";





@Processor({ name: 'data-processing', scope: Scope.DEFAULT })
export class LogicImmoIngestion {
    private readonly logger = new Logger(LogicImmoIngestion.name);


    constructor(@InjectModel(Ad.name) private adModel: Model<Ad>, private configService: ConfigService, private readonly httpService: HttpService) { }

    @Process('logicimmo-ingestion')
    async ingest(job: Job) {
        try {
            for (let data of job.data.data_ingestion) {
                let cleaned_data = await this.clean_data(data);
                await this.process_data(cleaned_data, job);
            }
            this.logger.log(`Job ${job.id} has been processed successfully`);
            await job.moveToCompleted();
        } catch (error) {
            job.moveToFailed(error);
        }
    }

    private async clean_data(data: any): Promise<Partial<AdDocument>> {
        let data_types = ['Appartement', 'Maison', 'Loft / Atelier', 'Villa', 'Terrain', 'Propriété', 'Bureau', 'Local commercial', 'Immeuble', 'Chalet', 'Château', 'Parking', 'Ferme', 'Hôtel particulier', 'Autre']
        const extractNumber = (str: string) => {
            const match = str.match(/\d+/);
            return match ? parseInt(match[0]) : null;
        };
        return {
            origin: 'logic-immo',
            adId: data.id.toString(),
            reference: data.client_id || '',
            creationDate: new Date(), // No creation date provided in the data, using current date
            lastCheckDate: new Date(), // No last check date provided in the data, using current date
            title: data.name || '', // Using 'name' as title if available
            type: data.type_use || '',
            category: data_types.at(extractNumber(data.estate_type)) || '',
            publisher: {
                name: data.agencyName,
                storeUrl: data.agencyUrl,
                phoneNumber: ''
            },
            description: data.description || '', // No description provided in the data
            url: `https://www.logic-immo.com/detail-vente${data.id}.htm`,
            pictureUrl: data.pictureUrl || '', // No main picture URL provided in the data
            pictureUrls: [], // Assuming empty array as no URLs provided
            location: {
                city: data.city,
                postalCode: data.zip_code,
                departmentCode: data.province,
                regionCode: '', // No region code provided in the data
                coordinates: {
                    lat: parseFloat(data.geolocation.split(',')[0]),
                    lon: parseFloat(data.geolocation.split(',')[1]),
                },
            },
            price: data.price,
            originalPrice: 0, // No original price provided in the data
            pricePerSquareMeter: 0, // No price per square meter provided in the data
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