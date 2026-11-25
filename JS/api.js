// ===== Live CoinGecko API Integration =====
// Real-time cryptocurrency data from CoinGecko API

import {
    API_BASE_URL,
    CG_API_KEY,
    CG_DEMO_KEY,
    CG_API_HEADER,
    MAX_FETCH_RETRIES,
    BASE_RETRY_DELAY
} from './constants.js';

console.log(`🌐 Using live CoinGecko API`);
console.log(`🔑 API Key configured: ${CG_API_KEY ? 'YES' : 'NO'}`);

// ===== API Authentication Mode =====
let cgAuthMode = CG_API_KEY ? "user" : (CG_DEMO_KEY ? "demo" : "none");

// ===== Rate Limiting Prevention =====
let lastApiCall = 0;
const MIN_API_INTERVAL = 1000; // Minimum 1 second between API calls

/**
 * פונקציה עוזרת להמתנה
 * @param {number} ms - מילישניות
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * מבטיח הפסקה מינימלית בין קריאות API
 */
async function rateLimitGuard() {
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCall;
    
    if (timeSinceLastCall < MIN_API_INTERVAL) {
        const waitTime = MIN_API_INTERVAL - timeSinceLastCall;
        console.log(`⏳ Rate limit guard: waiting ${waitTime}ms...`);
        await sleep(waitTime);
    }
    
    lastApiCall = Date.now();
}

/**
 * CoinGecko API fetch with authentication and retry logic
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @param {boolean} allowFallback - Whether to try fallback authentication
 * @returns {Promise<Response>}
 */
async function cgFetch(url, options = {}, allowFallback = true) {
    // Apply rate limiting guard
    await rateLimitGuard();
    
    const headers = { ...options.headers };

    // Add authentication header based on current mode
    if (cgAuthMode === "user" && CG_API_KEY) {
        headers[CG_API_HEADER] = CG_API_KEY;
    } else if (cgAuthMode === "demo" && CG_DEMO_KEY) {
        headers[CG_API_HEADER] = CG_DEMO_KEY;
    }

    try {
        console.log(`🌐 API Request: ${url}`);
        const response = await fetch(url, { ...options, headers });

        // Handle authentication failures
        if (response.status === 401 && allowFallback) {
            if (cgAuthMode === "user" && CG_DEMO_KEY) {
                console.warn("⚠️ User API key rejected, falling back to demo key");
                cgAuthMode = "demo";
                return cgFetch(url, options, false);
            }

            if (cgAuthMode !== "none") {
                console.warn("⚠️ API key rejected, continuing without authentication");
                cgAuthMode = "none";
                return cgFetch(url, options, false);
            }
        }

        // Handle rate limiting
        if (response.status === 429) {
            console.warn(`⚠️ Rate limited (429), will be handled by caller`);
        }

        return response;
    } catch (error) {
        console.error(`❌ Network error:`, error);
        throw error;
    }
}

/**
 * שליפת רשימת מטבעות עם retry logic
 * @param {number} perPage - כמות מטבעות בעמוד
 * @param {number} page - מספר העמוד
 * @returns {Promise<Array>}
 */
