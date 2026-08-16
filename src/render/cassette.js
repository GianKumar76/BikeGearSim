/**
 * Drivetrain & Cassette 2D Canvas / SVG Renderer
 * Left: 2x Front Chainrings (50/34T) & Crankarm
 * Right: 11-Speed Rear Cassette (11-30T) & Rear Derailleur
 */

export class DrivetrainRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.chainOffset = 0;
    this.crankAngle = 0;
    this.cassetteAngle = 0;
    this.pulleyAngle = 0;
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

  render(drivetrainState, cadenceRpm, speedKmh, dtSec) {
    if (!this.ctx || !this.canvas) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w === 0 || h === 0) return;

    // Clear background
    this.ctx.clearRect(0, 0, w, h);

    const { frontIndex, rearIndex, chainrings, cassette, frontTeeth, rearTeeth, crossChaining, gearRatio } = drivetrainState;

    // 1. Physical Forward Rotation Calculations (Drive-side facing left):
    // Crank rotates counter-clockwise to pull top chain forward (leftwards)
    const frontRps = (cadenceRpm / 60);
    const dFrontAngle = frontRps * Math.PI * 2 * dtSec;
    this.crankAngle -= dFrontAngle;

    // Rear Cassette rotates in the same forward direction at exact gear ratio
    const rearRps = frontRps * gearRatio;
    const dRearAngle = rearRps * Math.PI * 2 * dtSec;
    this.cassetteAngle -= dRearAngle;

    // Chain linear speed and Derailleur Pulley rotation (only when actively pedaling!)
    const chainLinearSpeedMs = frontRps > 0 ? (frontRps * (frontTeeth * 0.0127) * 2.5) : 0;
    this.chainOffset += chainLinearSpeedMs * 24 * dtSec;
    this.pulleyAngle -= chainLinearSpeedMs * 35 * dtSec;

    // Scale factor to fit container height
    const scale = Math.max(0.65, Math.min(1.15, h / 190));

    // Geometric positioning: Left = Front Chainrings, Right = Rear Cassette
    const frontX = w * 0.25;
    const frontY = h * 0.44;
    const rearX = w * 0.75;
    const rearY = h * 0.44;

    // Draw chainstays & bike frame geometry silhouette
    this.drawBikeFrame(frontX, frontY, rearX, rearY, scale);

    // 1. Draw Front Chainrings (2 Rings: 34T, 50T) on the LEFT
    this.drawFrontChainrings(frontX, frontY, chainrings, frontIndex, this.crankAngle, scale);

    // 2. Draw Rear Cassette (11 Sprockets) on the RIGHT
    this.drawRearCassette(rearX, rearY, cassette, rearIndex, this.cassetteAngle, scale);

    // 3. Draw Chain connecting Left Front ring to Right Rear sprocket
    this.drawChain(frontX, frontY, frontTeeth, frontIndex, rearX, rearY, rearTeeth, rearIndex, crossChaining, scale);

    // 4. Draw Rear Derailleur Cage & Spinning Pulleys on the RIGHT
    this.drawRearDerailleur(rearX, rearY, rearTeeth, rearIndex, this.pulleyAngle, scale);

    // 5. Draw Top-down Chainline Angle indicator (Mini HUD strip)
    this.drawChainlineIndicator(w, h, frontIndex, rearIndex, cassette.length, crossChaining);
  }

  drawBikeFrame(fx, fy, rx, ry, scale = 1) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = '#1e222d';
    ctx.lineWidth = 10 * scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Chainstay from Front BB to Rear Dropout
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(rx, ry);
    ctx.stroke();

    // Seat tube going up from BB
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + 25 * scale, fy - 80 * scale);
    ctx.stroke();

    // Seatstay going from Rear Dropout up to Seat junction
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(fx + 25 * scale, fy - 80 * scale);
    ctx.stroke();

    // Metal highlights on BB and Dropout
    ctx.fillStyle = '#3a4050';
    ctx.beginPath();
    ctx.arc(fx, fy, 11 * scale, 0, Math.PI * 2);
    ctx.arc(rx, ry, 9 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawFrontChainrings(fx, fy, chainrings, activeIndex, crankAngle, scale = 1) {
    const ctx = this.ctx;

    // Draw 2 chainrings (Small: 34T, Big: 50T)
    for (let i = chainrings.length - 1; i >= 0; i--) {
      const teeth = chainrings[i];
      const radius = (35 + (teeth - 34) * 2.2) * scale;
      const isActive = i === activeIndex;
      const stackOffset = (i === 1 ? 3 : -3) * scale;

      ctx.save();
      ctx.beginPath();
      ctx.arc(fx + stackOffset, fy, radius, 0, Math.PI * 2);

      if (isActive) {
        ctx.fillStyle = '#1c2230';
        ctx.strokeStyle = '#00ffc8';
        ctx.lineWidth = 3 * scale;
        ctx.shadowColor = '#00ffc8';
        ctx.shadowBlur = 10 * scale;
      } else {
        ctx.fillStyle = '#11141a';
        ctx.strokeStyle = '#2d3342';
        ctx.lineWidth = 1.5 * scale;
        ctx.shadowBlur = 0;
      }
      ctx.fill();
      ctx.stroke();

      // Outer chainring rotating teeth
      ctx.save();
      ctx.translate(fx + stackOffset, fy);
      const toothCount = Math.min(teeth, 28);
      ctx.strokeStyle = isActive ? '#00e5ff' : '#3f475a';
      ctx.lineWidth = 2 * scale;
      for (let t = 0; t < toothCount; t++) {
        const angle = (t / toothCount) * Math.PI * 2 + crankAngle;
        const tx1 = Math.cos(angle) * (radius - 2.5 * scale);
        const ty1 = Math.sin(angle) * (radius - 2.5 * scale);
        const tx2 = Math.cos(angle) * (radius + 3 * scale);
        const ty2 = Math.sin(angle) * (radius + 3 * scale);
        ctx.beginPath();
        ctx.moveTo(tx1, ty1);
        ctx.lineTo(tx2, ty2);
        ctx.stroke();
      }

      // Hollow 4-Arm Design
      ctx.strokeStyle = '#181b24';
      ctx.lineWidth = 8 * scale;
      for (let a = 0; a < 4; a++) {
        const armAngle = (a * Math.PI / 2) + crankAngle;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(armAngle) * (radius * 0.8), Math.sin(armAngle) * (radius * 0.8));
        ctx.stroke();
      }
      ctx.restore();

      ctx.restore();
    }

    // Crankarm & Pedal on the Left
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(crankAngle);

    // Carbon Crankarm
    ctx.fillStyle = '#1c1f26';
    ctx.strokeStyle = '#404656';
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.roundRect(-8 * scale, -9 * scale, 85 * scale, 18 * scale, 8 * scale);
    ctx.fill();
    ctx.stroke();

    // Pedal
    ctx.fillStyle = '#2b313e';
    ctx.strokeStyle = '#00ffc8';
    ctx.lineWidth = 1.2 * scale;
    ctx.beginPath();
    ctx.roundRect(68 * scale, -12 * scale, 22 * scale, 24 * scale, 3 * scale);
    ctx.fill();
    ctx.stroke();

    // Bottom Bracket Center cap
    ctx.fillStyle = '#0f1117';
    ctx.strokeStyle = '#00ffc8';
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.arc(0, 0, 12 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Text on Center Cap
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(9 * scale)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${chainrings[activeIndex]}Z`, 0, 0);

    ctx.restore();
  }

  drawRearCassette(rx, ry, cassette, activeIndex, cassetteAngle, scale = 1) {
    const ctx = this.ctx;
    const numSprockets = cassette.length; // 11

    // Draw sprockets from largest (back) to smallest (front)
    for (let i = numSprockets - 1; i >= 0; i--) {
      const teeth = cassette[i];
      const radius = (14 + (teeth - 11) * 2.4) * scale;
      const isActive = i === activeIndex;

      const stackOffsetX = (i - activeIndex) * 1.8 * scale;
      const posX = rx + stackOffsetX;

      ctx.save();
      ctx.beginPath();
      ctx.arc(posX, ry, radius, 0, Math.PI * 2);

      if (isActive) {
        ctx.fillStyle = '#222838';
        ctx.strokeStyle = '#00ffc8';
        ctx.lineWidth = 2.5 * scale;
        ctx.shadowColor = '#00ffc8';
        ctx.shadowBlur = 8 * scale;
      } else {
        ctx.fillStyle = '#141720';
        ctx.strokeStyle = '#2e3444';
        ctx.lineWidth = 1.2 * scale;
        ctx.shadowBlur = 0;
      }
      ctx.fill();
      ctx.stroke();

      // Sprocket Rotating Teeth & Windows Simulation
      ctx.save();
      ctx.translate(posX, ry);
      ctx.rotate(cassetteAngle);

      // Draw fewer, distinct teeth to prevent 60fps stroboscopic frequency aliasing (wagon-wheel effect)
      const toothCount = Math.min(teeth, 14);
      ctx.strokeStyle = isActive ? '#00ffc8' : '#4a5368';
      ctx.lineWidth = 1.6 * scale;
      for (let t = 0; t < toothCount; t++) {
        const angle = (t / toothCount) * Math.PI * 2;
        // Directional slanted teeth (pointing in drive direction)
        const tx1 = Math.cos(angle) * (radius - 2.5 * scale);
        const ty1 = Math.sin(angle) * (radius - 2.5 * scale);
        const tx2 = Math.cos(angle - 0.12) * (radius + 2.5 * scale);
        const ty2 = Math.sin(angle - 0.12) * (radius + 2.5 * scale);
        ctx.beginPath();
        ctx.moveTo(tx1, ty1);
        ctx.lineTo(tx2, ty2);
        ctx.stroke();
      }

      // Directional Curved Shimano Hyperglide Spider Arms (3-arm spiral)
      // The spiral curve makes forward rotation unmistakably clear without optical illusion
      if (radius > 20 * scale) {
        ctx.strokeStyle = isActive ? 'rgba(0, 255, 200, 0.6)' : '#252d3d';
        ctx.lineWidth = (isActive ? 2.5 : 1.8) * scale;
        ctx.lineCap = 'round';

        const numArms = 3;
        for (let a = 0; a < numArms; a++) {
          const armAngle = (a / numArms) * Math.PI * 2;
          ctx.beginPath();
          const rInner = 8 * scale;
          const rOuter = radius * 0.75;
          const x1 = Math.cos(armAngle) * rInner;
          const y1 = Math.sin(armAngle) * rInner;
          const x2 = Math.cos(armAngle - 0.5) * rOuter;
          const y2 = Math.sin(armAngle - 0.5) * rOuter;
          const cpX = Math.cos(armAngle - 0.2) * (radius * 0.45);
          const cpY = Math.sin(armAngle - 0.2) * (radius * 0.45);

          ctx.moveTo(x1, y1);
          ctx.quadraticCurveTo(cpX, cpY, x2, y2);
          ctx.stroke();
        }
      }

      // Distinct Single Rotating Accent Dot on outer sprocket ring (eliminates any rotational ambiguity)
      if (radius > 26 * scale) {
        ctx.fillStyle = isActive ? '#00e5ff' : '#5a667d';
        ctx.beginPath();
        const dotR = (isActive ? 2.8 : 2.0) * scale;
        ctx.arc(radius * 0.62, 0, dotR, 0, Math.PI * 2);
        ctx.fill();
      }

      // Machined concentric grooves
      ctx.strokeStyle = isActive ? 'rgba(0, 255, 200, 0.25)' : 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1 * scale;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.72, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore(); // restore local rotation

      // Static Lockring Center Label for active sprocket
      if (isActive) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(10 * scale)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${teeth}Z`, posX, ry);
      }
      ctx.restore();
    }

    // Rear Hub Lockring
    ctx.fillStyle = '#0a0c10';
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.arc(rx, ry, 7 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  drawChain(fx, fy, frontTeeth, frontIndex, rx, ry, rearTeeth, rearIndex, crossChaining, scale = 1) {
    const ctx = this.ctx;
    const frontRadius = (35 + (frontTeeth - 34) * 2.2) * scale;
    const rearRadius = (14 + (rearTeeth - 11) * 2.4) * scale;

    const pFrontTop = { x: fx, y: fy - frontRadius };
    const pRearTop = { x: rx, y: ry - rearRadius };
    const pFrontBottom = { x: fx, y: fy + frontRadius };
    const pDerailleurGuide = { x: rx + 4 * scale, y: ry + rearRadius + 14 * scale };
    const pDerailleurTension = { x: rx - 10 * scale, y: ry + rearRadius + 36 * scale };

    let chainColor = '#00ffc8'; // 🟢 Optimal (Green)
    let chainGlow = 'rgba(0, 255, 200, 0.45)';
    let strokeWidth = 4.5 * scale;

    if (crossChaining.level === 'severe') {
      chainColor = '#ff3366'; // 🔴 Extreme Cross-Chaining (Red)
      chainGlow = 'rgba(255, 51, 102, 0.75)';
      strokeWidth = 5.5 * scale;
    } else if (crossChaining.level === 'warning') {
      chainColor = '#ffbb00'; // 🟡 Moderate / Tolerable Cross-Chaining (Yellow)
      chainGlow = 'rgba(255, 187, 0, 0.55)';
      strokeWidth = 5.0 * scale;
    }

    ctx.save();
    ctx.strokeStyle = chainColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = chainGlow;
    ctx.shadowBlur = 7 * scale;

    // Top straight run (From Left Front Chainring to Right Rear Cassette)
    ctx.beginPath();
    ctx.moveTo(pFrontTop.x, pFrontTop.y);
    ctx.lineTo(pRearTop.x, pRearTop.y);
    ctx.stroke();

    // Wrap around rear sprocket on the right
    ctx.beginPath();
    ctx.arc(rx, ry, rearRadius, -Math.PI / 2, Math.PI / 2, false);
    ctx.stroke();

    // Lower derailleur S-loop path on the right
    ctx.beginPath();
    ctx.moveTo(rx, ry + rearRadius);
    ctx.lineTo(pDerailleurGuide.x, pDerailleurGuide.y);
    ctx.lineTo(pDerailleurTension.x, pDerailleurTension.y);
    ctx.lineTo(pFrontBottom.x, pFrontBottom.y);
    ctx.stroke();

    // Wrap around front chainring on the left
    ctx.beginPath();
    ctx.arc(fx, fy, frontRadius, Math.PI / 2, -Math.PI / 2, false);
    ctx.stroke();

    // Chain links rollers animation (moving in forward drive loop)
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2 * scale;
    ctx.setLineDash([3, 5]);
    ctx.lineDashOffset = this.chainOffset;

    ctx.beginPath();
    ctx.moveTo(pFrontTop.x, pFrontTop.y);
    ctx.lineTo(pRearTop.x, pRearTop.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(pDerailleurTension.x, pDerailleurTension.y);
    ctx.lineTo(pFrontBottom.x, pFrontBottom.y);
    ctx.stroke();

    ctx.restore();
  }

  drawRearDerailleur(rx, ry, rearTeeth, rearIndex, pulleyAngle = 0, scale = 1) {
    const ctx = this.ctx;
    const rearRadius = (14 + (rearTeeth - 11) * 2.4) * scale;

    const guideX = rx + 4 * scale;
    const guideY = ry + rearRadius + 14 * scale;
    const tensionX = rx - 10 * scale;
    const tensionY = ry + rearRadius + 36 * scale;

    ctx.save();
    // Derailleur Outer Cage Plate
    ctx.strokeStyle = '#252936';
    ctx.lineWidth = 4.5 * scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(guideX, guideY);
    ctx.lineTo(tensionX, tensionY);
    ctx.stroke();

    // Helper to draw spinning 11T jockey wheel
    const drawPulley = (px, py, angle) => {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(angle);

      // Pulley body
      ctx.fillStyle = '#111318';
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1.2 * scale;
      ctx.beginPath();
      ctx.arc(0, 0, 7 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pulley rotating teeth
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1 * scale;
      for (let t = 0; t < 8; t++) {
        const pAngle = (t / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(pAngle) * (5 * scale), Math.sin(pAngle) * (5 * scale));
        ctx.lineTo(Math.cos(pAngle) * (8.5 * scale), Math.sin(pAngle) * (8.5 * scale));
        ctx.stroke();
      }

      // Center Pulley Bolt
      ctx.fillStyle = '#4a5568';
      ctx.beginPath();
      ctx.arc(0, 0, 2.5 * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    // Upper Guide Pulley
    drawPulley(guideX, guideY, pulleyAngle);

    // Lower Tension Pulley
    drawPulley(tensionX, tensionY, -pulleyAngle);

    ctx.restore();
  }

  drawChainlineIndicator(w, h, frontIdx, rearIdx, totalRear, crossChaining) {
    const ctx = this.ctx;
    const barX = w * 0.06;
    const barY = h - 20;
    const barW = w * 0.88;
    const barH = 14;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 17, 24, 0.85)';
    ctx.strokeStyle = '#252936';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 6);
    ctx.fill();
    ctx.stroke();

    // Left label: Vorne 2-fach (Kettenblatt)
    ctx.font = '9px system-ui, sans-serif';
    ctx.fillStyle = '#7a8296';
    ctx.textAlign = 'left';
    ctx.fillText('VORNE (34T / 50T)', barX + 6, barY + 10);

    // Right label: Hinten 11-fach (Kassette)
    ctx.textAlign = 'right';
    ctx.fillText('HINTEN (11T - 30T)', barX + barW - 6, barY + 10);

    // Sprocket slots on the RIGHT side
    const slotStep = (barW * 0.42) / (totalRear - 1);
    const startSlotX = barX + barW * 0.52;

    for (let r = 0; r < totalRear; r++) {
      const sx = startSlotX + r * slotStep;
      const isSelected = r === rearIdx;

      ctx.fillStyle = isSelected ? '#00ffc8' : '#2d3345';
      ctx.beginPath();
      ctx.arc(sx, barY + barH / 2, isSelected ? 3.5 : 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Front Chainring slots on the LEFT side
    const f1X = barX + barW * 0.32;
    const f2X = barX + barW * 0.36;
    const activeFrontX = frontIdx === 0 ? f1X : f2X;
    const activeRearX = startSlotX + rearIdx * slotStep;

    // Connecting chainline between front and rear in indicator
    ctx.strokeStyle = crossChaining.color || '#00ffc8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(activeFrontX, barY + barH / 2);
    ctx.lineTo(activeRearX, barY + barH / 2);
    ctx.stroke();

    ctx.fillStyle = frontIdx === 0 ? (crossChaining.color || '#00ffc8') : '#2d3345';
    ctx.beginPath();
    ctx.arc(f1X, barY + barH / 2, frontIdx === 0 ? 3.5 : 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = frontIdx === 1 ? (crossChaining.color || '#00ffc8') : '#2d3345';
    ctx.beginPath();
    ctx.arc(f2X, barY + barH / 2, frontIdx === 1 ? 3.5 : 2, 0, Math.PI * 2);
    ctx.fill();

    // Cross-chaining badge
    if (crossChaining.level !== 'ok') {
      const badgeColor = crossChaining.color || '#ffbb00';
      ctx.fillStyle = badgeColor;
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(crossChaining.name.toUpperCase(), w * 0.44, barY - 4);
    }

    ctx.restore();
  }
}
