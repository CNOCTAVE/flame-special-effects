// flame-special-effects - flame special effects.
// Copyright (C) 2024-2025  Yu Hongbo, CNOCTAVE

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.

// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define(['three'], factory);
    } else if (typeof exports === 'object') {
        // Node, CommonJS-like
        module.exports = factory(require('three'));
    } else {
        // Browser globals (root is window)
        root.FlameSpecialEffects = factory(root.THREE);
    }
}(this, function (THREE) {
    var renderer, scene, camera, flameMesh, animationId, container, currentLevel = 50;
    var flameTexture;
    // 贴图加载器
    var loader = new THREE.TextureLoader();
    loader.load('flame-apperance.png', function(tex) {
        flameTexture = tex;
        flameTexture.wrapS = flameTexture.wrapT = THREE.ClampToEdgeWrapping;
        flameTexture.minFilter = THREE.LinearFilter;
    });

    var vertexShader = `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;
    var fragmentShader = `
        varying vec2 vUv;
        uniform float time;
        uniform float intensity;
        uniform sampler2D flameMap;
        void main() {
            // 动态扰动uv，模拟火焰跳动
            float offset = 0.04 * sin(12.0 * vUv.x + time * 12.0) * (1.0 - vUv.y) * intensity;
            vec2 uv = vUv + vec2(0.0, offset);
            vec4 texColor = texture2D(flameMap, uv);
            // 颜色增强和透明度调节
            float alpha = texColor.a * intensity;
            vec3 color = texColor.rgb * (0.7 + 0.6 * intensity);
            gl_FragColor = vec4(color, alpha);
        }
    `;

    function createFlame(level) {
        var geometry = new THREE.PlaneGeometry(2, 2, 32, 32);
        var material = new THREE.ShaderMaterial({
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            transparent: true,
            uniforms: {
                time: { value: 0 },
                intensity: { value: level / 100 },
                flameMap: { value: flameTexture || null }
            }
        });
        return new THREE.Mesh(geometry, material);
    }

    function animate() {
        if (!flameMesh) return;
        flameMesh.material.uniforms.time.value += 0.02;
        if (flameTexture && flameMesh.material.uniforms.flameMap.value !== flameTexture) {
            flameMesh.material.uniforms.flameMap.value = flameTexture;
        }
        renderer.render(scene, camera);
        animationId = requestAnimationFrame(animate);
    }

    function init(containerId) {
        if (renderer) return; // 已初始化
        container = document.getElementById(containerId);
        if (!container) throw new Error('Container not found');
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(renderer.domElement);
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
        camera.position.z = 4;
        // 拉伸火焰平面以适应div尺寸
        var planeWidth = 1, planeHeight = 2;
        var aspectDiv = container.clientWidth / container.clientHeight;
        if (aspectDiv > 0) {
            planeWidth = aspectDiv * planeHeight;
        }
        flameMesh = createFlame(currentLevel);
        flameMesh.scale.set(planeWidth, planeHeight, 1);
        scene.add(flameMesh);
        animate();
    }

    function destroy() {
        if (animationId) cancelAnimationFrame(animationId);
        if (renderer && renderer.domElement && container) {
            container.removeChild(renderer.domElement);
        }
        if (flameMesh) {
            scene.remove(flameMesh);
            flameMesh.geometry.dispose();
            flameMesh.material.dispose();
            flameMesh = null;
        }
        renderer && renderer.dispose && renderer.dispose();
        renderer = scene = camera = container = null;
    }

    function changeLevel(level) {
        level = Math.max(0, Math.min(100, level));
        currentLevel = level;
        if (flameMesh && flameMesh.material && flameMesh.material.uniforms.intensity) {
            flameMesh.material.uniforms.intensity.value = level / 100;
        }
    }

    return {
        init: init,
        destroy: destroy,
        changeLevel: changeLevel
    };
}));