export async function fetchMarketPage(perPage = 20, page = 1) {
    const params = new URLSearchParams({
        vs_currency: "usd",
        order: "market_cap_desc",
        per_page: String(perPage),
        page: String(page),
        sparkline: "false",
        price_change_percentage: "1h,24h,7d"
    });

    const url = `${API_BASE_URL}/coins/markets?${params.toString()}`;

    for (let attempt = 1; attempt <= MAX_FETCH_RETRIES; attempt++) {
        try {
            console.log(`📡 Fetching market data (attempt ${attempt}/${MAX_FETCH_RETRIES})...`);

            const response = await cgFetch(url, {
                signal: AbortSignal.timeout(15000)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`✅ Fetched ${data.length} coins successfully`);
            return data;

        } catch (error) {
            console.warn(`⚠️ Attempt ${attempt} failed:`, error.message);

            if (attempt === MAX_FETCH_RETRIES) {
                throw new Error(`Failed to fetch market data after ${MAX_FETCH_RETRIES} attempts: ${error.message}`);
            }

            // Wait before retry with exponential backoff
            const delay = BASE_RETRY_DELAY * Math.pow(2, attempt - 1);
            console.log(`⏳ Retrying in ${delay}ms...`);
            await sleep(delay);
        }
    }
}

/**
 * שליפת כל נתוני השוק עבור הדף הראשי
 * @param {Function} onProgress - callback לדיווח התקדמות (אופציונלי)
 * @returns {Promise<Array>}
 */
export async function fetchAllMarketData(onProgress = null) {
    console.log(`🌐 Starting live API fetch for market data...`);
    console.log(`🔑 Using API Key: ${CG_API_KEY}`);
    console.log(`📡 API Base URL: ${API_BASE_URL}`);

    try {
        if (onProgress) onProgress(25);

        console.log(`📊 Fetching first 20 coins...`);
        // Fetch first 20 coins
        const data = await fetchMarketPage(20, 1);

        console.log(`✅ Raw API response received:`, {
            dataLength: data?.length,
            firstCoin: data?.[0],
            dataType: typeof data
        });

        if (onProgress) onProgress(100);

        console.log(`🎯 Live market data loaded: ${data.length} coins`);
        return data;

    } catch (error) {
        console.error(`❌ Failed to load live market data:`, error);
        throw new Error(`Failed to load market data: ${error.message}`);
    }
}

/**
 * שליפת מחירים במטבעות נוספים (EUR, ILS)
 * @param {Array<string>} coinIds - מערך של מזהי מטבעות
 * @returns {Promise<Object>} - אובייקט עם מחירים לפי coinId
 */
export async function fetchAdditionalCurrencies(coinIds) {
    console.log(`💱 Loading additional currencies for ${coinIds.length} coins...`);

    try {
        const params = new URLSearchParams({
            ids: coinIds.join(','),
            vs_currencies: 'eur,ils'
        });

        const url = `${API_BASE_URL}/simple/price?${params.toString()}`;
        const response = await cgFetch(url, { signal: AbortSignal.timeout(10000) });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        // Transform data to expected format
        const results = {};
        Object.keys(data).forEach(coinId => {
            results[coinId] = {
                eur: data[coinId].eur || 0,
                ils: data[coinId].ils || 0
            };
        });

        console.log(`✅ Additional currencies loaded for ${Object.keys(results).length} coins`);
        return results;

    } catch (error) {
        console.error(`❌ Failed to load additional currencies:`, error);
        return {};
    }
}

/**
 * שליפת פרטי מטבע בודד עבור More Info
 * @param {string} coinId - מזהה המטבע
 * @returns {Promise<Object>}
 */
export async function fetchCoinDetails(coinId) {
    console.log(`🔍 Loading details for coin: ${coinId}`);

    try {
        const params = new URLSearchParams({
            localization: 'false',
            tickers: 'false',
            market_data: 'true',
            community_data: 'false',
            developer_data: 'false',
            sparkline: 'false'
        });

        const url = `${API_BASE_URL}/coins/${coinId}?${params.toString()}`;
        const response = await cgFetch(url, { signal: AbortSignal.timeout(12000) });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log(`✅ Details loaded for ${coinId}`);
        return data;

    } catch (error) {
        console.error(`❌ Failed to load details for ${coinId}:`, error);
        throw new Error(`Failed to load coin details: ${error.message}`);
    }
}

/**
 * שליפת נתוני מחירים עבור watchlist (עמוד הדוחות)
 * @param {Array<string>} coinIds - מערך של מזהי מטבעות
 * @returns {Promise<Object>}
 */
export async function fetchWatchlistData(coinIds) {
    console.log(`📊 Loading live watchlist data for ${coinIds.length} coins...`);

    if (!coinIds || coinIds.length === 0) {
        console.log(`⚠️ No coins to fetch, returning empty object`);
        return {};
    }

    try {
        // Use only markets endpoint to reduce API calls and avoid rate limiting
        const params = new URLSearchParams({
            ids: coinIds.join(','),
            vs_currency: 'usd',
            order: 'market_cap_desc',
            per_page: coinIds.length,
            page: 1,
            sparkline: 'false',
            price_change_percentage: '1h,24h,7d',
            locale: 'en'
        });

        const url = `${API_BASE_URL}/coins/markets?${params.toString()}`;
        console.log(`🌐 Single API call to avoid rate limiting: ${url}`);
        
        const response = await cgFetch(url, { signal: AbortSignal.timeout(15000) });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const marketData = await response.json();
        console.log(`✅ Received market data for ${marketData.length} coins`);

        // Convert to expected format for reports
        const results = {};
        marketData.forEach(market => {
            if (market && market.id) {
                results[market.id] = {
                    id: market.id,
                    symbol: market.symbol || market.id,
                    name: market.name || market.id,
                    image: market.image || '',
                    price: market.current_price || 0,
                    market_cap: market.market_cap || 0,
                    volume_24h: market.total_volume || 0,
                    ath: market.ath || 0,
                    athChangePercentage: market.ath_change_percentage || 0,
                    price_change_percentage_1h: market.price_change_percentage_1h_in_currency || 0,
                    price_change_percentage_24h: market.price_change_percentage_24h || 0,
                    price_change_percentage_7d: market.price_change_percentage_7d_in_currency || 0,
                    change1h: market.price_change_percentage_1h_in_currency || 0,
                    change24h: market.price_change_percentage_24h || 0,
                    change7d: market.price_change_percentage_7d_in_currency || 0,
                    rank: market.market_cap_rank || 0
                };
            }
        });

        console.log(`✅ Live watchlist data loaded for ${Object.keys(results).length} coins`);
        return results;

    } catch (error) {
        console.error(`❌ Failed to load live watchlist data:`, error);
        
        // If rate limited, wait and try once more
        if (error.message.includes('429')) {
            console.log(`⏳ Rate limited, waiting 3 seconds before retry...`);
            await sleep(3000);
            
            try {
                const retryParams = new URLSearchParams({
                    ids: coinIds.join(','),
                    vs_currency: 'usd',
                    order: 'market_cap_desc',
                    per_page: coinIds.length,
                    page: 1,
                    sparkline: 'false'
                });

                const retryUrl = `${API_BASE_URL}/coins/markets?${retryParams.toString()}`;
                const retryResponse = await cgFetch(retryUrl, { signal: AbortSignal.timeout(20000) });
                
                if (retryResponse.ok) {
                    const retryData = await retryResponse.json();
                    console.log(`✅ Retry successful: ${retryData.length} coins`);
                    
                    const retryResults = {};
                    retryData.forEach(market => {
                        if (market && market.id) {
                            retryResults[market.id] = {
                                id: market.id,
                                symbol: market.symbol || market.id,
                                name: market.name || market.id,
                                image: market.image || '',
                                price: market.current_price || 0,
                                market_cap: market.market_cap || 0,
                                volume_24h: market.total_volume || 0,
                                ath: market.ath || 0,
                                athChangePercentage: market.ath_change_percentage || 0,
                                change1h: 0,
                                change24h: market.price_change_percentage_24h || 0,
                                change7d: 0,
                                rank: market.market_cap_rank || 0
                            };
                        }
                    });
                    
                    return retryResults;
                }
            } catch (retryError) {
                console.error(`❌ Retry also failed:`, retryError);
            }
        }
        
        throw new Error(`Failed to load watchlist data: ${error.message}`);
    }
}

/**
 * שליפת נתוני גרף (Chart Data)
 * @param {string} coinId - מזהה המטבע
 * @param {number} days - מספר ימים (1, 7, 30, 90, 365)
 * @returns {Promise<Object>}
 */
export async function fetchCoinChartData(coinId, days = 7) {
    console.log(`📈 Loading chart data for ${coinId} (${days} days)...`);

    try {
        const params = new URLSearchParams({
            vs_currency: 'usd',
            days: String(days),
            interval: days <= 1 ? 'hourly' : 'daily'
        });

        const url = `${API_BASE_URL}/coins/${coinId}/market_chart?${params.toString()}`;
        const response = await cgFetch(url, { signal: AbortSignal.timeout(15000) });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log(`✅ Chart data loaded for ${coinId}`);
        return data;

    } catch (error) {
        console.error(`❌ Failed to load chart data for ${coinId}:`, error);
        throw new Error(`Failed to load chart data: ${error.message}`);
    }
}