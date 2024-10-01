import { connect } from "mongoose";
import { initLogger } from "../config/logger.config";

export const initMongoDB = async () => {
    const logger = initLogger('mongodb');
    logger.info('Connecting to MongoDB...');
    const host = process.env.MONGO_HOST;
    const port = process.env.MONGO_PORT;
    const database = process.env.MONGO_DATABASE;
    const username = process.env.MONGO_USER;
    const password = process.env.MONGO_PASSWORD;
    await connect(`mongodb://${username}:${password}@${host}:${port}/${database}`).then(() => {
        logger.info('Connected to MongoDB!');
    }).catch((err) => {
        logger.error(err);
        process.kill(process.pid, 'SIGTERM');
    });
}