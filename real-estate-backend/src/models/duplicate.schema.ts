import { HydratedDocument } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type HistoryDocument = HydratedDocument<Duplicate>;

@Schema()
export class Duplicate {
    @Prop({ required: true })
    uniqueId: string;

    @Prop({ required: true })
    origin: string;
}

export const DuplicateSchema = SchemaFactory.createForClass(Duplicate);
