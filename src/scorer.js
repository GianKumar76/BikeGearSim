/**
 * Real-time Shifting Scorer & Live Coaching Evaluator
 * Evaluates cadence, cross-chaining, traffic light behavior, and accumulates session errors.
 * Goal: 0 Mistakes (0 Fehler).
 */

export class ShiftingScorer {
  constructor(soundManager) {
    this.sound = soundManager;
    
    // Live feedback state
    this.status = 'green'; // 'green' | 'yellow' | 'red'
    this.feedbackMessage = 'Bereit zur Fahrt. Finde deine optimale Trittfrequenz (85-95 RPM).';
    this.adviceAction = 'normal'; // 'none' | 'shift_easier' | 'shift_harder' | 'shift_front_small' | 'shift_front_big'
    
    // Error tracking
    this.errorCount = 0;
    this.errorLog = [];
    
    // Continuous time accumulation
    this.timeGreenSec = 0;
    this.timeYellowSec = 0;
    this.timeRedSec = 0;
    this.totalActiveTimeSec = 0;

    // Timers for sustained errors to prevent instant false triggers
    this.grindDuration = 0;
    this.spinDuration = 0;
    this.crossChainDuration = 0;
    this.hasTrafficLightErrorChecked = false;
  }

  reset() {
    this.status = 'green';
    this.feedbackMessage = 'Finde deinen Rhythmus (85-95 RPM).';
    this.adviceAction = 'none';
    this.errorCount = 0;
    this.errorLog = [];
    this.timeGreenSec = 0;
    this.timeYellowSec = 0;
    this.timeRedSec = 0;
    this.totalActiveTimeSec = 0;
    this.grindDuration = 0;
    this.spinDuration = 0;
    this.crossChainDuration = 0;
    this.hasTrafficLightErrorChecked = false;
  }

