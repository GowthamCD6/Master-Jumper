// ============================================================
//  Canvas Setup & Scaling
// ============================================================

const canvas = document.querySelector("canvas");
const c = canvas.getContext("2d");

// Fixed mobile resolution (9:16 portrait like Flappy Bird)
const GAME_WIDTH = 480;
const GAME_HEIGHT = 700;

function resizeCanvas() {
  const scaleX = window.innerWidth / GAME_WIDTH;
  const scaleY = window.innerHeight / GAME_HEIGHT;
  const fitScale = Math.min(scaleX, scaleY);

  canvas.width = GAME_WIDTH;
  canvas.height = GAME_HEIGHT;
  canvas.style.width = Math.floor(GAME_WIDTH * fitScale) + "px";
  canvas.style.height = Math.floor(GAME_HEIGHT * fitScale) + "px";
}
resizeCanvas();

let scaledCanvas = {
  width: GAME_WIDTH / GAME_SCALE,
  height: GAME_HEIGHT / GAME_SCALE,
};

window.addEventListener("resize", () => {
  resizeCanvas();
  scaledCanvas = {
    width: GAME_WIDTH / GAME_SCALE,
    height: GAME_HEIGHT / GAME_SCALE,
  };
});
