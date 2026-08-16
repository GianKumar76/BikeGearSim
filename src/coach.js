/**
 * Pro-Coach Autopilot / Trainer Demonstration Mode
 * Flawless masterclass autopilot: 0 errors guaranteed, anticipatory strategy, adaptive power, and beginner-friendly commentary.
 */

export class TrainerCoach {
  constructor(app) {
    this.app = app;
    this.isActive = false;
    this.lastShiftTime = 0;
    this.minShiftIntervalSec = 0.5; // Swift and responsive
    this.currentComment = 'Trainer bereit: Starte die Demonstration, um die ideale Schaltstrategie zu sehen.';
  }

  start() {
    this.isActive = true;
    this.lastShiftTime = 0;
    this.currentComment = '🚴‍♂️ Coach übernimmt: Schau dir an, wie vorausschauend geschaltet und die Kraft angepasst wird!';
  }

  stop() {
    this.isActive = false;
  }

  update(dtSec, physState, dtState, routeState) {
    if (!this.isActive || !this.app.isRunning || this.app.isPaused) return;

    const { distanceMeters, speedKmh, cadenceRpm } = physState;
    const { frontIndex, rearIndex } = dtState;
    const { scenario, grade, isStop } = routeState;
    const now = this.app.sessionTimeSec;

    const canShift = (now - this.lastShiftTime) >= this.minShiftIntervalSec;

    // --- 0. Initial Flat Section (0m - 250m) ---
    if (distanceMeters < 250) {
      if (this.app.physics.effortIndex !== 1 && canShift) {
        this.app.setEffortLevel('normal');
      }

      // Ensure big ring on flat
      if (frontIndex === 0 && canShift) {
        this.setComment('⚙️ "Ich schalte vorne aufs große Kettenblatt, um auf der Geraden zügig und effizient zu rollen."');
        this.app.shiftFrontUp();
        this.lastShiftTime = now;
        return;
      }

      // Keep cadence in the sweetspot (85-95 RPM) with 50x17, 50x15, 50x14
      if (frontIndex === 1 && canShift) {
        if (cadenceRpm > 93 && rearIndex > 3) {
          this.setComment('⚡ "Ich beschleunige und schalte hinten langsam auf die kleineren Ritzel, um schneller zu werden."');
          this.app.shiftRearHarder();
          this.lastShiftTime = now;
          return;
        } else if (cadenceRpm < 82 && rearIndex < 6) {
          this.setComment('⚡ "Ich trete etwas zu schwer – ich schalte hinten einen Gang leichter."');
          this.app.shiftRearEasier();
          this.lastShiftTime = now;
          return;
        }
      }
      return;
    }

    // --- 1. Approaching Red Light (250m - 348m) ---
    if (distanceMeters >= 250 && distanceMeters < 348 && !this.app.redLightCleared) {
      // Ease off pedals and downshift as speed drops below 22 km/h
      if (speedKmh <= 22) {
        if (frontIndex === 1 && canShift) {
          this.setComment('🚦 "Da gleich die Ampel kommt und ich anhalten muss, schalte ich schon jetzt vorne aufs kleine Kettenblatt."');
          this.app.shiftFrontDown();
          this.lastShiftTime = now;
          return;
        } else if (frontIndex === 0 && rearIndex < 7 && canShift) {
          this.setComment('🚦 "Und hinten schalte ich auf ein größeres Ritzel, damit ich nach dem Halt ganz leicht anfahren kann."');
          this.app.shiftRearEasier();
          this.lastShiftTime = now;
          return;
        }
      } else {
        this.setComment('🚦 "Ampel voraus: Ich nehme Druck von den Pedalen und lasse das Rad ausrollen."');
      }
      return;
    }

    // Standing at red light
    if (this.app.isStandingAtRedLight || isStop) {
      this.setComment('🚦 "Ich stehe bei Rot. Weil ich rechtzeitig heruntergeschaltet habe, kann ich gleich mühelos anfahren."');
      return;
    }

    // --- 2. Green Light Acceleration (350m - 460m) ---
    if (this.app.redLightCleared && distanceMeters >= 350 && distanceMeters < 460) {
      if (this.app.physics.effortIndex !== 1 && canShift) {
        this.app.setEffortLevel('normal');
      }

      if (frontIndex === 0) {
        if (cadenceRpm > 92 && rearIndex > 5 && canShift) {
          this.setComment('⚡ "Die Ampel ist grün! Ich fahre an und schalte beim Beschleunigen hinten langsam hoch."');
          this.app.shiftRearHarder();
          this.lastShiftTime = now;
          return;
        } else if (speedKmh >= 21 && canShift) {
          this.setComment('⚙️ "Ich werde schneller: Jetzt schalte ich vorne aufs große Kettenblatt, um Tempo für die Brücke aufzubauen."');
          this.app.shiftFrontUp();
          this.lastShiftTime = now;
          return;
        }
      } else if (frontIndex === 1 && canShift) {
        if (cadenceRpm > 95 && rearIndex > 3) {
          this.app.shiftRearHarder();
          this.lastShiftTime = now;
          return;
        }
      }
      return;
    }

    // --- 3. Bridge Ramp (+8% on 50m: 460m - 560m) ---
    if (scenario === 'bridge_ramp' || (distanceMeters >= 460 && distanceMeters < 560)) {
      if (distanceMeters < 485) {
        this.setComment('🌉 "Ich nehme viel Schwung auf dem großen Kettenblatt mit in die Brückenrampe."');
      } else if (distanceMeters >= 485 && distanceMeters <= 535) {
        if (frontIndex === 1 && canShift) {
          this.setComment('🌉 "Jetzt lässt der Schwung nach: Ich schalte nur vorne mit einem Klick aufs kleine Kettenblatt – hinten brauche ich gar nicht schalten!"');
          this.app.shiftFrontDown();
          this.lastShiftTime = now;
          return;
        }
      } else if (distanceMeters > 535) {
        if (frontIndex === 0 && speedKmh > 24 && canShift) {
          this.setComment('💨 "Auf der kurzen Abfahrt schalte ich vorne direkt wieder aufs große Kettenblatt."');
          this.app.shiftFrontUp();
          this.lastShiftTime = now;
          return;
        }
      }
      return;
    }

    // --- 4. Rolling Hills (560m - 720m) ---
    if (scenario === 'rolling') {
      if (frontIndex === 0 && speedKmh > 23 && canShift) {
        this.app.shiftFrontUp();
        this.lastShiftTime = now;
        return;
      }

      if (frontIndex === 1 && canShift) {
        if (cadenceRpm < 82 && rearIndex < 6) {
          this.setComment('⚡ "Auf der Welle schalte ich hinten einen Gang leichter, um flüssig zu treten."');
          this.app.shiftRearEasier();
          this.lastShiftTime = now;
          return;
        } else if (cadenceRpm > 98 && rearIndex > 3) {
          this.setComment('⚡ "In der Senke schalte ich hinten wieder einen Gang schwerer."');
          this.app.shiftRearHarder();
          this.lastShiftTime = now;
          return;
        }
      }
      return;
    }

    // --- 5. Steep Climb (+9% to +13.5%: 720m - 1080m) ---
    if (distanceMeters >= 720 && distanceMeters < 1080) {
      // Switch effort to STARK (280W) on the steep mountain
      if (this.app.physics.effortIndex !== 2 && canShift) {
        this.setComment('⛰️ "Jetzt kommt der steile Berg: Ich erhöhe die Kraft auf Stark, damit ich den Anstieg schaffe!"');
        this.app.setEffortLevel('stark');
        this.lastShiftTime = now;
        return;
      }

      // Early shift to 34T small ring
      if (frontIndex === 1 && canShift) {
        this.setComment('⛰️ "Am Berg schalte ich vorne sofort aufs kleine Kettenblatt, um die Beine zu schonen."');
        this.app.shiftFrontDown();
        this.lastShiftTime = now;
        return;
      }

      // Shift to easiest rear cogs (24T -> 27T -> 30T)
      if (frontIndex === 0 && canShift) {
        if (cadenceRpm < 86 && rearIndex < 10) {
          this.setComment('⛰️ "Es wird noch steiler: Ich schalte hinten schrittweise auf die größten Berggänge."');
          this.app.shiftRearEasier();
          this.lastShiftTime = now;
          return;
        }
      }
      return;
    }

    // --- 6. Summit Transition & Steep Descent (1080m - 1350m) ---
    if (distanceMeters >= 1080 && distanceMeters < 1350) {
      if (this.app.physics.effortIndex === 2 && canShift) {
        this.app.setEffortLevel('normal');
      }

      // Over the summit: shift rear down from 30T/27T to 19T first, then shift front up to 50T!
      if (frontIndex === 0 && rearIndex >= 6 && canShift) {
        this.app.shiftRearHarder();
        this.lastShiftTime = now;
        return;
      }

      // Shift to big ring 50T once rear is on 19T/17T
      if (frontIndex === 0 && rearIndex <= 5 && canShift) {
        this.setComment('🚀 "Es geht bergab: Ich schalte vorne aufs große Kettenblatt, um mitzutreten."');
        this.app.shiftFrontUp();
        this.lastShiftTime = now;
        return;
      }

      // Shift rear down progressively as speed increases
      if (frontIndex === 1 && canShift) {
        if (speedKmh > 32 && rearIndex > 4) {
          this.app.shiftRearHarder();
          this.lastShiftTime = now;
          return;
        } else if (speedKmh > 42 && rearIndex > 2) {
          this.app.shiftRearHarder();
          this.lastShiftTime = now;
          return;
        } else if (speedKmh > 52 && rearIndex > 0) {
          this.setComment('🚀 "Sehr hohes Tempo: Ich schalte hinten auf die kleinsten Ritzel, damit ich nicht ins Leere trete."');
          this.app.shiftRearHarder();
          this.lastShiftTime = now;
          return;
        }
      }
      return;
    }

    // --- 7. Sprint / Finish Line (1350m - 1600m) ---
    if (distanceMeters >= 1350) {
      // Maximum effort for the final sprint
      if (this.app.physics.effortIndex !== 2 && canShift) {
        this.setComment('🔥 "Endspurt! Ich gebe nochmal alles mit voller Kraft (Stark)!"');
        this.app.setEffortLevel('stark');
        this.lastShiftTime = now;
        return;
      }

      if (frontIndex === 0 && canShift) {
        this.app.shiftFrontUp();
        this.lastShiftTime = now;
        return;
      }

      // In sprint on +1.5% to +2.5%, keep 50x14 (rearIndex 3) or 50x13 (rearIndex 2)
      if (frontIndex === 1 && canShift) {
        if (cadenceRpm > 98 && rearIndex > 2) {
          this.setComment('🏁 "Ich schalte in die schwersten Gänge für maximales Tempo auf der Ziellinie!"');
          this.app.shiftRearHarder();
          this.lastShiftTime = now;
          return;
        } else if (cadenceRpm < 82 && rearIndex < 4) {
          this.app.shiftRearEasier();
          this.lastShiftTime = now;
          return;
        }
      }
      return;
    }

    // --- 8. Fallback Cadence Management ---
    if (canShift && speedKmh > 15) {
      if (frontIndex === 0 && rearIndex <= 2) {
        this.app.shiftFrontUp();
        this.lastShiftTime = now;
      } else if (frontIndex === 1 && rearIndex >= 9) {
        this.app.shiftFrontDown();
        this.lastShiftTime = now;
      } else if (cadenceRpm < 78 && rearIndex < 7) {
        this.setComment('⚡ "Ich trete etwas zu schwer – ich schalte hinten einen Gang leichter."');
        this.app.shiftRearEasier();
        this.lastShiftTime = now;
      } else if (cadenceRpm > 100 && rearIndex > 2) {
        this.setComment('⚡ "Ich trete etwas zu schnell – ich schalte hinten einen Gang schwerer."');
        this.app.shiftRearHarder();
        this.lastShiftTime = now;
      }
    }
  }

  setComment(text) {
    this.currentComment = text;
  }
}
