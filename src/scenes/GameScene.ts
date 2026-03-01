import Phaser from "phaser";
import { TILE_SIZE, PLAYER_WIDTH, PLAYER_HEIGHT } from "../config";
import { Player } from "../entities/Player";
import { Enemy } from "../entities/Enemy";
import { Boss } from "../entities/Boss";

// マップサイズ（タイル単位）
const MAP_W = 68;
const MAP_H = 35;

// ゾーン別タイル色
const ZONE_COLOR: Record<string, number> = {
  start:    0x2d5a27,
  ability:  0x1a3a5c,
  middle:   0x4a3728,
  boss:     0x5c1a1a,
  corridor: 0x2a2a3a,
};

/**
 * マップ構成（タイル座標）
 *
 * [スタート(0-29,0-13)]─corridor─[アビリティ(38-67,0-13)]
 *         │ vCorr(10-13,14-20)     │ vCorr(54-57,14-20)
 * [中間(0-29,21-34)]  ─corridor─  [ボス(38-67,21-34)]
 */
export class GameScene extends Phaser.Scene {
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private enemies: Enemy[] = [];

  constructor() {
    super({ key: "GameScene" });
  }

  create(): void {
    this.createTextures();
    const tileMap = this.buildTileMap();
    this.platforms = this.spawnTiles(tileMap);
    this.spawnMarkers();
    this.createPlayer();
    this.spawnEnemies();
    this.setupCamera();
    this.scene.launch("UIScene");
  }

  private createTextures(): void {
    const pg = this.add.graphics();
    pg.fillStyle(0x4488ff);
    pg.fillRect(0, 0, PLAYER_WIDTH, PLAYER_HEIGHT);
    pg.generateTexture("player", PLAYER_WIDTH, PLAYER_HEIGHT);
    pg.destroy();

    Object.entries(ZONE_COLOR).forEach(([zone, color]) => {
      const tg = this.add.graphics();
      tg.fillStyle(color);
      tg.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
      tg.lineStyle(1, 0x000000, 0.25);
      tg.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
      tg.generateTexture(`tile-${zone}`, TILE_SIZE, TILE_SIZE);
      tg.destroy();
    });

    // スライム：オレンジ
    const sg = this.add.graphics();
    sg.fillStyle(0xff6b35);
    sg.fillRect(0, 0, 28, 28);
    sg.lineStyle(1, 0x000000, 0.4);
    sg.strokeRect(0, 0, 28, 28);
    sg.generateTexture("slime", 28, 28);
    sg.destroy();

    // ボス：暗赤紫
    const bg = this.add.graphics();
    bg.fillStyle(0x8b1a1a);
    bg.fillRect(0, 0, 48, 56);
    bg.lineStyle(2, 0xff0000, 0.6);
    bg.strokeRect(0, 0, 48, 56);
    bg.generateTexture("boss", 48, 56);
    bg.destroy();
  }

  private buildTileMap(): (string | null)[][] {
    const map: (string | null)[][] = Array.from(
      { length: MAP_H },
      () => new Array(MAP_W).fill(null)
    );

    const fillRoom = (x: number, y: number, w: number, h: number, zone: string) => {
      for (let tx = x; tx < x + w; tx++) {
        map[y][tx] = zone;
        map[y + h - 1][tx] = zone;
      }
      for (let ty = y + 1; ty < y + h - 1; ty++) {
        map[ty][x] = zone;
        map[ty][x + w - 1] = zone;
      }
    };

    const addPlatform = (x: number, y: number, w: number, zone: string) => {
      for (let tx = x; tx < x + w; tx++) map[y][tx] = zone;
    };

    const clearHole = (x: number, y: number, w: number, h: number) => {
      for (let ty = y; ty < y + h; ty++)
        for (let tx = x; tx < x + w; tx++) map[ty][tx] = null;
    };

    // ── 部屋 ──
    fillRoom(0,  0,  30, 14, "start");
    fillRoom(38, 0,  30, 14, "ability");
    fillRoom(0,  21, 30, 14, "middle");
    fillRoom(38, 21, 30, 14, "boss");

    // ── 水平通路（床レベルで部屋を接続）──
    fillRoom(30, 9,  8, 5, "corridor"); // 上段 floor=y13
    fillRoom(30, 30, 8, 5, "corridor"); // 下段 floor=y34

    // ── 垂直通路 ──
    fillRoom(10, 14, 4, 7, "corridor"); // 左：スタート ↕ 中間
    fillRoom(54, 14, 4, 7, "corridor"); // 右：アビリティ ↕ ボス

    // ── 開口部：水平接続 ──
    clearHole(29, 10, 2, 3); // スタート右壁 ↔ 上段通路左壁
    clearHole(37, 10, 2, 3); // 上段通路右壁 ↔ アビリティ左壁
    clearHole(29, 31, 2, 3); // 中間右壁 ↔ 下段通路左壁
    clearHole(37, 31, 2, 3); // 下段通路右壁 ↔ ボス左壁

    // ── 開口部：垂直接続（側壁を残し内側2タイルのみ開口）──
    clearHole(11, 13, 2, 2); // スタート床 ↔ 左縦通路天井
    clearHole(11, 20, 2, 2); // 左縦通路床 ↔ 中間天井
    clearHole(55, 13, 2, 2); // アビリティ床 ↔ 右縦通路天井
    clearHole(55, 20, 2, 2); // 右縦通路床 ↔ ボス天井

    // ── 内部プラットフォーム ──
    addPlatform(5,  10, 6, "start");
    addPlatform(15,  8, 5, "start");
    addPlatform(44, 10, 5, "ability");
    addPlatform(49,  7, 6, "ability");
    addPlatform(5,  30, 6, "middle");
    addPlatform(18, 27, 7, "middle");
    addPlatform(42, 29, 7, "boss");

    return map;
  }

