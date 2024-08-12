export const universalCategoryMapping: Record<string, string> = {
    "Appartement": "Appartement",
    "Maison": "Maison",
    "Loft/Atelier": "Loft/Atelier",
    "Villa": "Villa",
    "Terrain": "Terrain",
    "Parking": "Parking",
    "Bureau": "Bureau",
    "Local-Commercial": "Local-Commercial",
    "Immeuble": "Immeuble",
    "Chalet": "Chalet",
    "Chateau": "Chateau",
    "Autre": "Autre",
};

export const boncoinCategoryMapping: Record<string, string> = {
    "Maison": universalCategoryMapping["Maison"],
    "Appartement": universalCategoryMapping["Appartement"],
    "Terrain": universalCategoryMapping["Terrain"],
    "Parking": universalCategoryMapping["Parking"],
};

export const selogerCategoryMapping: Record<string, string> = {
    1: universalCategoryMapping["Appartement"],
    2: universalCategoryMapping["Maison"],
    3: universalCategoryMapping["Parking"],
    4: universalCategoryMapping["Terrain"],
    9: universalCategoryMapping["Loft/Atelier"],
    11: universalCategoryMapping["Immeuble"],
    13: universalCategoryMapping["Chateau"],
};

export const logicImmoCategoryMapping: Record<string, string> = {
    "av_1": universalCategoryMapping["Appartement"],
    "av_2": universalCategoryMapping["Maison"],
    "av_3": universalCategoryMapping["Terrain"],
    "av_4": universalCategoryMapping["Local-Commercial"],
    "av_5": universalCategoryMapping["Immeuble"],
    "av_6": universalCategoryMapping["Loft/Atelier"],
    "av_7": universalCategoryMapping["Villa"],
    "av_8": universalCategoryMapping["Chalet"],
    "av_9": universalCategoryMapping["Chateau"],
    "av_10": universalCategoryMapping["Parking"],
    "av_18": universalCategoryMapping["Bureau"],
};

export const BienIciCategoryMapping: Record<string, string> = {
    "house": universalCategoryMapping["Maison"],
    "flat": universalCategoryMapping["Appartement"],
    "terrain": universalCategoryMapping["Terrain"],
    "parking": universalCategoryMapping["Parking"],
    "loft": universalCategoryMapping["Loft/Atelier"],
    "shop": universalCategoryMapping["Local-Commercial"],
    "building": universalCategoryMapping["Immeuble"],
    "castle": universalCategoryMapping["Chateau"],
    "premises": universalCategoryMapping["Local-Commercial"],
    "office": universalCategoryMapping["Bureau"],
}


