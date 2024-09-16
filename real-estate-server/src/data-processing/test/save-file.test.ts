import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import axios from "axios";

export const save_files = async (url: string) => {
    console.log(`downloading ${url}`);
    const fileName = url.split('/').pop();
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const fileBuffer = Buffer.from(response.data, 'binary');
    const s3 = new S3Client({
        endpoint: process.env.AWS_S3_ENDPOINT,
        region: 'eu-central-003',
        credentials: {
            accessKeyId: process.env.AWS_S3_ACCESS_KEY,
            secretAccessKey: process.env.AWS_S3_SECRET_KEY,
        }
    });
    const res = await s3.send(new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: `b/${fileName}`,
        Body: fileBuffer
    }));
    console.log(res);
    console.log(`https://f003.backblazeb2.com/file/${process.env.AWS_S3_BUCKET_NAME}/b/${fileName}`);
}