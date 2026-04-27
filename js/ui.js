import { state, settings } from "./state.js";
import { DIFFICULTIES, SNAKES } from "./config.js";
import { setSpeed, effectiveInterval } from "./game.js";
import { toggleMute, updateMuteButton } from "./audio.js";
import { openLeaderboard } from "./leaderboard.js";

export function clearActiveDifficulty() {
    if (!state.activeDifficulty) return;
    state.activeDifficulty = null;
    localStorage.removeItem("snakeDifficulty");
    updateDifficultyButtons();
}

export function applyDifficulty(name) {
    const d = DIFFICULTIES[name];
    if (!d) return;
    settings.speed = d.speed;
    state.wallMode = d.walls;
    state.accelPerScore = d.accelPerScore;
    state.minInterval = d.minInterval;
    state.activeDifficulty = name;

    const slider = document.getElementById("speed");
    if (slider) slider.value = (Number.parseInt(slider.max) + Number.parseInt(slider.min)) - settings.speed;

    localStorage.setItem("snakeWalls", state.wallMode ? "1" : "0");
    localStorage.setItem("snakeDifficulty", name);

    updateWallButton();
    updateDifficultyButtons();

    if (!state.isGameOver) setSpeed(effectiveInterval());
    document.getElementById(`diff_${name}`)?.blur();
}

export function updateDifficultyButtons() {
    Object.keys(DIFFICULTIES).forEach(d => {
        const btn = document.getElementById(`diff_${d}`);
        if (btn) btn.classList.toggle("active", state.activeDifficulty === d);
    });
}

export function applySpeed() {
    const speedInput = document.getElementById("speed");
    settings.speed = (Number.parseInt(speedInput.max) + Number.parseInt(speedInput.min)) - Number.parseInt(speedInput.value);
    if (!state.isGameOver) setSpeed(effectiveInterval());
    speedInput.blur();
    clearActiveDifficulty();
}

export function toggleWalls() {
    if (!state.isReady && !state.isGameOver) return;
    state.wallMode = !state.wallMode;
    localStorage.setItem("snakeWalls", state.wallMode ? "1" : "0");
    updateWallButton();
    document.getElementById("wallToggle")?.blur();
    clearActiveDifficulty();
}

export function updateWallButton() {
    const btn = document.getElementById("wallToggle");
    if (!btn) return;
    btn.textContent = `Walls: ${state.wallMode ? "ON" : "OFF"}`;
    btn.classList.toggle("on", state.wallMode);
}

export function applySnake(name) {
    if (name && SNAKES[name]) state.currentSnake = name;
    const s = SNAKES[state.currentSnake];
    settings.snakeColor = s.body;
    settings.headColor = s.head;
    settings.eyeColor = s.eye;
    localStorage.setItem("snakeCharacter", state.currentSnake);
    const sel = document.getElementById("snakeSelect");
    if (sel) {
        sel.value = state.currentSnake;
        sel.style.color = s.body;
        sel.style.borderColor = s.body;
        sel.blur();
    }
}

export function toggleFullscreen() {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        document.documentElement.requestFullscreen().catch(() => {});
    }
    document.getElementById("fsToggle")?.blur();
}

export function bindUI() {
    Object.keys(DIFFICULTIES).forEach(d => {
        document.getElementById(`diff_${d}`)?.addEventListener("click", () => applyDifficulty(d));
    });
    document.getElementById("speed")?.addEventListener("change", applySpeed);
    document.getElementById("snakeSelect")?.addEventListener("change", e => applySnake(e.target.value));
    document.getElementById("wallToggle")?.addEventListener("click", toggleWalls);
    document.getElementById("muteToggle")?.addEventListener("click", toggleMute);
    document.getElementById("fsToggle")?.addEventListener("click", toggleFullscreen);
    document.getElementById("lbBtn")?.addEventListener("click", openLeaderboard);

    document.addEventListener("fullscreenchange", () => {
        const btn = document.getElementById("fsToggle");
        if (btn) btn.textContent = document.fullscreenElement ? "Exit Fullscreen" : "Fullscreen";
    });

    updateWallButton();
    updateMuteButton();
    updateDifficultyButtons();
}
