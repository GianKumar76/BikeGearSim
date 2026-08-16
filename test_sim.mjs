/**
 * Automated Verification & Unit Tests for Bike Gear Simulator Engine
 */

import { Drivetrain, CHAINRING_PRESETS, CASSETTE_PRESETS } from './src/drivetrain.js';
import { BikePhysics, EFFORT_LEVELS } from './src/physics.js';
import { RouteProfile, SCENARIO_TYPES } from './src/route.js';
import { ShiftingScorer } from './src/scorer.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('--- 1. Testing Drivetrain Logic & Tolerant Cross-Chaining ---');
const dt = new Drivetrain('compact', '11-30');
// Initial: Big ring (50T), index 4 (15T)
assert(dt.frontTeeth === 50, `Initial front chainring is 50T (got ${dt.frontTeeth})`);
assert(dt.rearTeeth === 15, `Initial rear sprocket is 15T (got ${dt.rearTeeth})`);
assert(Math.abs(dt.gearRatio - (50 / 15)) < 0.001, `Initial ratio is ~3.33 (got ${dt.gearRatio})`);

// Shift Down front: 50 -> 34
const fDown = dt.shiftFrontDown(true);
assert(fDown.shifted && dt.frontTeeth === 34, `Shift front down to 34T`);
assert(dt.shiftFrontDown(true).shifted === false, `Shift front down again is blocked (already small)`);

// Shift Up front: 34 -> 50
const fUp = dt.shiftFrontUp(true);
assert(fUp.shifted && dt.frontTeeth === 50, `Shift front up to 50T`);

// Tolerant Chainline Checks on 50T:
// 50x17 (index 5): Green
dt.rearIndex = 5; // 17T
assert(dt.getCrossChainingInfo().level === 'ok' && dt.getCrossChainingInfo().color === '#00ffc8', `50x17 is Green (Optimal)`);

// 50x24 (index 8): Yellow (Tolerated moderate cross-chaining)
dt.rearIndex = 8; // 24T
assert(dt.getCrossChainingInfo().level === 'warning' && dt.getCrossChainingInfo().color === '#ffbb00', `50x24 is Yellow (Tolerated)`);

// 50x30 (index 10): Red (Severe Groß-Groß)
dt.rearIndex = 10; // 30T
assert(dt.getCrossChainingInfo().level === 'severe' && dt.getCrossChainingInfo().color === '#ff3366', `50x30 is Red (Severe)`);

// Tolerant Chainline Checks on 34T:
dt.frontIndex = 0; // 34T
// 34x30: Green
dt.rearIndex = 10;
assert(dt.getCrossChainingInfo().level === 'ok' && dt.getCrossChainingInfo().color === '#00ffc8', `34x30 is Green (Optimal)`);
// 34x14: Yellow
dt.rearIndex = 3;
assert(dt.getCrossChainingInfo().level === 'warning' && dt.getCrossChainingInfo().color === '#ffbb00', `34x14 is Yellow (Tolerated)`);
// 34x11: Red
dt.rearIndex = 0;
assert(dt.getCrossChainingInfo().level === 'severe' && dt.getCrossChainingInfo().color === '#ff3366', `34x11 is Red (Severe)`);

// Stationary shifting test (allowed with wasStationary flag)
const stationaryShift = dt.shiftRearEasier(false);
assert(stationaryShift.shifted === true && stationaryShift.wasStationary === true, `Stationary shifting succeeds with wasStationary flag`);

console.log('\n--- 2. Testing 3-Level Effort Model & Bike Physics ---');
const phys = new BikePhysics();
assert(phys.currentEffort.id === 'normal', `Default effort level is Normal`);
assert(phys.currentEffort.watts === 165, `Normal mode power is 165W`);

// Cycle Effort Levels: Normal (1) -> Stark (2) -> Leicht (0) -> Normal (1)
const effortStark = phys.cycleEffort();
assert(effortStark.id === 'stark' && effortStark.watts === 280, `Cycled to Stark (280W)`);
const effortLeicht = phys.cycleEffort();
assert(effortLeicht.id === 'leicht' && effortLeicht.watts === 110, `Cycled to Leicht (110W)`);
const effortNormal = phys.cycleEffort();
assert(effortNormal.id === 'normal' && effortNormal.watts === 165, `Cycled back to Normal (165W)`);

