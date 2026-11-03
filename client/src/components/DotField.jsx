import { memo, useEffect, useRef } from "react";
import "./DotField.css";

const parseRgba = (color) => {
  const values = color.match(/[\d.]+/g)?.map(Number) || [];
  return {
    r: values[0] ?? 22,
    g: values[1] ?? 101,
    b: values[2] ?? 52,
    a: values[3] ?? 0.18,
  };
};

const mixColor = (from, to, amount, alphaScale = 1) => {
  const mix = (start, end) => Math.round(start + ((end - start) * amount));
  const alpha = (from.a + ((to.a - from.a) * amount)) * alphaScale;
  return `rgba(${mix(from.r, to.r)}, ${mix(from.g, to.g)}, ${mix(from.b, to.b)}, ${alpha})`;
};

function DotField({
  dotRadius = 1.2,
  dotSpacing = 18,
  bulgeStrength = 35,
  glowRadius = 140,
  sparkle = false,
  waveAmplitude = 0,
  gradientFrom = "rgba(22, 101, 52, 0.18)",
  gradientTo = "rgba(134, 180, 145, 0.12)",
  glowColor = "rgba(22, 101, 52, 0.08)",
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return undefined;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return undefined;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const from = parseRgba(gradientFrom);
    const to = parseRgba(gradientTo);
    const pointer = { x: -1000, y: -1000, targetX: -1000, targetY: -1000, active: false };
    let width = 0;
    let height = 0;
    let frameId = 0;

    const resize = () => {
      const bounds = container.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw();
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      if (pointer.active && finePointer) {
        const glow = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, glowRadius);
        glow.addColorStop(0, glowColor);
        glow.addColorStop(1, "rgba(22, 101, 52, 0)");
        context.fillStyle = glow;
        context.fillRect(pointer.x - glowRadius, pointer.y - glowRadius, glowRadius * 2, glowRadius * 2);
      }

      const offsetX = (width % dotSpacing) / 2;
      const offsetY = (height % dotSpacing) / 2;
      for (let y = offsetY; y <= height; y += dotSpacing) {
        const verticalMix = height ? y / height : 0;
        for (let x = offsetX; x <= width; x += dotSpacing) {
          let drawX = x;
          let drawY = y;
          let radius = dotRadius;
          let intensity = 0;
          if (pointer.active && finePointer) {
            const dx = x - pointer.x;
            const dy = y - pointer.y;
            const distance = Math.hypot(dx, dy);
            if (distance < glowRadius) {
              intensity = Math.pow(1 - (distance / glowRadius), 2);
              const displacement = bulgeStrength * intensity;
              const direction = distance || 1;
              drawX += (dx / direction) * displacement;
              drawY += (dy / direction) * displacement;
              radius += intensity * 0.75;
            }
          }
          context.beginPath();
          context.fillStyle = mixColor(from, to, verticalMix, 1 + intensity * 0.55);
          context.arc(drawX, drawY, radius, 0, Math.PI * 2);
          context.fill();
        }
      }
    };

    const animate = () => {
      pointer.x += (pointer.targetX - pointer.x) * 0.12;
      pointer.y += (pointer.targetY - pointer.y) * 0.12;
      draw();
      frameId = window.requestAnimationFrame(animate);
    };

    const handlePointerMove = (event) => {
      if (!finePointer || event.pointerType === "touch") return;
      const bounds = container.getBoundingClientRect();
      const inside = event.clientX >= bounds.left && event.clientX <= bounds.right
        && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
      pointer.active = inside;
      if (inside) {
        pointer.targetX = event.clientX - bounds.left;
        pointer.targetY = event.clientY - bounds.top;
        if (pointer.x < -500) {
          pointer.x = pointer.targetX;
          pointer.y = pointer.targetY;
        }
      }
    };

    const handlePointerLeave = () => { pointer.active = false; };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    if (finePointer && !reducedMotion) {
      window.addEventListener("pointermove", handlePointerMove, { passive: true });
      window.addEventListener("blur", handlePointerLeave);
      frameId = window.requestAnimationFrame(animate);
    } else {
      resize();
    }

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("blur", handlePointerLeave);
    };
  }, [bulgeStrength, dotRadius, dotSpacing, glowColor, glowRadius, gradientFrom, gradientTo, sparkle, waveAmplitude]);

  return <div ref={containerRef} className="dot-field" aria-hidden="true"><canvas ref={canvasRef} /></div>;
}

export default memo(DotField);
