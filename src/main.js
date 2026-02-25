import { Game } from "./core/Game.js";
import { InputHandler } from "./core/InputHandler.js";

window.addEventListener("load", () => {
  console.log("Initializing Pac-Man Ultimate Engine...");

  const canvas = document.getElementById("game-canvas");
  if (!canvas) {
    console.error("Game canvas not found!");
    return;
  }

  const inputHandler = new InputHandler();
  inputHandler.init();
  const game = new Game(canvas, inputHandler);

  // Resize handler for responsive scaling
  function resizeCanvas() {
    const container = document.getElementById("game-container");
    let availableWidth = window.innerWidth;
    let availableHeight = window.innerHeight;
    
    const gameAspect = 224 / 288;
    const screenAspect = availableWidth / availableHeight;
    
    // Scale container to fit screen perfectly
    if (screenAspect > gameAspect) {
        // Limited by height
        container.style.height = `${availableHeight}px`;
        container.style.width = `${availableHeight * gameAspect}px`;
    } else {
        // Limited by width
        container.style.width = `${availableWidth}px`;
        container.style.height = `${availableWidth / gameAspect}px`;
    }
  }

  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', resizeCanvas);
  resizeCanvas(); // Initial call

  game.start();
});
