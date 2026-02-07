
class WebGLBackground {
    constructor() {
        this.canvas = document.getElementById('webgl-bg');
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.mesh = null;
        this.uniforms = null;
        this.mouseX = 0;
        this.mouseY = 0;
        this.targetMouseX = 0;
        this.targetMouseY = 0;
        this.time = 0;
        this.isRunning = true;
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        this.init();
    }

    init() {
        // Scene
        this.scene = new THREE.Scene();

        // Camera
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Create shader mesh
        this.createMesh();

        // Bind events
        this.bindEvents();

        // Start animation
        this.animate();

        // Initial theme check
        this.updateTheme();
    }

    createMesh() {
        const geometry = new THREE.PlaneGeometry(2, 2);

        this.uniforms = {
            uTime: { value: 0 },
            uMouse: { value: new THREE.Vector2(0.5, 0.5) },
            uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            uColorA: { value: new THREE.Color('#e8e8e8') },
            uColorB: { value: new THREE.Color('#d0d0d0') },
            uColorC: { value: new THREE.Color('#f0f0f0') },
            uDark: { value: 0 }
        };

        const material = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                precision highp float;

                uniform float uTime;
                uniform vec2 uMouse;
                uniform vec2 uResolution;
                uniform vec3 uColorA;
                uniform vec3 uColorB;
                uniform vec3 uColorC;
                uniform float uDark;

                varying vec2 vUv;

                // Simplex 2D noise
                vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

                float snoise(vec2 v) {
                    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                                        -0.577350269189626, 0.024390243902439);
                    vec2 i  = floor(v + dot(v, C.yy));
                    vec2 x0 = v -   i + dot(i, C.xx);
                    vec2 i1;
                    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                    vec4 x12 = x0.xyxy + C.xxzz;
                    x12.xy -= i1;
                    i = mod(i, 289.0);
                    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
                                    + i.x + vec3(0.0, i1.x, 1.0 ));
                    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                                            dot(x12.zw,x12.zw)), 0.0);
                    m = m*m;
                    m = m*m;
                    vec3 x = 2.0 * fract(p * C.www) - 1.0;
                    vec3 h = abs(x) - 0.5;
                    vec3 ox = floor(x + 0.5);
                    vec3 a0 = x - ox;
                    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
                    vec3 g;
                    g.x  = a0.x  * x0.x  + h.x  * x0.y;
                    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                    return 130.0 * dot(m, g);
                }

                // Fractional Brownian Motion
                float fbm(vec2 p) {
                    float value = 0.0;
                    float amplitude = 0.5;
                    float frequency = 1.0;
                    for (int i = 0; i < 5; i++) {
                        value += amplitude * snoise(p * frequency);
                        amplitude *= 0.5;
                        frequency *= 2.0;
                    }
                    return value;
                }

                void main() {
                    vec2 uv = vUv;
                    vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
                    vec2 scaledUv = uv * aspect;

                    // Mouse influence
                    vec2 mouse = uMouse * aspect;
                    float mouseInfluence = 1.0 - smoothstep(0.0, 0.8, distance(scaledUv, mouse));

                    // Animated noise layers
                    float t = uTime * 0.15;

                    // Primary flow
                    vec2 flow1 = vec2(
                        fbm(scaledUv * 2.0 + vec2(t * 0.5, t * 0.3)),
                        fbm(scaledUv * 2.0 + vec2(t * 0.4, -t * 0.2) + 100.0)
                    );

                    // Secondary flow with mouse interaction
                    vec2 flow2 = vec2(
                        fbm(scaledUv * 3.0 + flow1 * 0.5 + mouseInfluence * 0.3),
                        fbm(scaledUv * 3.0 + flow1 * 0.5 + 50.0 + mouseInfluence * 0.3)
                    );

                    // Tertiary detail
                    float detail = fbm(scaledUv * 4.0 + flow2 + t * 0.1);

                    // Combine patterns
                    float pattern = fbm(scaledUv * 1.5 + flow2 * 0.8);
                    pattern = pattern * 0.5 + 0.5; // Normalize to 0-1

                    // Add subtle mouse distortion
                    pattern += mouseInfluence * 0.1 * sin(uTime * 2.0 + pattern * 10.0);

                    // Color mixing
                    vec3 color = mix(uColorA, uColorB, pattern);
                    color = mix(color, uColorC, detail * 0.3 + 0.2);

                    // Subtle vignette
                    float vignette = 1.0 - smoothstep(0.4, 1.4, length(uv - 0.5) * 1.5);
                    color = mix(color * 0.95, color, vignette);

                    // Add very subtle grain
                    float grain = (fract(sin(dot(uv * uTime * 0.01, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.02;
                    color += grain;

                    gl_FragColor = vec4(color, 1.0);
                }
            `,
            transparent: false
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.mesh);
    }

    bindEvents() {
        // Mouse/touch movement
        if (!this.isMobile) {
            window.addEventListener('mousemove', (e) => {
                this.targetMouseX = e.clientX / window.innerWidth;
                this.targetMouseY = 1.0 - (e.clientY / window.innerHeight);
            });
        } else {
            window.addEventListener('touchmove', (e) => {
                if (e.touches.length > 0) {
                    this.targetMouseX = e.touches[0].clientX / window.innerWidth;
                    this.targetMouseY = 1.0 - (e.touches[0].clientY / window.innerHeight);
                }
            });
        }

        // Resize
        window.addEventListener('resize', () => {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
        });

        // Theme observer
        const observer = new MutationObserver(() => this.updateTheme());
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme']
        });

        // Visibility
        document.addEventListener('visibilitychange', () => {
            this.isRunning = !document.hidden;
            if (this.isRunning) this.animate();
        });
    }

    updateTheme() {
        const theme = document.documentElement.getAttribute('data-theme');
        const isDark = theme === 'dark';

        if (isDark) {
            this.uniforms.uColorA.value.set('#0f0f0f');
            this.uniforms.uColorB.value.set('#1a1a1a');
            this.uniforms.uColorC.value.set('#0a0a0a');
            this.uniforms.uDark.value = 1;
        } else {
            this.uniforms.uColorA.value.set('#f5f5f5');
            this.uniforms.uColorB.value.set('#e8e8e8');
            this.uniforms.uColorC.value.set('#ffffff');
            this.uniforms.uDark.value = 0;
        }
    }

    animate() {
        if (!this.isRunning) return;

        requestAnimationFrame(() => this.animate());

        // Increment time
        this.time += 0.01;

        // Smooth mouse lerp
        this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
        this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;

        // Update uniforms
        this.uniforms.uTime.value = this.time;
        this.uniforms.uMouse.value.set(this.mouseX, this.mouseY);

        // Render
        this.renderer.render(this.scene, this.camera);
    }

    destroy() {
        this.isRunning = false;
        if (this.mesh) {
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
            this.scene.remove(this.mesh);
        }
        this.renderer.dispose();
    }
}

// Initialize
let webglBackground;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        webglBackground = new WebGLBackground();
    });
} else {
    webglBackground = new WebGLBackground();
}
