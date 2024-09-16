import axios from "axios";
import { AdDocument } from "src/models/ad.schema"

// Define importance percentages for each field in Ad_Model
const importance = {
    publisher: 10,      // publisher is divided further
    pictureUrls: 10,
    location: 10,
    price: 10,
    rooms: 5,
    bedrooms: 5,
    surface: 10,
    landSurface: 5,
    floor: 5,
    energyGrade: 10,
    gasGrade: 10,
    options: 10        // options are divided further
};

// Publisher fields importance
const publisherImportance = {
    name: 3.33,          // 3.33% of the total ad accuracy
    storeUrl: 3.33,      // 3.33% of the total ad accuracy
    phoneNumber: 3.33    // 3.33% of the total ad accuracy
};

// Options fields importance
const optionsImportance = {
    isRecent: 0.5,
    hasTerrace: 0.5,
    hasCellar: 0.5,
    hasBalcony: 0.5,
    hasGarden: 0.5,
    workToDo: 0.5,
    hasAirConditioning: 0.5,
    hasFirePlace: 0.5,
    hasElevator: 0.5,
    hasAlarm: 0.5,
    hasDoorCode: 0.5,
    hasCaretaker: 0.5,
    hasIntercom: 0.5,
    hasPool: 0.5,
    hasSeparateToilet: 0.5,
    isDisabledPeopleFriendly: 0.5,
    hasUnobstructedView: 0.5,
    hasGarage: 0.5,
    exposition: 0.5,
    parkingPlacesQuantity: 0.5
};

export const calculateAdAccuracy = (ad: Partial<AdDocument>): Partial<AdDocument> => {
    let accuracy = 0;
    // Check if fields exist and add their importance to the accuracy
    if (ad.publisher) {
        if (ad.publisher.name) accuracy += publisherImportance.name;
        if (ad.publisher.storeUrl) accuracy += publisherImportance.storeUrl;
        if (ad.publisher.phoneNumber) accuracy += publisherImportance.phoneNumber;
    }

    if (ad.pictureUrls && ad.pictureUrls.length > 0) accuracy += importance.pictureUrls;
    if (ad.location) accuracy += importance.location;
    if (ad.price) accuracy += importance.price;
    if (ad.rooms) accuracy += importance.rooms;
    if (ad.bedrooms) accuracy += importance.bedrooms;
    if (ad.surface) accuracy += importance.surface;
    if (ad.landSurface) accuracy += importance.landSurface;
    if (ad.floor) accuracy += importance.floor;
    if (ad.energyGrade) accuracy += importance.energyGrade;
    if (ad.gasGrade) accuracy += importance.gasGrade;

    if (ad.options) {
        if (ad.options.isRecent !== null) accuracy += optionsImportance.isRecent;
        if (ad.options.hasTerrace) accuracy += optionsImportance.hasTerrace;
        if (ad.options.hasCellar) accuracy += optionsImportance.hasCellar;
        if (ad.options.hasBalcony) accuracy += optionsImportance.hasBalcony;
        if (ad.options.hasGarden) accuracy += optionsImportance.hasGarden;
        if (ad.options.workToDo) accuracy += optionsImportance.workToDo;
        if (ad.options.hasAirConditioning) accuracy += optionsImportance.hasAirConditioning;
        if (ad.options.hasFirePlace) accuracy += optionsImportance.hasFirePlace;
        if (ad.options.hasElevator) accuracy += optionsImportance.hasElevator;
        if (ad.options.hasAlarm) accuracy += optionsImportance.hasAlarm;
        if (ad.options.hasDoorCode) accuracy += optionsImportance.hasDoorCode;
        if (ad.options.hasCaretaker) accuracy += optionsImportance.hasCaretaker;
        if (ad.options.hasIntercom) accuracy += optionsImportance.hasIntercom;
        if (ad.options.hasPool) accuracy += optionsImportance.hasPool;
        if (ad.options.hasSeparateToilet) accuracy += optionsImportance.hasSeparateToilet;
        if (ad.options.isDisabledPeopleFriendly) accuracy += optionsImportance.isDisabledPeopleFriendly;
        if (ad.options.hasUnobstructedView) accuracy += optionsImportance.hasUnobstructedView;
        if (ad.options.hasGarage) accuracy += optionsImportance.hasGarage;
        if (ad.options.exposition) accuracy += optionsImportance.exposition;
        if (ad.options.parkingPlacesQuantity !== null) accuracy += optionsImportance.parkingPlacesQuantity;
    }

    return { ...ad, adAccuracy: Math.min(accuracy, 100) };
}


export const urlWithoutQueryParams = (url: string) => {
    const urlObj = new URL(url);
    return urlObj.origin + urlObj.pathname;
};


export const extractLocation = async (city: string, postalCode: string, withCoordinates = false):
    Promise<{
        departmentCode: string, regionCode: string, coordinates?: { lat: number, lon: number }
    }> => {
    if (!city || !postalCode) return { departmentCode: 'NO DEPARTMENT', regionCode: 'NO REGION' };
    let response = await axios.get(`https://geo.api.gouv.fr/communes?nom=${city}&codePostal=${postalCode}&fields=centre,codeDepartement,codeRegion`);
    if (!response.data || response.data.length === 0) {
        response = await axios.get(`https://geo.api.gouv.fr/communes?codePostal=${postalCode}&fields=centre,codeDepartement,codeRegion`);
    }
    if (withCoordinates) {
        return {
            departmentCode: response.data[0] ? response.data[0].codeDepartement : 'NO DEPARTMENT',
            regionCode: response.data[0] ? response.data[0].codeRegion : 'NO REGION',
            coordinates: {
                lat: response.data[0] ? response.data[0].centre.coordinates[1] : 0,
                lon: response.data[0] ? response.data[0].centre.coordinates[0] : 0
            }
        }
    }
    return {
        departmentCode: response.data[0] ? response.data[0].codeDepartement : 'NO DEPARTMENT',
        regionCode: response.data[0] ? response.data[0].codeRegion : 'NO REGION'
    }
}