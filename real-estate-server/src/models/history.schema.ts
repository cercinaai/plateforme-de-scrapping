import { Schema as MongooseSchema } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type HistoryDocument = HydratedDocument<History>;

@Schema()
export class History {
    @Prop({ required: true })
    action: string;

    @Prop({ type: MongooseSchema.Types.Mixed, required: true })
    differences: any;

    @Prop({ default: Date.now })
    date: Date;
}

export const HistorySchema = SchemaFactory.createForClass(History);