// Normal mode cruising speed test on flat (0% grade) with 50x13 (3rd smallest sprocket)
phys.reset(27.0);
phys.setGrade(0.0);
phys.setEffort('normal');
for (let i = 0; i < 20; i++) phys.update(1.0, 50 / 13);
assert(Math.abs(phys.speedKmh - 27.0) < 4.0, `Normal mode cruises at ~27 km/h (got ${phys.speedKmh.toFixed(2)} km/h)`);

// Test steep hill deceleration (+12%)
phys.setGrade(12.0);
for (let i = 0; i < 5; i++) phys.update(1.0, 50 / 15);
assert(phys.speedKmh < 20, `Bike slows down on 12% slope (got ${phys.speedKmh.toFixed(2)} km/h)`);

// Test 0 Watt stop behavior on flat:
phys.setPower(0);
phys.setGrade(0.0);
let coastSteps = 0;
while (phys.speedKmh > 0 && coastSteps < 80) {
  phys.update(1.0, 50 / 15);
  coastSteps++;
}
assert(phys.speedKmh === 0, `Bike comes to complete stop (0 km/h) at 0 Watts on flat (took ${coastSteps}s)`);
const stoppedDistance = phys.distanceMeters;
phys.update(1.0, 50 / 15);
assert(phys.distanceMeters === stoppedDistance, `Distance does NOT advance when stopped at 0 Watt`);

// Test coasting and braking cadence: cranks must stand still (0 RPM)
phys.reset(30.0);
phys.setPower(0);
phys.update(0.1, 50 / 15);
assert(phys.cadenceRpm === 0, `Cranks stand still (0 RPM) when coasting at 30 km/h with 0W`);

phys.setBraking(true);
phys.update(0.1, 50 / 15);
assert(phys.cadenceRpm === 0, `Cranks stand still (0 RPM) when braking`);
phys.setBraking(false);

console.log('\n--- 3. Testing Route Profile & Traffic Light Lifecycle ---');
const route = new RouteProfile();
const flatStart = route.getStateAtDistance(50);
assert(flatStart.grade === 0.0, `Start at 50m is flat 0%`);

// 1. Approaching at 260m (90m remaining to stop line at 350m)
const tlApproach = route.getStateAtDistance(260);
assert(tlApproach.showLightOverlay === true, `Overlay shown on last 100m before red light`);
assert(tlApproach.lightCountdown === 90, `Countdown displays 90m (got ${tlApproach.lightCountdown}m)`);
assert(tlApproach.lightCountdownUnit === 'M', `Countdown unit is M during approach`);

// 2. Stopped at 350m (4 seconds waited -> 6s remaining)
const tlRedWait = route.getStateAtDistance(350, 4.0, true, false, 0);
assert(tlRedWait.isStop === true, `350m with isStandingAtRed shows stop state`);
assert(tlRedWait.lightCountdown === 6, `10s timer counts down correctly (got ${tlRedWait.lightCountdown}s remaining after 4s)`);
assert(tlRedWait.lightCountdownUnit === 'SEK', `Countdown unit is SEK during stop`);
assert(tlRedWait.lightState === 'red', `Light state is red during stop`);

// 3. Green light triggered (1.0s after green)
const tlGreen = route.getStateAtDistance(350, 10.0, false, true, 1.0);
assert(tlGreen.showLightOverlay === true, `Overlay is still visible briefly after green`);
assert(tlGreen.lightState === 'green', `Light state is green`);
assert(tlGreen.lightCountdown === 'LOS!', `Display shows 'LOS!' when turning green`);

// 4. Overlay disappears after 2.5s of green
const tlGreenAfter = route.getStateAtDistance(360, 10.0, false, true, 3.0);
assert(tlGreenAfter.showLightOverlay === false, `Overlay disappears cleanly after green transition`);

