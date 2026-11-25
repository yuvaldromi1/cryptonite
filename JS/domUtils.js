// ===== מניפולציות DOM =====
// פונקציות ליצירה, עדכון והצגת אלמנטים

/**
 * יוצר כרטיס מטבע בודד
 * @param {Object} coin - נתוני המטבע
 * @param {boolean} isWatched - האם המטבע ברשימת המעקב
 * @returns {HTMLElement}
 */
export function createCoinCard(coin, isWatched = false) {
    const card = document.createElement("div");
    card.className = "coin-card";
    card.id = `card-${coin.id}`;

    card.innerHTML = `
        <div class="coin-card-content">
            <div class="coin-header">
                <img src="${coin.image}" alt="${coin.name}" class="coin-img">
                <div class="coin-info">
                    <h3 class="coin-symbol">${coin.symbol.toUpperCase()}</h3>
                    <p class="coin-name">${coin.name}</p>
                </div>
            </div>
            
            <button class="more-info-btn" data-id="${coin.id}">MORE INFO</button>
            
            <div class="coin-details" id="details-${coin.id}" style="display: none;">
                <img src="${coin.image}" alt="${coin.name}" class="detail-img">
                <div class="prices">
                    <p>USD: <strong>$0.00</strong></p>
                    <p>EUR: <strong>€0.00</strong></p>
                    <p>ILS: <strong>₪0.00</strong></p>
                </div>
            </div>
            
            <label class="toggle-switch">
                <input type="checkbox" class="toggle-input" data-id="${coin.id}" data-symbol="${coin.symbol}" ${isWatched ? "checked" : ""}>
                <span class="toggle-slider"></span>
            </label>
        </div>
    `;

    return card;
}

/**
 * מעדכן את תצוגת המידע המורחב של כרטיס
 * @param {HTMLElement} detailsDiv - div של הפרטים
 * @param {Object} info - נתוני המחירים (usd, eur, ils, image)
 */
export function updateDetailsDisplay(detailsDiv, info) {
    const usd = isNaN(info.usd) ? 0 : info.usd;
    const eur = isNaN(info.eur) ? 0 : info.eur;
    const ils = isNaN(info.ils) ? 0 : info.ils;

    detailsDiv.innerHTML = `
        <img src="${info.image}" alt="icon" class="detail-img">
        <div class="prices">
            <p>USD: <strong>$${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
            <p>EUR: <strong>€${eur.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
            <p>ILS: <strong>₪${ils.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
        </div>
    `;
}

/**
 * מרנדר את כל רשימת המטבעות לגריד
 * @param {HTMLElement} container - קונטיינר הגריד
 * @param {Array} coins - מערך המטבעות
 * @param {Array} watchlist - רשימת המטבעות הנבחרים
 */
