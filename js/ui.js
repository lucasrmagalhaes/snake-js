import { state, settings, hooks } from "./state.js";
import { DIFFICULTIES, MODES, SNAKES, ACHIEVEMENTS } from "./config.js";
import {
    setSpeed, effectiveInterval, resetGame, startRun, restartRun,
    pauseGame, resumeGame, quitToMenu, playReplay, stopLoop, isPlaying, highForMode,
} from "./game.js";
import { toggleMute } from "./audio.js";
import { leaderboardConfigured, fetchLeaderboard } from "./leaderboard.js";
import { isSkinUnlocked } from "./achievements.js";
import { applySkin } from "./skin.js";
import { bestFor, shareRun, validReplay } from "./replay.js";
import { t } from "./i18n.js";
import { dateKey } from "./rng.js";

let toastTimer = 0;

function showToast(message) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2400);
}

export function clearActiveDifficulty() {
    if (!state.activeDifficulty) return;
    state.activeDifficulty = null;
    localStorage.removeItem("snakeDifficulty");
}

export function syncSpeedFromSlider() {
    const slider = document.getElementById("speed");
    if (!slider) return;
    settings.speed = (Number(slider.max) + Number(slider.min)) - Number(slider.value);
}

export function applyDifficulty(name) {
    const preset = DIFFICULTIES[name];
    if (!preset || state.mode === "daily") return;
    settings.speed = preset.speed;
    state.wallMode = preset.walls;
    state.accelPerScore = preset.accelPerScore;
    state.minInterval = preset.minInterval;
    state.activeDifficulty = name;
    const slider = document.getElementById("speed");
    if (slider) slider.value = String((Number(slider.max) + Number(slider.min)) - settings.speed);
    localStorage.setItem("snakeWalls", state.wallMode ? "1" : "0");
    localStorage.setItem("snakeDifficulty", name);
    if (state.jogo) setSpeed(effectiveInterval());
    syncUI();
}

function selectMode(mode) {
    state.isReplaying = false;
    state.replayData = null;
    state.mode = mode;
    localStorage.setItem("snakeMode", mode);
    if (mode === "zen" || mode === "daily") {
        state.twoPlayer = false;
        localStorage.setItem("snakeTwoPlayer", "0");
    }
    state.menu = "start";
    resetGame();
    syncUI();
}

function toggleTwo() {
    if (state.mode === "zen" || state.mode === "daily") return;
    state.twoPlayer = !state.twoPlayer;
    localStorage.setItem("snakeTwoPlayer", state.twoPlayer ? "1" : "0");
    resetGame();
    syncUI();
}

function applySpeed() {
    syncSpeedFromSlider();
    clearActiveDifficulty();
    if (state.jogo) setSpeed(effectiveInterval());
    syncUI();
}

function toggleWalls() {
    if (state.mode === "daily") return;
    if (!state.isReady && !state.isGameOver && state.menu !== "start") return;
    state.wallMode = !state.wallMode;
    localStorage.setItem("snakeWalls", state.wallMode ? "1" : "0");
    clearActiveDifficulty();
    syncUI();
}

function toggleDpad() {
    state.showDpad = !state.showDpad;
    localStorage.setItem("snakeDpad", state.showDpad ? "1" : "0");
    syncUI();
}

function toggleVibrate() {
    state.vibrate = !state.vibrate;
    localStorage.setItem("snakeVibrate", state.vibrate ? "1" : "0");
    syncUI();
}

function toggleLang() {
    state.lang = state.lang === "pt" ? "en" : "pt";
    localStorage.setItem("snakeLang", state.lang);
    syncUI();
}

function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
}

function onSkin(event) {
    applySkin(event.target.value, true);
    syncUI();
}

function cardRun() {
    if (state.result) {
        return {
            score: state.result.score,
            p2score: state.result.p2score,
            mode: state.result.mode,
            twoPlayer: state.result.twoPlayer,
            snake: state.result.snake,
            date: state.result.date,
            seed: state.result.seed || 0,
            inputs: [],
        };
    }
    return state.lastRun;
}

function fillSnakeSelect(select) {
    if (!select) return;
    select.innerHTML = "";
    for (const [id, skin] of Object.entries(SNAKES)) {
        const option = document.createElement("option");
        option.value = id;
        const unlocked = isSkinUnlocked(id);
        option.disabled = !unlocked;
        option.textContent = unlocked || !skin.unlockScore
            ? skin.name
            : skin.name + " (" + skin.unlockScore + ")";
        if (!unlocked && skin.unlockScore) option.title = t("lockedUntil", { score: skin.unlockScore });
        select.append(option);
    }
    select.value = isSkinUnlocked(state.currentSnake) ? state.currentSnake : "verdao";
}

