import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";


@Injectable()
export class ProxyService {


    constructor() { }

    public async new_proxy(): Promise<string> {
        return "http://letgdgcm-rotate:mp3em7tkk83t@p.webshare.io:80";
    }

}