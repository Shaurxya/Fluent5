"use client";
import { useEffect } from 'react';
import { Calendar, MapPin, Building2, ChevronRight, Globe } from 'lucide-react';
import { initScrollAnimations } from '@/animations/scrollAnimations';

const Experience = () => {
    useEffect(() => {
        initScrollAnimations('.experience-card', {
            translateX: -40,
            translateY: 0,
            duration: 900,
            stagger: 150,
            easing: 'cubicBezier(0.16, 1, 0.3, 1)',
        });
    }, []);

    const experiences = [
        {
            company: "HerbImmortal",
            location: "Canada (Remote)",
            role: "Open Source Contributor",
            duration: "2024 - Present",
            website: "https://herbimmortal.org",
            description: [
                "Spearheaded the end-to-end development of the HerbImmortal digital platform, preserving ancient medicinal knowledge.",
                "Architected and built the full-stack application from scratch, ensuring scalable performance and security.",
                "Designed and implemented the complete UI/UX, with a modern, accessible interface.",
                "Developed robust backend APIs for complex data relationships and user interactions.",
                "Managed the entire system lifecycle from requirement gathering to deployment."
            ],
            skills: ["Full Stack Engineering", "System Architecture", "React", "Node.js", "UI/UX Design"]
        },
        {
            company: "Indian Institute of Information Technology Una",
            location: "Una, Himachal Pradesh, India",
            role: "Research Intern",
            duration: "Jun 2024 - Jul 2024",
            description: [
                "Worked on transfer learning–based image classification using pre-trained CNN models.",
                "Implemented and compared VGG16, ResNet-50, MobileNetV3, and EfficientNet using TensorFlow/Keras.",
                "Performed data preprocessing and augmentation to improve model generalization.",
                "Evaluated models using accuracy, loss curves, and confusion matrices.",
                "Documented findings in a detailed research report under faculty supervision."
            ],
            skills: ["Python", "TensorFlow", "Keras", "CNNs", "Transfer Learning"]
        }
    ];

    return (
        <section id="experience" className="relative overflow-hidden" style={{ paddingTop: 'var(--section-py)', paddingBottom: 'var(--section-py)' }}>
            {/* Divider */}
            <div className="section-divider mb-20" />

            {/* Ambient glow */}
            <div className="orb" style={{ width: '500px', height: '500px', background: 'rgba(0,255,213,0.04)', top: '30%', left: '-15%' }} />

            <div className="container">
                <div className="text-center mb-16">
                    <div className="section-label justify-center">Career</div>
                    <h2 className="text-4xl md:text-5xl font-bold gradient-text">
                        Professional Experience
                    </h2>
                </div>

                <div className="relative space-y-8 max-w-4xl mx-auto">
                    {/* Timeline line */}
                    <div className="absolute left-[19px] top-6 bottom-6 w-px bg-gradient-to-b from-[var(--accent-teal)]/30 via-[var(--accent-teal)]/10 to-transparent hidden md:block" />

                    {experiences.map((exp, i) => (
                        <div key={i} className="experience-card relative grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 md:gap-10 items-start" style={{ opacity: 0 }}>

                            {/* Timeline dot */}
                            <div className="hidden md:flex flex-col items-center mt-3 z-10">
                                <div className="w-10 h-10 rounded-full bg-[var(--bg-primary)] border border-[var(--accent-teal)]/40 flex-center" style={{ boxShadow: '0 0 20px rgba(0,255,213,0.15)' }}>
                                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent-teal)]" />
                                </div>
                            </div>

                            {/* Card */}
                            <div className="glass-card p-5 sm:p-7 md:p-9 rounded-2xl sm:rounded-3xl border-l-2 border-l-[var(--accent-teal)]/50 w-full group" style={{ transitionTimingFunction: 'var(--ease-out-expo)' }}>
                                <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-5 sm:gap-7">

                                    {/* Left: Meta */}
                                    <div className="flex flex-col gap-3 border-b lg:border-b-0 lg:border-r border-white/[0.06] pb-5 lg:pb-0 lg:pr-6">
                                        <div>
                                            <h3 className="text-xl font-bold text-white mb-1.5">{exp.role}</h3>
                                            <div className="flex items-center gap-2 text-[var(--accent-teal)] font-medium text-sm mb-1">
                                                <Building2 size={14} />
                                                <span>{exp.company}</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 text-[var(--text-tertiary)] text-xs mt-auto">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={12} />
                                                <span>{exp.duration}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <MapPin size={12} />
                                                <span>{exp.location}</span>
                                            </div>
                                        </div>

                                        {exp.website && (
                                            <a
                                                href={exp.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-3 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--accent-teal)]/8 text-[var(--accent-teal)] text-xs font-semibold hover:bg-[var(--accent-teal)] hover:text-black transition-all duration-300 w-fit"
                                                style={{ transitionTimingFunction: 'var(--ease-out-expo)' }}
                                            >
                                                <Globe size={12} />
                                                Visit Website
                                            </a>
                                        )}
                                    </div>

                                    {/* Right: Details */}
                                    <div>
                                        <h4 className="text-[var(--text-secondary)] font-semibold text-sm mb-4">Key Contributions</h4>
                                        <ul className="space-y-2.5 mb-7">
                                            {exp.description.map((item, idx) => (
                                                <li key={idx} className="flex items-start gap-2.5 text-[var(--text-secondary)] text-sm leading-relaxed">
                                                    <ChevronRight size={14} className="mt-0.5 text-[var(--accent-teal)] shrink-0" />
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        <div className="flex flex-wrap gap-1.5">
                                            {exp.skills.map((skill, j) => (
                                                <span key={j} className="text-[10px] font-semibold tracking-wider px-3 py-1.5 rounded-full bg-[var(--accent-teal)]/8 text-[var(--accent-teal)] border border-[var(--accent-teal)]/15">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Experience;