function applyStaticText() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
        el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(el => {
        el.setAttribute("aria-label", t(el.dataset.i18nAria));
    });
    document.documentElement.lang = state.lang === "pt" ? "pt-BR" : "en";
}

function renderModes() {
    const row = document.getElementById("modeRow");
    if (!row) return;
    row.innerHTML = "";
    for (const mode of MODES) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = t("mode_" + mode);
        button.classList.toggle("active", state.mode === mode);
        button.addEventListener("click", () => selectMode(mode));
        row.append(button);
    }
}

function setToggle(id, on, onKey, offKey, disabled) {
    const button = document.getElementById(id);
    if (!button) return;
    button.textContent = on ? t(onKey) : t(offKey);
    button.classList.toggle("on", Boolean(on));
    button.setAttribute("aria-pressed", on ? "true" : "false");
    button.disabled = Boolean(disabled);
}

function updateToggles() {
    const daily = state.mode === "daily";
    const wallsOn = daily ? true : state.wallMode;
    setToggle("wallToggle", wallsOn, "wallsOn", "wallsOff", daily);
    const soundOn = !state.isMuted;
    setToggle("muteToggle", soundOn, "soundOn", "soundOff", false);
    setToggle("pauseMute", soundOn, "soundOn", "soundOff", false);
    setToggle("dpadToggle", state.showDpad, "dpadOn", "dpadOff", false);
    setToggle("pauseDpad", state.showDpad, "dpadOn", "dpadOff", false);
    setToggle("vibrateToggle", state.vibrate, "vibOn", "vibOff", false);
    setToggle("pauseVibrate", state.vibrate, "vibOn", "vibOff", false);

    const duelLocked = state.mode === "zen" || state.mode === "daily";
    const duelOn = state.twoPlayer && !duelLocked;
    setToggle("twoPlayerBtn", duelOn, "twoOn", "twoOff", duelLocked);

    for (const name of Object.keys(DIFFICULTIES)) {
        const button = document.getElementById("diff_" + name);
        if (!button) continue;
        button.classList.toggle("active", state.activeDifficulty === name);
        button.disabled = daily;
    }

    const speed = document.getElementById("speed");
    if (speed) speed.disabled = daily;

    const langLabel = state.lang === "en" ? "PT" : "EN";
    for (const id of ["langToggle", "pauseLang"]) {
        const button = document.getElementById(id);
        if (!button) continue;
        button.textContent = langLabel;
    }

    const fs = document.fullscreenElement ? t("exitFullscreen") : t("fullscreen");
    for (const id of ["fsToggle", "pauseFs"]) {
        const button = document.getElementById(id);
        if (button) button.textContent = fs;
    }

    const best = bestFor(state.mode, state.twoPlayer && state.mode !== "zen" && state.mode !== "daily");
    for (const id of ["replayBestBtn", "overReplayBest"]) {
        const button = document.getElementById(id);
        if (!button) continue;
        button.disabled = !best;
    }
    const replayRun = document.getElementById("replayRunBtn");
    if (replayRun) replayRun.disabled = !validReplay(state.lastRun);

    const note = document.getElementById("dailyNote");
    if (note) {
        const day = dateKey();
        const board = state.dailyBoard[day] || [];
        const bestScore = board.length ? board[0].score : null;
        const extra = bestScore == null ? t("dailyNone") : t("dailyBest", { score: bestScore });
        note.textContent = t("dailyNote", { date: day }) + " " + extra;
        note.hidden = state.mode !== "daily";
    }
}

function overTitle(result) {
    if (!result) return t("gameOver");
    if (result.twoPlayer) {
        const who = result.winner === 1 ? t("p1wins") : result.winner === 2 ? t("p2wins") : t("draw");
        if (result.reason === "time") return t("timeUp") + " | " + who;
        return who;
    }
    if (result.reason === "time") return t("timeUp");
    return t("gameOver");
}

