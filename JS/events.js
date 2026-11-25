// ===== ניהול אירועים (Event Handlers) =====
// כל המאזינים והטיפול באירועי משתמש

import { MAX_WATCHLIST } from './constants.js';
import { loadWatchlist, saveWatchlist } from './storage.js';
import {
    toggleModal,
    renderWatchlistRadios,
    setNewCoinName,
    updateDetailsDisplay
} from './domUtils.js';
import { fetchCoinDetails, fetchAdditionalCurrencies } from './api.js';
import { updateWatchlistCounter } from './main.js';

// ===== State Management =====
let pendingCoinToAdd = null;/**
 * מחבר את כל מאזיני האירועים של דף הבית
 * @param {Object} elements - אובייקט עם כל ה-DOM elements הנדרשים
 * @param {Object} state - אובייקט המצב הגלובלי (allCoins, cache וכו')
 * @param {Function} renderCallback - פונקציה לרינדור מחדש של הגריד
 */
export function attachHomePageListeners(elements, state, renderCallback) {
    const { searchBtn, searchInput, clearBtn, maxWatchlistDialog, maxWatchlistClose, maxWatchlistConfirm } = elements;

    // חיפוש
    searchBtn.addEventListener("click", () => handleSearch(searchInput, state, renderCallback));
    searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") handleSearch(searchInput, state, renderCallback);
    });

    // ניקוי watchlist
    clearBtn.addEventListener("click", () => handleClearWatchlist(state, renderCallback));

    // מודאל
    maxWatchlistClose.addEventListener("click", closeMaxWatchlistDialog);
    maxWatchlistConfirm.addEventListener("click", () => confirmRemoveCoin(elements, state, renderCallback));
    maxWatchlistDialog.addEventListener("click", (e) => {
        if (e.target === maxWatchlistDialog) closeMaxWatchlistDialog();
    });
}

/**
 * מחבר event listeners לכרטיסיות (MORE INFO + Toggle)
 * @param {Object} state - אובייקט המצב הגלובלי
 * @param {Function} renderCallback - פונקציה לרינדור מחדש
 */
export function attachCardListeners(state, renderCallback) {
    // MORE INFO buttons
    document.querySelectorAll(".more-info-btn").forEach((button) => {
        button.addEventListener("click", (e) => handleMoreInfoClick(e, state));
    });

    // Toggle switches
    document.querySelectorAll(".toggle-input").forEach((checkbox) => {
        checkbox.addEventListener("change", (e) => handleToggleChange(e, state, renderCallback));
    });
}

/**
 * טיפול בחיפוש מטבעות
 */
function handleSearch(searchInput, state, renderCallback) {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) {
        renderCallback(state.allCoins);
        return;
    }

    const filtered = state.allCoins.filter(
        (coin) =>
            coin.name.toLowerCase().includes(query) ||
            coin.symbol.toLowerCase().includes(query)
    );
    renderCallback(filtered);
}

/**
 * טיפול בלחיצה על MORE INFO
 */
async function handleMoreInfoClick(event, state) {
    const button = event.target;
    const coinId = button.getAttribute("data-id");
    const detailsDiv = document.getElementById(`details-${coinId}`);

    // Toggle display
    if (detailsDiv.style.display === "block") {
        detailsDiv.style.display = "none";
        button.classList.remove("active");
        return;
    }

    // Get from cache
    if (state.cache[coinId]) {
        let info = state.cache[coinId];

        // If EUR/ILS are missing, fetch them
        if (info.eur === 0 && info.ils === 0) {
            try {
                const data = await fetchAdditionalCurrencies([coinId]);
                info.eur = data[coinId]?.eur || 0;
                info.ils = data[coinId]?.ils || 0;
                state.cache[coinId] = info;
            } catch (error) {
                console.warn(`⚠️ Could not fetch EUR/ILS for ${coinId}:`, error.message);
            }
        }

        updateDetailsDisplay(detailsDiv, info);
        detailsDiv.style.display = "block";
        button.classList.add("active");
        return;
    }

    // Fallback: fetch all data
    console.warn(`⚠️ ${coinId} not in cache, attempting fallback fetch...`);
    try {
        const data = await fetchCoinDetails(coinId);
        const info = {
            usd: data.market_data?.current_price?.usd || 0,
            eur: data.market_data?.current_price?.eur || 0,
            ils: data.market_data?.current_price?.ils || 0,
            image: data.image?.small,
        };

        state.cache[coinId] = info;
        updateDetailsDisplay(detailsDiv, info);
        detailsDiv.style.display = "block";
        button.classList.add("active");
    } catch (error) {
        console.error("Fetch error:", error);
        detailsDiv.innerHTML = `<p style="color:#ff6b6b;">Error loading info: ${error.message}</p>`;
        detailsDiv.style.display = "block";
        button.classList.add("active");
    }
}

