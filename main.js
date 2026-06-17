// ============================================
// THEME
// ============================================
class ThemeManager {
    constructor() {
        this.btn = document.getElementById('theme-toggle');
        this.icon = document.getElementById('mode-icon');
        this.init();
    }

    init() {
        const saved = localStorage.getItem('theme');
        this.set(saved || 'light');
        this.btn?.addEventListener('click', () => this.flip());
    }

    flip() {
        const cur = document.documentElement.getAttribute('data-theme');
        this.set(cur === 'dark' ? 'light' : 'dark');
    }

    set(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        if (this.icon) this.icon.textContent = theme === 'light' ? '☽' : '☀';
    }
}

// ============================================
// TAGLINE TYPING
// ============================================
class TaglineTyping {
    constructor() {
        this.el = document.getElementById('tagline');
        this.text = 'Building Intelligent Systems';
        if (this.el) this.init();
    }

    init() {
        this.el.textContent = '';
        setTimeout(() => this.type(), 400);
    }

    type() {
        let i = 0;
        const tick = () => {
            if (i < this.text.length) {
                this.el.textContent += this.text.charAt(i);
                i++;
                setTimeout(tick, 35 + Math.random() * 25);
            } else {
                this.el.setAttribute('data-text', this.text);
                this.el.classList.add('glitch');
                if (window._glitch) window._glitch.bind(this.el);
            }
        };
        tick();
    }
}

// ============================================
// GLITCH ON HOVER
// ============================================
class GlitchHover {
    constructor() {
        document.querySelectorAll('.glitch').forEach(el => this.bind(el));
        window._glitch = this;
    }

    bind(el) {
        // Ensure data-text is always in sync with the text content
        // The visual glitch is handled purely by CSS ::before / ::after
        // We do NOT touch el.textContent — that destroys child nodes and the cursor span
        if (!el.getAttribute('data-text')) {
            el.setAttribute('data-text', el.textContent.trim());
        }
    }
}

// ============================================
// TAB MANAGER
// ============================================
class TabManager {
    constructor() {
        this.tabs = document.querySelectorAll('.tab');
        this.panes = document.querySelectorAll('.tab-pane');
        if (!this.tabs.length) return;
        this.init();
    }

    init() {
        // Make initial active pane visible
        const activePane = document.querySelector('.tab-pane.active');
        if (activePane) {
            requestAnimationFrame(() => activePane.classList.add('visible'));
        }

        // Bind click events
        this.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.getAttribute('data-tab');
                this.switchTo(target);
            });
        });

        // Check URL hash for initial tab
        const hash = window.location.hash.replace('#', '');
        if (hash && document.getElementById(`pane-${hash}`)) {
            this.switchTo(hash);
        }

        // Listen for hash changes
        window.addEventListener('hashchange', () => {
            const h = window.location.hash.replace('#', '');
            if (h && document.getElementById(`pane-${h}`)) {
                this.switchTo(h);
            }
        });
    }

    switchTo(tabName) {
        // Update tabs
        this.tabs.forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
        });

        // Remove visible from all, then remove active from non-targets
        this.panes.forEach(pane => {
            pane.classList.remove('visible');
            if (pane.id !== `pane-${tabName}`) {
                pane.classList.remove('active');
            }
        });

        // Set active on target, then fade in
        const target = document.getElementById(`pane-${tabName}`);
        if (target) {
            target.classList.add('active');
            // Delay to allow display change to take effect before transition
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    target.classList.add('visible');
                });
            });
        }

        // Update URL hash without scrolling
        history.replaceState(null, '', `#${tabName}`);
    }
}

// ============================================
// SCRAPER MODE
// ============================================
class ScraperMode {
    constructor() {
        this.btn = document.getElementById('scraper-btn');
        this.overlay = document.getElementById('scraper-overlay');
        this.content = document.getElementById('scraper-content');
        this.copyBtn = document.getElementById('scraper-copy');
        this.closeBtn = document.getElementById('scraper-close');
        if (this.overlay) this.init();
    }

