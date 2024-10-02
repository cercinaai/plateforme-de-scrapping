import { AuthGuard } from "@nestjs/passport";
import { ApiKeyStrategy } from "../strategys/apiKey.strategy";
import { ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { Observable } from "rxjs";


@Injectable()
export class RealEstateAuthGuard extends AuthGuard('jwt') {

    constructor(@Inject(ApiKeyStrategy) private readonly apiKeyStrategy: ApiKeyStrategy) {
        super();
    }

    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        const isApiKeyValid = this.apiKeyStrategy.canActivate(context);
        if (isApiKeyValid) {
            return true;
        }
        return super.canActivate(context);
    }
}