"use client";
import anime from 'animejs';

/**
 * Cinematic Hero entrance sequence
 * Choreographed timing for a premium first impression
 */
export const initHeroAnimations = (refs) => {
  const timeline = anime.timeline({
    easing: 'cubicBezier(0.16, 1, 0.3, 1)',
  });

  // 1. Content fades in with smooth slide
  timeline.add({
    targets: '.hero-content',
    opacity: [0, 1],
    translateY: [60, 0],
    duration: 1000,
  }, 100);

  // 2. Staggered text elements
  timeline.add({
    targets: '.hero-content .stagger-elm',
    opacity: [0, 1],
    translateY: [40, 0],
    duration: 800,
    delay: anime.stagger(120),
  }, 300);

  // 3. Hero visual scales in
  timeline.add({
    targets: '.hero-visual',
    opacity: [0, 1],
    scale: [0.9, 1],
    duration: 1000,
  }, 400);

  // 4. Orb drifting — continuous ambient motion
  if (refs.orbRef?.current) {
    anime({
      targets: refs.orbRef.current,
      translateX: () => anime.random(-40, 40),
      translateY: () => anime.random(-40, 40),
      duration: 8000,
      easing: 'easeInOutSine',
      direction: 'alternate',
      loop: true,
    });
  }

  // 5. Floating badges — gentle float
  if (refs.avatarRefs?.current?.length) {
    anime({
      targets: refs.avatarRefs.current.filter(Boolean),
      translateY: [-10, 10],
      duration: 3000,
      delay: anime.stagger(500),
      direction: 'alternate',
      loop: true,
      easing: 'easeInOutSine'
    });
  }

  // 6. Subtle button breathe
  if (refs.buttonRef?.current) {
    // No looping pulse — keeps it clean and intentional
    // The magnetic effect handles interactivity instead
  }
};

/**
 * Hover/Leave effects are now handled via CSS + magnetic effect
 * These are kept for backward compatibility but simplified
 */
export const hoverEffect = () => {};
export const leaveEffect = () => {};
