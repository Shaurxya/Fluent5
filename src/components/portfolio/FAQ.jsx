"use client";
import { useState, useEffect, useRef } from 'react';
import anime from 'animejs';
import { ChevronDown } from 'lucide-react';

const FAQ = () => {
    const [openIndex, setOpenIndex] = useState(null);
    const containerRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    anime({
                        targets: '.faq-item',
                        opacity: [0, 1],
                        translateY: [15, 0],
                        delay: anime.stagger(60),
                        duration: 400,
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

    const faqs = [
        {
            question: "What makes you different as an AI Website Developer?",
            answer: "I specialize in integrating AI and machine learning capabilities into web applications, creating intelligent features like personalized recommendations, automated workflows, and data-driven insights. Combined with full stack expertise in React and Node.js, I deliver modern web solutions that are both powerful and user-friendly."
        },
        {
            question: "What technologies do you use for full stack development?",
            answer: "I primarily work with the MERN stack (MongoDB, Express.js, React, Node.js) for full stack development. I also have expertise in AI/ML frameworks, cloud platforms (AWS, Google Cloud), and modern tools like Next.js, Tailwind CSS, and various databases including PostgreSQL and Firebase."
        },
        {
            question: "Can you build both simple websites and complex web applications?",
            answer: "Absolutely! I've built everything from business websites and landing pages to complex full-stack applications with user authentication, real-time features, payment integration, and AI-powered functionalities. Whether you need a simple professional website or a sophisticated web application, I can deliver."
        },
        {
            question: "How long does it take to build a website or web application?",
            answer: "Timeline depends on project complexity. A simple business website typically takes 1-2 weeks, while a full-stack application with custom features can take 4-8 weeks. I always provide a detailed timeline during the initial consultation based on your specific requirements."
        },
        {
            question: "Do you provide ongoing support after the website is launched?",
            answer: "Yes! I offer ongoing maintenance and support packages to ensure your website stays updated, secure, and performing optimally. This includes bug fixes, security updates, content updates, and feature enhancements as needed."
        },
        {
            question: "How do you ensure the website is SEO-optimized?",
            answer: "SEO is built into my development process from the start. I implement technical SEO best practices including semantic HTML, meta tags, structured data, fast loading speeds, mobile responsiveness, and clean URL structures. I also optimize images, implement proper heading hierarchies, and ensure the site is easily crawlable by search engines."
        },
        {
            question: "Can you help migrate an existing website to modern technologies?",
            answer: "Yes, I can help migrate legacy websites to modern frameworks like React or Next.js. This includes preserving SEO rankings, migrating existing content, improving performance, and adding new features while maintaining a smooth transition with minimal downtime."
        },
        {
            question: "What is your development process?",
            answer: "My process includes: 1) Initial consultation to understand your requirements, 2) Planning and wireframing, 3) Design approval, 4) Development with regular updates, 5) Testing and quality assurance, 6) Deployment and training, 7) Post-launch support. You'll be involved throughout with clear communication at every stage."
        }
    ];

    const toggleFAQ = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <section id="faq" className="py-24 relative overflow-hidden" ref={containerRef}>
            <div className="absolute bottom-[20%] left-[-10%] w-[500px] h-[500px] bg-accent-red/5 blur-[120px] rounded-full -z-10"></div>

            <div className="container max-w-4xl">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold mb-4 font-display">
                        Frequently Asked <span className="text-accent-teal">Questions</span>
                    </h2>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                        Common questions about AI website development, full stack services, and working together.
                    </p>
                </div>

                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <div
                            key={index}
                            className="faq-item glass-card rounded-2xl overflow-hidden transition-all duration-300 hover:border-accent-teal/30"
                            style={{ opacity: 0 }}
                        >
                            <button
                                onClick={() => toggleFAQ(index)}
                                className="w-full p-6 flex items-center justify-between text-left gap-4 group"
                                aria-expanded={openIndex === index}
                            >
                                <h3 className="text-lg md:text-xl font-semibold text-white group-hover:text-accent-teal transition-colors">
                                    {faq.question}
                                </h3>
                                <ChevronDown
                                    size={24}
                                    className={`text-accent-teal flex-shrink-0 transition-transform duration-300 ${openIndex === index ? 'rotate-180' : ''
                                        }`}
                                />
                            </button>

                            <div
                                className={`transition-all duration-300 ease-in-out ${openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                                    }`}
                                style={{ overflow: 'hidden' }}
                            >
                                <div className="px-6 pb-6 text-gray-300 leading-relaxed">
                                    {faq.answer}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-12 text-center">
                    <p className="text-gray-400 mb-4">Still have questions?</p>
                    <a
                        href="#contact"
                        className="inline-flex items-center gap-2 px-8 py-3 bg-accent-teal text-black font-semibold rounded-full hover:bg-accent-teal/90 transition-colors"
                    >
                        Get in Touch
                    </a>
                </div>
            </div>
        </section>
    );
};

export default FAQ;
