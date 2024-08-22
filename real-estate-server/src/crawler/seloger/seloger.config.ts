import { BrowserName, Configuration, DeviceCategory, LogLevel, OperatingSystemsName, PlaywrightCrawlerOptions, } from "crawlee";
import { chromium } from "playwright-extra";
import stealthPlugin from 'puppeteer-extra-plugin-stealth';

export const selogerConfig = new Configuration({
    logLevel: LogLevel.ERROR,
    persistStorage: false,
    storageClientOptions: {
        persistStorage: false,
        writeMetadata: false,
        writeContent: false,
    },
    headless: true,
})

export const selogerCrawlerOptions: PlaywrightCrawlerOptions = {
    launchContext: {
        launcher: chromium.use(stealthPlugin()),
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    browserPoolOptions: {
        useFingerprints: true,
        fingerprintOptions: {
            fingerprintGeneratorOptions: {
                browsers: [{
                    name: BrowserName.chrome,
                }],
                devices: [DeviceCategory.desktop],
                operatingSystems: [OperatingSystemsName.windows],
            }
        }
    },
    useSessionPool: true,
    persistCookiesPerSession: true,
    maxSessionRotations: 10,
    maxRequestRetries: 10,
    retryOnBlocked: true,
} 