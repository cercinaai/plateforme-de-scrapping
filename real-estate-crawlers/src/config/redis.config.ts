
export const initRedis = () => {
    return {
        connection: {
            host: process.env.REDIS_HOST as string,
            port: parseInt(process.env.REDIS_PORT as string),
            password: process.env.REDIS_PASSWORD
        }
    }
}