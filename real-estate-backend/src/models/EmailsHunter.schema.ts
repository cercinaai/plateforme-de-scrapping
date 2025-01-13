// Nouveau schéma pour stocker les données de l'API Hunter
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type HunterDataDocument = HunterData & Document;

@Schema({ timestamps: true })
export class Email {
  @Prop()
  value: string;

  @Prop()
  type: string;

  @Prop()
  confidence: number;

  @Prop()
  first_name?: string;

  @Prop()
  last_name?: string;

  @Prop()
  position?: string;

  @Prop()
  seniority?: string;

  @Prop()
  department?: string;

  @Prop()
  linkedin?: string;

  @Prop()
  twitter?: string;

  @Prop()
  phone_number?: string;

  @Prop()
  verification_status?: string;

  @Prop()
  verification_date?: Date;
}

export const EmailSchema = SchemaFactory.createForClass(Email);

@Schema({ timestamps: true })
export class HunterData {
  @Prop({ required: true })
  domain: string;

  @Prop()
  disposable: boolean;

  @Prop()
  webmail: boolean;

  @Prop()
  accept_all: boolean;

  @Prop()
  pattern: string;

  @Prop()
  organization: string;

  @Prop()
  description: string;

  @Prop()
  industry: string;

  @Prop()
  twitter?: string;

  @Prop()
  facebook?: string;

  @Prop()
  linkedin?: string;

  @Prop()
  instagram?: string;

  @Prop()
  youtube?: string;

  @Prop()
  technologies: string[];

  @Prop()
  country?: string;

  @Prop()
  state?: string;

  @Prop()
  city?: string;

  @Prop()
  postal_code?: string;

  @Prop()
  street?: string;

  @Prop()
  headcount?: string;

  @Prop()
  company_type?: string;

  @Prop({ type: [EmailSchema] })
  emails: Email[];

  @Prop()
  linked_domains: string[];
}

export const HunterDataSchema = SchemaFactory.createForClass(HunterData);
