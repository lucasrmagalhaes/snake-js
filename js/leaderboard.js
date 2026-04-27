import { state } from "./state.js";
import { FIREBASE_PROJECT, FIREBASE_API_KEY } from "./config.js";

export function leaderboardConfigured() {
    return Boolean(FIREBASE_PROJECT && FIREBASE_API_KEY);
}

export function promptForName() {
    const name = prompt("Seu nome para o ranking:", state.playerName || "");
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
    } catch (e) {}
}

export async function fetchLeaderboard() {
    if (!leaderboardConfigured()) return;
    state.leaderboardData = "loading";
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents:runQuery?key=${FIREBASE_API_KEY}`;
    const body = {
        structuredQuery: {
            from: [{ collectionId: "scores" }],
            orderBy: [{ field: { fieldPath: "score" }, direction: "DESCENDING" }],
            limit: 20
        }
    };
    try {
        const r = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        const data = await r.json();
        state.leaderboardData = data
            .filter(d => d.document)
            .map(d => ({
                name: d.document.fields.name?.stringValue || "—",
                score: parseInt(d.document.fields.score?.integerValue) || 0
            }));
    } catch (e) {
        state.leaderboardData = "error";
    }
}

export function openLeaderboard() {
    if (!leaderboardConfigured()) {
        alert("Ranking nao configurado.\nDefina FIREBASE_PROJECT e FIREBASE_API_KEY em js/config.js.");
        return;
    }
    state.showingLeaderboard = true;
    fetchLeaderboard();
    document.getElementById("lbBtn")?.blur();
}

export function closeLeaderboard() {
    state.showingLeaderboard = false;
}
