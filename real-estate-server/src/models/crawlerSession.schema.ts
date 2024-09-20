import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CrawlerSessionDocument = HydratedDocument<CrawlerStats>;

@Schema()
class CrawlerStats {

    @Prop()
    success_date?: Date;

    @Prop()
    error_date?: Date;

    @Prop({ required: true })
    crawler_origin: string;

    @Prop({ required: true })
    status: string;

    @Prop({ required: true })
    total_data_grabbed: number;

    @Prop()
    total_request?: number;

    @Prop()
    success_requests?: number;

    @Prop()
    failed_requests?: number;

    @Prop()
    failedReason?: string;

    @Prop()
    attempts_count?: number;

    @Prop()
    failed_request_url?: string;

    @Prop()
    proxy_used?: string;
}


export const CrawlerStatsSchema = SchemaFactory.createForClass(CrawlerStats);

@Schema()
export class CrawlerSession {
    @Prop({ isRequired: true })
    session_date: Date;
    @Prop({ type: CrawlerStatsSchema, required: false })
    boncoin?: CrawlerStats | null;

    @Prop({ type: CrawlerStatsSchema, required: false })
    bienici?: CrawlerStats | null;

    @Prop({ type: CrawlerStatsSchema, required: false })
    logicimmo?: CrawlerStats | null;

    @Prop({ type: CrawlerStatsSchema, required: false })
    seloger?: CrawlerStats | null;
}

export const CrawlerSessionSchema = SchemaFactory.createForClass(CrawlerSession);