  evaluate(dtSec, physicsState, drivetrainState, routeState) {
    if (dtSec <= 0) return;
    this.totalActiveTimeSec += dtSec;

    const { speedKmh, cadenceRpm, targetPowerWatts, isBraking } = physicsState;
    const { frontIndex, rearIndex, gearRatio, crossChaining, frontTeeth, rearTeeth } = drivetrainState;
    const { time, isStop, scenario, lightState } = routeState;

    let currentStatus = 'green';
    let message = '🟢 Perfekter Tritt & optimale Übersetzung';
    let action = 'none';

    // 1. Check Traffic Light Special Condition
    if (scenario === 'traffic_light') {
      if (isStop || speedKmh < 3.0) {
        // Red light standing
        const isHeavyGear = gearRatio > 2.8; // e.g. 50x17, 50x15, 50x11
        if (isHeavyGear) {
          currentStatus = 'yellow';
          message = '🚦 Stillstand bei Rot! Im Stand kann nicht geschaltet werden. Du musst in diesem Gang anfahren.';
          action = 'none';
        } else {
          currentStatus = 'green';
          message = `🚦 Guter Anfahrgang gewählt (${frontTeeth}×${rearTeeth}). Bereit für Grün!`;
        }
      }

      // Check the moment light turns green and rider starts moving
      if (lightState === 'green' && speedKmh > 1.0 && !this.hasTrafficLightErrorChecked) {
        if (gearRatio > 2.8) {
          this.recordError(this.totalActiveTimeSec, 'Ampel-Anfahrfehler', `Im dicken Gang (${frontTeeth}×${rearTeeth}) angefahren! Nicht rechtzeitig vor dem Stillstand heruntergeschaltet.`);
          this.hasTrafficLightErrorChecked = true;
          currentStatus = 'red';
          message = '🔴 Fehler: Im dicken Gang angefahren! Vor dem Halt immer herunterschalten.';
        } else {
          this.hasTrafficLightErrorChecked = true;
        }
      }
    }

    // Special Bridge Ramp Handling (Schwung mitnehmen, am Ende nur vorne auf 34T schalten)
    if (scenario === 'bridge_ramp') {
      if (frontIndex === 0) {
        if (currentStatus === 'green') {
          message = `🟢 Perfekter Blattwechsel auf 34T (${frontTeeth}×${rearTeeth})! Schwung über die Rampe gerettet.`;
          action = 'none';
        }
      } else if (frontIndex === 1 && speedKmh < 24 && routeState.grade > 5.0) {
        message = '🌉 Schwung lässt nach: Jetzt vorne auf das kleine 34er Blatt schalten (A-Taste)!';
        action = 'shift_front_small';
        if (cadenceRpm < 70) {
          currentStatus = 'yellow';
        }
      }
    }

    // 2. Check Severe Cross-Chaining (Kettenschräglauf)
    if (crossChaining.level === 'severe') {
      this.crossChainDuration += dtSec;
      if (this.crossChainDuration > 6.0) {
        this.recordError(this.totalActiveTimeSec, 'Kettenschräglauf', `Extremer Schräglauf auf ${frontTeeth}×${rearTeeth}. Verschleiß & Reibungsverlust.`);
        this.crossChainDuration = 0;
      }
      currentStatus = 'red';
      message = `🔴 ${crossChaining.name}: ${crossChaining.message}`;
      action = frontIndex === 1 ? 'shift_front_small' : 'shift_front_big';
    } else if (crossChaining.level === 'warning') {
      this.crossChainDuration = 0;
      if (currentStatus === 'green') {
        currentStatus = 'yellow';
        message = `🟡 ${crossChaining.name}: Bald Blatt wechseln (${frontTeeth}×${rearTeeth}).`;
      }
    } else {
      this.crossChainDuration = 0;
    }

    // 3. Check Cadence / Pedaling Efficiency
    // Note: Temporary deviations during acceleration (<20 km/h) or short kickers (<6.0s) are NOT penalized!
    if (speedKmh > 2.0 && !isBraking) {
      const isAcceleratingFromLowSpeed = speedKmh < 20.0 && gearRatio <= 2.8;

      const isSteepClimb = routeState.grade > 7.0 && frontIndex === 0;
      const minSweetspot = isSteepClimb ? 60 : 70;

      if (cadenceRpm < (minSweetspot - 5) && targetPowerWatts > 50) {
        if (isAcceleratingFromLowSpeed) {
          // Grace period: Normal acceleration from standstill / slow speed
          this.grindDuration = 0;
          if (currentStatus === 'green') {
            currentStatus = 'yellow';
            message = `🟡 Beschleunigen (${Math.round(speedKmh)} km/h)... Trittfrequenz zügig aufbauen.`;
            action = 'none';
          }
        } else {
          // Grinding under load: Only log error if sustained > 6.0 seconds (gives ample time to react and downshift)
          this.grindDuration += dtSec;
          if (this.grindDuration > 6.0) {
            this.recordError(this.totalActiveTimeSec, 'Dauerhaftes Würgen am Berg', `Über 6,0s bei ${Math.round(cadenceRpm)} RPM unter Last getreten (${frontTeeth}×${rearTeeth}).`);
            this.grindDuration = 0;
          }
          currentStatus = this.grindDuration > 3.0 ? 'red' : 'yellow';
          message = `⚠️ Trittfrequenz niedrig (${Math.round(cadenceRpm)} RPM). Runterschalten (Ü) oder kleines Blatt (A).`;
          action = frontIndex === 1 && routeState.grade > 5 ? 'shift_front_small' : 'shift_easier';
        }
      } else if (cadenceRpm > 115 && speedKmh > 12) {
        // Spinning out: Only log error if sustained > 5.0 seconds
        this.spinDuration += dtSec;
        if (this.spinDuration > 5.0) {
          this.recordError(this.totalActiveTimeSec, 'Überdrehen im leichten Gang', `Überdrehen bei ${Math.round(cadenceRpm)} RPM (${frontTeeth}×${rearTeeth}).`);
          this.spinDuration = 0;
        }
        currentStatus = this.spinDuration > 2.5 ? 'red' : 'yellow';
        message = `⚠️ Trittfrequenz sehr hoch (${Math.round(cadenceRpm)} RPM). Hochschalten (Ä) oder großes Blatt (Q).`;
        action = frontIndex === 0 && routeState.grade < 0 ? 'shift_front_big' : 'shift_harder';
      } else if ((cadenceRpm >= (minSweetspot - 10) && cadenceRpm < minSweetspot) || (cadenceRpm > 102 && cadenceRpm <= 112)) {
        // Yellow zone: Normal temporary variation, 0 penalty
        this.grindDuration = 0;
        this.spinDuration = 0;
        if (currentStatus === 'green') {
          currentStatus = 'yellow';
          if (cadenceRpm < minSweetspot) {
            message = `🟡 Trittfrequenz leicht niedrig (${Math.round(cadenceRpm)} RPM). 1 Gang leichter (Ü) empfohlen.`;
            action = 'shift_easier';
          } else {
            message = `🟡 Trittfrequenz leicht hoch (${Math.round(cadenceRpm)} RPM). 1 Gang schwerer (Ä) empfohlen.`;
            action = 'shift_harder';
          }
        }
      } else if (cadenceRpm >= minSweetspot && cadenceRpm <= 102) {
        // Green Sweetspot
        this.grindDuration = 0;
        this.spinDuration = 0;
        if (currentStatus === 'green') {
          message = `🟢 Optimale Trittfrequenz (${Math.round(cadenceRpm)} RPM) im Sweetspot.`;
          action = 'none';
        }
      }
    }

    // Accumulate time in zones
    this.status = currentStatus;
    this.feedbackMessage = message;
    this.adviceAction = action;

    if (currentStatus === 'green') this.timeGreenSec += dtSec;
    else if (currentStatus === 'yellow') this.timeYellowSec += dtSec;
    else if (currentStatus === 'red') this.timeRedSec += dtSec;

    return {
      status: this.status,
      message: this.feedbackMessage,
      action: this.adviceAction,
      errorCount: this.errorCount
    };
  }

