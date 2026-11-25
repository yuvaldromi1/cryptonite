// ===== MAIN.JS - דף הבית =====
// לוגיקה ראשית של דף index.html - משתמש במודולים בלבד

import { MAX_WATCHLIST } from './constants.js';
import { loadWatchlist } from './storage.js';
import { fetchAllMarketData, fetchAdditionalCurrencies } from './api.js';
import { renderCoinsGrid, showMessage } from './domUtils.js';
import { attachHomePageListeners, attachCardListeners } from './events.js';
import { createRetryButton } from './utils.js';

// ===== DOM Elements =====
const coinsGrid = document.getElementById("coinsGrid");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const clearBtn = document.getElementById("clearBtn");
const maxWatchlistDialog = document.getElementById("maxWatchlistDialog");
const maxWatchlistClose = document.getElementById("maxWatchlistClose");
const maxWatchlistConfirm = document.getElementById("maxWatchlistConfirm");

// ===== Global State =====
const state = {
    allCoins: [],
    cache: {},
};

/**
 * עדכון מחוון המטבעות שנבחרו
 */
export function updateWatchlistCounter() {
    const watchlist = loadWatchlist();
    const counter = document.getElementById('watchlistCounter');
    if (counter) {
        counter.textContent = `${watchlist.length}/${MAX_WATCHLIST}`;

        // שינוי צבע לפי מצב
        if (watchlist.length === MAX_WATCHLIST) {
            counter.style.color = '#ff6b6b';
        } else if (watchlist.length > 0) {
            counter.style.color = '#39ff14';
        } else {
            counter.style.color = '#a0b4c9';
        }
    }
}

// ===== Initialize =====
async function init() {
    console.log(`🚀 Initializing Cryptonite app...`);
    console.log(`🌍 Current URL: ${window.location.href}`);
    console.log(`📁 Page title: ${document.title}`);

    // Check DOM elements
    if (!coinsGrid) {
        console.error(`❌ coinsGrid element not found! Make sure there's an element with id="coinsGrid"`);
        console.error(`Available elements with 'coin' in ID:`, Array.from(document.querySelectorAll('[id*="coin"]')));
        return;
    }
    console.log(`✅ coinsGrid element found:`, coinsGrid);

    initParallax();

    // עדכון מחוון ראשוני
    updateWatchlistCounter();

    const elements = {
        searchBtn,
        searchInput,
        clearBtn,
        maxWatchlistDialog,
        maxWatchlistClose,
        maxWatchlistConfirm,
    };

    attachHomePageListeners(elements, state, renderAllCoins);
    await loadCoins();
}

// ===== Load All Coins =====
async function loadCoins(retryCount = 0) {
    const maxRetries = 7;

    try {
        console.log(`Attempt ${retryCount + 1}/${maxRetries} fetching coins...`);

        showMessage(coinsGrid, `⏳ Loading coins (attempt ${retryCount + 1}/${maxRetries})...`, 'loading');

        const data = await fetchAllMarketData((progress) => {
            const progressMessage = `⏳ Loading coins (${progress.toFixed(0)}% complete)... attempt ${retryCount + 1}/${maxRetries}`;
            showMessage(coinsGrid, progressMessage, 'loading');
            console.log(`Progress: ${progress.toFixed(0)}%`);
        });

        console.log(`📊 First coin sample:`, data[0]);
        console.log(`📊 Data structure check:`, {
            hasId: !!data[0]?.id,
            hasName: !!data[0]?.name,
            hasSymbol: !!data[0]?.symbol,
            hasImage: !!data[0]?.image,
            hasPrice: !!data[0]?.current_price
        });

        state.allCoins = data;

        // Store USD prices in cache
        data.forEach((coin) => {
            state.cache[coin.id] = {
                name: coin.name,
                usd: coin.current_price || 0,
                eur: 0,
                ils: 0,
                image: coin.image,
            };
        });

        renderAllCoins(data);
        console.log(`✅ Successfully loaded ${data.length} coins`);
        console.log(`✅ Rendered ${data.length} coin cards to the grid`);

        // Fetch EUR/ILS in background
        setTimeout(async () => {
            const coinIds = data.map(c => c.id);
            const additionalData = await fetchAdditionalCurrencies(coinIds);

            // Update cache with EUR/ILS
            Object.keys(additionalData).forEach((coinId) => {
                if (state.cache[coinId]) {
                    state.cache[coinId].eur = additionalData[coinId]?.eur || 0;
                    state.cache[coinId].ils = additionalData[coinId]?.ils || 0;
                }
            });
        }, 4000);

    } catch (error) {
        console.warn(`Fetch attempt ${retryCount + 1} failed:`, error.message);

        if (retryCount < maxRetries) {
            const delayMs = 1500 + (retryCount * 500);
            setTimeout(() => loadCoins(retryCount + 1), delayMs);
        } else {
            const errorContainer = document.createElement('div');
            errorContainer.style.cssText = 'text-align: center; padding: 40px; color: #ff6b6b;';
            errorContainer.innerHTML = `
                <h3 style="color: #ff6b6b; margin-bottom: 20px;">⚠️ Connection Failed</h3>
                <p>Failed to load coins after ${maxRetries} attempts.</p>
                <br/>
                <strong>Possible solutions:</strong><br/>
                • Check your internet connection<br/>
                • Refresh the page (F5)<br/>
                • Try again in a few minutes<br/>
                • Check if CoinGecko API is available
            `;

            const retryButton = createRetryButton(() => {
                console.log('🔄 User clicked retry button');
                loadCoins(0); // Start fresh
            });

            errorContainer.appendChild(retryButton);
            coinsGrid.innerHTML = '';
            coinsGrid.appendChild(errorContainer);
        }
    }
}

