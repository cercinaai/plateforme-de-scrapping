
export const initMongoDB = async () => {
    const { connect } = await import('mongoose');
    const { initLogger } = await import('./logger.config');
    const logger = initLogger('mongodb');
    logger.info('Connecting to MongoDB...');
    const host = process.env.MONGO_HOST;
    const port = process.env.MONGO_PORT;
    const database = process.env.MONGO_DATABASE;
    const username = process.env.MONGO_USER;
    const password = process.env.MONGO_PASSWORD;
    await connect(`mongodb://${username}:${password}@${host}:${port}/${database}`).catch((err) => {
        logger.error(err);
        process.kill(process.pid, 'SIGTERM')
    });
    logger.info('Connected to MongoDB!');
}