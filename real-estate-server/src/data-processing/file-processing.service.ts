import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { HttpService } from "@nestjs/axios";
import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { first, lastValueFrom } from "rxjs";
import { urlWithoutQueryParams } from "./utils/ad.utils";

@Injectable()
export class FileProcessingService implements OnModuleInit {

    private s3: S3Client;

    constructor(private readonly configService: ConfigService, private httpService: HttpService) { }

    onModuleInit() {
        this._configure_bucket();
    }

    public async uploadFilesIntoBucket(files: string | string[], target: string): Promise<string | string[]> {
        if (!files) return 'Image Not Found';
        if (typeof files === 'string') {
            const url = urlWithoutQueryParams(files);
            const fileName = url.split('/').pop();
            const targetName = `${target}/${fileName}`;
            const file_download = await lastValueFrom(this.httpService.get(files, { responseType: 'arraybuffer' }).pipe(first()));
            if (file_download.status !== 200) return 'Image not found';
            const fileBuffer = Buffer.from(file_download.data, 'binary');
            const command = new PutObjectCommand({
                Bucket: this.configService.get<string>('AWS_S3_BUCKET_NAME'),
                Key: targetName,
                Body: fileBuffer
            });
            await this.s3.send(command);
            return `https://f003.backblazeb2.com/file/${this.configService.get<string>('AWS_S3_BUCKET_NAME')}/${targetName}`;
        }
        const result: string[] = [];
        for (let file of files) {
            if (!file) continue;
            const url = urlWithoutQueryParams(file);
            const fileName = url.split('/').pop();
            const targetName = `${target}/${fileName}`;
            const file_download = await lastValueFrom(this.httpService.get(file, { responseType: 'arraybuffer' }).pipe(first()));
            if (file_download.status !== 200) continue;
            const fileBuffer = Buffer.from(file_download.data, 'binary');
            const command = new PutObjectCommand({
                Bucket: this.configService.get<string>('AWS_S3_BUCKET_NAME'),
                Key: targetName,
                Body: fileBuffer
            });
            await this.s3.send(command);
            result.push(`https://f003.backblazeb2.com/file/${this.configService.get<string>('AWS_S3_BUCKET_NAME')}/${targetName}`);
        }
        return result;
    }

    private _configure_bucket(): void {
        this.s3 = new S3Client({
            endpoint: this.configService.get<string>('AWS_S3_ENDPOINT'),
            region: 'eu-central-003',
            credentials: {
                accessKeyId: this.configService.get<string>('AWS_S3_ACCESS_KEY'),
                secretAccessKey: this.configService.get<string>('AWS_S3_SECRET_KEY'),
            }
        });
    }
}