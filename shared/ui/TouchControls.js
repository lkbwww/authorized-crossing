/**
 * Minimal on-screen controls for mobile play.
 * Exposes mutable flags that scenes can read each frame.
 */
export function createTouchControls(scene, options = {}) {
  const width = scene.scale.width;
  const height = scene.scale.height;
  const showDownButton = !!options.showDownButton;
  const showUpButton = !!options.showUpButton;
  const showBoostButton = !!options.showBoostButton;

  const buttonWidth = 150;
  const buttonHeight = 84;
  const y = height - 70;

  let leftPressed = false;
  let rightPressed = false;
  let downPressed = false;
  let upPressed = false;
  let boostPressed = false;

  const leftRect = scene.add
    .rectangle(120, y, buttonWidth, buttonHeight, 0x2c1f15, 0.65)
    .setStrokeStyle(2, 0xb08a63, 0.95)
    .setInteractive();
  const rightRect = scene.add
    .rectangle(width - 120, y, buttonWidth, buttonHeight, 0x2c1f15, 0.65)
    .setStrokeStyle(2, 0xb08a63, 0.95)
    .setInteractive();
  const downRect = showDownButton
    ? scene.add
        .rectangle(width / 2, y, buttonWidth, buttonHeight, 0x2c1f15, 0.65)
        .setStrokeStyle(2, 0xb08a63, 0.95)
        .setInteractive()
    : null;
  const upRect = showUpButton
    ? scene.add
        .rectangle(width / 2, y - 96, buttonWidth, buttonHeight, 0x2c1f15, 0.65)
        .setStrokeStyle(2, 0xb08a63, 0.95)
        .setInteractive()
    : null;
  const boostY = showUpButton ? y - 192 : y - 96;
  const boostRect = showBoostButton
    ? scene.add
        .rectangle(width / 2, boostY, buttonWidth, buttonHeight, 0x2c1f15, 0.65)
        .setStrokeStyle(2, 0xb08a63, 0.95)
        .setInteractive()
    : null;

  const leftText = scene.add
    .text(120, y, "LEFT", {
      fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
      fontSize: "24px",
      color: "#f3e8d8",
    })
    .setOrigin(0.5);
  const rightText = scene.add
    .text(width - 120, y, "RIGHT", {
      fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
      fontSize: "24px",
      color: "#f3e8d8",
    })
    .setOrigin(0.5);
  const downText = showDownButton
    ? scene.add
        .text(width / 2, y, "DOWN", {
          fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
          fontSize: "24px",
          color: "#f3e8d8",
        })
        .setOrigin(0.5)
    : null;
  const upText = showUpButton
    ? scene.add
        .text(width / 2, y - 96, "UP", {
          fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
          fontSize: "24px",
          color: "#f3e8d8",
        })
        .setOrigin(0.5)
    : null;
  const boostText = showBoostButton
    ? scene.add
        .text(width / 2, boostY, "BOOST", {
          fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
          fontSize: "24px",
          color: "#f3e8d8",
        })
        .setOrigin(0.5)
    : null;

  const onPress = (rect, side) => {
    rect.setFillStyle(0x7a4f2e, 0.8);
    if (side === "left") {
      leftPressed = true;
    } else if (side === "right") {
      rightPressed = true;
    } else if (side === "down") {
      downPressed = true;
    } else if (side === "boost") {
      boostPressed = true;
    } else {
      upPressed = true;
    }
  };

  // Keep pressed-state deterministic by handling all pointer release variants.
  const onRelease = (rect, side) => {
    rect.setFillStyle(0x2c1f15, 0.65);
    if (side === "left") {
      leftPressed = false;
    } else if (side === "right") {
      rightPressed = false;
    } else if (side === "down") {
      downPressed = false;
    } else if (side === "boost") {
      boostPressed = false;
    } else {
      upPressed = false;
    }
  };

  leftRect.on("pointerdown", () => onPress(leftRect, "left"));
  leftRect.on("pointerup", () => onRelease(leftRect, "left"));
  leftRect.on("pointerout", () => onRelease(leftRect, "left"));
  leftRect.on("pointerupoutside", () => onRelease(leftRect, "left"));

  rightRect.on("pointerdown", () => onPress(rightRect, "right"));
  rightRect.on("pointerup", () => onRelease(rightRect, "right"));
  rightRect.on("pointerout", () => onRelease(rightRect, "right"));
  rightRect.on("pointerupoutside", () => onRelease(rightRect, "right"));

  if (downRect) {
    downRect.on("pointerdown", () => onPress(downRect, "down"));
    downRect.on("pointerup", () => onRelease(downRect, "down"));
    downRect.on("pointerout", () => onRelease(downRect, "down"));
    downRect.on("pointerupoutside", () => onRelease(downRect, "down"));
  }
  if (upRect) {
    upRect.on("pointerdown", () => onPress(upRect, "up"));
    upRect.on("pointerup", () => onRelease(upRect, "up"));
    upRect.on("pointerout", () => onRelease(upRect, "up"));
    upRect.on("pointerupoutside", () => onRelease(upRect, "up"));
  }
  if (boostRect) {
    boostRect.on("pointerdown", () => onPress(boostRect, "boost"));
    boostRect.on("pointerup", () => onRelease(boostRect, "boost"));
    boostRect.on("pointerout", () => onRelease(boostRect, "boost"));
    boostRect.on("pointerupoutside", () => onRelease(boostRect, "boost"));
  }

  return {
    // Accessors are used by scenes to merge touch input with keyboard input.
    isLeftPressed: () => leftPressed,
    isRightPressed: () => rightPressed,
    isDownPressed: () => downPressed,
    isUpPressed: () => upPressed,
    isBoostPressed: () => boostPressed,
    setBoostState(state = {}) {
      if (!boostRect || !boostText) {
        return;
      }
      if (state.cooldown && state.cooldown > 0) {
        boostRect.setFillStyle(0x2f2b27, 0.75);
        boostText.setText(`COOLDOWN ${state.cooldown.toFixed(1)}s`);
        return;
      }
      if (state.active) {
        boostRect.setFillStyle(0x7a5a2f, 0.82);
        boostText.setText(`BOOST ${Math.round(state.charge ?? 0)}%`);
        return;
      }
      boostRect.setFillStyle(0x2c1f15, 0.65);
      boostText.setText(`BOOST ${Math.round(state.charge ?? 0)}%`);
    },
    destroy() {
      leftRect.destroy();
      rightRect.destroy();
      if (downRect) {
        downRect.destroy();
      }
      if (upRect) {
        upRect.destroy();
      }
      if (boostRect) {
        boostRect.destroy();
      }
      leftText.destroy();
      rightText.destroy();
      if (downText) {
        downText.destroy();
      }
      if (upText) {
        upText.destroy();
      }
      if (boostText) {
        boostText.destroy();
      }
    },
  };
}
