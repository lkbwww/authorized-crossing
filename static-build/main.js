/**
 * No-build entrypoint.
 * Expects Phaser to be loaded from CDN via static-build/index.html.
 */
import { createAuthorizedCrossingGame } from "../shared/createGame.js";

if (!window.Phaser) {
  // Fail fast when CDN script is blocked or unavailable.
  throw new Error("Phaser failed to load from CDN");
}

createAuthorizedCrossingGame(window.Phaser, { parent: "game-root" });
