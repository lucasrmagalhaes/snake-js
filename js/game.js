import { state, settings, hooks, saveJSON } from "./state.js";
import {
    box, boardW, boardH, gridW, gridH,
    TIME_LIMIT, FOODS_PER_LEVEL, POWER_CHANCE, POWER_TYPES,
    POWER_BOARD_MS, POWER_DOUBLE_MS, POWER_SLOW_MS, POWER_GHOST_MS, POWER_SHRINK_MS,
    SLOW_FACTOR, MAX_INTERVAL, LEVELS, P2_SKIN, MAX_BUFFER,
} from "./config.js";
import { mulberry32, randomSeed, dailySeed, dateKey } from "./rng.js";
import { playEat, playPower, playGameOver, playTimeUp, buzz } from "./audio.js";
import { evaluateAchievements, bumpStat } from "./achievements.js";
import { captureRun, rememberBest } from "./replay.js";
import { skinById, applySkin } from "./skin.js";
import { leaderboardConfigured, promptForName, submitScore } from "./leaderboard.js";
import { t } from "./i18n.js";

const OPP = { left: "right", right: "left", up: "down", down: "up" };

export function isPlaying() {
    return state.menu === "hidden" && !state.isPaused && !state.isGameOver && !state.isReady;
}

export function activeWalls() {
    if (state.mode === "zen") return false;
    if (state.mode === "daily") return true;
    return state.wallMode;
}

export function zenMode() {
    return state.mode === "zen";
}

function runSpeed() {
    if (state.mode === "daily") return 100;
    return settings.speed;
}

function runAccel() {
    if (state.mode === "daily") return 3;
    if (state.mode === "zen") return 0;
    return state.accelPerScore;
}

function runMin() {
    if (state.mode === "daily") return 55;
    return state.minInterval;
}

export function effectiveInterval() {
    const eaten = state.twoPlayer
        ? state.players.reduce((sum, p) => sum + (p.score || 0), 0)
        : state.eaten;
    let ms = runSpeed() - eaten * runAccel();
    ms = Math.max(runMin(), ms);
    if ((state.effects.slow || 0) > state.elapsedMs) {
        ms = Math.min(MAX_INTERVAL, Math.round(ms * SLOW_FACTOR));
    }
    return ms;
}

export function visualElapsed(now) {
    if (state.isPaused || state.isReady || state.isGameOver) return state.elapsedMs;
    const extra = Math.min(Math.max(0, now - state.moveStart), state.moveDuration || 0);
    return state.elapsedMs + extra;
}

export function highForMode() {
    if (state.mode === "classic" && !state.twoPlayer) {
        return Math.max(state.highScore || 0, state.highScores.classic || 0);
    }
    return state.highScores[state.mode] || 0;
}

function cellKey(c) {
    return c.x + "," + c.y;
}

function occupiedSet(extra = []) {
    const set = new Set();
    for (const player of state.players) {
        for (const part of player.snake) set.add(cellKey(part));
    }
    for (const obs of state.obstacles) set.add(cellKey(obs));
    if (state.food) set.add(cellKey(state.food));
    if (state.powerUp) set.add(cellKey(state.powerUp));
    for (const cell of extra) {
        if (cell) set.add(cellKey(cell));
    }
    return set;
}

export function spawnFreeCell(extra = []) {
    const taken = occupiedSet(extra);
    const free = [];
    for (let x = 0; x < gridW; x++) {
        for (let y = 0; y < gridH; y++) {
            const cell = { x: x * box, y: y * box };
            if (!taken.has(cellKey(cell))) free.push(cell);
        }
    }
    if (!free.length) return null;
    const idx = Math.floor(state.rng() * free.length);
    return free[idx];
}

function spawnPoints() {
    if (state.twoPlayer) return [{ x: 6, y: 6 }, { x: 18, y: 6 }];
    return [{ x: 12, y: 6 }];
}

function nearSpawn(x, y) {
    return spawnPoints().some(p => Math.abs(x - p.x) <= 2 && Math.abs(y - p.y) <= 1);
}

function placeObstacles(pairs) {
    const blocked = new Set();
    for (const player of state.players) {
        for (const part of player.snake) blocked.add(cellKey(part));
    }
    state.obstacles = [];
    const seen = new Set();
    for (const pair of pairs) {
        const x = pair[0];
        const y = pair[1];
        if (x < 0 || y < 0 || x >= gridW || y >= gridH) continue;
        if (nearSpawn(x, y)) continue;
        const cell = { x: x * box, y: y * box };
        const key = cellKey(cell);
        if (blocked.has(key) || seen.has(key)) continue;
        seen.add(key);
        state.obstacles.push(cell);
    }
}