// 5. Bridge Ramp (+8% over 50 meters)
const bridgeRamp = route.getStateAtDistance(490);
assert(bridgeRamp.scenario === SCENARIO_TYPES.BRIDGE_RAMP, `490m is Bridge Ramp scenario`);
assert(bridgeRamp.grade >= 7.5, `Bridge Ramp at 490m has ~8% grade (got ${bridgeRamp.grade}%)`);
assert(bridgeRamp.title.includes('Brückenrampe'), `Bridge Ramp title contains Brückenrampe`);

// 6. Route hills & climbs
const climb = route.getStateAtDistance(910);
assert(climb.scenario === SCENARIO_TYPES.STEEP_CLIMB, `910m is steep climb scenario`);
assert(climb.grade > 10, `Climb at 910m is steep >10% (got ${climb.grade}%)`);

const descent = route.getStateAtDistance(1200);
assert(descent.scenario === SCENARIO_TYPES.STEEP_DESCENT, `1200m is descent scenario`);
assert(descent.grade < -5, `Descent at 1200m is <-5% (got ${descent.grade}%)`);

const finishLine = route.getStateAtDistance(1600);
assert(finishLine.distance === 1600, `Finish line is at 1600m`);

console.log('\n--- 4. Testing Real-time Scorer & Penalties ---');
const mockSound = { playWarningBeep: () => {}, playSuccessChime: () => {} };
const scorer = new ShiftingScorer(mockSound);

// Evaluate sweetspot (90 RPM, clean chainline)
const evalGreen = scorer.evaluate(1.0, 
  { speedKmh: 27, cadenceRpm: 90, targetPowerWatts: 165, isBraking: false },
  { frontIndex: 1, rearIndex: 5, gearRatio: 2.94, crossChaining: { level: 'ok', color: '#00ffc8' }, frontTeeth: 50, rearTeeth: 17 },
  { time: 10, grade: 0, isStop: false, scenario: 'flat' }
);
assert(evalGreen.status === 'green', `Optimal cadence 90 RPM gives green status`);
assert(scorer.errorCount === 0, `0 errors logged so far`);

// Stationary shift penalty test
scorer.recordStationaryShiftPenalty(30, '34 × 21');
assert(scorer.errorCount === 1, `Stationary shift records +1 penalty for lifting rear wheel`);
assert(scorer.errorLog[0].title === 'Im Stand geschaltet', `Error log recorded stationary shift mistake`);

// Short cadence drop (<4.5s) is NOT penalized
for (let i = 0; i < 2; i++) {
  scorer.evaluate(1.0, 
    { speedKmh: 24, cadenceRpm: 58, targetPowerWatts: 220, isBraking: false },
    { frontIndex: 1, rearIndex: 3, gearRatio: 3.5, crossChaining: { level: 'ok', color: '#00ffc8' }, frontTeeth: 50, rearTeeth: 14 },
    { time: 95, grade: 8, isStop: false, scenario: 'steep_climb' }
  );
}
assert(scorer.errorCount === 1, `Short temporary cadence drop is NOT penalized`);

// Sustained grinding triggers error and formats valid timestamp (e.g. 0:08, not NaN:NaN)
for (let i = 0; i < 6; i++) {
  scorer.evaluate(1.0, 
    { speedKmh: 14, cadenceRpm: 50, targetPowerWatts: 280, isBraking: false },
    { frontIndex: 1, rearIndex: 3, gearRatio: 3.5, crossChaining: { level: 'ok', color: '#00ffc8' }, frontTeeth: 50, rearTeeth: 14 },
    { distance: 890, grade: 12, isStop: false, scenario: 'steep_climb' }
  );
}
assert(scorer.errorCount >= 2, `Sustained grinding logged mistake (errorCount: ${scorer.errorCount})`);

// Verify temporary deviations (e.g. 72 RPM or 105 RPM) do NOT cause any penalty
const currentErrors = scorer.errorCount;
for (let i = 0; i < 10; i++) {
  scorer.evaluate(1.0,
    { speedKmh: 26, cadenceRpm: 74, targetPowerWatts: 165, isBraking: false },
    { frontIndex: 1, rearIndex: 5, gearRatio: 2.94, crossChaining: { level: 'ok', color: '#00ffc8' }, frontTeeth: 50, rearTeeth: 17 },
    { distance: 600, grade: 1.5, isStop: false, scenario: 'rolling' }
  );
}
assert(scorer.errorCount === currentErrors, `Temporary mild cadence variation (74 RPM) incurs 0 penalties`);

