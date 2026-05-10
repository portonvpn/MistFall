import * as THREE from 'three';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, onDisconnect, remove, push, onChildAdded, off, get } from 'firebase/database';
import { createPlayerModel, PlayerRig } from './ProceduralModels';

const firebaseConfig = {
  apiKey: "AIzaSyBvMNF-GzCsgBcuExLMTKYA8Wr-Dvi2nr8",
  authDomain: "mistfall-bbb92.firebaseapp.com",
  databaseURL: "https://mistfall-bbb92-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "mistfall-bbb92",
  storageBucket: "mistfall-bbb92.firebasestorage.app",
  messagingSenderId: "230773545681",
  appId: "1:230773545681:web:aa13d7bcd4f446ea38c3f0"
};

interface PlayerState {
  id: string; name: string; x: number; y: number; z: number;
  rot: number; tool: string; isAttacking: boolean; health: number; timestamp: number;
  skinHat?: number; skinBody?: number; skinPants?: number;
}

export interface SkinColors { hat: number; body: number; pants: number; }

interface SavedSession {
  x: number; y: number; z: number;
  health: number; hunger: number; stamina: number;
  timeOfDay: number; inventory: Record<string, unknown>; timestamp: number;
}

interface WorldEvent {
  type: 'treeBreak' | 'rockBreak' | 'placeStructure';
  itemId: string; structureType?: string;
  x?: number; y?: number; z?: number;
  playerId: string; timestamp: number;
}

export interface ChatMessage {
  id: string; sender: string; text: string; timestamp: number;
}

function nameToId(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash |= 0;
  }
  return 'p_' + Math.abs(hash).toString(36);
}

