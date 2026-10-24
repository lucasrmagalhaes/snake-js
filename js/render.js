import { state, settings } from "./state.js";
import {
    box, boardW, boardH, headerH, gridW, gridH,
    TIME_LIMIT, POWER_BOARD_MS,
} from "./config.js";
import { activeWalls, visualElapsed, highForMode } from "./game.js";
import { t } from "./i18n.js";

const canvas = document.getElementById("snake");
const context = canvas.getContext("2d");
const stage = document.getElementById("stage");
const statusEl = document.getElementById("status");

function moveT(now) {
    if (state.reduceMotion || state.isReady || state.isGameOver || state.isPaused) return 1;
    const dur = state.moveDuration || 1;
    return Math.min(1, Math.max(0, (now - state.moveStart) / dur));
}

function segmentPosition(player, index, t) {
    const current = player.snake[index];
    const prev = player.prevSnake;
    if (!current) return { x: 0, y: 0 };
    if (!prev || state.reduceMotion) return current;
    const from = player.grew
        ? (index === 0 ? prev[0] : prev[index - 1])
        : prev[index];
    if (!from) return current;
    const dx = current.x - from.x;
    const dy = current.y - from.y;
    if (Math.abs(dx) > box || Math.abs(dy) > box) return current;
    return { x: from.x + dx * t, y: from.y + dy * t };
}

function roundedRectPath(x, y, w, h, r) {
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
}

function fillRound(x, y, w, h, r) {
    roundedRectPath(x, y, w, h, r);
    context.fill();
}

function drawBackground() {
    context.fillStyle = settings.backgroundColor;
    context.fillRect(0, 0, boardW, boardH);

    context.strokeStyle = settings.gridColor;
    context.lineWidth = 1;
    context.beginPath();
    for (let i = 1; i < gridW; i++) {
        context.moveTo(i * box + 0.5, 0);
        context.lineTo(i * box + 0.5, boardH);
    }
    for (let i = 1; i < gridH; i++) {
        context.moveTo(0, i * box + 0.5);
        context.lineTo(boardW, i * box + 0.5);
    }
    context.stroke();

    if (activeWalls()) {
        context.strokeStyle = "rgba(255, 71, 87, 0.55)";
        context.lineWidth = 2;
        roundedRectPath(4, 4, boardW - 8, boardH - 8, 10);
        context.stroke();
    }
}

function drawObstacles() {
    for (const cell of state.obstacles) {
        context.fillStyle = "#241018";
        fillRound(cell.x + 3, cell.y + 3, box - 6, box - 6, 4);
        context.strokeStyle = "rgba(255, 90, 110, 0.85)";
        context.lineWidth = 1.5;
        roundedRectPath(cell.x + 3, cell.y + 3, box - 6, box - 6, 4);
        context.stroke();
    }
}

function drawSnake(player, t, ghost) {
    if (!player.snake.length) return;
    const pad = 2;
    const size = box - pad * 2;
    const skin = player.skin;
    context.save();
    context.shadowColor = skin.body;
    context.shadowBlur = ghost ? 8 : 16;

    for (let i = player.snake.length - 1; i >= 0; i--) {
        const pos = segmentPosition(player, i, t);
        const fade = 1 - i / Math.max(player.snake.length, 1);
        if (i === 0) {
            context.fillStyle = skin.head;
            context.globalAlpha = ghost ? 0.55 : 1;
        } else {
            context.fillStyle = skin.body;
            context.globalAlpha = (ghost ? 0.45 : 1) * (0.62 + 0.38 * fade);
        }
        fillRound(pos.x + pad, pos.y + pad, size, size, i === 0 ? 8 : 6);
    }
    context.restore();

    drawEyes(segmentPosition(player, 0, t), player.direction, skin, state.food);
}

