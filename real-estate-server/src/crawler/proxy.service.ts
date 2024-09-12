import { Injectable } from "@nestjs/common";


@Injectable()
export class ProxyService {
    private readonly proxy_list: string[] = [
        "http://hephaestus.p.shifter.io:10065",
        "http://hephaestus.p.shifter.io:10066",
        "http://hephaestus.p.shifter.io:10067",
        "http://hephaestus.p.shifter.io:10068",
        "http://hephaestus.p.shifter.io:10069"
    ]

    constructor() { }

    public get_proxy_list(): string[] {
        return this.proxy_list
    }

}