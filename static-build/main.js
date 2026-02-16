import { createAuthorizedCrossingGame } from "../shared/createGame.js";

if (!window.Phaser) {
  throw new Error("Phaser failed to load from CDN");
}

createAuthorizedCrossingGame(window.Phaser, { parent: "game-root" });