function buildDailyObstacles() {
    const cells = [];
    let guard = 0;
    while (cells.length < 14 && guard < 500) {
        guard += 1;
        const x = Math.floor(state.rng() * gridW);
        const y = Math.floor(state.rng() * gridH);
        if (nearSpawn(x, y)) continue;
        if (Math.abs(x - 12) <= 2 && Math.abs(y - 6) <= 1) continue;
        if (cells.some(c => c[0] === x && c[1] === y)) continue;
        cells.push([x, y]);
    }
    placeObstacles(cells);
}

function loadLevel(level) {
    const map = LEVELS[(level - 1) % LEVELS.length];
    placeObstacles(map.cells);
    if (state.food && state.obstacles.some(o => o.x === state.food.x && o.y === state.food.y)) {
        state.food = null;
        state.food = spawnFreeCell();
    }
    if (state.powerUp && state.obstacles.some(o => o.x === state.powerUp.x && o.y === state.powerUp.y)) {
        state.powerUp = null;
    }
}

function makePlayer(id, gx, gy, dir, skin) {
    const cell = { x: gx * box, y: gy * box };
    return {
        id,
        snake: [{ x: cell.x, y: cell.y }],
        prevSnake: [{ x: cell.x, y: cell.y }],
        grew: false,
        direction: dir,
        inputBuffer: [],
        score: 0,
        alive: true,
        skin,
    };
}

export function stopLoop() {
    if (state.jogo) clearInterval(state.jogo);
    state.jogo = null;
}

export function startLoop() {
    stopLoop();
    const ms = effectiveInterval();
    state.moveDuration = ms;
    state.moveStart = performance.now();
    state.jogo = setInterval(tick, ms);
}

export function setSpeed(ms) {
    state.moveDuration = ms;
    if (!state.jogo) return;
    clearInterval(state.jogo);
    state.jogo = setInterval(tick, ms);
}

function takeSnapshot() {
    return {
        mode: state.mode,
        twoPlayer: state.twoPlayer,
        wallMode: state.wallMode,
        speed: settings.speed,
        accelPerScore: state.accelPerScore,
        minInterval: state.minInterval,
        snake: state.currentSnake,
        activeDifficulty: state.activeDifficulty,
    };
}

function restoreSnapshot() {
    const snap = state._saved;
    if (!snap) return;
    state.mode = snap.mode;
    state.twoPlayer = snap.twoPlayer;
    state.wallMode = snap.wallMode;
    settings.speed = snap.speed;
    state.accelPerScore = snap.accelPerScore;
    state.minInterval = snap.minInterval;
    state.activeDifficulty = snap.activeDifficulty;
    applySkin(snap.snake, true);
    state._saved = null;
}

export function resetGame() {
    stopLoop();
    if (!state.isReplaying) {
        state.seed = state.mode === "daily" ? dailySeed() : randomSeed();
        state.replayInputs = [];
        state.recording = true;
        state.replayData = null;
    } else {
        state.seed = state.replayData.seed >>> 0;
        state.recording = false;
        state.replayInputs = [];
    }
    state.replayCursor = 0;
    state.rng = mulberry32(state.seed);

    const p1Skin = state.isReplaying && state.replayData
        ? skinById(state.replayData.snake)
        : skinById(state.currentSnake);
    const spots = spawnPoints();
    state.players = [
        makePlayer(1, spots[0].x, spots[0].y, state.twoPlayer ? "right" : "right", p1Skin),
    ];
    if (state.twoPlayer) {
        state.players.push(makePlayer(2, spots[1].x, spots[1].y, "right", P2_SKIN));
    }

    state.obstacles = [];
    state.level = 1;
    state.eaten = 0;
    state.tick = 0;
    state.elapsedMs = 0;
    state.effects = { double: 0, slow: 0, ghost: 0, shrink: 0 };
    state.particles = [];
    state.eatEffect = null;
    state.deathAnim = null;
    state.shake = null;
    state.levelFlash = 0;
    state.food = null;
    state.powerUp = null;
    state.isGameOver = false;
    state.isPaused = false;
    state.isReady = true;
    state.endReason = null;
    state.winner = 0;
    state.score = 0;

    if (state.mode === "daily") buildDailyObstacles();
    else if (state.mode === "obstacles") loadLevel(1);

    state.food = spawnFreeCell();
    state.moveDuration = effectiveInterval();
    state.moveStart = performance.now();
}