function updateOver() {
    const title = document.getElementById("overTitle");
    const score = document.getElementById("overScore");
    const detail = document.getElementById("overDetail");
    const result = state.result;
    if (!title || !score || !detail) return;
    title.textContent = overTitle(result);
    if (!result) {
        score.textContent = "0";
        detail.textContent = "";
        return;
    }
    score.textContent = String(result.score);
    if (result.twoPlayer) {
        detail.textContent = t("mode_" + result.mode) + " | " + t("duelLine", { p1: result.score, p2: result.p2score });
    } else {
        detail.textContent = t("mode_" + result.mode) + " | " + t("bestLine", { score: highForMode() });
    }
}

function addRankRow(parent, left, right, mine) {
    const row = document.createElement("div");
    row.className = "rank-row" + (mine ? " me" : "");
    const name = document.createElement("span");
    name.textContent = left;
    const value = document.createElement("span");
    value.textContent = right;
    row.append(name, value);
    parent.append(row);
}

function renderRank() {
    const list = document.getElementById("rankList");
    if (!list || state.menu !== "rank") return;
    list.innerHTML = "";
    document.getElementById("tabGlobal")?.classList.toggle("active", state.rankTab === "global");
    document.getElementById("tabDaily")?.classList.toggle("active", state.rankTab === "daily");

    if (state.rankTab === "daily") {
        const day = dateKey();
        const board = state.dailyBoard[day] || [];
        if (!board.length) {
            addRankRow(list, t("rankDailyEmpty"), "");
            return;
        }
        board.slice(0, 10).forEach((entry, index) => {
            const mine = state.playerName && entry.name === state.playerName;
            addRankRow(list, (index + 1) + ". " + entry.name, String(entry.score), mine);
        });
        return;
    }

    if (!leaderboardConfigured() || state.leaderboardData === "unconfigured") {
        addRankRow(list, t("rankConfig"), "");
        return;
    }
    if (state.leaderboardData === "loading" || state.leaderboardData == null) {
        addRankRow(list, t("rankLoading"), "");
        return;
    }
    if (state.leaderboardData === "error") {
        addRankRow(list, t("rankError"), "");
        return;
    }
    if (!state.leaderboardData.length) {
        addRankRow(list, t("rankEmpty"), "");
        return;
    }
    state.leaderboardData.slice(0, 12).forEach((entry, index) => {
        const mine = state.playerName && entry.name === state.playerName;
        addRankRow(list, (index + 1) + ". " + entry.name, String(entry.score), mine);
    });
}

function renderAchievements() {
    const list = document.getElementById("achList");
    if (!list || state.menu !== "ach") return;
    list.innerHTML = "";
    for (const def of ACHIEVEMENTS) {
        const got = Boolean(state.achievements[def.id]);
        const row = document.createElement("div");
        row.className = "ach" + (got ? " got" : "");
        const title = document.createElement("b");
        title.textContent = (got ? "OK  " : "") + t("ach_" + def.id);
        const desc = document.createElement("span");
        desc.textContent = t("ach_" + def.id + "_d");
        row.append(title, desc);
        list.append(row);
    }
}

function showPanels() {
    const overlay = document.getElementById("overlay");
    const playing = state.menu === "hidden";
    if (overlay) overlay.hidden = !playing ? false : true;
    document.querySelectorAll("[data-panel]").forEach(panel => {
        panel.hidden = panel.dataset.panel !== state.menu;
    });
    const pauseBtn = document.getElementById("pauseBtn");
    if (pauseBtn) pauseBtn.hidden = !playing || state.isGameOver;
    const dpad = document.getElementById("dpad");
    if (dpad) dpad.hidden = !playing || state.isGameOver || !state.showDpad;
    if (playing) releasePlayFocus();
}

function releasePlayFocus() {
    const el = document.activeElement;
    if (!el || el === document.body || typeof el.blur !== "function") return;
    const overlay = document.getElementById("overlay");
    const dpad = document.getElementById("dpad");
    if ((overlay && overlay.contains(el)) || (dpad && dpad.contains(el)) || el.id === "pauseBtn") {
        el.blur();
    }
}

export function syncUI() {
    applyStaticText();
    renderModes();
    fillSnakeSelect(document.getElementById("snakeSelect"));
    fillSnakeSelect(document.getElementById("pauseSnake"));
    updateToggles();
    updateOver();
    showPanels();
    renderRank();
    renderAchievements();
}

function rememberReturn() {
    if (state.menu === "rank" || state.menu === "ach") return;
    state.menuReturn = state.menu === "hidden" ? "pause" : state.menu;
}

