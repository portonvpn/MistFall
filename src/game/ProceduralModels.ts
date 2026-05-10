import * as THREE from 'three';

const M = (color: number, basic = false) =>
  basic
    ? new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 })
    : new THREE.MeshLambertMaterial({ color, flatShading: true });

const sm = {
  skin: M(0xffcca6), beanie: M(0xd9534f), jacket: M(0x3d5a40), jacketDark: M(0x2d4030),
  pants: M(0x2b2b2b), boots: M(0x4a3525), pack: M(0x8b5a2b), belt: M(0x3a2a1a),
  wood: M(0x5c4033), woodLight: M(0x8b6914), woodDark: M(0x3a2a1a),
  leaves: M(0x2d4a22), leavesLight: M(0x4a7c3f), leavesDark: M(0x1a3318),
  pineLeaves: M(0x1b381a), autumnLeaves: M(0xcc6622), cherryLeaves: M(0xff88aa),
  stone: M(0x737577), darkStone: M(0x4f5254), mossyStone: M(0x4a6a4a),
  iron: M(0xd1d5db), gold: M(0xffd700), crystal: M(0x66ccff),
  deerFur: M(0xa0653c), deerWhite: M(0xeaeaea),
  rabbitFur: M(0xc9b896), rabbitPink: M(0xffaaaa),
  foxFur: M(0xdd6622), foxWhite: M(0xf0e8dd), foxTail: M(0xeeeeee),
  wolfFur: M(0x555566), wolfDark: M(0x333340),
  bearFur: M(0x553322), bearDark: M(0x331a10),
  boarFur: M(0x5a3a2a), boarTusk: M(0xeeeecc),
  owlBrown: M(0x7a5533), owlWhite: M(0xf0e8d0), owlEye: M(0xffcc00, true),
  zombieSkin: M(0x557a55), zombieShirt: M(0x334e68),
  skelBone: M(0xe8e0cc), skelEye: M(0xff2200, true),
  witchRobe: M(0x2a0a3a), witchSkin: M(0x88aa88), witchHat: M(0x1a0a2a),
  spiderBody: M(0x1a1515),
  glowGreen: M(0x39ff14, true), glowRed: M(0xff073a, true),
  fireInner: M(0xff9900, true),
  fireOuter: new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.8 }),
  meatRaw: M(0xcc3333), meatCooked: M(0x8b4513),
  carrotOrange: M(0xff7f27), carrotGreen: M(0x2d5016),
  berryRed: M(0xcc2244), berryBlue: M(0x4466cc),
  mushroomCap: M(0xcc4422), mushroomCapBlue: M(0x3366aa), mushroomStem: M(0xf0e8cc),
  flowerPink: M(0xff69b4), flowerYellow: M(0xffd700), flowerWhite: M(0xffffff), flowerBlue: M(0x6495ed),
  flowerStem: M(0x228b22),
  burning: new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.8 }),
  eye: new THREE.MeshBasicMaterial({ color: 0x111111 }),
  swordBlade: M(0xccccdd), swordGuard: M(0x886622),
};

export interface PlayerRig {
  group: THREE.Group; leftArm: THREE.Group; rightArm: THREE.Group;
  leftLeg: THREE.Group; rightLeg: THREE.Group; head: THREE.Group; toolSlot: THREE.Group;
}

