import {
  createSystem,
  Vector3,
  Mesh,
  SphereGeometry,
  MeshStandardMaterial,
  Color,
  PointLight,
  Group,
  IcosahedronGeometry,
  AdditiveBlending,
  Entity,
} from '@iwsdk/core';
import {
  Ghost,
  GameState,
  GHOST_WISP,
  GHOST_SPECTER,
  GHOST_POLTERGEIST,
  GHOST_PHANTOM,
  STATE_PLAYING,
  STATE_WAVE_INTRO,
} from './components.js';
import { GameSystem } from './game-system.js';

interface GhostConfig {
  health: number;
  speed: number;
  points: number;
  color: number;
  emissive: number;
  size: number;
  captureRate: number;
}

const GHOST_CONFIGS: Record<number, GhostConfig> = {
  [GHOST_WISP]: { health: 30, speed: 3.0, points: 10, color: 0x00ffff, emissive: 0x00cccc, size: 0.2, captureRate: 40 },
  [GHOST_SPECTER]: { health: 60, speed: 1.8, points: 25, color: 0x00ff44, emissive: 0x00cc33, size: 0.35, captureRate: 30 },
  [GHOST_POLTERGEIST]: { health: 80, speed: 2.2, points: 50, color: 0xaa00ff, emissive: 0x8800cc, size: 0.3, captureRate: 25 },
  [GHOST_PHANTOM]: { health: 150, speed: 0.8, points: 100, color: 0xff2200, emissive: 0xcc1100, size: 0.5, captureRate: 15 },
};

const ROOM_BOUNDS = { minX: -5.5, maxX: 5.5, minZ: -5.5, maxZ: 5.5, minY: 0.8, maxY: 3.5 };

