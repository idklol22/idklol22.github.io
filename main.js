// ============================================
// THEME MANAGER — Light / Dark toggle
// ============================================
class ThemeManager {
    constructor() {
        this.toggle = document.getElementById('theme-toggle');
        this.toggleMobile = document.getElementById('theme-toggle-mobile');
        this.modeIcon = document.getElementById('mode-icon');
        this.modeIconMobile = document.getElementById('mode-icon-mobile');
        this.init();
    }

    init() {
        const saved = localStorage.getItem('theme');
        this.setTheme(saved || 'light');

        this.toggle?.addEventListener('click', () => this.flip());
        this.toggleMobile?.addEventListener('click', () => this.flip());
    }

    flip() {
        const current = document.documentElement.getAttribute('data-theme');
        this.setTheme(current === 'dark' ? 'light' : 'dark');
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);

        const icon = theme === 'light' ? '☽' : '☀';
        if (this.modeIcon) this.modeIcon.textContent = icon;
        if (this.modeIconMobile) this.modeIconMobile.textContent = icon;
    }
}

// ============================================
// MOBILE MENU
// ============================================
class MobileMenu {
    constructor() {
        this.hamburger = document.getElementById('hamburger');
        this.menu = document.getElementById('mobile-menu');
        this.overlay = document.getElementById('mobile-overlay');
        this.links = document.querySelectorAll('.mobile-nav-link');
        this.isOpen = false;

        if (this.hamburger && this.menu) this.init();
    }

    init() {
        this.hamburger.addEventListener('click', () => this.toggle());
        this.overlay?.addEventListener('click', () => this.close());

        this.links.forEach(link => {
            link.addEventListener('click', () => this.close());
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) this.close();
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 860 && this.isOpen) this.close();
        });
    }

    toggle() { this.isOpen ? this.close() : this.open(); }

    open() {
        this.isOpen = true;
        this.hamburger.classList.add('active');
        this.menu.classList.add('active');
        this.overlay?.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    close() {
        this.isOpen = false;
        this.hamburger.classList.remove('active');
        this.menu.classList.remove('active');
        this.overlay?.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ============================================
// TAGLINE TYPING
// ============================================
class TaglineTyping {
    constructor() {
        this.element = document.getElementById('tagline');
        this.text = 'Building Intelligent Systems';

        if (this.element) this.init();
    }

    init() {
        this.element.textContent = '';
        setTimeout(() => this.type(), 500);
    }

    type() {
        let i = 0;
        const tick = () => {
            if (i < this.text.length) {
                this.element.textContent += this.text.charAt(i);
                i++;
                setTimeout(tick, 40 + Math.random() * 30);
            } else {
                this.element.setAttribute('data-text', this.text);
                this.element.classList.add('glitch');
                if (window.nameGlitchInstance) {
                    window.nameGlitchInstance.initHoverGlitch(this.element);
                }
            }
        };
        tick();
    }
}

// ============================================
// NAME GLITCH (periodic micro-glitch)
// ============================================
class NameGlitch {
    constructor() {
        this.elements = document.querySelectorAll('.glitch');
        this.chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&';
        this.elements.forEach(el => this.initHoverGlitch(el));
        window.nameGlitchInstance = this;
    }

    initHoverGlitch(el) {
        const originalText = el.getAttribute('data-text');
        if (!originalText) return;

        let interval;
        el.addEventListener('mouseenter', () => {
            interval = setInterval(() => {
                const pos = Math.floor(Math.random() * (originalText.length - 2));
                const glitched = originalText.split('').map((c, i) => {
                    if (c === ' ' || c === '_') return c;
                    if (i >= pos && i < pos + 2 + Math.floor(Math.random() * 2)) {
                        return this.chars[Math.floor(Math.random() * this.chars.length)];
                    }
                    return c;
                }).join('');

                el.textContent = glitched;
            }, 60);
        });

        el.addEventListener('mouseleave', () => {
            clearInterval(interval);
            el.textContent = originalText;
        });
    }
}

// ============================================
// NAVIGATION — Active link on scroll
// ============================================
class Navigation {
    constructor() {
        this.desktopLinks = document.querySelectorAll('.nav-link');
        this.sections = document.querySelectorAll('.section[id]');
        this.init();
    }

    init() {
        // Smooth scroll for nav links
        const allLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
        allLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href?.startsWith('#')) {
                    e.preventDefault();
                    const target = document.querySelector(href);
                    if (target) {
                        const offset = 80;
                        const y = target.getBoundingClientRect().top + window.pageYOffset - offset;
                        window.scrollTo({ top: y, behavior: 'smooth' });
                    }
                }
            });
        });

        // Active section tracking
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.setActive(entry.target.getAttribute('id'));
                }
            });
        }, {
            threshold: 0.15,
            rootMargin: '-80px 0px -50% 0px'
        });

        this.sections.forEach(section => observer.observe(section));
    }

    setActive(id) {
        this.desktopLinks.forEach(link => {
            const href = link.getAttribute('href');
            link.classList.toggle('active', href === `#${id}`);
        });
    }
}

