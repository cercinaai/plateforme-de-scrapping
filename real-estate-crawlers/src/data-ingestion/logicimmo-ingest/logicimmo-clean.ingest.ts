import { EstateOption, realEstateAd } from "../../models/mongodb/real-estate-ad.mongdb";
import { CRAWLER_ORIGIN } from "../../utils/enum";
import { extractLocation, logicImmoCategoryMapping } from "../../utils/realEstateAds.utils";
import { uploadFileIntoBucket, uploadFilesIntoBucket } from "../file.ingestion";

export const clean_logicimmo_data = async (data: any): Promise<Partial<realEstateAd>> => {
    return {
        origin: CRAWLER_ORIGIN.LOGICIMMO,
        adId: data.id.toString(),
        reference: data.client_id || 'N/A',
        creationDate: data.creationDate,
        lastCheckDate: data.lastCheckDate,
        title: data.title,
        type: data.type_use,
        category: logicImmoCategoryMapping[data.estate_type] || "Autre",
        publisher: {
            name: data.agencyName,
            storeUrl: data.agencyUrl,
            phoneNumber: data.agencyPhoneNumber
        },
        description: data.description,
        url: `https://www.logic-immo.com/detail-vente-${data.id}.htm`,
        pictureUrl: await uploadFileIntoBucket(data.pictureUrl, 'g'),
        pictureUrls: await uploadFilesIntoBucket(data.pictureUrls, 'g'),
        location: {
            city: data.city,
            postalCode: data.zip_code,
            ...await extractLocation(data.city, data.zip_code),
            coordinates: {
                lat: parseFloat(data.geolocation.split(',')[0]),
                lon: parseFloat(data.geolocation.split(',')[1]),
            },
        },
        price: data.price,
        rooms: parseInt(data.nb_rooms) || null,
        bedrooms: parseInt(data.nb_bedrooms) || null,
        surface: parseFloat(data.indoor_surface) || null,
        landSurface: parseFloat(data.land_surface) || null,
        floor: null,
        buildingFloors: null,
        energyGrade: data.energy_certificate || 'N/A',
        gasGrade: data.gas_certificate || 'N/A',
        options: extractOptions(data.options),
        history: [],
        duplicates: [],

    }
}

const extractOptions = (options: any): EstateOption => {
    let estateOption: EstateOption = {}
    for (let option of options) {
        const trimmedItem = option.trim();
        if (trimmedItem.includes('Terrasse/Balcon') && trimmedItem.includes('Terrasse')) {
            estateOption.hasTerrace = true;
            continue;
        }
        if (trimmedItem.includes('Terrasse/Balcon') && trimmedItem.includes('Balcon')) {
            estateOption.hasBalcony = true;
            continue;
        }
        if (trimmedItem.includes('Cave')) {
            estateOption.hasCellar = true;
            continue;
        }
        if (trimmedItem.includes('Ascenseur')) {
            estateOption.hasElevator = true;
            continue;
        }
        if (trimmedItem.includes('Piscine')) {
            estateOption.hasPool = true;
            continue;
        }
        if (trimmedItem.includes('Garage')) {
            estateOption.hasGarage = true;
            continue;
        }
        if (trimmedItem.includes('Jardin/Terrain') && trimmedItem.includes('Jardin')) {
            estateOption.hasGarden = true;
            continue;
        }
        if (trimmedItem.includes('Air conditionné')) {
            estateOption.hasAirConditioning = true;
            continue;
        }
        if (trimmedItem.includes('Accès Handicapé')) {
            estateOption.isDisabledPeopleFriendly = true;
            continue;
        }
        if (trimmedItem.includes('Gardien')) {
            estateOption.hasCaretaker = true;
            continue;
        }
    }
    return estateOption;
}