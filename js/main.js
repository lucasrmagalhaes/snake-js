import { state } from "./state.js";
import { render } from "./render.js";
import { resetGame } from "./game.js";
import { bindInputs } from "./input.js";
import { bindUI, applyDifficulty, syncSpeedFromSlider, syncUI } from "./ui.js";
import { applySkin } from "./skin.js";
import { evaluateAchievements } from "./achievements.js";

bindUI();
bindInputs();
evaluateAchievements({ announce: false });
applySkin(state.currentSnake, true);
if (state.activeDifficulty) applyDifficulty(state.activeDifficulty);
else syncSpeedFromSlider();
resetGame();
syncUI();
requestAnimationFrame(render);

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).catch(() => {});
    });
}
