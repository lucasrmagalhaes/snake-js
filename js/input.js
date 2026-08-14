import { state } from "./state.js";
import { resetGame } from "./game.js";
import { openLeaderboard, closeLeaderboard } from "./leaderboard.js";

export function setDirection(dir) {
    const opposite = { left: "right", right: "left", up: "down", down: "up" };
    if (dir !== opposite[state.direction]) state.nextDirection = dir;
}

// Espaco e setas rolariam a pagina durante o jogo.
const SCROLL_KEYS = [" ", "ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"];

function handleKey(event) {
    // Letras chegam minusculas para casar com/sem Shift ou Caps Lock,
    // como o antigo event.keyCode (deprecated) fazia.
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (SCROLL_KEYS.includes(key)) event.preventDefault();
    if (state.showingLeaderboard) {
        if (key === "Escape" || key === "l") closeLeaderboard();
        return;
    }
    if (key === "l") {
        openLeaderboard();
        return;
    }
    if (state.isReady) {
        if (key === "Enter" || key === " ") state.isReady = false;
        return;
    }
    if (state.isGameOver) {
        if (key === "Enter" || key === " ") resetGame();
        return;
    }
    if (key === " " || key === "p") {
        state.isPaused = !state.isPaused;
        return;
    }
    if (key === "ArrowLeft" || key === "a") setDirection("left");
    if (key === "ArrowUp" || key === "w") setDirection("up");
    if (key === "ArrowRight" || key === "d") setDirection("right");
    if (key === "ArrowDown" || key === "s") setDirection("down");
}

function startTouch(e) {
    state.swipeInitialX = e.touches[0].clientX;
    state.swipeInitialY = e.touches[0].clientY;
}

function moveTouch(e) {
    if (state.swipeInitialX === null || state.swipeInitialY === null) return;

    const diffX = state.swipeInitialX - e.touches[0].clientX;
    const diffY = state.swipeInitialY - e.touches[0].clientY;

    if (Math.abs(diffX) > Math.abs(diffY)) {
        setDirection(diffX > 0 ? "left" : "right");
    } else {
        setDirection(diffY > 0 ? "up" : "down");
    }

    state.swipeInitialX = null;
    state.swipeInitialY = null;
    e.preventDefault();
}

export function bindInputs() {
    document.addEventListener("keydown", handleKey);
    document.addEventListener("touchstart", startTouch, false);
    // passive: false — listeners de touchmove em document sao passivos por
    // padrao no Chrome, o que anularia o preventDefault() do swipe.
    document.addEventListener("touchmove", moveTouch, { passive: false });
}
