import { Injectable } from "@nestjs/common";


@Injectable()
export class ProxyService {
    private readonly proxy_list: string[] = [
        "http://hephaestus.p.shifter.io:11740",
        "http://hephaestus.p.shifter.io:11741",
        "http://hephaestus.p.shifter.io:11742",
        "http://hephaestus.p.shifter.io:11743",
        "http://hephaestus.p.shifter.io:11744"
    ]

    constructor() { }

    public get_proxy_list(): string[] {
        return this.proxy_list
    }

}