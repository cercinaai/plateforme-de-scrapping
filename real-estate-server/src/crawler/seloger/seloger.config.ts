import { BrowserName, Configuration, DeviceCategory, LogLevel, OperatingSystemsName, } from "crawlee";


export const selogerConfig = new Configuration({
    logLevel: LogLevel.ERROR,
    persistStorage: false,
    storageClientOptions: {
        localDataDirecotry: './seloger-storage',
        persistStorage: false,
        writeMetadata: false,
    },
    headless: true
})

export const selogerCrawlerOptions = {
    useSessionPool: true,
    persistCookiesPerSession: true,
    maxRequestRetries: 3,
    maxSessionRotations: 3,
    retryOnBlocked: true,
    sameDomainDelaySecs: 0,
    browserPoolOptions: {
        useFingerprints: true,
        fingerprintOptions: {
            fingerprintGeneratorOptions: {
                browsers: [{
                    name: BrowserName.firefox,
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