export function createPlayerModel(): PlayerRig {
  const group = new THREE.Group();
  group.name = "PlayerCharacter";
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.95, 0.38), sm.jacket);
  torso.position.y = 1.15; torso.castShadow = true; group.add(torso);
  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.12, 0.4), sm.jacketDark);
  collar.position.y = 1.62; group.add(collar);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.06, 0.42), sm.belt);
  belt.position.y = 0.72; group.add(belt);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.65, 0.22), sm.pack);
  pack.position.set(0, 1.15, -0.28); pack.castShadow = true; group.add(pack);
  const strap1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.02), sm.belt);
  strap1.position.set(0.15, 1.2, -0.1); group.add(strap1);
  const strap2 = strap1.clone(); strap2.position.x = -0.15; group.add(strap2);
  const headGroup = new THREE.Group(); headGroup.position.set(0, 1.68, 0);
  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.48), sm.skin);
  headMesh.position.y = 0.24; headMesh.castShadow = true; headGroup.add(headMesh);
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.5), M(0x4a3520));
  hair.position.set(0, 0.42, 0); headGroup.add(hair);
  const beanie = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.3, 0.22, 6), sm.beanie);
  beanie.position.set(0, 0.58, 0); headGroup.add(beanie);
  const pom = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), M(0xffffff));
  pom.position.set(0, 0.72, 0); headGroup.add(pom);
  const eyeGeo = new THREE.BoxGeometry(0.05, 0.06, 0.05);
  [-1, 1].forEach(s => {
    const eye = new THREE.Mesh(eyeGeo, sm.eye);
    eye.position.set(s * 0.11, 0.28, 0.25); headGroup.add(eye);
    const shine = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.02), M(0xffffff, true));
    shine.position.set(s * 0.11 + 0.015, 0.3, 0.27); headGroup.add(shine);
  });
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.02), M(0xcc8877));
  mouth.position.set(0, 0.17, 0.25); headGroup.add(mouth);
  group.add(headGroup);
  const armGeo = new THREE.BoxGeometry(0.2, 0.65, 0.2); armGeo.translate(0, -0.32, 0);
  const handGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
  const leftArm = new THREE.Group(); leftArm.position.set(0.45, 1.55, 0);
  leftArm.add(new THREE.Mesh(armGeo, sm.jacket));
  const lHand = new THREE.Mesh(handGeo, sm.skin); lHand.position.set(0, -0.72, 0); leftArm.add(lHand);
  group.add(leftArm);
  const rightArm = new THREE.Group(); rightArm.position.set(-0.45, 1.55, 0);
  rightArm.add(new THREE.Mesh(armGeo, sm.jacket));
  const rHand = new THREE.Mesh(handGeo, sm.skin); rHand.position.set(0, -0.72, 0); rightArm.add(rHand);
  group.add(rightArm);
  const toolSlot = new THREE.Group(); toolSlot.position.set(0, -0.7, 0); rightArm.add(toolSlot);
  const legGeo = new THREE.BoxGeometry(0.24, 0.65, 0.24); legGeo.translate(0, -0.32, 0);
  const bootGeo = new THREE.BoxGeometry(0.28, 0.18, 0.34);
  const leftLeg = new THREE.Group(); leftLeg.position.set(0.18, 0.7, 0);
  leftLeg.add(new THREE.Mesh(legGeo, sm.pants));
  const lb = new THREE.Mesh(bootGeo, sm.boots); lb.position.set(0, -0.62, 0.03); leftLeg.add(lb);
  group.add(leftLeg);
  const rightLeg = new THREE.Group(); rightLeg.position.set(-0.18, 0.7, 0);
  rightLeg.add(new THREE.Mesh(legGeo, sm.pants));
  const rb = new THREE.Mesh(bootGeo, sm.boots); rb.position.set(0, -0.62, 0.03); rightLeg.add(rb);
  group.add(rightLeg);
  return { group, leftArm, rightArm, leftLeg, rightLeg, head: headGroup, toolSlot };
}

export function createAxeModel(): THREE.Group {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.85, 5), sm.wood);
  handle.position.y = 0.42; g.add(handle);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.35, 0.06), sm.iron);
  head.position.set(0.12, 0.78, 0); g.add(head);
  const blade = new THREE.BufferGeometry();
  blade.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0.26,0.58,0, 0.26,0.98,0, 0.38,0.78,0]), 3));
  blade.computeVertexNormals(); g.add(new THREE.Mesh(blade, sm.iron));
  g.rotation.x = Math.PI / 2; return g;
}

export function createPickaxeModel(): THREE.Group {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.85, 5), sm.wood).translateOnAxis(new THREE.Vector3(0,1,0), 0.42));
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.07, 0.65, 4), sm.iron);
  head.position.set(0, 0.78, 0); head.rotation.z = Math.PI / 2; g.add(head);
  g.rotation.x = Math.PI / 2; return g;
}

export function createSwordModel(): THREE.Group {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.3, 5), sm.wood);
  handle.position.y = 0.15; g.add(handle);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.08), sm.swordGuard);
  guard.position.y = 0.3; g.add(guard);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.02), sm.swordBlade);
  blade.position.y = 0.58; g.add(blade);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 4), sm.swordBlade);
  tip.position.y = 0.9; g.add(tip);
  g.rotation.x = Math.PI / 2; return g;
}

export function createWorkbenchModel(): THREE.Group {
  const b = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.15, 0.8), sm.woodLight);
  top.position.y = 0.9; top.castShadow = true; b.add(top);
  const grid = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.02, 0.7), M(0x6b4e23));
  grid.position.y = 0.98; b.add(grid);
  ([[-0.5,-0.3],[0.5,-0.3],[-0.5,0.3],[0.5,0.3]] as [number,number][]).forEach(([x,z]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), sm.wood);
    leg.position.set(x, 0.45, z); leg.castShadow = true; b.add(leg);
  });
  const saw = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.1), sm.iron);
  saw.position.set(0.3, 1.0, 0.15); saw.rotation.y = 0.3; b.add(saw);
  return b;
}

