import {
  createSystem,
  PointLight,
  Vector3,
  BufferGeometry,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
  AdditiveBlending,
} from '@iwsdk/core';
import { GameState, STATE_PLAYING } from './components.js';

export class EnvironmentSystem extends createSystem(
  {
    gameStates: { required: [GameState] },
  },
) {
  private sconceLights: PointLight[] = [];
  private dustParticles: Points | null = null;
  private dustPositions: Float32Array | null = null;
  private dustVelocities: Float32Array | null = null;
  private lightningTimer = 0;
  private nextLightningTime = 5;
  private lightningFlash = 0;
  private dustCount = 800;

  init(): void {
    // Find sconce lights in the scene
    this.world.scene.traverse((obj) => {
      if (obj instanceof PointLight && obj.color.getHex() === 0xff8833) {
        this.sconceLights.push(obj);
      }
    });

    // Create floating dust particles
    this.dustPositions = new Float32Array(this.dustCount * 3);
    this.dustVelocities = new Float32Array(this.dustCount * 3);

    for (let i = 0; i < this.dustCount; i++) {
      this.dustPositions[i * 3] = (Math.random() - 0.5) * 13;
      this.dustPositions[i * 3 + 1] = Math.random() * 4.5 + 0.2;
      this.dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 13;

      this.dustVelocities[i * 3] = (Math.random() - 0.5) * 0.1;
      this.dustVelocities[i * 3 + 1] = Math.random() * 0.05 + 0.01;
      this.dustVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(this.dustPositions, 3));

    const mat = new PointsMaterial({
      color: 0xaa9977,
      size: 0.015,
      transparent: true,
      opacity: 0.35,
      blending: AdditiveBlending,
      depthWrite: false,
    });

    this.dustParticles = new Points(geo, mat);
    this.world.scene.add(this.dustParticles);
  }

  update(delta: number, time: number): void {
    // Flicker sconces
    for (let i = 0; i < this.sconceLights.length; i++) {
      const light = this.sconceLights[i];
      const flicker = 1.0 + Math.sin(time * 8 + i * 1.7) * 0.15
        + Math.sin(time * 13 + i * 2.3) * 0.1
        + Math.sin(time * 21 + i * 3.1) * 0.05;
      light.intensity = 1.5 * flicker;
    }

    // Animate dust particles
    if (this.dustPositions && this.dustVelocities && this.dustParticles) {
      for (let i = 0; i < this.dustCount; i++) {
        const idx = i * 3;
        this.dustPositions[idx] += this.dustVelocities[idx] * delta;
        this.dustPositions[idx + 1] += this.dustVelocities[idx + 1] * delta;
        this.dustPositions[idx + 2] += this.dustVelocities[idx + 2] * delta;

        // Reset particles that go too high or out of bounds
        if (this.dustPositions[idx + 1] > 4.8 || Math.abs(this.dustPositions[idx]) > 6.5 || Math.abs(this.dustPositions[idx + 2]) > 6.5) {
          this.dustPositions[idx] = (Math.random() - 0.5) * 12;
          this.dustPositions[idx + 1] = 0.2;
          this.dustPositions[idx + 2] = (Math.random() - 0.5) * 12;
          this.dustVelocities[idx] = (Math.random() - 0.5) * 0.1;
          this.dustVelocities[idx + 1] = Math.random() * 0.05 + 0.01;
          this.dustVelocities[idx + 2] = (Math.random() - 0.5) * 0.1;
        }

        // Gentle swaying
        this.dustPositions[idx] += Math.sin(time * 0.5 + i * 0.1) * 0.003;
      }
      (this.dustParticles.geometry.attributes.position as Float32BufferAttribute).needsUpdate = true;
    }

    // Lightning flashes
    this.lightningTimer += delta;
    if (this.lightningTimer >= this.nextLightningTime) {
      this.lightningTimer = 0;
      this.nextLightningTime = 8 + Math.random() * 15;
      this.lightningFlash = 0.5;
    }

    if (this.lightningFlash > 0) {
      this.lightningFlash -= delta * 3;
      // Flash ambient lighting up briefly
      for (const light of this.sconceLights) {
        light.intensity += this.lightningFlash * 5;
      }
    }
  }
}
