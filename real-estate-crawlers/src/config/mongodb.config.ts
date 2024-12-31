import { connect } from 'mongoose';
import { initLogger } from '../config/logger.config';

export const initMongoDB = async () => {
    const logger = initLogger('mongodb');
    logger.info('Connecting to MongoDB...');

    const host = process.env.MONGO_HOST;
    const port = process.env.MONGO_PORT;
    const database = process.env.MONGO_DATABASE;
    const username = process.env.MONGO_USER;
    const password = process.env.MONGO_PASSWORD;

    if (!host || !port || !database) {
        logger.error('Missing required MongoDB configuration in environment variables.');
        throw new Error('Missing required MongoDB configuration in environment variables.');
    }

    const uri = username && password
        ? `mongodb://${username}:${password}@${host}:${port}/${database}`
        : `mongodb://${host}:${port}/${database}`;

    logger.info(`MongoDB URI: ${uri}`); // Ajoutez cette ligne pour vérifier l'URI

    try {
        await connect(uri);
        logger.info('Connected to MongoDB!');
    } catch (err) {
        logger.error('Error connecting to MongoDB:', err);
        process.exit(1); // Arrêtez le processus si la connexion échoue
    }
};