export function createStylizedTree(scale: number = 1, type: 'oak' | 'pine' | 'birch' | 'willow' | 'cherry' | 'dead' = 'oak'): THREE.Group {
  const t = new THREE.Group();
  if (type === 'pine') {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1*scale, 0.16*scale, 3.2*scale, 6), sm.wood);
    trunk.position.y = 1.6*scale; trunk.castShadow = true; t.add(trunk);
    for (let i = 0; i < 4; i++) {
      const r = 0.9 - i*0.2; const h = 0.7 + i*0.7;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r*scale, 1.2*scale, 7), sm.pineLeaves);
      cone.position.y = h*scale; cone.castShadow = true; t.add(cone);
    }
  } else if (type === 'birch') {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08*scale, 0.12*scale, 3.5*scale, 6), M(0xeeeeee));
    trunk.position.y = 1.75*scale; trunk.castShadow = true; t.add(trunk);
    for (let i = 0; i < 3; i++) {
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.13*scale, 0.13*scale, 0.08*scale, 6), M(0x333333));
      stripe.position.y = (0.8+i*0.9)*scale; t.add(stripe);
    }
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.2*scale, 6, 5), sm.leavesLight);
    canopy.position.y = 3.5*scale; canopy.castShadow = true; t.add(canopy);
  } else if (type === 'willow') {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12*scale, 0.2*scale, 2.5*scale, 6), sm.wood);
    trunk.position.y = 1.25*scale; trunk.castShadow = true; t.add(trunk);
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.5*scale, 6, 5), sm.leavesLight);
    canopy.position.y = 3.0*scale; canopy.castShadow = true; t.add(canopy);
    for (let i = 0; i < 8; i++) {
      const a = (i/8)*Math.PI*2;
      const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.02*scale, 0.01*scale, 2.0*scale, 3), sm.leavesLight);
      vine.position.set(Math.cos(a)*1.2*scale, 2.0*scale, Math.sin(a)*1.2*scale); t.add(vine);
    }
  } else if (type === 'cherry') {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1*scale, 0.15*scale, 2.8*scale, 6), sm.woodDark);
    trunk.position.y = 1.4*scale; trunk.castShadow = true; t.add(trunk);
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.4*scale, 6, 5), sm.cherryLeaves);
    canopy.position.y = 3.2*scale; canopy.castShadow = true; t.add(canopy);
    const c2 = new THREE.Mesh(new THREE.SphereGeometry(0.8*scale, 5, 4), sm.cherryLeaves);
    c2.position.set(0.6*scale, 2.8*scale, 0.3*scale); t.add(c2);
  } else if (type === 'dead') {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08*scale, 0.18*scale, 3.0*scale, 5), sm.woodDark);
    trunk.position.y = 1.5*scale; trunk.castShadow = true; t.add(trunk);
    for (let i = 0; i < 3; i++) {
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.02*scale, 0.04*scale, 1.0*scale, 4), sm.woodDark);
      branch.position.set(0, (1.5+i*0.6)*scale, 0);
      branch.rotation.z = (i%2===0?1:-1)*0.8; t.add(branch);
    }
  } else {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12*scale, 0.18*scale, 3.0*scale, 6), sm.wood);
    trunk.position.y = 1.5*scale; trunk.castShadow = true; t.add(trunk);
    const canopy = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6*scale, 1), sm.leaves);
    canopy.position.y = 3.5*scale; canopy.castShadow = true; t.add(canopy);
    const c2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.0*scale, 0), sm.leavesDark);
    c2.position.set(0.5*scale, 3.0*scale, 0.3*scale); t.add(c2);
    const c3 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7*scale, 0), sm.leavesLight);
    c3.position.set(-0.4*scale, 3.8*scale, -0.2*scale); t.add(c3);
  }
  return t;
}

export function createStylizedRock(scale: number = 1, isDark = false): THREE.Group {
  const r = new THREE.Group();
  const mat = isDark ? sm.darkStone : sm.stone;
  const main = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5*scale, 0), mat);
  main.castShadow = true; main.scale.set(1, 0.7, 1); r.add(main);
  if (Math.random() > 0.5) {
    const s2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22*scale, 0), sm.mossyStone);
    s2.position.set(0.35*scale, -0.1*scale, 0.2*scale); r.add(s2);
  }
  if (Math.random() > 0.5) {
    const moss = new THREE.Mesh(new THREE.SphereGeometry(0.2*scale, 4, 3), M(0x2a5a22));
    moss.position.set(0, 0.2*scale, 0.2*scale); moss.scale.set(1.5, 0.3, 1); r.add(moss);
  }
  return r;
}

