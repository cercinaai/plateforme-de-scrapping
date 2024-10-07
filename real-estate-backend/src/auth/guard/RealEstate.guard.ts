import { AuthGuard } from "@nestjs/passport";
import { ApiKeyStrategy } from "../strategys/apiKey.strategy";
import { ExecutionContext, Inject, Injectable } from "@nestjs/common";


@Injectable()
export class RealEstateAuthGuard extends AuthGuard('jwt') {

    constructor(@Inject(ApiKeyStrategy) private readonly apiKeyStrategy: ApiKeyStrategy) {
        super();
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isApiKeyValid = await (this.apiKeyStrategy.canActivate(context) as Promise<boolean>);
        if (!isApiKeyValid) {
            return super.canActivate(context) as boolean | Promise<boolean>;
        }
        return isApiKeyValid;
    }
}