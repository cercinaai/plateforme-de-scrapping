import type { PlaywrightCrawlingContext } from "crawlee";
import { parseCookieString } from './cookies.util';
import { detectDataDomeCaptcha } from "./captcha.detect";

export const bypassDataDomeCaptchaByCapSolver = async (context: PlaywrightCrawlingContext, captchaUrl: string) => {
    const { page, request, proxyInfo, log, browserController } = context;
    const fingerprint = browserController.launchContext.fingerprint?.fingerprint;
    log.info('Attempting to solve dataDome CAPTCHA using CapSolver.');
    const playload = {
        clientKey: process.env.CAPSOLVER_API_KEY,
        task: {
            type: 'DatadomeSliderTask',
            websiteURL: request.url,
            captchaUrl,
            proxy: `${proxyInfo?.hostname}:${proxyInfo?.port}`,
            userAgent: fingerprint?.navigator.userAgent
        }
    }
    try {
        const createTask = await fetch('https://api.capsolver.com/createTask', {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(playload)
        });
        const createTaskRes = await createTask.json();
        const task_id = createTaskRes.taskId;
        if (!task_id) throw new Error('Failed to create CapSolver task');
        while (true) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const getResultPayload = { clientKey: process.env.CAPSOLVER_API_KEY, taskId: task_id };
            const getTask = await fetch("https://api.capsolver.com/getTaskResult", {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(getResultPayload)
            });
            const taskRes = await getTask.json();
            const status = taskRes.status;
            if (status === "processing") continue;
            if (status === "ready") {
                log.info('CAPTCHA bypassed. Reloading page.');
                const cookie = parseCookieString(taskRes.solution.cookie);
                await page.context().addCookies([cookie]);
                await page.reload({ waitUntil: 'load' });
                await page.waitForTimeout(2000);
                await detectDataDomeCaptcha(context);
                return;
            }
            if (status === "failed") {
                log.error(`CAPSOLVER CAPTCHA bypass failed. ${taskRes.errorDescription}`);
                if (taskRes.data.errorDescription.includes('Failed to solve the captcha')) return bypassDataDomeCaptchaBy2Captcha(context, captchaUrl);
                throw new Error(taskRes.errorDescription);
            };
        }
    } catch (error) {
        throw error;
    }
}


export const bypassDataDomeCaptchaBy2Captcha = async (context: PlaywrightCrawlingContext, captchaUrl: string) => {
    const { page, request, proxyInfo, log, browserController } = context;
    log.info('Attempting to solve dataDome CAPTCHA using 2Captcha.');
    const fingerprint = browserController.launchContext.fingerprint?.fingerprint;
    const playload = {
        clientKey: process.env.TWO_CAPTCHA_API_KEY,
        task: {
            type: "DataDomeSliderTask",
            websiteURL: request.url,
            captchaUrl,
            userAgent: fingerprint?.navigator.userAgent,
            proxyType: 'http',
            proxyAddress: proxyInfo?.hostname,
            proxyPort: parseInt(proxyInfo?.port as string)
        }
    }
    try {
        const create_task = await fetch('https://api.2captcha.com/createTask', {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(playload)
        });
        const createTaskRes = await create_task.json();
        const task_id = createTaskRes.taskId;
        if (!task_id) throw new Error('Failed to create 2Captcha task');
        while (true) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            const getResultPayload = { clientKey: process.env.TWO_CAPTCHA_API_KEY, taskId: task_id };
            const getTask = await fetch("https://api.2captcha.com/getTaskResult", {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(getResultPayload)
            });
            const taskRes = await getTask.json();
            const status = taskRes.status;
            if (status === "processing") continue;
            if (status === "ready") {
                log.info('CAPTCHA bypassed. Reloading page.');
                const cookie = parseCookieString(taskRes.solution.cookie);
                await page.context().addCookies([cookie]);
                await page.reload({ waitUntil: 'load' });
                await page.waitForTimeout(2000);
                await detectDataDomeCaptcha(context);
                return;
            }
            if (taskRes.data.errorId) {
                log.error(`TWO CAPTCHA bypass failed. ${taskRes.errorDescription}`);
                throw new Error(taskRes.errorDescription);
            };
        }
    } catch (error) {
        throw error;
    }
}