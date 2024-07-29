import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Location, LocationSchema } from './location.schema';
import { History, HistorySchema } from './history.schema';
import { Duplicate, DuplicateSchema } from './duplicate.schema';
import { HydratedDocument } from 'mongoose';

export type AdDocument = HydratedDocument<Ad>;

@Schema({ timestamps: true })
export class Ad {

    @Prop({ required: true })
    origin: string;

    @Prop({ required: true })
    adId: string;

    @Prop()
    reference: string;

    @Prop({ required: true })
    creationDate: Date;

    @Prop({ required: true })
    lastCheckDate: Date;

    @Prop()
    title: string;

    @Prop()
    type: string;

    @Prop()
    category: string;

    @Prop(raw({
        name: String,
        storeUrl: String,
        phoneNumber: String
    }))
    publisher: Record<string, any>;

    @Prop()
    description: string;

    @Prop({ required: true })
    url: string;

    @Prop()
    pictureUrl: string;

    @Prop([String])
    pictureUrls: string[];

    @Prop({ type: LocationSchema })
    location: Location;

    @Prop()
    price: number;

    @Prop()
    originalPrice: number;

    @Prop()
    pricePerSquareMeter: number;

    @Prop()
    propertyCharges: number;

    @Prop()
    propertyTax: number;

    @Prop()
    rooms: number;

    @Prop()
    bedrooms: number;

    @Prop()
    surface: number;

    @Prop()
    landSurface: number;

    @Prop()
    constructionYear: number;

    @Prop()
    floor: number;

    @Prop()
    buildingFloors: number;

    @Prop()
    energyValue: number;

    @Prop()
    energyGrade: string;

    @Prop()
    gasValue: number;

    @Prop()
    gasGrade: string;

    @Prop([String])
    options: string[];

    @Prop([HistorySchema])
    history: History[];

    @Prop([DuplicateSchema])
    duplicates: Duplicate[];

    @Prop()
    phoneNumber: string;
}

export const AdSchema = SchemaFactory.createForClass(Ad);

AdSchema.index({ origin: 1, adId: 1 }, { unique: true });
AdSchema.index({ 'location.coordinates': '2dsphere' });
