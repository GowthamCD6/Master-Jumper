// ============================================================
//  Input Handling
// ============================================================

const keys = {
  d: { pressed: false },
  a: { pressed: false },
};

window.addEventListener("keydown", (event) => {
  if (event.repeat) return;
  switch (event.key) {
    case "d":
    case "ArrowRight":
      keys.d.pressed = true;
      break;
    case "a":
    case "ArrowLeft":
      keys.a.pressed = true;
      break;
    case "w":
    case "ArrowUp":
    case " ":
      if (player.isOnGround) {
        player.velocity.y = -3.5;
        player.isOnGround = false;
      }
      break;
  }
});

window.addEventListener("keyup", (event) => {
  switch (event.key) {
    case "d":
    case "ArrowRight":
      keys.d.pressed = false;
      break;
    case "a":
    case "ArrowLeft":
      keys.a.pressed = false;
      break;
  }
});