export function createCampfireModel(): THREE.Group {
  const c = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const a = (i/8)*Math.PI*2;
    const stone = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.15), sm.darkStone);
    stone.position.set(Math.cos(a)*0.35, 0.06, Math.sin(a)*0.35);
    stone.rotation.y = a; c.add(stone);
  }
  for (let i = 0; i < 4; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.5, 5), sm.wood);
    log.position.set(0, 0.08, 0); log.rotation.z = Math.PI/2; log.rotation.y = i*0.8; c.add(log);
  }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.6, 5), sm.fireInner);
  flame.position.y = 0.3; flame.name = "CampfireFlame"; c.add(flame);
  const outerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 5), sm.fireOuter);
  outerFlame.position.y = 0.2; c.add(outerFlame);
  for (let i = 0; i < 3; i++) {
    const ember = new THREE.Mesh(new THREE.SphereGeometry(0.02, 4, 3), sm.fireInner);
    ember.position.set((Math.random()-0.5)*0.2, 0.3+Math.random()*0.2, (Math.random()-0.5)*0.2);
    ember.name = `ember_${i}`; c.add(ember);
  }
  const light = new THREE.PointLight(0xff6600, 2.5, 12);
  light.position.y = 0.5; light.name = "CampfireLight"; c.add(light);
  return c;
}

export function createFurnaceModel(): THREE.Group {
  const f = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.8), sm.darkStone);
  body.position.y = 0.5; body.castShadow = true; f.add(body);
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.4, 6), sm.stone);
  chimney.position.set(0.2, 1.2, 0); f.add(chimney);
  const opening = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.05), M(0x111111));
  opening.position.set(0, 0.3, 0.42); f.add(opening);
  const glow = new THREE.PointLight(0xff4400, 1.5, 6);
  glow.position.set(0, 0.3, 0.5); f.add(glow);
  return f;
}

export function createMeatModel(cooked: boolean = false): THREE.Group {
  const g = new THREE.Group();
  const mat = cooked ? sm.meatCooked : sm.meatRaw;
  const meat = new THREE.Mesh(new THREE.SphereGeometry(0.12, 5, 4), mat);
  meat.scale.set(1.5, 0.6, 1); g.add(meat);
  const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.25, 4), M(0xeeeeee));
  bone.position.set(0.15, 0, 0); bone.rotation.z = Math.PI/4; g.add(bone);
  return g;
}

export function createWoodLogModel(): THREE.Group {
  const g = new THREE.Group();
  const log = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.4, 6), sm.wood);
  log.rotation.z = Math.PI/2; g.add(log);
  return g;
}

export function createStoneModel(): THREE.Group {
  const g = new THREE.Group();
  const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.1, 0), sm.stone);
  g.add(stone); return g;
}

export function createFlowerModel(colorType: 'pink'|'yellow'|'white'|'blue' = 'pink'): THREE.Group {
  const f = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.015, 0.3, 4), sm.flowerStem);
  stem.position.y = 0.15; f.add(stem);
  const cm: Record<string, THREE.Material> = {pink:sm.flowerPink,yellow:sm.flowerYellow,white:sm.flowerWhite,blue:sm.flowerBlue};
  const mat = cm[colorType];
  for (let i = 0; i < 5; i++) {
    const a = (i/5)*Math.PI*2;
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 3), mat);
    petal.position.set(Math.cos(a)*0.05, 0.32, Math.sin(a)*0.05);
    petal.scale.set(1.5, 0.5, 1); f.add(petal);
  }
  const center = new THREE.Mesh(new THREE.SphereGeometry(0.025, 4, 3), sm.flowerYellow);
  center.position.y = 0.32; f.add(center);
  return f;
}

export function createCarrotModel(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.25, 5), sm.carrotOrange);
  body.position.y = 0.12; body.rotation.x = Math.PI; g.add(body);
  for (let i = 0; i < 3; i++) {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.15, 0.01), sm.carrotGreen);
    leaf.position.set((i-1)*0.03, 0.3, 0); leaf.rotation.z = (i-1)*0.3; g.add(leaf);
  }
  return g;
}

