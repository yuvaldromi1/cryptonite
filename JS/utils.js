// ===== כלים עזר כלליים =====

/**
 * יצירת כפתור ניסיון חוזר
 * @param {Function} onRetry - פונקציה לביצוע בלחיצה
 * @returns {HTMLButtonElement}
 */
export function createRetryButton(onRetry) {
    const button = document.createElement('button');
    button.textContent = '🔄 Try Again';
    button.style.cssText = `
        margin-top: 20px;
        padding: 12px 24px;
        background: linear-gradient(135deg, #00ff00, #39ff14);
        color: #0a0e27;
        border: none;
        border-radius: 25px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 0 15px rgba(0, 255, 0, 0.3);
    `;

    button.addEventListener('mouseenter', () => {
        button.style.transform = 'translateY(-2px)';
        button.style.boxShadow = '0 0 25px rgba(0, 255, 0, 0.5)';
    });

    button.addEventListener('mouseleave', () => {
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = '0 0 15px rgba(0, 255, 0, 0.3)';
    });

    button.addEventListener('click', onRetry);

    return button;
}

/**
 * עיכוב async
 * @param {number} ms - זמן במילישניות
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}