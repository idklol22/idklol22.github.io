class ThemeManager {
    constructor() {
        this.toggle = document.getElementById('theme-toggle');
        this.toggleText = this.toggle?.querySelector('.toggle-text');
        this.prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
        this.init();
    }

    init() {
        const saved = localStorage.getItem('theme');
        if (saved) {
            this.setTheme(saved);
        } else {
            // Default to dark mode
            this.setTheme('dark');
        }

        this.toggle?.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            this.setTheme(current === 'dark' ? 'light' : 'dark');
        });

        this.prefersDark.addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                this.setTheme('dark');
            }
        });
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        if (this.toggleText) {
            this.toggleText.textContent = theme === 'dark' ? 'LIGHT' : 'DARK';
        }
    }
}

// ============================================
// Name Scramble Effect (same as old tagline)
// ============================================
class NameScramble {
    constructor() {
        this.elements = document.querySelectorAll('.name-line');
        this.chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';

        if (this.elements.length) this.init();
    }

    init() {
        this.elements.forEach((el, index) => {
            const originalText = el.getAttribute('data-text');
            el.textContent = '';

            // Stagger the animations
            setTimeout(() => this.scrambleIn(el, originalText), 200 + index * 300);

            // Re-scramble on hover
            el.addEventListener('mouseenter', () => {
                this.scrambleText(el, originalText);
            });
        });
    }

    scrambleIn(element, text) {
        let iteration = 0;
        const maxIterations = text.length;

        const interval = setInterval(() => {
            element.textContent = text
                .split('')
                .map((char, index) => {
                    if (index < iteration) return text[index];
                    if (char === ' ') return ' ';
                    return this.chars[Math.floor(Math.random() * this.chars.length)];
                })
                .join('');

            iteration += 0.5;

            if (iteration >= maxIterations) {
                element.textContent = text;
                clearInterval(interval);
            }
        }, 35);
    }

    scrambleText(element, text) {
        let iteration = 0;

        const interval = setInterval(() => {
            element.textContent = text
                .split('')
                .map((char, index) => {
                    if (index < iteration) return text[index];
                    if (char === ' ') return ' ';
                    return this.chars[Math.floor(Math.random() * this.chars.length)];
                })
                .join('');

            iteration += 1.2;

            if (iteration >= text.length) {
                element.textContent = text;
                clearInterval(interval);
            }
        }, 30);
    }
}

// ============================================
// Tagline Typing Effect (no hover scramble)
// ============================================
class TaglineTyping {
    constructor() {
        this.element = document.getElementById('tagline');
        this.text = 'BUILDING INTELLIGENT SYSTEMS';

        if (this.element) this.init();
    }

    init() {
        this.element.textContent = '';

        // Start typing after name scramble finishes
        setTimeout(() => this.typeText(), 1000);
    }

    typeText() {
        let i = 0;

        const type = () => {
            if (i < this.text.length) {
                this.element.textContent += this.text.charAt(i);
                i++;
                // Variable typing speed for realistic feel
                const delay = 50 + Math.random() * 40;
                setTimeout(type, delay);
            }
        };

        type();
    }
}

// ============================================
// Smooth Scroll & Active Navigation
// ============================================
class Navigation {
    constructor() {
        this.links = document.querySelectorAll('.nav-item');
        this.sections = document.querySelectorAll('.section[id]');
        this.init();
    }

    init() {
        this.links.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href?.startsWith('#')) {
                    e.preventDefault();
                    const target = document.querySelector(href);
                    if (target) {
                        const y = target.getBoundingClientRect().top + window.pageYOffset - 80;
                        window.scrollTo({ top: y, behavior: 'smooth' });
                    }
                }
            });
        });

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    this.setActive(id);
                }
            });
        }, {
            threshold: 0.2,
            rootMargin: '-80px 0px -50% 0px'
        });

        this.sections.forEach(section => observer.observe(section));
    }

    setActive(id) {
        this.links.forEach(link => {
            const href = link.getAttribute('href');
            link.classList.toggle('active', href === `#${id}`);
        });
    }
}

// ============================================
// Scroll Reveal Animations - DISABLED
// ============================================
class ScrollReveal {
    constructor() {
        // Disabled - no fade-in animation on scroll
    }
}

// ============================================
// Keyboard Navigation
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
            if (e.key === 'ArrowDown' || e.key === 'j') {
                e.preventDefault();
                this.navigate(1);
            } else if (e.key === 'ArrowUp' || e.key === 'k') {
                e.preventDefault();
                this.navigate(-1);
            }
        });
    }

    navigate(direction) {
        const newIndex = Math.max(0, Math.min(this.sections.length - 1, this.currentIndex + direction));
        const section = this.sections[newIndex];
        if (section) {
            const y = section.getBoundingClientRect().top + window.pageYOffset - 80;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    }
}

// ============================================
// Status Typing Effect
// ============================================
class StatusTyping {
    constructor() {
        this.element = document.querySelector('.status-text');
        if (this.element) this.init();
    }

    init() {
        const text = this.element.textContent;
        this.element.textContent = '';
        this.element.style.visibility = 'visible';

        let i = 0;
        const type = () => {
            if (i < text.length) {
                this.element.textContent += text.charAt(i);
                i++;
                setTimeout(type, 40 + Math.random() * 30);
            }
        };

        setTimeout(type, 2500);
    }
}

// ============================================
// Console Easter Egg
// ============================================
class ConsoleMessage {
    constructor() {
        const styles = 'color:#fff;background:#000;padding:12px 24px;font-family:monospace;font-size:14px;';
        console.log('%c SANJAM WADHWA // ML RESEARCHER ', styles);
        console.log('%c Contact: swadhwa.be24@thapar.edu ', 'color:#888;font-family:monospace;');
    }
}

// ============================================
// Initialize
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    new ThemeManager();
    new NameScramble();
    new TaglineTyping();
    new Navigation();
    new ScrollReveal();
    new KeyboardNav();
    new StatusTyping();
    new ConsoleMessage();
});

// ============================================
// Reduced Motion Support
// ============================================
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.style.setProperty('--transition-fast', '0.01ms');
    document.documentElement.style.setProperty('--transition-base', '0.01ms');
}
