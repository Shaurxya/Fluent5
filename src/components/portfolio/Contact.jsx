"use client";
import { useEffect, useRef } from 'react';
import { Mail, Briefcase, Code, ArrowUpRight } from 'lucide-react';
import { initMagnetic } from '@/animations/interactionEffects';
import { initScrollAnimations } from '@/animations/scrollAnimations';

const Contact = () => {
    const linkRefs = useRef([]);

    useEffect(() => {
        initScrollAnimations('.contact-reveal', {
            translateY: 40,
            duration: 900,
            stagger: 100,
            easing: 'cubicBezier(0.16, 1, 0.3, 1)',
        });

        // Magnetic effect on social links
        const cleanups = linkRefs.current
            .filter(Boolean)
            .map(el => initMagnetic(el, 0.35));

        return () => cleanups.forEach(fn => fn());
    }, []);

    const socials = [
        {
            icon: Briefcase,
            label: 'LinkedIn',
            href: 'https://www.linkedin.com/in/shaurxya/',
            color: 'var(--accent-teal)',
        },
        {
            icon: Code,
            label: 'GitHub',
            href: 'https://github.com/Shaurxya',
            color: 'var(--text-primary)',
        },
        {
            icon: Mail,
            label: 'Email',
            href: 'mailto:shauryash017@proton.me',
            color: 'var(--accent-purple)',
        },
    ];

    return (
        <section id="contact" className="relative overflow-hidden" style={{ paddingTop: 'var(--section-py)', paddingBottom: '60px' }}>
            {/* Divider */}
            <div className="section-divider mb-20" />

            {/* Ambient background */}
            <div className="orb" style={{ width: '600px', height: '600px', background: 'rgba(0,255,213,0.04)', bottom: '-20%', left: '30%' }} />
            <div className="orb" style={{ width: '400px', height: '400px', background: 'rgba(94,92,230,0.04)', top: '10%', right: '-10%' }} />

            <div className="container flex flex-col items-center text-center">
                {/* Fluent Five CTA Banner */}
                <div className="contact-reveal w-full max-w-4xl mb-32 p-8 sm:p-12 rounded-3xl border border-[var(--accent-teal)]/20 bg-gradient-to-b from-[var(--accent-teal)]/10 to-transparent relative overflow-hidden" style={{ opacity: 0 }}>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-[var(--accent-teal)] to-transparent opacity-50" />
                    
                    <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
                        Want to test my AI engineering skills?
                    </h3>
                    <p className="text-[var(--text-secondary)] text-base sm:text-lg mb-8 max-w-2xl mx-auto">
                        Try <strong className="text-[var(--accent-teal)]">FluentFive</strong> live right now. It's an interactive speaking trainer powered by Next.js, Web Speech API, and OpenRouter AI.
                    </p>
                    <a
                        href="/fluentfive"
                        className="inline-flex items-center gap-2 h-12 sm:h-14 px-8 sm:px-10 rounded-xl bg-[var(--accent-teal)] text-black font-bold text-sm sm:text-base tracking-wide hover:bg-white transition-all duration-300 hover:scale-105 shadow-[0_0_30px_rgba(0,255,213,0.3)]"
                    >
                        Launch FluentFive <ArrowUpRight size={18} />
                    </a>
                </div>

                <div className="contact-reveal section-label" style={{ opacity: 0 }}>Get in Touch</div>

                <h2 className="contact-reveal text-3xl sm:text-4xl md:text-6xl font-bold gradient-text mb-4 max-w-2xl" style={{ opacity: 0 }}>
                    Let's build something great together
                </h2>

                <p className="contact-reveal text-[var(--text-secondary)] text-base sm:text-lg mb-8 sm:mb-12 max-w-md px-2" style={{ opacity: 0 }}>
                    I'm always open to discussing new projects, creative ideas, or opportunities.
                </p>

                {/* Social Links */}
                <div className="contact-reveal flex gap-4 sm:gap-5 mb-10 sm:mb-16" style={{ opacity: 0 }}>
                    {socials.map((social, i) => (
                        <a
                            key={i}
                            href={social.href}
                            target={social.href.startsWith('mailto') ? undefined : '_blank'}
                            ref={el => linkRefs.current[i] = el}
                            className="group relative p-4 sm:p-5 rounded-2xl glass-card magnetic flex flex-col items-center gap-2 transition-all duration-500 hover:border-white/15"
                            style={{ transitionTimingFunction: 'var(--ease-out-expo)' }}
                        >
                            <social.icon size={24} style={{ color: social.color }} />
                            <span className="text-[10px] font-semibold tracking-wider text-[var(--text-tertiary)] group-hover:text-white transition-colors uppercase">
                                {social.label}
                            </span>
                        </a>
                    ))}
                </div>

                {/* Email CTA */}
                <a
                    href="mailto:shauryash017@proton.me"
                    className="contact-reveal inline-flex items-center gap-2 text-sm text-[var(--text-tertiary)] hover:text-[var(--accent-teal)] transition-colors duration-300 mb-20"
                    style={{ opacity: 0 }}
                >
                    shauryash017@proton.me
                    <ArrowUpRight size={14} />
                </a>
            </div>
        </section>
    );
};

export default Contact;
