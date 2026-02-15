import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * WebGL Mesh - Subtle Wave Animation
 */
function WaveMesh() {
    const meshRef = useRef<THREE.Mesh>(null);

    // Create wave geometry
    const geometry = useMemo(() => {
        const geo = new THREE.PlaneGeometry(20, 20, 64, 64);
        const positions = geo.attributes.position;

        // Store original positions for wave calculation
        const originalPos = new Float32Array(positions.count * 3);
        for (let i = 0; i < positions.count; i++) {
            originalPos[i * 3] = positions.getX(i);
            originalPos[i * 3 + 1] = positions.getY(i);
            originalPos[i * 3 + 2] = positions.getZ(i);
        }
        geo.userData.originalPos = originalPos;

        return geo;
    }, []);

    // Animate wave
    useFrame((state) => {
        if (!meshRef.current) return;

        const time = state.clock.getElapsedTime();
        const positions = meshRef.current.geometry.attributes.position;
        const originalPos = meshRef.current.geometry.userData.originalPos;

        for (let i = 0; i < positions.count; i++) {
            const x = originalPos[i * 3];
            const y = originalPos[i * 3 + 1];

            // Gentle wave formula
            const wave1 = Math.sin(x * 0.3 + time * 0.3) * 0.15;
            const wave2 = Math.sin(y * 0.2 + time * 0.25) * 0.12;
            const z = wave1 + wave2;

            positions.setZ(i, z);
        }

        positions.needsUpdate = true;
    });

    return (
        <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 6, 0, 0]} position={[0, 0, -4]}>
            <meshBasicMaterial
                color="#ff6b6b"
                transparent
                opacity={0.25}
                wireframe={false}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}

/**
 * WebGLBackground - Subtle animated layer
 */
export function WebGLBackground() {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
        return null; // Respect accessibility
    }

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: -2,
            pointerEvents: 'none',
            opacity: 0.6
        }}>
            <Canvas
                camera={{ position: [0, 0, 5], fov: 50 }}
                gl={{ alpha: true, antialias: true }}
                style={{ background: 'transparent' }}
            >
                <ambientLight intensity={0.5} />
                <WaveMesh />
            </Canvas>
        </div>
    );
}
