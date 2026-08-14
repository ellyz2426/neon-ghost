import {
  createSystem,
  InputComponent,
  Vector3,
  Mesh,
  CylinderGeometry,
  MeshStandardMaterial,
  Color,
  AdditiveBlending,
  PointLight,
} from '@iwsdk/core';
import {
  Ghost,
  GameState,
  STATE_PLAYING,
} from './components.js';

export class BeamSystem extends createSystem(
  {
    ghosts: { required: [Ghost] },
    gameStates: { required: [GameState] },
  },
) {
  private beamMesh: Mesh | null = null;
  private beamLight: PointLight | null = null;
  private tempOrigin!: Vector3;
  private tempDir!: Vector3;
  private beamActive = false;
  private mouseHeld = false;
  private triggerHeld = false;

  init(): void {
    this.tempOrigin = new Vector3();
    this.tempDir = new Vector3();

    // Create beam mesh
    const beamGeo = new CylinderGeometry(0.015, 0.015, 1, 8);
    beamGeo.rotateX(Math.PI / 2);
    const beamMat = new MeshStandardMaterial({
      color: new Color(0x00ffaa),
      emissive: new Color(0x00ffaa),
      emissiveIntensity: 3.0,
      transparent: true,
      opacity: 0.7,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    this.beamMesh = new Mesh(beamGeo, beamMat);
    this.beamMesh.visible = false;
    this.beamMesh.castShadow = false;
    this.world.scene.add(this.beamMesh);

    this.beamLight = new PointLight(0x00ffaa, 2, 5, 2);
    this.beamLight.visible = false;
    this.beamLight.castShadow = false;
    this.world.scene.add(this.beamLight);
  }

  update(delta: number, time: number): void {
    let isPlaying = false;
    for (const gs of this.queries.gameStates.entities) {
      isPlaying = (gs.getValue(GameState, 'state') as number) === STATE_PLAYING;
    }

    if (!isPlaying) {
      this.hideBeam();
      this.clearAllCapture();
      return;
    }

    // Track mouse hold state
    const kbd = this.world.input.keyboard;
    if (kbd?.getKeyDown('mouseLeft')) this.mouseHeld = true;
    if (kbd?.getKeyUp('mouseLeft')) this.mouseHeld = false;

    // Track trigger hold state
    const rightPad = this.world.input.xr?.gamepads?.right;
    if (rightPad?.getButtonDown(InputComponent.Trigger)) this.triggerHeld = true;
    if (rightPad?.getButtonUp(InputComponent.Trigger)) this.triggerHeld = false;

    const firing = this.mouseHeld || this.triggerHeld;

    if (firing) {
      this.beamActive = true;
      this.updateBeamRay(time);
    } else {
      this.beamActive = false;
      this.hideBeam();
      this.clearAllCapture();
    }
  }

  private updateBeamRay(time: number): void {
    // Get beam origin and direction
    const raySpace = this.world.player?.raySpaces?.right;

    if (raySpace) {
      // VR mode: use ray space
      raySpace.getWorldPosition(this.tempOrigin);
      raySpace.getWorldDirection(this.tempDir);
      this.tempDir.negate();
    } else {
      // Browser mode: use camera
      this.world.camera.getWorldPosition(this.tempOrigin);
      this.world.camera.getWorldDirection(this.tempDir);
    }

    // Find closest ghost hit
    let closestDist = 20;
    let closestEntity: typeof this.queries.ghosts.entities extends Set<infer E> ? E : never = null as never;
    let hasHit = false;

    for (const entity of this.queries.ghosts.entities) {
      const alive = entity.getValue(Ghost, 'alive') as boolean;
      if (!alive) continue;

      const obj = entity.object3D;
      if (!obj) continue;

      // Simple sphere intersection check
      const ghostPos = obj.position;
      const ghostType = entity.getValue(Ghost, 'ghostType') as number;
      const hitRadius = ghostType === 3 ? 0.6 : (ghostType === 1 ? 0.4 : 0.3);

      // Project ghost position onto ray
      const toGhostX = ghostPos.x - this.tempOrigin.x;
      const toGhostY = ghostPos.y - this.tempOrigin.y;
      const toGhostZ = ghostPos.z - this.tempOrigin.z;
      const projection = toGhostX * this.tempDir.x + toGhostY * this.tempDir.y + toGhostZ * this.tempDir.z;
      if (projection < 0 || projection > 20) continue;

      const closestPointX = this.tempOrigin.x + this.tempDir.x * projection;
      const closestPointY = this.tempOrigin.y + this.tempDir.y * projection;
      const closestPointZ = this.tempOrigin.z + this.tempDir.z * projection;

      const dx = closestPointX - ghostPos.x;
      const dy = closestPointY - ghostPos.y;
      const dz = closestPointZ - ghostPos.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance < hitRadius && projection < closestDist) {
        closestDist = projection;
        closestEntity = entity;
        hasHit = true;
      }
    }

    // Mark all ghosts as not being captured first
    this.clearAllCapture();

    // Update beam visual
    const beamLength = hasHit ? closestDist : 15;
    this.showBeam(this.tempOrigin, this.tempDir, beamLength, time);

    // Mark hit ghost
    if (hasHit && closestEntity) {
      closestEntity.setValue(Ghost, 'isBeingCaptured', true);
    }
  }

  private showBeam(origin: Vector3, dir: Vector3, length: number, time: number): void {
    if (!this.beamMesh || !this.beamLight) return;

    const midX = origin.x + dir.x * length / 2;
    const midY = origin.y + dir.y * length / 2;
    const midZ = origin.z + dir.z * length / 2;
    this.beamMesh.position.set(midX, midY, midZ);
    this.beamMesh.lookAt(origin);
    this.beamMesh.scale.set(1, 1, length);
    this.beamMesh.visible = true;

    // Beam end point for light
    const endX = origin.x + dir.x * length;
    const endY = origin.y + dir.y * length;
    const endZ = origin.z + dir.z * length;
    this.beamLight.position.set(endX, endY, endZ);
    this.beamLight.visible = true;
    this.beamLight.intensity = 2 + Math.sin(time * 15) * 0.5;

    // Pulse beam opacity
    const mat = this.beamMesh.material as MeshStandardMaterial;
    mat.opacity = 0.5 + Math.sin(time * 20) * 0.2;
  }

  private hideBeam(): void {
    if (this.beamMesh) this.beamMesh.visible = false;
    if (this.beamLight) this.beamLight.visible = false;
    this.mouseHeld = false;
    this.triggerHeld = false;
  }

  private clearAllCapture(): void {
    for (const entity of this.queries.ghosts.entities) {
      entity.setValue(Ghost, 'isBeingCaptured', false);
    }
  }

  isBeamActive(): boolean {
    return this.beamActive;
  }
}
