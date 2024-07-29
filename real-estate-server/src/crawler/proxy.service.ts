import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";


@Injectable()
export class ProxyService {

    private proxy_url: string = `https://proxy.webshare.io/api/v2/proxy/list/?mode=backbone&page=1&page_size=1`;

    constructor(private configService: ConfigService) { }

    public async new_proxy(): Promise<string> {
        const url = new URL(this.proxy_url);
        const response = await fetch(url.href, {
            method: 'GET',
            headers: {
                'Authorization': `Token ${this.configService.get<string>('PROXY_API_KEY')}`
            }
        })
        let data = await response.json();
        this.proxy_url = data['next']
        return `http://${data.results[0]['username']}:${data.results[0]['password']}@p.webshare.io:${data.results[0]['port']}`;
    }

}