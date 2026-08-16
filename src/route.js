/**
 * Distance-based Route & Scenario Generator
 * Total Course Distance: 1600m (3-Minute Challenge at ~32 km/h avg)
 */

export const SCENARIO_TYPES = {
  FLAT: 'flat',
  TRAFFIC_LIGHT: 'traffic_light',
  BRIDGE_RAMP: 'bridge_ramp',
  ROLLING: 'rolling',
  STEEP_CLIMB: 'steep_climb',
  STEEP_DESCENT: 'steep_descent',
  SPRINT: 'sprint'
};

export class RouteProfile {
  constructor() {
    this.totalDistanceM = 1600; // 1.6 km standard stage
    this.totalDurationSec = 180; // 3 minutes target

    // Key milestones defined across 1600 meters
    this.waypoints = [
      // 0m - 250m: Flat warmup
      { dist: 0, grade: 0.0, altitude: 200, scenario: SCENARIO_TYPES.FLAT, title: 'Flachstück / Einrollen', advice: 'Gleichmäßiges Tempo, Trittfrequenz ca. 90 RPM' },
      { dist: 180, grade: 0.0, altitude: 200, scenario: SCENARIO_TYPES.FLAT, title: 'Flachstück', advice: 'Halte Trittfrequenz im grünen Bereich (85-95 RPM)' },
      
      // 250m - 355m: Traffic Light (Stop line at 350m, 10s wait, take off)
      { dist: 250, grade: 0.0, altitude: 200, scenario: SCENARIO_TYPES.TRAFFIC_LIGHT, lightState: 'yellow', title: 'Ampel voraus (100m)', advice: 'Ausrollen & VOR DEM STILLSTAND runterschalten!' },
      { dist: 310, grade: 0.0, altitude: 200, scenario: SCENARIO_TYPES.TRAFFIC_LIGHT, lightState: 'red', title: 'Rote Ampel (40m)', advice: 'Jetzt in leichten Anfahrgang (z.B. 34x21Z) schalten!' },
      { dist: 350, grade: 0.0, altitude: 200, scenario: SCENARIO_TYPES.TRAFFIC_LIGHT, lightState: 'red', isStopLine: true, title: 'Rote Ampel (Stillstand)', advice: 'Stillstand! Im Stand kann nicht geschaltet werden. Bereit für Grün.' },
      { dist: 355, grade: 0.0, altitude: 200, scenario: SCENARIO_TYPES.TRAFFIC_LIGHT, lightState: 'green', isStopLine: false, title: 'Grüne Ampel (Anfahrt)', advice: 'Losfahren & beim Beschleunigen stufenweise hochschalten!' },
      
      // 355m - 460m: High-speed flat lead-in to bridge on big ring 50T
      { dist: 420, grade: 0.0, altitude: 200, scenario: SCENARIO_TYPES.FLAT, title: 'Anfahrt Brücke (Tempo)', advice: 'Tempo aufbauen auf großem Blatt (50T)! Schwung für die Rampe holen.' },

      // 460m - 540m: BRIDGE RAMP (+8.0% over 50 meters)
      // Practice: Enter with high speed on 50T, drop to small ring 34T near the crest!
      { dist: 460, grade: 3.5, altitude: 201, scenario: SCENARIO_TYPES.BRIDGE_RAMP, title: '🌉 Brückenrampe (+8% auf 50m)', advice: 'Mit Schwung auf großem Blatt reinfahren!' },
      { dist: 490, grade: 8.0, altitude: 203, scenario: SCENARIO_TYPES.BRIDGE_RAMP, title: '🌉 Brückenrampe (+8.0%)', advice: 'Schwung mitnehmen! Wenn Tempo sinkt: nur vorne auf 34T schalten (A)!' },
      { dist: 530, grade: 7.5, altitude: 206, scenario: SCENARIO_TYPES.BRIDGE_RAMP, title: '🌉 Brückenscheitel', advice: 'Vorne 34T geschaltet? Perfekt! Schwung gerettet.' },
      { dist: 560, grade: -3.5, altitude: 207, scenario: SCENARIO_TYPES.BRIDGE_RAMP, title: 'Brückenabfahrt (-3.5%)', advice: 'Schwung mitnehmen und vorne wieder auf 50T (Q)!' },

      // 560m - 720m: Rolling hills / Small kickers
      { dist: 600, grade: 1.5, altitude: 208, scenario: SCENARIO_TYPES.ROLLING, title: 'Rollierende Wellen', advice: 'Terrain wird unruhig' },
      { dist: 660, grade: 5.5, altitude: 213, scenario: SCENARIO_TYPES.ROLLING, title: 'Kuppe (+5.5%)', advice: '1-2 Gänge hinten runterschalten (Ü)' },
      { dist: 710, grade: -2.0, altitude: 215, scenario: SCENARIO_TYPES.ROLLING, title: 'Kurze Senke (-2%)', advice: 'Wieder 1 Gang hochschalten (Ä)' },
      
      // 720m - 1100m: Steep Climb (+9% to +13.5%)
      { dist: 750, grade: 5.0, altitude: 219, scenario: SCENARIO_TYPES.STEEP_CLIMB, title: 'Anfahrt Berg', advice: 'Steigung nimmt zu!' },
      { dist: 820, grade: 9.5, altitude: 233, scenario: SCENARIO_TYPES.STEEP_CLIMB, title: 'Steilanstieg (+9.5%)', advice: 'Vorne auf kleines Blatt schalten (A-Taste)!' },
      { dist: 910, grade: 13.5, altitude: 260, scenario: SCENARIO_TYPES.STEEP_CLIMB, title: 'Steilste Rampe (+13.5%)', advice: 'Großes Ritzel 27/30T wählen (Ü-Taste)! Trittfrequenz halten.' },
      { dist: 1020, grade: 11.0, altitude: 280, scenario: SCENARIO_TYPES.STEEP_CLIMB, title: 'Steiler Anstieg (+11.0%)', advice: 'Gleichmäßig pedalieren' },
      { dist: 1080, grade: 2.0, altitude: 288, scenario: SCENARIO_TYPES.STEEP_CLIMB, title: 'Passhöhe / Kuppe', advice: 'Bereitmachen für die Abfahrt!' },

      // 1100m - 1350m: Steep Descent (-9.5%)
      { dist: 1120, grade: -4.0, altitude: 286, scenario: SCENARIO_TYPES.STEEP_DESCENT, title: 'Beginn Abfahrt (-4.0%)', advice: 'Vorne auf großes Blatt schalten (Q-Taste)!' },
      { dist: 1200, grade: -9.5, altitude: 260, scenario: SCENARIO_TYPES.STEEP_DESCENT, title: 'Steilabfahrt (-9.5%)', advice: 'Auf kleine Ritzel (12T / 11T) schalten! Nicht überdrehen (>115 RPM)!' },
      { dist: 1300, grade: -6.5, altitude: 236, scenario: SCENARIO_TYPES.STEEP_DESCENT, title: 'Schnelle Abfahrt (-6.5%)', advice: 'Schweren Gang halten' },
      
      // 1350m - 1600m: False flat & Sprint to finish
      { dist: 1380, grade: 0.5, altitude: 232, scenario: SCENARIO_TYPES.SPRINT, title: 'Auslauf Abfahrt', advice: 'Übergang in den Zielsprint' },
      { dist: 1460, grade: 2.5, altitude: 236, scenario: SCENARIO_TYPES.SPRINT, title: 'Falschflach (+2.5%)', advice: 'Kraft auf Stark (Leertaste) & Zielsprint vorbereiten!' },
      { dist: 1540, grade: 1.5, altitude: 239, scenario: SCENARIO_TYPES.SPRINT, title: 'ZIELSPRINT!', advice: 'Letzte Kraftreserven! 95-100 RPM ins Ziel!' },
      { dist: 1600, grade: 0.0, altitude: 240, scenario: SCENARIO_TYPES.SPRINT, title: 'ZIELINIE', advice: 'Session beendet!' }
    ];

    this.profileSamples = this.generateProfileSamples();
  }

