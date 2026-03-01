import Phaser from "phaser";

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  protected hp: number;
  protected contactDamage: number;
  protected patrolSpeed: number;
  protected patrolLeft: number;
  protected patrolRight: number;
  protected patrolDir: 1 | -1 = 1;
  private hitInvincible: boolean = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    textureKey: string,
    hp: number,
    contactDamage: number,
    patrolSpeed: number,
    patrolLeft: number = 0,
    patrolRight: number = Number.MAX_SAFE_INTEGER
  ) {
    super(scene, x, y, textureKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.hp = hp;
    this.contactDamage = contactDamage;
    this.patrolSpeed = patrolSpeed;
    this.patrolLeft = patrolLeft;
    this.patrolRight = patrolRight;
    this.setCollideWorldBounds(true);
    this.setVelocityX(this.patrolSpeed);
  }

  update(): void {
    this.handlePatrol();
  }

  protected handlePatrol(): void {
    // 座標のみで折り返し判定（body.blocked は台の端タイルで誤反応するため使用しない）
    if (this.x <= this.patrolLeft) {
      this.patrolDir = 1;
    } else if (this.x >= this.patrolRight) {
      this.patrolDir = -1;
    }
    // 毎フレーム速度を強制再設定（衝突で速度が0になっても即復帰）
    this.setVelocityX(this.patrolSpeed * this.patrolDir);
    this.setFlipX(this.patrolDir < 0);
  }

  takeDamage(amount: number): number {
    if (this.hitInvincible) return this.hp;
    this.hp -= amount;
    this.hitInvincible = true;
    this.scene.tweens.add({
      targets: this,
      alpha: { from: 1, to: 0.1 },
      duration: 80,
      yoyo: true,
      repeat: 2,
      onComplete: () => { if (this.active) this.setAlpha(1); },
    });
    this.scene.time.delayedCall(500, () => {
      this.hitInvincible = false;
    });
    return this.hp;
  }

  getContactDamage(): number {
    return this.contactDamage;
  }
}
