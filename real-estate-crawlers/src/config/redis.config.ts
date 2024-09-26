
export const initRedis = () => {
    return {
        connection: {
            host: process.env.NODE_ENV === 'production' ? process.env.REDIS_HOST as string : 'localhost',
            port: process.env.NODE_ENV === 'production' ? parseInt(process.env.REDIS_PORT as string) : 6379,
            password: process.env.REDIS_PASSWORD
        }
    }
}