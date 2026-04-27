export const box = 32;
export const gridW = 25;
export const gridH = 13;
export const boardW = gridW * box;
export const boardH = gridH * box;
export const headerH = 32;

export const SPECIAL_TTL = 6000;
export const SPECIAL_SCORE = 5;
export const SPECIAL_CHANCE = 0.25;

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
    naja:     { name: "Naja",     body: "#d8d8d8", head: "#ffffff", eye: "#0d0d10" },
    brasa:    { name: "Brasa",    body: "#ffd24a", head: "#fff0a8", eye: "#3a1d00" },
};

export const FIREBASE_PROJECT = "snake-a82fa";
export const FIREBASE_API_KEY = "AIzaSyArefU28EHOllP0yttIKUZSME8lOGoSr4o";
