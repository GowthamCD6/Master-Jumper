// ============================================================
//  Stepping Stone – spritesheet loader & renderer
// ============================================================

const stoneImg = new Image();
stoneImg.src = "./img/warrior/stepstone.png";
let stoneLoaded = false;
stoneImg.onload = () => { stoneLoaded = true; };

// Source rectangles for six stone variants (from the new stepstone.png sprite data)
const stoneSprites = [
  { sx: 20,  sy: 9,   sw: 128, sh: 156 },  // stone 1 – medium tall
  { sx: 218, sy: 17,  sw: 126, sh: 122 },  // stone 2 – medium wide
  { sx: 172, sy: 144, sw: 125, sh: 128 },  // stone 3 – medium round
  { sx: 41,  sy: 219, sw: 85,  sh: 103 },  // stone 4 – small
  { sx: 4,   sy: 357, sw: 182, sh: 173 },  // stone 5 – large A
  { sx: 93,  sy: 544, sw: 146, sh: 141 },  // stone 6 – large B
];

// Maximum stone draw height to prevent overlapping with platforms above
const MAX_STONE_HEIGHT = 60;

/**
 * Draw all stepping stones on the canvas.
 * Call this inside the world-space (after c.scale / c.translate).
 */
function drawSteppingStones() {
  if (!stoneLoaded) return;

  platformGroups.forEach((group) => {
    const stone = stoneSprites[group.stoneType];
    // Scale stone width to match platform with overhang
    const overhang = Math.min(16, group.width * 0.2);
    const drawW = group.width + overhang;
    // Calculate height maintaining aspect ratio, but cap it to prevent overlap
    let drawH = drawW * (stone.sh / stone.sw);
    drawH = Math.min(drawH, MAX_STONE_HEIGHT);
    
    // Center stone horizontally on the platform
    const drawX = group.x - overhang / 2;
    // Draw stone starting from collision line downward (hero stands ON TOP of stone)
    const drawY = group.y;
    
    c.drawImage(
      stoneImg,
      stone.sx, stone.sy, stone.sw, stone.sh,
      drawX, drawY, drawW, drawH,
    );
  });
}