export function createMushroomModel(color: 'red'|'blue' = 'red'): THREE.Group {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.2, 6), sm.mushroomStem);
  stem.position.y = 0.1; g.add(stem);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 4, 0, Math.PI*2, 0, Math.PI/2),
    color === 'red' ? sm.mushroomCap : sm.mushroomCapBlue);
  cap.position.y = 0.2; g.add(cap);
  for (let i = 0; i < 4; i++) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.02, 4, 3), M(0xffffff));
    const a = Math.random()*Math.PI*2;
    dot.position.set(Math.cos(a)*0.1, 0.25, Math.sin(a)*0.1); g.add(dot);
  }
  return g;
}

export function createBerryBush(): THREE.Group {
  const b = new THREE.Group();
  const bush = new THREE.Mesh(new THREE.SphereGeometry(0.35, 5, 4), sm.leavesDark);
  bush.position.y = 0.25; bush.scale.set(1, 0.7, 1); b.add(bush);
  for (let i = 0; i < 6; i++) {
    const berry = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 3), Math.random()>0.5?sm.berryRed:sm.berryBlue);
    const a = Math.random()*Math.PI*2;
    berry.position.set(Math.cos(a)*0.3, 0.3+Math.random()*0.2, Math.sin(a)*0.3); b.add(berry);
  }
  return b;
}

export function createCrystalModel(): THREE.Group {
  const c = new THREE.Group();
  const colors = [0x66ccff, 0xaa66ff, 0x66ffaa];
  for (let i = 0; i < 3; i++) {
    const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.08+Math.random()*0.08, 0.4+Math.random()*0.3, 5),
      M(colors[i], true));
    crystal.position.set((Math.random()-0.5)*0.2, 0.2+i*0.1, (Math.random()-0.5)*0.2);
    crystal.rotation.set(Math.random()*0.3, Math.random()*Math.PI, Math.random()*0.3); c.add(crystal);
  }
  c.add(new THREE.PointLight(0x66ccff, 0.8, 6).translateOnAxis(new THREE.Vector3(0,0.3,0),1));
  return c;
}

export function createLootChest(): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.4), sm.woodDark);
  base.position.y = 0.18; base.castShadow = true; g.add(base);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.12, 0.42), sm.woodLight);
  lid.position.y = 0.42; g.add(lid);
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.03, 0.44), sm.iron);
  band.position.y = 0.2; g.add(band);
  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.03), sm.gold);
  lock.position.set(0, 0.38, 0.22); g.add(lock);
  g.add(new THREE.PointLight(0xffd700, 0.5, 5).translateOnAxis(new THREE.Vector3(0,0.5,0),1));
  return g;
}

export interface AnimalRig {
  group: THREE.Group; frontLeftLeg: THREE.Group; frontRightLeg: THREE.Group;
  backLeftLeg: THREE.Group; backRightLeg: THREE.Group; head: THREE.Group;
}

function makeAnimalLegs(group: THREE.Group, mat: THREE.Material, radius: number, legH: number, spread: number, bodyH: number) {
  const geo = new THREE.BoxGeometry(radius*2, legH, radius*2);
  geo.translate(0, -legH/2, 0);
  const positions: [number,number,number][] = [
    [spread, bodyH, spread*0.8], [-spread, bodyH, spread*0.8],
    [spread, bodyH, -spread*0.8], [-spread, bodyH, -spread*0.8]
  ];
  const legs: THREE.Group[] = [];
  positions.forEach(([x,y,z]) => {
    const leg = new THREE.Group(); leg.position.set(x, y, z);
    leg.add(new THREE.Mesh(geo, mat)); group.add(leg); legs.push(leg);
  });
  return { frontLeftLeg: legs[0], frontRightLeg: legs[1], backLeftLeg: legs[2], backRightLeg: legs[3] };
}

export function createDeerModel(): AnimalRig {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55,0.45,1.15), sm.deerFur);
  body.position.y = 0.9; body.castShadow = true; group.add(body);
  group.add(new THREE.Mesh(new THREE.BoxGeometry(0.5,0.12,0.95), sm.deerWhite).translateOnAxis(new THREE.Vector3(0,0.68,0),1));
  const head = new THREE.Group(); head.position.set(0, 1.1, 0.65);
  head.add(new THREE.Mesh(new THREE.BoxGeometry(0.28,0.32,0.38), sm.deerFur));
  [-1,1].forEach(s => {
    const a = new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.02,0.35,4), M(0x8b7355));
    a.position.set(s*0.1,0.25,-0.05); a.rotation.z = s*-0.3; head.add(a);
    const a2 = new THREE.Mesh(new THREE.CylinderGeometry(0.008,0.012,0.15,3), M(0x8b7355));
    a2.position.set(s*0.15,0.35,-0.05); a2.rotation.z = s*-0.6; head.add(a2);
  });
  [-1,1].forEach(s => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.025,4,4), sm.eye);
    e.position.set(s*0.14,0.05,0.12); head.add(e);
  });
  group.add(head);
  group.add(new THREE.Mesh(new THREE.BoxGeometry(0.08,0.08,0.12), sm.deerWhite).translateOnAxis(new THREE.Vector3(0,1,-0.65),1));
  const legs = makeAnimalLegs(group, sm.deerFur, 0.09, 0.55, 0.35, 0.9);
  return { group, ...legs, head };
}

