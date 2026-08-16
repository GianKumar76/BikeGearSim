/**
 * Drivetrain & Cassette 3D Perspective Canvas Renderer
 * Viewpoint: Oblique from behind-right (schräg von hinten)
 * Foreground (Left/Center): 11-Speed Rear Cassette (11T - 30T) stacked in 3D depth
 * Background (Right): 2x Front Chainrings (34T / 50T) & Crankarm
 * Intuitive 3D chainline visualization showing exact active sprocket & cross-chaining angle
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

    const scale = Math.max(0.65, Math.min(1.15, h / 195));

    // 3D Perspective View Layout (Steep rear perspective viewed directly along the chainline):
    // Rear Cassette in foreground-left (closer to viewer)
    const baseRearX = w * 0.30;
    const baseRearY = h * 0.46;

    // Front Chainrings in background-right (shortened distance, viewed in deep perspective)
    const baseFrontX = w * 0.65;
    const baseFrontY = h * 0.46;

    // Deep Perspective Ellipse Ratios (viewed almost edge-on from the rear):
    const rxScale = 0.22; // Slim horizontal ellipse width for true rear perspective
    const ryScale = 0.98; // Full vertical diameter

    // 1. Draw 3D Bike Frame Tubes (Chainstay & Seatstay in perspective)
    this.drawPerspectiveFrame(baseRearX, baseRearY, baseFrontX, baseFrontY, scale);

    // 2. Draw 11-Speed Rear Cassette in 3D (Stacked along depth axis)
    // Returns the exact 3D coordinates and radii of all 11 sprockets
    const sprocketCoords = this.draw3DCassette(baseRearX, baseRearY, cassette, rearIndex, this.cassetteAngle, rxScale, ryScale, scale);

    // 3. Draw Front Chainrings in 3D (34T inner, 50T outer)
    // Returns exact 3D coordinates and radii of the 2 chainrings
    const chainringCoords = this.draw3DChainrings(baseFrontX, baseFrontY, chainrings, frontIndex, this.crankAngle, rxScale, ryScale, scale);

    // 4. Draw 3D Chain connecting the exact active rear sprocket to active front ring
    this.draw3DChain(sprocketCoords[rearIndex], chainringCoords[frontIndex], rearTeeth, frontTeeth, crossChaining, rxScale, ryScale, scale);

    // 5. Draw 3D Rear Derailleur shifting under the active rear sprocket
    this.draw3DDerailleur(sprocketCoords[rearIndex], rearTeeth, this.pulleyAngle, rxScale, ryScale, scale);

    // 6. Draw 3D HUD Chainline & Gear Position Indicator at bottom
    this.drawPerspectiveHUD(w, h, frontIndex, rearIndex, chainrings, cassette, crossChaining, scale);
  }

  drawPerspectiveFrame(rx, ry, fx, fy, scale = 1) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = '#181d28';
    ctx.lineWidth = 12 * scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 3D Chainstay from Rear Dropout to Front Bottom Bracket
    ctx.beginPath();
    ctx.moveTo(rx - 55 * scale, ry);
    ctx.lineTo(fx, fy);
    ctx.stroke();

    // 3D Seat Tube going up-left from BB
    ctx.lineWidth = 9 * scale;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx - 30 * scale, fy - 90 * scale);
    ctx.stroke();

    // 3D Seatstay from Rear Dropout to Seat cluster
    ctx.lineWidth = 7 * scale;
    ctx.beginPath();
    ctx.moveTo(rx - 55 * scale, ry);
    ctx.lineTo(fx - 30 * scale, fy - 90 * scale);
    ctx.stroke();

    // Dropout clamp highlight
    ctx.fillStyle = '#2d3546';
    ctx.beginPath();
    ctx.arc(rx - 55 * scale, ry, 10 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Render the 11-Speed Cassette with 3D Depth Stacking
   * From largest (30T, inner left) to smallest (11T, outer right, closest to viewer)
   */
  draw3DCassette(baseX, baseY, cassette, activeIndex, angle, rxScale, ryScale, scale = 1) {
    const ctx = this.ctx;
    const numSprockets = cassette.length; // 11
    const sprocketCoords = [];

    // Lateral 3D depth step per sprocket (fanned out along the axle)
    const stepDx = 8.5 * scale;
    const stepDy = 0.5 * scale;

    // Calculate 3D positions for all 11 sprockets
    for (let i = 0; i < numSprockets; i++) {
      const teeth = cassette[i];
      const r = (16 + (teeth - 11) * 2.3) * scale;
      // i = 0 (11T) is closest to viewer/right; i = 10 (30T) is furthest/left
      const x = baseX + (5 - i) * stepDx;
      const y = baseY + (5 - i) * stepDy;
      sprocketCoords.push({ x, y, r, teeth, index: i });
    }

    // 1. Draw Cassette Freehub Body Cylinder
    const innerX = sprocketCoords[numSprockets - 1].x - 8 * scale;
    const outerX = sprocketCoords[0].x + 8 * scale;
    const hubY = baseY;
    ctx.save();
    ctx.fillStyle = '#0e1118';
    ctx.strokeStyle = '#252d3d';
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.roundRect(innerX, hubY - 10 * scale, outerX - innerX, 20 * scale, 4 * scale);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 2. Draw 11 Sprockets in 3D (from back/inner 30T to front/outer 11T)
    for (let i = numSprockets - 1; i >= 0; i--) {
      const sp = sprocketCoords[i];
      const isActive = (i === activeIndex);
      const rX = sp.r * rxScale;
      const rY = sp.r * ryScale;

      ctx.save();

      // Extruded 3D Sprocket Thickness / Beveled Edge
      const thickness = 2.8 * scale;
      ctx.fillStyle = isActive ? '#152b2b' : '#141822';
      ctx.strokeStyle = isActive ? '#00e5ff' : '#222838';
      ctx.lineWidth = 1.2 * scale;

      ctx.beginPath();
      ctx.ellipse(sp.x + thickness, sp.y, rX, rY, 0, -Math.PI / 2, Math.PI / 2, false);
      ctx.lineTo(sp.x, sp.y + rY);
      ctx.ellipse(sp.x, sp.y, rX, rY, 0, Math.PI / 2, -Math.PI / 2, true);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Front Face Ellipse
      ctx.beginPath();
      ctx.ellipse(sp.x, sp.y, rX, rY, 0, 0, Math.PI * 2);

      if (isActive) {
        // Active Sprocket: High-contrast Glowing Highlight
        ctx.fillStyle = 'rgba(0, 255, 200, 0.18)';
        ctx.strokeStyle = '#00ffc8';
        ctx.lineWidth = 3.0 * scale;
        ctx.shadowColor = '#00ffc8';
        ctx.shadowBlur = 12 * scale;
      } else {
        // Inactive Sprockets: Metallic Steely Finish
        const grad = ctx.createLinearGradient(sp.x - rX, sp.y - rY, sp.x + rX, sp.y + rY);
        grad.addColorStop(0, '#222836');
        grad.addColorStop(0.5, '#161922');
        grad.addColorStop(1, '#0e1117');
        ctx.fillStyle = grad;
        ctx.strokeStyle = (i % 2 === 0) ? '#384256' : '#2d3546';
        ctx.lineWidth = 1.4 * scale;
        ctx.shadowBlur = 0;
      }
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 3D Sprocket Teeth & Hyperglide Cutouts
      ctx.save();
      ctx.translate(sp.x, sp.y);
      const toothCount = Math.min(sp.teeth, 14);
      ctx.strokeStyle = isActive ? '#00e5ff' : '#455169';
      ctx.lineWidth = 1.5 * scale;

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

      // Machined weight-reduction cutouts on larger sprockets
      if (sp.r > 24 * scale) {
        ctx.fillStyle = '#0a0d14';
        ctx.strokeStyle = isActive ? 'rgba(0, 255, 200, 0.4)' : '#1e2433';
        ctx.lineWidth = 1 * scale;
        for (let w = 0; w < 3; w++) {
          const wAngle = (w * Math.PI * 2 / 3) + angle * 0.5;
          const wx = Math.cos(wAngle) * (rX * 0.55);
          const wy = Math.sin(wAngle) * (rY * 0.55);
          ctx.beginPath();
          ctx.ellipse(wx, wy, 3.5 * scale, 4.5 * scale, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }

      ctx.restore();

      // Sprocket Tooth-Count Engraving tag on top rim
      ctx.fillStyle = isActive ? '#ffffff' : '#6b768d';
      ctx.font = `${isActive ? 'bold' : 'normal'} ${Math.round((isActive ? 10 : 8) * scale)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${sp.teeth}`, sp.x, sp.y - rY - 2 * scale);

      ctx.restore();
    }

    // 3. Front Lockring on 11T outer cog
    const lockX = sprocketCoords[0].x + 4 * scale;
    const lockY = sprocketCoords[0].y;
    ctx.save();
    ctx.fillStyle = '#090b10';
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.ellipse(lockX, lockY, 7 * rxScale * scale, 7 * ryScale * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    return sprocketCoords;
  }

  /**
   * Render the 2 Front Chainrings (34T & 50T) matching the cassette's crisp metallic 3D styling
   */
  draw3DChainrings(baseX, baseY, chainrings, activeIndex, angle, rxScale, ryScale, scale = 1) {
    const ctx = this.ctx;
    const chainringCoords = [];

    // Inner small ring (34T) is offset left/back in 3D space
    const rSmall = 34 * scale;
    const smallCoord = {
      x: baseX - 8 * scale,
      y: baseY,
      r: rSmall,
      teeth: chainrings[0],
      index: 0
    };

    // Outer big ring (50T) is offset right/front in 3D space (closer to viewer)
    const rBig = 48 * scale;
    const bigCoord = {
      x: baseX + 4 * scale,
      y: baseY,
      r: rBig,
      teeth: chainrings[1],
      index: 1
    };

    chainringCoords.push(smallCoord, bigCoord);

    // 1. Draw Inner Small Ring (34T)
    {
      const cr = smallCoord;
      const isActive = (activeIndex === 0);
      const rX = cr.r * rxScale;
      const rY = cr.r * ryScale;

      ctx.save();
      // 3D Rim Bevel
      const thickness = 2.0 * scale;
      ctx.fillStyle = isActive ? '#142028' : '#10131a';
      ctx.strokeStyle = isActive ? '#00e5ff' : '#222838';
      ctx.lineWidth = 1.0 * scale;

      ctx.beginPath();
      ctx.ellipse(cr.x + thickness, cr.y, rX, rY, 0, -Math.PI / 2, Math.PI / 2, false);
      ctx.lineTo(cr.x, cr.y + rY);
      ctx.ellipse(cr.x, cr.y, rX, rY, 0, Math.PI / 2, -Math.PI / 2, true);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Front Face
      const grad = ctx.createLinearGradient(cr.x - rX, cr.y - rY, cr.x + rX, cr.y + rY);
      grad.addColorStop(0, isActive ? '#1a2c38' : '#1e2534');
      grad.addColorStop(0.5, '#121620');
      grad.addColorStop(1, '#0a0d13');
      ctx.fillStyle = grad;
      ctx.strokeStyle = isActive ? '#00ffc8' : '#2a3344';
      ctx.lineWidth = (isActive ? 2.0 : 1.2) * scale;

      ctx.beginPath();
      ctx.ellipse(cr.x, cr.y, rX, rY, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Small Ring Teeth
      ctx.save();
      ctx.translate(cr.x, cr.y);
      const toothCount = 18;
      ctx.strokeStyle = isActive ? '#00ffc8' : '#3a465c';
      ctx.lineWidth = 1.2 * scale;
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
      ctx.restore();

      // Label on top
      ctx.fillStyle = isActive ? '#ffffff' : '#6b768d';
      ctx.font = `${isActive ? 'bold' : 'normal'} ${Math.round((isActive ? 10 : 8) * scale)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('34', cr.x, cr.y - rY - 2 * scale);

      ctx.restore();
    }

    // 2. Draw Outer Big Ring (50T) & Shimano Spider
    {
      const cr = bigCoord;
      const isActive = (activeIndex === 1);
      const rX = cr.r * rxScale;
      const rY = cr.r * ryScale;

      ctx.save();
      // 3D Rim Bevel
      const thickness = 2.4 * scale;
      ctx.fillStyle = isActive ? '#14242e' : '#121620';
      ctx.strokeStyle = isActive ? '#00e5ff' : '#252e40';
      ctx.lineWidth = 1.2 * scale;

      ctx.beginPath();
      ctx.ellipse(cr.x + thickness, cr.y, rX, rY, 0, -Math.PI / 2, Math.PI / 2, false);
      ctx.lineTo(cr.x, cr.y + rY);
      ctx.ellipse(cr.x, cr.y, rX, rY, 0, Math.PI / 2, -Math.PI / 2, true);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Front Face
      const grad = ctx.createLinearGradient(cr.x - rX, cr.y - rY, cr.x + rX, cr.y + rY);
      grad.addColorStop(0, isActive ? '#1d3342' : '#222b3b');
      grad.addColorStop(0.5, '#141822');
      grad.addColorStop(1, '#0c0f16');
      ctx.fillStyle = grad;
      ctx.strokeStyle = isActive ? '#00ffc8' : '#303b4e';
      ctx.lineWidth = (isActive ? 2.2 : 1.4) * scale;

      ctx.beginPath();
      ctx.ellipse(cr.x, cr.y, rX, rY, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 50T Outer Teeth
      ctx.save();
      ctx.translate(cr.x, cr.y);
      const toothCount = 22;
      ctx.strokeStyle = isActive ? '#00ffc8' : '#455470';
      ctx.lineWidth = 1.4 * scale;
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

      // Machined Spider Windows
      ctx.fillStyle = '#080a0f';
      ctx.strokeStyle = '#1a202c';
      ctx.lineWidth = 1 * scale;
      for (let w = 0; w < 4; w++) {
        const wAngle = (w * Math.PI / 2) + angle + 0.3;
        const wx = Math.cos(wAngle) * (rX * 0.52);
        const wy = Math.sin(wAngle) * (rY * 0.52);
        ctx.beginPath();
        ctx.ellipse(wx, wy, 3.5 * rxScale * scale, 6 * ryScale * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();

      // Label on top
      ctx.fillStyle = isActive ? '#ffffff' : '#6b768d';
      ctx.font = `${isActive ? 'bold' : 'normal'} ${Math.round((isActive ? 10 : 8) * scale)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('50', cr.x, cr.y - rY - 2 * scale);

      ctx.restore();
    }

    // 3. Realistic Shimano Crankarm & Pedal
    ctx.save();
    ctx.translate(bigCoord.x + 3 * scale, bigCoord.y);

    const armLen = 58 * scale;
    const armCos = Math.cos(angle);
    const armSin = Math.sin(angle);
    const endX = armCos * (armLen * rxScale);
    const endY = armSin * (armLen * ryScale);

    // Crankarm solid alloy beam
    ctx.strokeStyle = '#181d26';
    ctx.lineWidth = 6 * scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Metallic highlight line along crankarm
    ctx.strokeStyle = '#384256';
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Compact Pedal Body on outer axle
    const pedalWidth = 14 * scale;
    const pedalHeight = 6 * scale;
    ctx.fillStyle = '#252c38';
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    ctx.roundRect(endX - 2 * scale, endY - (pedalHeight / 2), pedalWidth * rxScale, pedalHeight, 2);
    ctx.fill();
    ctx.stroke();

    // Center BB Cap
    ctx.fillStyle = '#0a0d13';
    ctx.strokeStyle = '#3e485c';
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.ellipse(0, 0, 7 * rxScale * scale, 7 * ryScale * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    return chainringCoords;
  }

  /**
   * Draw 3D Chain Line connecting active rear sprocket to active front chainring
   */
  draw3DChain(sprocket, chainring, rearTeeth, frontTeeth, crossChaining, rxScale, ryScale, scale = 1) {
    const ctx = this.ctx;

    const rRearX = sprocket.r * rxScale;
    const rRearY = sprocket.r * ryScale;
    const rFrontX = chainring.r * rxScale;
    const rFrontY = chainring.r * ryScale;

    // 3D Tangent points
    const pRearTop = { x: sprocket.x, y: sprocket.y - rRearY };
    const pFrontTop = { x: chainring.x, y: chainring.y - rFrontY };
    const pFrontBottom = { x: chainring.x, y: chainring.y + rFrontY };
    
    // Derailleur entry points underneath active rear sprocket
    const pDerailleurTension = { x: sprocket.x + 8 * scale, y: sprocket.y + rRearY + 36 * scale };
    const pDerailleurGuide = { x: sprocket.x - 4 * scale, y: sprocket.y + rRearY + 14 * scale };
    const pRearBottom = { x: sprocket.x, y: sprocket.y + rRearY };

    let chainColor = '#00ffc8'; // 🟢 Optimal (Green)
    let chainGlow = 'rgba(0, 255, 200, 0.45)';
    let strokeWidth = 5.0 * scale;

    if (crossChaining.level === 'severe') {
      chainColor = '#ff3366'; // 🔴 Extreme Cross-Chaining (Red)
      chainGlow = 'rgba(255, 51, 102, 0.75)';
      strokeWidth = 6.0 * scale;
    } else if (crossChaining.level === 'warning') {
      chainColor = '#ffbb00'; // 🟡 Tolerable Warning (Yellow)
      chainGlow = 'rgba(255, 187, 0, 0.55)';
      strokeWidth = 5.5 * scale;
    }

    ctx.save();
    ctx.strokeStyle = chainColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = chainGlow;
    ctx.shadowBlur = 8 * scale;

    // 1. Top 3D Chain Strand (Connecting Active Rear Cog to Active Front Ring)
    ctx.beginPath();
    ctx.moveTo(pRearTop.x, pRearTop.y);
    ctx.lineTo(pFrontTop.x, pFrontTop.y);
    ctx.stroke();

    // 2. Wrap around 3D front chainring
    ctx.beginPath();
    ctx.ellipse(chainring.x, chainring.y, rFrontX, rFrontY, 0, -Math.PI / 2, Math.PI / 2, false);
    ctx.stroke();

    // 3. Lower 3D return path through rear derailleur cage
    ctx.beginPath();
    ctx.moveTo(pFrontBottom.x, pFrontBottom.y);
    ctx.lineTo(pDerailleurTension.x, pDerailleurTension.y);
    ctx.lineTo(pDerailleurGuide.x, pDerailleurGuide.y);
    ctx.lineTo(pRearBottom.x, pRearBottom.y);
    ctx.stroke();

    // 4. Wrap around 3D rear sprocket
    ctx.beginPath();
    ctx.ellipse(sprocket.x, sprocket.y, rRearX, rRearY, 0, Math.PI / 2, -Math.PI / 2, false);
    ctx.stroke();

    // 5. 3D Animated Chain Link Rollers
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.3 * scale;
    ctx.setLineDash([4, 6]);
    ctx.lineDashOffset = -this.chainOffset;

    ctx.beginPath();
    ctx.moveTo(pRearTop.x, pRearTop.y);
    ctx.lineTo(pFrontTop.x, pFrontTop.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(pFrontBottom.x, pFrontBottom.y);
    ctx.lineTo(pDerailleurTension.x, pDerailleurTension.y);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Draw 3D Rear Derailleur shifting under the active rear cog in 3D
   */
  draw3DDerailleur(activeSprocket, rearTeeth, pulleyAngle, rxScale, ryScale, scale = 1) {
    const ctx = this.ctx;
    const rRearY = activeSprocket.r * ryScale;

    const guideX = activeSprocket.x - 4 * scale;
    const guideY = activeSprocket.y + rRearY + 14 * scale;
    const tensionX = activeSprocket.x + 8 * scale;
    const tensionY = activeSprocket.y + rRearY + 36 * scale;

    ctx.save();
    // 3D Derailleur Shadow Body
    ctx.strokeStyle = '#1e2430';
    ctx.lineWidth = 5 * scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(activeSprocket.x - 15 * scale, activeSprocket.y);
    ctx.lineTo(guideX, guideY);
    ctx.lineTo(tensionX, tensionY);
    ctx.stroke();

    // Helper to draw spinning 11T jockey wheel in perspective
    const drawPulley = (px, py, angle) => {
      ctx.save();
      ctx.translate(px, py);

      ctx.fillStyle = '#0f1218';
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1.5 * scale;
      ctx.beginPath();
      ctx.ellipse(0, 0, 7.5 * rxScale * scale, 7.5 * ryScale * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pulley Bolt
      ctx.fillStyle = '#4a5568';
      ctx.beginPath();
      ctx.arc(0, 0, 2.5 * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    drawPulley(guideX, guideY, pulleyAngle);
    drawPulley(tensionX, tensionY, -pulleyAngle);

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
      // r = 0 (11T) to r = 10 (30T)
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
