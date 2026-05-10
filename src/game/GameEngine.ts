import * as THREE from 'three';
import { WorldGenerator, GroundData } from './WorldGenerator';
import {
  createPlayerModel, PlayerRig, createDeerModel, createRabbitModel, createFoxModel,
  createWolfModel, createBoarModel, AnimalRig, createZombieModel, createSkeletonModel,
  EnemyRig, createSpiderModel, createAxeModel, createPickaxeModel, createSwordModel,
  createFurnaceModel, createCampfireModel, createMeatModel, createWoodLogModel,
  createStoneModel, createBurningEffect, createWorkbenchModel
} from './ProceduralModels';
import { sounds } from '../audio/SoundManager';
import { createFireflyMaterial, createSkyMaterial, createDustMaterial } from './Shaders';
import { ParticleEffects } from './ParticleEffects';
import { MultiplayerManager, ChatMessage } from './Multiplayer';

export interface InventoryState {
  wood: number; stone: number; rawMeat: number; cookedMeat: number;
  carrot: number; berries: number; mushroom: number; crystal: number; gold: number;
  axe: boolean; pickaxe: boolean; sword: boolean; workbench: boolean;
  furnaceCount: number; campfireCount: number;
}

export interface GameConfig {
  graphicsQuality: 'low' | 'medium' | 'high';
  difficulty: 'peaceful' | 'normal' | 'hard';
  rainIntensity: number; daySpeed: number;
}

interface DroppedItem { mesh: THREE.Object3D; type: string; pos: THREE.Vector3; bobOffset: number; }
interface Animal {
  rig: AnimalRig; pos: THREE.Vector3; vel: THREE.Vector3; health: number; maxHealth: number;
  state: 'graze' | 'flee' | 'chase'; timer: number;
  animalType: 'deer' | 'rabbit' | 'fox' | 'wolf' | 'boar';
}
interface Enemy {
  group: THREE.Object3D; rigType: 'zombie' | 'spider' | 'skeleton'; rig?: EnemyRig;
  pos: THREE.Vector3; health: number; maxHealth: number; speed: number;
  isBurning: boolean; burningEffect?: THREE.Group; burnTimer: number;
  attackCooldown: number; growlTimer: number;
}

