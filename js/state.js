import { DIFFICULTIES, SNAKES } from "./config.js";

let initialDifficulty = localStorage.getItem("snakeDifficulty");
if (!DIFFICULTIES[initialDifficulty]) initialDifficulty = null;

let initialSnake = localStorage.getItem("snakeCharacter");
if (!SNAKES[initialSnake]) initialSnake = "verdao";

export const state = {
    snake: null,
    direction: "right",
    nextDirection: "right",
    food: null,
    specialFood: null,
    score: 0,
    highScore: Number(localStorage.getItem("snakeHighScore")) || 0,
    wallMode: localStorage.getItem("snakeWalls") === "1",
    isMuted: localStorage.getItem("snakeMuted") === "1",
    activeDifficulty: initialDifficulty,
    currentSnake: initialSnake,
    playerName: localStorage.getItem("snakePlayerName") || "",
    leaderboardData: null,
    showingLeaderboard: false,
    isPaused: false,
    isGameOver: false,
    isReady: true,
    eatEffect: null,
    deathAnim: null,
    jogo: null,
    audioCtx: null,
    swipeInitialX: null,
    swipeInitialY: null,
    accelPerScore: 3,
    minInterval: 55,
};

export const settings = {
    speed: 100,
    foodColor: "#ff4757",
    specialColor: "#ffb700",
    backgroundColor: "#0d0d10",
    gridColor: "rgba(255,255,255,0.04)",
    snakeColor: "#3ddc84",
    headColor: "#7fffaa",
    eyeColor: "#0d0d10",
};
