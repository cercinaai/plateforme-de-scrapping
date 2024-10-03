import { realEstateAd } from "../../models/mongodb/real-estate-ad.mongdb";
import { calculateAdAccuracy } from "../../utils/realEstateAds.utils";

export const logicimmo_preprocess_data = async (data: Partial<realEstateAd>): Promise<Partial<realEstateAd>> => {
    return {
        ...data,
        adAccuracy: calculateAdAccuracy(data)
    };
}