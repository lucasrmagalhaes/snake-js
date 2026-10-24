import { state } from "./state.js";
import {
    isPlaying, startRun, pauseGame, resumeGame, quitToMenu, pushBuffer,
} from "./game.js";
import { openRanking, closePanel } from "./ui.js";

const WASD = { a: "left", w: "up", d: "right", s: "down" };
const ARROWS = {
    ArrowLeft: "left",
    ArrowUp: "up",
    ArrowRight: "right",
    ArrowDown: "down",
};

export function queueDirection(playerId, dir) {
    if (state.isReplaying) return;
    const player = state.players.find(entry => entry.id === playerId);
    if (!player || !isPlaying()) return;
    pushBuffer(player, dir, true);
}

function mapKey(key) {
    if (WASD[key]) return { id: 1, dir: WASD[key] };
    if (ARROWS[key]) return { id: state.twoPlayer ? 2 : 1, dir: ARROWS[key] };
    return null;
}

function typingTarget(event) {
    const tag = event.target && event.target.tagName;
    return tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || tag === "BUTTON" || tag === "A";
}

function handleKey(event) {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (typingTarget(event)) return;

    if (key === " " || key.startsWith("Arrow")) event.preventDefault();

    if (key === "Escape") {
        if (closePanel()) return;
        if (isPlaying()) pauseGame();
        else if (state.isPaused) resumeGame();
        else if (state.menu === "over") quitToMenu();
        return;
    }

    if (key === "l") {
        if (state.menu === "rank") closePanel();
        else openRanking();
        return;
    }

    if (state.menu === "rank" || state.menu === "ach") return;

    if (state.menu === "start" && (key === "Enter" || key === " ")) {
        startRun();
        return;
    }
    if (state.menu === "over" && (key === "Enter" || key === " ")) {
        startRun();
        return;
    }
    if ((key === " " || key === "p") && (isPlaying() || state.isPaused)) {
        if (isPlaying()) pauseGame();
        else resumeGame();
        return;
    }

    const mapped = mapKey(key);
    if (!mapped) return;
    if (state.menu === "start") startRun();
    queueDirection(mapped.id, mapped.dir);
}

function pressPad(dir, event) {
    event.preventDefault();
    event.stopPropagation();
    if (state.isReplaying) return;
    if (state.menu === "start") startRun();
    queueDirection(1, dir);
    if (event.currentTarget && typeof event.currentTarget.blur === "function") {
        event.currentTarget.blur();
    }
}

function bindPad(button) {
    const dir = button.dataset.dir;
    if (window.PointerEvent) {
        button.addEventListener("pointerdown", event => pressPad(dir, event));
    } else {
        button.addEventListener("touchstart", event => pressPad(dir, event), { passive: false });
    }
}

function onTouchStart(event) {
    if (event.touches.length !== 1) return;
    state.swipeInitialX = event.touches[0].clientX;
    state.swipeInitialY = event.touches[0].clientY;
}

function onTouchMove(event) {
    if (state.swipeInitialX == null || state.swipeInitialY == null) return;
    const dx = event.touches[0].clientX - state.swipeInitialX;
    const dy = event.touches[0].clientY - state.swipeInitialY;
    if (Math.abs(dx) < 28 && Math.abs(dy) < 28) return;
    const dir = Math.abs(dx) > Math.abs(dy)
        ? (dx > 0 ? "right" : "left")
        : (dy > 0 ? "down" : "up");
    state.swipeInitialX = null;
    state.swipeInitialY = null;
    if (state.menu !== "hidden" && state.menu !== "start") return;
    if (state.menu === "start") startRun();
    queueDirection(1, dir);
    event.preventDefault();
}

export function bindInputs() {
    document.addEventListener("keydown", handleKey);
    const canvas = document.getElementById("snake");
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    document.querySelectorAll("#dpad button").forEach(bindPad);
}
