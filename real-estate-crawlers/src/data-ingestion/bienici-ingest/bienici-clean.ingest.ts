import { EstateOption, realEstateAd } from "../../models/mongodb/real-estate-ad.mongdb";
import { CRAWLER_ORIGIN } from "../../utils/enum";
import { bienIciCategoryMapping, extractLocation } from '../../utils/realEstateAds.utils';
import { uploadFileIntoBucket, uploadFilesIntoBucket } from "../file.ingestion";
export const clean_bienici_data = async (data: any): Promise<Partial<realEstateAd>> => {
    return {
        origin: CRAWLER_ORIGIN.BIENICI,
        adId: data.id.toString(),
        reference: data.reference || 'N/A',
        creationDate: new Date(data.publicationDate),
        lastCheckDate: new Date(data.modificationDate),
        title: data.title,
        type: data.adType,
        category: bienIciCategoryMapping[data.propertyType] || 'Autre',
        publisher: {
            name: data.contactRelativeData.contactNameToDisplay,
            storeUrl: data.agencyFeeUrl,
            phoneNumber: data.contactRelativeData.phoneToDisplay
        },
        description: data.description,
        url: data.url,
        pictureUrl: await uploadFileIntoBucket(data.photos[0].url, 'b'),
        pictureUrls: await uploadFilesIntoBucket(data.photos.map((photo: any) => photo.url), 'b'),
        location: {
            city: data.city,
            postalCode: data.postalCode,
            ...await extractLocation(data.city, data.postalCode),
            coordinates: {
                lat: data.blurInfo?.position?.lat,
                lon: data.blurInfo?.position?.lon,
            },
        },
        price: data.price,
        rooms: data.roomsQuantity || null,
        bedrooms: data.bedroomsQuantity || null,
        surface: data.surfaceArea || null,
        landSurface: data.landSurfaceArea || null,
        floor: data.floor || null,
        buildingFloors: data.floorQuantity || null,
        energyGrade: data.energyClassification,
        gasGrade: data.greenhouseGazClassification,
        options: extractOptions(data),
        history: [],
        duplicates: [],

    }
}

const extractOptions = (data: any): EstateOption => {
    return {
        isRecent: data.isRecent || null,
        hasTerrace: data.hasTerrace || false,
        hasCellar: data.hasCellar || false,
        hasBalcony: data.hasBalcony || false,
        hasGarden: data.hasGarden || false,
        workToDo: data.workToDo || false,
        hasAirConditioning: data.hasAirConditioning || false,
        hasFirePlace: data.hasFirePlace || false,
        hasElevator: data.hasElevator || false,
        hasAlarm: data.hasAlarm || false,
        hasDoorCode: data.hasDoorCode || false,
        hasCaretaker: data.hasCaretaker || false,
        hasIntercom: data.hasIntercom || false,
        hasPool: data.hasPool || false,
        hasSeparateToilet: data.hasSeparateToilet || false,
        isDisabledPeopleFriendly: data.isDisabledPeopleFriendly || false,
        hasUnobstructedView: data.hasUnobstructedView || false,
        exposition: data.exposition || null,
        parkingPlacesQuantity: data.parkingPlacesQuantity || null
    }
}