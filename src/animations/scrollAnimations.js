"use client";
import anime from 'animejs';

/**
 * Cinematic scroll-triggered animations using anime.js
 * Each element is observed individually for precise control
 */
export const initScrollAnimations = (selector, options = {}) => {
  const {
    translateY = 40,
    translateX = 0,
    duration = 800,
    stagger = 0,
    delay = 0,
    easing = 'cubicBezier(0.16, 1, 0.3, 1)',
    threshold = 0.15,
    scale = null,
  } = options;

  const elements = document.querySelectorAll(selector);

  // Set initial hidden state
  elements.forEach(el => {
    el.style.opacity = '0';
    if (translateY) el.style.transform = `translateY(${translateY}px)`;
    if (translateX) el.style.transform = `translateX(${translateX}px)`;
  });

  // If stagger > 0, observe a common parent or animate all at once
  if (stagger > 0) {
    let triggered = false;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !triggered) {
          triggered = true;
          const animeProps = {
            targets: selector,
            opacity: [0, 1],
            duration,
            delay: anime.stagger(stagger, { start: delay }),
            easing
          };
          if (translateY) animeProps.translateY = [translateY, 0];
          if (translateX) animeProps.translateX = [translateX, 0];
          if (scale) animeProps.scale = [scale, 1];
          anime(animeProps);
          observer.disconnect();
        }
      });
    }, { threshold });

    // Observe first element as trigger
    if (elements[0]) observer.observe(elements[0]);
    return;
  }

  // Individual reveal for each element
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const animeProps = {
          targets: entry.target,
          opacity: [0, 1],
          duration,
          delay,
          easing
        };
        if (translateY) animeProps.translateY = [translateY, 0];
        if (translateX) animeProps.translateX = [translateX, 0];
        if (scale) animeProps.scale = [scale, 1];
        anime(animeProps);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold });

  elements.forEach(el => observer.observe(el));
};


/**
 * Lightweight infinite float for decorative elements
 */
export const initInfiniteFloat = (selector) => {
  anime({
    targets: selector,
    translateY: [-8, 8],
    easing: 'easeInOutSine',
    duration: 3000,
    direction: 'alternate',
    loop: true
  });
};


/**
 * Parallax effect on scroll — moves elements at different speeds
 */
export const initParallax = (elements) => {
  if (!elements || elements.length === 0) return () => {};

  let ticking = false;

  const update = () => {
    const scrollY = window.scrollY;
    elements.forEach(({ element, speed = 0.1 }) => {
      if (element) {
        const offset = scrollY * speed;
        element.style.transform = `translateY(${offset}px) translateZ(0)`;
      }
    });
    ticking = false;
  };

  const handleScroll = () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });

  return () => {
    window.removeEventListener('scroll', handleScroll);
  };
};