export class MultiplayerManager {
  private db: ReturnType<typeof getDatabase> | null = null;
  private scene: THREE.Scene;
  private myId: string;
  private _myName: string;
  // PUBLIC so GameEngine can access for PvP
  public peers: Map<string, { state: PlayerState; rig: PlayerRig; lastUpdate: number }> = new Map();
  private nameSprites: Map<string, THREE.Sprite> = new Map();
  private onTreeBreak: ((id: string) => void) | null = null;
  private onRockBreak: ((id: string) => void) | null = null;
  private onPlaceItem: ((type: string, pos: THREE.Vector3) => void) | null = null;
  public onChatMessage: ((msg: ChatMessage) => void) | null = null;
  public onTimeSync: ((time: number) => void) | null = null;
  public onSessionLoaded: ((session: SavedSession) => void) | null = null;
  public onPlayerHit: ((attackerId: string, dmg: number) => void) | null = null;
  public skinColors: SkinColors = { hat: 0xd9534f, body: 0x3d5a40, pants: 0x2b2b2b };
  public connected = false;
  public peerCount = 0;
  public connectionError: string | null = null;
  private saveTimer = 0;
  // Track which IDs exist in Firebase to properly detect removals
  private knownPlayerIds: Set<string> = new Set();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this._myName = 'Survivor';
    this.myId = nameToId(this._myName);
  }

  public setCallbacks(opts: {
    onTreeBreak?: (id: string) => void;
    onRockBreak?: (id: string) => void;
    onPlaceItem?: (type: string, pos: THREE.Vector3) => void;
  }) {
    this.onTreeBreak = opts.onTreeBreak || null;
    this.onRockBreak = opts.onRockBreak || null;
    this.onPlaceItem = opts.onPlaceItem || null;
  }

  public async connect() {
    if (this.connected) return;
    try {
      this.myId = nameToId(this._myName);
      const appName = 'mistfall-mp-' + this.myId;
      let app;
      try { app = initializeApp(firebaseConfig, appName); }
      catch { const { getApp } = await import('firebase/app'); app = getApp(appName); }
      this.db = getDatabase(app);

      // Restore saved session
      const sessionRef = ref(this.db, `sessions/${this.myId}`);
      const sessionSnap = await get(sessionRef);
      if (sessionSnap.exists()) {
        const saved = sessionSnap.val() as SavedSession;
        if (Date.now() - saved.timestamp < 86400000 && this.onSessionLoaded) {
          this.onSessionLoaded(saved);
        }
      }

      // Register self
      const myRef = ref(this.db, `players/${this.myId}`);
      await set(myRef, {
        id: this.myId, name: this._myName,
        x: 0, y: 0, z: 0, rot: 0, tool: 'none',
        isAttacking: false, health: 100, timestamp: Date.now()
      });
      onDisconnect(myRef).remove();

      // USE ONLY onValue for players — it gives full snapshot each time
      // This is the ONLY listener. No onChildAdded/onChildRemoved.
      // This way we always have the authoritative list from Firebase.
      const playersRef = ref(this.db, 'players');
      onValue(playersRef, (snapshot) => {
        const data = snapshot.val() || {};
        const currentIds = new Set<string>();
        let count = 0;

        // Add/update peers that exist in Firebase
        Object.keys(data).forEach(id => {
          if (id === this.myId) return;
          currentIds.add(id);
          count++;
          const playerData = data[id] as PlayerState;

          // Check if stale (timestamp > 10s old) — force remove from Firebase too
          if (Date.now() - playerData.timestamp > 12000) {
            // This player's data is stale, remove from Firebase
            remove(ref(this.db!, `players/${id}`));
            return;
          }

          const existing = this.peers.get(id);
          if (existing) {
            existing.state = playerData;
            existing.lastUpdate = Date.now();
          } else {
            this.addPeer(playerData);
          }
        });

        // Remove peers that are NO LONGER in Firebase
        const toRemove: string[] = [];
        for (const id of this.peers.keys()) {
          if (!currentIds.has(id)) toRemove.push(id);
        }
        for (const id of toRemove) this.removePeer(id);

        this.knownPlayerIds = currentIds;
        this.peerCount = count;
      });

      // World events
      const eventsRef = ref(this.db, 'events');
      onChildAdded(eventsRef, (snapshot) => {
        const event = snapshot.val() as WorldEvent;
        if (event && event.playerId !== this.myId) this.handleWorldEvent(event);
        if (event && Date.now() - event.timestamp > 5000) remove(snapshot.ref);
      });

      // Sync broken items
      const brokenRef = ref(this.db, 'brokenItems');
      const brokenSnapshot = await get(brokenRef);
      if (brokenSnapshot.exists()) {
        const broken = brokenSnapshot.val();
        Object.keys(broken).forEach(itemId => {
          if (this.onTreeBreak && itemId.startsWith('tree')) this.onTreeBreak(itemId);
          if (this.onRockBreak && itemId.startsWith('rock')) this.onRockBreak(itemId);
        });
      }

      // Chat
      const chatRef = ref(this.db, 'chat');
      onChildAdded(chatRef, (snapshot) => {
        const msg = snapshot.val() as ChatMessage;
        if (msg && this.onChatMessage) this.onChatMessage(msg);
        if (msg && Date.now() - msg.timestamp > 60000) remove(snapshot.ref);
      });

      // Time sync
      const timeRef = ref(this.db, 'worldTime');
      onValue(timeRef, (snapshot) => {
        const val = snapshot.val();
        if (val && val.hostId !== this.myId && this.onTimeSync) this.onTimeSync(val.time);
      });

      // PvP attacks
      const pvpRef = ref(this.db, 'pvp');
      onChildAdded(pvpRef, (snapshot) => {
        const attack = snapshot.val();
        if (!attack) return;
        // Only process recent attacks aimed at me
        if (attack.targetId === this.myId && Date.now() - attack.timestamp < 3000) {
          if (this.onPlayerHit) this.onPlayerHit(attack.attackerId, attack.dmg || 10);
        }
        // Clean old
        if (Date.now() - attack.timestamp > 5000) remove(snapshot.ref);
      });

      this.connected = true;
      this.connectionError = null;
    } catch (error) {
      console.error('Multiplayer connection error:', error);
      this.connectionError = (error as Error).message;
      this.connected = false;
    }
  }

  public saveSession(state: { x: number; y: number; z: number; health: number; hunger: number; stamina: number; timeOfDay: number; inventory: Record<string, unknown> }) {
    if (!this.connected || !this.db) return;
    set(ref(this.db, `sessions/${this.myId}`), { ...state, timestamp: Date.now() });
  }

  private handleWorldEvent(event: WorldEvent) {
    if (event.type === 'treeBreak' && this.onTreeBreak) this.onTreeBreak(event.itemId);
    if (event.type === 'rockBreak' && this.onRockBreak) this.onRockBreak(event.itemId);
    if (event.type === 'placeStructure' && this.onPlaceItem && event.x !== undefined) {
      this.onPlaceItem(event.structureType || 'campfire', new THREE.Vector3(event.x, event.y, event.z));
    }
  }

  private addPeer(data: PlayerState) {
    if (this.peers.has(data.id)) return;
    const rig = createPlayerModel();
    const hatColor = data.skinHat || 0xd9534f;
    const bodyColor = data.skinBody || 0x3d5a40;
    const pantsColor = data.skinPants || 0x2b2b2b;
    rig.group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshLambertMaterial) {
        const m = child.material.clone();
        const hex = m.color.getHex();
        if (hex === 0xd9534f) m.color.setHex(hatColor);
        else if (hex === 0x3d5a40 || hex === 0x2d4030) m.color.setHex(bodyColor);
        else if (hex === 0x2b2b2b) m.color.setHex(pantsColor);
        child.material = m;
      }
    });
    rig.group.position.set(data.x, data.y, data.z);
    this.scene.add(rig.group);
    // Name tag
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath(); ctx.roundRect(8, 8, 240, 48, 12); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(data.name.slice(0, 15), 128, 32);
    const texture = new THREE.CanvasTexture(canvas); texture.needsUpdate = true;
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.9 });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(2.5, 0.625, 1); sprite.position.y = 2.8;
    rig.group.add(sprite);
    this.nameSprites.set(data.id, sprite);
    this.peers.set(data.id, { state: data, rig, lastUpdate: Date.now() });
    this.peerCount = this.peers.size;
  }

  private removePeer(id: string) {
    const peer = this.peers.get(id);
    if (peer) {
      // Dispose all geometries/materials
      peer.rig.group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
            else child.material.dispose();
          }
        }
      });
      this.scene.remove(peer.rig.group);
      const sprite = this.nameSprites.get(id);
      if (sprite) { sprite.material.map?.dispose(); sprite.material.dispose(); }
      this.peers.delete(id);
      this.nameSprites.delete(id);
      this.peerCount = this.peers.size;
    }
  }

  public sendState(pos: THREE.Vector3, rot: number, health: number, tool: string, isAttacking: boolean) {
    if (!this.connected || !this.db) return;
    set(ref(this.db, `players/${this.myId}`), {
      id: this.myId, name: this._myName,
      x: Math.round(pos.x * 100) / 100, y: Math.round(pos.y * 100) / 100,
      z: Math.round(pos.z * 100) / 100, rot: Math.round(rot * 100) / 100,
      tool, isAttacking, health, timestamp: Date.now(),
      skinHat: this.skinColors.hat, skinBody: this.skinColors.body, skinPants: this.skinColors.pants,
    });
  }

  public sendAttack(targetId: string, dmg: number) {
    if (!this.connected || !this.db) return;
    push(ref(this.db, 'pvp'), { attackerId: this.myId, targetId, dmg, timestamp: Date.now() });
  }

  public sendTimeSync(time: number) {
    if (!this.connected || !this.db) return;
    set(ref(this.db, 'worldTime'), { time, hostId: this.myId, timestamp: Date.now() });
  }
  public sendChatMessage(text: string) {
    if (!this.connected || !this.db) return;
    push(ref(this.db, 'chat'), { id: this.myId, sender: this._myName, text, timestamp: Date.now() });
  }
  public sendTreeBreak(itemId: string) {
    if (!this.connected || !this.db) return;
    set(ref(this.db, `brokenItems/${itemId}`), { timestamp: Date.now() });
    push(ref(this.db, 'events'), { type: 'treeBreak', itemId, playerId: this.myId, timestamp: Date.now() });
  }
  public sendRockBreak(itemId: string) {
    if (!this.connected || !this.db) return;
    set(ref(this.db, `brokenItems/${itemId}`), { timestamp: Date.now() });
    push(ref(this.db, 'events'), { type: 'rockBreak', itemId, playerId: this.myId, timestamp: Date.now() });
  }
  public sendPlaceItem(type: string, pos: THREE.Vector3) {
    if (!this.connected || !this.db) return;
    push(ref(this.db, 'events'), {
      type: 'placeStructure', itemId: `structure_${Date.now()}`,
      structureType: type, x: pos.x, y: pos.y, z: pos.z,
      playerId: this.myId, timestamp: Date.now()
    });
  }

  // Admin: wipe entire server
  public async resetServer() {
    if (!this.db) return;
    await set(ref(this.db, 'brokenItems'), null);
    await set(ref(this.db, 'events'), null);
    await set(ref(this.db, 'chat'), null);
    await set(ref(this.db, 'pvp'), null);
    await set(ref(this.db, 'sessions'), null);
    await set(ref(this.db, 'worldTime'), null);
    // Remove all players except self
    const snap = await get(ref(this.db, 'players'));
    if (snap.exists()) {
      const all = snap.val();
      for (const id of Object.keys(all)) {
        if (id !== this.myId) await remove(ref(this.db, `players/${id}`));
      }
    }
  }

  // Admin: kick a specific player
  public async kickPlayer(id: string) {
    if (!this.db) return;
    await remove(ref(this.db, `players/${id}`));
    this.removePeer(id);
  }

  public update(delta: number, animTime: number) {
    this.saveTimer += delta;
    for (const [, peer] of this.peers) {
      const s = peer.state;
      const targetPos = new THREE.Vector3(s.x, s.y, s.z);
      peer.rig.group.position.lerp(targetPos, 0.12);
      let angleDiff = s.rot - peer.rig.group.rotation.y;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      peer.rig.group.rotation.y += angleDiff * 0.1;
      const isMoving = peer.rig.group.position.distanceTo(targetPos) > 0.1;
      if (s.isAttacking) {
        const phase = Math.sin(animTime * 25);
        peer.rig.rightArm.rotation.x = phase * 1.8;
        peer.rig.leftArm.rotation.x = -phase * 0.4;
      } else if (isMoving) {
        const cycle = Math.sin(animTime * 14);
        peer.rig.leftArm.rotation.x = cycle * 0.7;
        peer.rig.rightArm.rotation.x = -cycle * 0.7;
        peer.rig.leftLeg.rotation.x = -cycle * 0.8;
        peer.rig.rightLeg.rotation.x = cycle * 0.8;
      } else {
        peer.rig.leftArm.rotation.x = Math.sin(animTime * 2) * 0.04;
        peer.rig.rightArm.rotation.x = -Math.sin(animTime * 2) * 0.04;
        peer.rig.leftLeg.rotation.x = 0;
        peer.rig.rightLeg.rotation.x = 0;
      }
    }
  }

  public get shouldSave() { return this.saveTimer >= 10; }
  public resetSaveTimer() { this.saveTimer = 0; }

  public disconnect() {
    if (!this.db) return;
    remove(ref(this.db, `players/${this.myId}`));
    off(ref(this.db, 'players'));
    off(ref(this.db, 'events'));
    off(ref(this.db, 'chat'));
    off(ref(this.db, 'pvp'));
    off(ref(this.db, 'worldTime'));
    const peerIds = Array.from(this.peers.keys());
    for (const id of peerIds) this.removePeer(id);
    this.connected = false; this.db = null;
  }

  public get playerName() { return this._myName; }
  public set playerName(n: string) { this._myName = n; this.myId = nameToId(n); }
  public get playerId() { return this.myId; }
  public get room() { return 'Mistfall World'; }
  public getPeerList(): { id: string; name: string }[] {
    const list: { id: string; name: string }[] = [];
    for (const [id, peer] of this.peers) list.push({ id, name: peer.state.name });
    return list;
  }
}
