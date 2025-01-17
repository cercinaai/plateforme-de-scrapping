import { realEstateAd } from "../../models/mongodb/real-estate-ad.mongdb";
import { calculateAdAccuracy } from "../../utils/realEstateAds.utils";

export const seloger_preprocess_data = async (data: Partial<realEstateAd>[]): Promise<Partial<realEstateAd>[]> => {
    return Promise.all(data.map((ad) => seloger_preprocess_ad(ad)));
}

export const seloger_preprocess_ad = async (ad: Partial<realEstateAd>): Promise<Partial<realEstateAd>> => {
    return {
        ...ad,
        adAccuracy: calculateAdAccuracy(ad)
    };
}