import * as THREE from 'three';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, onDisconnect, remove, push, onChildAdded, onChildRemoved, off, get } from 'firebase/database';
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

export class MultiplayerManager {
  private db: ReturnType<typeof getDatabase> | null = null;
  private scene: THREE.Scene;
  private myId: string;
  private _myName: string;
  private peers: Map<string, { state: PlayerState; rig: PlayerRig; lastUpdate: number }> = new Map();
  private nameSprites: Map<string, THREE.Sprite> = new Map();
  private onTreeBreak: ((id: string) => void) | null = null;
  private onRockBreak: ((id: string) => void) | null = null;
  private onPlaceItem: ((type: string, pos: THREE.Vector3) => void) | null = null;
  public onChatMessage: ((msg: ChatMessage) => void) | null = null;
  public onTimeSync: ((time: number) => void) | null = null;
  public connected = false;
  public peerCount = 0;
  public connectionError: string | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.myId = 'player_' + Math.random().toString(36).substr(2, 9);
    this._myName = 'Survivor_' + Math.floor(Math.random() * 9999);
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
    try {
      const app = initializeApp(firebaseConfig, 'mistfall-mp-' + this.myId);
      this.db = getDatabase(app);
      const myRef = ref(this.db, `players/${this.myId}`);
      await set(myRef, {
        id: this.myId, name: this._myName,
        x: 0, y: 0, z: 0, rot: 0, tool: 'none',
        isAttacking: false, health: 100, timestamp: Date.now()
      });
      onDisconnect(myRef).remove();
      const playersRef = ref(this.db, 'players');
      onChildAdded(playersRef, (snapshot) => {
        const data = snapshot.val() as PlayerState;
        if (data && data.id !== this.myId) this.addPeer(data);
      });
      onChildRemoved(playersRef, (snapshot) => {
        const data = snapshot.val() as PlayerState;
        if (data && data.id !== this.myId) this.removePeer(data.id);
      });
      onValue(playersRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;
        let count = 0;
        Object.keys(data).forEach(id => {
          if (id !== this.myId) {
            count++;
            const playerData = data[id] as PlayerState;
            const peer = this.peers.get(id);
            if (peer) { peer.state = playerData; peer.lastUpdate = Date.now(); }
            else this.addPeer(playerData);
          }
        });
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

      // Chat messages
      const chatRef = ref(this.db, 'chat');
      onChildAdded(chatRef, (snapshot) => {
        const msg = snapshot.val() as ChatMessage;
        if (msg && this.onChatMessage) this.onChatMessage(msg);
        // Clean old messages
        if (msg && Date.now() - msg.timestamp > 60000) remove(snapshot.ref);
      });

      // Day/night sync - host publishes, others read
      const timeRef = ref(this.db, 'worldTime');
      onValue(timeRef, (snapshot) => {
        const val = snapshot.val();
        if (val && val.hostId !== this.myId && this.onTimeSync) {
          this.onTimeSync(val.time);
        }
      });

      this.connected = true;
      this.connectionError = null;
    } catch (error) {
      console.error('Multiplayer connection error:', error);
      this.connectionError = (error as Error).message;
      this.connected = false;
    }
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
    const colors = [0x5a3d40, 0x3d405a, 0x5a5a3d, 0x3d5a5a, 0x5a3d5a, 0x4a5a3d];
    const colorIdx = parseInt(data.id.replace(/\D/g, '').slice(0, 2) || '0') % colors.length;
    rig.group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshLambertMaterial) {
        const m = child.material.clone();
        m.color.lerp(new THREE.Color(colors[colorIdx]), 0.4);
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
      this.scene.remove(peer.rig.group);
      this.peers.delete(id);
      this.nameSprites.delete(id);
      this.peerCount = this.peers.size;
    }
  }

  public sendState(pos: THREE.Vector3, rot: number, health: number, tool: string, isAttacking: boolean) {
    if (!this.connected || !this.db) return;
    const myRef = ref(this.db, `players/${this.myId}`);
    set(myRef, {
      id: this.myId, name: this._myName,
      x: Math.round(pos.x * 100) / 100, y: Math.round(pos.y * 100) / 100,
      z: Math.round(pos.z * 100) / 100, rot: Math.round(rot * 100) / 100,
      tool, isAttacking, health, timestamp: Date.now()
    });
  }

  public sendTimeSync(time: number) {
    if (!this.connected || !this.db) return;
    const timeRef = ref(this.db, 'worldTime');
    set(timeRef, { time, hostId: this.myId, timestamp: Date.now() });
  }

  public sendChatMessage(text: string) {
    if (!this.connected || !this.db) return;
    const chatRef = ref(this.db, 'chat');
    push(chatRef, { id: this.myId, sender: this._myName, text, timestamp: Date.now() });
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

  public update(_delta: number, animTime: number) {
    for (const [id, peer] of this.peers) {
      if (Date.now() - peer.lastUpdate > 15000) { this.removePeer(id); continue; }
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

  public disconnect() {
    if (!this.db) return;
    remove(ref(this.db, `players/${this.myId}`));
    off(ref(this.db, 'players'));
    off(ref(this.db, 'events'));
    off(ref(this.db, 'chat'));
    for (const [id] of this.peers) this.removePeer(id);
    this.connected = false; this.db = null;
  }

  public get playerName() { return this._myName; }
  public set playerName(n: string) { this._myName = n; }
  public get playerId() { return this.myId; }
  public get room() { return 'Mistfall World'; }
}
