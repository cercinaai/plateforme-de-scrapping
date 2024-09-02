import { Configuration, LogLevel } from "crawlee";

export const boncoinConfig = new Configuration({
    logLevel: LogLevel.INFO,
    purgeOnStart: true,
    persistStorage: false,
    storageClientOptions: {
        persistStorage: false,
        writeMetadata: false,
    },
    memoryMbytes: 15336,
    availableMemoryRatio: 0.8,
    headless: true,
})
export const selogerConfig = new Configuration({
    logLevel: LogLevel.INFO,
    purgeOnStart: true,
    persistStorage: false,
    storageClientOptions: {
        persistStorage: false,
        writeMetadata: false,
        writeContent: false,
    },
    memoryMbytes: 15336,
    availableMemoryRatio: 0.8,
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
    memoryMbytes: 15336,
    availableMemoryRatio: 0.8,
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
    memoryMbytes: 15336,
    availableMemoryRatio: 0.8,
    headless: true
})