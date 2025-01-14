import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type AnymailDataDocument = AnymailData & Document;

@Schema({ timestamps: true })
export class Email {
  @Prop()
  address: string;

  @Prop()
  confidence: number;

  @Prop()
  type: string;
}

export const EmailSchema = SchemaFactory.createForClass(Email);

@Schema({ timestamps: true })
export class AnymailData {
  @Prop({ required: true })
  companyName: string;

  @Prop({ type: [EmailSchema] })
  emails: Email[];

  @Prop()
  website?: string;

  @Prop()
  location?: string;

  @Prop()
  total_count?: number;

  @Prop()
  validation?: string;
}

export const AnymailDataSchema = SchemaFactory.createForClass(AnymailData);
