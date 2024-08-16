import { Body, Controller, Logger, Post, SetMetadata, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
    private readonly logger = new Logger(AuthController.name);
    constructor(private readonly authService: AuthService) { }


    @Throttle({ short: { limit: 2, ttl: 1000 }, long: { limit: 5, ttl: 60000 } })
    @Post('login')
    async login(@Body() userInfo: { username: string, password: string }) {
        const admin = await this.authService.validateAdmin(userInfo.username, userInfo.password);
        if (!admin) {
            throw new UnauthorizedException('Invalid credentials');
        }
        return this.authService.login(admin);
    }

    @Throttle({ short: { limit: 2, ttl: 1000 }, long: { limit: 5, ttl: 60000 } })
    @UseGuards(AuthGuard('jwt'))
    @Post('refresh')
    async refresh(@Body('refresh_token') refreshToken: string) {
        return this.authService.refreshToken(refreshToken);
    }
}
