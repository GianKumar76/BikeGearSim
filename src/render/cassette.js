/**
 * Unified 3D Perspective Drivetrain Renderer (Pure 3D Mathematics)
 * Camera: Positioned behind the rear hub looking forward-up along the chainstay
 * Foreground (Lower-Left): 11-Speed Cassette (11T - 30T)
 * Background (Upper-Center/Right): 2x Chainrings (34T / 50T) & Shimano Crankset
 * Mathematically consistent 3D projection with vanishing point, perspective foreshortening, and 3D chainline
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

  /**
   * 3D Perspective Projection Function
   * Maps 3D world coordinates (x: lateral mm, y: longitudinal mm, z: vertical mm)
   * to 2D screen coordinates (sx, sy) with perspective scale.
   */
  project(x, y, z, centerX, centerY, scale = 1) {
    // Camera settings:
    // camX: slightly to the right of cassette center for clear chainline visibility
    // camY: behind the rear axle (negative Y)
    // camZ: slightly above the axle looking down-forward
    const camX = 14;
    const camY = -280;
    const camZ = 20;

    const fov = 380; // Focal length
    const depth = (y - camY);
    const pScale = (fov / depth) * scale;

    const sx = centerX + (x - camX) * pScale;
    const sy = centerY - (z - camZ) * pScale;

    return { sx, sy, pScale, depth };
  }

  render(drivetrainState, cadenceRpm, speedKmh, dtSec) {
    if (!this.ctx || !this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w === 0 || h === 0) return;

    this.ctx.clearRect(0, 0, w, h);

    const { frontIndex, rearIndex, chainrings, cassette, frontTeeth, rearTeeth, crossChaining, gearRatio } = drivetrainState;

    // Physical Rotation Calculations (Clockwise forward):
    const frontRps = (cadenceRpm / 60);
    const dFrontAngle = frontRps * Math.PI * 2 * dtSec;
    this.crankAngle += dFrontAngle;

    const rearRps = frontRps * gearRatio;
    const dRearAngle = rearRps * Math.PI * 2 * dtSec;
    this.cassetteAngle += dRearAngle;

    const chainLinearSpeedMs = frontRps > 0 ? (frontRps * (frontTeeth * 0.0127) * 2.5) : 0;
    this.chainOffset += chainLinearSpeedMs * 24 * dtSec;
    this.pulleyAngle += chainLinearSpeedMs * 35 * dtSec;

    const scale = Math.max(0.65, Math.min(1.15, h / 200));

    // Screen Center Anchor for 3D View:
    // Cassette (y=0) appears in the lower-left; Chainrings (y=360) recede up and to the center/right
    const centerX = w * 0.32;
    const centerY = h * 0.58;

    // 1. Draw 3D Bike Frame (Chainstay & Seatstay in consistent 3D)
    this.draw3DFrame(centerX, centerY, scale);

    // 2. Draw 11-Speed Cassette in 3D (at y = 0, stepped along x)
    const sprocketCoords = this.draw3DCassette(centerX, centerY, cassette, rearIndex, this.cassetteAngle, scale);

    // 3. Draw Front Crankset & Chainrings in 3D (at y = 360, stepped along x)
    const chainringCoords = this.draw3DChainrings(centerX, centerY, chainrings, frontIndex, this.crankAngle, scale);

    // 4. Draw 3D Chain connecting active rear cog (3D) to active front ring (3D)
    this.draw3DChain(centerX, centerY, sprocketCoords[rearIndex], chainringCoords[frontIndex], crossChaining, scale);

    // 5. Draw 3D Rear Derailleur shifting directly under active rear cog
    this.draw3DDerailleur(centerX, centerY, sprocketCoords[rearIndex], this.pulleyAngle, scale);

    // 6. Draw 3D Perspective HUD at the bottom
    this.drawPerspectiveHUD(w, h, frontIndex, rearIndex, chainrings, cassette, crossChaining, scale);
  }

  draw3DFrame(centerX, centerY, scale) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = '#181d28';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 3D Points:
    // Rear Dropout: (x=24, y=0, z=0)
    // Bottom Bracket: (x=4, y=360, z=0)
    // Seat Cluster: (x=0, y=260, z=220)
    const pDropout = this.project(24, 0, 0, centerX, centerY, scale);
    const pBB = this.project(4, 360, 0, centerX, centerY, scale);
    const pSeat = this.project(0, 260, 220, centerX, centerY, scale);

    // Chainstay
    ctx.lineWidth = 10 * pDropout.pScale;
    ctx.beginPath();
    ctx.moveTo(pDropout.sx, pDropout.sy);
    ctx.lineTo(pBB.sx, pBB.sy);
    ctx.stroke();

    // Seat Tube
    ctx.lineWidth = 8 * pBB.pScale;
    ctx.beginPath();
    ctx.moveTo(pBB.sx, pBB.sy);
    ctx.lineTo(pSeat.sx, pSeat.sy);
    ctx.stroke();

    // Seatstay
    ctx.lineWidth = 6 * pDropout.pScale;
    ctx.beginPath();
    ctx.moveTo(pDropout.sx, pDropout.sy);
    ctx.lineTo(pSeat.sx, pSeat.sy);
    ctx.stroke();

    // Dropout metal highlight
    ctx.fillStyle = '#2d3546';
    ctx.beginPath();
    ctx.arc(pDropout.sx, pDropout.sy, 8 * pDropout.pScale, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Draw the 11-Speed Cassette in true 3D (Positioned at y=0, spaced along x-axis from inner 30T to outer 11T)
   */
  draw3DCassette(centerX, centerY, cassette, activeIndex, angle, scale) {
    const ctx = this.ctx;
    const numSprockets = cassette.length; // 11
    const sprocketCoords = [];

    // Lateral mm positions on freehub body:
    // i = 0 (11T): x = +18mm (outermost, closest to dropout/camera)
    // i = 10 (30T): x = -20mm (innermost, closest to wheel spokes)
    for (let i = 0; i < numSprockets; i++) {
      const teeth = cassette[i];
      // Radius in mm: 11T = 23mm, 30T = 62mm
      const radiusMm = 20 + (teeth - 11) * 2.2;
      const xMm = 18 - i * 3.8;
      const yMm = 0;

      const pCenter = this.project(xMm, yMm, 0, centerX, centerY, scale);
      sprocketCoords.push({
        xMm,
        yMm,
        radiusMm,
        teeth,
        index: i,
        pCenter
      });
    }

    // 1. Draw Freehub Cylinder
    const pInnerHub = this.project(-24, 0, 0, centerX, centerY, scale);
    const pOuterHub = this.project(22, 0, 0, centerX, centerY, scale);
    ctx.save();
    ctx.fillStyle = '#0a0d14';
    ctx.strokeStyle = '#222838';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(pInnerHub.sx, pInnerHub.sy - 8 * pInnerHub.pScale, pOuterHub.sx - pInnerHub.sx, 16 * pInnerHub.pScale, 3);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 2. Draw 11 Sprockets (From innermost 30T back to outermost 11T front)
    for (let i = numSprockets - 1; i >= 0; i--) {
      const sp = sprocketCoords[i];
      const isActive = (i === activeIndex);

      // Project top, bottom, front, back points of the 3D circle to get exact perspective ellipse
      const pTop = this.project(sp.xMm, sp.yMm, sp.radiusMm, centerX, centerY, scale);
      const pBottom = this.project(sp.xMm, sp.yMm, -sp.radiusMm, centerX, centerY, scale);
      const pFront = this.project(sp.xMm, sp.yMm + sp.radiusMm * 0.28, 0, centerX, centerY, scale);
      const pBack = this.project(sp.xMm, sp.yMm - sp.radiusMm * 0.28, 0, centerX, centerY, scale);

      const rY = (pBottom.sy - pTop.sy) / 2;
      const rX = Math.abs(pFront.sx - pBack.sx) / 2;
      const cX = sp.pCenter.sx;
      const cY = sp.pCenter.sy;

      ctx.save();

      // Extruded 3D Sprocket Thickness
      const thickness = 2.0 * sp.pCenter.pScale;
      ctx.fillStyle = isActive ? '#142028' : '#10131a';
      ctx.strokeStyle = isActive ? '#00e5ff' : '#222838';
      ctx.lineWidth = 1.0;

      ctx.beginPath();
      ctx.ellipse(cX + thickness, cY, rX, rY, 0, -Math.PI / 2, Math.PI / 2, false);
      ctx.lineTo(cX, cY + rY);
      ctx.ellipse(cX, cY, rX, rY, 0, Math.PI / 2, -Math.PI / 2, true);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Front Face
      const grad = ctx.createLinearGradient(cX - rX, cY - rY, cX + rX, cY + rY);
      grad.addColorStop(0, isActive ? '#1e3340' : '#222a3a');
      grad.addColorStop(0.5, '#141822');
      grad.addColorStop(1, '#0c0f16');
      ctx.fillStyle = grad;
      ctx.strokeStyle = isActive ? '#00ffc8' : (i % 2 === 0 ? '#343f54' : '#283142');
      ctx.lineWidth = (isActive ? 2.2 : 1.2);

      ctx.beginPath();
      ctx.ellipse(cX, cY, rX, rY, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 3D Sprocket Teeth
      ctx.save();
      ctx.translate(cX, cY);
      const toothCount = Math.min(sp.teeth, 16);
      ctx.strokeStyle = isActive ? '#00ffc8' : '#45536e';
      ctx.lineWidth = 1.2;

      for (let t = 0; t < toothCount; t++) {
        const tAngle = (t / toothCount) * Math.PI * 2 + angle;
        const tx1 = Math.cos(tAngle) * (rX * 0.88);
        const ty1 = Math.sin(tAngle) * (rY * 0.88);
        const tx2 = Math.cos(tAngle + 0.08) * (rX * 1.08);
        const ty2 = Math.sin(tAngle + 0.08) * (rY * 1.08);
        ctx.beginPath();
        ctx.moveTo(tx1, ty1);
        ctx.lineTo(tx2, ty2);
        ctx.stroke();
      }

      // Cutout windows on larger sprockets
      if (sp.radiusMm > 36) {
        ctx.fillStyle = '#080a0f';
        ctx.strokeStyle = isActive ? 'rgba(0, 255, 200, 0.4)' : '#181e2b';
        ctx.lineWidth = 0.8;
        for (let w = 0; w < 3; w++) {
          const wAngle = (w * Math.PI * 2 / 3) + angle * 0.5;
          const wx = Math.cos(wAngle) * (rX * 0.52);
          const wy = Math.sin(wAngle) * (rY * 0.52);
          ctx.beginPath();
          ctx.ellipse(wx, wy, 2.5, 4.0, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
      ctx.restore();

      // Tooth count label
      ctx.fillStyle = isActive ? '#ffffff' : '#6b768d';
      ctx.font = `${isActive ? 'bold' : 'normal'} ${Math.round((isActive ? 10 : 8) * sp.pCenter.pScale)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${sp.teeth}`, cX, cY - rY - 2);

      ctx.restore();
    }

    return sprocketCoords;
  }

  /**
   * Draw the 2 Front Chainrings & Crankset in true 3D (Positioned at y = 360mm, background)
   */
  draw3DChainrings(centerX, centerY, chainrings, activeIndex, angle, scale) {
    const ctx = this.ctx;
    const chainringCoords = [];

    // Chainrings in 3D:
    // Small ring (34T): x = -1mm, y = 360mm, radiusMm = 70mm
    // Big ring (50T): x = +8mm, y = 360mm, radiusMm = 104mm
    const smallCoord = {
      xMm: -1,
      yMm: 360,
      radiusMm: 70,
      teeth: chainrings[0],
      index: 0,
      pCenter: this.project(-1, 360, 0, centerX, centerY, scale)
    };

    const bigCoord = {
      xMm: 8,
      yMm: 360,
      radiusMm: 104,
      teeth: chainrings[1],
      index: 1,
      pCenter: this.project(8, 360, 0, centerX, centerY, scale)
    };

    chainringCoords.push(smallCoord, bigCoord);

    // Draw from inner (34T) to outer (50T)
    for (let i = 0; i < 2; i++) {
      const cr = chainringCoords[i];
      const isActive = (i === activeIndex);

      const pTop = this.project(cr.xMm, cr.yMm, cr.radiusMm, centerX, centerY, scale);
      const pBottom = this.project(cr.xMm, cr.yMm, -cr.radiusMm, centerX, centerY, scale);
      const pFront = this.project(cr.xMm, cr.yMm + cr.radiusMm * 0.28, 0, centerX, centerY, scale);
      const pBack = this.project(cr.xMm, cr.yMm - cr.radiusMm * 0.28, 0, centerX, centerY, scale);

      const rY = (pBottom.sy - pTop.sy) / 2;
      const rX = Math.abs(pFront.sx - pBack.sx) / 2;
      const cX = cr.pCenter.sx;
      const cY = cr.pCenter.sy;

      ctx.save();

      // 3D Rim Bevel
      const thickness = 2.0 * cr.pCenter.pScale;
      ctx.fillStyle = isActive ? '#14242e' : '#10131a';
      ctx.strokeStyle = isActive ? '#00e5ff' : '#222838';
      ctx.lineWidth = 1.0;

      ctx.beginPath();
      ctx.ellipse(cX + thickness, cY, rX, rY, 0, -Math.PI / 2, Math.PI / 2, false);
      ctx.lineTo(cX, cY + rY);
      ctx.ellipse(cX, cY, rX, rY, 0, Math.PI / 2, -Math.PI / 2, true);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Front Face
      const grad = ctx.createLinearGradient(cX - rX, cY - rY, cX + rX, cY + rY);
      grad.addColorStop(0, isActive ? '#1e3340' : '#222a3a');
      grad.addColorStop(0.5, '#141822');
      grad.addColorStop(1, '#0c0f16');
      ctx.fillStyle = grad;
      ctx.strokeStyle = isActive ? '#00ffc8' : '#303b4e';
      ctx.lineWidth = (isActive ? 2.2 : 1.2);

      ctx.beginPath();
      ctx.ellipse(cX, cY, rX, rY, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 3D Chainring Teeth
      ctx.save();
      ctx.translate(cX, cY);
      const toothCount = (i === 1) ? 24 : 18;
      ctx.strokeStyle = isActive ? '#00ffc8' : '#455470';
      ctx.lineWidth = 1.2;
      for (let t = 0; t < toothCount; t++) {
        const tAngle = (t / toothCount) * Math.PI * 2 + angle;
        const tx1 = Math.cos(tAngle) * (rX * 0.90);
        const ty1 = Math.sin(tAngle) * (rY * 0.90);
        const tx2 = Math.cos(tAngle + 0.06) * (rX * 1.07);
        const ty2 = Math.sin(tAngle + 0.06) * (rY * 1.07);
        ctx.beginPath();
        ctx.moveTo(tx1, ty1);
        ctx.lineTo(tx2, ty2);
        ctx.stroke();
      }

      // 4-Arm Shimano Spider on Big Ring
      if (i === 1) {
        ctx.fillStyle = '#080a0f';
        ctx.strokeStyle = '#1a202c';
        ctx.lineWidth = 0.8;
        for (let w = 0; w < 4; w++) {
          const wAngle = (w * Math.PI / 2) + angle + 0.3;
          const wx = Math.cos(wAngle) * (rX * 0.52);
          const wy = Math.sin(wAngle) * (rY * 0.52);
          ctx.beginPath();
          ctx.ellipse(wx, wy, 2.5, 4.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
      ctx.restore();

      // Label on top
      ctx.fillStyle = isActive ? '#ffffff' : '#6b768d';
      ctx.font = `${isActive ? 'bold' : 'normal'} ${Math.round((isActive ? 10 : 8) * cr.pCenter.pScale)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${cr.teeth}`, cX, cY - rY - 2);

      ctx.restore();
    }

    // 3. 3D Crankarm & Pedal
    ctx.save();
    const pBBCenter = bigCoord.pCenter;
    ctx.translate(pBBCenter.sx + 2, pBBCenter.sy);

    const armLen = 48;
    const armCos = Math.cos(angle);
    const armSin = Math.sin(angle);
    const endX = armCos * (armLen * 0.28 * pBBCenter.pScale);
    const endY = armSin * (armLen * pBBCenter.pScale);

    // Crankarm solid alloy beam
    ctx.strokeStyle = '#181d26';
    ctx.lineWidth = 5 * pBBCenter.pScale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Crankarm metallic highlight
    ctx.strokeStyle = '#384256';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Pedal Body at outer tip
    const pedalWidth = 10 * pBBCenter.pScale;
    const pedalHeight = 5 * pBBCenter.pScale;
    ctx.fillStyle = '#252c38';
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(endX - 1, endY - (pedalHeight / 2), pedalWidth * 0.28, pedalHeight, 1.5);
    ctx.fill();
    ctx.stroke();

    // Center BB Cap
    ctx.fillStyle = '#0a0d13';
    ctx.strokeStyle = '#3e485c';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 5 * 0.28 * pBBCenter.pScale, 5 * pBBCenter.pScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    return chainringCoords;
  }

  /**
   * Draw the 3D Chain connecting active rear sprocket to active front chainring
   */
  draw3DChain(centerX, centerY, sprocket, chainring, crossChaining, scale) {
    const ctx = this.ctx;

    // 3D Tangent Points:
    // Top Run: from (x_rear, y=0, +z_rear) to (x_front, y=360, +z_front)
    const pRearTop = this.project(sprocket.xMm, sprocket.yMm, sprocket.radiusMm, centerX, centerY, scale);
    const pFrontTop = this.project(chainring.xMm, chainring.yMm, chainring.radiusMm, centerX, centerY, scale);

    // Bottom Run: from (x_front, y=360, -z_front) through Derailleur back to (x_rear, y=0, -z_rear)
    const pFrontBottom = this.project(chainring.xMm, chainring.yMm, -chainring.radiusMm, centerX, centerY, scale);
    const pDerailleurTension = this.project(sprocket.xMm + 2, sprocket.yMm + 20, -sprocket.radiusMm - 36, centerX, centerY, scale);
    const pDerailleurGuide = this.project(sprocket.xMm - 2, sprocket.yMm + 10, -sprocket.radiusMm - 14, centerX, centerY, scale);
    const pRearBottom = this.project(sprocket.xMm, sprocket.yMm, -sprocket.radiusMm, centerX, centerY, scale);

    const rFrontX = Math.abs(this.project(chainring.xMm, chainring.yMm + chainring.radiusMm * 0.28, 0, centerX, centerY, scale).sx - chainring.pCenter.sx);
    const rFrontY = (pFrontBottom.sy - pFrontTop.sy) / 2;
    const rRearX = Math.abs(this.project(sprocket.xMm, sprocket.yMm + sprocket.radiusMm * 0.28, 0, centerX, centerY, scale).sx - sprocket.pCenter.sx);
    const rRearY = (pRearBottom.sy - pRearTop.sy) / 2;

    let chainColor = '#00ffc8';
    let chainGlow = 'rgba(0, 255, 200, 0.45)';
    let strokeWidth = 4.5 * scale;

    if (crossChaining.level === 'severe') {
      chainColor = '#ff3366';
      chainGlow = 'rgba(255, 51, 102, 0.75)';
      strokeWidth = 5.5 * scale;
    } else if (crossChaining.level === 'warning') {
      chainColor = '#ffbb00';
      chainGlow = 'rgba(255, 187, 0, 0.55)';
      strokeWidth = 5.0 * scale;
    }

    ctx.save();
    ctx.strokeStyle = chainColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = chainGlow;
    ctx.shadowBlur = 8 * scale;

    // 1. Top 3D Chain Strand
    ctx.beginPath();
    ctx.moveTo(pRearTop.sx, pRearTop.sy);
    ctx.lineTo(pFrontTop.sx, pFrontTop.sy);
    ctx.stroke();

    // 2. Wrap around 3D front chainring
    ctx.beginPath();
    ctx.ellipse(chainring.pCenter.sx, chainring.pCenter.sy, rFrontX, rFrontY, 0, -Math.PI / 2, Math.PI / 2, false);
    ctx.stroke();

    // 3. Lower 3D return path through rear derailleur
    ctx.beginPath();
    ctx.moveTo(pFrontBottom.sx, pFrontBottom.sy);
    ctx.lineTo(pDerailleurTension.sx, pDerailleurTension.sy);
    ctx.lineTo(pDerailleurGuide.sx, pDerailleurGuide.sy);
    ctx.lineTo(pRearBottom.sx, pRearBottom.sy);
    ctx.stroke();

    // 4. Wrap around 3D rear sprocket
    ctx.beginPath();
    ctx.ellipse(sprocket.pCenter.sx, sprocket.pCenter.sy, rRearX, rRearY, 0, Math.PI / 2, -Math.PI / 2, false);
    ctx.stroke();

    // 5. 3D Animated Chain Link Rollers
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2 * scale;
    ctx.setLineDash([4, 6]);
    ctx.lineDashOffset = -this.chainOffset;

    ctx.beginPath();
    ctx.moveTo(pRearTop.sx, pRearTop.sy);
    ctx.lineTo(pFrontTop.sx, pFrontTop.sy);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(pFrontBottom.sx, pFrontBottom.sy);
    ctx.lineTo(pDerailleurTension.sx, pDerailleurTension.sy);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Draw 3D Rear Derailleur shifting directly under active rear cog
   */
  draw3DDerailleur(centerX, centerY, activeSprocket, pulleyAngle, scale) {
    const ctx = this.ctx;
    const pGuide = this.project(activeSprocket.xMm - 2, activeSprocket.yMm + 10, -activeSprocket.radiusMm - 14, centerX, centerY, scale);
    const pTension = this.project(activeSprocket.xMm + 2, activeSprocket.yMm + 20, -activeSprocket.radiusMm - 36, centerX, centerY, scale);
    const pMount = this.project(activeSprocket.xMm - 12, activeSprocket.yMm, 0, centerX, centerY, scale);

    ctx.save();
    // 3D Derailleur Shadow Body
    ctx.strokeStyle = '#1e2430';
    ctx.lineWidth = 4.5 * pGuide.pScale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pMount.sx, pMount.sy);
    ctx.lineTo(pGuide.sx, pGuide.sy);
    ctx.lineTo(pTension.sx, pTension.sy);
    ctx.stroke();

    // Helper to draw spinning 11T jockey wheel in perspective
    const drawPulley = (p, angle) => {
      ctx.save();
      ctx.translate(p.sx, p.sy);

      ctx.fillStyle = '#0f1218';
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 5 * 0.28 * p.pScale, 5 * p.pScale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pulley Bolt
      ctx.fillStyle = '#4a5568';
      ctx.beginPath();
      ctx.arc(0, 0, 2 * p.pScale, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    drawPulley(pGuide, pulleyAngle);
    drawPulley(pTension, -pulleyAngle);

    ctx.restore();
  }

  /**
   * 3D Perspective HUD at the bottom showing exact gear positions & chain angle
   */
  drawPerspectiveHUD(w, h, frontIdx, rearIdx, chainrings, cassette, crossChaining, scale = 1) {
    const ctx = this.ctx;
    const barX = w * 0.05;
    const barY = h - 22;
    const barW = w * 0.90;
    const barH = 16;

    ctx.save();
    ctx.fillStyle = 'rgba(12, 15, 22, 0.90)';
    ctx.strokeStyle = '#222838';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 5);
    ctx.fill();
    ctx.stroke();

    // Left Label: Hinten 11-fach Kassette (Foreground)
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.fillStyle = '#8e9aaf';
    ctx.textAlign = 'left';
    ctx.fillText(`KASSETTE HINTEN (${cassette[rearIdx]}Z)`, barX + 8, barY + 11);

    // Right Label: Vorne Kettenblätter (Background)
    ctx.textAlign = 'right';
    ctx.fillText(`KETTENBLATT VORNE (${chainrings[frontIdx]}Z)`, barX + barW - 8, barY + 11);

    // 11 Sprocket slot markers on the left
    const slotStep = (barW * 0.38) / (cassette.length - 1);
    const startSlotX = barX + barW * 0.28;

    for (let r = 0; r < cassette.length; r++) {
      const sx = startSlotX + r * slotStep;
      const isSelected = (r === rearIdx);

      ctx.fillStyle = isSelected ? '#00ffc8' : '#283042';
      ctx.beginPath();
      ctx.arc(sx, barY + barH / 2, isSelected ? 4 : 2, 0, Math.PI * 2);
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = '#00ffc8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(sx, barY + barH / 2, 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // 2 Chainring slots on the right
    const f1X = barX + barW * 0.74; // 34T
    const f2X = barX + barW * 0.78; // 50T
    const activeFrontX = (frontIdx === 0 ? f1X : f2X);
    const activeRearX = startSlotX + rearIdx * slotStep;

    // 3D Connecting chainline ray
    ctx.strokeStyle = crossChaining.color || '#00ffc8';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(activeRearX, barY + barH / 2);
    ctx.lineTo(activeFrontX, barY + barH / 2);
    ctx.stroke();

    ctx.fillStyle = frontIdx === 0 ? (crossChaining.color || '#00ffc8') : '#283042';
    ctx.beginPath();
    ctx.arc(f1X, barY + barH / 2, frontIdx === 0 ? 4 : 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = frontIdx === 1 ? (crossChaining.color || '#00ffc8') : '#283042';
    ctx.beginPath();
    ctx.arc(f2X, barY + barH / 2, frontIdx === 1 ? 4 : 2, 0, Math.PI * 2);
    ctx.fill();

    // Cross-chaining status badge
    if (crossChaining.level !== 'ok') {
      const badgeColor = crossChaining.color || '#ffbb00';
      ctx.fillStyle = badgeColor;
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(crossChaining.name.toUpperCase(), w * 0.58, barY - 4);
    }

    ctx.restore();
  }
}
