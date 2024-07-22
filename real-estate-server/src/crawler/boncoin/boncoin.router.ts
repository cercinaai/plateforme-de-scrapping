import { createPlaywrightRouter } from 'crawlee';


export const boncoin_router = createPlaywrightRouter();


boncoin_router.addDefaultHandler(async ({ waitForSelector, page, pushData, enqueueLinks, log }) => {
    const base_url = 'https://www.leboncoin.fr';
    await waitForSelector("script[id='__NEXT_DATA__']");
    let data = await page.$("script[id='__NEXT_DATA__']");
    let json_content = JSON.parse(await data?.textContent() as string)
    // await pushData(json_content);
    await waitForSelector("a[title='Page suivante']");
    const next_page_html = await page.$('a[title="Page suivante"]');
    const next_page = await next_page_html?.getAttribute('href');
    log.info(next_page || "NO NEXT PAGE");
    if (!next_page) return;
    await enqueueLinks({
        urls: [`${base_url}${next_page}`],
        label: 'next_page'
    });
});

boncoin_router.addHandler('next_page', async ({ waitForSelector, page, pushData, enqueueLinks, log }) => {
    const base_url = 'https://www.leboncoin.fr';
    await waitForSelector("script[id='__NEXT_DATA__']");
    let data = await page.$("script[id='__NEXT_DATA__']");
    let json_content = JSON.parse(await data?.textContent() as string)
    // await pushData(json_content);
    await waitForSelector("a[title='Page suivante']");
    const next_page_html = await page.$('a[title="Page suivante"]');
    const next_page = await next_page_html?.getAttribute('href');
    log.info(next_page || "NO NEXT PAGE");
    if (!next_page) return;
    await enqueueLinks({
        urls: [`${base_url}${next_page}`],
        label: 'next_page'
    });
});