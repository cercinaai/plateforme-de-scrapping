import { EstateOption, realEstateAd } from "../../models/mongodb/real-estate-ad.mongdb";
import { boncoinCategoryMapping, extractLocation } from "../../utils/realEstateAds.utils";
import { CRAWLER_ORIGIN } from "../../utils/enum";
import { uploadFileIntoBucket, uploadFilesIntoBucket } from "../file.ingestion";

export const clean_boncoin_data = async (data: any[]): Promise<Partial<realEstateAd>[]> => {
    return Promise.all(data.map((ad) => clean_ad(ad)));
}


const getValue = (attributes: any[], key: any) => {
    const attribute = attributes.find((attr: any) => attr.key === key);
    return attribute ? attribute.value : null;
};

const getValueLabel = (attributes: any[], key: string) => {
    const attribute = attributes.find(attr => attr.key === key);
    return attribute ? attribute.value_label : null;
};


const clean_ad = async (data: any): Promise<Partial<realEstateAd>> => {
    return {
        origin: CRAWLER_ORIGIN.BONCOIN,
        adId: data.list_id.toString(),
        reference: getValue(data.attributes, 'custom_ref') || '',
        creationDate: new Date(data.first_publication_date),
        lastCheckDate: new Date(),
        title: data.subject,
        type: data.ad_type,
        category: boncoinCategoryMapping[getValueLabel(data.attributes, 'real_estate_type')] || 'Autre',
        publisher: {
            name: data.owner.name,
            storeUrl: data.owner.store_id ? `https://www.leboncoin.fr/boutique/${data.owner.store_id}` : '',
            phoneNumber: 'N/A'
        },
        description: data.body || '',
        url: data.url,
        pictureUrl: await uploadFileIntoBucket(data.images.thumb_url, 'l'),
        pictureUrls: await uploadFilesIntoBucket(data.images.urls, 'l'),
        location: {
            city: data.location.city,
            postalCode: data.location.zipcode,
            ...await extractLocation(data.location.city, data.location.zipcode),
            coordinates: {
                lat: data.location.lat,
                lon: data.location.lng,
            },
        },
        price: data.price[0],
        rooms: parseInt(getValue(data.attributes, 'rooms')) || null,
        bedrooms: parseInt(getValue(data.attributes, 'bedrooms')) || null,
        surface: parseInt(getValue(data.attributes, 'square')) || null,
        landSurface: parseInt(getValue(data.attributes, 'land_plot_surface')) || null,
        floor: parseInt(getValue(data.attributes, 'floor_number')) || null,
        buildingFloors: parseInt(getValue(data.attributes, 'nb_floors_building')) || null,
        energyGrade: getValueLabel(data.attributes, 'energy_rate') || null,
        gasGrade: getValueLabel(data.attributes, 'ges') || null,
        options: extractOptions(data),
        history: [],
        duplicates: [],
    }
}

const extractOptions = (data: any): Partial<EstateOption> => {
    let estateOption: Partial<EstateOption> = {};
    const attributes = data.attributes || [];
    for (let attribute of attributes) {
        const key = attribute.key;
        const value = attribute.value;
        const values = attribute.values || [];
        switch (key) {
            case "immo_sell_type":
                if (value === "new") {
                    estateOption.isRecent = true;
                } else {
                    estateOption.isRecent = false;
                }
            case "outside_access":
                if (values.includes("terrace")) {
                    estateOption.hasTerrace = true;
                }
                if (values.includes("garden")) {
                    estateOption.hasGarden = true;
                }
                break;
            case "elevator":
                if (attribute.value === "1") {
                    estateOption.hasElevator = true;
                }
                break;
            case "nb_parkings":
                estateOption.parkingPlacesQuantity = parseInt(attribute.value, 10) || null;
                break;
        }
    }
    return estateOption
}
