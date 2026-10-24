import { state, hooks } from "./state.js";
import { FIREBASE_PROJECT, FIREBASE_API_KEY } from "./config.js";
import { t } from "./i18n.js";

export function leaderboardConfigured() {
    return Boolean(FIREBASE_PROJECT && FIREBASE_API_KEY);
}

export function promptForName() {
    const name = prompt(t("namePrompt"), state.playerName || "");
    if (name && name.trim()) {
        state.playerName = name.trim().slice(0, 20);
        localStorage.setItem("snakePlayerName", state.playerName);
        return true;
    }
    return false;
}

export async function submitScore(scoreVal) {
    if (!leaderboardConfigured() || !state.playerName || scoreVal <= 0) return;
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/scores?key=${FIREBASE_API_KEY}`;
    const body = {
        fields: {
            name: { stringValue: state.playerName },
            score: { integerValue: String(scoreVal) },
            ts: { timestampValue: new Date().toISOString() }
        }
    };
    try {
        await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
    } catch (err) {}
}

export async function fetchLeaderboard() {
    if (!leaderboardConfigured()) {
        state.leaderboardData = "unconfigured";
        hooks.sync();
        return;
    }
    state.leaderboardData = "loading";
    hooks.sync();
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents:runQuery?key=${FIREBASE_API_KEY}`;
    const body = {
        structuredQuery: {
            from: [{ collectionId: "scores" }],
            orderBy: [{ field: { fieldPath: "score" }, direction: "DESCENDING" }],
            limit: 20
        }
    };
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data)) {
            state.leaderboardData = "error";
        } else {
            state.leaderboardData = data
                .filter(row => row.document)
                .map(row => ({
                    name: row.document.fields.name?.stringValue || "-",
                    score: parseInt(row.document.fields.score?.integerValue, 10) || 0
                }));
        }
    } catch (err) {
        state.leaderboardData = "error";
    }
    hooks.sync();
}
