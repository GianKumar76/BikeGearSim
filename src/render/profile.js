/**
 * 2D Elevation Profile & Scrolling Parallax Road Landscape Renderer
 */

export class ProfileRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.roadScrollOffset = 0;
    this.cloudOffset = 0;
    this.crankAngle = 0;
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    if (this.ctx) {
      this.ctx.resetTransform();
      this.ctx.scale(dpr, dpr);
    }
  }

  render(routeState, physicsState, routeProfile, dtSec) {
    if (!this.ctx || !this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    const { speedKmh, cadenceRpm, distanceMeters } = physicsState;
    const { distance, grade, altitude, scenario, title, lightState, isStop } = routeState;

    // Update parallax offsets ONLY when speed is greater than 0
    const speedMs = speedKmh / 3.6;
    this.roadScrollOffset += speedMs * 30 * dtSec;
    this.cloudOffset += (speedMs * 2 + 0.2) * dtSec;

    // Update crank angle strictly from active cadence (clockwise forward rotation!)
    if (cadenceRpm > 0) {
      const frontRps = cadenceRpm / 60;
      this.crankAngle += frontRps * Math.PI * 2 * dtSec;
    }

    // Split Canvas into 2 regions:
    // Top 58%: 2D Road Landscape & Rider & Traffic Light
    // Bottom 42%: Elevation Profile Graph with Marker
    const sceneH = h * 0.56;
    const graphH = h - sceneH;

    // 1. Draw 2D Landscape
    this.drawLandscape(w, sceneH, grade, scenario, lightState, isStop, cadenceRpm, speedKmh, dtSec);

    // 2. Draw Elevation Profile Graph based on physical distance traveled
    this.drawElevationGraph(0, sceneH, w, graphH, routeProfile.profileSamples, distance, routeProfile.totalDistanceM);
  }

  drawLandscape(w, h, grade, scenario, lightState, isStop, cadenceRpm, speedKmh, dtSec) {
    const ctx = this.ctx;
    const scale = Math.min(1.0, Math.max(0.6, h / 110));

    // Sky gradient based on scenario / grade
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    if (grade > 7) {
      skyGrad.addColorStop(0, '#0c1527');
      skyGrad.addColorStop(1, '#203354');
    } else if (grade < -4) {
      skyGrad.addColorStop(0, '#10223b');
      skyGrad.addColorStop(1, '#2d4b75');
    } else {
      skyGrad.addColorStop(0, '#0d131d');
      skyGrad.addColorStop(1, '#1b2636');
    }

    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Distant Mountains
    this.drawDistantMountains(w, h, grade);

    // Road Slope Angle
    const roadY = h * 0.82;
    const slopeAngleRad = (-grade * Math.PI) / 180 * 0.6; // Visual pitch

    ctx.save();
    ctx.translate(w * 0.32, roadY);
    ctx.rotate(slopeAngleRad);

    // Road Tarmac Surface
    ctx.fillStyle = '#1c202a';
    ctx.fillRect(-w, -4 * scale, w * 3, 100 * scale);

    // Grass / Verge
    ctx.fillStyle = '#15241b';
    ctx.fillRect(-w, -10 * scale, w * 3, 8 * scale);

    // Curb line
    ctx.strokeStyle = '#3a4454';
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.moveTo(-w, -3 * scale);
    ctx.lineTo(w * 2, -3 * scale);
    ctx.stroke();

    // Road dashed white center line (moves backwards under the forward-facing rider)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5 * scale;
    ctx.setLineDash([20 * scale, 15 * scale]);
    ctx.lineDashOffset = this.roadScrollOffset;
    ctx.beginPath();
    ctx.moveTo(-w, 18 * scale);
    ctx.lineTo(w * 2, 18 * scale);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Traffic Light if in traffic_light scenario
    if (scenario === 'traffic_light') {
      this.drawTrafficLight(ctx, 100 * scale, -100 * scale, lightState, scale);
    }

    // Draw Bridge Architecture if in bridge_ramp scenario
    if (scenario === 'bridge_ramp') {
      this.drawBridgeArchitecture(ctx, scale);
    }

    // Draw Finish Arch if in final sprint
    if (scenario === 'sprint') {
      this.drawFinishArch(ctx, 140 * scale, -110 * scale, scale);
    }

    // Draw Cyclist & Bike at center position
    this.drawCyclist(ctx, 0, -2 * scale, cadenceRpm, grade, speedKmh, scale);

    ctx.restore();
  }

  drawBridgeArchitecture(ctx, scale = 1) {
    ctx.save();
    // Steel bridge arch & suspension cables
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.arc(0, 40 * scale, 160 * scale, Math.PI * 1.15, Math.PI * 1.85, false);
    ctx.stroke();

    // Secondary inner steel truss
    ctx.strokeStyle = '#3a4a60';
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.arc(0, 40 * scale, 175 * scale, Math.PI * 1.15, Math.PI * 1.85, false);
    ctx.stroke();

    // Vertical suspension cables
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
    ctx.lineWidth = 1.2 * scale;
    for (let x = -130; x <= 130; x += 22) {
      const rad = 160 * scale;
      const xPos = x * scale;
      if (Math.abs(xPos) < rad) {
        const archY = 40 * scale - Math.sqrt(Math.max(0, Math.pow(rad, 2) - Math.pow(xPos, 2)));
        ctx.beginPath();
        ctx.moveTo(xPos, -2 * scale);
        ctx.lineTo(xPos, archY);
        ctx.stroke();
      }
    }

    // Bridge Guardrail & safety fence
    ctx.strokeStyle = '#607088';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(-160 * scale, -20 * scale);
    ctx.lineTo(160 * scale, -20 * scale);
    ctx.stroke();

    for (let x = -150; x <= 150; x += 18) {
      ctx.beginPath();
      ctx.moveTo(x * scale, -2 * scale);
      ctx.lineTo(x * scale, -20 * scale);
      ctx.stroke();
    }

    // Bridge nameplate
    ctx.fillStyle = '#00e5ff';
    ctx.font = `bold ${Math.round(8 * scale)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('BRÜCKE • 8% RAMPE', 0, -65 * scale);

    ctx.restore();
  }

  drawDistantMountains(w, h, grade) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = '#111824';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.65);
    ctx.lineTo(w * 0.2, h * 0.38);
    ctx.lineTo(w * 0.45, h * 0.55);
    ctx.lineTo(w * 0.75, h * 0.28);
    ctx.lineTo(w * 0.95, h * 0.50);
    ctx.lineTo(w, h * 0.65);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fill();

    // Mid-ground Hills
    ctx.fillStyle = '#162130';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.72);
    ctx.lineTo(w * 0.3, h * 0.52);
    ctx.lineTo(w * 0.6, h * 0.64);
    ctx.lineTo(w * 0.85, h * 0.48);
    ctx.lineTo(w, h * 0.70);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fill();
    ctx.restore();
  }

  drawTrafficLight(ctx, x, y, state, scale = 1) {
    ctx.save();
    // Post
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 4 * scale;
    ctx.beginPath();
    ctx.moveTo(x + 10 * scale, y + 80 * scale);
    ctx.lineTo(x + 10 * scale, y + 15 * scale);
    ctx.stroke();

    // Housing Box
    ctx.fillStyle = '#0a0d14';
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.roundRect(x, y - 40 * scale, 22 * scale, 60 * scale, 4 * scale);
    ctx.fill();
    ctx.stroke();

    const bulbR = 6 * scale;
    const bulbX = x + 11 * scale;

    // Red Bulb
    ctx.fillStyle = (state === 'red') ? '#ff3344' : '#3a1518';
    if (state === 'red') { ctx.shadowColor = '#ff3344'; ctx.shadowBlur = 12 * scale; }
    ctx.beginPath();
    ctx.arc(bulbX, y - 26 * scale, bulbR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Yellow Bulb
    ctx.fillStyle = (state === 'yellow') ? '#ffbb00' : '#3d3010';
    if (state === 'yellow') { ctx.shadowColor = '#ffbb00'; ctx.shadowBlur = 12 * scale; }
    ctx.beginPath();
    ctx.arc(bulbX, y - 10 * scale, bulbR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Green Bulb
    ctx.fillStyle = (state === 'green') ? '#00ffc8' : '#0e2b24';
    if (state === 'green') { ctx.shadowColor = '#00ffc8'; ctx.shadowBlur = 12 * scale; }
    ctx.beginPath();
    ctx.arc(bulbX, y + 6 * scale, bulbR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  drawFinishArch(ctx, x, y, scale = 1) {
    ctx.save();
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 6 * scale;
    ctx.strokeRect(x, y, 45 * scale, 100 * scale);
    ctx.fillStyle = '#111';
    ctx.fillRect(x, y, 45 * scale, 18 * scale);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(9 * scale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('ZIEL', x + 22 * scale, y + 13 * scale);
    ctx.restore();
  }

  drawCyclist(ctx, x, y, cadenceRpm, grade, speedKmh, scale = 1) {
    ctx.save();
    ctx.translate(x, y);

    // Wheel radius
    const wheelR = 18 * scale;
    const rearWheelX = -35 * scale;
    const frontWheelX = 35 * scale;
    const wheelY = -wheelR;

    // Wheels (Rims)
    ctx.strokeStyle = '#282f3d';
    ctx.lineWidth = 2.5 * scale;
    ctx.beginPath();
    ctx.arc(rearWheelX, wheelY, wheelR, 0, Math.PI * 2);
    ctx.arc(frontWheelX, wheelY, wheelR, 0, Math.PI * 2);
    ctx.stroke();

    // Wheel spokes rotating forward (clockwise with road speed)
    const wheelAngle = this.roadScrollOffset * 0.12;
    ctx.strokeStyle = '#3e4a5e';
    ctx.lineWidth = 1 * scale;
    for (let sp = 0; sp < 4; sp++) {
      const spA = wheelAngle + (sp * Math.PI / 4);
      // Rear spokes
      ctx.beginPath();
      ctx.moveTo(rearWheelX - Math.cos(spA) * wheelR * 0.88, wheelY - Math.sin(spA) * wheelR * 0.88);
      ctx.lineTo(rearWheelX + Math.cos(spA) * wheelR * 0.88, wheelY + Math.sin(spA) * wheelR * 0.88);
      ctx.stroke();
      // Front spokes
      ctx.beginPath();
      ctx.moveTo(frontWheelX - Math.cos(spA) * wheelR * 0.88, wheelY - Math.sin(spA) * wheelR * 0.88);
      ctx.lineTo(frontWheelX + Math.cos(spA) * wheelR * 0.88, wheelY + Math.sin(spA) * wheelR * 0.88);
      ctx.stroke();
    }

    // Wheel Hubs
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.arc(rearWheelX, wheelY, 2.5 * scale, 0, Math.PI * 2);
    ctx.arc(frontWheelX, wheelY, 2.5 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Bike Frame Diamond Tubes
    const bbX = 0;
    const bbY = -wheelR;
    const saddleX = -14 * scale;
    const saddleY = -wheelR - 30 * scale;
    const headX = 25 * scale;
    const headY = -wheelR - 28 * scale;

    ctx.strokeStyle = '#00ffc8';
    ctx.lineWidth = 3 * scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = '#00ffc8';
    ctx.shadowBlur = 4 * scale;

    ctx.beginPath();
    ctx.moveTo(rearWheelX, wheelY);
    ctx.lineTo(bbX, bbY);
    ctx.lineTo(saddleX, saddleY);
    ctx.lineTo(rearWheelX, wheelY);
    ctx.moveTo(bbX, bbY);
    ctx.lineTo(headX, headY);
    ctx.moveTo(saddleX, saddleY);
    ctx.lineTo(headX, headY);
    ctx.moveTo(headX, headY);
    ctx.lineTo(frontWheelX, wheelY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Handlebar & Drops
    ctx.strokeStyle = '#a0aec0';
    ctx.lineWidth = 2.5 * scale;
    ctx.beginPath();
    ctx.moveTo(headX, headY);
    ctx.lineTo(headX + 6 * scale, headY - 6 * scale);
    ctx.lineTo(headX + 11 * scale, headY - 3 * scale);
    ctx.stroke();

    // Saddle
    ctx.fillStyle = '#111318';
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    ctx.roundRect(saddleX - 9 * scale, saddleY - 5 * scale, 18 * scale, 5 * scale, 2 * scale);
    ctx.fill();
    ctx.stroke();

    // Rider Figure
    const isSprintOrDescent = (grade < -3 || speedKmh > 40);
    const hipX = saddleX + 2 * scale;
    const hipY = saddleY - 6 * scale;
    const shoulderX = headX - (isSprintOrDescent ? 3 * scale : 8 * scale);
    const shoulderY = headY - (isSprintOrDescent ? 14 * scale : 20 * scale);
    const headXPos = shoulderX + 6 * scale;
    const headYPos = shoulderY - 9 * scale;

    // Torso (Jersey)
    ctx.strokeStyle = '#e53e3e';
    ctx.lineWidth = 7 * scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(shoulderX, shoulderY);
    ctx.stroke();

    // Helmet & Head
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e53e3e';
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.ellipse(headXPos, headYPos, 7 * scale, 5 * scale, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Arms to Handlebars
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.lineTo(headX + 8 * scale, headY - 4 * scale);
    ctx.stroke();

    // Animated Pedaling Legs (Cranks stand still during coasting / freewheel / braking!)
    const pedalRadius = 8 * scale;
    const angle = this.crankAngle;
    const pedalX = bbX + Math.cos(angle) * pedalRadius;
    const pedalY = bbY + Math.sin(angle) * pedalRadius;

    const kneeX = hipX + 9 * scale + Math.sin(angle) * 6 * scale;
    const kneeY = hipY + 12 * scale - Math.cos(angle) * 6 * scale;

    // Thigh & Shin
    ctx.strokeStyle = '#1a202c';
    ctx.lineWidth = 4.5 * scale;
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(kneeX, kneeY);
    ctx.lineTo(pedalX, pedalY);
    ctx.stroke();

    ctx.restore();
  }

  drawElevationGraph(x, y, w, h, samples, currentTimeSec, totalDurationSec) {
    const ctx = this.ctx;
    if (!samples || samples.length === 0) return;

    ctx.save();
    // Graph Area Background
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(x, y, w, h);

    // Top border separator
    ctx.strokeStyle = '#1e2433';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.stroke();

    const paddingX = 40;
    const paddingY = 16;
    const plotW = w - paddingX * 2;
    const plotH = h - paddingY * 2;

    // Find min / max altitude
    let minAlt = 190;
    let maxAlt = 300;

    // Create Path for elevation filled polygon
    const points = [];
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      const px = x + paddingX + (s.dist / totalDurationSec) * plotW; // totalDurationSec is totalDistanceM
      const altNorm = (s.altitude - minAlt) / (maxAlt - minAlt);
      const py = y + h - paddingY - altNorm * plotH;
      points.push({ x: px, y: py, sample: s });
    }

    // Gradient fill under the curve
    const areaGrad = ctx.createLinearGradient(0, y, 0, y + h);
    areaGrad.addColorStop(0, 'rgba(0, 255, 200, 0.35)');
    areaGrad.addColorStop(0.5, 'rgba(0, 229, 255, 0.15)');
    areaGrad.addColorStop(1, 'rgba(10, 13, 20, 0.0)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, y + h - paddingY);
    for (const p of points) {
      ctx.lineTo(p.x, p.y);
    }
    ctx.lineTo(points[points.length - 1].x, y + h - paddingY);
    ctx.closePath();
    ctx.fillStyle = areaGrad;
    ctx.fill();

    // Elevation Stroke Line (Color-coded by slope)
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const grade = p1.sample.grade;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      
      if (grade >= 8) ctx.strokeStyle = '#ff3366'; // Steep climb
      else if (grade >= 4) ctx.strokeStyle = '#ff9900'; // Moderate climb
      else if (grade <= -4) ctx.strokeStyle = '#00e5ff'; // Fast descent
      else ctx.strokeStyle = '#00ffc8'; // Flat / slight rolling

      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Draw Scenario Marker Badges (Ampel 350m, Wellen 500m, Berg 900m, Abfahrt 1200m, Ziel 1600m)
    this.drawScenarioMarkers(ctx, x + paddingX, y, plotW, plotH, paddingY);

    // Draw Current Position Indicator Pin & Vertical Line
    const currentFraction = Math.min(1, Math.max(0, currentTimeSec / totalDurationSec));
    const currentX = x + paddingX + currentFraction * plotW;
    
    // Find current Y on graph
    const sampleIdx = Math.min(samples.length - 1, Math.floor(currentFraction * (samples.length - 1)));
    const currentPoint = points[sampleIdx] || points[0];

    // Glow vertical cursor line
    ctx.strokeStyle = 'rgba(0, 255, 200, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(currentX, y + 4);
    ctx.lineTo(currentX, y + h - paddingY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Rider Marker Dot
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#00ffc8';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00ffc8';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(currentX, currentPoint.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Altitude & Distance Labels
    ctx.fillStyle = '#7a8599';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Start: 0m', x + paddingX, y + h - 4);
    ctx.textAlign = 'center';
    ctx.fillText('Pass: 290m (+13.5%)', x + paddingX + plotW * 0.68, y + 14);
    ctx.textAlign = 'right';
    ctx.fillText('Ziel: 1.600m', x + paddingX + plotW, y + h - 4);

    ctx.restore();
  }

  drawScenarioMarkers(ctx, startX, y, plotW, plotH, paddingY) {
    const markers = [
      { f: 350 / 1600, label: '🚦 Ampel', color: '#ffbb00' },
      { f: 550 / 1600, label: '⛰️ Kuppen', color: '#ff9900' },
      { f: 950 / 1600, label: '🏔️ Berg (+13.5%)', color: '#ff3366' },
      { f: 1250 / 1600, label: '💨 Abfahrt (-9.5%)', color: '#00e5ff' },
      { f: 1550 / 1600, label: '🏁 Ziel', color: '#00ffc8' }
    ];

    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';

    for (const m of markers) {
      const mx = startX + m.f * plotW;
      const my = y + 12;

      ctx.fillStyle = 'rgba(20, 24, 34, 0.85)';
      ctx.strokeStyle = m.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(mx - 32, my - 2, 64, 16, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = m.color;
      ctx.fillText(m.label, mx, my + 10);
    }
  }
}

function routeStateTimeFraction(renderer) {
  return 0;
}
