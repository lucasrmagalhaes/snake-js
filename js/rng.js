// Deterministic RNG so daily boards and replays share one sequence.

export function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

export function mulberry32(seed) {
    let a = seed >>> 0;
    return function rng() {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function randomSeed() {
    const mix = Math.floor(Math.random() * 0x100000000);
    return (Date.now() ^ mix) >>> 0;
}

// UTC date so the daily board matches for every player that calendar day.
export function dateKey(d = new Date()) {
    return d.toISOString().slice(0, 10);
}

export function dailySeed(d = new Date()) {
    return hashString("snake-daily-v1-" + dateKey(d));
}
