import { Document, model, Schema } from "mongoose";

const realEstateAds = new Schema<realEstateAd>({
    origin: { type: String, required: true },
    adId: { type: String, required: true },
    reference: { type: String },
    creationDate: { type: Date, required: true },
    lastCheckDate: { type: Date, required: true },
    title: { type: String },
    type: { type: String },
    category: { type: String },
    publisher: {
        type: {
            name: { type: String },
            storeUrl: { type: String },
            phoneNumber: { type: String }
        }
    },
    description: { type: String },
    url: { type: String, required: true },
    pictureUrl: { type: String },
    pictureUrls: [{ type: String }],
    location: {
        city: { type: String, required: true },
        postalCode: { type: String, required: true },
        departmentCode: { type: String, required: true },
        regionCode: { type: String, required: true },
        coordinates: {
            lon: { type: Number, required: true },
            lat: { type: Number, required: true }
        }
    },
    price: { type: Number },
    rooms: { type: Number },
    bedrooms: { type: Number },
    surface: { type: Number },
    landSurface: { type: Number },
    floor: { type: Number },
    buildingFloors: { type: Number },
    energyValue: { type: Number },
    energyGrade: { type: String },
    gasValue: { type: Number },
    gasGrade: { type: String },
    options: {
        hasTerrace: { type: Boolean },
        hasCellar: { type: Boolean },
        hasBalcony: { type: Boolean },
        hasGarden: { type: Boolean },
        workToDo: { type: Boolean },
        hasAirConditioning: { type: Boolean },
        hasFirePlace: { type: Boolean },
        hasElevator: { type: Boolean },
        hasAlarm: { type: Boolean },
        hasDoorCode: { type: Boolean },
        hasCaretaker: { type: Boolean },
        hasIntercom: { type: Boolean },
        hasPool: { type: Boolean },
        hasSeparateToilet: { type: Boolean },
        isDisabledPeopleFriendly: { type: Boolean },
        hasUnobstructedView: { type: Boolean },
        hasGarage: { type: Boolean },
        exposition: { type: String },
        parkingPlacesQuantity: { type: Number },
        isRecent: { type: Boolean }
    },
    adAccuracy: { type: Number },
    history: [{ type: String }],
    duplicates: [{ type: String }]
});

realEstateAds.index({ origin: 1, adId: 1 }, { unique: true });
realEstateAds.index({ 'location.coordinates': '2dsphere' });

export const realEstateAdsModel = model<realEstateAd>('RealEstateAds', realEstateAds);

export interface realEstateAd extends Document {
    origin: string;
    adId: string;
    reference: string;
    creationDate: Date;
    lastCheckDate: Date;
    title: string;
    type: string;
    category: string;
    publisher: Publisher;
    description: string;
    url: string;
    pictureUrl: string;
    pictureUrls: string[];
    location: Location;
    price: number | null;
    rooms: number | null;
    bedrooms: number | null;
    surface: number | null;
    landSurface: number | null;
    floor: number | null;
    buildingFloors: number | null;
    energyValue: number | null;
    energyGrade: string | null;
    gasValue: number | null;
    gasGrade: string | null;
    options: EstateOption;
    adAccuracy: number;
    history: string[];
    duplicates: string[];
}

interface Publisher {
    name: string;
    storeUrl: string;
    phoneNumber: string;
}

interface Coordinates {
    lon: number;
    lat: number;
}

interface Location {
    city: string;
    postalCode: string;
    departmentCode: string;
    regionCode: string;
    coordinates: Coordinates
}

export interface EstateOption {
    hasTerrace?: boolean;
    hasCellar?: boolean;
    hasBalcony?: boolean;
    hasGarden?: boolean;
    workToDo?: boolean;
    hasAirConditioning?: boolean;
    hasFirePlace?: boolean;
    hasElevator?: boolean;
    hasAlarm?: boolean;
    hasDoorCode?: boolean;
    hasCaretaker?: boolean;
    hasIntercom?: boolean;
    hasPool?: boolean;
    hasSeparateToilet?: boolean;
    isDisabledPeopleFriendly?: boolean;
    hasUnobstructedView?: boolean;
    hasGarage?: boolean;
    exposition?: string | null;
    parkingPlacesQuantity?: number | null;
    isRecent?: boolean | null;
}