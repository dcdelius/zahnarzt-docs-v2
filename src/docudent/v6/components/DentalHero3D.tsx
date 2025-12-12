/**
 * DentalHero3D - Low-Poly Tooth Shard Cluster
 * 
 * A geometric, futuristic 3D dental element for the Docudent V6 Hero section.
 * Built with React Three Fiber and animated with @react-spring/three.
 * 
 * Design: Warm coral/peach color palette, matte materials, soft lighting.
 */

import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { useSpring, animated, config } from '@react-spring/three';
import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════
// SHARD DATA (from JSON schema)
// ═══════════════════════════════════════════════════════════════

interface ShardData {
    id: string;
    position: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    colorHint: string;
}

const SHARDS: ShardData[] = [
    // ═══════════════════════════════════════════════════════════════
    // CROWN SHARDS - Wide and flat (x > y)
    // ═══════════════════════════════════════════════════════════════
    {
        id: "crown_front_left",
        position: { x: -0.35, y: 0.45, z: 0.05 },
        scale: { x: 0.50, y: 0.18, z: 0.28 },  // Wide, flat
        rotation: { x: 0.0, y: -0.20, z: -0.10 },
        colorHint: "#F87A7A"
    },
    {
        id: "crown_front_right",
        position: { x: 0.35, y: 0.45, z: 0.02 },
        scale: { x: 0.50, y: 0.16, z: 0.28 },  // Wide, flat
        rotation: { x: 0.0, y: 0.18, z: 0.08 },
        colorHint: "#F69A7C"
    },
    {
        id: "crown_back_left",
        position: { x: -0.40, y: 0.28, z: -0.10 },
        scale: { x: 0.42, y: 0.14, z: 0.24 },  // Wide, flat
        rotation: { x: -0.10, y: -0.25, z: -0.05 },
        colorHint: "#F7B88C"
    },
    {
        id: "crown_back_right",
        position: { x: 0.40, y: 0.28, z: -0.12 },
        scale: { x: 0.42, y: 0.14, z: 0.24 },  // Wide, flat
        rotation: { x: -0.08, y: 0.22, z: 0.04 },
        colorHint: "#FDD9B5"
    },
    {
        id: "cusp_center",
        position: { x: 0.0, y: 0.50, z: -0.04 },
        scale: { x: 0.38, y: 0.12, z: 0.30 },  // Wide, very flat (top cusp)
        rotation: { x: 0.05, y: 0.0, z: 0.0 },
        colorHint: "#FFB199"
    },
    // ═══════════════════════════════════════════════════════════════
    // TRANSITION SHARDS - Between crown and roots
    // ═══════════════════════════════════════════════════════════════
    {
        id: "root_left_upper",
        position: { x: -0.22, y: 0.08, z: 0.02 },
        scale: { x: 0.22, y: 0.32, z: 0.18 },  // Tall, narrower
        rotation: { x: 0.12, y: -0.10, z: -0.08 },
        colorHint: "#F69A7C"
    },
    {
        id: "root_right_upper",
        position: { x: 0.22, y: 0.08, z: -0.02 },
        scale: { x: 0.22, y: 0.32, z: 0.18 },  // Tall, narrower
        rotation: { x: 0.10, y: 0.12, z: 0.06 },
        colorHint: "#F7B88C"
    },
    // ═══════════════════════════════════════════════════════════════
    // ROOT SHARDS - Narrow and tall (y >> x)
    // ═══════════════════════════════════════════════════════════════
    {
        id: "root_left_lower",
        position: { x: -0.18, y: -0.28, z: 0.00 },
        scale: { x: 0.14, y: 0.48, z: 0.14 },  // Very tall, narrow
        rotation: { x: 0.18, y: -0.05, z: -0.06 },
        colorHint: "#F87A7A"
    },
    {
        id: "root_right_lower",
        position: { x: 0.18, y: -0.28, z: -0.02 },
        scale: { x: 0.14, y: 0.48, z: 0.14 },  // Very tall, narrow
        rotation: { x: 0.16, y: 0.06, z: 0.06 },
        colorHint: "#F69A7C"
    },
    {
        id: "root_center_back",
        position: { x: 0.0, y: -0.22, z: -0.14 },
        scale: { x: 0.16, y: 0.40, z: 0.16 },  // Tall, narrow (third root)
        rotation: { x: 0.22, y: 0.0, z: 0.0 },
        colorHint: "#F7B88C"
    },
    // ═══════════════════════════════════════════════════════════════
    // SIDE FLARES - Small accent pieces
    // ═══════════════════════════════════════════════════════════════
    {
        id: "side_flare_left",
        position: { x: -0.55, y: 0.12, z: 0.04 },
        scale: { x: 0.16, y: 0.20, z: 0.14 },  // Small accent
        rotation: { x: 0.0, y: -0.30, z: -0.18 },
        colorHint: "#FBCDB2"
    },
    {
        id: "side_flare_right",
        position: { x: 0.55, y: 0.12, z: -0.02 },
        scale: { x: 0.16, y: 0.20, z: 0.14 },  // Small accent
        rotation: { x: 0.0, y: 0.32, z: 0.16 },
        colorHint: "#FDDDC8"
    }
];

