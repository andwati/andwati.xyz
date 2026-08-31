import * as THREE from "three";
import type { ConstellationGraph } from "./constellation-data";
import { animateSpring } from "./spring";

const TYPE_COLOR_VAR: Record<string, string> = {
  writing: "--accent",
  portfolio: "--text",
  bookshelf: "--text-muted",
};

function cssColor(varName: string): THREE.Color {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  return new THREE.Color(value || "#ffffff");
}

/** Deterministic, dependency-free layout: points spread evenly over a sphere. */
function fibonacciSphere(count: number, radius: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / Math.max(count - 1, 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i;
    points.push(
      new THREE.Vector3(
        Math.cos(theta) * r * radius,
        y * radius,
        Math.sin(theta) * r * radius,
      ),
    );
  }
  return points;
}

export function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

export function mountConstellation(
  container: HTMLElement,
  tooltip: HTMLElement,
  graph: ConstellationGraph,
): () => void {
  const { nodes, edges } = graph;
  const radius = 6.5;
  const positions = fibonacciSphere(nodes.length, radius);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    50,
    container.clientWidth / container.clientHeight,
    0.1,
    100,
  );
  camera.position.z = 13;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const group = new THREE.Group();
  scene.add(group);

  // Edges: shared-tag connections between content entries.
  const edgeGeometry = new THREE.BufferGeometry();
  const edgePositions = new Float32Array(edges.length * 6);
  edges.forEach(([a, b], i) => {
    const pa = positions[a];
    const pb = positions[b];
    edgePositions.set([pa.x, pa.y, pa.z, pb.x, pb.y, pb.z], i * 6);
  });
  edgeGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(edgePositions, 3),
  );
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: cssColor("--border"),
    transparent: true,
    opacity: 0.5,
  });
  group.add(new THREE.LineSegments(edgeGeometry, edgeMaterial));

  // Nodes: one small sphere per content entry, colored by type.
  const nodeMeshes: THREE.Mesh[] = nodes.map((node, i) => {
    const geometry = new THREE.SphereGeometry(0.12, 12, 12);
    const material = new THREE.MeshBasicMaterial({
      color: cssColor(TYPE_COLOR_VAR[node.type]),
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(positions[i]);
    mesh.userData.node = node;
    group.add(mesh);
    return mesh;
  });

  const raycaster = new THREE.Raycaster();
  raycaster.params.Points = { threshold: 0.3 };
  const pointer = new THREE.Vector2(-2, -2);
  let hovered: THREE.Mesh | null = null;

  function onPointerMove(event: PointerEvent) {
    const rect = container.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function onClick() {
    if (hovered)
      window.location.href = (hovered.userData.node as { url: string }).url;
  }

  container.addEventListener("pointermove", onPointerMove);
  container.addEventListener("click", onClick);

  function onResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }
  window.addEventListener("resize", onResize);

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  // Object3D isn't a DOM element animateSpring can target directly, so drive
  // the group's scale from a throwaway element's spring-animated keyframes.
  group.scale.setScalar(reduceMotion ? 1 : 0.001);
  if (!reduceMotion) {
    const proxy = document.createElement("div");
    animateSpring(proxy, {
      from: 0,
      to: 1,
      stiffness: 120,
      damping: 14,
      toKeyframe: (v) => {
        group.scale.setScalar(Math.max(v, 0.001));
        return { opacity: "1" };
      },
    });
  }

  let frame = 0;
  function animate() {
    frame = requestAnimationFrame(animate);
    if (!reduceMotion) group.rotation.y += 0.0009;

    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(nodeMeshes);
    const hit = hits[0]?.object as THREE.Mesh | undefined;

    if (hit !== hovered) {
      if (hovered)
        (hovered.material as THREE.MeshBasicMaterial).color.copy(
          cssColor(TYPE_COLOR_VAR[hovered.userData.node.type]),
        );
      hovered = hit ?? null;
      if (hovered) {
        (hovered.material as THREE.MeshBasicMaterial).color.copy(
          cssColor("--accent"),
        );
        const node = hovered.userData.node as { title: string };
        tooltip.textContent = node.title;
        tooltip.style.opacity = "1";
        container.style.cursor = "pointer";
      } else {
        tooltip.style.opacity = "0";
        container.style.cursor = "default";
      }
    }
    if (hovered) {
      const vector = hovered.position.clone().project(camera);
      const x = ((vector.x + 1) / 2) * container.clientWidth;
      const y = ((1 - vector.y) / 2) * container.clientHeight;
      tooltip.style.transform = `translate(${x}px, ${y - 16}px)`;
    }

    renderer.render(scene, camera);
  }
  animate();

  return function destroy() {
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", onResize);
    container.removeEventListener("pointermove", onPointerMove);
    container.removeEventListener("click", onClick);
    renderer.dispose();
    container.removeChild(renderer.domElement);
  };
}
