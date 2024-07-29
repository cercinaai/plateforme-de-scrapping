import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';


@Injectable()
export class DataProcessingService {

    constructor(@InjectQueue('data-processing') private dataQueues: Queue) { }

    async process(data_to_process: any, _from: string) {
        if (_from === 'boncoin-crawler') {
            await this.dataQueues.add('boncoin-ingestion', { data_ingestion: data_to_process });
            return;
        }
        if (_from == 'seloger-crawler') {
            await this.dataQueues.add('seloger-ingestion', { data_ingestion: data_to_process })
            return
        }
        if (_from == 'bienici-crawler') {
            await this.dataQueues.add('bienici-ingestion', { data_ingestion: data_to_process })
            return
        }
        if (_from == 'logicimmo-crawler') {
            await this.dataQueues.add('logicimmo-ingestion', { data_ingestion: data_to_process })
            return
        }
    }

    async heathCheck() { }
}