export function createRabbitModel(): AnimalRig {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.18,6,5), sm.rabbitFur);
  body.position.y = 0.28; body.scale.set(1,0.9,1.2); body.castShadow = true; group.add(body);
  const head = new THREE.Group(); head.position.set(0,0.42,0.2);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.11,5,4), sm.rabbitFur));
  [-1,1].forEach(s => {
    head.add(new THREE.Mesh(new THREE.BoxGeometry(0.035,0.18,0.025), sm.rabbitPink).translateOnAxis(new THREE.Vector3(s*0.045,0.16,-0.02),1));
    head.add(new THREE.Mesh(new THREE.SphereGeometry(0.018,4,4), sm.eye).translateOnAxis(new THREE.Vector3(s*0.07,0.03,0.06),1));
  });
  group.add(head);
  group.add(new THREE.Mesh(new THREE.SphereGeometry(0.05,4,4), M(0xffffff)).translateOnAxis(new THREE.Vector3(0,0.28,-0.22),1));
  const fGeo = new THREE.BoxGeometry(0.05,0.16,0.05); fGeo.translate(0,-0.08,0);
  const bGeo = new THREE.BoxGeometry(0.06,0.2,0.06); bGeo.translate(0,-0.1,0);
  const fl = new THREE.Group(); fl.position.set(0.08,0.14,0.1); fl.add(new THREE.Mesh(fGeo, sm.rabbitFur)); group.add(fl);
  const fr = new THREE.Group(); fr.position.set(-0.08,0.14,0.1); fr.add(new THREE.Mesh(fGeo, sm.rabbitFur)); group.add(fr);
  const bl = new THREE.Group(); bl.position.set(0.08,0.16,-0.1); bl.add(new THREE.Mesh(bGeo, sm.rabbitFur)); group.add(bl);
  const br = new THREE.Group(); br.position.set(-0.08,0.16,-0.1); br.add(new THREE.Mesh(bGeo, sm.rabbitFur)); group.add(br);
  return { group, frontLeftLeg: fl, frontRightLeg: fr, backLeftLeg: bl, backRightLeg: br, head };
}

export function createFoxModel(): AnimalRig {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.35,0.3,0.8), sm.foxFur);
  body.position.y = 0.55; body.castShadow = true; group.add(body);
  group.add(new THREE.Mesh(new THREE.BoxGeometry(0.32,0.12,0.4), sm.foxWhite).translateOnAxis(new THREE.Vector3(0,0.42,0.1),1));
  const head = new THREE.Group(); head.position.set(0,0.65,0.45);
  head.add(new THREE.Mesh(new THREE.BoxGeometry(0.25,0.22,0.28), sm.foxFur));
  head.add(new THREE.Mesh(new THREE.BoxGeometry(0.12,0.1,0.15), sm.foxWhite).translateOnAxis(new THREE.Vector3(0,-0.05,0.18),1));
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.02,3,3), sm.eye).translateOnAxis(new THREE.Vector3(0,-0.02,0.3),1));
  [-1,1].forEach(s => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05,0.12,4), sm.foxFur);
    ear.position.set(s*0.09,0.15,0); head.add(ear);
    head.add(new THREE.Mesh(new THREE.SphereGeometry(0.02,4,4), sm.eye).translateOnAxis(new THREE.Vector3(s*0.12,0.03,0.1),1));
  });
  group.add(head);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.1,0.5,5), sm.foxFur);
  tail.position.set(0,0.65,-0.55); tail.rotation.x = 0.6; group.add(tail);
  const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.08,4,4), sm.foxTail);
  tailTip.position.set(0,0.8,-0.7); group.add(tailTip);
  const legs = makeAnimalLegs(group, sm.foxFur, 0.06, 0.35, 0.22, 0.6);
  return { group, ...legs, head };
}

