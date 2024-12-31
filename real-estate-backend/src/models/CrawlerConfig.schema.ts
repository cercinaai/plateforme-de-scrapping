import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Model, SchemaTypes } from "mongoose";

export type CrawlerConfigDocument = CrawlerConfig & Document;

@Schema()
export class Region {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, type: SchemaTypes.Mixed })
  link: string | string[];

  @Prop({ required: true })
  limit: number;
}

@Schema()
export class SubCrawlerConfig {
  @Prop({ required: true })
  total: number;

  @Prop ({ required: true })
  nombre: number;


  @Prop({ required: true, type: [Region] })
  regions: Region[];

  @Prop({ required: true, default: "inactive" })
  status: string;
}

@Schema()
export class CrawlerConfig {
  @Prop({ required: true })
  can_crawl: boolean;

  @Prop({ required: true })
  api_key: string;

  @Prop({ type: [String] })
  proxy_urls: string[];

  @Prop({ type: SubCrawlerConfig, required: true })
  seloger_config: SubCrawlerConfig;

  @Prop({ type: SubCrawlerConfig, required: true })
  boncoin_limits: SubCrawlerConfig;

  @Prop({ type: SubCrawlerConfig, required: true })
  bienici_limits: SubCrawlerConfig;

  @Prop({ type: SubCrawlerConfig, required: true })
  logicimmo_limits: SubCrawlerConfig;

  @Prop({ type: SubCrawlerConfig, required: true })
  franceTravail_limits: SubCrawlerConfig;
}


export const CrawlerConfigSchema = SchemaFactory.createForClass(CrawlerConfig);

CrawlerConfigSchema.pre('save', async function (next) {
  const model = this.constructor as Model<CrawlerConfigDocument>;
  const existingConfig = await model.findOne({});
  if (existingConfig && !this.isNew) {
    const error = new Error('Only one CrawlerConfig document is allowed.');
    next(error);
  } else {
    next();
  }
});