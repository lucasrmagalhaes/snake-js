import { state } from "./state.js";
import { resetGame } from "./game.js";
import { openLeaderboard, closeLeaderboard } from "./leaderboard.js";

export function setDirection(dir) {
    const opposite = { left: "right", right: "left", up: "down", down: "up" };
    if (dir !== opposite[state.direction]) state.nextDirection = dir;
}

function handleKey(event) {
    if (state.showingLeaderboard) {
        if (event.keyCode === 27 || event.keyCode === 76) closeLeaderboard();
        return;
    }
    if (event.keyCode === 76) {
        openLeaderboard();
        return;
    }
    if (state.isReady) {
        if (event.keyCode === 13 || event.keyCode === 32) state.isReady = false;
        return;
    }
    if (state.isGameOver) {
        if (event.keyCode === 13 || event.keyCode === 32) resetGame();
        return;
    }
    if (event.keyCode === 32 || event.keyCode === 80) {
        state.isPaused = !state.isPaused;
        return;
    }
    if (event.keyCode === 37 || event.keyCode === 65) setDirection("left");
    if (event.keyCode === 38 || event.keyCode === 87) setDirection("up");
    if (event.keyCode === 39 || event.keyCode === 68) setDirection("right");
    if (event.keyCode === 40 || event.keyCode === 83) setDirection("down");
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
    document.addEventListener("touchmove", moveTouch, false);
}
