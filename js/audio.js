import { state } from "./state.js";

function ensureAudio() {
    if (!state.audioCtx && typeof AudioContext !== "undefined") {
        state.audioCtx = new AudioContext();
    }
    if (state.audioCtx && state.audioCtx.state === "suspended") state.audioCtx.resume();
    return state.audioCtx;
}

export function playTone(freq, duration, type = "sine", gain = 0.12, delay = 0) {
    if (state.isMuted) return;
    const ctx = ensureAudio();
    if (!ctx) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration);
}

export function playEat() {
    playTone(660, 0.08, "square", 0.1);
}

export function playSpecial() {
    [523, 659, 784, 1047].forEach((f, i) => playTone(f, 0.13, "triangle", 0.13, i * 0.06));
}

export function playGameOver() {
    [392, 311, 233].forEach((f, i) => playTone(f, 0.22, "sawtooth", 0.13, i * 0.12));
}

export function toggleMute() {
    state.isMuted = !state.isMuted;
    localStorage.setItem("snakeMuted", state.isMuted ? "1" : "0");
    updateMuteButton();
    if (!state.isMuted) {
        ensureAudio();
        playTone(880, 0.06, "sine", 0.08);
    }
    document.getElementById("muteToggle")?.blur();
}

export function updateMuteButton() {
    const btn = document.getElementById("muteToggle");
    if (!btn) return;
    btn.textContent = `Sound: ${state.isMuted ? "OFF" : "ON"}`;
    btn.classList.toggle("muted", state.isMuted);
}
