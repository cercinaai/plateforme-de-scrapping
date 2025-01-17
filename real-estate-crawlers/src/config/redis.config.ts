import { config } from "dotenv"

export const initRedis = () => {
    config({ path: `./environments/${process.env.NODE_ENV}.env` })
    return {
        connection: {
            host: process.env.NODE_ENV === 'production' ? process.env.REDIS_HOST as string : 'localhost',
            port: parseInt(process.env.REDIS_PORT as string),
            password: process.env.REDIS_PASSWORD
        }
    }
}