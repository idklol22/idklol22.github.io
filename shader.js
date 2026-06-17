class QuantizedNoiseGrid {
    constructor() {
        this.canvas = document.getElementById('shader-bg');
        if (!this.canvas) return;

        this.gl = this.canvas.getContext('webgl2', {
            alpha: true,
            antialias: false,
            powerPreference: 'low-power',
            failIfMajorPerformanceCaveat: false
        }) || this.canvas.getContext('webgl', {
            alpha: true,
            antialias: false,
            powerPreference: 'low-power'
        });

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

        // Throttle: target ~24fps (42ms) on mobile, ~30fps (33ms) on desktop
        this.frameBudget = this.isMobile ? 42 : 33;

        this.init();
    }

    init() {
        this.createShaders();
        this.createGeometry();
        this.bindEvents();
        this.checkTheme();
        this.resize();
        this.animate();
    }

    resize() {
        const vv = window.visualViewport;
        const cssW = vv ? vv.width : window.innerWidth;
        const cssH = vv ? vv.height : window.innerHeight;

        // Render at significantly reduced resolution — the canvas is at 10% opacity
        // so pixel-perfect rendering is totally wasted. Half-res or less is plenty.
        const dprRaw = window.devicePixelRatio || 1;
        const dpr = this.isMobile
            ? Math.min(dprRaw, 0.75)   // mobile: 0.75x
            : Math.min(dprRaw, 1.0);   // desktop: 1x max (was 2x)

        const w = Math.max(1, Math.round(cssW * dpr));
        const h = Math.max(1, Math.round(cssH * dpr));

        if (this.canvas.width !== w || this.canvas.height !== h) {
            this.canvas.width = w;
            this.canvas.height = h;
            this.gl.viewport(0, 0, w, h);
        }

        this.canvas.style.width = cssW + 'px';
        this.canvas.style.height = cssH + 'px';

        if (this.uniforms?.resolution) {
            this.gl.useProgram(this.program);
            this.gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
        }

        if (this.uniforms?.cellPx) {
            const aspect = w / h;
            const cellPx = this.isMobile
                ? (aspect < 0.85 ? 24.0 : 20.0)
                : 14.0;
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

        // Simplified fragment shader:
        //  - mediump instead of highp (faster on mobile GPUs)
        //  - fbm reduced from 4 octaves to 3
        //  - removed second radial mask (invisible at 10% canvas opacity)
        //  - grain uses simpler hash
        const fragmentShaderSource = `
            precision mediump float;

            uniform float u_time;
            uniform vec2 u_resolution;
            uniform vec2 u_mouse;
            uniform float u_isDark;
            uniform float u_cellPx;

            varying vec2 v_uv;

            float hash(vec2 p) {
                p = fract(p * vec2(234.34, 435.345));
                p += dot(p, p + 34.23);
                return fract(p.x * p.y);
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

            // 3-octave fbm (was 4) — plenty of detail for a 10%-opacity background
            float fbm(vec2 p, float t) {
                float value = 0.0;
                float amplitude = 0.5;
                float frequency = 1.0;

                value += amplitude * snoise(p * frequency + vec2(t * 0.1, t * 0.08));
                amplitude *= 0.5; frequency *= 2.0;

                value += amplitude * snoise(p * frequency + vec2(-t * 0.15, t * 0.12));
                amplitude *= 0.5; frequency *= 2.0;

                value += amplitude * snoise(p * frequency + vec2(t * 0.2, -t * 0.18));
                return value;
            }

            void main() {
                vec2 uv = v_uv;
                float aspect = u_resolution.x / u_resolution.y;
                vec2 scaledUv = vec2(uv.x * aspect, uv.y);

                // Grid
                vec2 cells = max(vec2(8.0), floor(u_resolution / u_cellPx));
                vec2 gridPos = floor(uv * cells);
                vec2 cellUv = fract(uv * cells);
                vec2 cellCenter = (gridPos + 0.5) / cells;

                // Waves
                float t = u_time;
                float wave1 = fbm(cellCenter * 3.0, t * 0.8);
                float wave2 = snoise(cellCenter * 5.0 + vec2(t * 0.15, -t * 0.1)) * 0.5;

                float waveIntensity = (wave1 + wave2) * 0.5 + 0.5;
                waveIntensity = clamp(waveIntensity, 0.0, 1.0);

                // Quantize
                float quantizedWave = floor(waveIntensity * 5.0) / 5.0;

                // Grain — simplified
                float grain = hash(gridPos + floor(t * 8.0)) * 0.2 * quantizedWave;

                // Single radial mask
                vec2 maskCenter = vec2(0.75 * aspect, 0.5);
                float dist = length(scaledUv - maskCenter);
                float maskWobble = snoise(vec2(atan(scaledUv.y - 0.5, scaledUv.x * aspect - 0.75) * 3.0, t * 0.1)) * 0.15;
                float mask = smoothstep(0.9 + maskWobble, 0.2, dist);
                mask = clamp(mask, 0.0, 1.0);

                // Cell activation
                float cellBrightness = quantizedWave * mask + grain * mask;

                // Border
                float borderWidth = 0.08;
                if (cellUv.x < borderWidth || cellUv.x > 1.0 - borderWidth ||
                    cellUv.y < borderWidth || cellUv.y > 1.0 - borderWidth) {
                    cellBrightness *= 0.7;
                }

                cellBrightness = clamp(cellBrightness, 0.0, 1.0);
                cellBrightness = smoothstep(0.1, 0.3, cellBrightness) * cellBrightness;

                vec3 color;
                if (u_isDark > 0.5) {
                    color = vec3(0.067 + cellBrightness * 0.06);
                } else {
                    color = vec3(0.98 - cellBrightness * 0.06);
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
            }, 100);  // was 50ms, 100ms is fine for resize
        };

        window.addEventListener('resize', scheduleResize, { passive: true });
        window.addEventListener('orientationchange', scheduleResize, { passive: true });
        window.visualViewport?.addEventListener('resize', scheduleResize, { passive: true });

        // Throttle mousemove to ~30fps updates
        let lastMouse = 0;
        window.addEventListener('mousemove', (e) => {
            const now = performance.now();
            if (now - lastMouse < 33) return;
            lastMouse = now;
            this.targetMouseX = e.clientX / window.innerWidth;
            this.targetMouseY = 1.0 - (e.clientY / window.innerHeight);
        }, { passive: true });

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
        this.isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    }

    animate() {
        if (!this.isRunning) return;
        requestAnimationFrame(() => this.animate());

        const now = performance.now();
        const elapsed = now - this.lastFrame;

        // Frame-skip: only render when enough time has passed
        if (elapsed < this.frameBudget) return;

        const delta = elapsed / 1000;
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
