import { Drivetrain } from './drivetrain.js';
import { BikePhysics } from './physics.js';
import { RouteProfile } from './route.js';
import { SoundManager } from './audio.js';
import { ShiftingScorer } from './scorer.js';
import { TrainerCoach } from './coach.js';
import { LeversRenderer } from './render/levers.js';
import { DrivetrainRenderer } from './render/cassette.js';
import { ProfileRenderer } from './render/profile.js';

class BikeGearSimulatorApp {
  constructor() {
    // Core Modules
    this.sound = new SoundManager();
    this.drivetrain = new Drivetrain('compact', '11-30');
    this.physics = new BikePhysics();
    this.route = new RouteProfile();
    this.scorer = new ShiftingScorer(this.sound);
    this.coach = new TrainerCoach(this);

    // State
    this.isRunning = false;
    this.isPaused = false;
    this.mode = 'challenge'; // 'challenge' | 'coach' | 'free'
    this.sessionTimeSec = 0;
    this.totalDurationSec = 180; // 3 minutes
    this.lastFrameTime = performance.now();
    this.redLightStandingTimerSec = 0;
    this.redLightGreenTimerSec = 0;
    this.isStandingAtRedLight = false;
    this.redLightCleared = false;

    // DOM Elements Cache
    this.dom = {};
  }

