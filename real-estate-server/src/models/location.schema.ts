import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type LocationDocument = HydratedDocument<Location>;
export type CoordinatesDocument = HydratedDocument<Coordinates>;

@Schema()
export class Coordinates {
    @Prop({ required: true })
    lat: number;

    @Prop({ required: true })
    lon: number;
}

export const CoordinatesSchema = SchemaFactory.createForClass(Coordinates);

@Schema()
export class Location {
    @Prop({ required: true })
    city: string;

    @Prop({ required: true })
    postalCode: string;

    @Prop({ required: true })
    departmentCode: string;

    @Prop({ required: true })
    regionCode: string;

    @Prop({ type: CoordinatesSchema, required: true })
    coordinates: Coordinates;
}

export const LocationSchema = SchemaFactory.createForClass(Location);
