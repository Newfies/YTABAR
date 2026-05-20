// ==UserScript==
// @name         YouTube AdBlocker Auto Reload
// @namespace    https://github.com/Newfies
// @version      1.5
// @description  Auto reloads YouTube when it gets stuck after clicking a video (anti-adblock delay, black screen, spinner, etc.)
// @author       Newfies
// @match        https://www.youtube.com/watch*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    console.log('[YouTube Auto-Reload] Script injected');

    let reloadTimeout = null;
    let checkInterval = null;
    const RELOAD_DELAY = 6500;        // ms after page load / navigation
    const MAX_CHECKS = 12;            // safety limit
    let checkCount = 0;

    function isVideoStuck() {
        const video = document.querySelector('video');
        const player = document.querySelector('ytd-player') || document.querySelector('#movie_player');

        // 1. No video element yet
        if (!video) return true;

        // 2. Video exists but not playing and no ad playing
        const isPlaying = !video.paused && video.currentTime > 0;
        const hasAd = document.querySelector('.ad-showing, .ytp-ad-player-overlay') !== null;

        if (!isPlaying && !hasAd) {
            // Check for common stuck indicators
            const overlay = document.querySelector('.ytp-error, .ytp-pause-overlay, .ytp-spinner');
            if (overlay || video.readyState < 3) {
                return true;
            }
        }

        // 3. Anti-adblock / "Video unavailable" messages
        const errorTexts = Array.from(document.querySelectorAll('yt-formatted-string, .yt-alert-text, #reason'))
            .map(el => el.textContent.toLowerCase());
        
        const stuckPhrases = ['ad blockers', 'unavailable', 'try reloading', 'please reload', 'something went wrong'];
        if (errorTexts.some(txt => stuckPhrases.some(phrase => txt.includes(phrase)))) {
            return true;
        }

        return false;
    }

    function attemptReload() {
        if (checkCount >= MAX_CHECKS) {
            console.log('[YouTube Auto-Reload] Max checks reached, stopping.');
            return;
        }

        console.log(`[YouTube Auto-Reload] Video appears stuck (${checkCount + 1}/${MAX_CHECKS}). Reloading...`);
        window.location.reload();
    }

    function startStuckWatcher() {
        if (reloadTimeout) clearTimeout(reloadTimeout);
        if (checkInterval) clearInterval(checkInterval);

        checkCount = 0;

        reloadTimeout = setTimeout(() => {
            checkInterval = setInterval(() => {
                checkCount++;
                if (isVideoStuck()) {
                    attemptReload();
                    clearInterval(checkInterval);
                } else if (checkCount >= 6) {
                    // Video is playing normally, kill watcher
                    clearInterval(checkInterval);
                    console.log('[YouTube Auto-Reload] Video playing normally ✅');
                }
            }, 800);
        }, RELOAD_DELAY);
    }

    // Hook into YouTube SPA navigation
    let lastUrl = location.href;
    new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            console.log('[YouTube Auto-Reload] Navigation detected, restarting watcher');
            startStuckWatcher();
        }
    }).observe(document, { subtree: true, childList: true });

    // Also watch for direct video clicks / player changes
    document.addEventListener('yt-navigate-finish', startStuckWatcher);
    document.addEventListener('yt-page-data-updated', startStuckWatcher);

    // Initial start
    window.addEventListener('load', () => {
        startStuckWatcher();
    });

    // Immediate start (document-start)
    startStuckWatcher();

})();