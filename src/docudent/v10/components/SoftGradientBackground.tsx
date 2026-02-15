import React, { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Soft Gradient Shader (Jeton-style)
 */
const softGradientShader = {
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,

    fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        
        void main() {
            vec2 uv = vUv;
            
            // Soft moving blobs
            vec2 p1 = vec2(0.3 + sin(uTime * 0.3) * 0.2, 0.5 + cos(uTime * 0.25) * 0.15);
            vec2 p2 = vec2(0.7 + cos(uTime * 0.28) * 0.18, 0.4 + sin(uTime * 0.32) * 0.2);
            vec2 p3 = vec2(0.5 + sin(uTime * 0.22) * 0.15, 0.7 + cos(uTime * 0.26) * 0.12);
            
            // Smooth distance fields
            float d1 = 1.0 - smoothstep(0.0, 0.6, length(uv - p1));
            float d2 = 1.0 - smoothstep(0.0, 0.5, length(uv - p2));
            float d3 = 1.0 - smoothstep(0.0, 0.55, length(uv - p3));
            
            // Jeton-Matched Vibrant Palette
            // 1. Warm Red-Orange (Left/Top dominant) - Even Warmer
            vec3 color1 = vec3(1.0, 0.55, 0.40); // #FF8C66 (Warmer/Brighter Orange-Red)
            
            // 2. Vibrant Coral (Middle)
            vec3 color2 = vec3(0.98, 0.60, 0.45); // #FA9973 (Bright Coral)
            
            // 3. Soft Peach (Accents)
            vec3 color3 = vec3(1.0, 0.85, 0.70);  // #FFD9B3 (Warm Peach)
            
            // Base background (Gradient from pink to peach)
            vec3 baseColor = mix(vec3(0.95, 0.45, 0.55), vec3(0.98, 0.82, 0.72), uv.x * 1.2);
            
            // Mix colors with blobs for dynamic movement
            vec3 color = baseColor;
            color = mix(color, color1, d1 * 0.7); // Strong pink blob
            color = mix(color, color2, d2 * 0.6); // Coral blob
            color = mix(color, color3, d3 * 0.5); // Light peach blob
            
            // Subtle vignette
            float vignette = 1.0 - length(uv - 0.5) * 0.25;
            color *= vignette;
            
            gl_FragColor = vec4(color, 1.0);
        }
    `
};

/**
 * Soft Gradient Mesh
 */
function SoftGradientMesh() {
    const meshRef = useRef<THREE.Mesh>(null);
    const { viewport } = useThree();

    const uniforms = useRef({
        uTime: { value: 0 }
    });

    useFrame((state) => {
        if (meshRef.current) {
            uniforms.current.uTime.value = state.clock.getElapsedTime();
        }
    });

    return (
        <mesh ref={meshRef}>
            <planeGeometry args={[viewport.width, viewport.height]} />
            <shaderMaterial
                vertexShader={softGradientShader.vertexShader}
                fragmentShader={softGradientShader.fragmentShader}
                uniforms={uniforms.current}
            />
        </mesh>
    );
}

/**
 * Soft Gradient Background (Jeton-style)
 */
export function SoftGradientBackground() {
    const prefersReducedMotion = typeof window !== 'undefined'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

    if (prefersReducedMotion) {
        return null;
    }

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: -4,
            pointerEvents: 'none'
        }}>
            <Canvas
                camera={{ position: [0, 0, 1], fov: 50 }}
                gl={{
                    alpha: false,
                    antialias: true,
                    powerPreference: 'high-performance'
                }}
                dpr={[1, 2]}
            >
                <SoftGradientMesh />
            </Canvas>
        </div>
    );
}
