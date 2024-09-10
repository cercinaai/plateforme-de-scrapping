import { PlaywrightCrawlingContext } from "crawlee"
import { detectDataDomeCaptcha } from "./captcha.detect";
import { parseCookieString } from './cookies.util';
import axios from "axios";

export const bypassDataDomeCaptchaByCapSolver = async (context: PlaywrightCrawlingContext) => {
    const { page, request, proxyInfo, log, browserController } = context;
    await page.waitForLoadState('networkidle');
    const captcha_detection = await detectDataDomeCaptcha(context, { proxy_rotation: true });
    if (typeof captcha_detection === 'boolean' && captcha_detection === false) return;
    if (typeof captcha_detection === 'boolean' && captcha_detection === true) throw new Error('Session flagged. Switching to new session');
    log.info('Attempting to solve dataDome CAPTCHA using CapSolver.');
    const fingerprint = browserController.launchContext.fingerprint.fingerprint;
    const playload = {
        clientKey: process.env.CAPSOLVER_API_KEY,
        task: {
            type: 'DatadomeSliderTask',
            websiteURL: request.url,
            captchaUrl: captcha_detection,
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
                log.info('Solved dataDome CAPTCHA using CapSolver');
                const cookie = parseCookieString(taskRes.data.solution.cookie);
                await page.context().addCookies([cookie]);
                await page.reload({ waitUntil: 'networkidle' });
                return;
            }
            if (status === "failed" || taskRes.data.errorId) {
                console.log(taskRes.data);
                throw new Error(taskRes.data.errorMessage)
            };
        }
    } catch (error) {
        console.log(error);
    }
}


export const bypassDataDomeCaptchaBy2Captcha = async () => { }