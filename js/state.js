import { DIFFICULTIES, MODES, SNAKES } from "./config.js";

function readJSON(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const value = JSON.parse(raw);
        return value == null ? fallback : value;
    } catch (err) {
        return fallback;
    }
}

function detectLang() {
    const saved = localStorage.getItem("snakeLang");
    if (saved === "pt" || saved === "en") return saved;
    const nav = (navigator.language || "en").toLowerCase();
    return nav.startsWith("pt") ? "pt" : "en";
}

function detectBool(key, fallback) {
    const saved = localStorage.getItem(key);
    if (saved === "1") return true;
    if (saved === "0") return false;
    return fallback;
}

const coarse = typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(pointer: coarse)").matches
    : false;

let initialDifficulty = localStorage.getItem("snakeDifficulty");
if (!DIFFICULTIES[initialDifficulty]) initialDifficulty = null;

let initialSnake = localStorage.getItem("snakeCharacter");
if (!SNAKES[initialSnake]) initialSnake = "verdao";

let initialMode = localStorage.getItem("snakeMode");
if (!MODES.includes(initialMode)) initialMode = "classic";

const highScore = Number(localStorage.getItem("snakeHighScore")) || 0;
const highScores = readJSON("snakeHighScores", {});
if ((highScores.classic || 0) < highScore) highScores.classic = highScore;

const hadUnlocks = localStorage.getItem("snakeUnlocks") !== null;
const unlocks = readJSON("snakeUnlocks", {});
if (!hadUnlocks) {
    if (initialSnake === "naja" || initialSnake === "brasa") unlocks[initialSnake] = true;
}

const reduceMotion = typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

export const state = {
    players: [],
    food: null,
    powerUp: null,
    obstacles: [],
    effects: { double: 0, slow: 0, ghost: 0, shrink: 0 },
    particles: [],
    eatEffect: null,
    deathAnim: null,
    shake: null,
    levelFlash: 0,

    score: 0,
    highScore,
    highScores,
    mode: initialMode,
    twoPlayer: initialMode === "zen" || initialMode === "daily"
        ? false
        : detectBool("snakeTwoPlayer", false),
    level: 1,
    eaten: 0,
    tick: 0,
    elapsedMs: 0,
    moveStart: 0,
    moveDuration: 100,
    seed: 1,
    rng: Math.random,
    replayInputs: [],
    replayCursor: 0,
    replayData: null,
    lastRun: null,
    bestReplays: readJSON("snakeBestReplays", {}),
    recording: false,
    isReplaying: false,
    _saved: null,

    wallMode: localStorage.getItem("snakeWalls") === "1",
    isMuted: localStorage.getItem("snakeMuted") === "1",
    showDpad: detectBool("snakeDpad", coarse),
    vibrate: detectBool("snakeVibrate", coarse),
    lang: detectLang(),
    reduceMotion,
    activeDifficulty: initialDifficulty,
    currentSnake: initialSnake,
    unlocks,
    achievements: readJSON("snakeAchievements", {}),
    stats: Object.assign({
        eaten: 0,
        powerUps: 0,
        bestLevel: 1,
        pvpWins: 0,
    }, readJSON("snakeStats", {})),
    dailyBoard: readJSON("snakeDailyBoard", {}),
    playerName: localStorage.getItem("snakePlayerName") || "",
    leaderboardData: null,
    rankTab: "global",
    menuReturn: "start",

    menu: "start",
    isPaused: false,
    isGameOver: false,
    isReady: true,
    endReason: null,
    winner: 0,
    result: null,

    jogo: null,
    audioCtx: null,
    swipeInitialX: null,
    swipeInitialY: null,
    accelPerScore: 3,
    minInterval: 55,
    statusText: "",
};

export const settings = {
    speed: 100,
    foodColor: "#ff4757",
    backgroundColor: "#0d0d10",
    gridColor: "rgba(255,255,255,0.055)",
    snakeColor: "#3ddc84",
    headColor: "#7fffaa",
    eyeColor: "#0d0d10",
};

export const hooks = {
    sync() {},
    toast() {},
};

export function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}
