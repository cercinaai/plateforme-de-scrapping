import { BrowserName, Configuration, DeviceCategory, LogLevel, OperatingSystemsName, } from "crawlee";


export const selogerConfig = new Configuration({
    logLevel: LogLevel.INFO,
    persistStorage: false,
    storageClientOptions: {
        persistStorage: false,
        writeMetadata: false,
    },
    headless: false
})

export const selogerCrawlerOptions = {
    useSessionPool: true,
    persistCookiesPerSession: true,
    maxRequestRetries: 3,
    maxSessionRotations: 3,
    retryOnBlocked: true,
    browserPoolOptions: {
        useFingerprints: true,
        fingerprintOptions: {
            fingerprintGeneratorOptions: {
                browsers: [{
                    name: BrowserName.chrome,
                    minVersion: 96,
                }],
                devices: [
                    DeviceCategory.desktop,
                ],
                operatingSystems: [
                    OperatingSystemsName.windows,
                ],
            },
        },
    },
} 