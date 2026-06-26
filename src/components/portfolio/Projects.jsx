"use client";
import { useEffect, useRef } from 'react';
import { ArrowUpRight, Code, Globe, Star } from 'lucide-react';
import { initScrollAnimations } from '@/animations/scrollAnimations';
import { initTilt } from '@/animations/interactionEffects';

const Projects = () => {
    const cardRefs = useRef([]);

    useEffect(() => {
        // Staggered reveal
        initScrollAnimations('.project-card', {
            translateY: 60,
            duration: 900,
            stagger: 120,
            easing: 'cubicBezier(0.16, 1, 0.3, 1)',
        });

        // 3D tilt
        const cleanups = cardRefs.current
            .filter(Boolean)
            .map(el => initTilt(el, 3));

        return () => cleanups.forEach(fn => fn());
    }, []);

    const projects = [
        {
            title: "FluentFive AI",
            description: "An AI-powered language fluency trainer featuring live speech recognition, real-time pacing feedback, and personalized vocabulary upgrades.",
            impact: "Architected full-stack Next.js app with OpenRouter AI",
            tags: ["Next.js", "AI/OpenAI", "Web Speech API", "TailwindCSS"],
            link: "#", // Placeholder URL for FluentFive
            github: "https://github.com/Shaurxya/FluentFive", // Placeholder repo
            featured: true
        },
        {
            title: "HerbImmortal",
            description: "Full-stack platform preserving ancient medicinal knowledge through digital archiving and intelligent search.",
            impact: "Architected complete system from UI to DB",
            tags: ["React", "Node.js", "Express", "MongoDB"],
            link: "https://herbimmortal.org",
            github: "https://github.com/Shaurxya",
            featured: true
        },
        {
            title: "IICTDS Website 2026",
            description: "Professional portal for the International Conference on Computational Techniques in Data Science, featuring paper submissions and schedules.",
            impact: "Developed the 2026 conference platform",
            tags: ["Frontend", "Backend", "Full Stack"],
            link: "https://iictds.com/",
            github: "https://github.com/Shaurxya",
            featured: true
        },
        {
            title: "GreenTech Electrolytes",
            description: "Business website for an electrolytes manufacturing company, establishing a strong online presence.",
            impact: "Built complete website for business growth",
            tags: ["HTML", "CSS", "JavaScript"],
            link: "https://greentechelectrolytes.com/",
            github: "https://github.com/Shaurxya",
            featured: true
        },
        {
            title: "Season Clothing",
            description: "E-commerce platform for a premium clothing brand with product catalog, cart, and secure checkout.",
            impact: "Helped grow online business and sales",
            tags: ["React", "Node.js", "MongoDB", "Razorpay"],
            link: "https://seasonclothing.shop",
            github: "https://github.com/Shaurxya",
            featured: true
        }
    ];

    return (
        <section id="projects" className="relative overflow-hidden" style={{ paddingTop: 'var(--section-py)', paddingBottom: 'var(--section-py)' }}>
            {/* Ambient glows */}
            <div className="orb" style={{ width: '600px', height: '600px', background: 'rgba(255,69,58,0.04)', top: '10%', left: '-15%' }} />
            <div className="orb" style={{ width: '500px', height: '500px', background: 'rgba(0,255,213,0.03)', bottom: '10%', right: '-10%' }} />

            <div className="container">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
                    <div>
                        <div className="section-label">Portfolio</div>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold gradient-text mb-3 sm:mb-4">
                            Featured Projects
                        </h2>
                        <p className="text-[var(--text-secondary)] max-w-md text-base">
                            Scalable applications built with modern tech stacks, focusing on performance and user experience.
                        </p>
                    </div>
                    <a
                        href="https://github.com/Shaurxya"
                        target="_blank"
                        className="flex items-center gap-2 text-sm font-medium text-[var(--text-tertiary)] hover:text-white transition-colors duration-300 group"
                    >
                        View All Repos
                        <Code size={15} className="group-hover:text-white transition-colors" />
                    </a>
                </div>

                {/* Project Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project, i) => (
                        <div
                            key={i}
                            ref={el => cardRefs.current[i] = el}
                            className={`project-card group flex flex-col h-full rounded-2xl sm:rounded-3xl p-5 sm:p-7 border transition-all duration-500 relative overflow-hidden gradient-border cursor-default ${project.featured
                                ? 'bg-white/[0.04] border-[var(--accent-teal)]/20'
                                : 'bg-white/[0.02] border-white/[0.06]'
                                }`}
                            style={{
                                opacity: 0,
                                boxShadow: project.featured ? 'var(--shadow-glow-teal)' : 'var(--shadow-sm)',
                                transitionTimingFunction: 'var(--ease-out-expo)',
                            }}
                        >
                            {/* Top accent line */}
                            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[var(--accent-teal)]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            {/* Header */}
                            <div className="flex justify-between items-start mb-5">
                                <div className={`w-10 h-10 rounded-xl flex-center border transition-all duration-500 ${project.featured
                                    ? 'bg-[var(--accent-teal)]/15 border-[var(--accent-teal)]/30 text-[var(--accent-teal)]'
                                    : 'bg-white/5 border-white/8 text-[var(--text-tertiary)] group-hover:text-[var(--accent-teal)] group-hover:border-[var(--accent-teal)]/20'
                                    }`}>
                                    <Globe size={20} />
                                </div>
                                <div className="flex gap-2 relative z-20">
                                    <a href={project.github} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-white hover:bg-white/5 transition-all duration-300">
                                        <Code size={16} />
                                    </a>
                                    <a href={project.link} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--accent-teal)] hover:bg-white/5 transition-all duration-300">
                                        <ArrowUpRight size={16} />
                                    </a>
                                </div>
                            </div>

                            {/* Title & Description */}
                            <h3 className="text-xl font-bold text-white mb-2.5 group-hover:text-[var(--accent-teal)] transition-colors duration-500">
                                {project.title}
                            </h3>
                            <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-5 line-clamp-2 min-h-[40px]">
                                {project.description}
                            </p>

                            {/* Impact */}
                            <div className={`mb-5 px-3 py-2.5 rounded-xl border ${project.featured ? 'bg-[var(--accent-teal)]/5 border-[var(--accent-teal)]/10' : 'bg-white/[0.02] border-white/5'
                                }`}>
                                <p className="text-[11px] flex items-center gap-2 font-semibold text-[var(--accent-teal)]">
                                    <Star size={11} fill="currentColor" /> {project.impact}
                                </p>
                            </div>

                            {/* Tags & Buttons */}
                            <div className="mt-auto">
                                <div className="flex flex-wrap gap-1.5 mb-6">
                                    {project.tags.map((tag, j) => (
                                        <span key={j} className="text-[10px] font-semibold tracking-wider px-2.5 py-1 rounded-full bg-white/[0.04] text-[var(--text-tertiary)] border border-white/[0.06]">
                                            {tag}
                                        </span>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 relative z-20">
                                    <a
                                        href={project.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`h-9 flex-center rounded-xl text-xs font-semibold transition-all duration-300 ${project.featured
                                            ? 'bg-[var(--accent-teal)] text-black hover:bg-white'
                                            : 'bg-[var(--accent-teal)]/10 text-[var(--accent-teal)] hover:bg-[var(--accent-teal)] hover:text-black'
                                            }`}
                                        style={{ transitionTimingFunction: 'var(--ease-out-expo)' }}
                                    >
                                        Live Site
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Projects;
