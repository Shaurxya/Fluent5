"use client";
import Image from 'next/image';
import { useRef, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { initHeroAnimations } from '@/animations/heroAnimations';
import { initMagnetic, initTilt } from '@/animations/interactionEffects';

const Hero = () => {
    const orbRef = useRef(null);
    const containerRef = useRef(null);
    const avatarRefs = useRef([]);
    const ctaButtonRef = useRef(null);
    const secondaryBtnRef = useRef(null);
    const imageRef = useRef(null);

    useEffect(() => {
        initHeroAnimations({
            orbRef,
            avatarRefs,
            buttonRef: ctaButtonRef
        });

        // Magnetic effect on buttons
        const cleanups = [
            initMagnetic(ctaButtonRef.current, 0.25),
            initMagnetic(secondaryBtnRef.current, 0.2),
            initTilt(imageRef.current, 8)
        ];

        return () => cleanups.forEach(fn => fn());
    }, []);

    return (
        <section ref={containerRef} className="relative min-h-[100dvh] flex items-center pt-24 md:pt-28 pb-10 md:pb-16 overflow-hidden">
            {/* Background Orbs */}
            <div ref={orbRef} className="orb" style={{ width: '500px', height: '500px', background: 'rgba(0, 255, 213, 0.08)', top: '10%', left: '-5%' }} />
            <div className="orb" style={{ width: '400px', height: '400px', background: 'rgba(94, 92, 230, 0.06)', bottom: '0%', right: '-5%' }} />
            <div className="orb" style={{ width: '300px', height: '300px', background: 'rgba(191, 90, 242, 0.04)', top: '50%', left: '50%' }} />

            <div className="container grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center relative z-10">

                {/* Left: Content */}
                <div className="hero-content text-center md:text-left" style={{ opacity: 0 }}>

                    <div className="stagger-elm section-label justify-center md:justify-start" style={{ opacity: 0 }}>
                        AI-Powered Development
                    </div>

                    <h1 className="stagger-elm text-[clamp(2.5rem,6vw,4.5rem)] font-extrabold tracking-tight leading-[1.05] mb-6" style={{ opacity: 0 }}>
                        <span className="gradient-text">Building the</span>
                        <br />
                        <span className="gradient-text">future of </span>
                        <span className="gradient-text-accent">the web</span>
                    </h1>

                    <div className="stagger-elm" style={{ opacity: 0 }}>
                        <p className="text-[var(--text-secondary)] text-lg md:text-xl max-w-lg mx-auto md:mx-0 leading-relaxed mb-2">
                            Full Stack Developer & AI specialist crafting
                            <strong className="text-white font-medium"> intelligent, scalable</strong> digital experiences.
                        </p>
                        <p className="text-[var(--text-tertiary)] text-sm md:text-base max-w-md mx-auto md:mx-0">
                            B.Tech CSE (Data Science) · React · Node.js · Cloud
                        </p>
                    </div>

                    <div className="stagger-elm flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center md:justify-start pt-6 md:pt-8" style={{ opacity: 0 }}>
                        <a
                            href="#projects"
                            ref={ctaButtonRef}
                            className="btn-primary magnetic"
                        >
                            <span>View Projects</span>
                            <ArrowRight size={18} />
                        </a>
                        <a
                            href="#contact"
                            ref={secondaryBtnRef}
                            className="btn-secondary magnetic"
                        >
                            Get in Touch
                        </a>
                    </div>
                </div>

                {/* Right: Visual */}
                <div className="hero-visual relative flex-center order-first md:order-last" style={{ opacity: 0, minHeight: '320px' }}>
                    {/* Min height scales on desktop */}
                    <style>{`
                        @media (min-width: 768px) {
                            .hero-visual { min-height: 480px !important; }
                        }
                    `}</style>

                    {/* Concentric Rings */}
                    <div className="absolute inset-0 flex-center pointer-events-none">
                        <svg width="500" height="500" viewBox="0 0 500 500" className="opacity-[0.08]" style={{ animation: 'spin 60s linear infinite' }}>
                            <circle cx="250" cy="250" r="80" fill="none" stroke="white" strokeWidth="0.5" />
                            <circle cx="250" cy="250" r="140" fill="none" stroke="white" strokeWidth="0.5" strokeDasharray="4 8" />
                            <circle cx="250" cy="250" r="200" fill="none" stroke="white" strokeWidth="0.5" />
                            <circle cx="250" cy="250" r="240" fill="none" stroke="white" strokeWidth="0.5" strokeDasharray="2 12" />
                        </svg>
                    </div>

                    {/* Profile Image */}
                    <div ref={imageRef} className="relative z-20 flex flex-col items-center gap-6" style={{ perspective: '800px' }}>
                        <div className="w-56 h-56 sm:w-72 sm:h-72 md:w-80 md:h-80 rounded-[2rem] p-[2px] bg-gradient-to-br from-[var(--accent-teal)] via-[var(--accent-blue)] to-[var(--accent-purple)]" style={{ boxShadow: '0 0 60px rgba(0,255,213,0.15), 0 0 120px rgba(0,255,213,0.05)' }}>
                            <div className="w-full h-full rounded-[1.9rem] bg-[var(--bg-primary)] p-1">
                                <Image
                                    width={320} height={320}
                                    src="/shaurya.png"
                                    alt="Shaurya Sharma - AI Website Developer"
                                    className="w-full h-full rounded-[1.7rem] object-cover"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Floating Skill Badges */}
                    {[
                        { label: 'AI', color: 'var(--accent-teal)', top: '15%', left: '70%', mobileLeft: '75%', size: 'w-10 h-10 sm:w-12 sm:h-12' },
                        { label: 'ML', color: 'var(--accent-purple)', top: '5%', left: '25%', mobileLeft: '15%', size: 'w-11 h-11 sm:w-14 sm:h-14' },
                        { label: 'Full Stack', color: 'var(--accent-orange)', bottom: '18%', right: '10%', mobileRight: '5%', size: 'w-14 h-14 sm:w-16 sm:h-16' },
                        { label: 'Cloud', color: 'var(--accent-teal)', bottom: '8%', left: '5%', mobileLeft: '2%', size: 'w-14 h-14 sm:w-[72px] sm:h-[72px]' },
                    ].map((badge, i) => (
                        <div
                            key={i}
                            ref={el => avatarRefs.current[i] = el}
                            className={`absolute ${badge.size} rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl z-20 flex-center text-[9px] sm:text-[10px] font-bold tracking-wide text-center p-1`}
                            style={{
                                ...Object.fromEntries(Object.entries(badge).filter(([k]) => ['top', 'bottom', 'left', 'right'].includes(k))),
                                color: badge.color,
                                boxShadow: `0 4px 20px rgba(0,0,0,0.4)`,
                            }}
                        >
                            {badge.label}
                        </div>
                    ))}

                    {/* Decorative dots */}
                    <div ref={el => avatarRefs.current[4] = el} className="absolute w-3 h-3 rounded-full" style={{ background: 'var(--accent-teal)', top: '22%', right: '25%', opacity: 0.4, filter: 'blur(1px)' }} />
                    <div className="absolute w-2 h-2 rounded-full" style={{ background: 'var(--accent-purple)', bottom: '30%', left: '18%', opacity: 0.3, filter: 'blur(1px)' }} />
                </div>
            </div>

            {/* Scroll Indicator — desktop only */}
            <div className="hidden md:flex absolute bottom-8 left-1/2 -translate-x-1/2 flex-col items-center gap-2 opacity-40">
                <div className="w-5 h-8 rounded-full border border-white/20 flex justify-center pt-1.5">
                    <div className="w-1 h-2 rounded-full bg-white/40" style={{ animation: 'scrollPulse 2s ease-in-out infinite' }} />
                </div>
            </div>

            <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes scrollPulse {
          0%, 100% { opacity: 1; transform: translateY(0); }
          50% { opacity: 0.3; transform: translateY(6px); }
        }
      `}</style>
        </section>
    );
};

export default Hero;
