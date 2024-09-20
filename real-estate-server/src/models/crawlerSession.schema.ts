import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CrawlerSessionDocument = HydratedDocument<CrawlerStats>;

@Schema()
class CrawlerStats {
    @Prop({ required: true })
    status: 'success' | 'failed';

    @Prop({ required: true })
    total_data_grabbed: number;

    @Prop(raw({
        failed_date: { type: Date },
        failedReason: { type: String },
        failed_request_url: { type: String },
        proxy_used: { type: String }
    }))
    error?: Record<string, any> | null;

    @Prop({ required: true })
    total_request: number;

    @Prop({ required: true })
    success_requests: number;

    @Prop({ required: true })
    failed_requests: number;
}


export const CrawlerStatsSchema = SchemaFactory.createForClass(CrawlerStats);

@Schema()
export class CrawlerSession {
    @Prop({ isRequired: true })
    session_date: Date;

    @Prop({ isRequired: true })
    status: 'running' | 'completed';

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