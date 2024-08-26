import { InjectModel } from "@nestjs/mongoose";
import { DataProcessingService } from "../../data-processing/data-processing.service";
import { LogicImmoCrawler } from "./logicimmo.crawler";
import { Ad } from "src/models/ad.schema";
import { Model } from "mongoose";


class LogicImmoCrawlerMock extends LogicImmoCrawler {
    constructor(dataProcessingService: DataProcessingService, @InjectModel(Ad.name) protected adModel: Model<Ad>) {
        super(dataProcessingService, adModel);
    }
}