export function renderCoinsGrid(container, coins, watchlist) {
    console.log(`🔄 Clearing container and rendering ${coins.length} coins...`);
    container.innerHTML = "";

    if (!coins || coins.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #39ff14;">
                <p>No coins available to display</p>
            </div>
        `;
        return;
    }

    coins.forEach((coin, index) => {
        try {
            const isWatched = watchlist.some((c) => c.id === coin.id);
            const card = createCoinCard(coin, isWatched);
            container.appendChild(card);

            if (index < 5) { // Log first 5 for debugging
                console.log(`✅ Added card for ${coin.symbol}(${coin.name})`);
            }
        } catch (error) {
            console.error(`❌ Error creating card for coin: `, coin, error);
        }
    });

    console.log(`🎯 Grid rendering complete: ${container.children.length} cards added`);
}

/**
 * מציג או מסתיר מודאל
 * @param {string} modalId - מזהה המודאל
 * @param {boolean} show - האם להציג
 */
export function toggleModal(modalId, show) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = show ? "flex" : "none";
    }
}

/**
 * מעדכן את רשימת ה-radio buttons במודאל החלפת מטבעות
 * @param {Array} watchlist - רשימת המטבעות הנבחרים
 * @param {HTMLElement} container - קונטיינר להכנסת ה-radios
 */
export function renderWatchlistRadios(watchlist, container) {
    container.innerHTML = "";
    watchlist.forEach((coin, index) => {
        const label = document.createElement("label");
        label.className = "watchlist-radio-label";
        label.innerHTML = `
            <input type="radio" name="coinToRemove" value="${coin.id}" ${index === 0 ? "checked" : ""}>
            <span>${coin.symbol} - ${coin.name}</span>
        `;
        container.appendChild(label);
    });
}

/**
 * מעדכן טקסט של שם המטבע החדש במודאל
 * @param {string} coinName - שם המטבע
 */
export function setNewCoinName(coinName) {
    const element = document.getElementById("newCoinName");
    if (element) element.textContent = coinName;
}

/**
 * מציג הודעת טעינה או שגיאה בגריד
 * @param {HTMLElement} container - הקונטיינר
 * @param {string} message - ההודעה להצגה
 * @param {string} type - 'loading' | 'error' | 'info'
 */
export function showMessage(container, message, type = 'info') {
    const colors = {
        loading: '#39ff14',
        error: '#ff6b6b',
        info: '#39ff14'
    };

    const loadingHTML = type === 'loading' ? `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; color: ${colors[type]};">
            <div style="width: 50px; height: 50px; border: 3px solid rgba(57, 255, 20, 0.3); border-top: 3px solid #39ff14; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 20px;"></div>
            <p style="text-align: center; font-size: 1.1rem; margin: 0;">${message}</p>
        </div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    ` : `<p style="text-align:center; color:${colors[type]}; padding: 40px;">${message}</p>`;

    container.innerHTML = loadingHTML;
}

/**
 * יוצר שורת טבלה לדף הדוחות
 * @param {Object} data - נתוני המטבע
 * @param {number} index - אינדקס בטבלה
 * @returns {HTMLTableRowElement}
 */
export function createTableRow(data, index) {
    const row = document.createElement("tr");
    const liquidityChange = data.athChangePercentage || 0;

    row.innerHTML = `
        <td class="rank-cell">${data.rank || index + 1}</td>
        <td class="coin-cell">
            <img src="${data.image}" alt="${data.name}" class="coin-icon">
            <div class="coin-info">
                <div class="coin-name">${data.name}</div>
                <div class="coin-symbol">${data.symbol.toUpperCase()}</div>
            </div>
        </td>
        <td class="price-cell">$${formatPrice(data.price)}</td>
        <td>$${formatLargeNumber(data.marketCap)}</td>
        <td>$${formatLargeNumber(data.volume24h)}</td>
        <td class="percentage-cell ${liquidityChange >= 0 ? "percentage-positive" : "percentage-negative"}">
            ${liquidityChange >= 0 ? "+" : ""}${liquidityChange.toFixed(2)}%
        </td>
        <td>$${formatPrice(data.ath)}</td>
        <td>
            <div class="percentage-cell ${data.change1h >= 0 ? "percentage-positive" : "percentage-negative"}">
                ${data.change1h >= 0 ? "+" : ""}${data.change1h.toFixed(2)}%
            </div>
        </td>
        <td>
            <div class="percentage-cell ${data.change24h >= 0 ? "percentage-positive" : "percentage-negative"}">
                ${data.change24h >= 0 ? "+" : ""}${data.change24h.toFixed(2)}%
            </div>
        </td>
        <td>
            <div class="percentage-cell ${data.change7d >= 0 ? "percentage-positive" : "percentage-negative"}">
                ${data.change7d >= 0 ? "+" : ""}${data.change7d.toFixed(2)}%
            </div>
        </td>
    `;
    return row;
}

/**
 * מרנדר את כל שורות הטבלה
 * @param {HTMLElement} tableBody - גוף הטבלה
 * @param {Array} watchlist - רשימת המטבעות
 * @param {Object} coinData - אובייקט עם נתוני המטבעות
 */
export function renderTable(tableBody, watchlist, coinData) {
    tableBody.innerHTML = "";

    watchlist.forEach((coin, index) => {
        const data = coinData[coin.id];
        if (!data) return;
        const row = createTableRow(data, index);
        tableBody.appendChild(row);
    });
}

/**
 * מציג הודעה "אין מטבעות" בטבלה
 * @param {HTMLElement} tableBody - גוף הטבלה
 */
export function showNoCoinsMessage(tableBody) {
    tableBody.innerHTML = `
        <tr>
            <td colspan="10" style="text-align: center; padding: 40px; color: #39ff14;">
                <p style="margin: 0 0 10px 0;">📊 אין מטבעות ב-Watchlist</p>
                <p style="margin: 0; font-size: 0.9rem; color: #64748b;">
                    <a href="index.html" style="color: #00ff00; text-decoration: none;">👈 חזור לעמוד הבית והוסף מטבעות</a>
                </p>
            </td>
        </tr>
    `;
}

// ===== פונקציות עזר לפורמט =====

function formatPrice(price) {
    if (price >= 1) {
        return price.toFixed(2);
    } else if (price > 0) {
        return price.toFixed(6);
    }
    return "0.00";
}

function formatLargeNumber(number) {
    if (!number) return "0";
    if (number >= 1e12) return (number / 1e12).toFixed(2) + "T";
    if (number >= 1e9) return (number / 1e9).toFixed(2) + "B";
    if (number >= 1e6) return (number / 1e6).toFixed(2) + "M";
    if (number >= 1e3) return (number / 1e3).toFixed(2) + "K";
    return number.toFixed(2);
}