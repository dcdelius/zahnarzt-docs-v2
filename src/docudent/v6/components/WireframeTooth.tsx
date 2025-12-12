/**
 * WireframeTooth3D - Low-Poly Triangulated Dental Element (STATIC)
 * 
 * A full 3D triangulated mesh tooth with glowing coral edges.
 * Style inspired by geometric low-poly aesthetic with warm color palette.
 * 
 * Animation: DISABLED for now
 */

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Tube } from '@react-three/drei';
import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════
// COLORS - WARM CORAL SYSTEM
// ═══════════════════════════════════════════════════════════════

const colors = {
    wireframe: '#FFB199',      // Coral light - main wireframe
    wireframeGlow: '#FF6B4A',  // Coral strong - glow
    ribbon1: '#F87A7A',        // Warm pink
    ribbon2: '#F69A7C',        // Warm peach
};

// ═══════════════════════════════════════════════════════════════
// LOW-POLY TOOTH GEOMETRY
// ═══════════════════════════════════════════════════════════════

/**
 * Creates a low-poly molar geometry with visible triangulation
 * and two distinct roots.
 */
function createLowPolyToothGeometry(): THREE.BufferGeometry {
    const vertices: number[] = [];
    const indices: number[] = [];

    // Crown vertices (top portion - wide, bulging)
    const crownTop = [
        // Top surface (5 points)
        [0, 0.7, 0],           // 0: center top
        [-0.25, 0.65, 0.25],   // 1: front left
        [0.25, 0.65, 0.25],    // 2: front right
        [0.25, 0.65, -0.25],   // 3: back right
        [-0.25, 0.65, -0.25],  // 4: back left
    ];

    const crownMid = [
        // Crown bulge (8 points)
        [-0.35, 0.45, 0.35],   // 5
        [0.35, 0.45, 0.35],    // 6
        [0.40, 0.45, 0],       // 7
        [0.35, 0.45, -0.35],   // 8
        [-0.35, 0.45, -0.35],  // 9
        [-0.40, 0.45, 0],      // 10
        [0, 0.45, 0.40],       // 11: front center
        [0, 0.45, -0.40],      // 12: back center
    ];

    const crownLower = [
        // Crown bottom / neck (8 points)
        [-0.28, 0.15, 0.28],   // 13
        [0.28, 0.15, 0.28],    // 14
        [0.32, 0.15, 0],       // 15
        [0.28, 0.15, -0.28],   // 16
        [-0.28, 0.15, -0.28],  // 17
        [-0.32, 0.15, 0],      // 18
        [0, 0.15, 0.32],       // 19
        [0, 0.15, -0.32],      // 20
    ];

    // Root split area
    const rootSplit = [
        [0, 0, 0],             // 21: center split
        [-0.15, -0.05, 0],     // 22: left root start
        [0.15, -0.05, 0],      // 23: right root start
    ];

    // Left root (4 points)
    const leftRoot = [
        [-0.18, -0.25, 0.08],  // 24
        [-0.18, -0.25, -0.08], // 25
        [-0.12, -0.55, 0.05],  // 26
        [-0.12, -0.55, -0.05], // 27
        [-0.08, -0.75, 0],     // 28: left tip
    ];

    // Right root (4 points)
    const rightRoot = [
        [0.18, -0.25, 0.08],   // 29
        [0.18, -0.25, -0.08],  // 30
        [0.12, -0.55, 0.05],   // 31
        [0.12, -0.55, -0.05],  // 32
        [0.08, -0.75, 0],      // 33: right tip
    ];

    // Combine all vertices
    const allVerts = [
        ...crownTop, ...crownMid, ...crownLower,
        ...rootSplit, ...leftRoot, ...rightRoot
    ];

    allVerts.forEach(v => vertices.push(v[0], v[1], v[2]));

    // Define triangular faces (indices)
    // Crown top
    indices.push(0, 1, 2);
    indices.push(0, 2, 3);
    indices.push(0, 3, 4);
    indices.push(0, 4, 1);

    // Crown top to mid
    indices.push(1, 5, 11);
    indices.push(1, 11, 2);
    indices.push(2, 11, 6);
    indices.push(2, 6, 7);
    indices.push(2, 7, 3);
    indices.push(3, 7, 8);
    indices.push(3, 8, 12);
    indices.push(3, 12, 4);
    indices.push(4, 12, 9);
    indices.push(4, 9, 10);
    indices.push(4, 10, 1);
    indices.push(1, 10, 5);

    // Crown mid to lower
    indices.push(5, 13, 19);
    indices.push(5, 19, 11);
    indices.push(11, 19, 14);
    indices.push(11, 14, 6);
    indices.push(6, 14, 15);
    indices.push(6, 15, 7);
    indices.push(7, 15, 16);
    indices.push(7, 16, 8);
    indices.push(8, 16, 20);
    indices.push(8, 20, 12);
    indices.push(12, 20, 17);
    indices.push(12, 17, 9);
    indices.push(9, 17, 18);
    indices.push(9, 18, 10);
    indices.push(10, 18, 13);
    indices.push(10, 13, 5);

    // Crown lower to root split
    indices.push(13, 22, 21);
    indices.push(13, 21, 19);
    indices.push(19, 21, 23);
    indices.push(19, 23, 14);
    indices.push(14, 23, 15);
    indices.push(15, 23, 21);
    indices.push(15, 21, 16);
    indices.push(16, 21, 20);
    indices.push(20, 21, 17);
    indices.push(17, 21, 22);
    indices.push(17, 22, 18);
    indices.push(18, 22, 13);

    // Left root
    indices.push(22, 24, 25);
    indices.push(24, 26, 27);
    indices.push(24, 27, 25);
    indices.push(26, 28, 27);

    // Right root
    indices.push(23, 29, 30);
    indices.push(29, 31, 32);
    indices.push(29, 32, 30);
    indices.push(31, 33, 32);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
}