export function pushBuffer(player, dir, record) {
    if (!player || !player.alive) return false;
    if (dir !== "left" && dir !== "right" && dir !== "up" && dir !== "down") return false;
    const buf = player.inputBuffer;
    const last = buf.length ? buf[buf.length - 1] : player.direction;
    if (dir === last || dir === OPP[last]) return false;
    if (buf.length >= MAX_BUFFER) return false;
    buf.push(dir);
    if (record && state.recording && !state.isReplaying) {
        state.replayInputs.push({ t: state.tick, p: player.id, d: dir });
    }
    return true;
}

function consumeBuffer(player) {
    while (player.inputBuffer.length) {
        const dir = player.inputBuffer.shift();
        if (dir === player.direction) continue;
        if (dir === OPP[player.direction]) continue;
        player.direction = dir;
        return;
    }
}

function nextHead(player) {
    let x = player.snake[0].x;
    let y = player.snake[0].y;
    if (player.direction === "right") x += box;
    if (player.direction === "left") x -= box;
    if (player.direction === "up") y -= box;
    if (player.direction === "down") y += box;

    const wrap = !activeWalls();
    let hitWall = false;
    if (wrap) {
        if (x < 0) x = (gridW - 1) * box;
        else if (x >= boardW) x = 0;
        if (y < 0) y = (gridH - 1) * box;
        else if (y >= boardH) y = 0;
    } else if (x < 0 || x >= boardW || y < 0 || y >= boardH) {
        hitWall = true;
    }
    return { x, y, hitWall };
}

function prospectiveCells(player, head, grow) {
    const body = grow ? player.snake : player.snake.slice(0, -1);
    return [{ x: head.x, y: head.y }, ...body.map(c => ({ x: c.x, y: c.y }))];
}

function hitsOwnBody(cells, head) {
    for (let i = 1; i < cells.length; i++) {
        if (cells[i].x === head.x && cells[i].y === head.y) return true;
    }
    return false;
}

function hitsOtherBody(head, otherCells) {
    for (let i = 1; i < otherCells.length; i++) {
        if (otherCells[i].x === head.x && otherCells[i].y === head.y) return true;
    }
    return false;
}

function obstacleAt(x, y) {
    return state.obstacles.some(o => o.x === x && o.y === y);
}

function multiplier() {
    return (state.effects.double || 0) > state.elapsedMs ? 2 : 1;
}

function noteScore(mode, score) {
    if (state.isReplaying || state.twoPlayer) return;
    const prev = state.highScores[mode] || 0;
    if (score > prev) {
        state.highScores[mode] = score;
        saveJSON("snakeHighScores", state.highScores);
    }
    if (mode === "classic" && score > state.highScore) {
        state.highScore = score;
        localStorage.setItem("snakeHighScore", String(state.highScore));
        state.highScores.classic = state.highScore;
        saveJSON("snakeHighScores", state.highScores);
    }
}

function burst(x, y, color) {
    const fill = color && color.startsWith("#") ? color : "#ff4757";
    for (let i = 0; i < 14; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 120;
        state.particles.push({
            x: x + box / 2,
            y: y + box / 2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            born: performance.now(),
            life: 340 + Math.random() * 260,
            color: fill,
            size: 2 + Math.random() * 2,
        });
    }
}

function activatePower(type, player) {
    if (type === "double") state.effects.double = state.elapsedMs + POWER_DOUBLE_MS;
    else if (type === "slow") state.effects.slow = state.elapsedMs + POWER_SLOW_MS;
    else if (type === "ghost") state.effects.ghost = state.elapsedMs + POWER_GHOST_MS;
    else if (type === "shrink") {
        state.effects.shrink = state.elapsedMs + POWER_SHRINK_MS;
        const extra = Math.min(3, player.snake.length - 1);
        if (extra > 0) player.snake.splice(player.snake.length - extra, extra);
    }
}

function maybeSpawnPower() {
    if (state.powerUp) return;
    // Chance roll stays after the food spawn so daily seeds and replays match.
    if (state.rng() >= POWER_CHANCE) return;
    const type = POWER_TYPES[Math.floor(state.rng() * POWER_TYPES.length)];
    const pos = spawnFreeCell();
    if (!pos) return;
    state.powerUp = {
        x: pos.x,
        y: pos.y,
        type,
        until: state.elapsedMs + POWER_BOARD_MS,
    };
}

