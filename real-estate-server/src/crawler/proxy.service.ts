import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";


@Injectable()
export class ProxyService {

    private proxy_url: string = `https://proxy.webshare.io/api/v2/proxy/list/?mode=backbone&page=1&page_size=1000`;

    constructor(private configService: ConfigService) { }




    public async get_fresh_proxy_list(): Promise<string[]> {
        const url = new URL(this.proxy_url);
        const response = await fetch(url.href, {
            method: 'GET',
            headers: {
                'Authorization': `Token ${this.configService.get<string>('PROXY_API_KEY')}`
            }
        })
        let data = await response.json();
        this.proxy_url = data['next']
        return data.results.map((proxy: any) => `http://${proxy['username']}:${proxy['password']}@p.webshare.io:${proxy['port']}`);
    }

    public async new_proxy(): Promise<string> {
        return "http://letgdgcm-rotate:mp3em7tkk83t@p.webshare.io:80";
    }

}