export class GhostSystem extends createSystem(
  {
    ghosts: { required: [Ghost] },
    gameStates: { required: [GameState] },
  },
) {
  private spawnTimer = 0;
  private tempVec!: Vector3;
  private playerPos!: Vector3;
  private waveGhostQueue: number[] = [];
  private waveSpawned = false;

  init(): void {
    this.tempVec = new Vector3();
    this.playerPos = new Vector3();
  }

  update(delta: number): void {
    let gameState = STATE_PLAYING;
    let wave = 1;
    let difficulty = 0;

    for (const gs of this.queries.gameStates.entities) {
      gameState = gs.getValue(GameState, 'state') as number;
      wave = gs.getValue(GameState, 'wave') as number;
      difficulty = gs.getValue(GameState, 'difficulty') as number;
    }

    // On wave intro, prepare spawn queue
    if (gameState === STATE_WAVE_INTRO && !this.waveSpawned) {
      this.waveGhostQueue = this.buildWaveQueue(wave, difficulty);
      for (const gs of this.queries.gameStates.entities) {
        gs.setValue(GameState, 'ghostsRemaining', this.waveGhostQueue.length);
      }
      this.spawnTimer = 0;
      this.waveSpawned = true;
    }

    if (gameState !== STATE_WAVE_INTRO && gameState !== STATE_PLAYING) {
      this.waveSpawned = false;
      return;
    }

    if (gameState !== STATE_PLAYING) return;

    // Spawn ghosts from queue
    if (this.waveGhostQueue.length > 0) {
      this.spawnTimer += delta;
      const spawnInterval = Math.max(0.8, 2.5 - wave * 0.15);
      if (this.spawnTimer >= spawnInterval) {
        this.spawnTimer = 0;
        const ghostType = this.waveGhostQueue.shift()!;
        this.spawnGhost(ghostType);
      }
    }

    // Update ghosts
    this.world.camera.getWorldPosition(this.playerPos);

    for (const entity of this.queries.ghosts.entities) {
      const alive = entity.getValue(Ghost, 'alive') as boolean;
      if (!alive) continue;

      const ghostType = entity.getValue(Ghost, 'ghostType') as number;
      const isStunned = entity.getValue(Ghost, 'isStunned') as boolean;
      const isBeingCaptured = entity.getValue(Ghost, 'isBeingCaptured') as boolean;

      // Update stun timer
      if (isStunned) {
        const stunTimer = (entity.getValue(Ghost, 'stunTimer') as number) - delta;
        entity.setValue(Ghost, 'stunTimer', stunTimer);
        if (stunTimer <= 0) {
          entity.setValue(Ghost, 'isStunned', false);
        }
        this.updateGhostVisual(entity, delta);
        continue;
      }

      // Update capture if beam is on it
      if (isBeingCaptured) {
        const cfg = GHOST_CONFIGS[ghostType];
        const progress = (entity.getValue(Ghost, 'captureProgress') as number) + cfg.captureRate * delta;
        entity.setValue(Ghost, 'captureProgress', progress);

        if (progress >= 100) {
          this.captureGhost(entity, cfg.points);
          continue;
        }
      } else {
        const progress = entity.getValue(Ghost, 'captureProgress') as number;
        if (progress > 0) {
          entity.setValue(Ghost, 'captureProgress', Math.max(0, progress - 15 * delta));
        }
      }

      // Movement AI
      this.updateGhostMovement(entity, ghostType, delta);

      // Poltergeist attack
      if (ghostType === GHOST_POLTERGEIST) {
        const cooldown = (entity.getValue(Ghost, 'attackCooldown') as number) - delta;
        entity.setValue(Ghost, 'attackCooldown', cooldown);
        if (cooldown <= 0) {
          const obj = entity.object3D;
          if (obj) {
            const dist = obj.position.distanceTo(this.playerPos);
            if (dist < 4) {
              this.world.getSystem(GameSystem)?.onPlayerHit();
              entity.setValue(Ghost, 'attackCooldown', 4.0 + Math.random() * 2);
            }
          }
        }
      }

      this.updateGhostVisual(entity, delta);
    }
  }

  private buildWaveQueue(wave: number, difficulty: number): number[] {
    const queue: number[] = [];
    const baseCount = 3 + wave;
    const diffMult = difficulty === 1 ? 1.5 : 1;
    const total = Math.floor(baseCount * diffMult);

    for (let i = 0; i < total; i++) {
      if (wave >= 4 && (i === total - 1) && (wave % 4 === 0)) {
        queue.push(GHOST_PHANTOM);
      } else if (wave >= 6 && Math.random() < 0.2) {
        queue.push(GHOST_POLTERGEIST);
      } else if (wave >= 3 && Math.random() < 0.3) {
        queue.push(GHOST_SPECTER);
      } else if (wave >= 5 && Math.random() < 0.15) {
        queue.push(GHOST_POLTERGEIST);
      } else {
        queue.push(Math.random() < 0.6 ? GHOST_WISP : GHOST_SPECTER);
      }
    }
    return queue;
  }

  private spawnGhost(ghostType: number): void {
    const cfg = GHOST_CONFIGS[ghostType];

    const group = new Group();

    const bodyGeo = ghostType === GHOST_PHANTOM
      ? new IcosahedronGeometry(cfg.size, 1)
      : new SphereGeometry(cfg.size, 12, 8);

    const bodyMat = new MeshStandardMaterial({
      color: new Color(cfg.color),
      emissive: new Color(cfg.emissive),
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: ghostType === GHOST_SPECTER ? 0.5 : 0.75,
      blending: AdditiveBlending,
      depthWrite: false,
    });

    const body = new Mesh(bodyGeo, bodyMat);
    body.castShadow = false;
    group.add(body);

    // Inner glow core
    const coreGeo = new SphereGeometry(cfg.size * 0.4, 8, 6);
    const coreMat = new MeshStandardMaterial({
      color: new Color(0xffffff),
      emissive: new Color(cfg.color),
      emissiveIntensity: 3.0,
      transparent: true,
      opacity: 0.6,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    const core = new Mesh(coreGeo, coreMat);
    group.add(core);

    // Ghost light
    const light = new PointLight(cfg.color, 1.0, 4, 2);
    light.castShadow = false;
    group.add(light);

    // Random spawn position along walls
    const side = Math.floor(Math.random() * 4);
    let spawnX: number, spawnZ: number;
    switch (side) {
      case 0: spawnX = -5 + Math.random() * 10; spawnZ = -5; break;
      case 1: spawnX = -5 + Math.random() * 10; spawnZ = 5; break;
      case 2: spawnX = -5; spawnZ = -5 + Math.random() * 10; break;
      default: spawnX = 5; spawnZ = -5 + Math.random() * 10; break;
    }
    const spawnY = 1.0 + Math.random() * 2.0;
    group.position.set(spawnX, spawnY, spawnZ);

    const entity = this.world.createTransformEntity(group);
    entity.addComponent(Ghost, {
      ghostType,
      health: cfg.health,
      maxHealth: cfg.health,
      points: cfg.points,
      speed: cfg.speed,
      captureProgress: 0,
      isBeingCaptured: false,
      isStunned: false,
      stunTimer: 0,
      phaseTimer: Math.random() * Math.PI * 2,
      attackCooldown: 3.0 + Math.random() * 2,
      spawnTime: performance.now() / 1000,
      moveAngle: Math.random() * Math.PI * 2,
      moveRadius: 2 + Math.random() * 3,
      baseY: spawnY,
      alive: true,
    });
  }

  private updateGhostMovement(entity: Entity, ghostType: number, delta: number): void {
    const obj = entity.object3D;
    if (!obj) return;

    const speed = entity.getValue(Ghost, 'speed') as number;
    const phase = (entity.getValue(Ghost, 'phaseTimer') as number) + delta;
    entity.setValue(Ghost, 'phaseTimer', phase);

    const moveAngle = entity.getValue(Ghost, 'moveAngle') as number;
    const baseY = entity.getValue(Ghost, 'baseY') as number;

    switch (ghostType) {
      case GHOST_WISP: {
        obj.position.x += Math.cos(moveAngle + phase * 2) * speed * delta * 0.5;
        obj.position.z += Math.sin(moveAngle + phase * 2) * speed * delta * 0.5;
        obj.position.y = baseY + Math.sin(phase * 3) * 0.5 + Math.sin(phase * 5) * 0.1;
        entity.setValue(Ghost, 'moveAngle', moveAngle + (Math.random() - 0.5) * delta * 3);
        break;
      }
      case GHOST_SPECTER: {
        obj.position.x += Math.cos(phase * 0.8) * speed * delta * 0.3;
        obj.position.z += Math.sin(phase * 0.6) * speed * delta * 0.3;
        obj.position.y = baseY + Math.sin(phase * 1.5) * 0.8;
        break;
      }
      case GHOST_POLTERGEIST: {
        if (Math.random() < 0.005) {
          obj.position.x += (Math.random() - 0.5) * 3;
          obj.position.z += (Math.random() - 0.5) * 3;
        } else {
          obj.position.x += Math.cos(moveAngle) * speed * delta * 0.4;
          obj.position.z += Math.sin(moveAngle) * speed * delta * 0.4;
          entity.setValue(Ghost, 'moveAngle', moveAngle + (Math.random() - 0.5) * delta * 2);
        }
        obj.position.y = baseY + Math.sin(phase * 2) * 0.4;
        break;
      }
      case GHOST_PHANTOM: {
        this.tempVec.copy(this.playerPos).sub(obj.position).normalize();
        obj.position.x += this.tempVec.x * speed * delta * 0.3;
        obj.position.z += this.tempVec.z * speed * delta * 0.3;
        obj.position.y = baseY + Math.sin(phase * 0.5) * 0.3;
        break;
      }
    }

    // Clamp to room bounds
    obj.position.x = Math.max(ROOM_BOUNDS.minX, Math.min(ROOM_BOUNDS.maxX, obj.position.x));
    obj.position.z = Math.max(ROOM_BOUNDS.minZ, Math.min(ROOM_BOUNDS.maxZ, obj.position.z));
    obj.position.y = Math.max(ROOM_BOUNDS.minY, Math.min(ROOM_BOUNDS.maxY, obj.position.y));
  }

  private updateGhostVisual(entity: Entity, delta: number): void {
    const obj = entity.object3D;
    if (!obj) return;

    const isStunned = entity.getValue(Ghost, 'isStunned') as boolean;
    const isBeingCaptured = entity.getValue(Ghost, 'isBeingCaptured') as boolean;
    const phase = entity.getValue(Ghost, 'phaseTimer') as number;

    const pulseScale = 1.0 + Math.sin(phase * 4) * 0.08;
    obj.scale.setScalar(isStunned ? 0.7 : (isBeingCaptured ? 1.0 + Math.sin(phase * 12) * 0.15 : pulseScale));
    obj.rotation.y += delta * (isStunned ? 5 : 0.5);

    // Update light intensity
    obj.traverse((child) => {
      if (child instanceof PointLight) {
        child.intensity = isStunned ? 0.3 : (isBeingCaptured ? 2.0 + Math.sin(phase * 10) * 1.0 : 1.0 + Math.sin(phase * 3) * 0.3);
      }
    });
  }

  private captureGhost(entity: Entity, points: number): void {
    entity.dispose();
    this.world.getSystem(GameSystem)?.onGhostCaptured(points);

    for (const gs of this.queries.gameStates.entities) {
      const rem = gs.getValue(GameState, 'ghostsRemaining') as number;
      if (rem > 0) {
        gs.setValue(GameState, 'ghostsRemaining', rem - 1);
      }
    }
  }
}
