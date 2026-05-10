import * as THREE from 'three';
import { createStylizedTree, createStylizedRock, createFlowerModel, createCarrotModel, createMushroomModel, createBerryBush, createCrystalModel, createLootChest } from './ProceduralModels';
import { createWaterMaterial } from './Shaders';

export interface WorldItem {
  id: string;
  type: 'tree' | 'rock' | 'campfire' | 'furnace' | 'crystal' | 'flower' | 'carrot' | 'workbench' | 'mushroom' | 'berryBush' | 'lootChest';
  mesh: THREE.Object3D;
  position: THREE.Vector3;
  health: number;
  maxHealth: number;
  isCustomPlaced?: boolean;
}

export interface GroundData {
  terrainMesh: THREE.Mesh;
  waterMesh: THREE.Mesh;
  items: WorldItem[];
  grassGroup: THREE.Group;
  worldSize: number;
  getHeightAt: (x: number, z: number) => number;
}

// Seeded PRNG for consistent world generation across all devices
class SeededRandom {
  private seed: number;
  constructor(seed: number) { this.seed = seed; }
  next(): number {
    this.seed = (this.seed * 16807 + 0) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
  range(min: number, max: number): number { return min + this.next() * (max - min); }
}

export class WorldGenerator {
  private size = 200;
  private segments = 100;
  private rng: SeededRandom;

  constructor(seed: number = 42) {
    this.rng = new SeededRandom(seed);
  }

  private noise(x: number, z: number): number {
    const nx = x * 0.04;
    const nz = z * 0.04;
    let e = Math.sin(nx * 0.8) * Math.cos(nz * 0.8) * 4.0;
    e += Math.sin(nx * 2.0 + 0.5) * Math.cos(nz * 2.0 - 0.3) * 1.8;
    e += Math.sin(nx * 5.0) * Math.cos(nz * 5.0) * 0.5;
    e += Math.sin(nx * 12.0) * Math.cos(nz * 12.0) * 0.15;
    const riverPath = Math.sin(z * 0.05) * 20.0 + Math.sin(z * 0.02) * 10.0;
    const riverDist = Math.abs(x - riverPath);
    if (riverDist < 12) { e -= (1 - riverDist / 12) * 3.5; }
    const stream2 = Math.cos(z * 0.08) * 15.0 + 30;
    const streamDist = Math.abs(x - stream2);
    if (streamDist < 6) { e -= (1 - streamDist / 6) * 2.0; }
    const borderDist = Math.max(Math.abs(x), Math.abs(z));
    if (borderDist > this.size * 0.4) { e += (borderDist - this.size * 0.4) * 0.8; }
    return e;
  }

