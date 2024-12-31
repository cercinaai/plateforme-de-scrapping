import crypto from "crypto";

export const clean_france_travail_data = async (data: any): Promise<any> => {
    return {
        origin: "France Travail",
        link: data.link || "Non spécifié",
    };
};

