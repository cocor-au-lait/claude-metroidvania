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
 * マップ構成（タイル座標）—— ハブ型レイアウト
 *
 *            [アビリティ(23-36,0-11)]
 *                   ↕ (x:28-29, y:11-12)
 * [中間(0-19,12-22)] ←→ [スタート(20-39,12-22)] ←→ [ボス前室(40-55,12-22)]
 *                                                        ↕ 段差ゲート(x:48-49,y:17-21)
 *                                                     [ボス部屋(40-67,23-34)]
 *
 * ゲート（暫定）：
 *   ボス前室内に3タイル高(96px)の壁。片足ジャンプ最大128px > 96px → 越えられる（暫定）
 *   TODO: 二段ジャンプ実装後に5タイル高(160px)へ戻す
 */
export class GameScene extends Phaser.Scene {
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private enemies: Enemy[] = [];
  private spawnPoint = { x: 24 * TILE_SIZE, y: 20 * TILE_SIZE };

  constructor() {
    super({ key: "GameScene" });
  }

  create(): void {
    this.createTextures();
    const tileMap = this.buildTileMap();
    this.platforms = this.spawnTiles(tileMap);
    this.createPlayer();
    this.spawnInteractables();
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

    const addWall = (x: number, y: number, h: number, zone: string) => {
      for (let ty = y; ty < y + h; ty++) map[ty][x] = zone;
    };

    const clearHole = (x: number, y: number, w: number, h: number) => {
      for (let ty = y; ty < y + h; ty++)
        for (let tx = x; tx < x + w; tx++) map[ty][tx] = null;
    };

    // ── 部屋 ──
    fillRoom(23,  0, 14, 12, "ability");  // アビリティ部屋 (x:23-36, y:0-11)
    fillRoom(20, 12, 20, 11, "start");    // スタート（ハブ）(x:20-39, y:12-22)
    fillRoom( 0, 12, 20, 11, "middle");   // 中間エリア (x:0-19, y:12-22)
    fillRoom(40, 12, 16, 11, "corridor"); // ボス前室 (x:40-55, y:12-22)
    fillRoom(40, 23, 28, 12, "boss");     // ボス部屋 (x:40-67, y:23-34)

    // ── 開口部：垂直接続 ──
    clearHole(28, 10, 2, 3); // アビリティ部屋床 ↔ スタート天井 (x:28-29, y:10-12)
    clearHole(52, 22, 3, 2); // ボス前室床 ↔ ボス部屋天井（ゲート右側）(x:52-54, y:22-23)

    // ── 開口部：水平接続 ──
    clearHole(19, 16, 2, 3); // 中間右壁 ↔ スタート左壁 (x:19-20, y:16-18)
    clearHole(39, 16, 2, 3); // スタート右壁 ↔ ボス前室左壁 (x:39-40, y:16-18)

    // ── ゲート（ボス前室内）── ※暫定：3タイル高(96px)で単純ジャンプで突破可能
    // TODO: 二段ジャンプ実装後に5タイル高(160px)へ戻す（必須ゲート化）
    addWall(48, 19, 3, "corridor"); // x:48, y:19-21
    addWall(49, 19, 3, "corridor"); // x:49, y:19-21

    // ── 内部プラットフォーム ──
    // アビリティ部屋（低い足場 → 高い足場へ誘導）
    addPlatform(25,  7, 5, "ability"); // 低い足場
    addPlatform(32,  3, 4, "ability"); // 高い足場（アビリティアイテム台）

    // スタート部屋
    // 上へのルート: 床(y:22) → y:18 → y:14(開口部直下) → 開口部(y:12) → アビリティ部屋
    addPlatform(22, 18, 5, "start");            // 第1段 (4タイル上昇=128px)
    addPlatform(26, 15, 5, "start");            // 第2段・開口部直下 (4タイル上昇=128px)
    addPlatform(33, 16, 5, "start");

    // 中間エリア
    addPlatform( 3, 18, 5, "middle");
    addPlatform(12, 15, 5, "middle");

    // ボス部屋
    addPlatform(44, 29, 7, "boss");
    addPlatform(57, 26, 5, "boss");

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

  /** アビリティアイテム（二段ジャンプ）とセーブポイントを配置 */
  private spawnInteractables(): void {
    const TS = TILE_SIZE;

    // ── アビリティアイテム（二段ジャンプ）──
    // アビリティ部屋の高い足場の上 (x:34, y:2)
    const abilityX = 34 * TS + TS / 2;
    const abilityY = 2 * TS + TS / 2;
    const abilityVis = this.add.rectangle(abilityX, abilityY, TS, TS, 0xffd700, 0.9);
    const abilityZone = this.add.zone(abilityX, abilityY, TS, TS);
    this.physics.add.existing(abilityZone, true);
    this.physics.add.overlap(this.player, abilityZone, () => {
      if (!abilityVis.active) return;
      this.player.enableDoubleJump();
      abilityVis.destroy();
      abilityZone.destroy();
      const txt = this.add.text(abilityX, abilityY - 24, '二段ジャンプ 取得！', {
        fontSize: '14px', color: '#ffd700', stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5);
      this.time.delayedCall(2000, () => txt.destroy());
    });

    // ── セーブポイント ──
    // 中間エリア右寄り (x:14, y:21)
    const saveX = 14 * TS + TS / 2;
    const saveY = 21 * TS;
    this.add.rectangle(saveX, saveY, TS, TS * 1.5, 0x00ffff, 0.85);
    const saveZone = this.add.zone(saveX, saveY, TS, TS * 1.5);
    this.physics.add.existing(saveZone, true);
    this.physics.add.overlap(this.player, saveZone, () => {
      this.spawnPoint = { x: saveX, y: saveY - TS };
      this.player.healFull();
    });
  }

  private createPlayer(): void {
    // スタート部屋（x:20-39, y:12-22）の左寄りに配置
    this.player = new Player(this, 24 * TILE_SIZE, 20 * TILE_SIZE);
    this.physics.add.collider(this.player, this.platforms);
  }

  private spawnEnemies(): void {
    const addEnemy = (enemy: Enemy) => {
      this.physics.add.collider(enemy, this.platforms);
      this.physics.add.collider(this.player, enemy, () => {
        const hp = this.player.takeDamage(enemy.getContactDamage());
        if (hp <= 0) this.time.delayedCall(300, () => {
          this.player.respawn(this.spawnPoint.x, this.spawnPoint.y);
        });
      });
      this.enemies.push(enemy);
    };

    // 中間エリア（x:0-19, y:12-22 → 床 y:22、内部 y:21 にスポーン）
    addEnemy(new Enemy(this,  4 * TILE_SIZE, 21 * TILE_SIZE, "slime", 2, 1, 80,  1 * TILE_SIZE,  8 * TILE_SIZE));
    addEnemy(new Enemy(this, 13 * TILE_SIZE, 21 * TILE_SIZE, "slime", 2, 1, 80,  9 * TILE_SIZE, 18 * TILE_SIZE));

    // ボス部屋
    addEnemy(new Boss(this, 55 * TILE_SIZE, 33 * TILE_SIZE));
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