  public generate(): GroundData {
    const items: WorldItem[] = [];
    const terrainGeo = new THREE.PlaneGeometry(this.size, this.size, this.segments, this.segments);
    terrainGeo.rotateX(-Math.PI / 2);
    const posAttr = terrainGeo.attributes.position;
    const colors: number[] = [];
    const colorObj = new THREE.Color();
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i); const vz = posAttr.getZ(i);
      const vy = this.noise(vx, vz); posAttr.setY(i, vy);
      if (vy < -1.5) colorObj.setHex(0x5a4d3a);
      else if (vy < -0.5) colorObj.setHex(0x6b5d4a);
      else if (vy > 8.0) colorObj.setHex(0x606666);
      else if (vy > 5.0) colorObj.setHex(0x4a5550);
      else {
        const variation = Math.sin(vx * 0.3) * Math.cos(vz * 0.3);
        if (variation > 0.3) colorObj.setHex(0x2d5a28);
        else if (variation < -0.3) colorObj.setHex(0x1a3318);
        else colorObj.setHex(0x234420);
      }
      colors.push(colorObj.r, colorObj.g, colorObj.b);
    }
    terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();
    const terrainMat = new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, shininess: 10 });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true; terrainMesh.castShadow = true;
    const getHeightAt = (x: number, z: number): number => {
      if (Math.abs(x) > this.size / 2 || Math.abs(z) > this.size / 2) return 15;
      return this.noise(x, z);
    };
    const waterGeo = new THREE.PlaneGeometry(this.size, this.size, 60, 60);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMesh = new THREE.Mesh(waterGeo, createWaterMaterial());
    waterMesh.position.y = -1.3;

    // Trees
    const treeTypes: ('oak' | 'pine' | 'birch' | 'willow' | 'cherry' | 'dead')[] = ['oak', 'pine', 'birch', 'oak', 'pine', 'willow', 'cherry', 'dead'];
    for (let i = 0; i < 350; i++) {
      const tx = (this.rng.next() - 0.5) * this.size * 0.88;
      const tz = (this.rng.next() - 0.5) * this.size * 0.88;
      const ty = getHeightAt(tx, tz);
      if (ty > -0.3 && ty < 6.0) {
        const treeType = treeTypes[Math.floor(this.rng.next() * treeTypes.length)];
        const treeScale = 0.6 + this.rng.next() * 0.8;
        const treeMesh = createStylizedTree(treeScale, treeType);
        treeMesh.position.set(tx, ty, tz); treeMesh.rotation.y = this.rng.next() * Math.PI * 2;
        items.push({ id: `tree_${i}`, type: 'tree', mesh: treeMesh, position: new THREE.Vector3(tx, ty, tz), health: 100, maxHealth: 100 });
      }
    }
    // Rocks
    for (let i = 0; i < 150; i++) {
      const rx = (this.rng.next() - 0.5) * this.size * 0.85;
      const rz = (this.rng.next() - 0.5) * this.size * 0.85;
      const ry = getHeightAt(rx, rz);
      if (ry > -1.0 && ry < 10.0) {
        const rockScale = 0.3 + this.rng.next() * 1.0;
        const isDark = ry > 4.0;
        const rockMesh = createStylizedRock(rockScale, isDark);
        rockMesh.position.set(rx, ry + rockScale * 0.3, rz);
        rockMesh.rotation.set(this.rng.next() * 0.5, this.rng.next() * Math.PI, this.rng.next() * 0.5);
        items.push({ id: `rock_${i}`, type: 'rock', mesh: rockMesh, position: new THREE.Vector3(rx, ry, rz), health: 80, maxHealth: 80 });
      }
    }
    // Flowers
    const flowerColors: ('pink' | 'yellow' | 'white' | 'blue')[] = ['pink', 'yellow', 'white', 'blue'];
    for (let i = 0; i < 200; i++) {
      const fx = (this.rng.next() - 0.5) * this.size * 0.8;
      const fz = (this.rng.next() - 0.5) * this.size * 0.8;
      const fy = getHeightAt(fx, fz);
      if (fy > 0 && fy < 3.5) {
        const colorType = flowerColors[Math.floor(this.rng.next() * flowerColors.length)];
        const flowerMesh = createFlowerModel(colorType);
        flowerMesh.position.set(fx, fy, fz); flowerMesh.rotation.y = this.rng.next() * Math.PI * 2;
        flowerMesh.scale.setScalar(0.8 + this.rng.next() * 0.4);
        items.push({ id: `flower_${i}`, type: 'flower', mesh: flowerMesh, position: new THREE.Vector3(fx, fy, fz), health: 10, maxHealth: 10 });
      }
    }
    // Carrots
    for (let i = 0; i < 60; i++) {
      const cx = (this.rng.next() - 0.5) * this.size * 0.7;
      const cz = (this.rng.next() - 0.5) * this.size * 0.7;
      const cy = getHeightAt(cx, cz);
      if (cy > 0.5 && cy < 3.0) {
        const carrotMesh = createCarrotModel();
        carrotMesh.position.set(cx, cy, cz); carrotMesh.rotation.y = this.rng.next() * Math.PI * 2;
        items.push({ id: `carrot_${i}`, type: 'carrot', mesh: carrotMesh, position: new THREE.Vector3(cx, cy, cz), health: 5, maxHealth: 5 });
      }
    }
    // Mushrooms
    for (let i = 0; i < 80; i++) {
      const mx = (this.rng.next() - 0.5) * this.size * 0.75;
      const mz = (this.rng.next() - 0.5) * this.size * 0.75;
      const my = getHeightAt(mx, mz);
      if (my > 0 && my < 3.0) {
        const mush = createMushroomModel(this.rng.next() > 0.6 ? 'blue' : 'red');
        mush.position.set(mx, my, mz); mush.rotation.y = this.rng.next() * Math.PI * 2;
        mush.scale.setScalar(0.7 + this.rng.next() * 0.6);
        items.push({ id: `mush_${i}`, type: 'mushroom', mesh: mush, position: new THREE.Vector3(mx, my, mz), health: 5, maxHealth: 5 });
      }
    }
    // Berry bushes
    for (let i = 0; i < 40; i++) {
      const bx = (this.rng.next() - 0.5) * this.size * 0.7;
      const bz = (this.rng.next() - 0.5) * this.size * 0.7;
      const by = getHeightAt(bx, bz);
      if (by > 0.5 && by < 3.5) {
        const bush = createBerryBush();
        bush.position.set(bx, by, bz);
        items.push({ id: `berry_${i}`, type: 'berryBush', mesh: bush, position: new THREE.Vector3(bx, by, bz), health: 50, maxHealth: 50 });
      }
    }
    // Crystals
    for (let i = 0; i < 25; i++) {
      const cx = (this.rng.next() - 0.5) * this.size * 0.6;
      const cz = (this.rng.next() - 0.5) * this.size * 0.6;
      const cy = getHeightAt(cx, cz);
      if (cy > 0 && cy < 4.0) {
        const crystal = createCrystalModel();
        crystal.position.set(cx, cy, cz);
        items.push({ id: `crystal_${i}`, type: 'crystal', mesh: crystal, position: new THREE.Vector3(cx, cy, cz), health: 30, maxHealth: 30 });
      }
    }
    // Loot Chests
    for (let i = 0; i < 15; i++) {
      const lx = (this.rng.next() - 0.5) * this.size * 0.65;
      const lz = (this.rng.next() - 0.5) * this.size * 0.65;
      const ly = getHeightAt(lx, lz);
      if (ly > 0 && ly < 4.0) {
        const chest = createLootChest();
        chest.position.set(lx, ly, lz); chest.rotation.y = this.rng.next() * Math.PI * 2;
        items.push({ id: `chest_${i}`, type: 'lootChest', mesh: chest, position: new THREE.Vector3(lx, ly, lz), health: 50, maxHealth: 50 });
      }
    }
    // Grass group (visual only)
    const grassGroup = new THREE.Group();
    const grassGeo = new THREE.PlaneGeometry(0.15, 0.3);
    const grassMat = new THREE.MeshLambertMaterial({ color: 0x3a6b30, side: THREE.DoubleSide });
    for (let i = 0; i < 800; i++) {
      const gx = (this.rng.next() - 0.5) * this.size * 0.85;
      const gz = (this.rng.next() - 0.5) * this.size * 0.85;
      const gy = getHeightAt(gx, gz);
      if (gy > 0 && gy < 4.0) {
        const blade = new THREE.Mesh(grassGeo, grassMat);
        blade.position.set(gx, gy + 0.15, gz);
        blade.rotation.y = this.rng.next() * Math.PI;
        grassGroup.add(blade);
      }
    }
    return { terrainMesh, waterMesh, items, grassGroup, worldSize: this.size, getHeightAt };
  }
}
