import { AdManager } from "./AdManager.js";
import { GameState } from "./GameState.js";
import { INTERNAL_HEIGHT, INTERNAL_WIDTH } from "./constants.js";
import { createIntroScene } from "./scenes/IntroScene.js";
import { createEscapeScene } from "./scenes/EscapeScene.js";
import { createResultScene } from "./scenes/ResultScene.js";
import { createRiverScene } from "./scenes/RiverScene.js";
import { createShopScene } from "./scenes/ShopScene.js";

export function createAuthorizedCrossingGame(Phaser, options = {}) {
  const shared = {
    gameState: new GameState(),
    adManager: new AdManager(),
  };

  const IntroScene = createIntroScene(Phaser, shared);
  const ShopScene = createShopScene(Phaser, shared);
  const RiverScene = createRiverScene(Phaser, shared);
  const EscapeScene = createEscapeScene(Phaser, shared);
  const ResultScene = createResultScene(Phaser, shared);

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
  game.__authorizedCrossing = shared;
  if (typeof window !== "undefined") {
    window.__authorizedCrossingGame = game;
    window.__authorizedCrossingShared = shared;
  }
  return game;
}
