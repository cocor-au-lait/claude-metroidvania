import Phaser from "phaser";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: "PreloadScene" });
  }

  preload() {
    // 仮素材はコードで生成するためアセットロード不要
  }

  create() {
    this.scene.start("GameScene");
  }
}
