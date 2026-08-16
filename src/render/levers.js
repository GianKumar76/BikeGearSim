/**
 * Shimano STI Shifter Canvas / SVG Visualizer
 * Renders left and right Shimano mechanical levers with realistic pivot animations.
 */

export class LeversRenderer {
  constructor(leftContainerId, rightContainerId) {
    this.leftContainer = document.getElementById(leftContainerId);
    this.rightContainer = document.getElementById(rightContainerId);
    
    // Animation states: angle offsets in degrees
    this.leftMainSwing = 0;
    this.leftInnerSwing = 0;
    this.rightMainSwing = 0;
    this.rightInnerSwing = 0;
    
    this.initDOM();
  }

  initDOM() {
    if (this.leftContainer) {
      this.leftContainer.innerHTML = `
        <div class="sti-shifter left-sti" id="leftStiBox">
          <div class="sti-header">
            <span class="sti-brand">SHIMANO</span>
            <span class="sti-model">2x Vorne</span>
          </div>
          <div class="sti-visual-wrap">
            <svg class="sti-svg" viewBox="0 0 220 320" width="100%" height="100%">
              <defs>
                <linearGradient id="hoodGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#2a2e39" />
                  <stop offset="50%" stop-color="#191c24" />
                  <stop offset="100%" stop-color="#0f1117" />
                </linearGradient>
                <linearGradient id="carbonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#4a4d55" />
                  <stop offset="30%" stop-color="#2c2e35" />
                  <stop offset="70%" stop-color="#1c1d22" />
                  <stop offset="100%" stop-color="#111215" />
                </linearGradient>
                <linearGradient id="bladeHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#707585" />
                  <stop offset="50%" stop-color="#3c3f4a" />
                  <stop offset="100%" stop-color="#22242b" />
                </linearGradient>
                <filter id="leverGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#00ffc8" flood-opacity="0.3" />
                </filter>
              </defs>

              <!-- Handlebar Drop bar segment -->
              <path d="M 30,100 C 30,50 90,30 140,30 C 180,30 200,60 200,90" fill="none" stroke="#252830" stroke-width="24" stroke-linecap="round"/>
              <path d="M 30,100 C 30,50 90,30 140,30 C 180,30 200,60 200,90" fill="none" stroke="#16181f" stroke-width="20" stroke-linecap="round"/>

              <!-- Hood Body (Rubberized top grip) -->
              <path d="M 60,110 C 60,70 90,45 130,45 C 165,45 185,65 185,100 C 185,135 160,165 145,185 C 135,198 120,205 105,200 C 90,195 75,180 65,150 Z" 
                    fill="url(#hoodGrad)" stroke="#3f4553" stroke-width="2"/>
              
              <!-- Hood Grip Texture Lines -->
              <line x1="85" y1="80" x2="145" y2="70" stroke="#373c49" stroke-width="2" stroke-linecap="round"/>
              <line x1="85" y1="95" x2="150" y2="85" stroke="#373c49" stroke-width="2" stroke-linecap="round"/>
              <line x1="90" y1="110" x2="155" y2="100" stroke="#373c49" stroke-width="2" stroke-linecap="round"/>

              <!-- Shimano Logo Plaque on Hood -->
              <rect x="95" y="55" width="55" height="12" rx="3" fill="#121318" stroke="#333" stroke-width="1"/>
              <text x="122" y="64" fill="#a0a8b8" font-size="8" font-weight="bold" font-family="sans-serif" text-anchor="middle" letter-spacing="1">SHIMANO</text>

              <!-- Pivot Point Group for Main Brake/Shift Lever -->
              <g id="leftMainPivotGroup" class="lever-pivot" style="transform-origin: 135px 125px; transition: transform 0.1s ease-out;">
                <!-- Main Brake Blade (Shift Up to Big Ring - Q) -->
                <path id="leftMainBlade" class="interactive-lever" d="M 135,125 C 145,160 145,210 135,265 C 130,290 120,305 105,305 C 95,305 92,295 95,275 C 102,225 108,170 115,135 Z" 
                      fill="url(#carbonGrad)" stroke="url(#bladeHighlight)" stroke-width="2.5" />
                <!-- Blade Carbon Highlight Edge -->
                <path d="M 130,140 C 138,175 138,220 128,275" fill="none" stroke="#00e5ff" stroke-width="1" stroke-opacity="0.4" />
              </g>

              <!-- Pivot Point Group for Inner Release Paddle -->
              <g id="leftInnerPivotGroup" class="lever-pivot" style="transform-origin: 125px 150px; transition: transform 0.1s ease-out;">
                <!-- Inner Release Paddle (Shift Down to Small Ring - A) -->
                <path id="leftInnerPaddle" class="interactive-lever" d="M 125,150 C 130,175 130,210 122,240 C 117,255 110,260 102,258 C 96,256 95,248 98,235 C 104,205 108,175 112,152 Z" 
                      fill="#1e2027" stroke="#484f60" stroke-width="1.8" />
              </g>
            </svg>
          </div>
          <div class="sti-controls">
            <button class="sti-btn shift-up-btn" id="btnLeftUp" title="Großes Kettenblatt (Q)">
              <span class="key-badge">Q</span>
              <span class="btn-text">Großes Blatt</span>
              <span class="btn-icon">▲</span>
            </button>
            <button class="sti-btn shift-down-btn" id="btnLeftDown" title="Kleines Kettenblatt (A)">
              <span class="key-badge">A</span>
              <span class="btn-text">Kleines Blatt</span>
              <span class="btn-icon">▼</span>
            </button>
          </div>
        </div>
      `;
    }

    if (this.rightContainer) {
      this.rightContainer.innerHTML = `
        <div class="sti-shifter right-sti" id="rightStiBox">
          <div class="sti-header">
            <span class="sti-brand">SHIMANO</span>
            <span class="sti-model">11-fach Hinten</span>
          </div>
          <div class="sti-visual-wrap">
            <svg class="sti-svg" viewBox="0 0 220 320" width="100%" height="100%">
              <defs>
                <linearGradient id="hoodGradR" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#2a2e39" />
                  <stop offset="50%" stop-color="#191c24" />
                  <stop offset="100%" stop-color="#0f1117" />
                </linearGradient>
                <linearGradient id="carbonGradR" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#4a4d55" />
                  <stop offset="30%" stop-color="#2c2e35" />
                  <stop offset="70%" stop-color="#1c1d22" />
                  <stop offset="100%" stop-color="#111215" />
                </linearGradient>
                <linearGradient id="bladeHighlightR" x1="100%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#707585" />
                  <stop offset="50%" stop-color="#3c3f4a" />
                  <stop offset="100%" stop-color="#22242b" />
                </linearGradient>
              </defs>

              <!-- Handlebar Drop bar segment -->
              <path d="M 190,100 C 190,50 130,30 80,30 C 40,30 20,60 20,90" fill="none" stroke="#252830" stroke-width="24" stroke-linecap="round"/>
              <path d="M 190,100 C 190,50 130,30 80,30 C 40,30 20,60 20,90" fill="none" stroke="#16181f" stroke-width="20" stroke-linecap="round"/>

              <!-- Hood Body (Rubberized top grip) -->
              <path d="M 160,110 C 160,70 130,45 90,45 C 55,45 35,65 35,100 C 35,135 60,165 75,185 C 85,198 100,205 115,200 C 130,195 145,180 155,150 Z" 
                    fill="url(#hoodGradR)" stroke="#3f4553" stroke-width="2"/>
              
              <!-- Hood Grip Texture Lines -->
              <line x1="135" y1="80" x2="75" y2="70" stroke="#373c49" stroke-width="2" stroke-linecap="round"/>
              <line x1="135" y1="95" x2="70" y2="85" stroke="#373c49" stroke-width="2" stroke-linecap="round"/>
              <line x1="130" y1="110" x2="65" y2="100" stroke="#373c49" stroke-width="2" stroke-linecap="round"/>

              <!-- Shimano Logo Plaque on Hood -->
              <rect x="70" y="55" width="55" height="12" rx="3" fill="#121318" stroke="#333" stroke-width="1"/>
              <text x="98" y="64" fill="#a0a8b8" font-size="8" font-weight="bold" font-family="sans-serif" text-anchor="middle" letter-spacing="1">SHIMANO</text>

              <!-- Pivot Point Group for Main Brake/Shift Lever -->
              <g id="rightMainPivotGroup" class="lever-pivot" style="transform-origin: 85px 125px; transition: transform 0.1s ease-out;">
                <!-- Main Brake Blade (Shift to Bigger Sprocket / Berg - Ü) -->
                <path id="rightMainBlade" class="interactive-lever" d="M 85,125 C 75,160 75,210 85,265 C 90,290 100,305 115,305 C 125,305 128,295 125,275 C 118,225 112,170 105,135 Z" 
                      fill="url(#carbonGradR)" stroke="url(#bladeHighlightR)" stroke-width="2.5" />
                <!-- Blade Carbon Highlight Edge -->
                <path d="M 90,140 C 82,175 82,220 92,275" fill="none" stroke="#00e5ff" stroke-width="1" stroke-opacity="0.4" />
              </g>

              <!-- Pivot Point Group for Inner Release Paddle -->
              <g id="rightInnerPivotGroup" class="lever-pivot" style="transform-origin: 95px 150px; transition: transform 0.1s ease-out;">
                <!-- Inner Release Paddle (Shift to Smaller Sprocket / Sprint - Ä) -->
                <path id="rightInnerPaddle" class="interactive-lever" d="M 95,150 C 90,175 90,210 98,240 C 103,255 110,260 118,258 C 124,256 125,248 122,235 C 116,205 112,175 108,152 Z" 
                      fill="#1e2027" stroke="#484f60" stroke-width="1.8" />
              </g>
            </svg>
          </div>
          <div class="sti-controls">
            <button class="sti-btn shift-up-btn" id="btnRightEasier" title="Größeres Ritzel / Leichter (Ü)">
              <span class="key-badge">Ü</span>
              <span class="btn-text">Leichter (Berg)</span>
              <span class="btn-icon">▲</span>
            </button>
            <button class="sti-btn shift-down-btn" id="btnRightHarder" title="Kleineres Ritzel / Schwerer (Ä)">
              <span class="key-badge">Ä</span>
              <span class="btn-text">Schwerer (Speed)</span>
              <span class="btn-icon">▼</span>
            </button>
          </div>
        </div>
      `;
    }
  }

