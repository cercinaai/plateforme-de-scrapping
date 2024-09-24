import { createLogger, format, transports } from "winston"


export const initLogger = (dirname: string) => {
    return createLogger({
        level: 'info',
        format: format.combine(
            format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            format.errors({ stack: true }),
            format.json(),
        ),
        defaultMeta: { service: 'real-estate-crawlers' },
        transports: [
            new transports.Console({ level: 'info' }),
            new transports.File({ dirname: `logs/${dirname}`, filename: 'error.log', level: 'error', zippedArchive: true, maxsize: 209715200 }),
            new transports.File({ dirname: `logs/${dirname}`, filename: 'stat.log', level: 'info', zippedArchive: true, maxsize: 209715200 }),
        ]
    })
}