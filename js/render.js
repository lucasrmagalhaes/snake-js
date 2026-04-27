import { state, settings } from "./state.js";
import { box, boardW, boardH, headerH, gridW, gridH, SPECIAL_TTL, SNAKES } from "./config.js";

const canvas = document.getElementById("snake");
const context = canvas.getContext("2d");

function drawBackground() {
    context.fillStyle = settings.backgroundColor;
    context.fillRect(0, 0, boardW, boardH);

    context.strokeStyle = settings.gridColor;
    context.lineWidth = 1;
    context.beginPath();
    for (let i = 1; i < gridW; i++) {
        context.moveTo(i * box, 0);
        context.lineTo(i * box, boardH);
    }
    for (let i = 1; i < gridH; i++) {
        context.moveTo(0, i * box);
        context.lineTo(boardW, i * box);
    }
    context.stroke();

    if (state.wallMode) {
        context.strokeStyle = "rgba(255, 71, 87, 0.55)";
        context.lineWidth = 2;
        roundedRectPath(4, 4, boardW - 8, boardH - 8, 10);
        context.stroke();
    }
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

function roundedRect(x, y, w, h, r) {
    roundedRectPath(x, y, w, h, r);
    context.fill();
}

function drawSnake() {
    if (state.deathAnim) return;
    const pad = 2;
    const segSize = box - pad * 2;
    const snake = state.snake;

    for (let i = snake.length - 1; i >= 0; i--) {
        const s = snake[i];
        if (i === 0) {
            context.fillStyle = settings.headColor;
            roundedRect(s.x + pad, s.y + pad, segSize, segSize, 8);
        } else {
            const t = 1 - i / Math.max(snake.length, 1);
            context.fillStyle = settings.snakeColor;
            context.globalAlpha = 0.65 + 0.35 * t;
            roundedRect(s.x + pad, s.y + pad, segSize, segSize, 6);
            context.globalAlpha = 1;
        }
    }

    drawEyes(snake[0]);
}

function drawEyes(head) {
    const cx = head.x + box / 2;
    const cy = head.y + box / 2;
    const off = 6;
    const r = 3;

    let e1, e2;
    if (state.direction === "right") { e1 = [cx + off, cy - off]; e2 = [cx + off, cy + off]; }
    else if (state.direction === "left") { e1 = [cx - off, cy - off]; e2 = [cx - off, cy + off]; }
    else if (state.direction === "up") { e1 = [cx - off, cy - off]; e2 = [cx + off, cy - off]; }
    else { e1 = [cx - off, cy + off]; e2 = [cx + off, cy + off]; }

    context.fillStyle = "white";
    context.beginPath();
    context.arc(e1[0], e1[1], r, 0, Math.PI * 2);
    context.arc(e2[0], e2[1], r, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = settings.eyeColor;
    context.beginPath();
    context.arc(e1[0], e1[1], r / 2, 0, Math.PI * 2);
    context.arc(e2[0], e2[1], r / 2, 0, Math.PI * 2);
    context.fill();
}

function drawFood(now) {
    const food = state.food;
    if (!food) return;
    const cx = food.x + box / 2;
    const cy = food.y + box / 2;
    const pulse = 1 + 0.08 * Math.sin(now / 180);
    const r = (box / 2 - 4) * pulse;

    const grad = context.createRadialGradient(cx, cy, 2, cx, cy, r);
    grad.addColorStop(0, "#ffb3b3");
    grad.addColorStop(1, settings.foodColor);

    context.fillStyle = grad;
    context.beginPath();
    context.arc(cx, cy, r, 0, Math.PI * 2);
    context.fill();
}

function drawSpecialFood(now) {
    const sf = state.specialFood;
    if (!sf) return;
    const remaining = sf.expires - now;
    if (remaining <= 0) return;

    const cx = sf.x + box / 2;
    const cy = sf.y + box / 2;
    const baseR = box / 2 - 4;
    const pulse = 1 + 0.14 * Math.sin(now / 110);
    const r = baseR * pulse;

    const grad = context.createRadialGradient(cx, cy, 2, cx, cy, r);
    grad.addColorStop(0, "#fff5b3");
    grad.addColorStop(1, settings.specialColor);
    context.fillStyle = grad;
    context.beginPath();
    context.arc(cx, cy, r, 0, Math.PI * 2);
    context.fill();

    const t = remaining / SPECIAL_TTL;
    context.strokeStyle = "rgba(255, 230, 120, 0.85)";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(cx, cy, baseR + 4, -Math.PI / 2, -Math.PI / 2 + t * Math.PI * 2);
    context.stroke();
}

function drawDeathAnim(now) {
    const da = state.deathAnim;
    if (!da) return;
    const elapsed = now - da.start;
    const dur = 1500;
    if (elapsed > dur) return;

    const t = elapsed / 1000;
    const alpha = Math.max(0, 1 - elapsed / dur);
    context.globalAlpha = alpha;
    context.fillStyle = settings.snakeColor;

    da.particles.forEach(p => {
        const x = p.x + p.vx * t * 60;
        const y = p.y + p.vy * t * 60 + 0.5 * 700 * t * t;
        const radius = (box / 2 - 2) * Math.max(0.4, alpha);
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
    });
    context.globalAlpha = 1;
}

function drawEatEffect(now) {
    const ee = state.eatEffect;
    if (!ee) return;
    const dur = 350;
    const t = (now - ee.start) / dur;
    if (t >= 1) { state.eatEffect = null; return; }

    const cx = ee.x + box / 2;
    const cy = ee.y + box / 2;
    const r = (box / 2) + t * box;

    context.strokeStyle = `rgba(${ee.color}, ${1 - t})`;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(cx, cy, r, 0, Math.PI * 2);
    context.stroke();
}

function drawHUD() {
    context.fillStyle = "#161619";
    context.fillRect(0, 0, boardW, headerH);

    context.fillStyle = "rgba(61, 220, 132, 0.9)";
    context.font = "bold 16px sans-serif";
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillText(`Score: ${state.score}`, 12, headerH / 2);
    context.textAlign = "right";
    context.fillStyle = "rgba(255,255,255,0.85)";
    context.fillText(`High: ${state.highScore}`, boardW - 12, headerH / 2);
    context.textBaseline = "alphabetic";
}

function drawCenterText(title, subtitle) {
    const cx = boardW / 2;
    const cy = boardH / 2;
    context.fillStyle = "rgba(0,0,0,0.65)";
    context.fillRect(0, cy - 60, boardW, 120);
    context.fillStyle = "white";
    context.textAlign = "center";
    context.font = "bold 32px sans-serif";
    context.fillText(title, cx, cy);
    context.font = "16px sans-serif";
    context.fillText(subtitle, cx, cy + 30);
}

function drawStartScreen() {
    const cx = boardW / 2;
    context.fillStyle = "rgba(0,0,0,0.82)";
    context.fillRect(0, 0, boardW, boardH);

    context.textAlign = "center";

    context.fillStyle = settings.snakeColor;
    context.font = "bold 48px sans-serif";
    context.fillText("SNAKE", cx, 70);

    context.fillStyle = "rgba(255,255,255,0.85)";
    context.font = "15px sans-serif";
    const lines = [
        "Arrows or WASD to move",
        "Space / P to pause",
        "Gold food = +5 bonus (limited time)",
        "Speed grows with your score",
        state.wallMode ? "Mode: walls kill" : "Mode: wrap around edges",
    ];
    let y = 130;
    lines.forEach(line => {
        context.fillText(line, cx, y);
        y += 24;
    });

    context.fillStyle = settings.snakeColor;
    context.font = "bold 18px sans-serif";
    context.fillText("Press Space or Enter to start", cx, 300);

    context.fillStyle = "rgba(255,255,255,0.5)";
    context.font = "13px sans-serif";
    const diffLabel = state.activeDifficulty
        ? `${state.activeDifficulty[0].toUpperCase()}${state.activeDifficulty.slice(1)}`
        : "Custom";
    const tagline = `${SNAKES[state.currentSnake].name} · ${diffLabel}`;
    context.fillText(tagline, cx, 340);

    if (state.highScore > 0) {
        context.fillText(`Best: ${state.highScore}`, cx, 360);
    }
}

function drawLeaderboard() {
    const cx = boardW / 2;
    context.fillStyle = "#0d0d10";
    context.fillRect(0, 0, boardW, boardH);

    context.textAlign = "center";
    context.fillStyle = settings.snakeColor;
    context.font = "bold 32px sans-serif";
    context.fillText("RANKING GLOBAL", cx, 50);

    context.fillStyle = "rgba(255,255,255,0.5)";
    context.font = "12px sans-serif";
    context.fillText("L ou Esc para fechar", cx, 72);

    if (state.leaderboardData === "loading") {
        context.fillStyle = "rgba(255,255,255,0.7)";
        context.font = "16px sans-serif";
        context.fillText("Carregando…", cx, 200);
        return;
    }
    if (state.leaderboardData === "error") {
        context.fillStyle = "#ff7b86";
        context.font = "16px sans-serif";
        context.fillText("Falha ao carregar", cx, 200);
        return;
    }
    if (!state.leaderboardData || state.leaderboardData.length === 0) {
        context.fillStyle = "rgba(255,255,255,0.7)";
        context.font = "16px sans-serif";
        context.fillText("Sem scores ainda. Seja o primeiro!", cx, 200);
        return;
    }

    context.textAlign = "left";
    context.font = "14px monospace";
    let y = 110;
    state.leaderboardData.slice(0, 12).forEach((entry, i) => {
        const rank = String(i + 1).padStart(2, " ");
        const name = String(entry.name || "—").slice(0, 18).padEnd(20, " ");
        const sc = String(entry.score || 0).padStart(6, " ");
        const isMe = state.playerName && entry.name === state.playerName;
        context.fillStyle = i === 0 ? settings.specialColor
                          : isMe ? settings.snakeColor
                          : "rgba(255,255,255,0.85)";
        context.fillText(`${rank}. ${name} ${sc}`, 80, y);
        y += 22;
    });
}

export function render() {
    const now = performance.now();

    let shakeX = 0, shakeY = 0;
    if (state.deathAnim) {
        const elapsed = now - state.deathAnim.start;
        if (elapsed < 350) {
            const intensity = (1 - elapsed / 350) * 8;
            shakeX = (Math.random() - 0.5) * intensity * 2;
            shakeY = (Math.random() - 0.5) * intensity * 2;
        }
    }

    context.clearRect(0, 0, boardW, headerH + boardH);
    drawHUD();

    context.save();
    context.translate(shakeX, headerH + shakeY);
    drawBackground();
    drawFood(now);
    drawSpecialFood(now);
    drawSnake();
    drawDeathAnim(now);
    drawEatEffect(now);
    if (state.isReady) drawStartScreen();
    else if (state.isPaused && !state.isGameOver) drawCenterText("Paused", "Press Space/P to resume");
    if (state.isGameOver) drawCenterText(`Game Over — ${state.score}`, "Press Space/Enter to restart");
    if (state.showingLeaderboard) drawLeaderboard();
    context.restore();

    requestAnimationFrame(render);
}
