"use client";
import { useEffect, useRef } from 'react';
import anime from 'animejs';
import { Code, Zap, Shield, TrendingUp, CheckCircle2 } from 'lucide-react';

const WhyChooseMe = () => {
    const containerRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    anime({
                        targets: '.why-card',
                        opacity: [0, 1],
                        translateY: [20, 0],
                        delay: anime.stagger(80),
                        duration: 500,
                        easing: 'cubicBezier(0.4, 0, 0.2, 1)'
                    });
                    observer.disconnect();
                }
            });
        }, { threshold: 0.1 });

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }
    }, []);

    const reasons = [
        {
            icon: Code,
            title: "Expert AI Website Developer",
            description: "Specialized in building intelligent web applications that leverage AI and machine learning to deliver exceptional user experiences and business value."
        },
        {
            icon: Zap,
            title: "Full Stack Expertise",
            description: "Proficient in React, Node.js, MongoDB, and Express - delivering end-to-end solutions from concept to deployment with modern web technologies."
        },
        {
            icon: Shield,
            title: "Proven Track Record",
            description: "Successfully delivered scalable web applications for clients across industries, from healthcare platforms to e-commerce solutions and business websites."
        },
        {
            icon: TrendingUp,
            title: "Performance-Driven Development",
            description: "Building fast, responsive, and SEO-optimized websites that rank well in search engines and convert visitors into customers."
        }
    ];

    const benefits = [
        "Custom AI-powered web solutions tailored to your business",
        "Modern, responsive designs that work seamlessly across all devices",
        "Clean, maintainable code following industry best practices",
        "Fast turnaround time without compromising on quality",
        "Ongoing support and maintenance for peace of mind"
    ];

    return (
        <section id="why-choose-me" className="py-24 relative overflow-hidden bg-gradient-to-b from-transparent to-black/30" ref={containerRef}>
            <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-accent-teal/5 blur-[120px] rounded-full -z-10"></div>

            <div className="container">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold mb-4 font-display">
                        Why Choose Me as Your <span className="text-accent-teal">AI Website Developer</span>
                    </h2>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                        Combining expertise in AI technologies with full stack development to create
                        intelligent, scalable web solutions that drive business growth.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 mb-12">
                    {reasons.map((reason, index) => (
                        <div
                            key={index}
                            className="why-card glass-card p-8 rounded-2xl hover:border-accent-teal/30 transition-all duration-300 group"
                            style={{ opacity: 0 }}
                        >
                            <div className="flex items-start gap-4">
                                <div className="w-14 h-14 rounded-xl bg-accent-teal/10 flex-center text-accent-teal group-hover:bg-accent-teal/20 transition-colors">
                                    <reason.icon size={28} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-white mb-3">{reason.title}</h3>
                                    <p className="text-gray-400 leading-relaxed">{reason.description}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="glass-card p-8 md:p-12 rounded-3xl max-w-4xl mx-auto">
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-6 text-center">
                        What You Get When Working With Me
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        {benefits.map((benefit, index) => (
                            <div key={index} className="flex items-start gap-3">
                                <CheckCircle2 size={24} className="text-accent-teal flex-shrink-0 mt-1" />
                                <p className="text-gray-300">{benefit}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default WhyChooseMe;
