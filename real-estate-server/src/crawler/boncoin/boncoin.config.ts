import { BrowserName, Configuration, DeviceCategory, LogLevel, OperatingSystemsName, PlaywrightCrawlerOptions, } from "crawlee";


export const boncoinConfig = new Configuration({
    logLevel: LogLevel.ERROR,
    persistStorage: false,
    storageClientOptions: {
        persistStorage: false,
        writeMetadata: false,
    },
    headless: false,
})

export const boncoinCrawlerOption: PlaywrightCrawlerOptions = {
    useSessionPool: true,
    persistCookiesPerSession: true,
    maxSessionRotations: 3,
    maxRequestRetries: 3,
    sameDomainDelaySecs: 2,
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