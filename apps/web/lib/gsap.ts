"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register ScrollTrigger only once in browser context
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);

  // Set default animation timing aligned with fluid interaction guidelines
  gsap.defaults({
    duration: 0.6,
    ease: "power3.out",
  });
}

export { gsap, ScrollTrigger };

/**
 * Checks if user prefers reduced motion (per Apple Accessibility standards)
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};
