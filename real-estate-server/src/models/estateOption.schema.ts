import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type EstateOptionDocument = HydratedDocument<EstateOption>;

@Schema()
export class EstateOption {

    @Prop({ required: true, default: false })
    isRecent: boolean;

    @Prop({ required: true, default: false })
    hasTerrace: boolean;

    @Prop({ required: true, default: false })
    hasCellar: boolean;

    @Prop({ required: true, default: false })
    hasBalcony: boolean;

    @Prop({ required: true, default: false })
    hasGarden: boolean;

    @Prop({ required: true, default: false })
    workToDo: boolean;

    @Prop({ required: true, default: false })
    hasAirConditioning: boolean;

    @Prop({ required: true, default: false })
    hasFirePlace: boolean;

    @Prop({ required: true, default: false })
    hasElevator: boolean;

    @Prop({ required: true, default: false })
    hasAlarm: boolean;

    @Prop({ required: true, default: false })
    hasDoorCode: boolean;

    @Prop({ required: true, default: false })
    hasCaretaker: boolean;

    @Prop({ required: true, default: false })
    hasIntercom: boolean;

    @Prop({ required: true, default: false })
    hasPool: boolean;

    @Prop({ required: true, default: false })
    hasSeparateToilet: boolean;

    @Prop({ required: true, default: false })
    isDisabledPeopleFriendly: boolean;

    @Prop({ required: true, default: false })
    hasUnobstructedView: boolean;

    @Prop({ required: true, default: false })
    hasGarage: boolean;

    @Prop({ required: false, default: null })
    exposition: string | null;

    @Prop({ required: false, default: null })
    parkingPlacesQuantity: number | null;
}

export const EstateOptionSchema = SchemaFactory.createForClass(EstateOption);