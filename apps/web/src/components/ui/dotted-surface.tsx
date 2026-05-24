import { useEffect, useRef } from "react";
import * as THREE from "three";

type DottedSurfaceProps = {
  className?: string;
  density?: number;
};

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function readThemeColors() {
  const style = getComputedStyle(document.documentElement);
  const isDark = document.documentElement.classList.contains("dark");
  const primary = (isDark ? style.getPropertyValue("--chart-1").trim() : style.getPropertyValue("--primary").trim()) || "#72e3ad";
  const foreground = style.getPropertyValue("--foreground").trim() || "#171717";

  return {
    primary: new THREE.Color(primary),
    foreground: new THREE.Color(foreground),
    opacity: isDark ? 0.48 : 0.72,
    pointSize: isDark ? 0.052 : 0.061
  };
}

export function DottedSurface({ className, density = 980 }: DottedSurfaceProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || prefersReducedMotion()) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.z = 22;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(renderer.domElement);

    const geometry = new THREE.BufferGeometry();
    const isMobile = window.matchMedia("(max-width: 640px)").matches;
    const count = isMobile ? Math.floor(density * 0.52) : density;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const columns = isMobile ? 24 : 35;
    const rowOffset = isMobile ? 10 : 14;
    const columnOffset = isMobile ? 11.5 : 17;

    for (let index = 0; index < count; index += 1) {
      const row = Math.floor(index / columns);
      const col = index % columns;
      const x = (col - columnOffset) * 0.72;
      const y = (row - rowOffset) * 0.62;
      const z = Math.sin(col * 0.4) * 0.45 + Math.cos(row * 0.35) * 0.35;
      positions[index * 3] = x;
      positions[index * 3 + 1] = y;
      positions[index * 3 + 2] = z;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const theme = readThemeColors();
    const material = new THREE.PointsMaterial({
      size: theme.pointSize,
      vertexColors: true,
      transparent: true,
      opacity: theme.opacity,
      depthWrite: false
    });
    const points = new THREE.Points(geometry, material);
    points.rotation.x = -0.38;
    scene.add(points);

    let frame = 0;
    const applyTheme = () => {
      const nextTheme = readThemeColors();
      const colorAttribute = geometry.getAttribute("color") as THREE.BufferAttribute;
      for (let index = 0; index < count; index += 1) {
        const color = index % 7 === 0
          ? nextTheme.primary
          : nextTheme.foreground.clone().lerp(nextTheme.primary, index % 3 === 0 ? 0.52 : 0.32);
        colorAttribute.setXYZ(index, color.r, color.g, color.b);
      }
      colorAttribute.needsUpdate = true;
      material.opacity = nextTheme.opacity;
      material.size = nextTheme.pointSize;
    };

    const resize = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const animate = () => {
      points.rotation.z += 0.0009;
      points.rotation.y = Math.sin(Date.now() * 0.00025) * 0.08;
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(animate);
    };

    applyTheme();
    resize();
    animate();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    const themeObserver = new MutationObserver(applyTheme);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [density]);

  return <div ref={hostRef} className={className ?? "dotted-surface"} aria-hidden="true" />;
}
