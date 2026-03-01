import Phaser from "phaser";
import { PLAYER_HP, GAME_WIDTH, GAME_HEIGHT } from "../config";

export class UIScene extends Phaser.Scene {
  private hearts: Phaser.GameObjects.Rectangle[] = [];
  private overlay!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: "UIScene" });
  }

  create(): void {
    // HP ハート表示（左上）
    for (let i = 0; i < PLAYER_HP; i++) {
      this.hearts.push(
        this.add.rectangle(24 + i * 28, 24, 20, 20, 0xff3333)
      );
    }

    // クリア / ゲームオーバー用オーバーレイ
    this.overlay = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    this.overlay.setVisible(false);

    // 初期値を反映（GameScene が先に registry を設定している場合）
    const initHp = this.registry.get("playerHp") as number | undefined;
    const initState = this.registry.get("gameState") as string | undefined;
    if (initHp !== undefined) this.updateHearts(initHp);
    if (initState !== undefined) this.updateOverlay(initState);

    // registry 変更を購読
    this.registry.events.on(
      "changedata",
      (_: unknown, key: string, value: unknown) => {
        if (key === "playerHp") this.updateHearts(value as number);
        if (key === "gameState") this.updateOverlay(value as string);
      },
      this
    );
  }

  private updateHearts(hp: number): void {
    this.hearts.forEach((h, i) =>
      h.setFillStyle(i < hp ? 0xff3333 : 0x444444)
    );
  }

  private updateOverlay(state: string): void {
    this.overlay.removeAll(true);
    if (state === "playing") {
      this.overlay.setVisible(false);
      return;
    }
    const isCleared = state === "clear";
    const bg = this.add.rectangle(
      0, 0, GAME_WIDTH, GAME_HEIGHT,
      isCleared ? 0x001100 : 0x110000, 0.7
    );
    const title = this.add.text(
      0, -30,
      isCleared ? "GAME CLEAR" : "GAME OVER",
      {
        fontSize: "56px",
        color: isCleared ? "#00ff88" : "#ff4444",
        stroke: "#000000",
        strokeThickness: 6,
      }
    ).setOrigin(0.5);
    const sub = this.add.text(
      0, 40,
      isCleared ? "ボスを倒した！" : "セーブポイントに戻る...",
      { fontSize: "22px", color: "#ffffff", stroke: "#000000", strokeThickness: 3 }
    ).setOrigin(0.5);
    this.overlay.add([bg, title, sub]);
    this.overlay.setVisible(true);
  }
}