  private spawnTiles(map: (string | null)[][]): Phaser.Physics.Arcade.StaticGroup {
    const group = this.physics.add.staticGroup();
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        const zone = map[ty][tx];
        if (zone) {
          group.create(
            tx * TILE_SIZE + TILE_SIZE / 2,
            ty * TILE_SIZE + TILE_SIZE / 2,
            `tile-${zone}`
          );
        }
      }
    }
    return group;
  }

  /** セーブポイント（シアン）とアビリティアイテム（ゴールド）の仮マーカー */
  private spawnMarkers(): void {
    const TS = TILE_SIZE;
    this.add.rectangle(3 * TS + TS / 2, 12 * TS, TS, TS * 1.5, 0x00ffff, 0.85);
    this.add.rectangle(51 * TS + TS / 2, 6 * TS + TS / 2, TS, TS, 0xffd700, 0.9);
  }

  private createPlayer(): void {
    this.player = new Player(this, TILE_SIZE * 3, TILE_SIZE * 12);
    this.physics.add.collider(this.player, this.platforms);
  }

  private spawnEnemies(): void {
    const addEnemy = (enemy: Enemy) => {
      this.physics.add.collider(enemy, this.platforms);
      this.physics.add.collider(this.player, enemy, () => {
        const hp = this.player.takeDamage(enemy.getContactDamage());
        if (hp <= 0) this.time.delayedCall(300, () => this.scene.restart());
      });
      this.enemies.push(enemy);
    };

    // スタート部屋（穴 x=10-13 を避けてパトロール）
    addEnemy(new Enemy(this, 18 * TILE_SIZE, 12 * TILE_SIZE, "slime", 2, 1, 80, 14 * TILE_SIZE, 27 * TILE_SIZE));

    // 中間エリア（floor tile y=34 → スポーン y=33 tile、穴 x=10-13 を避ける）
    addEnemy(new Enemy(this, 5  * TILE_SIZE, 33 * TILE_SIZE, "slime", 2, 1, 80,  1 * TILE_SIZE,  9 * TILE_SIZE));
    addEnemy(new Enemy(this, 20 * TILE_SIZE, 33 * TILE_SIZE, "slime", 2, 1, 80, 14 * TILE_SIZE, 28 * TILE_SIZE));

    // ボス部屋
    addEnemy(new Boss(this, 1680, 33 * TILE_SIZE));
  }

  private setupCamera(): void {
    const worldW = MAP_W * TILE_SIZE;
    const worldH = MAP_H * TILE_SIZE;
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
  }

  update(): void {
    this.player.update();
    this.enemies.forEach(e => { if (e.active) e.update(); });
    this.checkAttackHits();
  }

  private checkAttackHits(): void {
    const attackRect = this.player.getAttackRect();
    if (!attackRect) return;

    this.enemies.forEach(enemy => {
      if (!enemy.active) return;
      const b = enemy.getBounds();
      if (Phaser.Geom.Intersects.RectangleToRectangle(
        attackRect,
        new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height)
      )) {
        const hp = enemy.takeDamage(1);
        if (hp <= 0) enemy.destroy();
      }
    });
  }
}
