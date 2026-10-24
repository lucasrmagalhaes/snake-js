import { state, settings, hooks } from "./state.js";
import { SNAKES, boardW, boardH, REPLAY_INPUT_CAP } from "./config.js";
import { t } from "./i18n.js";
import { dateKey } from "./rng.js";

export function replayKey(run) {
    if (!run) return "classic";
    return run.twoPlayer ? run.mode + "-2p" : run.mode;
}

export function validReplay(run) {
    return Boolean(run
        && typeof run.seed === "number"
        && typeof run.mode === "string"
        && Array.isArray(run.inputs));
}

export function bestFor(mode, twoPlayer) {
    const key = twoPlayer ? mode + "-2p" : mode;
    const run = state.bestReplays[key];
    return validReplay(run) ? run : null;
}

export function captureRun() {
    const p1 = state.players[0];
    const p2 = state.players[1];
    const snakeId = state.isReplaying && state.replayData
        ? state.replayData.snake
        : state.currentSnake;
    return {
        v: 1,
        seed: state.seed >>> 0,
        mode: state.mode,
        twoPlayer: state.twoPlayer,
        walls: state.wallMode,
        speed: settings.speed,
        accelPerScore: state.accelPerScore,
        minInterval: state.minInterval,
        snake: snakeId,
        score: p1 ? p1.score : 0,
        p2score: p2 ? p2.score : 0,
        ticks: state.tick,
        inputs: state.replayInputs.map(inp => ({ t: inp.t, p: inp.p, d: inp.d })),
        date: dateKey(),
    };
}

export function rememberBest(run) {
    if (!validReplay(run) || state.isReplaying) return;
    const worth = Math.max(run.score || 0, run.p2score || 0);
    if (worth <= 0) return;
    if (run.inputs.length > REPLAY_INPUT_CAP) return;
    const key = replayKey(run);
    const prev = state.bestReplays[key];
    const prevWorth = prev ? Math.max(prev.score || 0, prev.p2score || 0) : -1;
    if (prev && prevWorth >= worth) return;
    state.bestReplays[key] = run;
    try {
        localStorage.setItem("snakeBestReplays", JSON.stringify(state.bestReplays));
    } catch (err) {
        // Storage can refuse a long replay. The score itself is kept elsewhere.
        delete state.bestReplays[key];
    }
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

export function drawScoreCard(run) {
    const canvas = document.createElement("canvas");
    canvas.width = boardW;
    canvas.height = boardH;
    const ctx = canvas.getContext("2d");
    const skin = SNAKES[run.snake] || SNAKES.verdao;

    ctx.fillStyle = "#0d0d10";
    ctx.fillRect(0, 0, boardW, boardH);

    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 32; x < boardW; x += 32) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, boardH);
    }
    for (let y = 32; y < boardH; y += 32) {
        ctx.moveTo(0, y);
        ctx.lineTo(boardW, y);
    }
    ctx.stroke();

    ctx.strokeStyle = skin.body;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 3;
    roundRect(ctx, 18, 18, boardW - 36, boardH - 36, 16);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.textAlign = "center";
    ctx.fillStyle = skin.body;
    ctx.font = "700 42px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.shadowColor = skin.body;
    ctx.shadowBlur = 16;
    ctx.fillText("SNAKE", boardW / 2, 92);
    ctx.shadowBlur = 0;

    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "16px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    const modeName = t("mode_" + (run.mode || "classic"));
    const duel = run.twoPlayer ? "  |  2P" : "";
    ctx.fillText(modeName + duel, boardW / 2, 128);

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 84px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.fillText(String(run.score || 0), boardW / 2, 230);

    ctx.font = "18px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    if (run.twoPlayer) {
        ctx.fillText(t("duelLine", { p1: run.score || 0, p2: run.p2score || 0 }), boardW / 2, 270);
    } else {
        const best = (state.highScores && state.highScores[run.mode]) || run.score || 0;
        ctx.fillText(t("bestLine", { score: best }), boardW / 2, 270);
    }

    ctx.font = "15px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.fillStyle = skin.body;
    ctx.fillText((skin.name || "Snake") + "  |  " + (run.date || dateKey()), boardW / 2, 318);

    const y = 360;
    ctx.shadowColor = skin.body;
    ctx.shadowBlur = 12;
    for (let i = 0; i < 5; i++) {
        const x = boardW / 2 - 80 + i * 34;
        ctx.fillStyle = i === 4 ? skin.head : skin.body;
        ctx.globalAlpha = 0.55 + i * 0.1;
        roundRect(ctx, x, y, 26, 26, 6);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    return canvas;
}

export async function shareRun(run) {
    if (!run) return;
    const canvas = drawScoreCard(run);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;
    const file = new File([blob], "snake-score.png", { type: "image/png" });
    const text = t("shareText", { score: run.score || 0 });
    try {
        const payload = { title: "Snake", text, files: [file] };
        const canFiles = typeof navigator.canShare === "function"
            ? navigator.canShare({ files: [file] })
            : false;
        if (typeof navigator.share === "function" && canFiles) {
            await navigator.share(payload);
            return;
        }
        if (typeof navigator.share === "function") {
            await navigator.share({ title: "Snake", text });
            return;
        }
    } catch (err) {
        if (err && err.name === "AbortError") return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "snake-score.png";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    hooks.toast(t("savedImage"));
}