  generateProfileSamples(numSamples = 300) {
    const samples = [];
    for (let i = 0; i <= numSamples; i++) {
      const d = (i / numSamples) * this.totalDistanceM;
      const data = this.getStateAtDistance(d, 0, false);
      samples.push({
        dist: d,
        fraction: d / this.totalDistanceM,
        grade: data.grade,
        altitude: data.altitude,
        scenario: data.scenario,
        title: data.title
      });
    }
    return samples;
  }

  getStateAtDistance(distanceMeters, redLightWaitTimeSec = 0, isStandingAtRed = false, redLightCleared = false, greenTimerSec = 0) {
    const clampedDist = Math.max(0, Math.min(this.totalDistanceM, distanceMeters));
    
    // Find waypoint interval based on distance
    let idx = 0;
    while (idx < this.waypoints.length - 1 && this.waypoints[idx + 1].dist <= clampedDist) {
      idx++;
    }

    const w1 = this.waypoints[idx];
    const w2 = this.waypoints[Math.min(idx + 1, this.waypoints.length - 1)];

    let grade = w1.grade;
    let altitude = w1.altitude;
    let scenario = w1.scenario;
    let title = w1.title;
    let advice = w1.advice;
    let lightState = w1.lightState || null;
    let isStop = false;

    if (w1 !== w2 && w2.dist > w1.dist) {
      const factor = (clampedDist - w1.dist) / (w2.dist - w1.dist);
      const smoothFactor = (1 - Math.cos(factor * Math.PI)) / 2;
      grade = w1.grade + (w2.grade - w1.grade) * smoothFactor;
      altitude = w1.altitude + (w2.altitude - w1.altitude) * smoothFactor;
      scenario = factor < 0.5 ? w1.scenario : w2.scenario;
      title = factor < 0.5 ? w1.title : w2.title;
      advice = factor < 0.5 ? w1.advice : w2.advice;
      lightState = w2.lightState || w1.lightState || null;
    }

    // Traffic Light Lifecycle: Approaching (100m-10m) -> 10s Stop (10s-0s) -> Green (2.5s) -> Hidden
    const stopLineDist = 350;
    const distToLight = stopLineDist - clampedDist;
    let lightCountdown = null;
    let lightCountdownUnit = 'M';
    let showLightOverlay = false;

    if (redLightCleared) {
      // Light turned green: show overlay for 2.5 seconds then disappear
      if (greenTimerSec < 2.5) {
        showLightOverlay = true;
        lightCountdown = 'LOS!';
        lightCountdownUnit = '';
        scenario = SCENARIO_TYPES.TRAFFIC_LIGHT;
        lightState = 'green';
        isStop = false;
        title = '🟢 GRÜNE AMPEL';
        advice = 'Ampel ist GRÜN! Losfahren und beim Beschleunigen hochschalten.';
      } else {
        showLightOverlay = false;
      }
    } else if (isStandingAtRed || (clampedDist >= 348 && clampedDist <= 355 && !redLightCleared)) {
      // 10-second red light standstill timer at the 350m stop line
      showLightOverlay = true;
      const totalRedDuration = 10.0;
      const remainRedSec = Math.max(0, Math.ceil(totalRedDuration - redLightWaitTimeSec));
      lightCountdown = remainRedSec;
      lightCountdownUnit = 'SEK';
      scenario = SCENARIO_TYPES.TRAFFIC_LIGHT;
      lightState = 'red';
      isStop = true;
      title = `🚦 Rote Ampel (${remainRedSec}s)`;
      advice = `Rot-Phase: Noch ${remainRedSec}s bis Grün. Bereitmachen zum Anfahren!`;
    } else if (distToLight > 0 && distToLight <= 100) {
      // Approaching the red light (last 100 meters)
      showLightOverlay = true;
      const roundedMeters = Math.min(100, Math.max(10, Math.ceil(distToLight / 10) * 10));
      lightCountdown = roundedMeters;
      lightCountdownUnit = 'M';
      scenario = SCENARIO_TYPES.TRAFFIC_LIGHT;
      lightState = (distToLight <= 40) ? 'red' : 'yellow';
      title = `Ampel in ${roundedMeters}m`;
      advice = 'Ausrollen & VOR DEM STILLSTAND runterschalten (z.B. 34x21Z)!';
    }

    return {
      distance: clampedDist,
      fraction: clampedDist / this.totalDistanceM,
      grade: Math.round(grade * 10) / 10,
      altitude: Math.round(altitude * 10) / 10,
      scenario,
      title,
      advice,
      lightState,
      isStop,
      showLightOverlay,
      lightCountdown,
      lightCountdownUnit,
      distToLight: Math.round(distToLight)
    };
  }
}
