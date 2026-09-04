'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Color, Group } from 'three';
import ThreeGlobe from 'three-globe';

export type AudienceCountry = {
    code: string;
    name: string;
    pageViews: number;
    visits: number;
};

type GeoFeature = {
    properties?: Record<string, unknown>;
};

function featureCode(feature: GeoFeature) {
    const properties = feature.properties || {};
    const raw = properties.ISO_A2_EH || properties.ISO_A2 || properties.iso_a2 || properties.WB_A2;
    return typeof raw === 'string' ? raw.toUpperCase() : '';
}

function AudienceGlobe({ countries, selectedCode }: { countries: AudienceCountry[]; selectedCode?: string | null }) {
    const groupRef = useRef<Group | null>(null);
    const globeRef = useRef<ThreeGlobe | null>(null);
    const [features, setFeatures] = useState<GeoFeature[]>([]);
    const values = useMemo(() => new Map(countries.map((country) => [country.code, country.pageViews])), [countries]);
    const maxValue = Math.max(1, ...countries.map((country) => country.pageViews));

    useEffect(() => {
        let cancelled = false;
        fetch('https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
            .then((response) => {
                if (!response.ok) throw new Error('Could not load map geometry.');
                return response.json() as Promise<{ features?: GeoFeature[] }>;
            })
            .then((payload) => {
                if (!cancelled) setFeatures(Array.isArray(payload.features) ? payload.features : []);
            })
            .catch(() => {
                if (!cancelled) setFeatures([]);
            });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (!groupRef.current || globeRef.current) return;
        const globe = new ThreeGlobe();
        globeRef.current = globe;
        groupRef.current.add(globe);

        const material = globe.globeMaterial() as unknown as {
            color: Color;
            emissive: Color;
            emissiveIntensity: number;
            shininess: number;
        };
        material.color = new Color('#071019');
        material.emissive = new Color('#02070b');
        material.emissiveIntensity = 0.28;
        material.shininess = 0.55;
    }, []);

    useEffect(() => {
        const globe = globeRef.current;
        if (!globe || features.length === 0) return;

        globe
            .hexPolygonsData(features)
            .hexPolygonResolution(3)
            .hexPolygonMargin(0.55)
            .hexPolygonColor((rawFeature: object) => {
                const code = featureCode(rawFeature as GeoFeature);
                const value = values.get(code) || 0;
                if (selectedCode && code === selectedCode) return 'rgba(125,211,252,0.98)';
                if (!value) return 'rgba(148,163,184,0.10)';
                const strength = Math.sqrt(value / maxValue);
                return `rgba(56,189,248,${0.24 + strength * 0.62})`;
            })
            .showAtmosphere(true)
            .atmosphereColor('#38bdf8')
            .atmosphereAltitude(0.08);
    }, [features, maxValue, selectedCode, values]);

    return <group ref={groupRef} />;
}

export default function AudienceWorldMapCanvas({
    countries,
    selectedCode,
}: {
    countries: AudienceCountry[];
    selectedCode?: string | null;
}) {
    return (
        <Canvas camera={{ position: [0, 0, 300], fov: 50 }} dpr={[1, 1.5]}>
            <ambientLight color="#dbeafe" intensity={0.55} />
            <directionalLight color="#ffffff" position={[-300, 160, 300]} intensity={1.1} />
            <pointLight color="#38bdf8" position={[180, 180, 250]} intensity={1.2} />
            <AudienceGlobe countries={countries} selectedCode={selectedCode} />
            <OrbitControls
                enablePan={false}
                enableZoom={false}
                autoRotate
                autoRotateSpeed={0.45}
                minDistance={300}
                maxDistance={300}
                minPolarAngle={Math.PI / 3.4}
                maxPolarAngle={Math.PI - Math.PI / 3.4}
            />
        </Canvas>
    );
}
