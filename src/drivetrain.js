/**
 * Drivetrain Model for 2x11 Shimano Road Bike System
 * Front: 2 Chainrings (Compact 50/34T or Semi-Compact 52/36T)
 * Rear: 11-speed Cassette (11-30T: 11, 12, 13, 14, 15, 17, 19, 21, 24, 27, 30)
 */

export const CHAINRING_PRESETS = {
  compact: { name: 'Kompakt (50/34T)', rings: [34, 50] },
  semicompact: { name: 'Semi-Kompakt (52/36T)', rings: [36, 52] },
  standard: { name: 'Standard (53/39T)', rings: [39, 53] }
};

export const CASSETTE_PRESETS = {
  '11-30': { name: 'Shimano 11-30T (Allround)', sprockets: [11, 12, 13, 14, 15, 17, 19, 21, 24, 27, 30] },
  '11-32': { name: 'Shimano 11-32T (Berg)', sprockets: [11, 12, 13, 14, 16, 18, 20, 22, 25, 28, 32] },
  '11-28': { name: 'Shimano 11-28T (Race)', sprockets: [11, 12, 13, 14, 15, 17, 19, 21, 23, 25, 28] }
};

export const WHEEL_CIRCUMFERENCE_M = 2.122; // 700x28c Reifen

export class Drivetrain {
  constructor(crPreset = 'compact', casPreset = '11-30') {
    this.chainrings = [...CHAINRING_PRESETS[crPreset].rings]; // [34, 50]
    this.cassette = [...CASSETTE_PRESETS[casPreset].sprockets]; // [11..30]
    
    // Initial state: Big chainring (index 1 = 50T), middle-easy sprocket (index 4 = 15T)
    this.frontIndex = 1; // 0 = Small (34T), 1 = Big (50T)
    this.rearIndex = 4;  // 0 = 11T (hardest/smallest) ... 10 = 30T (easiest/biggest)
    
    this.lastShiftTime = 0;
    this.lastShiftType = null; // 'front_up', 'front_down', 'rear_easier', 'rear_harder'
  }

  // --- Left STI Shifter (Front Derailleur) ---
  // Q / Big Lever Swing: Shift UP to Big Chainring (e.g. 34 -> 50)
  shiftFrontUp(isMoving = true) {
    if (this.frontIndex < this.chainrings.length - 1) {
      this.frontIndex++;
      this.lastShiftTime = performance.now();
      this.lastShiftType = 'front_up';
      return { 
        shifted: true, 
        wasStationary: !isMoving, 
        type: 'front_up', 
        from: this.chainrings[0], 
        to: this.chainrings[1] 
      };
    }
    return { shifted: false, reason: 'already_big' };
  }

  // A / Small Release Paddle: Shift DOWN to Small Chainring (e.g. 50 -> 34)
  shiftFrontDown(isMoving = true) {
    if (this.frontIndex > 0) {
      this.frontIndex--;
      this.lastShiftTime = performance.now();
      this.lastShiftType = 'front_down';
      return { 
        shifted: true, 
        wasStationary: !isMoving, 
        type: 'front_down', 
        from: this.chainrings[1], 
        to: this.chainrings[0] 
      };
    }
    return { shifted: false, reason: 'already_small' };
  }

  // --- Right STI Shifter (Rear Derailleur) ---
  // Ü / Big Lever Swing: Shift to BIGGER Sprocket (Easier / Leichter / Berg-Gang)
  shiftRearEasier(isMoving = true) {
    if (this.rearIndex < this.cassette.length - 1) {
      const prev = this.cassette[this.rearIndex];
      this.rearIndex++;
      this.lastShiftTime = performance.now();
      this.lastShiftType = 'rear_easier';
      return { 
        shifted: true, 
        wasStationary: !isMoving, 
        type: 'rear_easier', 
        from: prev, 
        to: this.cassette[this.rearIndex] 
      };
    }
    return { shifted: false, reason: 'already_easiest' };
  }