// ═══════════════════════════════════════════════════════════════
// SHARD COMPONENT
// ═══════════════════════════════════════════════════════════════

interface ShardProps {
    data: ShardData;
    floatParams: { freq: number; amplitude: number; phase: number };
    explodeFactor: number;
    emissiveIntensity: number;
}

function Shard({ data, floatParams, explodeFactor, emissiveIntensity }: ShardProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const basePosition = useMemo(() => new THREE.Vector3(
        data.position.x,
        data.position.y,
        data.position.z
    ), [data.position]);

    useFrame(({ clock }) => {
        if (!meshRef.current) return;

        const time = clock.getElapsedTime();

        // Floating animation
        const floatY = Math.sin(time * floatParams.freq + floatParams.phase) * floatParams.amplitude;

        // Explode effect: move position outward from center
        const explodedPos = basePosition.clone().multiplyScalar(explodeFactor);

        meshRef.current.position.set(
            explodedPos.x,
            explodedPos.y + floatY,
            explodedPos.z
        );
    });

    return (
        <mesh
            ref={meshRef}
            position={[data.position.x, data.position.y, data.position.z]}
            rotation={[data.rotation.x, data.rotation.y, data.rotation.z]}
            scale={[data.scale.x, data.scale.y, data.scale.z]}
        >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
                color={data.colorHint}
                roughness={0.75}
                metalness={0}
                emissive={data.colorHint}
                emissiveIntensity={emissiveIntensity}
            />
        </mesh>
    );
}

// ═══════════════════════════════════════════════════════════════
// TOOTH SHARD CLUSTER
// ═══════════════════════════════════════════════════════════════

function ToothShardCluster() {
    const groupRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);

    // Generate random float parameters for each shard
    const floatParamsMap = useMemo(() => {
        return SHARDS.map(() => ({
            freq: 0.3 + Math.random() * 0.3,      // 0.3–0.6
            amplitude: 0.03 + Math.random() * 0.04, // 0.03–0.07
            phase: Math.random() * Math.PI * 2     // 0–2π
        }));
    }, []);

    // Spring animation for hover effects
    const { explodeFactor, rotationSpeed, emissiveIntensity } = useSpring({
        explodeFactor: hovered ? 1.15 : 1.0,
        rotationSpeed: hovered ? 1.5 : 1.0,
        emissiveIntensity: hovered ? 0.20 : 0.08,
        config: { tension: 120, friction: 14 }
    });

    // Group rotation animation
    useFrame(({ clock }) => {
        if (!groupRef.current) return;

        // One full rotation in ~30 seconds
        const baseSpeed = (Math.PI * 2) / 30; // radians per second
        const speedFactor = rotationSpeed.get();

        groupRef.current.rotation.y = clock.getElapsedTime() * baseSpeed * speedFactor;
    });

    return (
        <animated.group
            ref={groupRef}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
        >
            {SHARDS.map((shard, index) => (
                <Shard
                    key={shard.id}
                    data={shard}
                    floatParams={floatParamsMap[index]}
                    explodeFactor={explodeFactor.get()}
                    emissiveIntensity={emissiveIntensity.get()}
                />
            ))}
        </animated.group>
    );
}