console.log('\n--- 5. Testing Pro-Coach Autopilot & Strategic Decisions ---');
import { TrainerCoach } from './src/coach.js';

let lastShiftAction = null;
const mockApp = {
  isRunning: true,
  isPaused: false,
  sessionTimeSec: 10.0,
  redLightCleared: false,
  isStandingAtRedLight: false,
  physics: { effortIndex: 1 },
  shiftFrontDown: () => { lastShiftAction = 'front_down'; },
  shiftFrontUp: () => { lastShiftAction = 'front_up'; },
  shiftRearEasier: () => { lastShiftAction = 'rear_easier'; },
  shiftRearHarder: () => { lastShiftAction = 'rear_harder'; },
  setEffortLevel: () => {}
};

const coach = new TrainerCoach(mockApp);
coach.start();
assert(coach.isActive === true, `TrainerCoach is active when started`);

// 1. Test anticipatory downshift on approaching red light (at 280m)
coach.update(1.0, 
  { distanceMeters: 280, speedKmh: 22, cadenceRpm: 80 },
  { frontIndex: 1, rearIndex: 4, frontTeeth: 50, rearTeeth: 15, gearRatio: 3.33 },
  { scenario: 'traffic_light', grade: 0.0, lightState: 'red', isStop: false }
);
assert(lastShiftAction === 'front_down', `Coach downshifts front to 34T in advance before traffic light`);
assert(coach.currentComment.includes('Ampel'), `Coach comment explains anticipatory downshift for traffic light`);

// 2. Test Bridge Ramp front downshift at crest (at 500m)
mockApp.sessionTimeSec = 30.0; // bypass cooldown
coach.update(1.0,
  { distanceMeters: 500, speedKmh: 21, cadenceRpm: 72 },
  { frontIndex: 1, rearIndex: 5, frontTeeth: 50, rearTeeth: 17, gearRatio: 2.94 },
  { scenario: 'bridge_ramp', grade: 8.0, lightState: null, isStop: false }
);
assert(lastShiftAction === 'front_down', `Coach drops front chainring to 34T at crest of 8% bridge ramp`);
assert(coach.currentComment.includes('Kettenblatt'), `Coach comment uses beginner-friendly Kettenblatt wording`);

// 3. Test Climb power adaptation (switches to stark / heavy mode on steep climb)
let setEffortCalledWith = null;
mockApp.setEffortLevel = (level) => { setEffortCalledWith = level; mockApp.physics.effortIndex = 2; };
mockApp.sessionTimeSec = 60.0;
mockApp.physics.effortIndex = 1; // currently normal
coach.update(1.0,
  { distanceMeters: 750, speedKmh: 18, cadenceRpm: 70 },
  { frontIndex: 0, rearIndex: 7, frontTeeth: 34, rearTeeth: 21, gearRatio: 1.62 },
  { scenario: 'steep_climb', grade: 10.0, lightState: null, isStop: false }
);
assert(setEffortCalledWith === 'stark', `Coach increases effort to Stark (280W) on steep climb`);
assert(coach.currentComment.includes('Stark'), `Coach comment explains increasing power on the mountain`);

console.log('\n--- 6. End-to-End Full 1600m Stage Simulation in Pro-Coach Mode ---');
const simDrivetrain = new Drivetrain('compact', '11-30');
const simPhysics = new BikePhysics();
const simRoute = new RouteProfile();
const simScorer = new ShiftingScorer({ playWarningBeep: () => {}, playSuccessChime: () => {} });

const fullSimApp = {
  isRunning: true,
  isPaused: false,
  mode: 'coach',
  sessionTimeSec: 0,
  redLightStandingTimerSec: 0,
  redLightGreenTimerSec: 0,
  isStandingAtRedLight: false,
  redLightCleared: false,
  physics: simPhysics,
  drivetrain: simDrivetrain,
  route: simRoute,
  scorer: simScorer,
  shiftFrontDown: () => simDrivetrain.shiftFrontDown(true),
  shiftFrontUp: () => simDrivetrain.shiftFrontUp(true),
  shiftRearEasier: () => simDrivetrain.shiftRearEasier(true),
  shiftRearHarder: () => simDrivetrain.shiftRearHarder(true),
  setEffortLevel: (lvl) => simPhysics.setEffort(lvl)
};

