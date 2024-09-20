import { PlaywrightCrawlingContext } from "crawlee"
import { parseCookieString } from './cookies.util';
import axios from "axios";
import { detectDataDomeCaptcha } from "./captcha.detect";

export const bypassDataDomeCaptchaByCapSolver = async (context: PlaywrightCrawlingContext, captchaUrl: string) => {
    const { page, request, proxyInfo, log, browserController } = context;
    const fingerprint = browserController.launchContext.fingerprint.fingerprint;
    log.info('Attempting to solve dataDome CAPTCHA using CapSolver.');
    const playload = {
        clientKey: process.env.CAPSOLVER_API_KEY,
        task: {
            type: 'DatadomeSliderTask',
            websiteURL: request.url,
            captchaUrl,
            proxy: `${proxyInfo.hostname}:${proxyInfo.port}`,
            userAgent: fingerprint.navigator.userAgent
        }
    }
    try {
        const createTaskRes = await axios.post('https://api.capsolver.com/createTask', playload, { headers: { "Content-Type": "application/json" } });
        const task_id = createTaskRes.data.taskId;
        if (!task_id) throw new Error('Failed to create CapSolver task');
        while (true) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const getResultPayload = { clientKey: process.env.CAPSOLVER_API_KEY, taskId: task_id };
            const taskRes = await axios.post("https://api.capsolver.com/getTaskResult", getResultPayload, { headers: { "Content-Type": "application/json" } });
            const status = taskRes.data.status;
            if (status === "ready") {
                log.info('CAPTCHA bypassed. Reloading page.');
                const cookie = parseCookieString(taskRes.data.solution.cookie);
                await page.context().addCookies([cookie]);
                await page.reload({ waitUntil: 'load' });
                await page.waitForTimeout(2000);
                await detectDataDomeCaptcha(context);
                return;
            }
            if (status === "failed" || taskRes.data.errorId) {
                console.log(taskRes.data);
                throw new Error(taskRes.data.errorMessage)
            };
        }
    } catch (error) {
        log.error(error.message);
    }
}


export const bypassDataDomeCaptchaBy2Captcha = async () => { }