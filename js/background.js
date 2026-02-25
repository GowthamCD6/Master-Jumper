// ============================================================
//  Background
// ============================================================

const bgImage = new Image();
bgImage.src = "./img/background2.jpg";
let bgLoaded = false;
bgImage.onload = () => { bgLoaded = true; };

/**
 * Draw the background image filling the entire canvas.
 * Call this in screen-space (before c.save / c.scale).
 */
function drawBackground() {
  if (bgLoaded) {
    c.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
  }
}