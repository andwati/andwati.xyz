export interface SpringOptions {
  stiffness?: number;
  damping?: number;
  mass?: number;
  /** Stop simulating once position and velocity are both within this of rest. */
  precision?: number;
}

/**
 * Simulates a damped harmonic oscillator from 0 to 1 and returns per-frame
 * progress values (60fps), for use as Web Animations API keyframes. Pure
 * physics simulation, no DOM/CSS opinions — see `animateSpring` below for
 * the usual way to consume it.
 */
export function springProgress({
  stiffness = 170,
  damping = 26,
  mass = 1,
  precision = 0.005,
}: SpringOptions = {}): number[] {
  const frames: number[] = [];
  let position = 0;
  let velocity = 0;
  const dt = 1 / 60;
  const maxDuration = 4; // seconds, safety cap against under-damped configs
  for (let t = 0; t < maxDuration; t += dt) {
    const acceleration =
      (-stiffness * (position - 1) - damping * velocity) / mass;
    velocity += acceleration * dt;
    position += velocity * dt;
    frames.push(position);
    if (Math.abs(1 - position) < precision && Math.abs(velocity) < precision)
      break;
  }
  frames.push(1);
  return frames;
}

/**
 * Animates `element` from `from` to `to` along a spring curve, via the
 * native Web Animations API — no animation library dependency. `toKeyframe`
 * shapes each interpolated value into whatever CSS properties you need,
 * e.g. `(v) => ({ transform: \`translateY(${(1 - v) * 20}px)\`, opacity: v })`.
 * Honors `prefers-reduced-motion` by jumping straight to the end state.
 */
export function animateSpring(
  element: HTMLElement,
  options: SpringOptions & {
    from: number;
    to: number;
    toKeyframe: (value: number) => Keyframe;
  },
): Animation {
  const { from, to, toKeyframe, ...spring } = options;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return element.animate([toKeyframe(to)], { duration: 1, fill: "forwards" });
  }
  const progress = springProgress(spring);
  const keyframes = progress.map((p) => toKeyframe(from + (to - from) * p));
  const durationMs = (progress.length / 60) * 1000;
  return element.animate(keyframes, {
    duration: durationMs,
    fill: "forwards",
    easing: "linear",
  });
}