  init() {
    this.cacheDOM();
    
    // Initialize Renderers
    this.leversRenderer = new LeversRenderer('leftShifterContainer', 'rightShifterContainer');
    this.drivetrainRenderer = new DrivetrainRenderer('cassetteCanvas');
    this.profileRenderer = new ProfileRenderer('profileCanvas');

    this.bindEvents();
    this.handleResize();
    window.addEventListener('resize', () => {
      this.handleResize();
      this.renderFrame(0);
    });

    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => {
        this.handleResize();
        this.renderFrame(0);
      });
      const pWrap = document.querySelector('.canvas-wrapper');
      const cWrap = document.querySelector('.cassette-canvas-wrap');
      if (pWrap) ro.observe(pWrap);
      if (cWrap) ro.observe(cWrap);
    }

    // Initial render
    this.updateUI();
    this.renderFrame(0);

    console.log('🚴 Shimano Road Bike Gear Simulator initialized.');
  }

  cacheDOM() {
    this.dom = {
      // Telemetry Displays
      speedDisplay: document.getElementById('speedVal'),
      cadenceDisplay: document.getElementById('cadenceVal'),
      cadenceRing: document.getElementById('cadenceProgressRing'),
      powerDisplay: document.getElementById('powerVal'),
      powerSlider: document.getElementById('powerSlider'),
      gradeDisplay: document.getElementById('gradeVal'),
      gearRatioDisplay: document.getElementById('gearRatioVal'),
      gearNameDisplay: document.getElementById('gearNameVal'),
      developmentDisplay: document.getElementById('developmentVal'),
      
      // Feedback & Scorer
      feedbackBanner: document.getElementById('feedbackBanner'),
      feedbackStatusPill: document.getElementById('feedbackStatusPill'),
      feedbackText: document.getElementById('feedbackText'),
      errorCounterVal: document.getElementById('errorCounterVal'),
      scenarioTitle: document.getElementById('scenarioTitle'),
      scenarioAdvice: document.getElementById('scenarioAdvice'),

      // 100m Traffic Light Countdown Overlay
      trafficLightOverlay: document.getElementById('trafficLightOverlay'),
      tlBulbRed: document.getElementById('tlBulbRed'),
      tlBulbYellow: document.getElementById('tlBulbYellow'),
      tlBulbGreen: document.getElementById('tlBulbGreen'),
      tlCountdownMeters: document.getElementById('tlCountdownMeters'),
      tlCountdownUnit: document.getElementById('tlCountdownUnit'),
      tlCountdownAdvice: document.getElementById('tlCountdownAdvice'),

      // Effort Level Selector (Leicht / Normal / Stark)
      effortNameDisplay: document.getElementById('effortNameVal'),
      powerWattsUnit: document.getElementById('powerWattsUnit'),
      btnEffortLeicht: document.getElementById('btnEffortLeicht'),
      btnEffortNormal: document.getElementById('btnEffortNormal'),
      btnEffortStark: document.getElementById('btnEffortStark'),

      // Session Timer & Progress
      timerDisplay: document.getElementById('timerDisplay'),
      progressBar: document.getElementById('sessionProgressBar'),
      btnStartPause: document.getElementById('btnStartPause'),
      btnReset: document.getElementById('btnReset'),
      btnModeChallenge: document.getElementById('btnModeChallenge'),
      btnModeCoach: document.getElementById('btnModeCoach'),
      btnModeFree: document.getElementById('btnModeFree'),
      btnSoundToggle: document.getElementById('btnSoundToggle'),

      // Pro-Coach Live Commentary
      coachCommentaryStrip: document.getElementById('coachCommentaryStrip'),
      coachCommentaryText: document.getElementById('coachCommentaryText'),

      // Result Modal
      resultModal: document.getElementById('resultModal'),
      btnRestartSession: document.getElementById('btnRestartSession'),
      btnCloseModal: document.getElementById('btnCloseModal'),
      resultRankBadge: document.getElementById('resultRankBadge'),
      resultRankTitle: document.getElementById('resultRankTitle'),
      resultRankSubtitle: document.getElementById('resultRankSubtitle'),
      resultErrorCount: document.getElementById('resultErrorCount'),
      resultGreenPercent: document.getElementById('resultGreenPercent'),
      resultYellowPercent: document.getElementById('resultYellowPercent'),
      resultRedPercent: document.getElementById('resultRedPercent'),
      resultErrorList: document.getElementById('resultErrorList')
    };
  }

  handleResize() {
    if (this.drivetrainRenderer) this.drivetrainRenderer.resize();
    if (this.profileRenderer) this.profileRenderer.resize();
  }

  bindEvents() {
    // Keyboard Handler
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));

    // Lever On-Screen Buttons
    const btnLeftUp = document.getElementById('btnLeftUp');
    const btnLeftDown = document.getElementById('btnLeftDown');
    const btnRightEasier = document.getElementById('btnRightEasier');
    const btnRightHarder = document.getElementById('btnRightHarder');

    if (btnLeftUp) btnLeftUp.addEventListener('click', () => this.shiftFrontUp());
    if (btnLeftDown) btnLeftDown.addEventListener('click', () => this.shiftFrontDown());
    if (btnRightEasier) btnRightEasier.addEventListener('click', () => this.shiftRearEasier());
    if (btnRightHarder) btnRightHarder.addEventListener('click', () => this.shiftRearHarder());

    // Effort Buttons (Leicht / Normal / Stark)
    if (this.dom.btnEffortLeicht) {
      this.dom.btnEffortLeicht.addEventListener('click', () => this.setEffortLevel('leicht'));
    }
    if (this.dom.btnEffortNormal) {
      this.dom.btnEffortNormal.addEventListener('click', () => this.setEffortLevel('normal'));
    }
    if (this.dom.btnEffortStark) {
      this.dom.btnEffortStark.addEventListener('click', () => this.setEffortLevel('stark'));
    }

    // Session Controls
    if (this.dom.btnStartPause) {
      this.dom.btnStartPause.addEventListener('click', () => this.toggleStartPause());
    }
    if (this.dom.btnReset) {
      this.dom.btnReset.addEventListener('click', () => this.resetSession());
    }
    if (this.dom.btnModeChallenge) {
      this.dom.btnModeChallenge.addEventListener('click', () => this.setMode('challenge'));
    }
    if (this.dom.btnModeCoach) {
      this.dom.btnModeCoach.addEventListener('click', () => this.setMode('coach'));
    }
    if (this.dom.btnModeFree) {
      this.dom.btnModeFree.addEventListener('click', () => this.setMode('free'));
    }
    if (this.dom.btnSoundToggle) {
      this.dom.btnSoundToggle.addEventListener('click', () => {
        const muted = this.sound.toggleMute();
        this.dom.btnSoundToggle.innerHTML = muted ? '🔇 Ton Aus' : '🔊 Ton An';
      });
    }

    // Modal buttons
    if (this.dom.btnRestartSession) {
      this.dom.btnRestartSession.addEventListener('click', () => {
        this.hideResultModal();
        this.resetSession();
        this.startSession();
      });
    }
    if (this.dom.btnCloseModal) {
      this.dom.btnCloseModal.addEventListener('click', () => this.hideResultModal());
    }
  }

  handleKeyDown(e) {
    // If modal is open, ignore game controls except Escape / Enter
    if (!this.dom.resultModal.classList.contains('hidden')) {
      if (e.key === 'Escape' || e.key === 'Enter') {
        this.hideResultModal();
      }
      return;
    }

    const key = e.key.toLowerCase();
    const code = e.code;

    // First user interaction initializes Web Audio
    this.sound.init();

    // 1. Left STI Shifter (Front Derailleur)
    // Q = Shift to Big Ring (50T)
    if (code === 'KeyQ' || key === 'q') {
      e.preventDefault();
      this.shiftFrontUp();
      return;
    }
    // A = Shift to Small Ring (34T)
    if (code === 'KeyA' || key === 'a') {
      e.preventDefault();
      this.shiftFrontDown();
      return;
    }

    // 2. Right STI Shifter (Rear Derailleur)
    // Ü / U / BracketLeft / [ = Shift to Bigger Sprocket (Easier / Leichter)
    if (key === 'ü' || key === 'u' || code === 'BracketLeft' || key === '[') {
      e.preventDefault();
      this.shiftRearEasier();
      return;
    }
    // Ä / L / Quote / ' = Shift to Smaller Sprocket (Harder / Schwerer)
    if (key === 'ä' || key === 'l' || code === 'Quote' || key === "'") {
      e.preventDefault();
      this.shiftRearHarder();
      return;
    }

    // 3. Space = Cycle Kraft-Modus (Leicht -> Normal -> Stark)
    if (code === 'Space') {
      e.preventDefault();
      this.cycleEffortLevel();
      return;
    }

    // 4. P = Pause / Weiterfahren
    if (key === 'p' || code === 'KeyP') {
      e.preventDefault();
      this.toggleStartPause();
      return;
    }

    // 5. R = Reset
    if (code === 'KeyR' && (e.ctrlKey || e.metaKey || !e.repeat)) {
      if (!e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        this.resetSession();
      }
    }
  }

  cycleEffortLevel() {
    this.physics.cycleEffort();
    this.sound.playShift('rear_harder');
    this.updateUI();
  }

  setEffortLevel(id) {
    this.physics.setEffort(id);
    this.sound.playShift('rear_harder');
    this.updateUI();
  }

  // --- Shifting Actions ---
  isDrivetrainMoving() {
    // Normal drivetrain motion: rolling or pedaling
    return (this.physics.speedKmh > 1.8) || (this.physics.cadenceRpm > 15);
  }

  shiftFrontUp() {
    const isMoving = this.isDrivetrainMoving();
    const res = this.drivetrain.shiftFrontUp(isMoving);
    if (res.shifted) {
      this.sound.playShift('front_up');
      this.leversRenderer.animateShift('front_up');
      if (res.wasStationary) {
        this.scorer.recordStationaryShiftPenalty(this.sessionTimeSec, this.drivetrain.getGearString());
        this.updateUI();
      }
    }
  }

  shiftFrontDown() {
    const isMoving = this.isDrivetrainMoving();
    const res = this.drivetrain.shiftFrontDown(isMoving);
    if (res.shifted) {
      this.sound.playShift('front_down');
      this.leversRenderer.animateShift('front_down');
      if (res.wasStationary) {
        this.scorer.recordStationaryShiftPenalty(this.sessionTimeSec, this.drivetrain.getGearString());
        this.updateUI();
      }
    }
  }

  shiftRearEasier() {
    const isMoving = this.isDrivetrainMoving();
    const res = this.drivetrain.shiftRearEasier(isMoving);
    if (res.shifted) {
      this.sound.playShift('rear_easier');
      this.leversRenderer.animateShift('rear_easier');
      if (res.wasStationary) {
        this.scorer.recordStationaryShiftPenalty(this.sessionTimeSec, this.drivetrain.getGearString());
        this.updateUI();
      }
    }
  }

  shiftRearHarder() {
    const isMoving = this.isDrivetrainMoving();
    const res = this.drivetrain.shiftRearHarder(isMoving);
    if (res.shifted) {
      this.sound.playShift('rear_harder');
      this.leversRenderer.animateShift('rear_harder');
      if (res.wasStationary) {
        this.scorer.recordStationaryShiftPenalty(this.sessionTimeSec, this.drivetrain.getGearString());
        this.updateUI();
      }
    }
  }

  // --- Session Lifecycle ---
  toggleStartPause() {
    if (!this.isRunning) {
      this.startSession();
    } else {
      this.isPaused = !this.isPaused;
      if (this.dom.btnStartPause) {
        this.dom.btnStartPause.innerHTML = this.isPaused ? '▶ Weiterfahren' : '⏸ Pause';
        this.dom.btnStartPause.classList.toggle('btn-paused', this.isPaused);
      }
    }
  }

  startSession() {
    this.sound.init();
    this.isRunning = true;
    this.isPaused = false;
    this.lastFrameTime = performance.now();
    
    if (this.dom.btnStartPause) {
      this.dom.btnStartPause.innerHTML = '⏸ Pause';
      this.dom.btnStartPause.classList.remove('btn-paused');
    }

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  resetSession() {
    this.isRunning = false;
    this.isPaused = false;
    this.sessionTimeSec = 0;
    this.redLightStandingTimerSec = 0;
    this.redLightGreenTimerSec = 0;
    this.isStandingAtRedLight = false;
    this.redLightCleared = false;
    this.physics.reset(27.0);
    this.scorer.reset();
    
    if (this.dom.btnStartPause) {
      this.dom.btnStartPause.innerHTML = '▶ Session Starten';
      this.dom.btnStartPause.classList.remove('btn-paused');
    }

    this.updateUI();
    this.renderFrame(0);
  }

  setMode(mode) {
    this.mode = mode;
    if (this.dom.btnModeChallenge) this.dom.btnModeChallenge.classList.toggle('active', mode === 'challenge');
    if (this.dom.btnModeCoach) this.dom.btnModeCoach.classList.toggle('active', mode === 'coach');
    if (this.dom.btnModeFree) this.dom.btnModeFree.classList.toggle('active', mode === 'free');

    if (mode === 'coach') {
      this.coach.start();
      if (this.dom.coachCommentaryStrip) this.dom.coachCommentaryStrip.classList.remove('hidden');
      this.resetSession();
      this.startSession();
    } else {
      this.coach.stop();
      if (this.dom.coachCommentaryStrip) this.dom.coachCommentaryStrip.classList.add('hidden');
      this.resetSession();
    }
  }

  // --- Main Animation & Simulation Loop ---
  gameLoop(currentTime) {
    if (!this.isRunning) return;

    const dt = Math.min((currentTime - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = currentTime;

    if (!this.isPaused) {
      // 1. Session Timer (Stage Time)
      this.sessionTimeSec += dt;

      // 2. Traffic Light Lifecycle at 350m:
      const currentDist = this.physics.distanceMeters;

      if (!this.redLightCleared) {
        if (currentDist >= 250 && currentDist < 342) {
          // Approaching last 100m
          this.physics.setBraking(false);
        } else if (currentDist >= 342 && currentDist < 350 && !this.isStandingAtRedLight) {
          // Approaching stop line: smooth deceleration to halt
          this.physics.setBraking(true);
        } else if (currentDist >= 350 || this.isStandingAtRedLight) {
          // At or past 350m: LOCK bike at 350.0m standstill (cranks still, speed 0)!
          this.isStandingAtRedLight = true;
          this.physics.distanceMeters = 350.0;
          this.physics.speedKmh = 0.0;
          this.physics.speedMs = 0.0;
          this.physics.cadenceRpm = 0.0;
          this.physics.torqueNm = 0.0;
          this.physics.setBraking(false);

          this.redLightStandingTimerSec += dt;

          if (this.redLightStandingTimerSec >= 10.0) {
            // Full 10 seconds wait complete: TURN GREEN & PEDAL OFF!
            this.isStandingAtRedLight = false;
            this.redLightCleared = true;
            this.redLightGreenTimerSec = 0.0;
            this.physics.setBraking(false);
            if (this.physics.speedMs < 1.2) {
              this.physics.speedMs = 1.2; // ~4.3 km/h initial push off pedal
              this.physics.speedKmh = 4.3;
            }
            this.sound.playSuccessChime();
          }
        }
      } else {
        // Red light cleared: track green overlay timer (disappears after 2.5s)
        if (this.redLightGreenTimerSec < 4.0) {
          this.redLightGreenTimerSec += dt;
        }
      }

      // 3. Sample Route Gradient & Scenario based on physical distance
      const routeState = this.route.getStateAtDistance(
        this.physics.distanceMeters, 
        this.redLightStandingTimerSec, 
        this.isStandingAtRedLight,
        this.redLightCleared,
        this.redLightGreenTimerSec
      );
      this.physics.setGrade(routeState.grade);

      // 4. Update Physics (Speed, Cadence, Distance)
      const dtState = this.drivetrain.getState();
      const physState = this.physics.update(dt, dtState.gearRatio);

      // If standing at red light, lock speed and cadence to 0 so cranks and wheel don't spin
      if (this.isStandingAtRedLight) {
        this.physics.speedKmh = 0.0;
        this.physics.speedMs = 0.0;
        this.physics.cadenceRpm = 0.0;
        physState.speedKmh = 0.0;
        physState.cadenceRpm = 0.0;
      }

      // 5. Coach Autopilot in Pro-Coach Demo Mode
      if (this.mode === 'coach') {
        this.coach.update(dt, physState, dtState, routeState);
      }

      // 6. Evaluate Shifting Performance
      this.scorer.evaluate(dt, physState, dtState, routeState);

      // 7. Update DOM & HUD
      this.updateUI(routeState, physState, dtState);

      // 8. Render 2D Graphics
      this.renderFrame(dt, routeState, physState, dtState);

      // 9. Check Session Finish (When crossing 1600m finish line in challenge or coach mode!)
      if (this.mode === 'challenge' || this.mode === 'coach') {
        const isDistanceFinished = this.physics.distanceMeters >= this.route.totalDistanceM;
        const isSafetyTimeout = this.sessionTimeSec >= 360; // 6 min safety timeout
        if (isDistanceFinished || isSafetyTimeout) {
          this.finishSession();
          return;
        }
      }
    }

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  updatePowerUI() {
    this.updateUI();
  }

  updateUI(routeState, physState, dtState) {
    if (!routeState) {
      routeState = this.route.getStateAtDistance(
        this.physics.distanceMeters, 
        this.redLightStandingTimerSec, 
        this.isStandingAtRedLight,
        this.redLightCleared,
        this.redLightGreenTimerSec
      );
    }
    if (!physState) physState = this.physics.getState(this.drivetrain.gearRatio);
    if (!dtState) dtState = this.drivetrain.getState();

    // Telemetry Numbers
    if (this.dom.speedDisplay) this.dom.speedDisplay.textContent = physState.speedKmh.toFixed(1);
    if (this.dom.cadenceDisplay) this.dom.cadenceDisplay.textContent = Math.round(physState.cadenceRpm);
    
    // Effort Level (Leicht / Normal / Stark)
    const effort = this.physics.currentEffort;
    if (this.dom.effortNameDisplay) this.dom.effortNameDisplay.textContent = effort.name;
    if (this.dom.powerWattsUnit) this.dom.powerWattsUnit.textContent = `${effort.watts} W`;

    if (this.dom.btnEffortLeicht) this.dom.btnEffortLeicht.className = 'effort-btn ' + (effort.id === 'leicht' ? 'active active-leicht' : '');
    if (this.dom.btnEffortNormal) this.dom.btnEffortNormal.className = 'effort-btn ' + (effort.id === 'normal' ? 'active' : '');
    if (this.dom.btnEffortStark) this.dom.btnEffortStark.className = 'effort-btn ' + (effort.id === 'stark' ? 'active active-stark' : '');

    // Grade formatted
    if (this.dom.gradeDisplay) {
      const sign = routeState.grade > 0 ? '+' : '';
      this.dom.gradeDisplay.textContent = `${sign}${routeState.grade.toFixed(1)}%`;
      this.dom.gradeDisplay.className = 'telemetry-val ' + (routeState.grade > 4 ? 'grade-steep' : routeState.grade < -2 ? 'grade-descent' : 'grade-flat');
    }

    // Gear Info
    if (this.dom.gearRatioDisplay) this.dom.gearRatioDisplay.textContent = dtState.gearRatio.toFixed(2);
    if (this.dom.gearNameDisplay) this.dom.gearNameDisplay.textContent = dtState.gearString;
    if (this.dom.developmentDisplay) this.dom.developmentDisplay.textContent = `${dtState.development.toFixed(2)} m`;

    // Cadence Dial / Ring Color
    if (this.dom.cadenceRing) {
      const rpm = physState.cadenceRpm;
      let statusColor = '#00ffc8';
      if (rpm < 65 || rpm > 115) statusColor = '#ff3366';
      else if (rpm < 85 || rpm > 95) statusColor = '#ffbb00';
      this.dom.cadenceRing.style.setProperty('--cadence-color', statusColor);
    }

    // Feedback Banner
    const scoreState = this.scorer;
    if (this.dom.feedbackBanner) {
      this.dom.feedbackBanner.className = `feedback-banner status-${scoreState.status}`;
    }
    if (this.dom.feedbackStatusPill) {
      this.dom.feedbackStatusPill.textContent = scoreState.status.toUpperCase();
    }
    if (this.dom.feedbackText) {
      this.dom.feedbackText.textContent = scoreState.feedbackMessage;
    }
    if (this.dom.errorCounterVal) {
      this.dom.errorCounterVal.textContent = scoreState.errorCount;
    }

    // Scenario title & coaching advice
    if (this.dom.scenarioTitle) this.dom.scenarioTitle.textContent = routeState.title;
    if (this.dom.scenarioAdvice) this.dom.scenarioAdvice.textContent = routeState.advice;

    // Pro-Coach Live Commentary Text
    if (this.dom.coachCommentaryText && this.coach) {
      this.dom.coachCommentaryText.textContent = this.coach.currentComment;
    }

    // 100m Traffic Light Countdown HUD Overlay & 10s Red Light Stop Timer
    if (this.dom.trafficLightOverlay) {
      if (routeState.showLightOverlay) {
        this.dom.trafficLightOverlay.classList.remove('hidden');
        if (this.dom.tlCountdownMeters) {
          this.dom.tlCountdownMeters.textContent = (routeState.lightCountdown !== null && routeState.lightCountdown !== undefined) ? routeState.lightCountdown : '0';
        }
        if (this.dom.tlCountdownUnit) {
          this.dom.tlCountdownUnit.textContent = routeState.lightCountdownUnit || (this.isStandingAtRedLight ? 'SEK' : 'M');
        }

        if (this.dom.tlBulbRed) this.dom.tlBulbRed.className = 'tl-bulb ' + (routeState.lightState === 'red' ? 'active-red' : '');
        if (this.dom.tlBulbYellow) this.dom.tlBulbYellow.className = 'tl-bulb ' + (routeState.lightState === 'yellow' ? 'active-yellow' : '');
        if (this.dom.tlBulbGreen) this.dom.tlBulbGreen.className = 'tl-bulb ' + (routeState.lightState === 'green' ? 'active-green' : '');

        if (this.dom.tlCountdownAdvice) {
          this.dom.tlCountdownAdvice.textContent = routeState.advice;
        }
      } else {
        this.dom.trafficLightOverlay.classList.add('hidden');
      }
    }

    // Timer & Progress
    if (this.dom.timerDisplay) {
      const m = Math.floor(this.sessionTimeSec / 60);
      const s = Math.floor(this.sessionTimeSec % 60);
      this.dom.timerDisplay.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    }

    if (this.dom.progressBar) {
      const frac = Math.min(1, this.physics.distanceMeters / this.route.totalDistanceM);
      this.dom.progressBar.style.width = `${(frac * 100).toFixed(1)}%`;
    }
  }

  renderFrame(dt, routeState, physState, dtState) {
    if (!routeState) {
      routeState = this.route.getStateAtDistance(
        this.physics.distanceMeters, 
        this.redLightStandingTimerSec, 
        this.isStandingAtRedLight,
        this.redLightCleared,
        this.redLightGreenTimerSec
      );
    }
    if (!physState) physState = this.physics.getState(this.drivetrain.gearRatio);
    if (!dtState) dtState = this.drivetrain.getState();

    // Render Drivetrain & Cassette Canvas
    if (this.drivetrainRenderer) {
      this.drivetrainRenderer.render(dtState, physState.cadenceRpm, physState.speedKmh, dt);
    }

    // Render Elevation Profile & Road Scene Canvas
    if (this.profileRenderer) {
      this.profileRenderer.render(routeState, physState, this.route, dt);
    }
  }

  // --- Finish & Evaluation Modal ---
  finishSession() {
    this.isRunning = false;
    this.sound.playSuccessChime();
    
    const summary = this.scorer.getSummary();
    this.showResultModal(summary);
  }

  showResultModal(summary) {
    if (!this.dom.resultModal) return;

    if (this.dom.resultRankBadge) {
      this.dom.resultRankBadge.className = `result-badge ${summary.badgeClass}`;
      this.dom.resultRankBadge.textContent = summary.errorCount === 0 ? '🏆 0 FEHLER' : `${summary.errorCount} FEHLER`;
    }
    if (this.dom.resultRankTitle) this.dom.resultRankTitle.textContent = summary.rankTitle;
    if (this.dom.resultRankSubtitle) this.dom.resultRankSubtitle.textContent = summary.rankSubtitle;
    if (this.dom.resultErrorCount) this.dom.resultErrorCount.textContent = summary.errorCount;
    if (this.dom.resultGreenPercent) this.dom.resultGreenPercent.textContent = `${summary.greenPercent}%`;
    if (this.dom.resultYellowPercent) this.dom.resultYellowPercent.textContent = `${summary.yellowPercent}%`;
    if (this.dom.resultRedPercent) this.dom.resultRedPercent.textContent = `${summary.redPercent}%`;

    // Error Log List
    if (this.dom.resultErrorList) {
      if (summary.errorLog.length === 0) {
        this.dom.resultErrorList.innerHTML = `
          <div class="empty-error-state">
            <span class="empty-icon">⭐</span>
            <strong>Perfekte Runde!</strong>
            <p>Du hast keine Schaltfehler begangen, die Trittfrequenz immer im Sweetspot gehalten und vor der Ampel rechtzeitig heruntergeschaltet.</p>
          </div>
        `;
      } else {
        this.dom.resultErrorList.innerHTML = summary.errorLog.map(err => `
          <div class="error-item">
            <div class="error-item-time">${err.timeFormatted}</div>
            <div class="error-item-body">
              <strong class="error-item-title">${err.title}</strong>
              <div class="error-item-desc">${err.description}</div>
            </div>
          </div>
        `).join('');
      }
    }

    this.dom.resultModal.classList.remove('hidden');
  }

  hideResultModal() {
    if (this.dom.resultModal) {
      this.dom.resultModal.classList.add('hidden');
    }
  }
}

// Bootstrap on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  window.app = new BikeGearSimulatorApp();
  window.app.init();
});
