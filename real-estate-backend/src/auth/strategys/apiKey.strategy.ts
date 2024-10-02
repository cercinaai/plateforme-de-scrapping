import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Observable } from "rxjs";


@Injectable()
export class ApiKeyStrategy implements CanActivate {

    constructor(private configService: ConfigService) { }

    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        const request = context.switchToHttp().getRequest();
        const apiKey = request.headers['x-api-key'];
        if (!apiKey) {
            return false
        }
        const validApiKey = this.configService.get<string>('REAL_ESTATE_API_KEY');
        if (apiKey === validApiKey) {
            return true;
        }
        return false
    }
}