function award(player, color, cell) {
    player.score += multiplier();
    state.score = state.players[0].score;
    state.eaten += 1;
    state.eatEffect = { x: cell.x, y: cell.y, start: performance.now(), color };
    burst(cell.x, cell.y, color.startsWith("#") ? color : "#ffd24a");
    if (!state.isReplaying) {
        bumpStat("eaten");
        noteScore(state.mode, state.players[0].score);
        if (state.mode === "obstacles") {
            const level = Math.floor(state.eaten / FOODS_PER_LEVEL) + 1;
            if (level !== state.level) {
                state.level = level;
                state.levelFlash = performance.now();
                if (level > (state.stats.bestLevel || 1)) bumpStat("bestLevel", level);
                loadLevel(level);
            }
        }
        evaluateAchievements({ announce: true });
    }
}

function injectReplayInputs() {
    const data = state.replayData;
    if (!data || !Array.isArray(data.inputs)) return;
    while (state.replayCursor < data.inputs.length) {
        const inp = data.inputs[state.replayCursor];
        if (inp.t !== state.tick) break;
        state.replayCursor += 1;
        const player = state.players.find(p => p.id === inp.p);
        if (player) pushBuffer(player, inp.d, false);
    }
}

function resolvePlans(plans) {
    const zen = zenMode();
    const ghost = (state.effects.ghost || 0) > state.elapsedMs;

    for (const plan of plans) {
        const onFood = state.food && plan.head.x === state.food.x && plan.head.y === state.food.y && !plan.head.hitWall;
        const onPower = state.powerUp && plan.head.x === state.powerUp.x && plan.head.y === state.powerUp.y && !plan.head.hitWall;
        plan.eatFood = Boolean(onFood);
        plan.eatPower = Boolean(onPower);
    }
    const foodEaters = plans.filter(p => p.eatFood);
    for (let i = 1; i < foodEaters.length; i++) foodEaters[i].eatFood = false;
    const powerEaters = plans.filter(p => p.eatPower);
    for (let i = 1; i < powerEaters.length; i++) powerEaters[i].eatPower = false;

    for (const plan of plans) {
        const shrink = plan.eatPower && state.powerUp && state.powerUp.type === "shrink";
        plan.grow = (plan.eatFood || plan.eatPower) && !shrink;
        plan.cells = prospectiveCells(plan.player, plan.head, plan.grow);
        let dead = false;
        if (!zen) {
            if (plan.head.hitWall) dead = true;
            else if (obstacleAt(plan.head.x, plan.head.y)) dead = true;
            else if (!ghost && hitsOwnBody(plan.cells, plan.head)) dead = true;
        }
        plan.dead = dead;
    }

    if (!zen && plans.length === 2) {
        const [a, b] = plans;
        if (!a.head.hitWall && !b.head.hitWall && a.head.x === b.head.x && a.head.y === b.head.y) {
            a.dead = true;
            b.dead = true;
        } else {
            if (!a.dead && !a.head.hitWall && hitsOtherBody(a.head, b.cells)) a.dead = true;
            if (!b.dead && !b.head.hitWall && hitsOtherBody(b.head, a.cells)) b.dead = true;
        }
    }

    for (const plan of plans) {
        if (plan.dead) {
            plan.eatFood = false;
            plan.eatPower = false;
            plan.grow = false;
            plan.cells = prospectiveCells(plan.player, plan.head, false);
        }
    }
}

function applyPlans(plans) {
    let ateFood = false;
    let atePower = null;

    for (const plan of plans) {
        const player = plan.player;
        player.prevSnake = player.snake.map(c => ({ x: c.x, y: c.y }));
        if (plan.dead && plan.head.hitWall) {
            // Keep the snake inside the board when a wall stops it.
            player.grew = false;
        } else {
            player.snake = plan.cells.map(c => ({ x: c.x, y: c.y }));
            player.grew = player.snake.length > player.prevSnake.length;
        }
        if (plan.dead && !zenMode()) player.alive = false;
    }

    for (const plan of plans) {
        if (plan.dead || plan.head.hitWall && !zenMode()) continue;
        if (plan.eatPower && state.powerUp) {
            atePower = { type: state.powerUp.type, player: plan.player, cell: { x: plan.head.x, y: plan.head.y } };
        }
        if (plan.eatFood) ateFood = { player: plan.player, cell: { x: plan.head.x, y: plan.head.y } };
    }

    if (atePower) {
        state.powerUp = null;
        activatePower(atePower.type, atePower.player);
        // Shrink may have shortened the snake after the move was copied.
        atePower.player.grew = atePower.player.snake.length > atePower.player.prevSnake.length;
        award(atePower.player, powerColor(atePower.type), atePower.cell);
        playPower();
        buzz(20);
        if (!state.isReplaying) bumpStat("powerUps");
        if (!state.isReplaying) evaluateAchievements({ announce: true });
    }

    if (ateFood) {
        state.food = null;
        state.food = spawnFreeCell();
        award(ateFood.player, "#ff4757", ateFood.cell);
        playEat();
        buzz(16);
        maybeSpawnPower();
    }
}

