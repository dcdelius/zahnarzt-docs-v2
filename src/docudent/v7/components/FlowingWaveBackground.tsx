import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * High-End Flowing Wave Shader Material
 */
const flowingWaveShader = {
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,

    fragmentShader: `
        uniform float uTime;
        uniform vec2 uResolution;
        
        varying vec2 vUv;
        
        // Warm sunrise color palette (peach/coral/orange/cream)
        vec3 palette(float t) {
            vec3 col1 = vec3(0.96, 0.85, 0.72); // Cream/peach
            vec3 col2 = vec3(0.98, 0.70, 0.52); // Coral
            vec3 col3 = vec3(0.95, 0.55, 0.35); // Orange
            
            if (t < 0.5) {
                return mix(col1, col2, t * 2.0);
            } else {
                return mix(col2, col3, (t - 0.5) * 2.0);
            }
        }
        
        void main() {
            vec2 uv = vUv;
            
            // Create smooth flowing waves (SIMPLIFIED)
            float wave1 = sin(uv.x * 3.0 + uTime * 0.2) * 0.3;
            float wave2 = sin(uv.y * 2.5 - uTime * 0.15) * 0.25;
            
            // Combine for gentle flow
            float flow = wave1 + wave2;
            
            // Create smooth line pattern
            float lines = fract((uv.y + flow) * 15.0);
            lines = smoothstep(0.45, 0.5, lines) - smoothstep(0.5, 0.55, lines);
            
            // Color gradient based on position
            float colorT = uv.x * 0.6 + uv.y * 0.4 + flow * 0.2;
            vec3 color = palette(colorT);
            
            // Apply line pattern subtly
            color = mix(color * 0.85, color * 1.05, lines);
            
            // Subtle vignette
            float vignette = 1.0 - length(uv - 0.5) * 0.3;
            color *= vignette;
            
            gl_FragColor = vec4(color, 1.0);
        }
    `
};

/**
 * Flowing Wave Mesh Component
 */
function FlowingWaveMesh() {
    const meshRef = useRef<THREE.Mesh>(null);
    const { viewport } = useThree();

    const uniforms = useRef({
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(viewport.width, viewport.height) }
    });

    useEffect(() => {
        uniforms.current.uResolution.value.set(viewport.width, viewport.height);
    }, [viewport]);

    useFrame((state) => {
        if (meshRef.current) {
            uniforms.current.uTime.value = state.clock.getElapsedTime() * 0.5;
        }
    });

    return (
        <mesh ref={meshRef}>
            <planeGeometry args={[viewport.width, viewport.height]} />
            <shaderMaterial
                vertexShader={flowingWaveShader.vertexShader}
                fragmentShader={flowingWaveShader.fragmentShader}
                uniforms={uniforms.current}
            />
        </mesh>
    );
}

/**
 * High-End Flowing Wave Background
 */
export function FlowingWaveBackground() {
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
                <FlowingWaveMesh />
            </Canvas>
        </div>
    );
}