  recordStationaryShiftPenalty(timeSec, gearString) {
    this.status = 'yellow';
    this.feedbackMessage = `⚠️ Im Stand geschaltet (+1 Fehler): Hinterrad angehoben! Schalte in Zukunft rechtzeitig vor dem Halt herunter.`;
    const actualTime = (typeof timeSec === 'number' && !isNaN(timeSec)) ? timeSec : this.totalActiveTimeSec;
    this.recordError(actualTime, 'Im Stand geschaltet', `Hinterrad angehoben, um im Stand auf ${gearString} zu schalten. Vorausschauend vor dem Halt schalten!`);
  }

  recordError(timeSec, title, description) {
    this.errorCount++;
    this.sound.playWarningBeep();
    const actualTime = (typeof timeSec === 'number' && !isNaN(timeSec)) ? timeSec : this.totalActiveTimeSec;
    const formattedTime = this.formatTime(actualTime);
    this.errorLog.push({
      id: Date.now() + Math.random(),
      timeSec: actualTime,
      timeFormatted: formattedTime,
      title: title,
      description: description
    });
  }

  formatTime(sec) {
    if (typeof sec !== 'number' || isNaN(sec)) {
      sec = 0;
    }
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  getSummary() {
    const total = Math.max(0.1, this.totalActiveTimeSec);
    const greenPercent = Math.round((this.timeGreenSec / total) * 100);
    const yellowPercent = Math.round((this.timeYellowSec / total) * 100);
    const redPercent = Math.round((this.timeRedSec / total) * 100);

    let rankTitle = 'WorldTour Profi';
    let rankSubtitle = 'Perfekte Schaltstrategie & meisterhafter Rhythmus!';
    let badgeClass = 'rank-pro';

    if (this.errorCount === 0 && greenPercent >= 75) {
      rankTitle = '🏆 WorldTour Profi';
      rankSubtitle = '0 Fehler! Absolut fehlerfreie Schaltung und optimale Trittfrequenz.';
      badgeClass = 'rank-pro';
    } else if (this.errorCount <= 2) {
      rankTitle = '🥇 A-Klasse Rennfahrer';
      rankSubtitle = 'Hervorragende Leistung mit minimalen Schaltfehlern.';
      badgeClass = 'rank-amateur';
    } else if (this.errorCount <= 5) {
      rankTitle = '🥈 Ambitionierter Rennradfahrer';
      rankSubtitle = 'Solide Fahrt, aber vorausschauenderes Schalten an Steigungen nötig.';
      badgeClass = 'rank-hobby';
    } else if (this.errorCount <= 8) {
      rankTitle = '🥉 Hobbyfahrer';
      rankSubtitle = 'Achte stärker auf die Trittfrequenz und vermeide Kettenschräglauf.';
      badgeClass = 'rank-novice';
    } else {
      rankTitle = '🚴 Rennrad-Einsteiger';
      rankSubtitle = 'Nutze das kleine Kettenblatt am Berg und schalte vor Ampeln herunter!';
      badgeClass = 'rank-beginner';
    }

    return {
      errorCount: this.errorCount,
      rankTitle,
      rankSubtitle,
      badgeClass,
      timeGreenSec: Math.round(this.timeGreenSec),
      timeYellowSec: Math.round(this.timeYellowSec),
      timeRedSec: Math.round(this.timeRedSec),
      greenPercent,
      yellowPercent,
      redPercent,
      totalTimeSec: Math.round(total),
      errorLog: [...this.errorLog]
    };
  }
}