  // Ä / Small Release Paddle: Shift to SMALLER Sprocket (Harder / Schwerer / Sprint / Abfahrt)
  shiftRearHarder(isMoving = true) {
    if (this.rearIndex > 0) {
      const prev = this.cassette[this.rearIndex];
      this.rearIndex--;
      this.lastShiftTime = performance.now();
      this.lastShiftType = 'rear_harder';
      return { 
        shifted: true, 
        wasStationary: !isMoving, 
        type: 'rear_harder', 
        from: prev, 
        to: this.cassette[this.rearIndex] 
      };
    }
    return { shifted: false, reason: 'already_hardest' };
  }

  get frontTeeth() {
    return this.chainrings[this.frontIndex];
  }

  get rearTeeth() {
    return this.cassette[this.rearIndex];
  }

  // Gear Ratio (z.B. 50 / 11 = 4.55)
  get gearRatio() {
    return this.frontTeeth / this.rearTeeth;
  }

  // Entfaltung in Metern pro Pedalumdrehung
  get developmentMeters() {
    return this.gearRatio * WHEEL_CIRCUMFERENCE_M;
  }

  // Tolerantes Kettenschräglauf-Modell (Grün / Gelb / Rot)
  // Returns: { level: 'ok'|'warning'|'severe', color: string, name: string, message: string }
  getCrossChainingInfo() {
    const isBigRing = this.frontIndex === 1;
    const isSmallRing = this.frontIndex === 0;
    const totalRear = this.cassette.length; // 11

    // 1. Severe Cross-Chaining (🔴 Rot - Nur die extremsten 2 Gänge)
    // Groß-Groß: 50x27, 50x30
    if (isBigRing && this.rearIndex >= totalRear - 2) {
      return {
        level: 'severe',
        color: '#ff3366',
        name: 'Groß-Groß (Kettenschräglauf)',
        message: 'Starker Schräglauf (Großes Blatt + großes Ritzel). Auf kleines Kettenblatt schalten.',
        bad: true,
        angleOffset: (this.rearIndex - (totalRear - 3)) * 1.5
      };
    }

    // Klein-Klein: 34x11, 34x12
    if (isSmallRing && this.rearIndex <= 1) {
      return {
        level: 'severe',
        color: '#ff3366',
        name: 'Klein-Klein (Kettenschräglauf)',
        message: 'Starker Schräglauf (Kleines Blatt + kleinstes Ritzel). Auf großes Kettenblatt schalten.',
        bad: true,
        angleOffset: -(2 - this.rearIndex) * 1.5
      };
    }

    // 2. Moderate Cross-Chaining (🟡 Gelb - Leichter Schräglauf, im Modell toleriert)
    // 50x21, 50x24 oder 34x13, 34x14
    if ((isBigRing && (this.rearIndex === totalRear - 3 || this.rearIndex === totalRear - 4)) ||
        (isSmallRing && (this.rearIndex === 2 || this.rearIndex === 3))) {
      return {
        level: 'warning',
        color: '#ffbb00',
        name: 'Leichter Schräglauf',
        message: 'Leichter Kettenschräglauf (noch fahrbar, aber bald Kettenblatt anpassen).',
        bad: false,
        angleOffset: isBigRing ? 0.8 : -0.8
      };
    }

    // 3. Optimal Straight Chainline (🟢 Grün)
    return {
      level: 'ok',
      color: '#00ffc8',
      name: 'Gerade Kettenlinie',
      message: 'Optimale Kettenlinie ohne nennenswerte Reibungsverluste.',
      bad: false,
      angleOffset: 0
    };
  }

  // Get current gear string, e.g. "50 / 17 Z"
  getGearString() {
    return `${this.frontTeeth} × ${this.rearTeeth}`;
  }

  // Summary object for HUD
  getState() {
    const cross = this.getCrossChainingInfo();
    return {
      frontIndex: this.frontIndex,
      rearIndex: this.rearIndex,
      frontTeeth: this.frontTeeth,
      rearTeeth: this.rearTeeth,
      chainrings: this.chainrings,
      cassette: this.cassette,
      gearRatio: this.gearRatio,
      development: this.developmentMeters,
      gearString: this.getGearString(),
      crossChaining: cross,
      isBigRing: this.frontIndex === 1,
      rearPositionFraction: this.rearIndex / (this.cassette.length - 1)
    };
  }
}