export class GameEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private ground!: GroundData;
  private playerRig!: PlayerRig;
  private cameraOffset = new THREE.Vector3(1.0, 2.5, 5.0);
  private cameraRotationAngle = 0;
  private cameraPitch = 0.3;
  private dirLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private fog!: THREE.FogExp2;
  private sunLight!: THREE.PointLight;
  private rainParticles!: THREE.Points;
  private fireflyParticles!: THREE.Points;
  private fireflyMaterial!: THREE.ShaderMaterial;
  private leafParticles!: THREE.Points | null;
  private dustParticles!: THREE.Points | null;
  private dustMaterial!: THREE.ShaderMaterial | null;
  private skyMesh!: THREE.Mesh;
  private skyMaterial!: THREE.ShaderMaterial;
  private waterMaterial!: THREE.ShaderMaterial;
  private animals: Animal[] = [];
  private enemies: Enemy[] = [];
  private droppedItems: DroppedItem[] = [];
  public particles!: ParticleEffects;
  public multiplayer!: MultiplayerManager;
  public playerPos = new THREE.Vector3(0, 5, 0);
  private activeTool: 'none' | 'axe' | 'pickaxe' | 'sword' | 'meat' = 'none';
  public moveVector = new THREE.Vector2(0, 0);
  public lookDelta = 0;
  public isAttacking = false;
  private isPointerLocked = false;
  private touchLookActive = false;
  private lastTouchX = 0;
  private lastTouchY = 0;
  private touchLookId: number | null = null;
  public timeOfDay = 0.3;
  public isNight = false;
  private clock = new THREE.Clock();
  private animationTime = 0;
  private mpSyncTimer = 0;
  private timeSyncTimer = 0;
  private hurtFlashTimer = 0;
  public health = 100;
  public hunger = 100;
  public stamina = 100;
  public inventory: InventoryState = {
    wood: 8, stone: 5, rawMeat: 0, cookedMeat: 0, carrot: 0, berries: 0,
    mushroom: 0, crystal: 0, gold: 0, axe: false, pickaxe: false, sword: false,
    workbench: false, furnaceCount: 0, campfireCount: 0
  };
  private config: GameConfig;
  private onUpdateHUD: () => void;
  private onAlert: (msg: string) => void;
  public onChatReceived: ((msg: ChatMessage) => void) | null = null;
  private isRunning = false;
  private statInterval: ReturnType<typeof setInterval> | null = null;
  private isMobile: boolean;
  private worldSeed: number;

  // Reusable vectors to avoid GC pressure
  private _fwd = new THREE.Vector3();
  private _right = new THREE.Vector3();
  private _mv = new THREE.Vector3();
  private _dir = new THREE.Vector3();
  private _tmpV = new THREE.Vector3();
  private _yAxis = new THREE.Vector3(0, 1, 0);

  // Frame skip for mobile
  private frameCount = 0;

  constructor(container: HTMLElement, config: GameConfig, onUpdateHUD: () => void, onAlert: (msg: string) => void, seed: number = 42) {
    this.container = container;
    this.config = config;
    this.onUpdateHUD = onUpdateHUD;
    this.onAlert = onAlert;
    this.worldSeed = seed;
    this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a1510);
    this.fog = new THREE.FogExp2(0x1a2820, this.isMobile ? 0.025 : 0.015);
    this.scene.fog = this.fog;
    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.5, this.isMobile ? 120 : 250);

    this.renderer = new THREE.WebGLRenderer({
      antialias: false, // Never antialias — biggest perf win
      powerPreference: this.isMobile ? 'low-power' : 'high-performance',
      stencil: false,
      depth: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(this.isMobile ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isMobile && config.graphicsQuality === 'high';
    if (this.renderer.shadowMap.enabled) this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.container.appendChild(this.renderer.domElement);

    this.particles = new ParticleEffects(this.scene);
    this.multiplayer = new MultiplayerManager(this.scene);
    this.multiplayer.onChatMessage = (msg) => { if (this.onChatReceived) this.onChatReceived(msg); };
    this.multiplayer.onTimeSync = (time) => { this.timeOfDay = time; };

    this.setupEnvironment();
    this.setupParticles();
    this.setupWorld();
    this.setupPlayer();
    this.setupAnimals();
    this.setupControls();
    this.setupMultiplayerCallbacks();
    window.addEventListener('resize', this.onWindowResize);
  }

  private setupControls() {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('click', () => {
      if (!this.isPointerLocked && !this.isMobile) canvas.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === canvas;
    });
    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.isPointerLocked) return;
      this.cameraRotationAngle -= e.movementX * 0.003;
      this.cameraPitch = Math.max(-0.5, Math.min(0.8, this.cameraPitch + e.movementY * 0.002));
    });
    const keysDown = new Set<string>();
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      keysDown.add(e.key.toLowerCase());
      if (e.key === ' ') { e.preventDefault(); this.triggerAction(); }
      if (e.key === '1') this.equipTool('axe');
      if (e.key === '2') this.equipTool('pickaxe');
      if (e.key === '3') this.equipTool('sword');
      if (e.key === '4') this.equipTool('meat');
      this.updateKeyboardMove(keysDown);
    });
    document.addEventListener('keyup', (e: KeyboardEvent) => {
      keysDown.delete(e.key.toLowerCase());
      this.updateKeyboardMove(keysDown);
    });

    // Mobile camera touch
    canvas.addEventListener('touchstart', (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.clientX > window.innerWidth * 0.35 && this.touchLookId === null) {
          this.touchLookActive = true;
          this.touchLookId = t.identifier;
          this.lastTouchX = t.clientX;
          this.lastTouchY = t.clientY;
        }
      }
    }, { passive: true });
    canvas.addEventListener('touchmove', (e: TouchEvent) => {
      if (!this.touchLookActive || this.touchLookId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === this.touchLookId) {
          this.cameraRotationAngle -= (t.clientX - this.lastTouchX) * 0.004;
          this.cameraPitch = Math.max(-0.5, Math.min(0.8, this.cameraPitch + (t.clientY - this.lastTouchY) * 0.002));
          this.lastTouchX = t.clientX;
          this.lastTouchY = t.clientY;
          break;
        }
      }
    }, { passive: true });
    canvas.addEventListener('touchend', (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.touchLookId) {
          this.touchLookActive = false;
          this.touchLookId = null;
          break;
        }
      }
    }, { passive: true });
  }

  private updateKeyboardMove(keys: Set<string>) {
    let x = 0, y = 0;
    if (keys.has('w') || keys.has('arrowup')) y = 1;
    if (keys.has('s') || keys.has('arrowdown')) y = -1;
    if (keys.has('a') || keys.has('arrowleft')) x = -1;
    if (keys.has('d') || keys.has('arrowright')) x = 1;
    this.moveVector.set(x, y);
    if (this.moveVector.length() > 1) this.moveVector.normalize();
  }

  private setupEnvironment() {
    this.hemiLight = new THREE.HemisphereLight(0x88ccff, 0x223311, 0.5);
    this.hemiLight.position.set(0, 100, 0); this.scene.add(this.hemiLight);
    this.scene.add(new THREE.AmbientLight(0x334433, this.isMobile ? 0.4 : 0.2));
    this.dirLight = new THREE.DirectionalLight(0xfffaf0, 1.6);
    this.dirLight.position.set(60, 100, 60);
    this.dirLight.castShadow = !this.isMobile && this.config.graphicsQuality === 'high';
    if (this.dirLight.castShadow) {
      const s = this.dirLight.shadow;
      s.camera.top = s.camera.right = 60; s.camera.bottom = s.camera.left = -60;
      s.camera.near = 0.5; s.camera.far = 200;
      s.mapSize.width = s.mapSize.height = 2048;
      s.bias = -0.0002; s.normalBias = 0.02;
    }
    this.scene.add(this.dirLight);
    if (!this.isMobile) {
      this.sunLight = new THREE.PointLight(0xffeecc, 0.5, 300);
      this.sunLight.position.copy(this.dirLight.position); this.scene.add(this.sunLight);
      this.scene.add(new THREE.DirectionalLight(0xaaddff, 0.25).translateOnAxis(new THREE.Vector3(-40, 60, -40), 1));
    } else {
      this.sunLight = new THREE.PointLight(0xffeecc, 0, 0); // dummy
    }
    const skySegs = this.isMobile ? 16 : 32;
    const skyGeo = new THREE.SphereGeometry(200, skySegs, skySegs / 2);
    this.skyMaterial = createSkyMaterial();
    this.skyMesh = new THREE.Mesh(skyGeo, this.skyMaterial);
    this.scene.add(this.skyMesh);
  }

  private setupParticles() {
    // Rain — reduced on mobile
    const rc = this.isMobile ? 200 : (this.config.graphicsQuality === 'high' ? 3000 : 1200);
    const rg = new THREE.BufferGeometry();
    const rp = new Float32Array(rc * 3);
    for (let i = 0; i < rc * 3; i += 3) {
      rp[i] = (Math.random() - 0.5) * 60; rp[i + 1] = Math.random() * 25;
      rp[i + 2] = (Math.random() - 0.5) * 60;
    }
    rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
    this.rainParticles = new THREE.Points(rg, new THREE.PointsMaterial({ color: 0xccddee, size: 0.08, transparent: true, opacity: 0.5 }));
    this.scene.add(this.rainParticles);

    // Fireflies — very few on mobile
    const fc = this.isMobile ? 12 : 80;
    const fg = new THREE.BufferGeometry();
    const fp = new Float32Array(fc * 3); const fo = new Float32Array(fc);
    for (let i = 0; i < fc; i++) {
      fp[i * 3] = (Math.random() - 0.5) * 60; fp[i * 3 + 1] = Math.random() * 5;
      fp[i * 3 + 2] = (Math.random() - 0.5) * 60; fo[i] = Math.random();
    }
    fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
    fg.setAttribute('aOffset', new THREE.BufferAttribute(fo, 1));
    this.fireflyMaterial = createFireflyMaterial();
    this.fireflyParticles = new THREE.Points(fg, this.fireflyMaterial); this.scene.add(this.fireflyParticles);

    // Leaf + dust — skip entirely on mobile
    if (!this.isMobile) {
      const lc = 100;
      const lg = new THREE.BufferGeometry();
      const lp = new Float32Array(lc * 3);
      for (let i = 0; i < lc * 3; i += 3) {
        lp[i] = (Math.random() - 0.5) * 60; lp[i + 1] = 3 + Math.random() * 8;
        lp[i + 2] = (Math.random() - 0.5) * 60;
      }
      lg.setAttribute('position', new THREE.BufferAttribute(lp, 3));
      this.leafParticles = new THREE.Points(lg, new THREE.PointsMaterial({ color: 0x44aa33, size: 0.15, transparent: true, opacity: 0.4 }));
      this.scene.add(this.leafParticles);

      const dc = 60;
      const dg = new THREE.BufferGeometry();
      const dp = new Float32Array(dc * 3); const dof = new Float32Array(dc);
      for (let i = 0; i < dc; i++) {
        dp[i * 3] = (Math.random() - 0.5) * 50; dp[i * 3 + 1] = Math.random() * 4;
        dp[i * 3 + 2] = (Math.random() - 0.5) * 50; dof[i] = Math.random();
      }
      dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
      dg.setAttribute('aOffset', new THREE.BufferAttribute(dof, 1));
      this.dustMaterial = createDustMaterial();
      this.dustParticles = new THREE.Points(dg, this.dustMaterial); this.scene.add(this.dustParticles);
    } else {
      this.leafParticles = null;
      this.dustParticles = null;
      this.dustMaterial = null;
    }
  }

  private setupWorld() {
    const gen = new WorldGenerator(this.worldSeed, this.isMobile);
    this.ground = gen.generate();
    this.scene.add(this.ground.terrainMesh);
    this.scene.add(this.ground.waterMesh);
    this.waterMaterial = this.ground.waterMesh.material as THREE.ShaderMaterial;
    if (!this.isMobile) this.scene.add(this.ground.grassGroup);
    this.ground.items.forEach(item => this.scene.add(item.mesh));
  }

  private setupPlayer() {
    this.playerRig = createPlayerModel();
    const startY = this.ground.getHeightAt(0, 0);
    this.playerPos.set(0, startY, 0);
    this.playerRig.group.position.copy(this.playerPos);
    this.scene.add(this.playerRig.group);
    this.onUpdateHUD();
  }

  private setupAnimals() {
    const m = this.isMobile ? 0.4 : 1;
    const spawn = (type: string, count: number, createFn: () => AnimalRig, hp: number, range: number) => {
      const n = Math.max(1, Math.floor(count * m));
      for (let i = 0; i < n; i++) {
        const ax = (Math.random() - 0.5) * range;
        const az = (Math.random() - 0.5) * range;
        const ay = this.ground.getHeightAt(ax, az);
        if (ay > 0 && ay < 5) {
          const rig = createFn();
          rig.group.position.set(ax, ay, az);
          this.scene.add(rig.group);
          this.animals.push({
            rig, pos: new THREE.Vector3(ax, ay, az),
            vel: new THREE.Vector3(), health: hp, maxHealth: hp,
            state: 'graze', timer: Math.random() * 5,
            animalType: type as Animal['animalType']
          });
        }
      }
    };
    spawn('deer', 8, createDeerModel, 40, 150);
    spawn('rabbit', 12, createRabbitModel, 10, 140);
    spawn('fox', 6, createFoxModel, 25, 130);
    spawn('wolf', 4, createWolfModel, 60, 160);
    spawn('boar', 5, createBoarModel, 50, 140);
  }

  private setupMultiplayerCallbacks() {
    this.multiplayer.setCallbacks({
      onTreeBreak: (id: string) => {
        const item = this.ground.items.find(i => i.id === id);
        if (item && item.health > 0) {
          this.scene.remove(item.mesh); item.health = 0;
          if (!this.isMobile) this.particles.spawnBlockBreak(item.position.clone().add(new THREE.Vector3(0, 1, 0)), 0x5c4033);
          sounds.playBlockBreak();
        }
      },
      onRockBreak: (id: string) => {
        const item = this.ground.items.find(i => i.id === id);
        if (item && item.health > 0) {
          this.scene.remove(item.mesh); item.health = 0;
          if (!this.isMobile) this.particles.spawnBlockBreak(item.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 0x737577);
          sounds.playBlockBreak();
        }
      },
      onPlaceItem: (type: string, pos: THREE.Vector3) => {
        let mesh: THREE.Object3D;
        if (type === 'campfire') mesh = createCampfireModel();
        else mesh = createFurnaceModel();
        mesh.position.copy(pos); this.scene.add(mesh);
        this.ground.items.push({
          id: `mp_${type}_${Date.now()}`, type: type as 'campfire' | 'furnace',
          mesh, position: pos, health: 100, maxHealth: 100, isCustomPlaced: true
        });
        sounds.playCraft();
      }
    });
  }

  private onWindowResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  public loadInventory(inv: InventoryState) {
    this.inventory = { ...inv };
    this.onUpdateHUD();
  }

  public loadPlayerState(state: { x: number; y: number; z: number; health: number; hunger: number; stamina: number; timeOfDay: number }) {
    this.playerPos.set(state.x, state.y, state.z);
    this.playerRig.group.position.copy(this.playerPos);
    this.health = state.health;
    this.hunger = state.hunger;
    this.stamina = state.stamina;
    this.timeOfDay = state.timeOfDay;
    this.onUpdateHUD();
  }

  public getPlayerState() {
    return {
      x: this.playerPos.x, y: this.playerPos.y, z: this.playerPos.z,
      health: this.health, hunger: this.hunger, stamina: this.stamina,
      timeOfDay: this.timeOfDay, inventory: { ...this.inventory }
    };
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();
    this.animate();
    setTimeout(() => this.onAlert("🌲 Welcome to Mistfall! Explore, craft, and survive!"), 1500);
    this.statInterval = setInterval(() => {
      if (!this.isRunning) return;
      this.hunger = Math.max(0, this.hunger - 0.3);
      if (this.hunger === 0) this.health = Math.max(0, this.health - 0.4);
      if (this.moveVector.length() < 0.1) this.stamina = Math.min(100, this.stamina + 0.5);
      this.onUpdateHUD();
    }, 1000);
  }

  public pause() { this.isRunning = false; if (this.statInterval) clearInterval(this.statInterval); }

  public equipTool(tool: 'none' | 'axe' | 'pickaxe' | 'sword' | 'meat') {
    this.activeTool = tool;
    while (this.playerRig.toolSlot.children.length > 0) this.playerRig.toolSlot.remove(this.playerRig.toolSlot.children[0]);
    if (tool === 'axe' && this.inventory.axe) { this.playerRig.toolSlot.add(createAxeModel()); sounds.playCraft(); }
    else if (tool === 'pickaxe' && this.inventory.pickaxe) { this.playerRig.toolSlot.add(createPickaxeModel()); sounds.playCraft(); }
    else if (tool === 'sword' && this.inventory.sword) { this.playerRig.toolSlot.add(createSwordModel()); sounds.playCraft(); }
    else if (tool === 'meat' && this.inventory.cookedMeat > 0) {
      const m = createMeatModel(true); m.scale.setScalar(0.8); this.playerRig.toolSlot.add(m);
    }
    this.onUpdateHUD();
  }

  public triggerAction() {
    if (!this.isRunning || this.health <= 0) return;
    if (this.activeTool === 'meat' && this.inventory.cookedMeat > 0) {
      this.inventory.cookedMeat--;
      this.health = Math.min(100, this.health + 30);
      this.hunger = Math.min(100, this.hunger + 40);
      sounds.playSizzle();
      if (!this.isMobile) this.particles.spawnSparkle(this.playerPos.clone().add(new THREE.Vector3(0, 1, 0)), 0x44ff88);
      this.onAlert("🍖 Delicious! +30 HP, +40 Hunger");
      if (this.inventory.cookedMeat === 0) this.equipTool('none');
      this.onUpdateHUD(); return;
    }
    this.isAttacking = true;
    this.stamina = Math.max(0, this.stamina - 5);
    setTimeout(() => { this.isAttacking = false; }, 300);
    const dist = 3.0;

    for (let i = this.droppedItems.length - 1; i >= 0; i--) {
      const d = this.droppedItems[i];
      if (d.pos.distanceTo(this.playerPos) < dist) {
        if (d.type === 'wood') this.inventory.wood++;
        else if (d.type === 'stone') this.inventory.stone++;
        else if (d.type === 'rawMeat') this.inventory.rawMeat++;
        else if (d.type === 'gold') this.inventory.gold++;
        this.scene.remove(d.mesh); this.droppedItems.splice(i, 1);
        sounds.playPickup(); this.onAlert(`Picked up ${d.type}!`);
        this.onUpdateHUD(); return;
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.pos.distanceTo(this.playerPos) < dist) {
        const dmg = this.activeTool === 'sword' ? 35 : 10;
        e.health -= dmg; sounds.playHit();
        if (!this.isMobile) this.particles.spawnBlood(e.pos.clone().add(new THREE.Vector3(0, 1, 0)));
        if (e.health <= 0) {
          this.scene.remove(e.group);
          if (e.burningEffect) this.scene.remove(e.burningEffect);
          const drop = createStoneModel(); drop.position.copy(e.pos); drop.position.y += 0.3;
          this.scene.add(drop);
          this.droppedItems.push({ mesh: drop, type: 'gold', pos: e.pos.clone(), bobOffset: Math.random() * Math.PI * 2 });
          this.enemies.splice(i, 1);
          this.onAlert("☠️ Enemy defeated!");
        }
        this.onUpdateHUD(); return;
      }
    }

    for (let i = this.animals.length - 1; i >= 0; i--) {
      const a = this.animals[i];
      if (a.pos.distanceTo(this.playerPos) < dist) {
        const dmg = this.activeTool === 'sword' ? 30 : 8;
        a.health -= dmg; a.state = 'flee';
        sounds.playHit();
        if (!this.isMobile) this.particles.spawnBlood(a.pos.clone().add(new THREE.Vector3(0, 0.5, 0)));
        if (a.health <= 0) {
          this.scene.remove(a.rig.group);
          const drop = createMeatModel(false); drop.position.copy(a.pos); drop.position.y += 0.3;
          this.scene.add(drop);
          this.droppedItems.push({ mesh: drop, type: 'rawMeat', pos: a.pos.clone(), bobOffset: Math.random() * Math.PI * 2 });
          this.animals.splice(i, 1);
          this.onAlert("🥩 Raw meat dropped!");
        }
        this.onUpdateHUD(); return;
      }
    }

    for (const item of this.ground.items) {
      if (item.health <= 0) continue;
      if (item.position.distanceTo(this.playerPos) >= dist) continue;
      if (item.type === 'workbench') { this.inventory.workbench = true; this.onAlert("📦 Workbench ready!"); this.onUpdateHUD(); return; }
      if (item.type === 'campfire') {
        if (this.inventory.rawMeat > 0) {
          this.inventory.rawMeat--; sounds.playSizzle(); this.onAlert("🔥 Cooking...");
          setTimeout(() => { this.inventory.cookedMeat++; sounds.playCraft(); this.onAlert("🍖 Cooked!"); this.onUpdateHUD(); }, 2000);
          this.onUpdateHUD(); return;
        }
        this.health = Math.min(100, this.health + 2); this.onAlert("🔥 Warming up..."); return;
      }
      if (item.type === 'furnace') {
        if (this.inventory.rawMeat > 0 && this.inventory.wood > 0) {
          this.inventory.rawMeat--; this.inventory.wood--;
          sounds.playSizzle();
          setTimeout(() => { this.inventory.cookedMeat++; sounds.playCraft(); this.onAlert("🍖 Smelted!"); this.onUpdateHUD(); }, 1500);
          this.onUpdateHUD(); return;
        }
      }
      if (item.type === 'carrot' || item.type === 'flower') {
        if (item.type === 'carrot') { this.inventory.carrot++; this.hunger = Math.min(100, this.hunger + 15); this.onAlert("🥕 Carrot!"); }
        else { this.hunger = Math.min(100, this.hunger + 5); this.onAlert("🌸 +5 hunger"); }
        this.scene.remove(item.mesh); item.health = 0; sounds.playPickup(); this.onUpdateHUD(); return;
      }
      if (item.type === 'mushroom') {
        this.inventory.mushroom++; this.hunger = Math.min(100, this.hunger + 12);
        this.scene.remove(item.mesh); item.health = 0; sounds.playPickup();
        this.onAlert("🍄 Mushroom! +12 hunger"); this.onUpdateHUD(); return;
      }
      if (item.type === 'berryBush') {
        this.inventory.berries += 3; this.hunger = Math.min(100, this.hunger + 20);
        sounds.playPickup(); this.onAlert("🫐 Berries x3! +20 hunger"); this.onUpdateHUD(); return;
      }
      if (item.type === 'crystal') {
        this.inventory.crystal++; this.scene.remove(item.mesh); item.health = 0;
        sounds.playLevelUp(); this.onAlert("💎 Crystal found!"); this.onUpdateHUD(); return;
      }
      if (item.type === 'lootChest') {
        const lootTypes = ['wood', 'stone', 'gold', 'crystal'];
        const loot = lootTypes[Math.floor(Math.random() * lootTypes.length)];
        const amount = 2 + Math.floor(Math.random() * 5);
        if (loot === 'wood') this.inventory.wood += amount;
        else if (loot === 'stone') this.inventory.stone += amount;
        else if (loot === 'gold') this.inventory.gold += amount;
        else if (loot === 'crystal') this.inventory.crystal += amount;
        sounds.playLevelUp();
        this.scene.remove(item.mesh); item.health = 0;
        this.onAlert(`🎁 Loot chest! ${amount}x ${loot}!`); this.onUpdateHUD(); return;
      }
      let dmg = 15;
      if (item.type === 'tree') {
        dmg = this.activeTool === 'axe' ? 40 : 15; sounds.playChop();
        if (!this.isMobile) this.particles.spawnWoodChips(item.position.clone().add(new THREE.Vector3(0, 1.5, 0)));
      } else if (item.type === 'rock') {
        dmg = this.activeTool === 'pickaxe' ? 45 : 10; sounds.playMine();
        if (!this.isMobile) this.particles.spawnHitSparks(item.position.clone().add(new THREE.Vector3(0, 0.3, 0)));
      }
      item.health -= dmg;
      if (item.health <= 0) {
        this.scene.remove(item.mesh);
        if (item.type === 'tree') {
          const wc = 2 + Math.floor(Math.random() * 3);
          this.inventory.wood += wc;
          sounds.playBlockBreak();
          this.multiplayer.sendTreeBreak(item.id);
          const drop = createWoodLogModel(); drop.position.copy(item.position); drop.position.y += 0.3;
          this.scene.add(drop);
          this.droppedItems.push({ mesh: drop, type: 'wood', pos: item.position.clone(), bobOffset: Math.random() * Math.PI * 2 });
          this.onAlert(`🪵 +${wc} Wood!`);
        } else if (item.type === 'rock') {
          const sc = 1 + Math.floor(Math.random() * 3);
          this.inventory.stone += sc;
          sounds.playBlockBreak();
          this.multiplayer.sendRockBreak(item.id);
          const drop = createStoneModel(); drop.position.copy(item.position); drop.position.y += 0.3;
          this.scene.add(drop);
          this.droppedItems.push({ mesh: drop, type: 'stone', pos: item.position.clone(), bobOffset: Math.random() * Math.PI * 2 });
          this.onAlert(`🪨 +${sc} Stone!`);
        }
      }
      this.onUpdateHUD(); return;
    }
    sounds.playChop();
  }

  public craft(recipe: string) {
    const inv = this.inventory;
    if (recipe === 'workbench' && inv.wood >= 4) {
      inv.wood -= 4; inv.workbench = true;
      this._fwd.set(0, 0, -1).applyAxisAngle(this._yAxis, this.cameraRotationAngle);
      const p = this.playerPos.clone().addScaledVector(this._fwd, 2.5);
      p.y = this.ground.getHeightAt(p.x, p.z);
      const wb = createWorkbenchModel(); wb.position.copy(p); this.scene.add(wb);
      this.ground.items.push({ id: `wb_${Date.now()}`, type: 'workbench', mesh: wb, position: p, health: 200, maxHealth: 200, isCustomPlaced: true });
      sounds.playCraft(); this.onAlert("🔨 Workbench placed!");
    } else if (recipe === 'axe' && inv.workbench && inv.wood >= 3 && inv.stone >= 2) {
      inv.wood -= 3; inv.stone -= 2; inv.axe = true; sounds.playCraft(); this.onAlert("🪓 Axe crafted!");
    } else if (recipe === 'pickaxe' && inv.workbench && inv.wood >= 2 && inv.stone >= 3) {
      inv.wood -= 2; inv.stone -= 3; inv.pickaxe = true; sounds.playCraft(); this.onAlert("⛏️ Pickaxe crafted!");
    } else if (recipe === 'sword' && inv.workbench && inv.wood >= 2 && inv.stone >= 4 && inv.crystal >= 1) {
      inv.wood -= 2; inv.stone -= 4; inv.crystal -= 1; inv.sword = true; sounds.playCraft(); sounds.playLevelUp(); this.onAlert("⚔️ Crystal Sword crafted!");
    } else if (recipe === 'campfire' && inv.wood >= 5 && inv.stone >= 3) {
      inv.wood -= 5; inv.stone -= 3; inv.campfireCount++; sounds.playCraft(); this.onAlert("🔥 Campfire ready!");
    } else if (recipe === 'furnace' && inv.workbench && inv.stone >= 8) {
      inv.stone -= 8; inv.furnaceCount++; sounds.playCraft(); this.onAlert("🧱 Furnace ready!");
    } else { this.onAlert("Not enough materials!"); return; }
    this.onUpdateHUD();
  }

  public placeStructure(type: 'campfire' | 'furnace') {
    this._fwd.set(0, 0, -1).applyAxisAngle(this._yAxis, this.cameraRotationAngle);
    const p = this.playerPos.clone().addScaledVector(this._fwd, 2.5);
    p.y = this.ground.getHeightAt(p.x, p.z);
    if (type === 'campfire' && this.inventory.campfireCount > 0) {
      this.inventory.campfireCount--;
      const m = createCampfireModel(); m.position.copy(p); this.scene.add(m);
      this.ground.items.push({ id: `cf_${Date.now()}`, type: 'campfire', mesh: m, position: p, health: 100, maxHealth: 100, isCustomPlaced: true });
      sounds.playCraft(); this.onAlert("🔥 Campfire placed!");
      this.multiplayer.sendPlaceItem('campfire', p);
    } else if (type === 'furnace' && this.inventory.furnaceCount > 0) {
      this.inventory.furnaceCount--;
      const m = createFurnaceModel(); m.position.copy(p); this.scene.add(m);
      this.ground.items.push({ id: `fn_${Date.now()}`, type: 'furnace', mesh: m, position: p, health: 200, maxHealth: 200, isCustomPlaced: true });
      sounds.playCraft(); this.onAlert("🧱 Furnace placed!");
    }
    this.onUpdateHUD();
  }

  private updateAtmosphere(delta: number) {
    this.timeOfDay += delta * 0.005 * this.config.daySpeed;
    if (this.timeOfDay > 1.0) { this.timeOfDay = 0.0; this.onAlert("🌅 A new day dawns..."); }
    const wasNight = this.isNight;
    this.isNight = this.timeOfDay < 0.22 || this.timeOfDay > 0.78;
    if (this.isNight && !wasNight) { this.onAlert("🌙 Night falls. Beware!"); sounds.playZombieAlert(); this.spawnNightEnemies(); }

    this.timeSyncTimer += delta;
    if (this.timeSyncTimer > 2 && this.multiplayer.connected) {
      this.multiplayer.sendTimeSync(this.timeOfDay);
      this.timeSyncTimer = 0;
    }

    const sunAngle = (this.timeOfDay - 0.25) * Math.PI * 2;
    const sunAlt = Math.sin(sunAngle);
    const sunX = Math.cos(sunAngle) * 100, sunY = Math.max(10, sunAlt * 100), sunZ = Math.sin(sunAngle) * 100;
    this.dirLight.position.set(sunX, sunY, sunZ);
    if (!this.isMobile) this.sunLight.position.copy(this.dirLight.position);

    if (!this.isNight) {
      const w = Math.max(0, sunAlt);
      this.dirLight.color.setRGB(1.0, 0.98, 0.94);
      this.dirLight.intensity = 1.2 + w * 0.4;
      this.fog.color.setRGB(0.15 + w * 0.35, 0.2 + w * 0.35, 0.15 + w * 0.25);
    } else {
      this.dirLight.color.setRGB(0.2, 0.25, 0.4);
      this.dirLight.intensity = 0.25;
      this.fog.color.setRGB(0.04, 0.06, 0.12);
    }

    this._tmpV.set(sunX, sunY, sunZ).normalize();
    this.skyMaterial.uniforms.uTimeOfDay.value = this.timeOfDay;
    this.skyMaterial.uniforms.uSunDir.value.copy(this._tmpV);
    this.waterMaterial.uniforms.uTime.value = this.animationTime;
    this.waterMaterial.uniforms.uSunDir.value.copy(this._tmpV);
    this.waterMaterial.uniforms.uIsNight.value = this.isNight ? 1.0 : 0.0;
    this.waterMaterial.uniforms.uRainIntensity.value = this.config.rainIntensity;
    this.fireflyMaterial.uniforms.uTime.value = this.animationTime;
    this.fireflyMaterial.uniforms.uIsNight.value = this.isNight ? 1.0 : 0.0;
    if (this.dustMaterial) this.dustMaterial.uniforms.uTime.value = this.animationTime;

    // Rain — only update if visible
    if (this.config.rainIntensity > 0.05) {
      const pa = (this.rainParticles.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
      const spd = 28 * delta * (0.5 + this.config.rainIntensity * 2);
      for (let i = 1; i < pa.length; i += 3) {
        pa[i] -= spd;
        if (pa[i] < 0) pa[i] = 25 + Math.random() * 5;
      }
      this.rainParticles.geometry.attributes.position.needsUpdate = true;
    }
    (this.rainParticles.material as THREE.PointsMaterial).opacity = this.config.rainIntensity > 0.05 ? 0.3 + this.config.rainIntensity * 0.5 : 0;

    // Leaf particles — desktop only
    if (this.leafParticles) {
      const la = (this.leafParticles.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
      for (let i = 0; i < la.length; i += 3) {
        la[i] += Math.sin(this.animationTime * 0.5 + i) * 0.02;
        la[i + 1] -= delta * 0.5;
        if (la[i + 1] < 0) la[i + 1] = 8 + Math.random() * 4;
      }
      this.leafParticles.geometry.attributes.position.needsUpdate = true;
    }

    // Center particles around player
    this.rainParticles.position.set(this.playerPos.x, 0, this.playerPos.z);
    this.fireflyParticles.position.set(this.playerPos.x, 0, this.playerPos.z);
    if (this.leafParticles) this.leafParticles.position.set(this.playerPos.x, 0, this.playerPos.z);
    if (this.dustParticles) this.dustParticles.position.set(this.playerPos.x, 0, this.playerPos.z);

    if (this.dirLight.shadow) {
      this.dirLight.target.position.copy(this.playerPos);
      this.dirLight.target.updateMatrixWorld();
    }

    // Only check fire proximity every 30 frames
    if (this.frameCount % 30 === 0) {
      const nearFire = this.ground.items.some(it =>
        it.health > 0 && (it.type === 'campfire' || it.type === 'furnace') && it.position.distanceTo(this.playerPos) < 6);
      sounds.updateEnvironment(this.config.rainIntensity, this.isNight, nearFire);
    }

    // Campfire animations — only nearby, skip on mobile every other frame
    if (!this.isMobile || this.frameCount % 2 === 0) {
      for (let j = 0; j < this.ground.items.length; j++) {
        const item = this.ground.items[j];
        if (item.type !== 'campfire' || item.health <= 0) continue;
        if (item.position.distanceTo(this.playerPos) > 30) continue;
        item.mesh.traverse((obj: THREE.Object3D) => {
          if (obj.name === "CampfireFlame") {
            obj.scale.y = 0.8 + Math.sin(this.animationTime * 12) * 0.25;
            obj.scale.x = 0.9 + Math.cos(this.animationTime * 10) * 0.15;
            obj.rotation.y = this.animationTime * 2;
          }
          if (obj.name === "CampfireLight") (obj as THREE.PointLight).intensity = 2.5 + Math.sin(this.animationTime * 18) * 0.6;
        });
      }
    }
  }

  private spawnNightEnemies() {
    if (this.config.difficulty === 'peaceful') return;
    const count = this.config.difficulty === 'hard' ? (this.isMobile ? 4 : 8) : (this.isMobile ? 2 : 5);
    const types = ['zombie', 'zombie', 'spider', 'skeleton', 'zombie', 'spider', 'skeleton', 'zombie'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 20 + Math.random() * 30;
      const ex = this.playerPos.x + Math.cos(angle) * dist;
      const ez = this.playerPos.z + Math.sin(angle) * dist;
      const ey = this.ground.getHeightAt(ex, ez);
      const et = types[i % types.length];
      let group: THREE.Object3D; let rig: EnemyRig | undefined;
      if (et === 'zombie') { const z = createZombieModel(); group = z.group; rig = z.rig; }
      else if (et === 'skeleton') { const s = createSkeletonModel(); group = s.group; rig = s.rig; }
      else { group = createSpiderModel(); }
      group.position.set(ex, ey, ez); this.scene.add(group);
      this.enemies.push({
        group, rigType: et as Enemy['rigType'], rig,
        pos: new THREE.Vector3(ex, ey, ez),
        health: et === 'spider' ? 30 : (et === 'skeleton' ? 50 : 60),
        maxHealth: et === 'spider' ? 30 : (et === 'skeleton' ? 50 : 60),
        speed: et === 'spider' ? 4 : (et === 'skeleton' ? 2.5 : 2),
        isBurning: false, burnTimer: 0, attackCooldown: 0, growlTimer: Math.random() * 5
      });
    }
  }

  public sendChat(text: string) { this.multiplayer.sendChatMessage(text); }

  private animate = () => {
    if (!this.isRunning) return;
    requestAnimationFrame(this.animate);
    this.frameCount++;
    const delta = Math.min(this.clock.getDelta(), 0.1);
    this.animationTime += delta;

    this.updateAtmosphere(delta);
    if (!this.isMobile || this.frameCount % 2 === 0) this.particles.update(delta);

    // MP sync — throttle more on mobile
    this.mpSyncTimer += delta;
    const syncRate = this.isMobile ? 0.2 : 0.1;
    if (this.mpSyncTimer > syncRate && this.multiplayer.connected) {
      this.multiplayer.sendState(this.playerPos, this.playerRig.group.rotation.y, this.health, this.activeTool, this.isAttacking);
      this.mpSyncTimer = 0;
    }
    if (!this.isMobile || this.frameCount % 3 === 0) this.multiplayer.update(delta, this.animationTime);

    if (this.hurtFlashTimer > 0) this.hurtFlashTimer -= delta;

    if (!this.isPointerLocked && !this.touchLookActive) {
      this.cameraRotationAngle += this.lookDelta * delta * 2.5;
      this.lookDelta *= 0.85;
    }

    // Movement — reuse vectors
    this._fwd.set(0, 0, -1).applyAxisAngle(this._yAxis, this.cameraRotationAngle);
    this._right.set(1, 0, 0).applyAxisAngle(this._yAxis, this.cameraRotationAngle);
    this._mv.set(0, 0, 0);
    this._mv.addScaledVector(this._fwd, this.moveVector.y);
    this._mv.addScaledVector(this._right, this.moveVector.x);
    if (this._mv.lengthSq() > 0) {
      this._mv.normalize();
      const h = this.ground.getHeightAt(this.playerPos.x, this.playerPos.z);
      const swimming = h < -0.8;
      const spd = (swimming ? 3 : 6) * delta;
      this.playerPos.addScaledVector(this._mv, spd);
      const hs = this.ground.worldSize / 2 - 5;
      this.playerPos.x = Math.max(-hs, Math.min(hs, this.playerPos.x));
      this.playerPos.z = Math.max(-hs, Math.min(hs, this.playerPos.z));
      const targetAngle = Math.atan2(this._mv.x, this._mv.z);
      let ad = targetAngle - this.playerRig.group.rotation.y;
      while (ad < -Math.PI) ad += Math.PI * 2;
      while (ad > Math.PI) ad -= Math.PI * 2;
      this.playerRig.group.rotation.y += ad * 0.12;
      if (this.frameCount % 5 === 0) sounds.playStep(swimming || this.config.rainIntensity > 0.3);
    }

    const ty = this.ground.getHeightAt(this.playerPos.x, this.playerPos.z);
    this.playerPos.y += (ty - this.playerPos.y) * 0.15;
    this.playerRig.group.position.copy(this.playerPos);

    // Player animation
    const isMoving = this.moveVector.length() > 0.05;
    if (this.isAttacking) {
      const p = Math.sin(this.animationTime * 25);
      this.playerRig.rightArm.rotation.x = p * 1.8;
      this.playerRig.leftArm.rotation.x = -p * 0.4;
    } else if (isMoving) {
      const c = Math.sin(this.animationTime * 14);
      this.playerRig.leftArm.rotation.x = c * 0.7;
      this.playerRig.rightArm.rotation.x = -c * 0.7;
      this.playerRig.leftLeg.rotation.x = -c * 0.8;
      this.playerRig.rightLeg.rotation.x = c * 0.8;
      this.playerRig.group.position.y += Math.abs(Math.sin(this.animationTime * 28)) * 0.06;
    } else {
      this.playerRig.leftArm.rotation.x = Math.sin(this.animationTime * 2) * 0.04;
      this.playerRig.rightArm.rotation.x = -Math.sin(this.animationTime * 2) * 0.04;
      this.playerRig.leftLeg.rotation.x = 0;
      this.playerRig.rightLeg.rotation.x = 0;
    }

    // Camera — reuse vectors
    const co = this.cameraOffset;
    this._tmpV.set(co.x, co.y + this.cameraPitch * 2, co.z + this.cameraPitch * 1);
    this._tmpV.applyAxisAngle(this._yAxis, this.cameraRotationAngle);
    this._tmpV.add(this.playerPos);
    this.camera.position.lerp(this._tmpV, 0.08);
    this._tmpV.set(this.playerPos.x, this.playerPos.y + 1.5 - this.cameraPitch, this.playerPos.z);
    this.camera.lookAt(this._tmpV);

    // Dropped items — only update every 2 frames on mobile
    if (!this.isMobile || this.frameCount % 2 === 0) {
      for (let i = 0; i < this.droppedItems.length; i++) {
        const item = this.droppedItems[i];
        item.mesh.position.y = item.pos.y + 0.2 + Math.sin(this.animationTime * 3 + item.bobOffset) * 0.1;
        item.mesh.rotation.y += delta * 1.5;
      }
    }

    // Enemies — skip distant processing, throttle on mobile
    if (!this.isMobile || this.frameCount % 2 === 0) {
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        const dp = e.pos.distanceTo(this.playerPos);
        if (dp > 60) {
          this.scene.remove(e.group); if (e.burningEffect) this.scene.remove(e.burningEffect);
          this.enemies.splice(i, 1); continue;
        }
        if (!this.isNight && !e.isBurning) {
          e.isBurning = true; e.burningEffect = createBurningEffect();
          e.burningEffect.position.copy(e.pos); this.scene.add(e.burningEffect);
        }
        if (e.isBurning) {
          e.burnTimer += delta; e.health -= delta * 15;
          if (e.burningEffect) e.burningEffect.position.copy(e.pos);
          if (e.health <= 0 || e.burnTimer > 5) {
            this.scene.remove(e.group); if (e.burningEffect) this.scene.remove(e.burningEffect);
            this.enemies.splice(i, 1); continue;
          }
        }
        e.growlTimer -= delta;
        if (e.growlTimer <= 0) { sounds.playZombieGrowl(); e.growlTimer = 3 + Math.random() * 5; }
        e.attackCooldown -= delta;
        if (dp < 1.5 && e.attackCooldown <= 0 && !e.isBurning) {
          const eDmg = this.config.difficulty === 'hard' ? 20 : 10;
          this.health -= eDmg; this.hurtFlashTimer = 0.3;
          sounds.playHit(); e.attackCooldown = 1.5;
          this.onAlert("💥 Hit! -" + eDmg + " HP"); this.onUpdateHUD();
          if (this.health <= 0) { this.onAlert("💀 You have fallen..."); this.isRunning = false; this.onUpdateHUD(); }
        }
        if (dp < 25 && !e.isBurning && dp > 1.0) {
          this._dir.copy(this.playerPos).sub(e.pos).normalize();
          e.pos.addScaledVector(this._dir, e.speed * delta);
          e.pos.y = this.ground.getHeightAt(e.pos.x, e.pos.z);
          e.group.position.copy(e.pos);
          e.group.lookAt(this.playerPos);
          if (e.rig) {
            const cycle = Math.sin(this.animationTime * 8);
            e.rig.leftLeg.rotation.x = cycle * 0.6;
            e.rig.rightLeg.rotation.x = -cycle * 0.6;
            e.rig.leftArm.rotation.x = -0.8 + cycle * 0.2;
            e.rig.rightArm.rotation.x = -0.8 - cycle * 0.2;
          }
        }
      }
    }

    // Animals — throttle on mobile
    if (!this.isMobile || this.frameCount % 3 === 0) {
      for (let i = 0; i < this.animals.length; i++) {
        const a = this.animals[i];
        a.timer -= delta * (this.isMobile ? 3 : 1); // compensate for skipped frames
        const dp = a.pos.distanceTo(this.playerPos);
        if (a.animalType === 'wolf' && dp < 15 && this.config.difficulty !== 'peaceful') a.state = 'chase';
        if (a.state === 'chase') {
          this._dir.copy(this.playerPos).sub(a.pos).normalize();
          a.pos.addScaledVector(this._dir, 4 * delta * (this.isMobile ? 3 : 1));
          a.rig.group.rotation.y = Math.atan2(this._dir.x, this._dir.z);
          if (dp < 1.5 && a.timer <= 0) {
            this.health -= 8; a.timer = 1.5; sounds.playHit();
            this.onAlert("🐺 Wolf attack! -8 HP"); this.onUpdateHUD();
          }
          if (dp > 25) a.state = 'graze';
        } else if (a.state === 'flee') {
          this._dir.copy(a.pos).sub(this.playerPos).normalize();
          const fs = a.animalType === 'rabbit' ? 10 : 6;
          a.pos.addScaledVector(this._dir, fs * delta * (this.isMobile ? 3 : 1));
          a.rig.group.rotation.y = Math.atan2(this._dir.x, this._dir.z);
          if (dp > 30) a.state = 'graze';
        } else {
          if (a.timer <= 0) {
            a.vel.set((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2);
            a.timer = 2 + Math.random() * 5;
          }
          if (a.vel.lengthSq() > 0) a.rig.group.rotation.y = Math.atan2(a.vel.x, a.vel.z);
          a.pos.addScaledVector(a.vel, delta * (this.isMobile ? 3 : 1));
          if (dp < 5 && a.animalType !== 'wolf') a.state = 'flee';
        }
        a.pos.y = this.ground.getHeightAt(a.pos.x, a.pos.z);
        a.rig.group.position.copy(a.pos);
        const isAnMoving = a.vel.lengthSq() > 0.1 || a.state !== 'graze';
        if (isAnMoving) {
          const c = Math.sin(this.animationTime * 12);
          a.rig.frontLeftLeg.rotation.x = c * 0.5;
          a.rig.frontRightLeg.rotation.x = -c * 0.5;
          a.rig.backLeftLeg.rotation.x = -c * 0.5;
          a.rig.backRightLeg.rotation.x = c * 0.5;
        } else {
          a.rig.frontLeftLeg.rotation.x = 0; a.rig.frontRightLeg.rotation.x = 0;
          a.rig.backLeftLeg.rotation.x = 0; a.rig.backRightLeg.rotation.x = 0;
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
  };

  public setConfigParameters(c: Partial<GameConfig>) { this.config = { ...this.config, ...c }; }

  public respawn() {
    this.health = 100; this.hunger = 100; this.stamina = 100;
    this.playerPos.set(0, this.ground.getHeightAt(0, 0), 0);
    this.timeOfDay = 0.3;
    this.enemies.forEach(e => { this.scene.remove(e.group); if (e.burningEffect) this.scene.remove(e.burningEffect); });
    this.enemies = [];
    this.onAlert("✨ Respawned!"); this.onUpdateHUD(); this.start();
  }
}
