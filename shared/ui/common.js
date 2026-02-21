/**
 * Shared UI primitives.
 */
export function createButton(scene, x, y, width, height, label, onClick) {
  // Container keeps button visuals and label grouped for easy positioning.
  const container = scene.add.container(x, y);

  const bg = scene.add
    .rectangle(0, 0, width, height, 0x2e2117, 0.92)
    .setStrokeStyle(2, 0xb08968, 1)
    .setInteractive({ useHandCursor: true });

  const text = scene.add
    .text(0, 0, label, {
      fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
      fontSize: "20px",
      color: "#f7efe2",
      align: "center",
    })
    .setOrigin(0.5);

  bg.on("pointerover", () => bg.setFillStyle(0x4a3322, 1));
  bg.on("pointerout", () => bg.setFillStyle(0x2e2117, 0.92));
  // Trigger callback only on explicit press.
  bg.on("pointerdown", () => {
    if (onClick) {
      onClick();
    }
  });

  container.add([bg, text]);
  return {
    container,
    bg,
    text,
    setLabel(nextLabel) {
      text.setText(nextLabel);
    },
    setEnabled(enabled) {
      bg.disableInteractive();
      if (enabled) {
        bg.setInteractive({ useHandCursor: true });
        bg.setFillStyle(0x2e2117, 0.92);
      } else {
        bg.setFillStyle(0x19130f, 0.62);
      }
    },
  };
}

export function drawBar(graphics, x, y, width, height, ratio, fillColor, bgColor = 0x111827) {
  // Simple framed bar used in several overlay UIs.
  graphics.clear();
  graphics.fillStyle(bgColor, 0.95);
  graphics.fillRect(x, y, width, height);
  graphics.fillStyle(fillColor, 0.95);
  graphics.fillRect(x + 2, y + 2, Math.max(0, (width - 4) * ratio), height - 4);
  graphics.lineStyle(2, 0xe5e7eb, 0.9);
  graphics.strokeRect(x, y, width, height);
}