// ============================================
// SCROLL REVEAL
// ============================================
class ScrollReveal {
    constructor() {
        this.sections = document.querySelectorAll('.section');
        if (this.sections.length) this.init();
    }

    init() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.06,
            rootMargin: '0px 0px -40px 0px'
        });

        this.sections.forEach(section => observer.observe(section));
    }
}

// ============================================
// KEYBOARD NAV (j/k to scroll sections)
// ============================================
class KeyboardNav {
    constructor() {
        this.sections = Array.from(document.querySelectorAll('.section[id]'));
        this.currentIndex = 0;
        this.init();
    }

    init() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.currentIndex = this.sections.indexOf(entry.target);
                }
            });
        }, { threshold: 0.5 });

        this.sections.forEach(s => observer.observe(s));

        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (document.querySelector('.scraper-overlay.active')) return;
            if (document.querySelector('.mobile-menu.active')) return;

            if (e.key === 'ArrowDown' || e.key === 'j') {
                e.preventDefault();
                this.navigate(1);
            } else if (e.key === 'ArrowUp' || e.key === 'k') {
                e.preventDefault();
                this.navigate(-1);
            }
        });
    }

    navigate(dir) {
        const idx = Math.max(0, Math.min(this.sections.length - 1, this.currentIndex + dir));
        const section = this.sections[idx];
        if (section) {
            const y = section.getBoundingClientRect().top + window.pageYOffset - 80;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    }
}

// ============================================
// SCRAPER / LLM MODE
// ============================================
class ScraperMode {
    constructor() {
        this.btn = document.getElementById('scraper-btn');
        this.btnMobile = document.getElementById('scraper-btn-mobile');
        this.overlay = document.getElementById('scraper-overlay');
        this.content = document.getElementById('scraper-content');
        this.copyBtn = document.getElementById('scraper-copy');
        this.closeBtn = document.getElementById('scraper-close');

        if (this.overlay) this.init();
    }

