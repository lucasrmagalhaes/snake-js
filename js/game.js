import { state, settings } from "./state.js";
import { box, boardW, boardH, gridW, gridH, SPECIAL_TTL, SPECIAL_SCORE, SPECIAL_CHANCE } from "./config.js";
import { playEat, playSpecial, playGameOver } from "./audio.js";
import { leaderboardConfigured, promptForName, submitScore } from "./leaderboard.js";

export function effectiveInterval() {
    return Math.max(state.minInterval, settings.speed - state.score * state.accelPerScore);
}

export function spawnFreeCell(extra = []) {
    const occupied = new Set(state.snake.concat(extra).map(c => `${c.x},${c.y}`));
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

export function setSpeed(speed) {
    clearInterval(state.jogo);
    state.jogo = setInterval(tick, speed);
}

export function resetGame() {
    state.snake = [{ x: Math.floor(gridW / 2) * box, y: Math.floor(gridH / 2) * box }];
    state.direction = "right";
    state.nextDirection = "right";
    state.score = 0;
    state.isGameOver = false;
    state.isPaused = false;
    state.isReady = true;
    state.eatEffect = null;
    state.deathAnim = null;
    state.specialFood = null;
    state.food = spawnFreeCell();
    setSpeed(effectiveInterval());
}

export function gameOver() {
    state.isGameOver = true;
    clearInterval(state.jogo);
    if (state.score > state.highScore) {
        state.highScore = state.score;
        localStorage.setItem("snakeHighScore", String(state.highScore));
    }
    playGameOver();
    state.deathAnim = {
        start: performance.now(),
        particles: state.snake.map(s => ({
            x: s.x + box / 2,
            y: s.y + box / 2,
            vx: (Math.random() - 0.5) * 8,
            vy: -2 - Math.random() * 4,
        })),
    };
    if (leaderboardConfigured() && state.score > 0) {
        if (!state.playerName) promptForName();
        if (state.playerName) submitScore(state.score);
    }
}

export function tick() {
    if (state.isPaused || state.isGameOver || state.isReady) return;

    state.direction = state.nextDirection;

    let snakeX = state.snake[0].x;
    let snakeY = state.snake[0].y;

    if (state.direction === "right") snakeX += box;
    if (state.direction === "left") snakeX -= box;
    if (state.direction === "up") snakeY -= box;
    if (state.direction === "down") snakeY += box;

    if (state.wallMode) {
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

    const now = performance.now();
    if (state.specialFood && now > state.specialFood.expires) state.specialFood = null;

    const ateNormal = state.food && snakeX === state.food.x && snakeY === state.food.y;
    const ateSpecial = state.specialFood && snakeX === state.specialFood.x && snakeY === state.specialFood.y;
    const willGrow = ateNormal || ateSpecial;

    // Quando a cobra nao cresce, a cauda desocupa a celula neste mesmo tick;
    // mover a cabeca para a celula da cauda nao pode contar como colisao.
    const lastIndex = state.snake.length - 1;
    for (let i = 0; i < state.snake.length; i++) {
        if (!willGrow && i === lastIndex) continue;
        if (snakeX === state.snake[i].x && snakeY === state.snake[i].y) {
            gameOver();
            return;
        }
    }

    const newHead = { x: snakeX, y: snakeY };

    if (!willGrow) {
        state.snake.pop();
    } else {
        if (ateNormal) {
            state.score++;
            state.eatEffect = { x: state.food.x, y: state.food.y, start: now, color: "255, 71, 87" };
            state.food = spawnFreeCell(state.specialFood ? [state.specialFood, newHead] : [newHead]);
            playEat();
            if (!state.specialFood && Math.random() < SPECIAL_CHANCE) {
                const pos = spawnFreeCell(state.food ? [state.food, newHead] : [newHead]);
                if (pos) state.specialFood = { x: pos.x, y: pos.y, expires: now + SPECIAL_TTL };
            }
        }
        if (ateSpecial) {
            state.score += SPECIAL_SCORE;
            state.eatEffect = { x: state.specialFood.x, y: state.specialFood.y, start: now, color: "255, 200, 50" };
            state.specialFood = null;
            playSpecial();
        }
        setSpeed(effectiveInterval());
    }

    state.snake.unshift(newHead);
}
