import { EstateOption, realEstateAd } from "../../models/mongodb/real-estate-ad.mongdb";
import { CRAWLER_ORIGIN } from "../../utils/enum";
import { extractLocation, selogerCategoryMapping } from "../../utils/realEstateAds.utils";
import { uploadFileIntoBucket, uploadFilesIntoBucket } from "../file.ingestion";

export const clean_seloger_data = async (data: any): Promise<Partial<realEstateAd>[]> => {
    return Promise.all(data.map((ad: any) => clean_seloger_ad(ad)));
}

const clean_seloger_ad = async (data: any): Promise<Partial<realEstateAd>> => {
    return {
        origin: CRAWLER_ORIGIN.SELOGER,
        adId: data.id.toString() || 'N/A',
        reference: data.publicationId.toString() || 'N/A',
        creationDate: new Date(),
        lastCheckDate: new Date(),
        title: data.title || 'N/A',
        type: 'sale',
        category: selogerCategoryMapping[data.estateTypeId] || 'Autre',
        publisher: {
            name: data.contact?.contactName || 'N/A',
            storeUrl: data.contact?.agencyLink || `https://www.seloger.com${data.contact?.agencyPage}`,
            phoneNumber: data.contact?.phoneNumber || 'N/A'
        },
        description: data.description || 'N/A',
        url: `https://www.seloger.com${data.classifiedURL}`,
        pictureUrl: await uploadFileIntoBucket(data.photos[0].url, 's'),
        pictureUrls: await uploadFilesIntoBucket(data.photos.map((photo: string) => extractImageUrl(photo)), 's'),
        location: {
            city: data.cityLabel,
            postalCode: data.zipCode,
            ...await extractLocation(data.cityLabel, data.zipCode, true) as any,
        },
        price: parseInt(data.pricing.rawPrice) || parseFloat(data.pricing.price),
        rooms: parseInt(data.rooms) || null,
        bedrooms: data.bedroomCount || null,
        surface: data.surface || null,
        landSurface: extractLandSurfaceFromTags(data.tags),
        floor: extractFloorFromTags(data.tags),
        buildingFloors: null,
        energyGrade: data.epc || 'N/A',
        gasGrade: null,
        options: extractOptions(data) as EstateOption,
        history: [],
        duplicates: [],
    }
}

const extractImageUrl = (url: string): string => {
    if (!url) return 'N/A';
    if (url.includes('https://v.seloger.com')) {
        return url;
    }
    return `https://v.seloger.com/s/width/800/visuels${url}`
}


const extractLandSurfaceFromTags = (tags: string[]): number | null => {
    const landSurfaceTag = tags.find(tag => tag.includes('Terrain'));
    return landSurfaceTag ? parseInt(landSurfaceTag.split(' ')[1]) : null;
}

const extractFloorFromTags = (tags: string[]): number | null => {
    try {
        const floorTag = tags.find(tag => tag.includes('Étage'));
        return floorTag ? parseInt(floorTag.split(' ')[1].split('/')[0]) : null;
    } catch {
        return null;
    }
}

const extractOptions = (data: any): Partial<EstateOption> => {
    let estateOption: Partial<EstateOption> = {};
    const tags = data.tags || [];
    if (tags.includes('Terrasse')) {
        estateOption.hasTerrace = true;
    }
    if (tags.includes('Balcon')) {
        estateOption.hasBalcony = true;
    }
    if (tags.includes('Jardin')) {
        estateOption.hasGarden = true;
    }
    if (tags.includes('Cave')) {
        estateOption.hasCellar = true;
    }
    if (tags.includes('Garage')) {
        estateOption.hasGarage = true;
    }
    if (tags.includes('Ascenseur')) {
        estateOption.hasElevator = true;
    }
    if (tags.includes('Piscine')) {
        estateOption.hasPool = true;
    }
    if (tags.includes('Box') || tags.includes('Parking')) {
        estateOption.parkingPlacesQuantity = 1;
    }
    estateOption.isRecent = data.isNew || null;
    estateOption.exposition = null
    return estateOption;
}