// ═══════════════════════════════════════════════════════════════
// ANIMATED SHARD CLUSTER (with spring values)
// ═══════════════════════════════════════════════════════════════

function AnimatedToothShardCluster() {
    const groupRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);

    // Generate random float parameters for each shard (stable across renders)
    const floatParamsMap = useMemo(() => {
        return SHARDS.map(() => ({
            freq: 0.3 + Math.random() * 0.3,
            amplitude: 0.03 + Math.random() * 0.04,
            phase: Math.random() * Math.PI * 2
        }));
    }, []);

    // Spring animation
    const springs = useSpring({
        explodeFactor: hovered ? 1.15 : 1.0,
        rotationSpeedFactor: hovered ? 1.5 : 1.0,
        emissiveIntensity: hovered ? 0.20 : 0.08,
        config: { tension: 120, friction: 14 }
    });

    // Rotation animation
    useFrame(({ clock }) => {
        if (!groupRef.current) return;
        const baseSpeed = (Math.PI * 2) / 30;
        groupRef.current.rotation.y = clock.getElapsedTime() * baseSpeed * springs.rotationSpeedFactor.get();
    });

    return (
        <group
            ref={groupRef}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
            scale={1.8}
            position={[0, 0, 0]}
        >
            {SHARDS.map((shard, index) => (
                <AnimatedShard
                    key={shard.id}
                    data={shard}
                    floatParams={floatParamsMap[index]}
                    springs={springs}
                />
            ))}
        </group>
    );
}

interface AnimatedShardProps {
    data: ShardData;
    floatParams: { freq: number; amplitude: number; phase: number };
    springs: {
        explodeFactor: { get: () => number };
        emissiveIntensity: { get: () => number };
    };
}

function AnimatedShard({ data, floatParams, springs }: AnimatedShardProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.MeshStandardMaterial>(null);

    useFrame(({ clock }) => {
        if (!meshRef.current || !materialRef.current) return;

        const time = clock.getElapsedTime();
        const explodeFactor = springs.explodeFactor.get();
        const emissiveIntensity = springs.emissiveIntensity.get();

        // Floating animation
        const floatY = Math.sin(time * floatParams.freq + floatParams.phase) * floatParams.amplitude;

        // Apply explode effect
        meshRef.current.position.set(
            data.position.x * explodeFactor,
            data.position.y * explodeFactor + floatY,
            data.position.z * explodeFactor
        );

        // Update emissive intensity
        materialRef.current.emissiveIntensity = emissiveIntensity;
    });

    return (
        <mesh
            ref={meshRef}
            position={[data.position.x, data.position.y, data.position.z]}
            rotation={[data.rotation.x, data.rotation.y, data.rotation.z]}
            scale={[data.scale.x, data.scale.y, data.scale.z]}
        >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
                ref={materialRef}
                color={data.colorHint}
                roughness={0.75}
                metalness={0}
                emissive={data.colorHint}
                emissiveIntensity={0.08}
            />
        </mesh>
    );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function DentalHero3D() {
    return (
        <div className="h-[400px] lg:h-[600px] w-full">
            <Canvas
                camera={{
                    position: [0, 0, 5],
                    fov: 35,
                    near: 0.1,
                    far: 100
                }}
                style={{ background: 'transparent' }}
            >
                {/* Lighting Setup */}

                {/* Key Light - Warm, from right-top */}
                <directionalLight
                    position={[4, 6, 4]}
                    intensity={1.2}
                    color="#FFF8F0"
                />

                {/* Ambient Light - Peach */}
                <ambientLight
                    intensity={0.4}
                    color="#FDD9B5"
                />

                {/* Rim Light - Apricot, from back-top */}
                <pointLight
                    position={[-3, 4, -4]}
                    intensity={0.8}
                    color="#F7B88C"
                />

                {/* Fill Light - Soft */}
                <pointLight
                    position={[-4, -2, 2]}
                    intensity={0.3}
                    color="#FFFFFF"
                />

                {/* Tooth Shard Cluster */}
                <AnimatedToothShardCluster />

                {/* Optional: Soft environment for reflections */}
                <Environment preset="sunset" />
            </Canvas>
        </div>
    );
}

export default DentalHero3D;