export function openRanking() {
    if (isPlaying()) {
        state.isPaused = true;
        stopLoop();
        state.menuReturn = "pause";
    } else {
        rememberReturn();
    }
    state.menu = "rank";
    if (state.rankTab !== "daily" && state.rankTab !== "global") state.rankTab = "global";
    if (state.rankTab === "global") fetchLeaderboard();
    syncUI();
}

export function openAchievements() {
    if (isPlaying()) {
        state.isPaused = true;
        stopLoop();
        state.menuReturn = "pause";
    } else {
        rememberReturn();
    }
    state.menu = "ach";
    syncUI();
}

export function closePanel() {
    if (state.menu !== "rank" && state.menu !== "ach") return false;
    const back = state.menuReturn || "start";
    state.menu = back === "hidden" ? "start" : back;
    syncUI();
    return true;
}

function showRankTab(tab) {
    state.rankTab = tab;
    if (tab === "global") fetchLeaderboard();
    else syncUI();
}

function watchBest() {
    const run = bestFor(state.mode, state.twoPlayer && state.mode !== "zen" && state.mode !== "daily");
    if (run) playReplay(run);
}

function watchLast() {
    if (validReplay(state.lastRun)) playReplay(state.lastRun);
}

function begin() {
    startRun();
    if (document.activeElement && typeof document.activeElement.blur === "function") {
        document.activeElement.blur();
    }
}

export function bindUI() {
    hooks.sync = syncUI;
    hooks.toast = showToast;

    document.getElementById("startBtn")?.addEventListener("click", begin);
    document.getElementById("resumeBtn")?.addEventListener("click", () => resumeGame());
    document.getElementById("pauseRestart")?.addEventListener("click", () => restartRun());
    document.getElementById("overRestart")?.addEventListener("click", () => restartRun());
    document.getElementById("pauseQuit")?.addEventListener("click", () => quitToMenu());
    document.getElementById("overMenu")?.addEventListener("click", () => quitToMenu());
    document.getElementById("pauseBtn")?.addEventListener("click", () => {
        pauseGame();
        document.getElementById("pauseBtn")?.blur();
    });

    document.getElementById("twoPlayerBtn")?.addEventListener("click", toggleTwo);
    document.getElementById("speed")?.addEventListener("input", applySpeed);
    document.getElementById("snakeSelect")?.addEventListener("change", onSkin);
    document.getElementById("pauseSnake")?.addEventListener("change", onSkin);
    document.getElementById("wallToggle")?.addEventListener("click", toggleWalls);
    for (const id of ["muteToggle", "pauseMute"]) {
        document.getElementById(id)?.addEventListener("click", () => toggleMute());
    }
    for (const id of ["dpadToggle", "pauseDpad"]) {
        document.getElementById(id)?.addEventListener("click", toggleDpad);
    }
    for (const id of ["vibrateToggle", "pauseVibrate"]) {
        document.getElementById(id)?.addEventListener("click", toggleVibrate);
    }
    for (const id of ["langToggle", "pauseLang"]) {
        document.getElementById(id)?.addEventListener("click", toggleLang);
    }
    for (const id of ["fsToggle", "pauseFs"]) {
        document.getElementById(id)?.addEventListener("click", toggleFullscreen);
    }
    for (const name of Object.keys(DIFFICULTIES)) {
        document.getElementById("diff_" + name)?.addEventListener("click", () => applyDifficulty(name));
    }

    document.getElementById("lbBtn")?.addEventListener("click", openRanking);
    document.getElementById("pauseRank")?.addEventListener("click", openRanking);
    document.getElementById("achBtn")?.addEventListener("click", openAchievements);
    document.getElementById("pauseAch")?.addEventListener("click", openAchievements);
    document.getElementById("rankBack")?.addEventListener("click", () => closePanel());
    document.getElementById("achBack")?.addEventListener("click", () => closePanel());
    document.getElementById("tabGlobal")?.addEventListener("click", () => showRankTab("global"));
    document.getElementById("tabDaily")?.addEventListener("click", () => showRankTab("daily"));

    document.getElementById("replayBestBtn")?.addEventListener("click", watchBest);
    document.getElementById("overReplayBest")?.addEventListener("click", watchBest);
    document.getElementById("replayRunBtn")?.addEventListener("click", watchLast);
    document.getElementById("shareBtn")?.addEventListener("click", () => shareRun(cardRun()));

    document.addEventListener("fullscreenchange", () => syncUI());
}
