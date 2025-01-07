import puppeteer, { Browser, Page } from "puppeteer";
import axios from "axios";
import { initLogger } from "../../config/logger.config";
import { CRAWLER_ORIGIN } from "../../utils/enum";
import { jobOffersModel } from "../../models/mongodb/job-offers.mongdb";
import { CrawlerSessionModel } from "../../models/mongodb/crawler-session.mongodb";
import { CrawlerConfigModel } from "../../models/mongodb/crawler-config.mongodb";

const logger = initLogger(CRAWLER_ORIGIN.FRANCE_TRAVAIL);

const createPagePool = async (browser: Browser, size: number): Promise<Page[]> => {
    const pages: Page[] = [];
    for (let i = 0; i < size; i++) {
        pages.push(await browser.newPage());
    }
    return pages;
};

const usePageFromPool = async (pool, callback) => {
    const page = pool.pop();
    try {
        await callback(page);
    } finally {
        pool.push(page);
    }
};

const processOffersInBatches = async (offers, pool, processOffer) => {
    for (let i = 0; i < offers.length; i += pool.length) {
        const batch = offers.slice(i, i + pool.length);
        await Promise.all(
            batch.map((offer) =>
                usePageFromPool(pool, (page) => processOffer(page, offer))
            )
        );
    }
};

