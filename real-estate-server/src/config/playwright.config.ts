import { BrowserName, DeviceCategory, OperatingSystemsName, PlaywrightCrawlerOptions } from "crawlee";
import { chromium, firefox } from "playwright-extra";
import stealthPlugin from 'puppeteer-extra-plugin-stealth';

export const boncoinCrawlerOption: PlaywrightCrawlerOptions = {
    launchContext: {
        launcher: firefox,
        launchOptions: {
            firefoxUserPrefs: {
                "media.peerconnection.enabled": false
            },
            timezoneId: 'Europe/Paris',
        },
    },
    sessionPoolOptions: {
        blockedStatusCodes: [],
    },
    requestHandlerTimeoutSecs: 86400,
    browserPoolOptions: {
        useFingerprints: true,
        fingerprintOptions: {
            fingerprintGeneratorOptions: {
                screen: { maxHeight: 2000, maxWidth: 1920, minWidth: 1920, minHeight: 800 },
                browsers: [{ name: BrowserName.chrome, httpVersion: '2' }],
                devices: [DeviceCategory.desktop],
                operatingSystems: [OperatingSystemsName.windows],
                locales: ['fr-FR'],
            },
        }
    },
    useSessionPool: true,
    persistCookiesPerSession: true,
    maxSessionRotations: 10,
    maxRequestRetries: 10,
}

export const selogerCrawlerOptions: PlaywrightCrawlerOptions = {
    launchContext: {
        launcher: firefox,
        launchOptions: {
            firefoxUserPrefs: {
                "media.peerconnection.enabled": false
            },
            timezoneId: 'Europe/Paris',
        },
    },
    requestHandlerTimeoutSecs: 86400,
    sessionPoolOptions: {
        blockedStatusCodes: [],
    },
    browserPoolOptions: {
        useFingerprints: true,
        fingerprintOptions: {
            fingerprintGeneratorOptions: {
                screen: { maxHeight: 2000, maxWidth: 1920, minWidth: 1920, minHeight: 800 },
                browsers: [{ name: BrowserName.chrome, httpVersion: '2' }],
                devices: [DeviceCategory.desktop],
                operatingSystems: [OperatingSystemsName.windows],
                locales: ['fr-FR'],
            },
        }
    },
    useSessionPool: true,
    persistCookiesPerSession: true,
    maxSessionRotations: 10,
    maxRequestRetries: 10,
}

export const bieniciCrawlerOption: PlaywrightCrawlerOptions = {
    launchContext: {
        launcher: chromium.use(stealthPlugin()),
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

export const logicimmoCrawlerOption: PlaywrightCrawlerOptions = {
    launchContext: {
        launcher: chromium.use(stealthPlugin()),
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
    // maxConcurrency: 7,
    useSessionPool: true,
    persistCookiesPerSession: true,
    maxSessionRotations: 10,
    maxRequestRetries: 10,
    // sameDomainDelaySecs: 0.5,
    retryOnBlocked: true,
}