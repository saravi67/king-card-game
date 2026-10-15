// King Card Game - 3D Table and Cards Renderer
import * as THREE from 'three';
import { createCardAtlas, getCardUVs } from './cards.js';

const TABLE_GREEN = 0x1d5c34; // Classic felt green
const WOOD_BROWN = 0x4a2c16;  // Warm table rim

export class Table3D {
  constructor(hh) {
    this.hh = hh;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x101a14, 18, 38);

    // Camera setup for responsive 3:2, 4:3, 16:9, 1:1 handheld screens
    // Camera setup for responsive 3:2, 4:3, 16:9, 1:1 handheld screens
    this.camera = new THREE.PerspectiveCamera(48, hh.width / hh.height, 0.1, 40);
    this.camera.position.set(0, 9.4, 7.8);
    this.camera.lookAt(0, -0.4, 0.4);
    hh.fitCamera(this.camera);

    // Lights (1 Ambient + 1 Directional, no shadows as per PocketVibe budget)
    this.ambientLight = new THREE.AmbientLight(0xffffff, 1.25);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfff5e6, 1.3);
    this.sunLight.position.set(4, 12, 6);
    this.scene.add(this.sunLight);

    // Create shared textures & materials
    const { texture, cols, rows } = createCardAtlas();
    this.atlasTexture = texture;
    this.cols = cols;
    this.rows = rows;

    // Fast Lambert material for card front & back
    this.cardFrontMaterial = new THREE.MeshLambertMaterial({
      map: this.atlasTexture,
      side: THREE.FrontSide,
    });
    this.cardBackMaterial = new THREE.MeshLambertMaterial({
      map: this.atlasTexture,
      side: THREE.FrontSide,
    });

    // Create Table Meshes
    this.createTable();

    // Reusable dummy vectors to avoid garbage collection inside hh.run
    this.tmpVec = new THREE.Vector3();
    this.tmpQuat = new THREE.Quaternion();

    // Card Mesh Pool (52 cards + extras = 64 card meshes)
    this.cardPool = [];
    this.activeCardMeshes = new Map(); // card.id -> mesh
    this.centerTrickMeshes = [];       // array of { mesh, targetPos, targetRot, progress }
    this.discardAnimations = [];       // array of { mesh, targetPos, progress, speed }
    this.setupCardPool(60);

    // Precompile for zero runtime stutter
    hh.renderer.initTexture(this.atlasTexture);
    hh.renderer.compile(this.scene, this.camera);
  }

  createTable() {
    // 1. Felt Table Surface (Octagon or 24-sided cylinder)
    const feltGeom = new THREE.CylinderGeometry(7.2, 7.2, 0.3, 28);
    const feltMat = new THREE.MeshLambertMaterial({ color: TABLE_GREEN });
    this.tableFelt = new THREE.Mesh(feltGeom, feltMat);
    this.tableFelt.position.set(0, -0.15, 0);
    this.scene.add(this.tableFelt);

    // 2. Wood Table Border Rim
    const rimGeom = new THREE.CylinderGeometry(7.6, 7.6, 0.4, 28);
    const rimMat = new THREE.MeshLambertMaterial({ color: WOOD_BROWN });
    this.tableRim = new THREE.Mesh(rimGeom, rimMat);
    this.tableRim.position.set(0, -0.22, 0);
    this.scene.add(this.tableRim);

    // 3. Subtle center emblem/ring
    const ringGeom = new THREE.RingGeometry(1.6, 1.66, 32);
    ringGeom.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x277443 });
    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    ringMesh.position.set(0, 0.005, 0);
    this.scene.add(ringMesh);
  }

  // Pre-create card meshes
  setupCardPool(count) {
    const cardWidth = 1.16;
    const cardHeight = 1.64;
    const geom = new THREE.PlaneGeometry(cardWidth, cardHeight);

    // Back UVs (slot 52 in atlas)
    const backUV = getCardUVs(52, this.cols, this.rows);

    for (let i = 0; i < count; i++) {
      // Front plane (faces positive Z)
      const frontGeom = geom.clone();
      const frontMesh = new THREE.Mesh(frontGeom, this.cardFrontMaterial);

      // Back plane (rotated 180 degrees to face negative Z)
      const backGeom = geom.clone();
      // Apply back UVs
      this.applyUVsToGeometry(backGeom, backUV);
      const backMesh = new THREE.Mesh(backGeom, this.cardBackMaterial);
      backMesh.rotation.y = Math.PI;

      // Group holds both front and back
      const cardGroup = new THREE.Group();
      cardGroup.add(frontMesh);
      cardGroup.add(backMesh);
      cardGroup.visible = false;
      this.scene.add(cardGroup);

      cardGroup.userData = {
        frontGeom,
        frontMesh,
        backMesh,
        cardId: -1,
        inUse: false,
        targetPos: new THREE.Vector3(),
        targetRot: new THREE.Euler(),
        currentPos: new THREE.Vector3(),
        currentRot: new THREE.Euler(),
      };

      this.cardPool.push(cardGroup);
    }
  }

  applyUVsToGeometry(geometry, uvs) {
    const uvAttr = geometry.attributes.uv;
    // PlaneGeometry vertices: top-left (0, 1), top-right (1, 1), bottom-left (0, 0), bottom-right (1, 0)
    uvAttr.setXY(0, uvs.uMin, uvs.vMax);
    uvAttr.setXY(1, uvs.uMax, uvs.vMax);
    uvAttr.setXY(2, uvs.uMin, uvs.vMin);
    uvAttr.setXY(3, uvs.uMax, uvs.vMin);
    uvAttr.needsUpdate = true;
  }

  getFreeCardMesh() {
    let card = this.cardPool.find(c => !c.userData.inUse);
    if (!card) {
      card = this.cardPool[0]; // fallback
    }
    card.userData.inUse = true;
    card.visible = true;
    return card;
  }

  releaseAllCards() {
    for (const card of this.cardPool) {
      card.visible = false;
      card.userData.inUse = false;
      card.userData.cardId = -1;
    }
    this.activeCardMeshes.clear();
    this.centerTrickMeshes = [];
    this.discardAnimations = [];
  }

  // Update layout of human player's hand (Player 0 - South)
  renderPlayerHand(hand, selectedIndex, playableCards) {
    const total = hand.length;
    if (total === 0) return;

    // Fan arch parameters - positioned close to camera and angled upward
    const maxFanAngle = Math.min(0.68, total * 0.058);
    const startAngle = -maxFanAngle / 2;
    const angleStep = total > 1 ? maxFanAngle / (total - 1) : 0;
    const radius = 6.4;
    const originZ = 7.1;
    const originY = 0.55;

    for (let i = 0; i < total; i++) {
      const card = hand[i];
      let mesh = this.activeCardMeshes.get(card.id);

      if (!mesh) {
        mesh = this.getFreeCardMesh();
        mesh.userData.cardId = card.id;
        const uvs = getCardUVs(card.id, this.cols, this.rows);
        this.applyUVsToGeometry(mesh.userData.frontGeom, uvs);
        this.activeCardMeshes.set(card.id, mesh);
      }

      const angle = startAngle + i * angleStep;
      const x = Math.sin(angle) * radius;
      const z = originZ - (Math.cos(angle) * radius - radius * 0.95);
      let y = originY + i * 0.015;

      const isSelected = i === selectedIndex;
      const isPlayable = playableCards.some(c => c.id === card.id);

      // Selected card lift
      if (isSelected) {
        y += 0.55;
      } else if (!isPlayable) {
        y -= 0.08; // slightly pushed down if not playable
      }

      mesh.userData.targetPos.set(x, y, z - (isSelected ? 0.35 : 0));
      // Tilted slightly up towards camera (approx 58 degrees)
      mesh.userData.targetRot.set(-Math.PI / 2.65, 0, -angle * 0.6);

      // Fast snap/lerp
      mesh.position.lerp(mesh.userData.targetPos, 0.4);
      mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, mesh.userData.targetRot.x, 0.4);
      mesh.rotation.y = THREE.MathUtils.lerp(mesh.rotation.y, mesh.userData.targetRot.y, 0.4);
      mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, mesh.userData.targetRot.z, 0.4);
    }
  }

  // Render Bot opponents' cards (face down stacks)
  renderBotHands(botCardCounts) {
    // botCardCounts: { 1: count, 2: count, 3: count }
    // 1: West (Left), 2: North (Top), 3: East (Right)
    const botConfigs = [
      { id: 1, pos: new THREE.Vector3(-4.8, 0.2, 0.2), rot: new THREE.Euler(-Math.PI / 2.3, 0, Math.PI / 2) },
      { id: 2, pos: new THREE.Vector3(0, 0.2, -4.2), rot: new THREE.Euler(-Math.PI / 2.3, 0, Math.PI) },
      { id: 3, pos: new THREE.Vector3(4.8, 0.2, 0.2), rot: new THREE.Euler(-Math.PI / 2.3, 0, -Math.PI / 2) },
    ];

    for (const cfg of botConfigs) {
      const count = botCardCounts[cfg.id] || 0;
      // Show up to 5 representative stacked card meshes per bot to stay ultra-light
      const visibleStrips = Math.min(count, 5);
      for (let s = 0; s < visibleStrips; s++) {
        const dummyId = `bot_${cfg.id}_${s}`;
        let mesh = this.activeCardMeshes.get(dummyId);
        if (!mesh) {
          mesh = this.getFreeCardMesh();
          mesh.userData.cardId = dummyId;
          this.activeCardMeshes.set(dummyId, mesh);
        }

        const offset = (s - visibleStrips / 2) * 0.16;
        let px = cfg.pos.x;
        let pz = cfg.pos.z;
        if (cfg.id === 2) px += offset;
        else pz += offset;

        mesh.position.set(px, cfg.pos.y + s * 0.015, pz);
        // Face down (rotate Y by PI so back faces camera)
        mesh.rotation.copy(cfg.rot);
        mesh.rotation.y += Math.PI;
      }
    }
  }

  // Play a card onto center table
  playCardToCenter(playerId, card) {
    let mesh = this.activeCardMeshes.get(card.id);
    if (!mesh) {
      mesh = this.getFreeCardMesh();
      mesh.userData.cardId = card.id;
      const uvs = getCardUVs(card.id, this.cols, this.rows);
      this.applyUVsToGeometry(mesh.userData.frontGeom, uvs);
      this.activeCardMeshes.set(card.id, mesh);
    }

    // Positions for 4 players' played cards in the center trick area
    // 0: South, 1: West, 2: North, 3: East
    const centerSlots = [
      { pos: new THREE.Vector3(0, 0.08, 1.2), rot: new THREE.Euler(-Math.PI / 2, 0, 0.05) },
      { pos: new THREE.Vector3(-1.25, 0.09, 0), rot: new THREE.Euler(-Math.PI / 2, 0, 0.22) },
      { pos: new THREE.Vector3(0, 0.1, -1.1), rot: new THREE.Euler(-Math.PI / 2, 0, -0.08) },
      { pos: new THREE.Vector3(1.25, 0.11, 0), rot: new THREE.Euler(-Math.PI / 2, 0, -0.18) },
    ];

    const slot = centerSlots[playerId];
    mesh.userData.targetPos = slot.pos;
    mesh.userData.targetRot = slot.rot;

    this.centerTrickMeshes.push({
      mesh,
      targetPos: slot.pos,
      targetRot: slot.rot,
      progress: 0,
    });
  }

  // Clear center trick and animate towards the winner
  collectTrickToWinner(winnerId, onComplete) {
    const targetPoints = [
      new THREE.Vector3(0, 0.1, 7.5),   // South
      new THREE.Vector3(-6.5, 0.1, 0),  // West
      new THREE.Vector3(0, 0.1, -6.5),  // North
      new THREE.Vector3(6.5, 0.1, 0),   // East
    ];

    const winPos = targetPoints[winnerId];

    for (const item of this.centerTrickMeshes) {
      this.discardAnimations.push({
        mesh: item.mesh,
        targetPos: winPos,
        progress: 0,
      });
    }

    this.centerTrickMeshes = [];

    // Trigger complete callback after brief collection delay
    setTimeout(() => {
      for (const item of this.discardAnimations) {
        item.mesh.visible = false;
        item.mesh.userData.inUse = false;
        this.activeCardMeshes.delete(item.mesh.userData.cardId);
      }
      this.discardAnimations = [];
      if (onComplete) onComplete();
    }, 600);
  }

  // Per frame update for smooth animations
  update(dt) {
    // Animate cards moving to center
    for (const item of this.centerTrickMeshes) {
      item.progress = Math.min(1, item.progress + dt * 4.5);
      item.mesh.position.lerp(item.targetPos, 0.3);
      item.mesh.rotation.x = THREE.MathUtils.lerp(item.mesh.rotation.x, item.targetRot.x, 0.3);
      item.mesh.rotation.y = THREE.MathUtils.lerp(item.mesh.rotation.y, item.targetRot.y, 0.3);
      item.mesh.rotation.z = THREE.MathUtils.lerp(item.mesh.rotation.z, item.targetRot.z, 0.3);
    }

    // Animate cards sweeping to trick winner
    for (const item of this.discardAnimations) {
      item.progress = Math.min(1, item.progress + dt * 3.5);
      item.mesh.position.lerp(item.targetPos, 0.25);
    }
  }

  render() {
    this.hh.renderer.render(this.scene, this.camera);
  }
}
