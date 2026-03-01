import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE, PLAYER_WIDTH, PLAYER_HEIGHT } from "../config";
import { Player } from "../entities/Player";

const WORLD_WIDTH = GAME_WIDTH * 3;

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private ground!: Phaser.Physics.Arcade.StaticGroup;

  constructor() {
    super({ key: "GameScene" });
  }

  create(): void {
    this.createTextures();
    this.createGround();
    this.createPlayer();
    this.setupCamera();
    this.scene.launch("UIScene");
  }

  private createTextures(): void {
    const pg = this.add.graphics();
    pg.fillStyle(0x4488ff);
    pg.fillRect(0, 0, PLAYER_WIDTH, PLAYER_HEIGHT);
    pg.generateTexture("player", PLAYER_WIDTH, PLAYER_HEIGHT);
    pg.destroy();

    const tg = this.add.graphics();
    tg.fillStyle(0x336622);
    tg.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    tg.lineStyle(1, 0x224411);
    tg.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
    tg.generateTexture("tile", TILE_SIZE, TILE_SIZE);
    tg.destroy();
  }

  private createGround(): void {
    this.ground = this.physics.add.staticGroup();
    for (let x = 0; x < WORLD_WIDTH; x += TILE_SIZE) {
      this.ground.create(x + TILE_SIZE / 2, GAME_HEIGHT - TILE_SIZE / 2, "tile");
    }
  }

  private createPlayer(): void {
    this.player = new Player(this, TILE_SIZE * 2, GAME_HEIGHT - TILE_SIZE * 3);
    this.physics.add.collider(this.player, this.ground);
  }

  private setupCamera(): void {
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
  }

  update(): void {
    this.player.update();
  }
}
