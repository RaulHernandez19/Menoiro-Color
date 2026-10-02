import { useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createCharacterFigure } from '../../lib/three/characterFigure';

/**
 * Vista previa 3D del personaje. Se puede girar con el ratón/dedo y gira
 * sola si `autoRotate` está activo.
 *
 * @param {{
 *   colors: { dominant: string, secondary: string, accent: string, skin: string },
 *   highlight?: 'dominant'|'secondary'|'accent'|null,
 *   autoRotate?: boolean,
 *   onProportions?: (proportions: object) => void,
 *   ref?: import('react').Ref<{ capture: () => string }>,
 * }} props
 */
export default function CharacterPreview3D({ colors, highlight = null, autoRotate = true, onProportions, className = '', ref }) {
    const containerRef = useRef(null);
    const stateRef = useRef(null);

    useImperativeHandle(ref, () => ({
        capture: () => {
            const { renderer, scene, camera } = stateRef.current;
            renderer.render(scene, camera);

            return renderer.domElement.toDataURL('image/png');
        },
    }));

    useEffect(() => {
        const container = containerRef.current;
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.domElement.className = 'block size-full';
        container.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
        camera.position.set(1.4, 1.35, 4.6);

        scene.add(new THREE.HemisphereLight('#ffffff', '#3a3550', 1.5));
        const key = new THREE.DirectionalLight('#ffffff', 2.4);
        key.position.set(2.5, 3.5, 3);
        scene.add(key);

        const figure = createCharacterFigure();
        scene.add(figure.group);
        onProportions?.(figure.proportions);

        // Peana: disco suave bajo los pies.
        const base = new THREE.Mesh(
            new THREE.CircleGeometry(0.75, 64),
            new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.06 }),
        );
        base.rotation.x = -Math.PI / 2;
        base.position.y = -0.005;
        scene.add(base);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.target.set(0, 0.95, 0);
        controls.enablePan = false;
        controls.minDistance = 2.4;
        controls.maxDistance = 8;
        controls.autoRotateSpeed = 1.6;
        controls.enableDamping = true;
        controls.update();

        const resize = () => {
            const { clientWidth, clientHeight } = container;

            if (!clientWidth || !clientHeight) {
                return;
            }

            renderer.setSize(clientWidth, clientHeight, false);
            camera.aspect = clientWidth / clientHeight;
            camera.updateProjectionMatrix();
        };

        const observer = new ResizeObserver(resize);
        observer.observe(container);
        resize();

        renderer.setAnimationLoop(() => {
            controls.update();
            renderer.render(scene, camera);
        });

        stateRef.current = { renderer, scene, camera, controls, figure };

        return () => {
            renderer.setAnimationLoop(null);
            observer.disconnect();
            controls.dispose();
            figure.dispose();
            base.geometry.dispose();
            base.material.dispose();
            renderer.dispose();
            renderer.domElement.remove();
            stateRef.current = null;
        };
        // onProportions solo se lee al montar.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        stateRef.current?.figure.setColors(colors, highlight);
    }, [colors, highlight]);

    useEffect(() => {
        if (stateRef.current) {
            stateRef.current.controls.autoRotate = autoRotate;
        }
    }, [autoRotate]);

    return <div ref={containerRef} className={`cursor-grab active:cursor-grabbing ${className}`} />;
}
