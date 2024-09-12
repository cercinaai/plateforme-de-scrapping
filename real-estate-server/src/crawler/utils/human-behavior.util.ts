import { PlaywrightCrawlingContext } from "crawlee";
import { createCursor } from "ghost-cursor-playwright";
import { Page } from "playwright";

export const scrollToTargetHumanWay = async (context: PlaywrightCrawlingContext, target: number) => {
    // BEGIN SCROLL ONLY IF COOKIE MODAL IS CLOSED
    let { page } = context;
    if (!target) {
        target = await page.evaluate(() => window.innerHeight);
    };
    let currentScrollY = await page.evaluate(() => window.scrollY);
    const cursor = await createCursor(page);

    while (currentScrollY < target) {
        // Random small scroll step to mimic human behavior
        const scrollStep = Math.floor(Math.random() * 100) + 50;

        // Scroll by a small amount and update the cursor
        await cursor.actions.randomMove();
        await page.evaluate((step) => {
            window.scrollTo({ behavior: 'smooth', top: window.scrollY + step }); // Scroll down by the step amount
        }, scrollStep);

        // Wait for a short period to simulate human scroll pauses
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 200 + 200)); // 200 to 400ms pause

        // Update the current scroll position
        currentScrollY = await page.evaluate(() => window.scrollY);

        // Stop scrolling if we exceed the target
        if (currentScrollY >= target) {
            break;
        }
    }
}