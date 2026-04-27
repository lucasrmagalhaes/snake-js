const settings = {
    speed: 100,
    foodColor: "#ff4757",
    specialColor: "#ffb700",
    backgroundColor: "#0d0d10",
    gridColor: "rgba(255,255,255,0.04)",
    snakeColor: "#3ddc84",
    headColor: "#7fffaa",
    eyeColor: "#0d0d10"
};

const SPECIAL_TTL = 6000;
const SPECIAL_SCORE = 5;
const SPECIAL_CHANCE = 0.25;

// Dreamlo leaderboard — crie em https://dreamlo.com/ e cole as duas chaves abaixo.
// Sem chaves, o botao Ranking exibe um aviso e o submit fica desligado.
const DREAMLO_PUBLIC = "69eed7af8f40bb10688cf284";
const DREAMLO_PRIVATE = "zSnZdm9_pkCvFKLuS2qrBwSBXGx9ghXkCXIKmzB7smbQ";

const DIFFICULTIES = {
    easy:   { speed: 130, walls: false, accelPerScore: 2, minInterval: 70 },
    normal: { speed: 100, walls: false, accelPerScore: 3, minInterval: 55 },
    hard:   { speed: 70,  walls: true,  accelPerScore: 4, minInterval: 45 },
};

const SNAKES = {
    verdao:   { name: "Verdão",   body: "#3ddc84", head: "#7fffaa", eye: "#0d0d10" },
    coral:    { name: "Coral",    body: "#ff8c42", head: "#ffb074", eye: "#0d0d10" },
    jararaca: { name: "Jararaca", body: "#b85cff", head: "#d088ff", eye: "#0d0d10" },
    piton:    { name: "Píton",    body: "#4ad9d9", head: "#80e8e8", eye: "#0d0d10" },
    naja:     { name: "Naja",     body: "#d8d8d8", head: "#ffffff", eye: "#0d0d10" },
    brasa:    { name: "Brasa",    body: "#ffd24a", head: "#fff0a8", eye: "#3a1d00" },
};

let ACCEL_PER_SCORE = 3;
let MIN_INTERVAL = 55;

const canvas = document.getElementById('snake');
const context = canvas.getContext('2d');
const box = 32;
const gridW = 25;
const gridH = 13;
const boardW = gridW * box;
const boardH = gridH * box;
const headerH = 32;

let snake;
let direction;
let nextDirection;
let food;
let specialFood = null;
let score;
let highScore = Number(localStorage.getItem("snakeHighScore")) || 0;
let wallMode = localStorage.getItem("snakeWalls") === "1";
let isMuted = localStorage.getItem("snakeMuted") === "1";
let activeDifficulty = localStorage.getItem("snakeDifficulty");
if (!DIFFICULTIES[activeDifficulty]) activeDifficulty = null;
let currentSnake = localStorage.getItem("snakeCharacter");
if (!SNAKES[currentSnake]) currentSnake = "verdao";
let playerName = localStorage.getItem("snakePlayerName") || "";
let leaderboardData = null;
let showingLeaderboard = false;
let audioCtx = null;