function drawEyes(head, direction, skin, food) {
    const cx = head.x + box / 2;
    const cy = head.y + box / 2;
    const off = 6;
    let e1;
    let e2;
    if (direction === "left") { e1 = [cx - 4, cy - off]; e2 = [cx - 4, cy + off]; }
    else if (direction === "up") { e1 = [cx - off, cy - 4]; e2 = [cx + off, cy - 4]; }
    else if (direction === "down") { e1 = [cx - off, cy + 4]; e2 = [cx + off, cy + 4]; }
    else { e1 = [cx + 4, cy - off]; e2 = [cx + 4, cy + off]; }

    let lookX = 0;
    let lookY = 0;
    if (food) {
        const dx = food.x + box / 2 - cx;
        const dy = food.y + box / 2 - cy;
        const len = Math.hypot(dx, dy) || 1;
        lookX = (dx / len) * 1.8;
        lookY = (dy / len) * 1.8;
    }

    context.fillStyle = "#ffffff";
    context.beginPath();
    context.arc(e1[0], e1[1], 3.1, 0, Math.PI * 2);
    context.arc(e2[0], e2[1], 3.1, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = skin.eye;
    context.beginPath();
    context.arc(e1[0] + lookX, e1[1] + lookY, 1.5, 0, Math.PI * 2);
    context.arc(e2[0] + lookX, e2[1] + lookY, 1.5, 0, Math.PI * 2);
    context.fill();
}

function drawFood(now) {
    const food = state.food;
    if (!food) return;
    const cx = food.x + box / 2;
    const cy = food.y + box / 2;
    const pulse = 1 + 0.08 * Math.sin(now / 180);
    const radius = (box / 2 - 4) * pulse;
    const grad = context.createRadialGradient(cx - 3, cy - 3, 2, cx, cy, radius);
    grad.addColorStop(0, "#ffb3b3");
    grad.addColorStop(1, settings.foodColor);
    context.save();
    context.shadowColor = settings.foodColor;
    context.shadowBlur = 12;
    context.fillStyle = grad;
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.fill();
    if ((state.effects.double || 0) > visualElapsed(now)) {
        context.shadowBlur = 0;
        context.strokeStyle = "#ffd24a";
        context.lineWidth = 2;
        context.beginPath();
        context.arc(cx, cy, radius + 3, 0, Math.PI * 2);
        context.stroke();
    }
    context.restore();
}

function powerFill(type) {
    if (type === "double") return "#ffd24a";
    if (type === "slow") return "#7ec8ff";
    if (type === "ghost") return "#d088ff";
    return "#7dffb3";
}

function powerGlyph(type) {
    if (type === "double") return "2";
    if (type === "slow") return "S";
    if (type === "ghost") return "G";
    return "-";
}

function drawPowerUp(now) {
    const item = state.powerUp;
    if (!item) return;
    const elapsed = visualElapsed(now);
    if (elapsed >= item.until) return;
    const cx = item.x + box / 2;
    const cy = item.y + box / 2;
    const color = powerFill(item.type);
    const pulse = 1 + 0.1 * Math.sin(now / 120);
    const radius = (box / 2 - 5) * pulse;
    context.save();
    context.shadowColor = color;
    context.shadowBlur = 14;
    context.fillStyle = color;
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = "#16120a";
    context.font = "700 14px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(powerGlyph(item.type), cx, cy + 1);
    const left = Math.max(0, item.until - elapsed) / POWER_BOARD_MS;
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(cx, cy, radius + 4, -Math.PI / 2, -Math.PI / 2 + Math.max(0.02, left) * Math.PI * 2);
    context.stroke();
    context.restore();
}

function drawParticles(now) {
    const keep = [];
    for (const particle of state.particles) {
        const age = now - particle.born;
        if (age > particle.life) continue;
        keep.push(particle);
        const k = age / 1000;
        const x = particle.x + particle.vx * k;
        const y = particle.y + particle.vy * k + 90 * k * k;
        context.globalAlpha = 1 - age / particle.life;
        context.fillStyle = particle.color;
        context.fillRect(x, y, particle.size, particle.size);
    }
    context.globalAlpha = 1;
    state.particles = keep;
}

function drawEatEffect(now) {
    const effect = state.eatEffect;
    if (!effect) return;
    const dur = 360;
    const t = (now - effect.start) / dur;
    if (t >= 1) {
        state.eatEffect = null;
        return;
    }
    const cx = effect.x + box / 2;
    const cy = effect.y + box / 2;
    context.strokeStyle = hexAlpha(effect.color || "#ff4757", 1 - t);
    context.lineWidth = 3;
    context.beginPath();
    context.arc(cx, cy, box / 2 + t * box, 0, Math.PI * 2);
    context.stroke();
}

function hexAlpha(hex, alpha) {
    const raw = hex.replace("#", "");
    const value = raw.length === 3
        ? raw.split("").map(ch => ch + ch).join("")
        : raw;
    const num = parseInt(value, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
}

function drawDeathAnim(now) {
    const anim = state.deathAnim;
    if (!anim) return;
    const elapsed = now - anim.start;
    const dur = 1400;
    if (elapsed > dur) return;
    const t = elapsed / 1000;
    const alpha = Math.max(0, 1 - elapsed / dur);
    for (const particle of anim.particles) {
        const x = particle.x + particle.vx * t * 60;
        const y = particle.y + particle.vy * t * 60 + 0.5 * 700 * t * t;
        context.globalAlpha = alpha;
        context.fillStyle = particle.color || settings.snakeColor;
        context.beginPath();
        context.arc(x, y, (box / 2 - 2) * Math.max(0.35, alpha), 0, Math.PI * 2);
        context.fill();
    }
    context.globalAlpha = 1;
}

function clock(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return minutes + ":" + String(seconds).padStart(2, "0");
}

function centerLabel(now) {
    let label;
    if (state.mode === "time") label = clock(TIME_LIMIT - visualElapsed(now));
    else if (state.mode === "obstacles") label = t("levelShort", { n: state.level });
    else if (state.mode === "daily") label = t("dailyShort");
    else label = t("modeLabel_" + state.mode);
    if (state.isReplaying) label = t("replayTag") + " " + label;
    return label;
}

function rightHudX() {
    const scale = canvas.clientWidth > 0 ? canvas.clientWidth / boardW : 1;
    const btn = document.getElementById("pauseBtn");
    const css = btn && !btn.hidden ? Math.max(btn.offsetWidth, 36) + 14 : 12;
    return boardW - Math.max(12, css / scale);
}

function drawHUD(now) {
    context.fillStyle = "#121218";
    context.fillRect(0, 0, boardW, headerH);
    context.textBaseline = "middle";
    context.font = "700 15px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

    const p1 = state.players[0];
    const p2 = state.players[1];
    const doubled = (state.effects.double || 0) > visualElapsed(now);
    const rightX = rightHudX();

    if (p2) {
        context.textAlign = "left";
        context.fillStyle = p1.skin.body;
        context.fillText("P1 " + p1.score, 12, headerH / 2);
        context.textAlign = "right";
        context.fillStyle = p2.skin.body;
        context.fillText("P2 " + p2.score, rightX, headerH / 2);
    } else {
        context.textAlign = "left";
        context.fillStyle = doubled ? "#ffd24a" : "rgba(61, 220, 132, 0.95)";
        context.fillText(t("scoreLabel") + " " + (p1 ? p1.score : 0), 12, headerH / 2);
        context.textAlign = "right";
        context.fillStyle = "rgba(255,255,255,0.88)";
        context.fillText(t("bestLabel") + " " + highForMode(), rightX, headerH / 2);
    }

    context.textAlign = "center";
    context.fillStyle = "rgba(255,255,255,0.92)";
    context.fillText(centerLabel(now), boardW / 2, headerH / 2);
    context.textBaseline = "alphabetic";
}

function drawEffectChips(now) {
    const elapsed = visualElapsed(now);
    const chips = [];
    if ((state.effects.double || 0) > elapsed) {
        chips.push({ label: t("fxDouble"), ms: state.effects.double - elapsed, color: "#ffd24a" });
    }
    if ((state.effects.slow || 0) > elapsed) {
        chips.push({ label: t("fxSlow"), ms: state.effects.slow - elapsed, color: "#7ec8ff" });
    }
    if ((state.effects.ghost || 0) > elapsed) {
        chips.push({ label: t("fxGhost"), ms: state.effects.ghost - elapsed, color: "#d088ff" });
    }
    if ((state.effects.shrink || 0) > elapsed) {
        chips.push({ label: t("fxShrink"), ms: state.effects.shrink - elapsed, color: "#7dffb3" });
    }
    if (!chips.length) return;

    context.font = "700 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    context.textBaseline = "middle";
    let x = 8;
    const y = 8;
    for (const chip of chips) {
        const seconds = Math.max(0, Math.ceil(chip.ms / 1000));
        const text = chip.label + " " + seconds + "s";
        const width = context.measureText(text).width + 16;
        context.fillStyle = "rgba(0,0,0,0.62)";
        fillRound(x, y, width, 20, 8);
        context.fillStyle = chip.color;
        context.textAlign = "left";
        context.fillText(text, x + 8, y + 11);
        x += width + 6;
    }
    context.textBaseline = "alphabetic";
}

function drawLevelFlash(now) {
    if (!state.levelFlash) return;
    const age = now - state.levelFlash;
    if (age > 900) return;
    context.save();
    context.globalAlpha = 1 - age / 900;
    context.fillStyle = "#ffffff";
    context.font = "700 36px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(t("levelShort", { n: state.level }), boardW / 2, 36);
    context.restore();
}

function publishStatus(now) {
    if (!stage || !statusEl) return;
    const p1 = state.players[0] ? state.players[0].score : 0;
    const p2 = state.players[1] ? state.players[1].score : "";
    const elapsed = visualElapsed(now);
    const fx = ["double", "slow", "ghost", "shrink"].filter(name => (state.effects[name] || 0) > elapsed).join(",");
    stage.dataset.score = String(p1);
    stage.dataset.p2 = p2 === "" ? "" : String(p2);
    stage.dataset.mode = state.mode;
    stage.dataset.menu = state.menu;
    stage.dataset.running = (!state.isReady && !state.isPaused && !state.isGameOver && state.menu === "hidden") ? "1" : "0";
    stage.dataset.power = state.powerUp ? state.powerUp.type : "";
    stage.dataset.effects = fx;
    stage.dataset.level = String(state.level);
    stage.dataset.over = state.isGameOver ? (state.endReason || "1") : "";
    const line = t("scoreLabel") + " " + p1 + (p2 === "" ? "" : " P2 " + p2);
    if (statusEl.textContent !== line) statusEl.textContent = line;
}

export function render() {
    try {
        renderFrame();
    } catch (err) {
        console.error(err);
    }
    requestAnimationFrame(render);
}

function renderFrame() {
    const now = performance.now();
    if (!state.players.length) return;

    let shakeX = 0;
    let shakeY = 0;
    if (state.shake && !state.reduceMotion) {
        const age = now - state.shake.start;
        if (age < state.shake.dur) {
            const mag = state.shake.mag * (1 - age / state.shake.dur);
            shakeX = (Math.random() - 0.5) * mag * 2;
            shakeY = (Math.random() - 0.5) * mag * 2;
        }
    }

    context.clearRect(0, 0, boardW, headerH + boardH);
    drawHUD(now);

    context.save();
    context.beginPath();
    context.rect(0, headerH, boardW, boardH);
    context.clip();
    context.translate(shakeX, headerH + shakeY);

    const t = moveT(now);
    const ghost = (state.effects.ghost || 0) > visualElapsed(now);
    drawBackground();
    drawObstacles();
    drawFood(now);
    drawPowerUp(now);
    if (!state.deathAnim) {
        for (const player of state.players) drawSnake(player, t, ghost);
    }
    drawParticles(now);
    drawDeathAnim(now);
    drawEatEffect(now);
    drawEffectChips(now);
    drawLevelFlash(now);
    context.restore();

    publishStatus(now);
}
