import { realEstateAd, realEstateAdsModel } from "../models/mongodb/real-estate-ad.mongdb";

import { jobOffersModel } from "../models/mongodb/job-offers.mongdb";

export const save_mongodb = async (data_ingestion: Partial<realEstateAd>[]) => {
    const duplicates = await realEstateAdsModel.find({ origin: { $in: data_ingestion.map(d => d.origin) }, adId: { $in: data_ingestion.map(d => d.adId) } });
    const newAds = data_ingestion.filter(d => !duplicates.some(du => du.adId === d.adId));
    await realEstateAdsModel.insertMany(newAds);
    if (duplicates.length === 0) return;
    const bulkOps = duplicates.map(duplicate => {
        return {
            updateOne: {
                filter: { origin: duplicate.origin, adId: duplicate.adId },
                update: { $set: { ...duplicate, lastCheckDate: new Date() } }
            }
        };
    });
    await realEstateAdsModel.bulkWrite(bulkOps);
}


export const save_mongodb_offers = async (data_ingestion: any) => {

        const duplicates = await jobOffersModel.find({
            _id: { $in: data_ingestion.map(d => d._id) },
        });

        const newAds = data_ingestion.filter(
            d => !duplicates.some(du => du._id === d._id)
        );
        await jobOffersModel.insertMany(newAds);
        if (duplicates.length === 0) return;

        const bulkOps = duplicates.map(duplicate => {
            return {
                updateOne: {
                    filter: {  _id: duplicate._id },
                    update: { $set: { ...duplicate, lastCheckDate: new Date() } }
                }
            };
        });
        await jobOffersModel.bulkWrite(bulkOps);
};




export const save_mysql = async (data_ingestion: any) => { }


export const save_postgres = async (data_ingestion: any) => { }


export const save_sqlite = async (data_ingestion: any) => { }