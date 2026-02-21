/**
 * Vite entrypoint.
 * Bundles Phaser locally and mounts the game under #game-root.
 */
import Phaser from "phaser";
import { createAuthorizedCrossingGame } from "../shared/createGame.js";
import "./style.css";

// Mount Phaser canvas into the app shell.
createAuthorizedCrossingGame(Phaser, { parent: "game-root" });
