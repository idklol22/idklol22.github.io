class QuantizedNoiseGrid {
    constructor() {
        this.canvas = document.getElementById('shader-bg');
        if (!this.canvas) return;

        this.gl = this.canvas.getContext('webgl2', { alpha: true, antialias: false })
              || this.canvas.getContext('webgl',  { alpha: true, antialias: false });

        if (!this.gl) {
            console.warn('WebGL not supported');
            return;
        }

        this.time = 0;
        this.mouseX = 0.5;
        this.mouseY = 0.5;
        this.targetMouseX = 0.5;
        this.targetMouseY = 0.5;
        this.isRunning = true;
        this.isDark = true;
        this.lastFrame = performance.now();

        this.isMobile =
            window.innerWidth <= 768 ||
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        this.init();
    }

    init() {
        this.createShaders();
        this.createGeometry();
        this.bindEvents();
        this.checkTheme();
        this.resize();       // after shaders so we can push uniforms like u_cellPx
        this.animate();
    }

    resize() {
        const vv = window.visualViewport;
        const cssW = vv ? vv.width : window.innerWidth;
        const cssH = vv ? vv.height : window.innerHeight;

        const dprRaw = window.devicePixelRatio || 1;
        const dpr = this.isMobile ? Math.min(dprRaw, 1.25) : Math.min(dprRaw, 2.0);

        const w = Math.max(1, Math.round(cssW * dpr));
        const h = Math.max(1, Math.round(cssH * dpr));

        // Only touch the drawingbuffer if needed
        if (this.canvas.width !== w || this.canvas.height !== h) {
            this.canvas.width = w;
            this.canvas.height = h;
            this.gl.viewport(0, 0, w, h);
        }

        // Keep CSS size in CSS pixels
        this.canvas.style.width = cssW + 'px';
        this.canvas.style.height = cssH + 'px';

        // Push uniforms that depend on size
        if (this.uniforms?.resolution) {
            this.gl.useProgram(this.program);
            this.gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
        }

        // Mobile declutter: larger cell pixel size => fewer cells => less cramped
        if (this.uniforms?.cellPx) {
            const aspect = w / h; // >1 landscape, <1 portrait
            const cellPx =
                this.isMobile
                    ? (aspect < 0.85 ? 24.0 : 20.0) // portrait vs landscape phone
                    : 14.0;                          // desktop density
            this.gl.useProgram(this.program);
            this.gl.uniform1f(this.uniforms.cellPx, cellPx);
        }
    }

    createShaders() {
        const vertexShaderSource = `
            attribute vec2 a_position;
            varying vec2 v_uv;
            void main() {
                v_uv = a_position * 0.5 + 0.5;
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `;

        const fragmentShaderSource = `
            precision highp float;

            uniform float u_time;
            uniform vec2 u_resolution;
            uniform vec2 u_mouse;
            uniform float u_isDark;

            // New: pixel-based cell sizing
            uniform float u_cellPx;

            varying vec2 v_uv;

            float hash(vec2 p) {
                p = fract(p * vec2(234.34, 435.345));
                p += dot(p, p + 34.23);
                return fract(p.x * p.y);
            }

            float hash2D(vec2 p, float t) {
                return fract(sin(dot(p + t, vec2(12.9898, 78.233))) * 43758.5453);
            }

            vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec2 mod289v2(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

            float snoise(vec2 v) {
                const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                                   -0.577350269189626, 0.024390243902439);
                vec2 i = floor(v + dot(v, C.yy));
                vec2 x0 = v - i + dot(i, C.xx);
                vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                vec4 x12 = x0.xyxy + C.xxzz;
                x12.xy -= i1;
                i = mod289v2(i);
                vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
                vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
                m = m * m;
                m = m * m;
                vec3 x = 2.0 * fract(p * C.www) - 1.0;
                vec3 h = abs(x) - 0.5;
                vec3 ox = floor(x + 0.5);
                vec3 a0 = x - ox;
                m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
                vec3 g;
                g.x = a0.x * x0.x + h.x * x0.y;
                g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                return 130.0 * dot(m, g);
            }

            float fbm(vec2 p, float t) {
                float value = 0.0;
                float amplitude = 0.5;
                float frequency = 1.0;

                value += amplitude * snoise(p * frequency + vec2(t * 0.1, t * 0.08));
                amplitude *= 0.5; frequency *= 2.0;

                value += amplitude * snoise(p * frequency + vec2(-t * 0.15, t * 0.12));
                amplitude *= 0.5; frequency *= 2.0;

                value += amplitude * snoise(p * frequency + vec2(t * 0.2, -t * 0.18));
                amplitude *= 0.5; frequency *= 2.0;

                value += amplitude * snoise(p * frequency + vec2(-t * 0.25, -t * 0.22));
                return value;
            }

            void main() {
                vec2 uv = v_uv;

                float aspect = u_resolution.x / u_resolution.y;
                vec2 scaledUv = vec2(uv.x * aspect, uv.y);

                // ============================================
                // Grid Setup - pixel-based density (fix)
                // ============================================
                vec2 cells = max(vec2(8.0), floor(u_resolution / u_cellPx));
                vec2 gridPos = floor(uv * cells);
                vec2 cellUv = fract(uv * cells);
                vec2 cellCenter = (gridPos + 0.5) / cells;

                // ============================================
                // Wave Calculation
                // ============================================
                float t = u_time;
                float wave1 = fbm(cellCenter * 3.0, t * 0.8);
                float wave2 = snoise(cellCenter * 5.0 + vec2(t * 0.15, -t * 0.1)) * 0.5;
                float wave3 = snoise(cellCenter * 8.0 + vec2(-t * 0.3, t * 0.25)) * 0.3;

                float waveIntensity = (wave1 + wave2 + wave3) * 0.5 + 0.5;
                waveIntensity = clamp(waveIntensity, 0.0, 1.0);

                // ============================================
                // Quantization
                // ============================================
                float levels = 5.0;
                float quantizedWave = floor(waveIntensity * levels) / levels;

                // ============================================
                // Animated Grain per-cell
                // ============================================
                float grainSpeed = 12.0;
                float grain = hash2D(gridPos, floor(t * grainSpeed));
                float grainIntensity = grain * 0.4 * quantizedWave;

                // ============================================
                // Radial Mask
                // ============================================
                vec2 maskCenter1 = vec2(0.75 * aspect, 0.5);
                float dist1 = length(scaledUv - maskCenter1);

                float maskWobble = snoise(vec2(atan(scaledUv.y - 0.5, scaledUv.x * aspect - 0.75) * 3.0, t * 0.1)) * 0.15;
                float mask1 = smoothstep(0.9 + maskWobble, 0.2, dist1);

                vec2 maskCenter2 = vec2(0.2 * aspect, 0.3);
                float dist2 = length(scaledUv - maskCenter2);
                float mask2 = smoothstep(0.5, 0.1, dist2) * 0.4;

                float mask = max(mask1, mask2);
                mask = clamp(mask, 0.0, 1.0);

                // ============================================
                // Cell activation
                // ============================================
                float cellBrightness = quantizedWave * mask;
                cellBrightness += grainIntensity * mask;

                float borderWidth = 0.08;
                float border = 1.0;
                if (cellUv.x < borderWidth || cellUv.x > 1.0 - borderWidth ||
                    cellUv.y < borderWidth || cellUv.y > 1.0 - borderWidth) {
                    border = 0.7;
                }
                cellBrightness *= border;

                cellBrightness = clamp(cellBrightness, 0.0, 1.0);
                cellBrightness = smoothstep(0.1, 0.3, cellBrightness) * cellBrightness;

                vec3 color;
                if (u_isDark > 0.5) {
                    color = vec3(cellBrightness * 0.12);
                } else {
                    color = vec3(0.94 - cellBrightness * 0.18);
                }

                gl_FragColor = vec4(color, 1.0);
            }
        `;

        const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);
        if (!vertexShader || !fragmentShader) return;

        this.program = this.gl.createProgram();
        this.gl.attachShader(this.program, vertexShader);
        this.gl.attachShader(this.program, fragmentShader);
        this.gl.linkProgram(this.program);

        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            console.error('Shader program failed to link');
            return;
        }

        this.gl.useProgram(this.program);

        this.uniforms = {
            time: this.gl.getUniformLocation(this.program, 'u_time'),
            resolution: this.gl.getUniformLocation(this.program, 'u_resolution'),
            mouse: this.gl.getUniformLocation(this.program, 'u_mouse'),
            isDark: this.gl.getUniformLocation(this.program, 'u_isDark'),
            cellPx: this.gl.getUniformLocation(this.program, 'u_cellPx'),
        };
    }

    compileShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    createGeometry() {
        const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

        const positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
    }

    bindEvents() {
        let resizeTimeout;
        const scheduleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.isMobile = window.innerWidth <= 768;
                this.resize();
            }, 50);
        };

        window.addEventListener('resize', scheduleResize, { passive: true });
        window.addEventListener('orientationchange', scheduleResize, { passive: true });
        window.visualViewport?.addEventListener('resize', scheduleResize, { passive: true });

        window.addEventListener('mousemove', (e) => {
            this.targetMouseX = e.clientX / window.innerWidth;
            this.targetMouseY = 1.0 - (e.clientY / window.innerHeight);
        });

        window.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0) {
                this.targetMouseX = e.touches[0].clientX / window.innerWidth;
                this.targetMouseY = 1.0 - (e.touches[0].clientY / window.innerHeight);
            }
        }, { passive: true });

        document.addEventListener('visibilitychange', () => {
            this.isRunning = !document.hidden;
            if (this.isRunning) {
                this.lastFrame = performance.now();
                this.animate();
            }
        });

        const observer = new MutationObserver(() => this.checkTheme());
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme']
        });
    }

    checkTheme() {
        this.isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    }

    animate() {
        if (!this.isRunning) return;
        requestAnimationFrame(() => this.animate());

        const now = performance.now();
        const delta = (now - this.lastFrame) / 1000;
        this.lastFrame = now;

        this.time += delta;

        this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
        this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;

        this.gl.useProgram(this.program);
        this.gl.uniform1f(this.uniforms.time, this.time);
        this.gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
        this.gl.uniform2f(this.uniforms.mouse, this.mouseX, this.mouseY);
        this.gl.uniform1f(this.uniforms.isDark, this.isDark ? 1.0 : 0.0);

        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new QuantizedNoiseGrid());
} else {
    new QuantizedNoiseGrid();
}
