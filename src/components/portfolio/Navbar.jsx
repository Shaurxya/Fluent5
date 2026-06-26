"use client";
import { useEffect, useRef, useState } from 'react';
import anime from 'animejs';
import { Menu, X, Code, Briefcase } from 'lucide-react';
import { initMagnetic } from '@/animations/interactionEffects';

const Navbar = () => {
    const navRef = useRef(null);
    const navItemsRef = useRef([]);
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const mobileMenuRef = useRef(null);
    const mobileItemsRef = useRef([]);

    // Dynamic navbar on scroll
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Entrance animation
    useEffect(() => {
        anime.timeline({ easing: 'cubicBezier(0.16, 1, 0.3, 1)' })
            .add({
                targets: navRef.current,
                opacity: [0, 1],
                translateY: [-30, 0],
                duration: 800,
                delay: 200
            })
            .add({
                targets: navItemsRef.current.filter(Boolean),
                opacity: [0, 1],
                translateY: [-10, 0],
                delay: anime.stagger(60),
                duration: 500,
            }, '-=400');
    }, []);

    // Magnetic effect on nav items
    useEffect(() => {
        const cleanups = navItemsRef.current
            .filter(Boolean)
            .map(el => initMagnetic(el, 0.2));

        return () => cleanups.forEach(fn => fn());
    }, []);

    // Mobile menu animation
    useEffect(() => {
        if (isOpen) {
            anime.timeline({ easing: 'cubicBezier(0.16, 1, 0.3, 1)' })
                .add({
                    targets: mobileMenuRef.current,
                    opacity: [0, 1],
                    translateY: [-15, 0],
                    duration: 400,
                    begin: () => {
                        if (mobileMenuRef.current) mobileMenuRef.current.style.display = 'block';
                    }
                })
                .add({
                    targets: mobileItemsRef.current.filter(Boolean),
                    opacity: [0, 1],
                    translateX: [-15, 0],
                    delay: anime.stagger(60),
                    duration: 400,
                }, '-=200');
        } else if (mobileMenuRef.current) {
            anime({
                targets: mobileMenuRef.current,
                opacity: [1, 0],
                translateY: [0, -10],
                duration: 250,
                easing: 'cubicBezier(0.16, 1, 0.3, 1)',
                complete: () => {
                    if (mobileMenuRef.current) mobileMenuRef.current.style.display = 'none';
                }
            });
        }
    }, [isOpen]);

    const navLinks = [
        { name: 'Tech Stack', link: '#techstack' },
        { name: 'Projects', link: '#projects' },
        { name: 'Experience', link: '#experience' },
        { name: 'Contact', link: '#contact' }
    ];

    return (
        <nav ref={navRef} className="fixed w-full z-50 top-0 px-4 md:px-0 pt-4" style={{ opacity: 0 }}>
            <div className="container mx-auto relative">
                <div
                    className={`flex-between px-6 md:px-8 py-3.5 rounded-2xl border transition-all duration-700 relative z-50 ${scrolled
                            ? 'bg-black/60 backdrop-blur-2xl border-white/8 shadow-lg'
                            : 'bg-white/[0.02] backdrop-blur-md border-white/[0.04]'
                        }`}
                    style={{ transitionTimingFunction: 'var(--ease-out-expo)' }}
                >
                    {/* Logo */}
                    <a href="/fluentfive" className="text-xl font-bold tracking-tight text-white font-display">
                        SHAURYA<span className="text-[var(--accent-teal)]">.</span>
                    </a>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex gap-1 items-center">
                        {navLinks.map((item, index) => (
                            <a
                                key={item.name}
                                href={item.link}
                                ref={el => navItemsRef.current[index] = el}
                                className="px-4 py-2 text-[13px] font-medium tracking-wide text-[var(--text-secondary)] hover:text-white transition-colors duration-300 rounded-lg"
                            >
                                {item.name}
                            </a>
                        ))}
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex gap-1">
                            <a
                                href="https://github.com/Shaurxya"
                                target="_blank"
                                className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-white hover:bg-white/5 transition-all duration-300"
                            >
                                <Code size={16} />
                            </a>
                            <a
                                href="https://www.linkedin.com/in/shaurxya/"
                                target="_blank"
                                className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-white hover:bg-white/5 transition-all duration-300"
                            >
                                <Briefcase size={16} />
                            </a>
                        </div>
                        <button
                            className="hover:text-white transition-colors block md:hidden p-1"
                            onClick={() => setIsOpen(!isOpen)}
                            aria-label="Toggle menu"
                        >
                            {isOpen ? <X size={22} /> : <Menu size={22} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                <div
                    ref={mobileMenuRef}
                    className="absolute top-full left-0 right-0 mt-2 mx-4 p-6 rounded-2xl bg-black/80 backdrop-blur-2xl border border-white/8 shadow-2xl md:hidden"
                    style={{ display: 'none', opacity: 0 }}
                >
                    <div className="flex flex-col gap-1">
                        {navLinks.map((item, index) => (
                            <a
                                key={item.name}
                                href={item.link}
                                ref={el => mobileItemsRef.current[index] = el}
                                onClick={() => setIsOpen(false)}
                                className="px-4 py-3 text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-all duration-300 rounded-xl text-base font-medium"
                            >
                                {item.name}
                            </a>
                        ))}

                        <div className="h-px bg-white/5 my-3" />

                        <div className="flex gap-3 px-4" ref={el => mobileItemsRef.current[navLinks.length] = el}>
                            <a href="https://github.com/Shaurxya" target="_blank" className="p-2.5 rounded-xl bg-white/5 text-[var(--text-tertiary)] hover:text-white transition-colors">
                                <Code size={18} />
                            </a>
                            <a href="https://www.linkedin.com/in/shaurxya/" target="_blank" className="p-2.5 rounded-xl bg-white/5 text-[var(--text-tertiary)] hover:text-white transition-colors">
                                <Briefcase size={18} />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
