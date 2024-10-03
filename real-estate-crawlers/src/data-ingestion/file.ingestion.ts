import axios from "axios";
import { urlWithoutQueryParams } from "../utils/realEstateAds.utils";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const configure_bucket = (): S3Client => {
    return new S3Client({
        endpoint: process.env.AWS_S3_ENDPOINT as string,
        region: 'eu-central-003',
        credentials: {
            accessKeyId: process.env.AWS_S3_ACCESS_KEY as string,
            secretAccessKey: process.env.AWS_S3_SECRET_KEY as string,
        }
    });
}

let s3 = configure_bucket();

export const uploadFilesIntoBucket = async (files: string[], target: string): Promise<string[]> => {
    if (!files) return [];
    return await Promise.all(files.map(async (file) => await uploadFileIntoBucket(file, target)));
}

export const uploadFileIntoBucket = async (file: string, target: string): Promise<string> => {
    try {
        if (!file) return 'N/A';
        const url = urlWithoutQueryParams(file);
        const fileName = url.split('/').pop();
        const targetName = `${target}/${fileName}`;
        const file_download = await axios.get(file, { responseType: 'arraybuffer' }).catch(() => null);
        if (!file_download || file_download.status !== 200) return 'N/A';
        const fileBuffer = Buffer.from(file_download.data, 'binary');
        const command = new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: targetName,
            Body: fileBuffer
        });
        await s3.send(command);
        return `https://f003.backblazeb2.com/file/${process.env.AWS_S3_BUCKET_NAME}/${targetName}`;
    } catch (error) {
        if (error.message.includes('ServiceUnavailable: no tomes available')) {
            s3 = configure_bucket();
            return await uploadFileIntoBucket(file, target);
        }
        throw error;
    }
}


export const uploadBufferIntoBucket = async (buffer: Buffer, fileName: string, target: string): Promise<string> => {
    try {
        if (!buffer) return 'N/A';
        const targetName = `${target}/${fileName}`;
        const command = new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: targetName,
            Body: buffer
        });
        await s3.send(command);
        return `https://f003.backblazeb2.com/file/${process.env.AWS_S3_BUCKET_NAME}/${targetName}`;
    } catch (error) {
        if (error.message.includes('ServiceUnavailable: no tomes available')) {
            s3 = configure_bucket();
            return await uploadBufferIntoBucket(buffer, fileName, target);
        }
        throw error;
    }
}


