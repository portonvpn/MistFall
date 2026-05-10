import * as THREE from 'three';

interface Particle {
  mesh: THREE.Object3D;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  gravity: number;
  shrink: boolean;
  fadeOut: boolean;
}

export class ParticleEffects {
  private scene: THREE.Scene;
  private particles: Particle[] = [];
  private pool: Map<string, THREE.Mesh[]> = new Map();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public getPooledMesh(type: string, geo: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh {
    let arr = this.pool.get(type);
    if (!arr) { arr = []; this.pool.set(type, arr); }
    let mesh = arr.pop();
    if (!mesh) { mesh = new THREE.Mesh(geo, mat); }
    mesh.visible = true;
    mesh.scale.set(1, 1, 1);
    return mesh;
  }

  public returnToPool(type: string, mesh: THREE.Mesh) {
    mesh.visible = false;
    this.scene.remove(mesh);
    let arr = this.pool.get(type);
    if (!arr) { arr = []; this.pool.set(type, arr); }
    if (arr.length < 50) arr.push(mesh);
  }

  public spawnBlood(pos: THREE.Vector3, count: number = 8) {
    const geo = new THREE.SphereGeometry(0.04, 4, 3);
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.3 ? 0xcc0000 : 0x880000,
        transparent: true, opacity: 0.9
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos).add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.3, 0.5 + Math.random() * 0.5, (Math.random() - 0.5) * 0.3
      ));
      this.scene.add(mesh);
      this.particles.push({
        mesh, vel: new THREE.Vector3(
          (Math.random() - 0.5) * 4, 2 + Math.random() * 3, (Math.random() - 0.5) * 4
        ), life: 0.5 + Math.random() * 0.5, maxLife: 1.0, gravity: 12, shrink: true, fadeOut: true
      });
    }
  }

  public spawnHitSparks(pos: THREE.Vector3, count: number = 6) {
    const geo = new THREE.BoxGeometry(0.03, 0.03, 0.03);
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.5 ? 0xffcc66 : 0xffffff,
        transparent: true, opacity: 1
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos).add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.2, 0.3 + Math.random() * 0.3, (Math.random() - 0.5) * 0.2
      ));
      this.scene.add(mesh);
      this.particles.push({
        mesh, vel: new THREE.Vector3(
          (Math.random() - 0.5) * 5, 2 + Math.random() * 4, (Math.random() - 0.5) * 5
        ), life: 0.3 + Math.random() * 0.3, maxLife: 0.6, gravity: 15, shrink: true, fadeOut: true
      });
    }
  }

  public spawnWoodChips(pos: THREE.Vector3, count: number = 6) {
    const geo = new THREE.BoxGeometry(0.08, 0.03, 0.05);
    const colors = [0x8b6914, 0x5c4033, 0xa0753a, 0x6b4e23];
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        transparent: true, opacity: 1
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos).add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.3, Math.random() * 0.3, (Math.random() - 0.5) * 0.3
      ));
      this.scene.add(mesh);
      this.particles.push({
        mesh, vel: new THREE.Vector3(
          (Math.random() - 0.5) * 3, 1.5 + Math.random() * 2, (Math.random() - 0.5) * 3
        ), life: 0.4 + Math.random() * 0.4, maxLife: 0.8, gravity: 10, shrink: false, fadeOut: true
      });
    }
  }

  public spawnBlockBreak(pos: THREE.Vector3, color: number, count: number = 10) {
    const geo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos).add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.5, Math.random() * 0.5, (Math.random() - 0.5) * 0.5
      ));
      this.scene.add(mesh);
      this.particles.push({
        mesh, vel: new THREE.Vector3(
          (Math.random() - 0.5) * 5, 2 + Math.random() * 4, (Math.random() - 0.5) * 5
        ), life: 0.6 + Math.random() * 0.4, maxLife: 1.0, gravity: 12, shrink: true, fadeOut: true
      });
    }
  }

  public spawnSparkle(pos: THREE.Vector3, color: number, count: number = 8) {
    const geo = new THREE.SphereGeometry(0.03, 4, 3);
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos).add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.3, Math.random() * 0.5, (Math.random() - 0.5) * 0.3
      ));
      this.scene.add(mesh);
      this.particles.push({
        mesh, vel: new THREE.Vector3(
          (Math.random() - 0.5) * 2, 1 + Math.random() * 2, (Math.random() - 0.5) * 2
        ), life: 0.5 + Math.random() * 0.5, maxLife: 1.0, gravity: 3, shrink: true, fadeOut: true
      });
    }
  }

  public update(delta: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }
      p.vel.y -= p.gravity * delta;
      p.mesh.position.addScaledVector(p.vel, delta);
      if (p.mesh.position.y < 0) {
        p.mesh.position.y = 0;
        p.vel.y *= -0.3;
        p.vel.x *= 0.7;
        p.vel.z *= 0.7;
      }
      const lifeRatio = p.life / p.maxLife;
      if (p.shrink) p.mesh.scale.setScalar(lifeRatio);
      if (p.fadeOut && (p.mesh as THREE.Mesh).material) {
        const mat = (p.mesh as THREE.Mesh).material as THREE.MeshBasicMaterial;
        if (mat.opacity !== undefined) mat.opacity = lifeRatio * 0.9;
      }
      p.mesh.rotation.x += delta * 3;
      p.mesh.rotation.z += delta * 2;
    }
  }

  public get activeCount() { return this.particles.length; }
}