function powerColor(type) {
    if (type === "double") return "#ffd24a";
    if (type === "slow") return "#7ec8ff";
    if (type === "ghost") return "#d088ff";
    return "#7dffb3";
}

function anyDead() {
    return state.players.some(p => !p.alive);
}

export function tick() {
    if (state.isPaused || state.isGameOver || state.isReady) return;

    if (state.isReplaying) {
        injectReplayInputs();
        const cap = (state.replayData && state.replayData.ticks) || 0;
        if (cap && state.tick > cap + 2) {
            endGame(state.mode === "time" ? "time" : "dead");
            return;
        }
    }

    const step = state.moveDuration || effectiveInterval();
    state.elapsedMs += step;

    if (state.powerUp && state.elapsedMs >= state.powerUp.until) state.powerUp = null;

    const plans = [];
    for (const player of state.players) {
        if (!player.alive) continue;
        consumeBuffer(player);
        const head = nextHead(player);
        plans.push({ player, head });
    }
    resolvePlans(plans);
    applyPlans(plans);

    const next = effectiveInterval();
    state.moveStart = performance.now();
    state.moveDuration = next;
    if (state.jogo && next !== step) setSpeed(next);

    state.tick += 1;

    if (state.isGameOver) return;

    if (!zenMode() && anyDead()) {
        finishFromDeath();
        return;
    }
    if (state.mode === "time" && state.elapsedMs >= TIME_LIMIT) {
        endGame("time");
    }
}

function finishFromDeath() {
    if (!state.twoPlayer) {
        endGame("dead");
        return;
    }
    const a = state.players[0].alive;
    const b = state.players[1] && state.players[1].alive;
    if (!a && !b) endGame("draw");
    else if (!a) endGame("p2");
    else if (!b) endGame("p1");
    else endGame("dead");
}

function deathFx() {
    const parts = [];
    for (const player of state.players) {
        if (player.alive && state.twoPlayer) continue;
        for (const seg of player.snake) {
            parts.push({
                x: seg.x + box / 2,
                y: seg.y + box / 2,
                vx: (Math.random() - 0.5) * 8,
                vy: -2 - Math.random() * 4,
                color: player.skin.body,
            });
        }
    }
    if (!parts.length) return;
    state.deathAnim = { start: performance.now(), particles: parts };
    state.shake = { start: performance.now(), dur: 280, mag: 4.5 };
}

function recordDaily(score) {
    const day = dateKey();
    const name = state.playerName || t("anon");
    const board = Array.isArray(state.dailyBoard[day]) ? state.dailyBoard[day] : [];
    const entry = { name, score, ts: Date.now() };
    board.push(entry);
    board.sort((a, b) => b.score - a.score || a.ts - b.ts);
    state.dailyBoard[day] = board.slice(0, 10);
    const keep = {};
    const keys = Object.keys(state.dailyBoard).sort().slice(-14);
    for (const key of keys) keep[key] = state.dailyBoard[key];
    state.dailyBoard = keep;
    saveJSON("snakeDailyBoard", state.dailyBoard);
}

function scheduleBoards(reason) {
    if (state.isReplaying || state.twoPlayer) return;
    const score = state.players[0] ? state.players[0].score : 0;
    if (score <= 0) return;
    const mode = state.mode;
    const token = {};
    state.boardToken = token;
    if (mode === "daily" && (reason === "dead" || reason === "time")) {
        recordDaily(score);
    }
    setTimeout(() => {
        if (state.boardToken !== token || state.isReplaying) return;
        if (!state.playerName && (mode === "daily" || (mode === "classic" && reason === "dead"))) {
            promptForName();
            if (mode === "daily" && state.playerName) {
                const day = dateKey();
                const board = state.dailyBoard[day] || [];
                const entry = board.find(item => item.score === score && item.name === t("anon"));
                if (entry) entry.name = state.playerName;
                saveJSON("snakeDailyBoard", state.dailyBoard);
                hooks.sync();
            }
        }
        if (mode === "classic" && reason === "dead" && leaderboardConfigured() && state.playerName) {
            submitScore(score);
        }
    }, 280);
}

