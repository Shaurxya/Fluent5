"use client";
/**
 * Premium Interaction Effects
 * Magnetic buttons, 3D tilt cards, scroll reveal
 * Touch devices: magnetic + tilt are disabled automatically
 */

// Detect touch-only devices (no fine pointer = no mouse)
const isTouchDevice = () => {
  return window.matchMedia('(hover: none)').matches;
};

// ═══════════════════════════════
// MAGNETIC BUTTON EFFECT
// Button follows cursor when hovered
// ═══════════════════════════════
export const initMagnetic = (element, strength = 0.3) => {
  if (!element || isTouchDevice()) return () => {};

  const handleMove = (e) => {
    const rect = element.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    element.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
  };

  const handleLeave = () => {
    element.style.transform = 'translate(0, 0)';
    element.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
    setTimeout(() => {
      element.style.transition = '';
    }, 500);
  };

  const handleEnter = () => {
    element.style.transition = 'none';
  };

  element.addEventListener('mouseenter', handleEnter);
  element.addEventListener('mousemove', handleMove);
  element.addEventListener('mouseleave', handleLeave);

  // Cleanup function
  return () => {
    element.removeEventListener('mouseenter', handleEnter);
    element.removeEventListener('mousemove', handleMove);
    element.removeEventListener('mouseleave', handleLeave);
  };
};


// ═══════════════════════════════
// 3D TILT CARD EFFECT
// Cards subtly rotate toward cursor
// ═══════════════════════════════
export const initTilt = (element, maxDeg = 4) => {
  if (!element || isTouchDevice()) return () => {};

  const handleMove = (e) => {
    const rect = element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -maxDeg;
    const rotateY = ((x - centerX) / centerX) * maxDeg;

    element.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.01)`;
  };

  const handleLeave = () => {
    element.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)';
    element.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
    setTimeout(() => {
      element.style.transition = 'transform 0.15s ease-out';
    }, 600);
  };

  const handleEnter = () => {
    element.style.transition = 'transform 0.15s ease-out';
  };

  element.addEventListener('mouseenter', handleEnter);
  element.addEventListener('mousemove', handleMove);
  element.addEventListener('mouseleave', handleLeave);

  return () => {
    element.removeEventListener('mouseenter', handleEnter);
    element.removeEventListener('mousemove', handleMove);
    element.removeEventListener('mouseleave', handleLeave);
  };
};


// ═══════════════════════════════
// SCROLL REVEAL — CSS-based for performance
// Uses IntersectionObserver + CSS transitions
// ═══════════════════════════════
export const initReveal = (options = {}) => {
  const {
    selector = '.reveal',
    threshold = 0.15,
    rootMargin = '0px 0px -60px 0px'
  } = options;

  const elements = document.querySelectorAll(selector);

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold, rootMargin });

  elements.forEach(el => observer.observe(el));

  return () => {
    elements.forEach(el => observer.unobserve(el));
  };
};


// ═══════════════════════════════
// CURSOR GLOW — follows mouse
// ═══════════════════════════════
export const initCursorGlow = (element) => {
  if (!element) return () => {};

  let rafId = null;

  const handleMove = (e) => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      element.style.transform = `translate(${e.clientX - 300}px, ${e.clientY - 300}px)`;
      rafId = null;
    });
  };

  const handleLeave = () => {
    element.style.opacity = '0';
  };

  const handleEnter = () => {
    element.style.opacity = '1';
  };

  document.addEventListener('mousemove', handleMove, { passive: true });
  document.addEventListener('mouseleave', handleLeave);
  document.addEventListener('mouseenter', handleEnter);

  return () => {
    document.removeEventListener('mousemove', handleMove);
    document.removeEventListener('mouseleave', handleLeave);
    document.removeEventListener('mouseenter', handleEnter);
    if (rafId) cancelAnimationFrame(rafId);
  };
};


// ═══════════════════════════════
// SCROLL PROGRESS BAR
// ═══════════════════════════════
export const initScrollProgress = (element) => {
  if (!element) return () => {};

  let ticking = false;

  const update = () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? scrollTop / docHeight : 0;
    element.style.transform = `scaleX(${progress})`;
    ticking = false;
  };

  const handleScroll = () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  update();

  return () => {
    window.removeEventListener('scroll', handleScroll);
  };
};
