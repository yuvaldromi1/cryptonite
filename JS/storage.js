// ===== ניהול אחסון מקומי =====
// כל הפונקציות שעובדות עם localStorage

import { WATCHLIST_KEY } from './constants.js';

/**
 * שומר את רשימת המטבעות הנבחרים ל-localStorage
 * @param {Array} coins - מערך של אובייקטים עם id, symbol, name
 */
export function saveWatchlist(coins) {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(coins));
}

/**
 * טוען את רשימת המטבעות הנבחרים מ-localStorage
 * @returns {Array} - מערך של מטבעות או מערך ריק
 */
export function loadWatchlist() {
    const stored = localStorage.getItem(WATCHLIST_KEY);
    return stored ? JSON.parse(stored) : [];
}

/**
 * מוחק את כל המטבעות הנבחרים מ-localStorage
 */
export function clearWatchlist() {
    localStorage.removeItem(WATCHLIST_KEY);
}

/**
 * בודק אם מטבע מסוים נמצא ברשימת המעקב
 * @param {string} coinId - מזהה המטבע
 * @returns {boolean}
 */
export function isCoinInWatchlist(coinId) {
    const watchlist = loadWatchlist();
    return watchlist.some(c => c.id === coinId);
}

/**
 * מוסיף מטבע לרשימת המעקב
 * @param {Object} coin - אובייקט מטבע עם id, symbol, name
 * @returns {boolean} - האם ההוספה הצליחה
 */
export function addToWatchlist(coin) {
    const watchlist = loadWatchlist();
    if (!watchlist.some(c => c.id === coin.id)) {
        watchlist.push(coin);
        saveWatchlist(watchlist);
        return true;
    }
    return false;
}

/**
 * מסיר מטבע מרשימת המעקב
 * @param {string} coinId - מזהה המטבע
 * @returns {boolean} - האם ההסרה הצליחה
 */
export function removeFromWatchlist(coinId) {
    let watchlist = loadWatchlist();
    const initialLength = watchlist.length;
    watchlist = watchlist.filter(c => c.id !== coinId);
    if (watchlist.length !== initialLength) {
        saveWatchlist(watchlist);
        return true;
    }
    return false;
}
