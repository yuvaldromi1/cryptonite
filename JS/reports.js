// ===== REPORTS.JS - דף הדוחות =====
// לוגיקה של דף Live Reports עם עדכונים בזמן אמת

import { UPDATE_INTERVAL } from './constants.js';
import { loadWatchlist } from './storage.js';
import { fetchWatchlistData } from './api.js';
import { renderTable, showNoCoinsMessage } from './domUtils.js';

// ===== DOM Elements =====
const tableBody = document.getElementById("tableBody");
const updateStatus = document.getElementById("updateStatus");

// ===== Global State =====
let coinData = {}; // Store coin data with history
let updateInterval = null;
let updateCounter = 0;

// ===== Update Status Display =====
function updateStatusDisplay(message, type = 'info') {
    if (!updateStatus) return;

    const icons = {
        info: '📡',
        success: '✅',
        loading: '⏳',
        error: '❌'
    };

    const colors = {
        info: '#39ff14',
        success: '#00ff00',
        loading: '#ffeb3b',
        error: '#ff6b6b'
    };

    updateStatus.innerHTML = `${icons[type]} ${message}`;
    updateStatus.style.color = colors[type];
}

// ===== Initialize =====
async function init() {
    // Only run on reports page
    if (!tableBody) return;

    console.log(`🚀 Initializing Live Reports page...`);

    const watchlist = loadWatchlist();
    if (watchlist.length === 0) {
        showNoCoinsMessage(tableBody);
        return;
    }

    console.log(`📋 Found ${watchlist.length} coins in watchlist`);
    await loadCoinsData(watchlist);
}

// ===== Load Coins Data =====
async function loadCoinsData(watchlist) {
    try {
        updateStatusDisplay('Loading live market data...', 'loading');
        console.log(`📊 Loading live data for ${watchlist.length} coins...`);

        const coinIds = watchlist.map(coin => coin.id);
        const freshData = await fetchWatchlistData(coinIds);

        // Update coin data structure with fresh data
        watchlist.forEach((watchCoin) => {
            const liveData = freshData[watchCoin.id];
            if (liveData) {
                coinData[watchCoin.id] = {
                    name: liveData.name,
                    symbol: liveData.symbol,
                    image: liveData.image,
                    price: liveData.price,
                    marketCap: liveData.market_cap,
                    volume24h: liveData.volume_24h,
                    ath: liveData.price * 1.5, // Simulated ATH
                    athChangePercentage: ((liveData.price - (liveData.price * 1.5)) / (liveData.price * 1.5)) * 100,
                    change1h: liveData.price_change_percentage_1h,
                    change24h: liveData.price_change_percentage_24h,
                    change7d: liveData.price_change_percentage_7d,
                    rank: liveData.rank,
                };
            } else {
                // Fallback data if live data not available
                coinData[watchCoin.id] = {
                    name: watchCoin.name,
                    symbol: watchCoin.symbol,
                    image: "",
                    price: 0,
                    marketCap: 0,
                    volume24h: 0,
                    ath: 0,
                    athChangePercentage: 0,
                    change1h: 0,
                    change24h: 0,
                    change7d: 0,
                    rank: 0,
                };
            }
        });

        renderTable(tableBody, watchlist, coinData);
        updateStatusDisplay(`Live data loaded • ${watchlist.length} coins`, 'success');
        console.log(`✅ Live data loaded and rendered`);

        // Start live updates
        startLiveUpdates(watchlist);

    } catch (error) {
        console.error(`❌ Error loading coins data:`, error);
        updateStatusDisplay('Failed to load market data', 'error');
        tableBody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 40px; color: #ff6b6b;">
                    <h3>⚠️ Failed to Load Data</h3>
                    <p>Could not load live market data</p>
                    <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #39ff14; color: #0a0e27; border: none; border-radius: 6px; cursor: pointer;">Retry</button>
                </td>
            </tr>
        `;
    }
}// ===== Start Live Updates =====
function startLiveUpdates(watchlist) {
    console.log(`🔄 Starting live updates every ${UPDATE_INTERVAL / 1000} seconds`);

    if (updateInterval) {
        clearInterval(updateInterval);
    }

    updateInterval = setInterval(async () => {
        updateCounter++;
        console.log(`🔄 Live update #${updateCounter}`);

        try {
            await updatePrices(watchlist);
        } catch (error) {
            console.warn(`⚠️ Update #${updateCounter} failed:`, error.message);
        }
    }, UPDATE_INTERVAL);
}

// ===== Update Prices =====
async function updatePrices(watchlist) {
    try {
        updateStatusDisplay('Updating prices...', 'loading');
        const coinIds = watchlist.map(coin => coin.id);
        const freshData = await fetchWatchlistData(coinIds);

        let updatedCount = 0;

        // Update existing data with new prices
        watchlist.forEach((watchCoin) => {
            const liveData = freshData[watchCoin.id];
            if (liveData && coinData[watchCoin.id]) {
                // Store old price for comparison
                const oldPrice = coinData[watchCoin.id].price;

                // Update with new data
                coinData[watchCoin.id] = {
                    ...coinData[watchCoin.id],
                    price: liveData.price,
                    marketCap: liveData.market_cap,
                    volume24h: liveData.volume_24h,
                    change1h: liveData.price_change_percentage_1h,
                    change24h: liveData.price_change_percentage_24h,
                    change7d: liveData.price_change_percentage_7d,
                    rank: liveData.rank,
                };

                updatedCount++;

                // Add visual indicator for price changes
                if (oldPrice !== liveData.price) {
                    highlightPriceChange(watchCoin.id, oldPrice < liveData.price ? 'up' : 'down');
                }
            }
        });

        // Re-render table with updated data
        renderTable(tableBody, watchlist, coinData);
        updateStatusDisplay(`Updated • ${new Date().toLocaleTimeString()}`, 'success');

        console.log(`✅ Updated ${updatedCount} coins in live table`);

    } catch (error) {
        console.error(`❌ Error updating prices:`, error);
        updateStatusDisplay('Update failed', 'error');
        throw error;
    }
}

// ===== Highlight Price Changes =====
function highlightPriceChange(coinId, direction) {
    // Add temporary visual effect to indicate price change
    const rows = tableBody.querySelectorAll('tr');
    rows.forEach(row => {
        const firstCell = row.querySelector('td');
        if (firstCell && firstCell.textContent.includes(coinId)) {
            const priceCell = row.querySelector('.price-cell');
            if (priceCell) {
                priceCell.style.transition = 'all 0.5s ease';
                priceCell.style.backgroundColor = direction === 'up' ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 0, 0, 0.2)';

                setTimeout(() => {
                    priceCell.style.backgroundColor = '';
                }, 1000);
            }
        }
    });
}

// ===== Cleanup on Page Unload =====
window.addEventListener('beforeunload', () => {
    if (updateInterval) {
        clearInterval(updateInterval);
        console.log(`🛑 Stopped live updates`);
    }
});

// ===== Start App =====
init();