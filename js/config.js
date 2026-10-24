export const box = 32;
export const gridW = 25;
export const gridH = 13;
export const boardW = gridW * box;
export const boardH = gridH * box;
export const headerH = 32;

export const TIME_LIMIT = 60000;
export const FOODS_PER_LEVEL = 5;
export const MAX_BUFFER = 3;
export const POWER_CHANCE = 0.3;
export const POWER_BOARD_MS = 8000;
export const POWER_DOUBLE_MS = 8000;
export const POWER_SLOW_MS = 7000;
export const POWER_GHOST_MS = 7000;
export const POWER_SHRINK_MS = 1600;
export const SLOW_FACTOR = 1.85;
export const MAX_INTERVAL = 320;
export const REPLAY_INPUT_CAP = 12000;

export const MODES = ["classic", "time", "zen", "obstacles", "daily"];

export const POWER_TYPES = ["double", "slow", "ghost", "shrink"];

export const DIFFICULTIES = {
    easy:   { speed: 130, walls: false, accelPerScore: 2, minInterval: 70 },
    normal: { speed: 100, walls: false, accelPerScore: 3, minInterval: 55 },
    hard:   { speed: 70,  walls: true,  accelPerScore: 4, minInterval: 45 },
};

export const SNAKES = {
    verdao:   { name: "Verdão",   body: "#3ddc84", head: "#7fffaa", eye: "#0d0d10" },
    coral:    { name: "Coral",    body: "#ff8c42", head: "#ffb074", eye: "#0d0d10" },
    jararaca: { name: "Jararaca", body: "#b85cff", head: "#d088ff", eye: "#0d0d10" },
    piton:    { name: "Píton",    body: "#4ad9d9", head: "#80e8e8", eye: "#0d0d10" },
    naja:     { name: "Naja",     body: "#d8d8d8", head: "#ffffff", eye: "#0d0d10", unlockScore: 50 },
    brasa:    { name: "Brasa",    body: "#ffd24a", head: "#fff0a8", eye: "#3a1d00", unlockScore: 100 },
};

export const P2_SKIN = { name: "P2", body: "#ff5ea8", head: "#ffb3d4", eye: "#2a0a1c" };

export const ACHIEVEMENTS = [
    { id: "first-meal", kind: "eat" },
    { id: "score-10", kind: "score", score: 10 },
    { id: "score-25", kind: "score", score: 25 },
    { id: "score-50", kind: "score", score: 50, skin: "naja" },
    { id: "score-100", kind: "score", score: 100, skin: "brasa" },
    { id: "power", kind: "power" },
    { id: "survivor", kind: "time", score: 15 },
    { id: "zen-mind", kind: "zen", score: 20 },
    { id: "architect", kind: "level", level: 3 },
    { id: "daily-player", kind: "daily", score: 8 },
    { id: "rival", kind: "pvp" },
];

function block(x, y, w, h) {
    const cells = [];
    for (let iy = 0; iy < h; iy++) {
        for (let ix = 0; ix < w; ix++) cells.push([x + ix, y + iy]);
    }
    return cells;
}

function row(y, x0, x1) {
    const cells = [];
    for (let x = x0; x <= x1; x++) cells.push([x, y]);
    return cells;
}

function col(x, y0, y1) {
    const cells = [];
    for (let y = y0; y <= y1; y++) cells.push([x, y]);
    return cells;
}

function arena() {
    const cells = [];
    for (let x = 0; x < gridW; x++) {
        if (x !== 12) {
            cells.push([x, 0]);
            cells.push([x, gridH - 1]);
        }
    }
    for (let y = 1; y < gridH - 1; y++) {
        if (y !== 6) {
            cells.push([0, y]);
            cells.push([gridW - 1, y]);
        }
    }
    return cells;
}

// Grid coords. The center and both duel spawns are cleared again at runtime.
export const LEVELS = [
    { id: "clear", cells: [] },
    { id: "corners", cells: [
        ...block(0, 0, 3, 2),
        ...block(gridW - 3, 0, 3, 2),
        ...block(0, gridH - 2, 3, 2),
        ...block(gridW - 3, gridH - 2, 3, 2),
    ] },
    { id: "pillars", cells: [
        ...block(4, 2, 2, 2),
        ...block(19, 2, 2, 2),
        ...block(4, 9, 2, 2),
        ...block(19, 9, 2, 2),
        ...block(11, 2, 2, 2),
        ...block(11, 9, 2, 2),
    ] },
    { id: "lanes", cells: [
        ...row(3, 2, 10),
        ...row(3, 14, 22),
        ...row(9, 2, 10),
        ...row(9, 14, 22),
    ] },
    { id: "cross", cells: [
        ...row(3, 4, 20),
        ...row(9, 4, 20),
        ...col(8, 1, 4),
        ...col(8, 8, 11),
        ...col(16, 1, 4),
        ...col(16, 8, 11),
    ] },
    { id: "gates", cells: [
        ...col(6, 0, 4),
        ...col(6, 8, 12),
        ...col(18, 0, 4),
        ...col(18, 8, 12),
        ...block(11, 5, 3, 1),
        ...block(11, 7, 3, 1),
    ] },
    { id: "arena", cells: arena() },
];

export const FIREBASE_PROJECT = "snake-a82fa";
export const FIREBASE_API_KEY = "AIzaSyArefU28EHOllP0yttIKUZSME8lOGoSr4o";
