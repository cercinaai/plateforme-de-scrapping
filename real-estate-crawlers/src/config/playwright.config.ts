// @ts-nocheck
import { BrowserName, DeviceCategory, OperatingSystemsName, PlaywrightCrawlerOptions } from "crawlee";
import { firefox } from "playwright";

export const boncoinCrawlerOption: PlaywrightCrawlerOptions = {
    launchContext: {
        launcher: firefox,
        launchOptions: {
            ignoreHTTPSErrors: true,
            firefoxUserPrefs: {
                "media.peerconnection.enabled": false
            },
            timezoneId: 'Europe/Paris',
        },
    },
    sessionPoolOptions: {
        blockedStatusCodes: [],
    },
    requestHandlerTimeoutSecs: 7200,
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
    maxSessionRotations: Infinity,
    maxRequestRetries: 100,
}

export const selogerCrawlerOptions: PlaywrightCrawlerOptions = {
    launchContext: {
        launcher: firefox,
        launchOptions: {
            ignoreHTTPSErrors: true,
            firefoxUserPrefs: {
                "media.peerconnection.enabled": false
            },
            timezoneId: 'Europe/Paris',
        },
    },
    sessionPoolOptions: {
        blockedStatusCodes: [],
    },
    requestHandlerTimeoutSecs: 7200,
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
    maxSessionRotations: Infinity,
    maxRequestRetries: 100,
}

export const bieniciCrawlerOption: PlaywrightCrawlerOptions = {
    browserPoolOptions: {
        useFingerprints: true,
        fingerprintOptions: {
            fingerprintGeneratorOptions: {
                screen: { maxHeight: 2000, maxWidth: 1920, minWidth: 1920, minHeight: 800 },
                browsers: [{ name: BrowserName.chrome, httpVersion: '2' }],
                devices: [DeviceCategory.desktop],
                operatingSystems: [OperatingSystemsName.windows],
                locales: ['fr-FR'],
            }
        }
    },

    useSessionPool: true,
    persistCookiesPerSession: true,
    maxRequestRetries: 100,
    retryOnBlocked: true,
}

export const logicimmoCrawlerOption: PlaywrightCrawlerOptions = {
    launchContext: {
        launcher: firefox,
        launchOptions: {
            firefoxUserPrefs: {
                "media.peerconnection.enabled": false
            },
            timezoneId: 'Europe/Paris',
        },
    },
    requestHandlerTimeoutSecs: 1600,
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
    maxSessionRotations: Infinity,
    maxRequestRetries: 100,
}