/**
 * Ship Canvas & Telemetry Renderer for Mortal Company Mobile
 * Pure Vector Architectural Blueprint (Distracting screenshot & baked shadows removed).
 * Large hitboxes (38px click radius) & expanded ship viewport scale for optimal accessibility.
 */

const SHIP_BOUNDS = {
  minX: 29.60,
  maxX: 32.80,
  minZ: 27.20,
  maxZ: 34.40,
  centerX: 31.20,
  centerZ: 30.80
};

const ITEM_CATEGORIES = {
  'APPARATUS': { color: '#a855f7', label: 'APPARATUS', val: 80, tag: 'HIGH_VALUE' },
  'BRASS BELL': { color: '#f59e0b', label: 'BRASS BELL', val: 60, tag: 'VALUABLE' },
  'RUBBER DUCK': { color: '#06b6d4', label: 'RUBBER DUCK', val: 50, tag: 'VALUABLE' },
  'BIG GEAR': { color: '#eab308', label: 'BIG GEAR', val: 40, tag: 'SCRAP' },
  'STOP SIGN': { color: '#ef4444', label: 'STOP SIGN', val: 35, tag: 'WEAPON' },
  'KETTLE': { color: '#3b82f6', label: 'KETTLE', val: 32, tag: 'SCRAP' },
  'BOTTLES': { color: '#10b981', label: 'BOTTLES', val: 28, tag: 'SCRAP' },
  'GEAR': { color: '#f97316', label: 'GEAR', val: 25, tag: 'SCRAP' },
  'CLOWN HORN': { color: '#ec4899', label: 'CLOWN HORN', val: 20, tag: 'FUN' },
  'BOLT': { color: '#64748b', label: 'BOLT', val: 18, tag: 'SCRAP' },
  'CANDY': { color: '#10b981', label: 'CANDY', val: 15, tag: 'CONSUMABLE' },
  'CUP': { color: '#94a3b8', label: 'CUP', val: 12, tag: 'SCRAP' }
};

function getItemCategory(name) {
  const upper = (name || '').toUpperCase().trim();
  for (const [key, cat] of Object.entries(ITEM_CATEGORIES)) {
    if (upper.includes(key)) return cat;
  }
  return { color: '#38bdf8', label: 'SCRAP', val: 20, tag: 'SCRAP' };
}

class ShipRenderer {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.viewMode = options.viewMode || 'blueprint'; // 'blueprint' | 'zones' | 'wireframe'
    this.zoomLevel = options.zoom || 1.0;
    this.panOffset = { x: 0, y: 0 };
    this.showLabels = true;
    this.showBounds = true;
    this.selectedItemIndex = -1;
    this.hoveredItemIndex = -1;
    this.saveData = null;
    this.onSelectCallback = null;

