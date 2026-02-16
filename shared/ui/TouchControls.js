export function createTouchControls(scene, options = {}) {
  const width = scene.scale.width;
  const height = scene.scale.height;
  const showDownButton = !!options.showDownButton;
  const showUpButton = !!options.showUpButton;

  const buttonWidth = 150;
  const buttonHeight = 84;
  const y = height - 70;

  let leftPressed = false;
  let rightPressed = false;
  let downPressed = false;
  let upPressed = false;

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

  const onPress = (rect, side) => {
    rect.setFillStyle(0x7a4f2e, 0.8);
    if (side === "left") {
      leftPressed = true;
    } else if (side === "right") {
      rightPressed = true;
    } else if (side === "down") {
      downPressed = true;
    } else {
      upPressed = true;
    }
  };

  const onRelease = (rect, side) => {
    rect.setFillStyle(0x2c1f15, 0.65);
    if (side === "left") {
      leftPressed = false;
    } else if (side === "right") {
      rightPressed = false;
    } else if (side === "down") {
      downPressed = false;
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

  return {
    isLeftPressed: () => leftPressed,
    isRightPressed: () => rightPressed,
    isDownPressed: () => downPressed,
    isUpPressed: () => upPressed,
    destroy() {
      leftRect.destroy();
      rightRect.destroy();
      if (downRect) {
        downRect.destroy();
      }
      if (upRect) {
        upRect.destroy();
      }
      leftText.destroy();
      rightText.destroy();
      if (downText) {
        downText.destroy();
      }
      if (upText) {
        upText.destroy();
      }
    },
  };
}
