import { state, saveJSON, hooks } from "./state.js";
import { ACHIEVEMENTS, SNAKES } from "./config.js";
import { t } from "./i18n.js";

export function bestScore() {
    const vals = Object.values(state.highScores || {});
    let live = 0;
    if (!state.isReplaying && !state.twoPlayer && state.players && state.players[0]) {
        live = state.players[0].score || 0;
    }
    return Math.max(state.highScore || 0, live, ...vals.map(n => Number(n) || 0));
}

export function isSkinUnlocked(id) {
    const skin = SNAKES[id];
    if (!skin || !skin.unlockScore) return true;
    return Boolean(state.unlocks[id]);
}

function earned(def) {
    if (def.kind === "eat") return (state.stats.eaten || 0) >= 1;
    if (def.kind === "score") return bestScore() >= def.score;
    if (def.kind === "power") return (state.stats.powerUps || 0) >= 1;
    if (def.kind === "time") return (state.highScores.time || 0) >= def.score;
    if (def.kind === "zen") return (state.highScores.zen || 0) >= def.score;
    if (def.kind === "level") return (state.stats.bestLevel || 1) >= def.level;
    if (def.kind === "daily") return (state.highScores.daily || 0) >= def.score;
    if (def.kind === "pvp") return (state.stats.pvpWins || 0) >= 1;
    return false;
}

export function evaluateAchievements(opts = {}) {
    if (state.isReplaying) return [];
    const announce = Boolean(opts.announce);
    const fresh = [];

    for (const def of ACHIEVEMENTS) {
        if (state.achievements[def.id]) continue;
        if (!earned(def)) continue;
        state.achievements[def.id] = Date.now();
        fresh.push(def.id);
        if (def.skin) state.unlocks[def.skin] = true;
    }

    for (const [id, skin] of Object.entries(SNAKES)) {
        if (!skin.unlockScore || state.unlocks[id]) continue;
        if (bestScore() >= skin.unlockScore) {
            state.unlocks[id] = true;
            fresh.push("skin:" + id);
        }
    }

    if (fresh.length) {
        saveJSON("snakeAchievements", state.achievements);
        saveJSON("snakeUnlocks", state.unlocks);
        if (announce) {
            const names = fresh.map(id => {
                if (id.startsWith("skin:")) {
                    const skinId = id.slice(5);
                    return SNAKES[skinId] ? SNAKES[skinId].name : skinId;
                }
                return t("ach_" + id);
            });
            hooks.toast(t("toastAch", { name: names.join(", ") }));
            hooks.sync();
        }
    }
    return fresh;
}

export function bumpStat(key, value) {
    if (state.isReplaying) return;
    if (typeof value === "number") state.stats[key] = value;
    else state.stats[key] = (state.stats[key] || 0) + 1;
    saveJSON("snakeStats", state.stats);
}
