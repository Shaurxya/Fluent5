"use client";
import { useEffect, useRef } from 'react';
import { Layers, Database, Cpu, Globe } from 'lucide-react';
import { initScrollAnimations } from '@/animations/scrollAnimations';
import { initTilt } from '@/animations/interactionEffects';

const TechStack = () => {
    const cardRefs = useRef([]);

    useEffect(() => {
        // Staggered card reveal on scroll
        initScrollAnimations('.tech-card', {
            translateY: 50,
            duration: 900,
            stagger: 100,
            easing: 'cubicBezier(0.16, 1, 0.3, 1)',
        });

        // List items stagger when first card is visible
        initScrollAnimations('.tech-item', {
            translateY: 15,
            duration: 600,
            stagger: 30,
            delay: 200,
        });

        // 3D tilt on cards
        const cleanups = cardRefs.current
            .filter(Boolean)
            .map(el => initTilt(el, 3));

        return () => cleanups.forEach(fn => fn());
    }, []);

    const categories = [
        {
            title: "Frontend",
            icon: Layers,
            color: "var(--accent-teal)",
            skills: ["React.js", "Next.js", "Tailwind CSS"]
        },
        {
            title: "Backend",
            icon: Globe,
            color: "#5e9eff",
            skills: ["Node.js", "Express"]
        },
        {
            title: "Database & AI/ML",
            icon: Database,
            color: "var(--accent-orange)",
            skills: ["MongoDB", "TensorFlow", "OpenAI API"]
        },
        {
            title: "Cloud",
            icon: Cpu,
            color: "var(--accent-purple)",
            skills: ["AWS", "Google Cloud"]
        }
    ];

    return (
        <section id="techstack" className="relative" style={{ paddingTop: 'var(--section-py)', paddingBottom: 'var(--section-py)' }}>
            {/* Divider */}
            <div className="section-divider mb-20" />

            <div className="container">
                <div className="text-center mb-16">
                    <div className="section-label justify-center">Technologies</div>
                    <h2 className="text-4xl md:text-5xl font-bold gradient-text">
                        Tools I Work With
                    </h2>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {categories.map((cat, i) => (
                        <div
                            key={i}
                            ref={el => cardRefs.current[i] = el}
                            className="tech-card glass-card p-6 sm:p-8 rounded-2xl sm:rounded-3xl flex flex-col group gradient-border cursor-default"
                            style={{ opacity: 0 }}
                        >
                            <div
                                className="w-11 h-11 rounded-xl flex-center mb-6 transition-transform duration-500"
                                style={{ background: `${cat.color}15`, color: cat.color }}
                            >
                                <cat.icon size={22} />
                            </div>

                            <h3 className="text-lg font-bold mb-5 text-white">{cat.title}</h3>

                            <ul className="space-y-3 mt-auto">
                                {cat.skills.map((skill, j) => (
                                    <li
                                        key={j}
                                        className="tech-item flex items-center gap-3 text-[var(--text-secondary)] text-sm font-medium"
                                        style={{ opacity: 0 }}
                                    >
                                        <div className="w-1 h-1 rounded-full" style={{ background: cat.color }} />
                                        {skill}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default TechStack;
