import { Configuration, LogLevel } from "crawlee";

export const boncoinConfig = new Configuration({
    logLevel: LogLevel.INFO,
    purgeOnStart: true,
    persistStorage: false,
    storageClientOptions: {
        persistStorage: false,
        writeMetadata: false,
    },
    memoryMbytes: 14000,
    availableMemoryRatio: 1,
    headless: true,
})
export const selogerConfig = new Configuration({
    logLevel: LogLevel.INFO,
    purgeOnStart: true,
    persistStorage: false,
    storageClientOptions: {
        persistStorage: false,
        writeMetadata: false,
    },
    memoryMbytes: 14000,
    availableMemoryRatio: 1,
    headless: true,
})
export const bieniciConfig = new Configuration({
    logLevel: LogLevel.INFO,
    purgeOnStart: true,
    persistStorage: false,
    storageClientOptions: {
        persistStorage: false,
        writeMetadata: false,
    },
    memoryMbytes: 14000,
    availableMemoryRatio: 1,
    headless: true,
})
export const logicimmoConfig = new Configuration({
    logLevel: LogLevel.INFO,
    purgeOnStart: true,
    persistStorage: false,
    storageClientOptions: {
        persistStorage: false,
        writeMetadata: false,
    },
    memoryMbytes: 14000,
    availableMemoryRatio: 1,
    headless: true
})