    this.setupInteractivity();
  }

  setSaveData(saveData) {
    this.saveData = saveData;
    this.render();
  }

  worldToCanvas(x, z) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    // Scale expanded from 0.72 to 0.90 for maximum visual presence and large hitboxes
    const baseScale = Math.min(w / (SHIP_BOUNDS.maxX - SHIP_BOUNDS.minX), h / (SHIP_BOUNDS.maxZ - SHIP_BOUNDS.minZ)) * 0.90;
    const scale = baseScale * this.zoomLevel;
    const cx = w / 2 + this.panOffset.x;
    const cy = h / 2 + this.panOffset.y;

    const px = cx + (x - SHIP_BOUNDS.centerX) * scale;
    const py = cy - (z - SHIP_BOUNDS.centerZ) * scale;
    return { x: px, y: py, scale };
  }

  canvasToWorld(px, py) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const baseScale = Math.min(w / (SHIP_BOUNDS.maxX - SHIP_BOUNDS.minX), h / (SHIP_BOUNDS.maxZ - SHIP_BOUNDS.minZ)) * 0.90;
    const scale = baseScale * this.zoomLevel;
    const cx = w / 2 + this.panOffset.x;
    const cy = h / 2 + this.panOffset.y;

    const x = (px - cx) / scale + SHIP_BOUNDS.centerX;
    const z = -(py - cy) / scale + SHIP_BOUNDS.centerZ;
    return { x, z };
  }

  getCompartmentZone(x, z) {
    if (z >= 33.3 && z <= 34.4 && x >= 30.8 && x <= 32.1) return 'COCKPIT & HELM';
    if (z >= 32.8 && z <= 33.8 && x >= 31.6 && x <= 32.15) return 'TERMINAL DESK';
    if (z >= 31.55 && z <= 32.7 && x >= 30.65 && x <= 31.10) return 'BUNK BEDS (PORT)';
    if (z >= 30.65 && z <= 31.5 && x >= 30.65 && x <= 31.10) return 'STORAGE SHELVES (PORT)';
    if (z >= 29.95 && z <= 30.55 && x >= 30.65 && x <= 31.00) return 'RED CABINET / LOCKER';
    if (z >= 29.70 && z <= 29.95 && x >= 31.0 && x <= 31.65) return 'AFT BLAST DOOR';
    if (z >= 29.80 && z <= 33.3 && x >= 30.65 && x <= 32.10) return 'MAIN CARGO FLOOR';
    if (x <= 30.55) return 'PORT CATWALK';
    if (z <= 29.80) return 'AFT CATWALK TRANSOM';
    return 'EXTERIOR HULL';
  }

  render() {
    if (!this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Reset background
    ctx.clearRect(0, 0, w, h);

    // 1. Tactical Blueprint Grid Background
    const gridStep = 0.5;
    ctx.lineWidth = 1;
    for (let mx = 29.5; mx <= 33.0; mx += gridStep) {
      const p1 = this.worldToCanvas(mx, 26.8);
      const p2 = this.worldToCanvas(mx, 34.8);
      ctx.strokeStyle = Math.abs(mx - Math.round(mx)) < 0.05 ? 'rgba(42, 63, 102, 0.45)' : 'rgba(42, 63, 102, 0.16)';
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    }
    for (let mz = 27.0; mz <= 34.6; mz += gridStep) {
      const p1 = this.worldToCanvas(29.4, mz);
      const p2 = this.worldToCanvas(33.0, mz);
      ctx.strokeStyle = Math.abs(mz - Math.round(mz)) < 0.05 ? 'rgba(42, 63, 102, 0.45)' : 'rgba(42, 63, 102, 0.16)';
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    }

    // 2. STARBOARD DUAL ROCKET THRUSTER NACELLES (Underbelly Exterior)
    const thr1TL = this.worldToCanvas(32.15, 30.80);
    const thr1BR = this.worldToCanvas(32.65, 30.15);
    const thr2TL = this.worldToCanvas(32.15, 32.10);
    const thr2BR = this.worldToCanvas(32.65, 31.45);

    [ { tl: thr1TL, br: thr1BR }, { tl: thr2TL, br: thr2BR } ].forEach(thr => {
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.8;
      ctx.fillRect(thr.tl.x, thr.tl.y, thr.br.x - thr.tl.x, thr.br.y - thr.tl.y);
      ctx.strokeRect(thr.tl.x, thr.tl.y, thr.br.x - thr.tl.x, thr.br.y - thr.tl.y);

      // Red Structural Collar
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(thr.tl.x, thr.tl.y + 4, thr.br.x - thr.tl.x, 5);

      // Horizontal Nozzle Cooling Ribs
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      for (let ry = thr.tl.y + 12; ry < thr.br.y - 4; ry += 6) {
        ctx.beginPath(); ctx.moveTo(thr.tl.x, ry); ctx.lineTo(thr.br.x, ry); ctx.stroke();
      }
    });

    // 3. CATWALK OPEN GRATE DECK (Continuous Port Flank & Aft Transom)
    const cwOuter = [
      this.worldToCanvas(32.40, 27.25), // Aft Starboard corner (ladder)
      this.worldToCanvas(29.80, 27.25), // Aft Port corner
      this.worldToCanvas(29.80, 33.30), // Mid Port straight run
      this.worldToCanvas(30.65, 34.20), // Tapered nose run
      this.worldToCanvas(30.65, 33.30), // Nose bulkhead junction
      this.worldToCanvas(30.65, 29.80), // Inner port wall
      this.worldToCanvas(32.10, 29.80), // Inner aft wall
      this.worldToCanvas(32.10, 27.25)  // Starboard transom return
    ];

    // Catwalk floor fill (Industrial Steel Grating pattern)
    ctx.save();
    ctx.beginPath();
    cwOuter.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.closePath();
    ctx.fillStyle = this.viewMode === 'zones' ? 'rgba(234, 179, 8, 0.12)' : '#0a101d';
    ctx.fill();

    // Grate hatch pattern
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.35)';
    ctx.lineWidth = 1;
    const cwMin = this.worldToCanvas(29.80, 34.20);
    const cwMax = this.worldToCanvas(32.40, 27.25);
    ctx.clip();
    for (let x = cwMin.x; x <= cwMax.x; x += 10) {
      ctx.beginPath(); ctx.moveTo(x, cwMin.y); ctx.lineTo(x + 20, cwMax.y); ctx.stroke();
    }
    ctx.restore();

    // Catwalk Outer Yellow Safety Railing
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.moveTo(cwOuter[0].x, cwOuter[0].y);
    ctx.lineTo(cwOuter[1].x, cwOuter[1].y);
    ctx.lineTo(cwOuter[2].x, cwOuter[2].y);
    ctx.lineTo(cwOuter[3].x, cwOuter[3].y);
    ctx.stroke();

    // Railing upright posts
    const postCoords = [
      [32.40, 27.25], [31.50, 27.25], [30.65, 27.25], [29.80, 27.25],
      [29.80, 28.50], [29.80, 30.00], [29.80, 31.50], [29.80, 33.30],
      [30.22, 33.75], [30.65, 34.20]
    ];
    ctx.fillStyle = '#facc15';
    postCoords.forEach(([wx, wz]) => {
      const p = this.worldToCanvas(wx, wz);
      ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
    });

    // Boarding Ladder at Aft Starboard
    const ladPos = this.worldToCanvas(32.40, 27.25);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(ladPos.x - 5, ladPos.y - 15, 10, 15);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(ladPos.x - 5, ladPos.y - 15, 10, 15);
    for (let ly = ladPos.y - 12; ly < ladPos.y; ly += 4) {
      ctx.beginPath(); ctx.moveTo(ladPos.x - 5, ly); ctx.lineTo(ladPos.x + 5, ly); ctx.stroke();
    }

    // 4. MAIN SHIP CABIN INTERIOR FLOOR & WALLS
    const cabin_BL = this.worldToCanvas(30.65, 29.80);
    const cabin_TL = this.worldToCanvas(30.65, 33.30);
    const cabin_NoseL = this.worldToCanvas(31.00, 34.30);
    const cabin_NoseR = this.worldToCanvas(31.85, 34.30);
    const cabin_TR = this.worldToCanvas(32.10, 33.30);
    const cabin_BR = this.worldToCanvas(32.10, 29.80);

    // Cabin floor plate fill
    ctx.beginPath();
    ctx.moveTo(cabin_BL.x, cabin_BL.y);
    ctx.lineTo(cabin_TL.x, cabin_TL.y);
    ctx.lineTo(cabin_NoseL.x, cabin_NoseL.y);
    ctx.lineTo(cabin_NoseR.x, cabin_NoseR.y);
    ctx.lineTo(cabin_TR.x, cabin_TR.y);
    ctx.lineTo(cabin_BR.x, cabin_BR.y);
    ctx.closePath();
    ctx.fillStyle = this.viewMode === 'zones' ? 'rgba(6, 182, 212, 0.08)' : '#0d1527';
    ctx.fill();

    // Solid Cyan Structural Bulkheads
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2.8;
    ctx.stroke();

    // Roof Center Spine & Circular Cupola Dome (Reference markers)
    const spineTL = this.worldToCanvas(31.15, 32.50);
    const spineBR = this.worldToCanvas(31.45, 29.90);
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(spineTL.x, spineTL.y, spineBR.x - spineTL.x, spineBR.y - spineTL.y);

    const domePos = this.worldToCanvas(31.35, 33.30);
    ctx.beginPath();
    ctx.arc(domePos.x, domePos.y, 20, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 5. AFT SLIDING HYDRAULIC BLAST DOOR
    const doorTL = this.worldToCanvas(31.05, 29.85);
    const doorBR = this.worldToCanvas(31.65, 29.75);
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(doorTL.x, doorTL.y, doorBR.x - doorTL.x, doorBR.y - doorTL.y);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(doorTL.x, doorTL.y, doorBR.x - doorTL.x, doorBR.y - doorTL.y);

    // Hazard Stripes on Threshold
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(doorTL.x, doorTL.y);
    ctx.lineTo(doorBR.x, doorTL.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // 6. INTERIOR COMPARTMENT MODULES
    // A. Red Emergency Wardrobe / Storage Cupboard (Port Aft)
    const lockTL = this.worldToCanvas(30.68, 30.55);
    const lockBR = this.worldToCanvas(30.98, 29.95);
    ctx.fillStyle = 'rgba(220, 38, 38, 0.35)';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.8;
    ctx.fillRect(lockTL.x, lockTL.y, lockBR.x - lockTL.x, lockBR.y - lockTL.y);
    ctx.strokeRect(lockTL.x, lockTL.y, lockBR.x - lockTL.x, lockBR.y - lockTL.y);
    // Vertical double door line
    ctx.beginPath();
    ctx.moveTo((lockTL.x + lockBR.x) / 2, lockTL.y);
    ctx.lineTo((lockTL.x + lockBR.x) / 2, lockBR.y);
    ctx.stroke();

    // B. Open Metal Storage Shelves (Port Wall Scrap Unit)
    const shelfTL = this.worldToCanvas(30.68, 31.45);
    const shelfBR = this.worldToCanvas(31.08, 30.65);
    ctx.fillStyle = 'rgba(245, 158, 11, 0.28)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.0;
    ctx.fillRect(shelfTL.x, shelfTL.y, shelfBR.x - shelfTL.x, shelfBR.y - shelfTL.y);
    ctx.strokeRect(shelfTL.x, shelfTL.y, shelfBR.x - shelfTL.x, shelfBR.y - shelfTL.y);
    for (let sy = shelfTL.y + 7; sy < shelfBR.y; sy += 8) {
      ctx.beginPath(); ctx.moveTo(shelfTL.x, sy); ctx.lineTo(shelfBR.x, sy); ctx.stroke();
    }

    // C. Crew Bunk Beds (Port Wall, forward)
    const bedTL = this.worldToCanvas(30.68, 32.70);
    const bedBR = this.worldToCanvas(31.08, 31.55);
    ctx.fillStyle = 'rgba(100, 116, 139, 0.30)';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.8;
    ctx.fillRect(bedTL.x, bedTL.y, bedBR.x - bedTL.x, bedBR.y - bedTL.y);
    ctx.strokeRect(bedTL.x, bedTL.y, bedBR.x - bedTL.x, bedBR.y - bedTL.y);

    // D. Terminal Desk & Screen (Forward Starboard)
    const termTL = this.worldToCanvas(31.65, 33.70);
    const termBR = this.worldToCanvas(32.08, 32.80);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.8;
    ctx.fillRect(termTL.x, termTL.y, termBR.x - termTL.x, termBR.y - termTL.y);
    ctx.strokeRect(termTL.x, termTL.y, termBR.x - termTL.x, termBR.y - termTL.y);
    // Keyboard / monitor glow
    ctx.fillStyle = '#34d399';
    ctx.fillRect(termTL.x + 4, termTL.y + 4, termBR.x - termTL.x - 8, 6);

    // E. Cockpit Flight Station & Steering Console (Bow)
    const helmTL = this.worldToCanvas(30.95, 34.20);
    const helmBR = this.worldToCanvas(31.60, 33.60);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.8;
    ctx.fillRect(helmTL.x, helmTL.y, helmBR.x - helmTL.x, helmBR.y - helmTL.y);
    ctx.strokeRect(helmTL.x, helmTL.y, helmBR.x - helmTL.x, helmBR.y - helmTL.y);

    // 7. LABELS & COMPARTMENT CALLOUTS
    if (this.showLabels) {
      ctx.font = 'bold 11px JetBrains Mono, monospace';

      ctx.fillStyle = '#38bdf8';
      const lblC = this.worldToCanvas(31.30, 33.95);
      ctx.fillText('[COCKPIT / HELM]', lblC.x - 55, lblC.y);

      ctx.fillStyle = '#10b981';
      const lblT = this.worldToCanvas(31.85, 33.25);
      ctx.fillText('>_ TERMINAL', lblT.x - 35, lblT.y);

      ctx.fillStyle = '#cbd5e1';
      const lblB = this.worldToCanvas(30.88, 32.10);
      ctx.fillText('BUNK BEDS', lblB.x - 26, lblB.y);

      ctx.fillStyle = '#f59e0b';
      const lblS = this.worldToCanvas(30.88, 31.05);
      ctx.fillText('STORAGE SHELVES', lblS.x - 50, lblS.y);

      ctx.fillStyle = '#f87171';
      const lblL = this.worldToCanvas(30.88, 30.25);
      ctx.fillText('LOCKER', lblL.x - 20, lblL.y);

      ctx.fillStyle = 'rgba(6, 182, 212, 0.85)';
      const lblM = this.worldToCanvas(31.55, 31.20);
      ctx.fillText('MAIN CARGO FLOOR', lblM.x - 55, lblM.y);

      ctx.fillStyle = '#ef4444';
      const lblD = this.worldToCanvas(31.35, 29.90);
      ctx.fillText('[BLAST DOOR]', lblD.x - 38, lblD.y);

      ctx.fillStyle = '#facc15';
      const lblCw = this.worldToCanvas(31.68, 27.60);
      ctx.fillText('CATWALK TRANSOM (Y=21.17)', lblCw.x - 80, lblCw.y);

      const lblLad = this.worldToCanvas(32.40, 27.15);
      ctx.fillStyle = '#facc15';
      ctx.fillText('[LADDER]', lblLad.x - 22, lblLad.y + 14);

      const lblThr = this.worldToCanvas(32.40, 32.25);
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 9px JetBrains Mono, monospace';
      ctx.fillText('ROCKET THRUSTERS', lblThr.x - 30, lblThr.y);
    }

    // 8. Safe Collision Boundary (Green Dash Line)
    if (this.showBounds) {
      const bMin = this.worldToCanvas(SHIP_BOUNDS.minX, SHIP_BOUNDS.minZ);
      const bMax = this.worldToCanvas(SHIP_BOUNDS.maxX, SHIP_BOUNDS.maxZ);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1.2;
      ctx.strokeRect(bMin.x, bMax.y, bMax.x - bMin.x, bMin.y - bMax.y);
      ctx.setLineDash([]);
    }

    // 9. ITEMS DOT RENDERING & CLUSTER RADAR (ENLARGED HITBOX & MARKERS)
    if (!this.saveData || !this.saveData.items) return;
    const items = this.saveData.items;

    const clusters = [];
    const visited = new Set();

    items.forEach((it, idx) => {
      if (visited.has(idx)) return;
      const group = [it];
      visited.add(idx);

      for (let j = idx + 1; j < items.length; j++) {
        if (!visited.has(j)) {
          const other = items[j];
          const dist = Math.hypot(it.x - other.x, it.z - other.z);
          if (dist < 0.18 && Math.abs(it.y - other.y) < 0.25) {
            group.push(other);
            visited.add(j);
          }
        }
      }
      clusters.push({ representative: it, group });
    });

    clusters.forEach(cluster => {
      const it = cluster.representative;
      const group = cluster.group;
      const pt = this.worldToCanvas(it.x, it.z);
      const cat = getItemCategory(it.name);
      const isSelected = group.some(item => items.indexOf(item) === this.selectedItemIndex);
      const isHovered = group.some(item => items.indexOf(item) === this.hoveredItemIndex);

      // Selected Reticle Ring (Enlarged)
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 20, 0, Math.PI * 2);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 28, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // Hover Glow Ring
      if (isHovered && !isSelected) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 18, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Main Item Radar Point (Enlarged from 7px to 10px)
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = cat.color;
      ctx.shadowColor = cat.color;
      ctx.shadowBlur = isSelected ? 18 : 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Bright Core
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Cluster Count Badge
      if (group.length > 1) {
        ctx.fillStyle = '#070c14';
        ctx.strokeStyle = cat.color;
        ctx.lineWidth = 1.8;
        ctx.fillRect(pt.x + 12, pt.y - 16, 38, 18);
        ctx.strokeRect(pt.x + 12, pt.y - 16, 38, 18);

        ctx.font = 'bold 11px JetBrains Mono, monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`x${group.length}`, pt.x + 15, pt.y - 3);
      } else if (this.showLabels && (cat.tag === 'HIGH_VALUE' || isSelected)) {
        ctx.font = 'bold 10px JetBrains Mono, monospace';
        ctx.fillStyle = cat.color;
        ctx.fillText(it.name, pt.x + 13, pt.y + 4);
      }
    });
  }

  setupInteractivity() {
    // ENLARGED HITBOX: 38px click and hover detection radius
    const HITBOX_RADIUS = 38;

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (!this.saveData || !this.saveData.items) return;

      let hoveredIdx = -1;
      let closestDist = HITBOX_RADIUS;

      for (let i = 0; i < this.saveData.items.length; i++) {
        const pt = this.worldToCanvas(this.saveData.items[i].x, this.saveData.items[i].z);
        const dist = Math.hypot(mouseX - pt.x, mouseY - pt.y);
        if (dist < closestDist) {
          closestDist = dist;
          hoveredIdx = i;
        }
      }

      if (this.hoveredItemIndex !== hoveredIdx) {
        this.hoveredItemIndex = hoveredIdx;
        this.canvas.style.cursor = hoveredIdx !== -1 ? 'pointer' : 'crosshair';
        this.render();
      }
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (!this.saveData || !this.saveData.items) return;

      let clickedIdx = -1;
      let closestDist = HITBOX_RADIUS;

      for (let i = 0; i < this.saveData.items.length; i++) {
        const pt = this.worldToCanvas(this.saveData.items[i].x, this.saveData.items[i].z);
        const dist = Math.hypot(mouseX - pt.x, mouseY - pt.y);
        if (dist < closestDist) {
          closestDist = dist;
          clickedIdx = i;
        }
      }

      if (clickedIdx !== -1) {
        this.selectedItemIndex = clickedIdx;
        if (this.onSelectCallback) this.onSelectCallback(clickedIdx);
        this.render();
      }
    });
  }
}

window.ShipRenderer = ShipRenderer;
