import Phaser from "phaser";
import { Enemy } from "./Enemy";
import { TILE_SIZE } from "../config";

const JUMP_INTERVAL = 3000;
// ボス部屋：x=40〜67（新マップ）→ 内側に余裕を持たせた境界
const BOSS_PATROL_LEFT  = 42 * TILE_SIZE;
const BOSS_PATROL_RIGHT = 65 * TILE_SIZE;

export class Boss extends Enemy {
  private jumpTimer: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "boss", 10, 2, 100, BOSS_PATROL_LEFT, BOSS_PATROL_RIGHT);
  }

  update(): void {
    this.handlePatrol();
    this.handleJumpAttack();
  }

  private handleJumpAttack(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    this.jumpTimer += this.scene.game.loop.delta;
    if (this.jumpTimer >= JUMP_INTERVAL && body.blocked.down) {
      this.setVelocityY(-650);
      this.jumpTimer = 0;
    }
  }
}
