// ============================================================
//  Camera
// ============================================================

const camera = {
  position: {
    x: 0,
    y: -(WORLD_HEIGHT - scaledCanvas.height),
  },
};

/**
 * Clamp camera so it never scrolls past world edges.
 */
function clampCamera() {
  // Allow camera to reach the very top (y=0)
  if (camera.position.y > 0) camera.position.y = 0;

  // Allow camera to reach the very bottom
  const minCamY = -(WORLD_HEIGHT - scaledCanvas.height);
  if (camera.position.y < minCamY) camera.position.y = minCamY;

  // No horizontal scrolling – world width matches canvas width
  camera.position.x = 0;
}
