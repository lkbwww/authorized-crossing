/**
 * Creates and boots the Phaser game with shared scenes/state.
 * Used by both runtime entrypoints: static-build and vite-build.
 */
import { AdManager } from "./AdManager.js";
import { GameState } from "./GameState.js";
import { INTERNAL_HEIGHT, INTERNAL_WIDTH } from "./constants.js";
import { createIntroScene } from "./scenes/IntroScene.js";
import { createEscapeScene } from "./scenes/EscapeScene.js";
import { createResultScene } from "./scenes/ResultScene.js";
import { createRiverScene } from "./scenes/RiverScene.js";
import { createShopScene } from "./scenes/ShopScene.js";

export function createAuthorizedCrossingGame(Phaser, options = {}) {
  // Shared mutable singletons injected into every scene factory.
  const shared = {
    gameState: new GameState(),
    adManager: new AdManager(),
  };

  const IntroScene = createIntroScene(Phaser, shared);
  const ShopScene = createShopScene(Phaser, shared);
  const RiverScene = createRiverScene(Phaser, shared);
  const EscapeScene = createEscapeScene(Phaser, shared);
  const ResultScene = createResultScene(Phaser, shared);

  // Phaser runtime config (pixel-art + fixed aspect via FIT/CENTER_BOTH).
  const config = {
    type: Phaser.AUTO,
    parent: options.parent || "game-root",
    width: INTERNAL_WIDTH,
    height: INTERNAL_HEIGHT,
    backgroundColor: "#2B1B14",
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    render: {
      antialias: false,
      pixelArt: true,
      roundPixels: true,
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { y: 0 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: INTERNAL_WIDTH,
      height: INTERNAL_HEIGHT,
    },
    scene: [IntroScene, ShopScene, RiverScene, EscapeScene, ResultScene],
  };

  const game = new Phaser.Game(config);
  // Debug hooks for browser-based smoke tests and quick manual inspection.
  game.__authorizedCrossing = shared;
  if (typeof window !== "undefined") {
    window.__authorizedCrossingGame = game;
    window.__authorizedCrossingShared = shared;
  }
  return game;
}
