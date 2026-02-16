import Phaser from "phaser";
import { createAuthorizedCrossingGame } from "../shared/createGame.js";
import "./style.css";

createAuthorizedCrossingGame(Phaser, { parent: "game-root" });