// ═══════════════════════════════════════════════════════════════
// WIREFRAME TOOTH MESH
// ═══════════════════════════════════════════════════════════════

function ToothWireframe() {
    const { edgesGeometry } = useMemo(() => {
        const tooth = createLowPolyToothGeometry();
        // Lower threshold = more edges visible
        const edges = new THREE.EdgesGeometry(tooth, 1);
        return { edgesGeometry: edges };
    }, []);

    return (
        <group>
            {/* Main wireframe */}
            <lineSegments geometry={edgesGeometry}>
                <lineBasicMaterial
                    color={colors.wireframe}
                    transparent
                    opacity={0.95}
                />
            </lineSegments>

            {/* Glow layer */}
            <lineSegments
                geometry={edgesGeometry}
                scale={1.015}
            >
                <lineBasicMaterial
                    color={colors.wireframeGlow}
                    transparent
                    opacity={0.35}
                />
            </lineSegments>
        </group>
    );
}

// ═══════════════════════════════════════════════════════════════
// ORBITING RINGS (STATIC)
// ═══════════════════════════════════════════════════════════════

function OrbitingRings() {
    // Create ring curves
    const ring1 = useMemo(() => {
        const points: THREE.Vector3[] = [];
        for (let i = 0; i <= 64; i++) {
            const angle = (i / 64) * Math.PI * 2;
            points.push(new THREE.Vector3(
                Math.cos(angle) * 0.7,
                Math.sin(angle * 2) * 0.05,
                Math.sin(angle) * 0.7
            ));
        }
        return new THREE.CatmullRomCurve3(points, true);
    }, []);

    const ring2 = useMemo(() => {
        const points: THREE.Vector3[] = [];
        for (let i = 0; i <= 64; i++) {
            const angle = (i / 64) * Math.PI * 2;
            points.push(new THREE.Vector3(
                Math.cos(angle) * 0.85,
                Math.sin(angle * 2) * 0.04,
                Math.sin(angle) * 0.85
            ));
        }
        return new THREE.CatmullRomCurve3(points, true);
    }, []);

    return (
        <group position={[0, 0.1, 0]}>
            {/* Inner ring */}
            <group rotation={[0.2, 0, 0]}>
                <Tube args={[ring1, 64, 0.012, 4, true]}>
                    <meshBasicMaterial
                        color={colors.ribbon1}
                        transparent
                        opacity={0.25}
                    />
                </Tube>
            </group>

            {/* Outer ring */}
            <group rotation={[0.35, 0.3, 0]}>
                <Tube args={[ring2, 64, 0.008, 4, true]}>
                    <meshBasicMaterial
                        color={colors.ribbon2}
                        transparent
                        opacity={0.18}
                    />
                </Tube>
            </group>
        </group>
    );
}

// ═══════════════════════════════════════════════════════════════
// MAIN SCENE (STATIC - NO ANIMATION)
// ═══════════════════════════════════════════════════════════════

function ToothScene() {
    return (
        <group
            rotation={[0.15, 0.3, 0]}
            position={[0, -0.05, 0]}
            scale={1.1}
        >
            <ToothWireframe />
            <OrbitingRings />
        </group>
    );
}

// ═══════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════

export function WireframeTooth() {
    return (
        <div className="h-[380px] lg:h-[520px] w-full">
            <Canvas
                camera={{
                    position: [0, 0.2, 2.8],
                    fov: 38,
                    near: 0.1,
                    far: 100
                }}
                style={{ background: 'transparent' }}
                gl={{ alpha: true, antialias: true }}
            >
                <ambientLight intensity={0.2} />
                <ToothScene />
            </Canvas>
        </div>
    );
}

export default WireframeTooth;
