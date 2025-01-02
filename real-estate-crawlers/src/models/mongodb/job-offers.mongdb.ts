import { model, Schema } from "mongoose";

const jobOffersSchema = new Schema({
    _id: { type: String, required: true }, 
    link: { type: String, required: true },
    title: { type: String },
    description: { type: String },
    location: { type: String },
    salary: { type: String },
    contract: { type: String },
    publicationDate: { type: String },
    workHours: { type: String },
    experience: { type: String },
    qualification: { type: String },
    industry: { type: String },
    formation: { type: [String] }, 
    competences: { type: [String] },
    savoirEtre: { type: [String] },
    company: {
        name: { type: String },
        size: { type: String },
        description: { type: String },
    },
}, { timestamps: true });

export const jobOffersModel = model('JobOffers', jobOffersSchema);
