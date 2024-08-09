import { BrowserName, Configuration, DeviceCategory, LogLevel, OperatingSystemsName, PlaywrightCrawlerOptions, } from "crawlee";
import { chromium } from "playwright-extra";
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha';

export const selogerConfig = new Configuration({
    logLevel: LogLevel.ERROR,
    persistStorage: false,
    storageClientOptions: {
        persistStorage: false,
        writeMetadata: false,
    },
    headless: true
})

export const selogerCrawlerOptions: PlaywrightCrawlerOptions = {
    launchContext: {
        launcher: chromium.use(stealthPlugin())
    },
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