    init() {
        this.btn?.addEventListener('click', () => this.open());
        this.btnMobile?.addEventListener('click', () => this.open());
        this.closeBtn?.addEventListener('click', () => this.close());
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
        });
        this.copyBtn?.addEventListener('click', () => this.copy());

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.overlay.classList.contains('active')) {
                this.close();
            }
        });
    }

    generateText() {
        return `# Sanjam Wadhwa
Undergraduate CS Student | ML Researcher
Thapar Institute of Engineering & Technology
Email: swadhwa.be24@thapar.edu
GitHub: https://github.com/idklol22
LinkedIn: https://www.linkedin.com/in/sanjam-wadhwa-853985334/
Kaggle: https://www.kaggle.com/sanjamw

## About
I'm Sanjam Wadhwa, an undergraduate student studying Computer Science at Thapar Institute of Engineering & Technology. I'm curious about how complex systems work and enjoy learning by exploring challenging ideas and problems. As a student, I value asking good questions, building strong fundamentals, and gradually developing a deeper understanding through coursework, reading, and projects.

I'm interested in growing as a researcher and learner, and I'm motivated by environments that encourage thoughtful exploration, collaboration, and long-term learning.

## Research Interests
- Machine Learning (ML)
- Reinforcement Learning (RL)
- Model Interpretability and Reliability
- Deep Learning (DL)
- Natural Language Processing (NLP)

## Publications

1. "From Signals to Patterns: Non-Invasive Tuberculosis Detection from Cough Audio using Bandit Weighted Hyperbolic Prototypes"
   - Venue: INTERSPEECH 2026 (Main Conference) — ACCEPTED
   - Authors: MM Akhtar, Girish, Sanjam Wadhwa, Muskaan Singh
   - Topics: Healthcare AI, Audio Analysis, Prototype Networks

2. "Less is More in Kolmogorov-Arnold Networks: The Shared-Atom Architecture"
   - Venue: COLORAI @ ICML 2026 — ACCEPTED
   - Authors: Sanjam Wadhwa, Hrideya Sharma, Shashank Singh, Saurabh Sharma
   - Topics: KAN, Deep Learning, Network Architecture

3. "Early-Stage Diabetes Prediction using Stacked Learning"
   - Venue: ComputingCon 2025 — ACCEPTED
   - Mentor: Prof. Rinkle Rani, CSE Dept, TIET
   - Topics: Healthcare ML, Ensemble Learning, Classification

## Projects

1. CurveLABS — MLP Visualizer for Hand-Drawn Curves
   - Browser-based tool for drawing curves and training MLPs in real-time.
   - Tech: TensorFlow.js, Neural Networks, Canvas
   - Demo: https://idklol22.github.io/CurveLABS--MLP-Visualizer-for-hand-drawn-curve/
   - Source: https://github.com/idklol22/CurveLABS--MLP-Visualizer-for-hand-drawn-curve

2. Chaos Particle Simulator — Strange Attractors & Dynamical Systems
   - Interactive 3D visualization of chaotic systems and strange attractors.
   - Tech: Three.js, Chaos Theory, WebGL
   - Demo: https://idklol22.github.io/Chaos-Particle-Simulator/
   - Source: https://github.com/idklol22/Chaos-Particle-Simulator

3. Library Management System — Console-Based OOP Application
   - Feature-rich console application implementing OOP principles.
   - Tech: C++, Design Patterns, OOP
   - Source: https://github.com/idklol22

## Technical Stack
- Languages: Python, Go, C++, C, JavaScript, MATLAB
- ML/DL: PyTorch, TensorFlow, JAX, Scikit-learn, LangChain
- Tools: Git, Docker, Linux, AWS

## Involvement
- Thapar ACM Student Chapter — Core Member
- Microsoft Learn Student Chapter — Executive Committee

## Seeking
- Research internships in ML/AI
- Collaborative research in healthcare AI
- Open-source contributions in ML frameworks
- Technical mentorship opportunities`;
    }

    open() {
        this.content.textContent = this.generateText();
        this.overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    close() {
        this.overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    async copy() {
        try {
            await navigator.clipboard.writeText(this.content.textContent);
            this.showCopied();
        } catch {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = this.content.textContent;
            textarea.style.cssText = 'position:fixed;opacity:0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showCopied();
        }
    }

    showCopied() {
        const span = this.copyBtn.querySelector('span') || this.copyBtn;
        const original = this.copyBtn.innerHTML;
        this.copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        this.copyBtn.classList.add('copied');
        setTimeout(() => {
            this.copyBtn.innerHTML = original;
            this.copyBtn.classList.remove('copied');
        }, 2000);
    }
}

// ============================================
// NAV SCROLL EFFECT — Background on scroll
// ============================================
class NavScroll {
    constructor() {
        this.nav = document.getElementById('top-nav');
        if (this.nav) this.init();
    }

    init() {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 20) {
                this.nav.classList.add('scrolled');
            } else {
                this.nav.classList.remove('scrolled');
            }
        }, { passive: true });
    }
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    new ThemeManager();
    new MobileMenu();
    new TaglineTyping();
    new NameGlitch();
    new Navigation();
    new ScrollReveal();
    new KeyboardNav();
    new ScraperMode();
    new NavScroll();
});

// Reduced Motion
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.style.setProperty('--t-fast', '0.01ms');
    document.documentElement.style.setProperty('--t-base', '0.01ms');
}