    init() {
        this.btn?.addEventListener('click', () => this.open());
        this.closeBtn?.addEventListener('click', () => this.close());
        this.overlay.addEventListener('click', (e) => { if (e.target === this.overlay) this.close(); });
        this.copyBtn?.addEventListener('click', () => this.copy());
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.overlay.classList.contains('active')) this.close();
        });
    }

    text() {
        return `# Sanjam Wadhwa
Undergraduate CS Student | ML Researcher
Thapar Institute of Engineering & Technology
Email: swadhwa.be24@thapar.edu
GitHub: https://github.com/idklol22
LinkedIn: https://www.linkedin.com/in/sanjam-wadhwa-853985334/
Kaggle: https://www.kaggle.com/sanjamw

## About
I'm an undergraduate studying Computer Science at Thapar Institute of Engineering & Technology. Curious about complex systems, building strong fundamentals through coursework, reading, and projects.

## Research Interests
- Machine Learning (ML)
- Reinforcement Learning (RL)
- Model Interpretability and Reliability
- Deep Learning (DL)
- Natural Language Processing (NLP)

## Publications

1. "From Signals to Patterns: Non-Invasive Tuberculosis Detection from Cough Audio using Bandit Weighted Hyperbolic Prototypes"
   Venue: INTERSPEECH 2026 — ACCEPTED
   Authors: MM Akhtar, Girish, Sanjam Wadhwa, Muskaan Singh

2. "Less is More in Kolmogorov-Arnold Networks: The Shared-Atom Architecture"
   Venue: COLORAI @ ICML 2026 — ACCEPTED
   Authors: Sanjam Wadhwa, Hrideya Sharma, Shashank Singh, Saurabh Sharma

3. "Early-Stage Diabetes Prediction using Stacked Learning"
   Venue: ComputingCon 2025 — ACCEPTED
   Mentor: Prof. Rinkle Rani, CSE Dept, TIET

## Projects
1. CurveLABS — MLP Visualizer (TensorFlow.js, Neural Networks)
   Demo: https://idklol22.github.io/CurveLABS--MLP-Visualizer-for-hand-drawn-curve/
2. Chaos Particle Simulator (Three.js, WebGL)
   Demo: https://idklol22.github.io/Chaos-Particle-Simulator/
3. Library Management System (C++, OOP)

## Seeking
Research internships in ML/AI, collaborative research, open-source contributions`;
    }

    open() {
        this.content.textContent = this.text();
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
        } catch {
            const ta = document.createElement('textarea');
            ta.value = this.content.textContent;
            ta.style.cssText = 'position:fixed;opacity:0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
        const orig = this.copyBtn.textContent;
        this.copyBtn.textContent = 'Copied!';
        this.copyBtn.classList.add('copied');
        setTimeout(() => {
            this.copyBtn.textContent = orig;
            this.copyBtn.classList.remove('copied');
        }, 1500);
    }
}

// ============================================
// MOBILE SIDEBAR TOGGLE
// ============================================
class MobileSidebar {
    constructor() {
        this.sidebar = document.getElementById('sidebar');
        this.toggleBtn = document.getElementById('sidebar-toggle');
        this.details = document.getElementById('sidebar-details');
        if (this.toggleBtn) this.init();
    }

    init() {
        this.toggleBtn.addEventListener('click', () => this.toggle());

        // Auto-collapse when switching tabs on mobile
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                if (window.innerWidth <= 860 && this.sidebar.classList.contains('expanded')) {
                    this.collapse();
                }
            });
        });
    }

    toggle() {
        if (this.sidebar.classList.contains('expanded')) {
            this.collapse();
        } else {
            this.expand();
        }
    }

    expand() {
        this.sidebar.classList.add('expanded');
    }

    collapse() {
        this.sidebar.classList.remove('expanded');
    }
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    new ThemeManager();
    new TaglineTyping();
    new GlitchHover();
    new TabManager();
    new ScraperMode();
    new MobileSidebar();
});
