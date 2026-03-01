import Phaser from "phaser";
import { TILE_SIZE, PLAYER_WIDTH, PLAYER_HEIGHT } from "../config";
import { Player } from "../entities/Player";

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

  constructor() {
    super({ key: "GameScene" });
  }

  create(): void {
    this.createTextures();
    const tileMap = this.buildTileMap();
    this.platforms = this.spawnTiles(tileMap);
    this.spawnMarkers();
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

    Object.entries(ZONE_COLOR).forEach(([zone, color]) => {
      const tg = this.add.graphics();
      tg.fillStyle(color);
      tg.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
      tg.lineStyle(1, 0x000000, 0.25);
      tg.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
      tg.generateTexture(`tile-${zone}`, TILE_SIZE, TILE_SIZE);
      tg.destroy();
    });
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

    // ── 開口部：垂直接続 ──
    clearHole(10, 13, 4, 2); // スタート床 ↔ 左縦通路天井
    clearHole(10, 20, 4, 2); // 左縦通路床 ↔ 中間天井
    clearHole(54, 13, 4, 2); // アビリティ床 ↔ 右縦通路天井
    clearHole(54, 20, 4, 2); // 右縦通路床 ↔ ボス天井

    // ── 内部プラットフォーム ──
    addPlatform(5,  10, 6, "start");    // スタート：下段足場
    addPlatform(15,  8, 5, "start");    // スタート：上段足場
    addPlatform(44, 10, 5, "ability");  // アビリティ：下段足場
    addPlatform(49,  7, 6, "ability");  // アビリティ：アイテム前足場
    addPlatform(5,  30, 6, "middle");   // 中間エリア：足場
    addPlatform(18, 27, 7, "middle");
    addPlatform(42, 29, 7, "boss");     // ボス部屋：足場

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

  private setupCamera(): void {
    const worldW = MAP_W * TILE_SIZE;
    const worldH = MAP_H * TILE_SIZE;
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
  }

  update(): void {
    this.player.update();
  }
}