export function createWolfModel(): AnimalRig {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.45,0.4,1.0), sm.wolfFur);
  body.position.y = 0.7; body.castShadow = true; group.add(body);
  group.add(new THREE.Mesh(new THREE.BoxGeometry(0.42,0.15,0.5), sm.wolfDark).translateOnAxis(new THREE.Vector3(0,0.85,-0.1),1));
  const head = new THREE.Group(); head.position.set(0,0.85,0.55);
  head.add(new THREE.Mesh(new THREE.BoxGeometry(0.3,0.26,0.35), sm.wolfFur));
  head.add(new THREE.Mesh(new THREE.BoxGeometry(0.15,0.12,0.2), sm.wolfDark).translateOnAxis(new THREE.Vector3(0,-0.06,0.22),1));
  [-1,1].forEach(s => {
    head.add(new THREE.Mesh(new THREE.ConeGeometry(0.06,0.12,4), sm.wolfFur).translateOnAxis(new THREE.Vector3(s*0.1,0.18,0),1));
    head.add(new THREE.Mesh(new THREE.SphereGeometry(0.025,4,4), M(0xffcc00, true)).translateOnAxis(new THREE.Vector3(s*0.13,0.05,0.12),1));
  });
  group.add(head);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.06,0.5,4), sm.wolfFur);
  tail.position.set(0,0.75,-0.65); tail.rotation.x = 0.4; group.add(tail);
  const legs = makeAnimalLegs(group, sm.wolfFur, 0.08, 0.5, 0.3, 0.75);
  return { group, ...legs, head };
}

export function createBoarModel(): AnimalRig {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55,0.5,1.0), sm.boarFur);
  body.position.y = 0.65; body.castShadow = true; group.add(body);
  const head = new THREE.Group(); head.position.set(0,0.7,0.55);
  head.add(new THREE.Mesh(new THREE.BoxGeometry(0.35,0.3,0.3), sm.boarFur));
  head.add(new THREE.Mesh(new THREE.BoxGeometry(0.2,0.15,0.15), sm.boarFur).translateOnAxis(new THREE.Vector3(0,-0.05,0.2),1));
  [-1,1].forEach(s => {
    const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.015,0.12,4), sm.boarTusk);
    tusk.position.set(s*0.1,-0.1,0.25); tusk.rotation.x = -0.3; head.add(tusk);
    head.add(new THREE.Mesh(new THREE.SphereGeometry(0.02,4,4), sm.eye).translateOnAxis(new THREE.Vector3(s*0.15,0.05,0.08),1));
  });
  group.add(head);
  const legs = makeAnimalLegs(group, sm.boarFur, 0.08, 0.4, 0.35, 0.7);
  return { group, ...legs, head };
}

export interface EnemyRig {
  group: THREE.Group; leftArm: THREE.Group; rightArm: THREE.Group;
  leftLeg: THREE.Group; rightLeg: THREE.Group;
}

export function createZombieModel(): { group: THREE.Group; rig: EnemyRig } {
  const group = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55,0.85,0.32), sm.zombieShirt);
  torso.position.y = 1.0; torso.castShadow = true; group.add(torso);
  const tear = new THREE.Mesh(new THREE.BoxGeometry(0.15,0.1,0.01), sm.zombieSkin);
  tear.position.set(0.15,0.8,0.17); group.add(tear);
  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.42,0.42,0.42), sm.zombieSkin);
  headMesh.position.y = 1.62; headMesh.castShadow = true; headMesh.rotation.z = 0.05; group.add(headMesh);
  [-1,1].forEach(s => {
    group.add(new THREE.Mesh(new THREE.BoxGeometry(0.06,0.06,0.06), sm.glowGreen).translateOnAxis(new THREE.Vector3(s*0.1,1.67,0.22),1));
  });
  group.add(new THREE.PointLight(0x39ff14, 0.5, 3).translateOnAxis(new THREE.Vector3(0,1.67,0.3),1));
  const armGeo = new THREE.BoxGeometry(0.16,0.6,0.16); armGeo.translate(0,-0.3,0);
  const leftArm = new THREE.Group(); leftArm.position.set(0.38,1.35,0);
  leftArm.add(new THREE.Mesh(armGeo, sm.zombieSkin)); leftArm.rotation.x = -0.8; group.add(leftArm);
  const rightArm = new THREE.Group(); rightArm.position.set(-0.38,1.35,0);
  rightArm.add(new THREE.Mesh(armGeo, sm.zombieSkin)); rightArm.rotation.x = -0.8; group.add(rightArm);
  const legGeo = new THREE.BoxGeometry(0.2,0.6,0.2); legGeo.translate(0,-0.3,0);
  const leftLeg = new THREE.Group(); leftLeg.position.set(0.16,0.58,0);
  leftLeg.add(new THREE.Mesh(legGeo, sm.pants)); group.add(leftLeg);
  const rightLeg = new THREE.Group(); rightLeg.position.set(-0.16,0.58,0);
  rightLeg.add(new THREE.Mesh(legGeo, sm.pants)); group.add(rightLeg);
  return { group, rig: { group, leftArm, rightArm, leftLeg, rightLeg } };
}