  // Trigger visual lever pivot animations on shift
  animateShift(type) {
    if (type === 'front_up') {
      const g = document.getElementById('leftMainPivotGroup');
      const btn = document.getElementById('btnLeftUp');
      if (g) {
        g.style.transform = 'rotate(-14deg) translateX(-6px)';
        setTimeout(() => { g.style.transform = 'rotate(0deg)'; }, 140);
      }
      if (btn) this.flashButton(btn);
    } else if (type === 'front_down') {
      const g = document.getElementById('leftInnerPivotGroup');
      const btn = document.getElementById('btnLeftDown');
      if (g) {
        g.style.transform = 'rotate(-18deg) translateX(-8px)';
        setTimeout(() => { g.style.transform = 'rotate(0deg)'; }, 130);
      }
      if (btn) this.flashButton(btn);
    } else if (type === 'rear_easier') {
      const g = document.getElementById('rightMainPivotGroup');
      const btn = document.getElementById('btnRightEasier');
      if (g) {
        g.style.transform = 'rotate(14deg) translateX(6px)';
        setTimeout(() => { g.style.transform = 'rotate(0deg)'; }, 140);
      }
      if (btn) this.flashButton(btn);
    } else if (type === 'rear_harder') {
      const g = document.getElementById('rightInnerPivotGroup');
      const btn = document.getElementById('btnRightHarder');
      if (g) {
        g.style.transform = 'rotate(18deg) translateX(8px)';
        setTimeout(() => { g.style.transform = 'rotate(0deg)'; }, 130);
      }
      if (btn) this.flashButton(btn);
    }
  }

  flashButton(btn) {
    btn.classList.add('active-shift');
    setTimeout(() => btn.classList.remove('active-shift'), 180);
  }
}