export const start_france_travail_crawler = async (session_id: string) => {
    // Variables pour suivre les statistiques
    const stats = {
        totalRequests: 0,
        successRequests: 0,
        failedRequests: 0,
        started_at: new Date(),
    };

    const crawlerConfig = await CrawlerConfigModel.findOne({}, { franceTravail_limits: 1 });

    const existingStats = await CrawlerSessionModel.findOne(
        { _id: session_id, "crawlers_stats.origin": CRAWLER_ORIGIN.FRANCE_TRAVAIL },
        { "crawlers_stats.$": 1 }
    );

    if (!existingStats) {
        await CrawlerSessionModel.updateOne(
            { _id: session_id },
            {
                $push: {
                    crawlers_stats: {
                        origin: CRAWLER_ORIGIN.FRANCE_TRAVAIL,
                        status: "running",
                        total_data_grabbed: 0,
                        started_at: stats.started_at,
                        finished_at: null,
                        total_requests: 0,
                        success_requests: 0,
                        failed_requests: 0,
                    },
                },
            }
        );
    }
    try {
        const baseURL = "https://candidat.francetravail.fr/offres/emploi/infirmier/s36m2";
        const apiEndpoint = "https://candidat.francetravail.fr/offres/emploi.rechercheoffre:afficherplusderesultats";
        if (!crawlerConfig || !crawlerConfig.franceTravail_limits || crawlerConfig.franceTravail_limits.status !== 'active') {
            throw new Error("Configuration invalide ou inactivée pour France Travail");
        }

        const maxOffers = crawlerConfig.franceTravail_limits.nombre; 
        const offersPerPage = 20;
        const jobOffers: { id: string; link: string }[] = [];

        logger.info("Launching Puppeteer to initialize session...");
        const browser = await puppeteer.launch({ headless: true ,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
         });
        const page = await browser.newPage();
        await page.goto(baseURL, { waitUntil: "domcontentloaded" });

        // Fetch cookies for API requests
        logger.info("Fetching session cookies...");
        const cookies = await page.cookies();
        const cookieHeader = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");

        // Fetch initial offers
        logger.info("Fetching initial offers...");
        const initialOffers = await page.evaluate(() => {
            const offerElements = Array.from(document.querySelectorAll(".result"));
            return offerElements.map((offer) => {
                const id = offer.getAttribute("data-id-offre");
                return id
                    ? {
                          id,
                          link: `https://candidat.francetravail.fr/offres/recherche/detail/${id}`,
                      }
                    : null;
            }).filter((offer) => offer !== null);
        });

        stats.totalRequests += initialOffers.length;
        stats.successRequests += initialOffers.length;
        jobOffers.push(...initialOffers);
        logger.info(`Fetched ${initialOffers.length} initial offers.`);

        // Fetch additional offers using the API
        logger.info("Fetching additional offers using API...");
        let offset = offersPerPage;

        while (jobOffers.length < maxOffers) {
            const start = offset;
            const end = offset + offersPerPage - 1;

            try {
                const response = await axios.post(
                    `${apiEndpoint}/${start}-${end}/0?t:ac=infirmier/s36m2`,
                    {},
                    {
                        headers: {
                            "Content-Type": "application/json",
                            "X-Requested-With": "XMLHttpRequest",
                            Cookie: cookieHeader,
                        },
                    }
                );

                if (response.data && response.data._tapestry && response.data._tapestry.inits) {
                    const content = response.data._tapestry.inits;

                    const newOffers = content.flatMap((block) => {
                        if (Array.isArray(block) && block[3]) {
                            const id = block[3][0];
                            return id
                                ? {
                                      id,
                                      link: `https://candidat.francetravail.fr/offres/recherche/detail/${id}`,
                                  }
                                : null;
                        }
                        return [];
                    }).filter((offer) => offer !== null);

                    stats.totalRequests += newOffers.length;
                    stats.successRequests += newOffers.length;

                    jobOffers.push(...newOffers);
                    logger.info(`Fetched ${newOffers.length} offers. Total: ${jobOffers.length}`);

                    if (jobOffers.length >= maxOffers) break;
                } else {
                    logger.error("Unexpected API response structure or empty response.");
                    break;
                }

                offset += offersPerPage;
            } catch (error) {
                stats.failedRequests++;
                logger.error(`Failed to fetch offers from API for range ${start}-${end}: ${error.message}`);
            }
        }

        const pool = await createPagePool(browser, 5);

        // Process offers
        await processOffersInBatches(jobOffers.slice(0, maxOffers), pool, async (page, offer) => {
            try {
                await page.goto(offer.link, { waitUntil: "domcontentloaded", timeout: 60000 });

                const details = await page.evaluate(() => {
                    const getListItems = (selector) =>
                        Array.from(document.querySelectorAll(selector)).map((el) => el.textContent?.trim());
                    
                    const getText = (selector) => document.querySelector(selector)?.textContent?.trim() || null;
                    const getSalary = () => {
                        const dtElements = Array.from(document.querySelectorAll("dt"));
                        const salaireDt = dtElements.find((el) => el.textContent?.trim() === "Salaire");
                        if (salaireDt) {
                            const ddElement = salaireDt.nextElementSibling;
                            return ddElement?.textContent ? ddElement.textContent.trim() : null;
                        }
                        return null;
                    };

                    const getContract = () => {
                        const dtElements = Array.from(document.querySelectorAll("dt"));
                        const contratDt = dtElements.find((el) => el.textContent?.trim() === "Type de contrat");
                        if (contratDt) {
                            const ddElement = contratDt.nextElementSibling;
                            return ddElement?.textContent ? ddElement.textContent.trim() : null;
                        }
                        return null;
                    };

                    const getCompanyDetails = () => {
                        const name = getText('h3.title'); 
                        const size = getText('.description-aside p'); 
                        const description = getText('.description-aside .italic'); 
                        return { name, size, description };
                    };

                    

                    const getExperience = () => {
                        return getText("[itemprop='experienceRequirements']"); // Example selector for experience
                    };

                    const getQualification = () => {
                        const qualificationElement = document.querySelector("[itemprop='qualifications']");
                        return qualificationElement?.textContent?.trim() || null;
                    };
        
                    const getIndustry = () => {
                        const industryElement = document.querySelector("[itemprop='industry']");
                        return industryElement?.textContent?.trim() || null;
                    };



                    return {
                        title: getText('[itemprop="title"]'),
                        description: getText('[itemprop="description"]'),
                        location: getText('[itemprop="address"] [itemprop="name"]'),
                        salary: getSalary(),
                        contract: getContract(),
                        publicationDate: getText('[itemprop="datePosted"]'),
                        formation: getListItems(".skill-list .skill-default [itemprop='educationRequirements']"),
                        competences: getListItems(".skill-list .skill-competence [itemprop='skills']"),
                        savoirEtre: getListItems(".skill-list .skill-savoir .skill-name"),
                        company: getCompanyDetails(),
                        workHours: getText('[itemprop="workHours"]'),
                        experience: getExperience(),
                        qualification: getQualification(),
                        industry: getIndustry(),
                    };
                });

                // Vérifiez si `company.name` est null et ignorez l'offre si c'est le cas
                if (!details.company?.name) {
                    logger.warn(`Skipped job offer with null company name: ${offer.link}`);
                    return;
                }

                const savedOffer = await jobOffersModel.findOneAndUpdate(
                    { _id: offer.id },
                    { $set: { ...offer, ...details } },
                    { upsert: true, new: true }
                );

                const openAIResponse = await axios.post(
                    'http://annonces.mercimozart.com:3000/job-offers/process-single',
                    savedOffer.toObject()
                );

            } catch (error) {
                stats.failedRequests++;
                logger.error(`Failed to process offer ${offer.id}: ${error.message}`);
            }
        });

        // Update session stats
        await CrawlerSessionModel.updateOne(
            { _id: session_id, "crawlers_stats.origin": CRAWLER_ORIGIN.FRANCE_TRAVAIL },
            {
                $set: {
                    "crawlers_stats.$.status": "success",
                    "crawlers_stats.$.total_data_grabbed": stats.successRequests,
                    "crawlers_stats.$.finished_at": new Date(),
                    "crawlers_stats.$.total_requests": stats.totalRequests,
                    "crawlers_stats.$.success_requests": stats.successRequests,
                    "crawlers_stats.$.failed_requests": stats.failedRequests,
                },
            }
        );

        logger.info("Job offers saved successfully.");
    } catch (error) {
        logger.error("Error while scraping job offers:", error.message);

        await CrawlerSessionModel.updateOne(
            { _id: session_id, "crawlers_stats.origin": CRAWLER_ORIGIN.FRANCE_TRAVAIL },
            {
                $set: {
                    "crawlers_stats.$.status": "failed",
                    "crawlers_stats.$.error": { failedReason: error.message },
                },
            }
        );
    }
};
