import { state, settings } from "./state.js";
import { SNAKES } from "./config.js";
import { isSkinUnlocked } from "./achievements.js";

export function skinById(name) {
    return SNAKES[name] || SNAKES.verdao;
}

export function applySkin(name, persist = true) {
    let id = SNAKES[name] ? name : "verdao";
    if (persist && !isSkinUnlocked(id)) id = "verdao";
    const skin = SNAKES[id];
    if (persist) {
        state.currentSnake = id;
        localStorage.setItem("snakeCharacter", id);
    }
    settings.snakeColor = skin.body;
    settings.headColor = skin.head;
    settings.eyeColor = skin.eye;
    if (state.players && state.players[0]) state.players[0].skin = skin;
    document.documentElement.style.setProperty("--accent", skin.body);
    return skin;
}