// ===== Render All Coins =====
function renderAllCoins(coins) {
    console.log(`🎨 Rendering ${coins.length} coins to grid...`);
    const watchlist = loadWatchlist();
    console.log(`📋 Current watchlist has ${watchlist.length} coins`);

    renderCoinsGrid(coinsGrid, coins, watchlist);
    attachCardListeners(state, renderAllCoins);

    console.log(`✅ Grid rendered with ${document.querySelectorAll('.coin-card').length} cards`);
}

// ===== Parallax Effect =====
function initParallax() {
    const parallaxHero = document.querySelector(".parallax-hero");
    if (!parallaxHero) return;

    const parallaxBg = parallaxHero.querySelector(".parallax-bg");
    const parallaxGrid = parallaxHero.querySelector(".parallax-grid");
    const parallaxGlow = parallaxHero.querySelector(".parallax-glow");
    const parallaxTitle = document.getElementById("parallaxTitle");
    const parallaxCoins = parallaxHero.querySelectorAll(".floating-coin");

    parallaxCoins.forEach((coin, index) => {
        const depth = 0.55 + index * 0.25;
        coin.dataset.depth = depth.toString();
    });

    let pointerX = 0;
    let pointerY = 0;
    let rafId = null;

    function scheduleParallaxUpdate() {
        if (rafId !== null) return;
        rafId = requestAnimationFrame(() => {
            rafId = null;
            runParallaxUpdate();
        });
    }

    function runParallaxUpdate() {
        const rect = parallaxHero.getBoundingClientRect();
        const windowHeight = window.innerHeight || 1;
        const visibleProgress = Math.max(0, Math.min(1, (windowHeight - rect.top) / (windowHeight + rect.height)));

        const pointerOffsetX = pointerX * 30;
        const pointerOffsetY = pointerY * 20;

        if (parallaxBg) {
            parallaxBg.style.transform = `translateZ(-100px) scale(1.1) translateY(${visibleProgress * -80}px)`;
        }

        if (parallaxGrid) {
            parallaxGrid.style.transform = `translateY(${visibleProgress * 40}px)`;
        }

        if (parallaxGlow) {
            parallaxGlow.style.transform = `translateY(${visibleProgress * -50}px) scale(${1 + visibleProgress * 0.08})`;
        }

        if (parallaxTitle) {
            const titleOffset = visibleProgress * -25 + pointerOffsetY * 0.6;
            parallaxTitle.style.transform = `translateY(${titleOffset}px)`;
        }

        if (parallaxCoins.length) {
            parallaxCoins.forEach((coin) => {
                const depth = parseFloat(coin.dataset.depth || "1");
                const translateY = visibleProgress * depth * -55 + pointerOffsetY * depth;
                const translateX = pointerOffsetX * depth;
                const rotateX = visibleProgress * depth * 12 + pointerY * depth * 20;
                const rotateY = visibleProgress * depth * -10 + pointerX * depth * 30;
                const translateZ = depth * 40;

                coin.style.transform = `translate3d(${translateX}px, ${translateY}px, ${translateZ}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            });
        }
    }

    function handlePointerMove(event) {
        const rect = parallaxHero.getBoundingClientRect();
        pointerX = ((event.clientX - rect.left) / rect.width) - 0.5;
        pointerY = ((event.clientY - rect.top) / rect.height) - 0.5;
        scheduleParallaxUpdate();
    }

    function handlePointerLeave() {
        pointerX = 0;
        pointerY = 0;
        scheduleParallaxUpdate();
    }

    window.addEventListener("scroll", scheduleParallaxUpdate, { passive: true });
    window.addEventListener("resize", scheduleParallaxUpdate);
    parallaxHero.addEventListener("pointermove", handlePointerMove, { passive: true });
    parallaxHero.addEventListener("pointerleave", handlePointerLeave, { passive: true });

    scheduleParallaxUpdate();
}

// ===== Public API (for reports.js if needed) =====
window.Cryptonite = {
    getWatchlist: () => loadWatchlist(),
};

// ===== Start App =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔥 DOM loaded, starting Cryptonite...');
    init();
});