export function createSkeletonModel(): { group: THREE.Group; rig: EnemyRig } {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(new THREE.BoxGeometry(0.4,0.6,0.2), sm.skelBone).translateOnAxis(new THREE.Vector3(0,1.05,0),1));
  group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,0.3,4), sm.skelBone).translateOnAxis(new THREE.Vector3(0,0.7,0),1));
  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.35,0.35,0.35), sm.skelBone);
  skull.position.y = 1.55; group.add(skull);
  group.add(new THREE.Mesh(new THREE.BoxGeometry(0.25,0.08,0.2), sm.skelBone).translateOnAxis(new THREE.Vector3(0,1.33,0.05),1));
  [-1,1].forEach(s => {
    group.add(new THREE.Mesh(new THREE.BoxGeometry(0.06,0.08,0.06), sm.skelEye).translateOnAxis(new THREE.Vector3(s*0.08,1.58,0.18),1));
  });
  group.add(new THREE.PointLight(0xff2200, 0.3, 3).translateOnAxis(new THREE.Vector3(0,1.58,0.2),1));
  const armGeo = new THREE.CylinderGeometry(0.025,0.03,0.55,4); armGeo.translate(0,-0.27,0);
  const leftArm = new THREE.Group(); leftArm.position.set(0.28,1.3,0);
  leftArm.add(new THREE.Mesh(armGeo, sm.skelBone)); group.add(leftArm);
  const rightArm = new THREE.Group(); rightArm.position.set(-0.28,1.3,0);
  rightArm.add(new THREE.Mesh(armGeo, sm.skelBone)); rightArm.rotation.x = -1.0; group.add(rightArm);
  rightArm.add(createSwordModel().translateOnAxis(new THREE.Vector3(0,-0.5,0),1));
  const legGeo = new THREE.CylinderGeometry(0.025,0.03,0.55,4); legGeo.translate(0,-0.27,0);
  const leftLeg = new THREE.Group(); leftLeg.position.set(0.12,0.55,0);
  leftLeg.add(new THREE.Mesh(legGeo, sm.skelBone)); group.add(leftLeg);
  const rightLeg = new THREE.Group(); rightLeg.position.set(-0.12,0.55,0);
  rightLeg.add(new THREE.Mesh(legGeo, sm.skelBone)); group.add(rightLeg);
  return { group, rig: { group, leftArm, rightArm, leftLeg, rightLeg } };
}

export function createSpiderModel(): THREE.Group {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.3,6,5), sm.spiderBody);
  body.position.y = 0.35; body.scale.set(1,0.7,1.2); body.castShadow = true; group.add(body);
  const headM = new THREE.Mesh(new THREE.SphereGeometry(0.18,5,4), sm.spiderBody);
  headM.position.set(0,0.35,0.35); group.add(headM);
  for (let i = 0; i < 4; i++) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.03,4,4), sm.glowRed);
    const x = (i%2===0?0.05:0.11)*(i<2?1:-1);
    e.position.set(x,0.4,0.5); group.add(e);
  }
  for (let i = 0; i < 8; i++) {
    const s = i<4?1:-1; const idx = i%4;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015,0.012,0.55,4), sm.spiderBody);
    leg.position.set(s*0.25, 0.3, 0.2-idx*0.15);
    leg.rotation.z = s*(0.8+idx*0.1); leg.name = `spider_leg_${i}`; group.add(leg);
  }
  group.add(new THREE.PointLight(0xff073a, 0.3, 3).translateOnAxis(new THREE.Vector3(0,0.4,0.5),1));
  return group;
}

export function createBurningEffect(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.1+Math.random()*0.1, 0.4+Math.random()*0.3, 4), sm.burning);
    f.position.set((Math.random()-0.5)*0.4, 0.3+Math.random()*0.3, (Math.random()-0.5)*0.4);
    f.name = `flame_${i}`; g.add(f);
  }
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.2,6,4), new THREE.MeshBasicMaterial({color:0xffaa00,transparent:true,opacity:0.6}));
  core.position.y = 0.5; core.name = "fireCore"; g.add(core);
  g.add(new THREE.PointLight(0xff6600, 2, 8).translateOnAxis(new THREE.Vector3(0,0.5,0),1));
  return g;
}