function ensureAudio() {
    if (!audioCtx && typeof AudioContext !== "undefined") {
        audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
}

function playTone(freq, duration, type = "sine", gain = 0.12, delay = 0) {
    if (isMuted) return;
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

function playEat() {
    playTone(660, 0.08, "square", 0.1);
}

function playSpecial() {
    [523, 659, 784, 1047].forEach((f, i) => playTone(f, 0.13, "triangle", 0.13, i * 0.06));
}

function playGameOver() {
    [392, 311, 233].forEach((f, i) => playTone(f, 0.22, "sawtooth", 0.13, i * 0.12));
}
let isPaused = false;
let isGameOver = false;
let isReady = true;
let jogo;
let eatEffect = null;
let deathAnim = null;

function effectiveInterval() {
    return Math.max(MIN_INTERVAL, settings.speed - score * ACCEL_PER_SCORE);
}

function resetGame() {
    snake = [{ x: Math.floor(gridW / 2) * box, y: Math.floor(gridH / 2) * box }];
    direction = "right";
    nextDirection = "right";
    score = 0;
    isGameOver = false;
    isPaused = false;
    isReady = true;
    eatEffect = null;
    deathAnim = null;
    specialFood = null;
    food = spawnFreeCell();
    setSpeed(effectiveInterval());
}

function spawnFreeCell(extra = []) {
    const occupied = new Set(snake.concat(extra).map(c => `${c.x},${c.y}`));
    const free = [];
    for (let x = 0; x < gridW; x++) {
        for (let y = 0; y < gridH; y++) {
            const key = `${x * box},${y * box}`;
            if (!occupied.has(key)) free.push({ x: x * box, y: y * box });
        }
    }
    if (!free.length) return null;
    return free[Math.floor(Math.random() * free.length)];
}

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

    if (wallMode) {
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
    if (deathAnim) return;
    const pad = 2;
    const segSize = box - pad * 2;

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
    if (direction === "right") { e1 = [cx + off, cy - off]; e2 = [cx + off, cy + off]; }
    else if (direction === "left") { e1 = [cx - off, cy - off]; e2 = [cx - off, cy + off]; }
    else if (direction === "up") { e1 = [cx - off, cy - off]; e2 = [cx + off, cy - off]; }
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
    if (!specialFood) return;
    const remaining = specialFood.expires - now;
    if (remaining <= 0) return;

    const cx = specialFood.x + box / 2;
    const cy = specialFood.y + box / 2;
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
    if (!deathAnim) return;
    const elapsed = now - deathAnim.start;
    const dur = 1500;
    if (elapsed > dur) return;

    const t = elapsed / 1000;
    const alpha = Math.max(0, 1 - elapsed / dur);
    context.globalAlpha = alpha;
    context.fillStyle = settings.snakeColor;

    deathAnim.particles.forEach(p => {
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
    if (!eatEffect) return;
    const dur = 350;
    const t = (now - eatEffect.start) / dur;
    if (t >= 1) { eatEffect = null; return; }

    const cx = eatEffect.x + box / 2;
    const cy = eatEffect.y + box / 2;
    const r = (box / 2) + t * box;

    context.strokeStyle = `rgba(${eatEffect.color}, ${1 - t})`;
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
    context.fillText(`Score: ${score}`, 12, headerH / 2);
    context.textAlign = "right";
    context.fillStyle = "rgba(255,255,255,0.85)";
    context.fillText(`High: ${highScore}`, boardW - 12, headerH / 2);
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
        wallMode ? "Mode: walls kill" : "Mode: wrap around edges",
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
    const diffLabel = activeDifficulty
        ? `${activeDifficulty[0].toUpperCase()}${activeDifficulty.slice(1)}`
        : "Custom";
    const tagline = `${SNAKES[currentSnake].name} · ${diffLabel}`;
    context.fillText(tagline, cx, 340);

    if (highScore > 0) {
        context.fillText(`Best: ${highScore}`, cx, 360);
    }
}

function render() {
    const now = performance.now();

    let shakeX = 0, shakeY = 0;
    if (deathAnim) {
        const elapsed = now - deathAnim.start;
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
    if (isReady) drawStartScreen();
    else if (isPaused && !isGameOver) drawCenterText("Paused", "Press Space/P to resume");
    if (isGameOver) drawCenterText(`Game Over — ${score}`, "Press Space/Enter to restart");
    if (showingLeaderboard) drawLeaderboard();
    context.restore();

    requestAnimationFrame(render);
}

document.addEventListener('keydown', handleKey);
document.addEventListener("touchstart", startTouch, false);
document.addEventListener("touchmove", moveTouch, false);

let swipeInitialX = null;
let swipeInitialY = null;

function startTouch(e) {
    swipeInitialX = e.touches[0].clientX;
    swipeInitialY = e.touches[0].clientY;
}

function moveTouch(e) {
    if (swipeInitialX === null || swipeInitialY === null) return;

    const diffX = swipeInitialX - e.touches[0].clientX;
    const diffY = swipeInitialY - e.touches[0].clientY;

    if (Math.abs(diffX) > Math.abs(diffY)) {
        setDirection(diffX > 0 ? "left" : "right");
    } else {
        setDirection(diffY > 0 ? "up" : "down");
    }

    swipeInitialX = null;
    swipeInitialY = null;
    e.preventDefault();
}

function setDirection(dir) {
    const opposite = { left: "right", right: "left", up: "down", down: "up" };
    if (dir !== opposite[direction]) nextDirection = dir;
}

function handleKey(event) {
    if (showingLeaderboard) {
        if (event.keyCode === 27 || event.keyCode === 76) closeLeaderboard();
        return;
    }
    if (event.keyCode === 76) {
        openLeaderboard();
        return;
    }
    if (isReady) {
        if (event.keyCode === 13 || event.keyCode === 32) isReady = false;
        return;
    }
    if (isGameOver) {
        if (event.keyCode === 13 || event.keyCode === 32) resetGame();
        return;
    }
    if (event.keyCode === 32 || event.keyCode === 80) {
        isPaused = !isPaused;
        return;
    }
    if (event.keyCode === 37 || event.keyCode === 65) setDirection("left");
    if (event.keyCode === 38 || event.keyCode === 87) setDirection("up");
    if (event.keyCode === 39 || event.keyCode === 68) setDirection("right");
    if (event.keyCode === 40 || event.keyCode === 83) setDirection("down");
}

function gameOver() {
    isGameOver = true;
    clearInterval(jogo);
    if (score > highScore) {
        highScore = score;
        localStorage.setItem("snakeHighScore", String(highScore));
    }
    playGameOver();
    deathAnim = {
        start: performance.now(),
        particles: snake.map(s => ({
            x: s.x + box / 2,
            y: s.y + box / 2,
            vx: (Math.random() - 0.5) * 8,
            vy: -2 - Math.random() * 4,
        })),
    };
    if (leaderboardConfigured() && score > 0) {
        if (!playerName) promptForName();
        if (playerName) submitScore(score);
    }
}

function tick() {
    if (isPaused || isGameOver || isReady) return;

    direction = nextDirection;

    let snakeX = snake[0].x;
    let snakeY = snake[0].y;

    if (direction === "right") snakeX += box;
    if (direction === "left") snakeX -= box;
    if (direction === "up") snakeY -= box;
    if (direction === "down") snakeY += box;

    if (wallMode) {
        if (snakeX < 0 || snakeX >= boardW || snakeY < 0 || snakeY >= boardH) {
            gameOver();
            return;
        }
    } else {
        if (snakeX < 0) snakeX = (gridW - 1) * box;
        else if (snakeX >= boardW) snakeX = 0;
        if (snakeY < 0) snakeY = (gridH - 1) * box;
        else if (snakeY >= boardH) snakeY = 0;
    }

    for (let i = 0; i < snake.length; i++) {
        if (snakeX === snake[i].x && snakeY === snake[i].y) {
            gameOver();
            return;
        }
    }

    const now = performance.now();
    if (specialFood && now > specialFood.expires) specialFood = null;

    const ateNormal = snakeX === food.x && snakeY === food.y;
    const ateSpecial = specialFood && snakeX === specialFood.x && snakeY === specialFood.y;

    if (!ateNormal && !ateSpecial) {
        snake.pop();
    } else {
        if (ateNormal) {
            score++;
            eatEffect = { x: food.x, y: food.y, start: now, color: "255, 71, 87" };
            food = spawnFreeCell(specialFood ? [specialFood] : []);
            playEat();
            if (!specialFood && Math.random() < SPECIAL_CHANCE) {
                const pos = spawnFreeCell([food]);
                if (pos) specialFood = { x: pos.x, y: pos.y, expires: now + SPECIAL_TTL };
            }
        }
        if (ateSpecial) {
            score += SPECIAL_SCORE;
            eatEffect = { x: specialFood.x, y: specialFood.y, start: now, color: "255, 200, 50" };
            specialFood = null;
            playSpecial();
        }
        setSpeed(effectiveInterval());
    }

    snake.unshift({ x: snakeX, y: snakeY });
}

function setSpeed(speed) {
    clearInterval(jogo);
    jogo = setInterval(tick, speed);
}

function clearActiveDifficulty() {
    if (!activeDifficulty) return;
    activeDifficulty = null;
    localStorage.removeItem("snakeDifficulty");
    updateDifficultyButtons();
}

function applyDifficulty(name) {
    const d = DIFFICULTIES[name];
    if (!d) return;
    settings.speed = d.speed;
    wallMode = d.walls;
    ACCEL_PER_SCORE = d.accelPerScore;
    MIN_INTERVAL = d.minInterval;
    activeDifficulty = name;

    const slider = document.getElementById("speed");
    if (slider) slider.value = (Number.parseInt(slider.max) + Number.parseInt(slider.min)) - settings.speed;

    localStorage.setItem("snakeWalls", wallMode ? "1" : "0");
    localStorage.setItem("snakeDifficulty", name);

    updateWallButton();
    updateDifficultyButtons();

    if (!isGameOver) setSpeed(effectiveInterval());
    document.getElementById(`diff_${name}`)?.blur();
}

function updateDifficultyButtons() {
    Object.keys(DIFFICULTIES).forEach(d => {
        const btn = document.getElementById(`diff_${d}`);
        if (btn) btn.classList.toggle("active", activeDifficulty === d);
    });
}

function applySpeed() {
    const speedInput = document.getElementById("speed");
    settings.speed = (Number.parseInt(speedInput.max) + Number.parseInt(speedInput.min)) - Number.parseInt(speedInput.value);
    if (!isGameOver) setSpeed(effectiveInterval());
    speedInput.blur();
    clearActiveDifficulty();
}

function toggleWalls() {
    if (!isReady && !isGameOver) return;
    wallMode = !wallMode;
    localStorage.setItem("snakeWalls", wallMode ? "1" : "0");
    updateWallButton();
    document.getElementById("wallToggle")?.blur();
    clearActiveDifficulty();
}

function updateWallButton() {
    const btn = document.getElementById("wallToggle");
    if (!btn) return;
    btn.textContent = `Walls: ${wallMode ? "ON" : "OFF"}`;
    btn.classList.toggle("on", wallMode);
}

function toggleMute() {
    isMuted = !isMuted;
    localStorage.setItem("snakeMuted", isMuted ? "1" : "0");
    updateMuteButton();
    if (!isMuted) {
        ensureAudio();
        playTone(880, 0.06, "sine", 0.08);
    }
    document.getElementById("muteToggle")?.blur();
}

function updateMuteButton() {
    const btn = document.getElementById("muteToggle");
    if (!btn) return;
    btn.textContent = `Sound: ${isMuted ? "OFF" : "ON"}`;
    btn.classList.toggle("muted", isMuted);
}

function applySnake(name) {
    if (name && SNAKES[name]) currentSnake = name;
    const s = SNAKES[currentSnake];
    settings.snakeColor = s.body;
    settings.headColor = s.head;
    settings.eyeColor = s.eye;
    localStorage.setItem("snakeCharacter", currentSnake);
    const sel = document.getElementById("snakeSelect");
    if (sel) {
        sel.value = currentSnake;
        sel.style.color = s.body;
        sel.style.borderColor = s.body;
        sel.blur();
    }
}

function leaderboardConfigured() {
    return Boolean(DREAMLO_PUBLIC && DREAMLO_PRIVATE);
}

function promptForName() {
    const name = prompt("Seu nome para o ranking:", playerName || "");
    if (name && name.trim()) {
        playerName = name.trim().slice(0, 20);
        localStorage.setItem("snakePlayerName", playerName);
        return true;
    }
    return false;
}

async function submitScore(scoreVal) {
    if (!leaderboardConfigured() || !playerName || scoreVal <= 0) return;
    try {
        await fetch(`http://dreamlo.com/lb/${DREAMLO_PRIVATE}/add/${encodeURIComponent(playerName)}/${scoreVal}`);
    } catch (e) {}
}

async function fetchLeaderboard() {
    if (!leaderboardConfigured()) return;
    leaderboardData = "loading";
    try {
        const r = await fetch(`http://dreamlo.com/lb/${DREAMLO_PUBLIC}/json/20`);
        const j = await r.json();
        const lb = j.dreamlo?.leaderboard;
        const entry = lb?.entry;
        leaderboardData = entry ? (Array.isArray(entry) ? entry : [entry]) : [];
    } catch (e) {
        leaderboardData = "error";
    }
}

function openLeaderboard() {
    if (!leaderboardConfigured()) {
        alert("Ranking nao configurado.\nCrie uma leaderboard em dreamlo.com e cole as chaves em DREAMLO_PUBLIC / DREAMLO_PRIVATE no script.js.");
        return;
    }
    showingLeaderboard = true;
    fetchLeaderboard();
    document.getElementById("lbBtn")?.blur();
}

function closeLeaderboard() {
    showingLeaderboard = false;
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

    if (leaderboardData === "loading") {
        context.fillStyle = "rgba(255,255,255,0.7)";
        context.font = "16px sans-serif";
        context.fillText("Carregando…", cx, 200);
        return;
    }
    if (leaderboardData === "error") {
        context.fillStyle = "#ff7b86";
        context.font = "16px sans-serif";
        context.fillText("Falha ao carregar", cx, 200);
        return;
    }
    if (!leaderboardData || leaderboardData.length === 0) {
        context.fillStyle = "rgba(255,255,255,0.7)";
        context.font = "16px sans-serif";
        context.fillText("Sem scores ainda. Seja o primeiro!", cx, 200);
        return;
    }

    context.textAlign = "left";
    context.font = "14px monospace";
    let y = 110;
    leaderboardData.slice(0, 12).forEach((entry, i) => {
        const rank = String(i + 1).padStart(2, " ");
        const name = String(entry.name || "—").slice(0, 18).padEnd(20, " ");
        const sc = String(entry.score || 0).padStart(6, " ");
        const isMe = playerName && entry.name === playerName;
        context.fillStyle = i === 0 ? settings.specialColor
                          : isMe ? settings.snakeColor
                          : "rgba(255,255,255,0.85)";
        context.fillText(`${rank}. ${name} ${sc}`, 80, y);
        y += 22;
    });
}

function toggleFullscreen() {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        document.documentElement.requestFullscreen().catch(() => {});
    }
    document.getElementById("fsToggle")?.blur();
}

document.addEventListener("fullscreenchange", () => {
    const btn = document.getElementById("fsToggle");
    if (btn) btn.textContent = document.fullscreenElement ? "Exit Fullscreen" : "Fullscreen";
});

updateWallButton();
updateMuteButton();
updateDifficultyButtons();
applySnake(currentSnake);
if (activeDifficulty) applyDifficulty(activeDifficulty);

resetGame();
requestAnimationFrame(render);