/**
 * טיפול בשינוי מצב ה-toggle (הוספה/הסרה מ-watchlist)
 */
function handleToggleChange(event, state, renderCallback) {
    const checkbox = event.target;
    const coinId = checkbox.getAttribute("data-id");
    const symbol = checkbox.getAttribute("data-symbol");
    const coin = state.allCoins.find((c) => c.id === coinId);

    let watchlist = loadWatchlist();

    if (checkbox.checked) {
        // Add to watchlist
        if (watchlist.length >= MAX_WATCHLIST) {
            checkbox.checked = false;
            pendingCoinToAdd = {
                id: coinId,
                symbol: symbol.toUpperCase(),
                name: coin.name,
            };
            openMaxWatchlistDialog();
            return;
        }
        watchlist.push({
            id: coinId,
            symbol: symbol.toUpperCase(),
            name: coin.name,
        });
    } else {
        // Remove from watchlist
        watchlist = watchlist.filter((c) => c.id !== coinId);
    }

    saveWatchlist(watchlist);
    updateWatchlistCounter(); // עדכון המחוון
}

/**
 * פתיחת מודאל החלפת מטבעות
 */
function openMaxWatchlistDialog() {
    const watchlist = loadWatchlist();
    const container = document.getElementById("watchlistCheckboxList");

    setNewCoinName(pendingCoinToAdd.name);
    renderWatchlistRadios(watchlist, container);
    toggleModal("maxWatchlistDialog", true);
}

/**
 * סגירת מודאל החלפת מטבעות
 */
function closeMaxWatchlistDialog() {
    toggleModal("maxWatchlistDialog", false);
    pendingCoinToAdd = null;
}

/**
 * אישור החלפת מטבע
 */
function confirmRemoveCoin(elements, state, renderCallback) {
    const selectedRadio = document.querySelector('input[name="coinToRemove"]:checked');
    if (!selectedRadio) return;

    const coinIdToRemove = selectedRadio.value;
    let watchlist = loadWatchlist();

    // Remove selected coin
    watchlist = watchlist.filter((c) => c.id !== coinIdToRemove);

    // Add pending coin
    if (pendingCoinToAdd) {
        watchlist.push(pendingCoinToAdd);
    }

    saveWatchlist(watchlist);
    updateWatchlistCounter(); // עדכון המחוון
    renderCallback(state.allCoins);
    closeMaxWatchlistDialog();
}

/**
 * ניקוי כל ה-watchlist
 */
function handleClearWatchlist(state, renderCallback) {
    const watchlist = loadWatchlist();

    if (watchlist.length === 0) {
        alert("No coins in watchlist to clear.");
        return;
    }

    const confirmClear = confirm(
        `Are you sure you want to clear ${watchlist.length} coin(s) from your watchlist?`
    );

    if (confirmClear) {
        saveWatchlist([]);
        updateWatchlistCounter(); // עדכון המחוון
        renderCallback(state.allCoins);
        alert("Watchlist cleared successfully!");
    }
}
