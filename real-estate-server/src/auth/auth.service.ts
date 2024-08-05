import { Injectable, Logger, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Admin, AdminDocument } from 'src/models/admin.schema';
import { hash, compare } from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
@Injectable()
export class AuthService implements OnModuleInit {
    private readonly logger = new Logger(AuthService.name);

    constructor(private configService: ConfigService, @InjectModel(Admin.name) private adminModel: Model<AdminDocument>, private jwtService: JwtService) { }

    public async login(admin: Partial<AdminDocument>): Promise<any> {
        const payload = { username: admin.username, sub: admin._id };
        return {
            access_token: this.jwtService.sign(payload),
            refresh_token: this.jwtService.sign(payload, { expiresIn: '60m' }),
        };
    }

    async refreshToken(refreshToken: string) {
        try {
            const payload = this.jwtService.verify(refreshToken);
            const newPayload = { username: payload.username, sub: payload.sub };
            return {
                access_token: this.jwtService.sign(newPayload),
                refresh_token: this.jwtService.sign(newPayload, { expiresIn: '60m' }),
            };
        } catch (e) {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    public async validateAdmin(username: string, pass: string): Promise<Partial<AdminDocument> | null> {
        const admin = await this.adminModel.findOne({ username });
        if (admin && await compare(pass, admin.password)) {
            const { password, ...result } = admin.toObject();
            return result;
        }
        return null;
    }
    async onModuleInit() {
        this.logger.log('CHECKING ADMIN EXISTS....');
        const exits = await this._admin_exits();
        if (exits) {
            this.logger.log('ADMIN EXISTS');
            return
        };
        this.logger.log('ADMIN DOES NOT EXISTS');
        await this._create_admin();
    }

    private async _create_admin(): Promise<void> {
        const username = this.configService.get<string>('ADMIN_USERNAME');
        const password = await hash(this.configService.get<string>('ADMIN_PASSWORD'), 10);
        await this.adminModel.create({ username, password });
        this.logger.log('ADMIN CREATED');
    }

    private async _admin_exits(): Promise<Partial<AdminDocument>> {
        return this.adminModel.exists({ username: this.configService.get<string>('ADMIN_USERNAME') });
    }
}
