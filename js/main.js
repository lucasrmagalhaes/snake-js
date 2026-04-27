import { state } from "./state.js";
import { render } from "./render.js";
import { resetGame } from "./game.js";
import { bindInputs } from "./input.js";
import { bindUI, applySnake, applyDifficulty } from "./ui.js";

bindInputs();
bindUI();
applySnake(state.currentSnake);
if (state.activeDifficulty) applyDifficulty(state.activeDifficulty);

resetGame();
requestAnimationFrame(render);

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch(() => {});
    });
}
