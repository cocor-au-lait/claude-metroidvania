import Phaser from "phaser";
import { PLAYER_SPEED, PLAYER_JUMP_VELOCITY, PLAYER_HP, TILE_SIZE } from "../config";

export class Player extends Phaser.Physics.Arcade.Sprite {
  private hp: number = PLAYER_HP;
  private canDoubleJump: boolean = false;
  private hasDoubleJumped: boolean = false;
  private canAttack: boolean = true;
  private attackActive: boolean = false;

  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA: Phaser.Input.Keyboard.Key;
  private keyD: Phaser.Input.Keyboard.Key;
  private keyZ: Phaser.Input.Keyboard.Key;
  private keyX: Phaser.Input.Keyboard.Key;
  private keyJ: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "player");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);

    const kb = scene.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyZ = kb.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.keyX = kb.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.keyJ = kb.addKey(Phaser.Input.Keyboard.KeyCodes.J);
  }

  update(): void {
    this.handleMove();
    this.handleJump();
    this.handleAttack();
  }

  private handleMove(): void {
    const left = this.cursors.left.isDown || this.keyA.isDown;
    const right = this.cursors.right.isDown || this.keyD.isDown;

    if (left) {
      this.setVelocityX(-PLAYER_SPEED);
      this.setFlipX(true);
    } else if (right) {
      this.setVelocityX(PLAYER_SPEED);
      this.setFlipX(false);
    } else {
      this.setVelocityX(0);
    }
  }

  private handleJump(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const onGround = body.blocked.down;
    if (onGround) this.hasDoubleJumped = false;

    const justPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
      Phaser.Input.Keyboard.JustDown(this.keyZ);
    if (!justPressed) return;

    if (onGround) {
      this.setVelocityY(PLAYER_JUMP_VELOCITY);
    } else if (this.canDoubleJump && !this.hasDoubleJumped) {
      this.setVelocityY(PLAYER_JUMP_VELOCITY);
      this.hasDoubleJumped = true;
    }
  }

  private handleAttack(): void {
    const justPressed =
      Phaser.Input.Keyboard.JustDown(this.keyX) ||
      Phaser.Input.Keyboard.JustDown(this.keyJ);
    if (!justPressed || !this.canAttack) return;

    this.canAttack = false;
    this.attackActive = true;

    const dir = this.flipX ? -1 : 1;
    const slash = this.scene.add.rectangle(
      this.x + dir * TILE_SIZE * 0.75,
      this.y,
      TILE_SIZE,
      TILE_SIZE * 0.5,
      0xffee44,
      0.8
    );
    this.scene.time.delayedCall(120, () => {
      slash.destroy();
      this.attackActive = false;
    });
    this.scene.time.delayedCall(400, () => {
      this.canAttack = true;
    });
  }

  enableDoubleJump(): void {
    this.canDoubleJump = true;
  }

  takeDamage(amount: number): number {
    this.hp = Math.max(0, this.hp - amount);
    this.setTint(0xff3333);
    this.scene.time.delayedCall(300, () => this.clearTint());
    return this.hp;
  }

  getHp(): number {
    return this.hp;
  }

  isAttacking(): boolean {
    return this.attackActive;
  }

  /** 攻撃ヒットボックス（敵との重複判定用）*/
  getAttackRect(): Phaser.Geom.Rectangle | null {
    if (!this.attackActive) return null;
    const dir = this.flipX ? -1 : 1;
    return new Phaser.Geom.Rectangle(
      this.x + dir * TILE_SIZE * 0.25,
      this.y - TILE_SIZE * 0.25,
      TILE_SIZE,
      TILE_SIZE * 0.5
    );
  }
}