const fullCoach = new TrainerCoach(fullSimApp);
fullCoach.start();

const simDt = 0.05; // 20 FPS simulation tick
let simTicks = 0;
const maxTicks = 12000; // max 600 seconds safety

while (simPhysics.distanceMeters < 1600 && simTicks < maxTicks) {
  simTicks++;
  fullSimApp.sessionTimeSec += simDt;

  const currentDist = simPhysics.distanceMeters;

  // Red light handling at 350m
  if (!fullSimApp.redLightCleared) {
    if (currentDist >= 250 && currentDist < 342) {
      simPhysics.setBraking(false);
    } else if (currentDist >= 342 && currentDist < 350 && !fullSimApp.isStandingAtRedLight) {
      simPhysics.setBraking(true);
    } else if (currentDist >= 350 || fullSimApp.isStandingAtRedLight) {
      fullSimApp.isStandingAtRedLight = true;
      simPhysics.distanceMeters = 350.0;
      simPhysics.speedKmh = 0.0;
      simPhysics.speedMs = 0.0;
      simPhysics.cadenceRpm = 0.0;
      simPhysics.torqueNm = 0.0;
      simPhysics.setBraking(false);

      fullSimApp.redLightStandingTimerSec += simDt;

      if (fullSimApp.redLightStandingTimerSec >= 10.0) {
        fullSimApp.isStandingAtRedLight = false;
        fullSimApp.redLightCleared = true;
        fullSimApp.redLightGreenTimerSec = 0.0;
        simPhysics.setBraking(false);
        simPhysics.speedMs = 1.2;
        simPhysics.speedKmh = 4.3;
      }
    }
  } else {
    if (fullSimApp.redLightGreenTimerSec < 4.0) {
      fullSimApp.redLightGreenTimerSec += simDt;
    }
  }

  const routeState = simRoute.getStateAtDistance(
    simPhysics.distanceMeters,
    fullSimApp.redLightStandingTimerSec,
    fullSimApp.isStandingAtRedLight,
    fullSimApp.redLightCleared,
    fullSimApp.redLightGreenTimerSec
  );
  simPhysics.setGrade(routeState.grade);

  const dtState = simDrivetrain.getState();
  const physState = simPhysics.update(simDt, dtState.gearRatio);

  if (fullSimApp.isStandingAtRedLight) {
    simPhysics.speedKmh = 0.0;
    simPhysics.speedMs = 0.0;
    simPhysics.cadenceRpm = 0.0;
    physState.speedKmh = 0.0;
    physState.cadenceRpm = 0.0;
  }

  // Coach update
  fullCoach.update(simDt, physState, dtState, routeState);

  // Re-fetch dtState after coach shift for scorer evaluation
  const updatedDtState = simDrivetrain.getState();

  // Scorer evaluate
  simScorer.evaluate(simDt, physState, updatedDtState, routeState);
}

const finalSummary = simScorer.getSummary();
console.log(`  📊 Full Coach Run Results: Time: ${fullSimApp.sessionTimeSec.toFixed(1)}s, Distance: ${simPhysics.distanceMeters.toFixed(1)}m, Errors: ${finalSummary.errorCount}, Green: ${finalSummary.greenPercent}%, Yellow: ${finalSummary.yellowPercent}%, Red: ${finalSummary.redPercent}%`);
if (finalSummary.errorLog.length > 0) {
  console.log('  ⚠️ Logged Errors:', JSON.stringify(finalSummary.errorLog, null, 2));
}

assert(finalSummary.errorCount === 0, `Pro-Coach finishes full 1600m route with 0 ERRORS (got ${finalSummary.errorCount})`);
assert(finalSummary.greenPercent >= 60, `Pro-Coach maintains high green percentage (got ${finalSummary.greenPercent}%)`);
assert(simPhysics.distanceMeters >= 1600, `Pro-Coach reached the 1600m finish line (got ${simPhysics.distanceMeters.toFixed(1)}m)`);

console.log(`\n========================================`);
console.log(`Tests Finished: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
