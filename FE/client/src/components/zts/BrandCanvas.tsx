import { useEffect, useRef } from "react";
import * as THREE from "three";

interface BrandCanvasProps {
  className?: string;
}

/**
 * Momento de marca (apenas login/home): aparelho geométrico em wireframe girando devagar.
 * Three.js puro, DPR limitado, pausa fora da tela e respeita prefers-reduced-motion.
 * NÃO usar em telas operacionais (dashboard).
 */
export function BrandCanvas({ className }: BrandCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    camera.position.set(0, 0, 7);

    const steel = new THREE.Color("#7fa3c7");
    const faint = new THREE.Color("#3d5a78");

    const group = new THREE.Group();
    scene.add(group);

    // Corpo do aparelho
    const bodyGeo = new THREE.BoxGeometry(1.7, 3.4, 0.22);
    const body = new THREE.LineSegments(
      new THREE.EdgesGeometry(bodyGeo),
      new THREE.LineBasicMaterial({ color: steel })
    );
    group.add(body);

    // Tela interna
    const screenGeo = new THREE.PlaneGeometry(1.45, 3.1);
    const screen = new THREE.LineSegments(
      new THREE.EdgesGeometry(screenGeo),
      new THREE.LineBasicMaterial({ color: faint })
    );
    screen.position.z = 0.115;
    group.add(screen);

    // Marca: três barras ("Z" estilizado) no centro da tela
    const barMat = new THREE.MeshBasicMaterial({ color: steel });
    const bars: THREE.Mesh[] = [
      new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.12), barMat),
      new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.12), barMat),
      new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.12), barMat),
    ];
    bars[0].position.set(0, 0.45, 0.12);
    bars[1].position.set(0, 0, 0.12);
    bars[1].rotation.z = -0.9;
    bars[2].position.set(0, -0.45, 0.12);
    bars.forEach(b => group.add(b));

    // Anel de órbita
    const ring = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.TorusGeometry(2.6, 0.01, 4, 6)),
      new THREE.LineBasicMaterial({ color: faint, transparent: true, opacity: 0.6 })
    );
    ring.rotation.x = Math.PI / 2.4;
    scene.add(ring);

    group.rotation.set(0.12, -0.5, 0.05);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    let frame = 0;
    let visible = true;
    const clock = new THREE.Clock();

    const render = () => {
      const t = clock.getElapsedTime();
      if (!reduceMotion) {
        group.rotation.y = -0.5 + Math.sin(t * 0.4) * 0.7;
        group.position.y = Math.sin(t * 0.8) * 0.08;
        ring.rotation.z = t * 0.15;
      }
      renderer.render(scene, camera);
    };

    const loop = () => {
      if (visible) render();
      frame = requestAnimationFrame(loop);
    };
    if (reduceMotion) render();
    else loop();

    const onVisibility = () => {
      visible = !document.hidden;
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibility);
      observer.disconnect();
      scene.traverse(obj => {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        const mat = mesh.material;
        if (Array.isArray(mat)) mat.forEach(m => m.dispose());
        else mat?.dispose();
      });
      bodyGeo.dispose();
      screenGeo.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} className={className} aria-hidden />;
}
