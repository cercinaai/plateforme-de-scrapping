import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type JobOffersDocument = JobOffers & Document;

@Schema({ timestamps: true })
export class Company {
  @Prop()
  name?: string;

  @Prop()
  size?: string;

  @Prop()
  description?: string;
}

export const CompanySchema = SchemaFactory.createForClass(Company);

@Schema({ timestamps: true })
export class JobOffers {
  @Prop({ required: true })
  _id: string;

  @Prop({ required: true })
  link: string;

  @Prop()
  title?: string;

  @Prop()
  description?: string;

  @Prop()
  location?: string;

  @Prop()
  salary?: string;

  @Prop()
  contract?: string;

  @Prop()
  publicationDate?: string;

  @Prop()
  workHours?: string;

  @Prop()
  experience?: string;

  @Prop()
  qualification?: string;

  @Prop()
  formation?: [string];

  @Prop()
  competences?: [string];
    
  @Prop()
  savoirEtre?: [string];

  @Prop()
  industry?: string;

  @Prop({ type: CompanySchema })
  company?: Company;
}

export const JobOffersSchema = SchemaFactory.createForClass(JobOffers);
