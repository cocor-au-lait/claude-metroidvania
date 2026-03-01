import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config";

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
  }

  create() {
    // 仮の背景テキスト（フェーズ2以降で本実装）
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "GameScene\n（実装中）", {
        fontSize: "32px",
        color: "#ffffff",
        align: "center",
      })
      .setOrigin(0.5);

    // UIScene を並行起動
    this.scene.launch("UIScene");
  }
}
