import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';
import { CRAWLER_ORIGIN } from 'src/crawler/utils/enum';


@Injectable()
export class DataProcessingService {

    constructor(@InjectQueue('data-processing') private dataQueues: Queue) { }

    async process(data_to_process: any, _from: CRAWLER_ORIGIN) {
        if (_from === CRAWLER_ORIGIN.BONCOIN) {
            await this.dataQueues.add('boncoin-ingestion', { data_ingestion: data_to_process }, { attempts: 1, removeOnComplete: true, removeOnFail: true });
            return;
        }
        if (_from === CRAWLER_ORIGIN.SELOGER) {
            await this.dataQueues.add('seloger-ingestion', { data_ingestion: data_to_process }, { attempts: 1, removeOnComplete: true, removeOnFail: true });
            return;
        }
        if (_from === CRAWLER_ORIGIN.BIENICI) {
            await this.dataQueues.add('bienici-ingestion', { data_ingestion: data_to_process }, { attempts: 1, removeOnComplete: true, removeOnFail: true });
            return;
        }
        if (_from === CRAWLER_ORIGIN.LOGICIMMO) {
            await this.dataQueues.add('logicimmo-ingestion', { data_ingestion: data_to_process }, { attempts: 1, removeOnComplete: true, removeOnFail: true });
            return;
        }
    }

}
