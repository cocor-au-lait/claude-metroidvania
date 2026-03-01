import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "./config";
import { BootScene } from "./scenes/BootScene";
import { PreloadScene } from "./scenes/PreloadScene";
import { GameScene } from "./scenes/GameScene";
import { UIScene } from "./scenes/UIScene";

new Phaser.Game({
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#1a1a2e",
  physics: {
    default: "arcade",
    arcade: { gravity: { x: 0, y: 600 }, debug: false },
  },
  scene: [BootScene, PreloadScene, GameScene, UIScene],
});