export function endGame(reason) {
    if (state.isGameOver) return;
    stopLoop();
    state.isGameOver = true;
    state.isReady = false;
    state.isPaused = false;
    state.endReason = reason;
    state.winner = 0;

    if (state.twoPlayer && state.players[1]) {
        const p1 = state.players[0].score;
        const p2 = state.players[1].score;
        if (reason === "time") {
            if (p1 > p2) state.winner = 1;
            else if (p2 > p1) state.winner = 2;
            else state.winner = 0;
        } else if (reason === "p1") state.winner = 1;
        else if (reason === "p2") state.winner = 2;
    }

    const collision = reason === "dead" || reason === "p1" || reason === "p2" || reason === "draw";
    if (collision) {
        deathFx();
        playGameOver();
        buzz([28, 40, 28]);
    } else if (reason === "time") {
        playTimeUp();
    }

    if (!state.isReplaying) {
        if (state.twoPlayer && (state.winner === 1 || state.winner === 2)) {
            bumpStat("pvpWins");
        }
        const run = captureRun();
        state.lastRun = run;
        rememberBest(run);
        evaluateAchievements({ announce: true });
        scheduleBoards(reason);
    }

    state.result = {
        reason,
        winner: state.winner,
        mode: state.mode,
        twoPlayer: state.twoPlayer,
        score: state.players[0] ? state.players[0].score : 0,
        p2score: state.players[1] ? state.players[1].score : 0,
        snake: state.isReplaying && state.replayData ? state.replayData.snake : state.currentSnake,
        seed: state.seed,
        date: dateKey(),
    };
    state.menu = "over";
    hooks.sync();
}

export function commitReplay() {
    if (state.isReplaying || state.isReady) return;
    const score = state.players[0] ? state.players[0].score : 0;
    if (score <= 0) return;
    const run = captureRun();
    state.lastRun = run;
    rememberBest(run);
}

export function restartRun() {
    if (!state.isReplaying) commitReplay();
    startRun();
}

export function startRun() {
    if (state._saved) restoreSnapshot();
    state.isReplaying = false;
    state.replayData = null;
    if (state.mode === "zen" || state.mode === "daily") state.twoPlayer = false;
    resetGame();
    state.isReady = false;
    state.isPaused = false;
    state.isGameOver = false;
    state.menu = "hidden";
    startLoop();
    hooks.sync();
}

export function pauseGame() {
    if (!isPlaying()) return;
    state.isPaused = true;
    state.menu = "pause";
    stopLoop();
    hooks.sync();
}

export function resumeGame() {
    if (!state.isPaused || state.isGameOver) return;
    state.isPaused = false;
    state.isReady = false;
    state.menu = "hidden";
    for (const player of state.players) {
        player.prevSnake = player.snake.map(cell => ({ x: cell.x, y: cell.y }));
        player.grew = false;
    }
    startLoop();
    hooks.sync();
}

export function quitToMenu() {
    const wasReplay = state.isReplaying;
    stopLoop();
    if (!wasReplay) commitReplay();
    if (wasReplay) restoreSnapshot();
    state.isReplaying = false;
    state.replayData = null;
    state.menu = "start";
    resetGame();
    hooks.sync();
}

export function playReplay(data) {
    if (!data || !Array.isArray(data.inputs)) return;
    stopLoop();
    if (state._saved) restoreSnapshot();
    state._saved = takeSnapshot();
    state.isReplaying = true;
    state.replayData = data;
    state.replayCursor = 0;
    state.mode = data.mode;
    state.twoPlayer = Boolean(data.twoPlayer) && data.mode !== "zen" && data.mode !== "daily";
    state.wallMode = Boolean(data.walls);
    if (typeof data.speed === "number") settings.speed = data.speed;
    if (typeof data.accelPerScore === "number") state.accelPerScore = data.accelPerScore;
    if (typeof data.minInterval === "number") state.minInterval = data.minInterval;
    applySkin(data.snake || "verdao", false);
    state.lastRun = data;
    state.menu = "hidden";
    resetGame();
    state.isReady = false;
    state.isPaused = false;
    state.isGameOver = false;
    startLoop();
    hooks.sync();
}

document.addEventListener("visibilitychange", () => {
    if (document.hidden && isPlaying()) pauseGame();
});
