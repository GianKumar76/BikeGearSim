/**
 * Physics Engine for Road Bike Simulation with 3 Effort Levels (Leicht / Normal: 27 km/h / Stark)
 */

import { WHEEL_CIRCUMFERENCE_M } from './drivetrain.js';

export const EFFORT_LEVELS = [
  { id: 'leicht', name: 'Leicht', watts: 110, color: '#00ffc8', icon: '🟢', desc: 'Locker pedalieren (~20 km/h)' },
  { id: 'normal', name: 'Normal', watts: 165, color: '#00e5ff', icon: '🔵', desc: 'Standardausdauer (~27 km/h)' },
  { id: 'stark', name: 'Stark', watts: 280, color: '#ff3366', icon: '🔴', desc: 'Druck am Berg & Zielsprint' }
];

export class BikePhysics {
  constructor() {
    // Rider & Bike parameters
    this.riderMassKg = 72;
    this.bikeMassKg = 8;
    this.totalMass = this.riderMassKg + this.bikeMassKg; // 80 kg
    this.rotationalMass = 2.0; // Wheel inertia equivalent
    
    this.cdA = 0.35; // Calibrated for ~27 km/h at 165W normal mode on flat
    this.crr = 0.004; // Rolling resistance coefficient
    this.airDensity = 1.225; // kg/m^3 at sea level
    this.g = 9.81; // m/s^2
    this.drivetrainEfficiency = 0.975; // 97.5% efficient

    // Effort Level State (Leicht = 0, Normal = 1, Stark = 2)
    this.effortIndex = 1; // Default: Normal (165W -> ~27 km/h)
    this.targetPowerWatts = EFFORT_LEVELS[1].watts;
    
    this.speedKmh = 27.0; // Initial speed in km/h
    this.speedMs = this.speedKmh / 3.6; // Speed in m/s
    this.distanceMeters = 0;
    this.gradePercent = 0.0; // Slope in %
    this.isBraking = false;
    this.isCoasting = false;
    
    // Cadence
    this.cadenceRpm = 90;
    this.torqueNm = 0;
  }

  // Cycle effort levels: Normal -> Stark -> Leicht -> Normal...
  cycleEffort() {
    this.effortIndex = (this.effortIndex + 1) % EFFORT_LEVELS.length;
    this.targetPowerWatts = EFFORT_LEVELS[this.effortIndex].watts;
    return this.currentEffort;
  }

  setEffort(indexOrId) {
    if (typeof indexOrId === 'string') {
      const foundIdx = EFFORT_LEVELS.findIndex(e => e.id === indexOrId);
      if (foundIdx !== -1) this.effortIndex = foundIdx;
    } else if (typeof indexOrId === 'number') {
      this.effortIndex = Math.max(0, Math.min(EFFORT_LEVELS.length - 1, indexOrId));
    }
    this.targetPowerWatts = EFFORT_LEVELS[this.effortIndex].watts;
    return this.currentEffort;
  }

  get currentEffort() {
    return EFFORT_LEVELS[this.effortIndex];
  }

  // Adjust rider power directly (if needed)
  setPower(watts) {
    this.targetPowerWatts = Math.max(0, Math.min(800, watts));
  }

  setGrade(grade) {
    this.gradePercent = grade;
  }

  setBraking(isBraking) {
    this.isBraking = isBraking;
  }

  // Core physics simulation tick
  update(dtSec, gearRatio) {
    // Sub-step large deltas for numerical stability
    const maxSubStep = 0.033; // ~30 FPS sub-step
    let remainingDt = Math.min(dtSec, 1.0);

    while (remainingDt > 0) {
      const dt = Math.min(remainingDt, maxSubStep);
      remainingDt -= dt;
      this.step(dt, gearRatio);
    }

    return this.getState(gearRatio);
  }

  step(dt, gearRatio) {
    const theta = Math.atan(this.gradePercent / 100);
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);

    // 1. Gravity Force (positive when climbing, negative when descending)
    const fGravity = this.totalMass * this.g * sinTheta;

    // 2. Rolling Resistance Force
    const fRolling = this.totalMass * this.g * cosTheta * this.crr;

    // 3. Aerodynamic Drag Force
    const fAir = 0.5 * this.airDensity * this.cdA * Math.pow(this.speedMs, 2);

    // Total resistance
    const fResist = fGravity + fRolling + fAir;

    // 4. Rider Propulsive Force
    let fPropulsive = 0;
    const effectivePower = (this.isBraking || this.isCoasting) ? 0 : this.targetPowerWatts;

    if (effectivePower > 0) {
      // Propulsive force = (Power * efficiency) / speed, with low-speed clamp
      const effectiveSpeed = Math.max(this.speedMs, 1.2);
      fPropulsive = (effectivePower * this.drivetrainEfficiency) / effectiveSpeed;
    }

    // 5. Braking Force
    let fBrake = 0;
    if (this.isBraking) {
      fBrake = 180; // Strong controlled deceleration
    }

    // Additional low-speed mechanical drag when coasting (wheel hub & seal friction)
    let fFriction = 0;
    if (effectivePower <= 0 && this.speedMs > 0) {
      fFriction = 4.0; // 4N mechanical coasting friction
    }

    // Net force
    let fNet = fPropulsive - fResist - fBrake - fFriction;

    // Acceleration (m/s^2)
    const effectiveMass = this.totalMass + this.rotationalMass;
    const accel = fNet / effectiveMass;

    // Speed integration
    let newSpeedMs = this.speedMs + accel * dt;
    if (effectivePower <= 0 && (newSpeedMs <= 0.05 || (newSpeedMs < 0.35 && this.gradePercent >= -0.2))) {
      newSpeedMs = 0;
    }
    this.speedMs = Math.max(0, newSpeedMs);
    this.speedKmh = this.speedMs * 3.6;

    // Distance integration (only when actually moving)
    if (this.speedMs > 0) {
      this.distanceMeters += this.speedMs * dt;
    }

    // 6. Cadence Calculation (Freewheel: 0 RPM when coasting, braking or 0W!)
    const developmentM = gearRatio * WHEEL_CIRCUMFERENCE_M;
    const isActivelyPedaling = (!this.isBraking && !this.isCoasting && this.targetPowerWatts > 0);

    if (isActivelyPedaling && this.speedMs > 0.05 && developmentM > 0) {
      this.cadenceRpm = (this.speedMs / developmentM) * 60;
    } else {
      this.cadenceRpm = 0;
    }

    // Torque on pedals (Nm)
    if (this.cadenceRpm > 5 && effectivePower > 0) {
      const cadenceRadS = (this.cadenceRpm * 2 * Math.PI) / 60;
      this.torqueNm = effectivePower / cadenceRadS;
    } else {
      this.torqueNm = 0;
    }
  }

  getState(gearRatio) {
    const developmentM = gearRatio * WHEEL_CIRCUMFERENCE_M;
    return {
      speedKmh: this.speedKmh,
      speedMs: this.speedMs,
      cadenceRpm: this.cadenceRpm,
      targetPowerWatts: this.targetPowerWatts,
      gradePercent: this.gradePercent,
      distanceMeters: this.distanceMeters,
      torqueNm: this.torqueNm,
      developmentM: developmentM,
      isBraking: this.isBraking
    };
  }

  reset(initialSpeedKmh = 30) {
    this.speedKmh = initialSpeedKmh;
    this.speedMs = initialSpeedKmh / 3.6;
    this.distanceMeters = 0;
    this.gradePercent = 0.0;
    this.isBraking = false;
    this.isCoasting = false;
    this.cadenceRpm = 90;
    this.torqueNm = 0;
  }
}
