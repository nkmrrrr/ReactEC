import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as THREE from 'three';
import MobileControls from './MobileControls';
import GameUI from './GameUI';
import './TitanGame.css';

// ===== Constants =====
const WORLD_SIZE = 400;
const BUILDING_COUNT = 60;
const WALL_HEIGHT = 50;
const GRAVITY = -30;
const PLAYER_SPEED = 25;
const PLAYER_SPRINT_SPEED = 45;
const WIRE_SPEED = 80;
const WIRE_MAX_LENGTH = 120;
const ATTACK_RANGE = 12;
const ATTACK_DAMAGE = 34;
const TITAN_SPEED_BASE = 4;

export default function TitanGame() {
  const mountRef = useRef(null);
  const gameRef = useRef(null);
  const [gameState, setGameState] = useState({
    hp: 100,
    maxHp: 100,
    gas: 100,
    maxGas: 100,
    score: 0,
    kills: 0,
    combo: 0,
    titanCount: 0,
    isWired: false,
    gameOver: false,
    gameStarted: false,
    message: '',
    messageTimer: 0,
  });

  // ===== Input state =====
  const inputRef = useRef({
    moveX: 0,
    moveY: 0,
    jump: false,
    attack: false,
    wire: false,
    sprint: false,
  });

  // ===== Create Titan Mesh =====
  const createTitan = useCallback((scene, position, size = 1) => {
    const titan = new THREE.Group();
    const scale = 8 + size * 6; // 8m ~ 14m class

    // Skin color variations
    const skinColors = [0xd4a574, 0xc4956a, 0xb8896e, 0xe0b090];
    const skinColor = skinColors[Math.floor(Math.random() * skinColors.length)];
    const skinMat = new THREE.MeshLambertMaterial({ color: skinColor });
    const darkSkinMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(skinColor).multiplyScalar(0.8) });

    // Body
    const bodyGeo = new THREE.BoxGeometry(scale * 0.5, scale * 0.5, scale * 0.3);
    const body = new THREE.Mesh(bodyGeo, skinMat);
    body.position.y = scale * 0.5;
    body.castShadow = true;
    titan.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(scale * 0.18, 8, 8);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = scale * 0.85;
    head.castShadow = true;
    titan.add(head);

    // Eyes (glowing)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3333, emissive: 0xff0000 });
    const eyeGeo = new THREE.SphereGeometry(scale * 0.03, 6, 6);
    [-1, 1].forEach(side => {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * scale * 0.07, scale * 0.88, scale * 0.15);
      titan.add(eye);
    });

    // Mouth
    const mouthGeo = new THREE.BoxGeometry(scale * 0.15, scale * 0.04, scale * 0.05);
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x880000 });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, scale * 0.78, scale * 0.15);
    titan.add(mouth);

    // Arms
    const armGeo = new THREE.BoxGeometry(scale * 0.15, scale * 0.45, scale * 0.15);
    [-1, 1].forEach(side => {
      const arm = new THREE.Mesh(armGeo, darkSkinMat);
      arm.position.set(side * scale * 0.35, scale * 0.45, 0);
      arm.castShadow = true;
      titan.add(arm);
    });

    // Legs
    const legGeo = new THREE.BoxGeometry(scale * 0.18, scale * 0.35, scale * 0.18);
    [-1, 1].forEach(side => {
      const leg = new THREE.Mesh(legGeo, darkSkinMat);
      leg.position.set(side * scale * 0.15, scale * 0.05, 0);
      leg.castShadow = true;
      titan.add(leg);
    });

    // Weak spot (nape - glowing)
    const napeGeo = new THREE.BoxGeometry(scale * 0.12, scale * 0.1, scale * 0.08);
    const napeMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
    const nape = new THREE.Mesh(napeGeo, napeMat);
    nape.position.set(0, scale * 0.75, -scale * 0.18);
    titan.add(nape);

    titan.position.copy(position);
    titan.userData = {
      type: 'titan',
      hp: 100 * size,
      maxHp: 100 * size,
      scale: scale,
      speed: TITAN_SPEED_BASE + Math.random() * 2,
      state: 'wander',
      stateTimer: 0,
      wanderDir: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize(),
      attackCooldown: 0,
      hitFlash: 0,
      size: size,
    };

    scene.add(titan);
    return titan;
  }, []);

  // ===== Create Building =====
  const createBuilding = useCallback((scene, x, z) => {
    const height = 15 + Math.random() * 40;
    const width = 6 + Math.random() * 10;
    const depth = 6 + Math.random() * 10;

    const buildingGroup = new THREE.Group();

    // Main structure
    const colors = [0x8899aa, 0x7788aa, 0x99aabb, 0x667788, 0x556677];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const geo = new THREE.BoxGeometry(width, height, depth);
    const mat = new THREE.MeshLambertMaterial({ color });
    const building = new THREE.Mesh(geo, mat);
    building.position.y = height / 2;
    building.castShadow = true;
    building.receiveShadow = true;
    buildingGroup.add(building);

    // Windows
    const windowMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
    const windowSize = 0.8;
    const windowSpacingY = 4;
    const windowSpacingX = 3;

    for (let wy = 3; wy < height - 2; wy += windowSpacingY) {
      for (let wx = -width / 2 + 2; wx < width / 2 - 1; wx += windowSpacingX) {
        if (Math.random() > 0.3) {
          const wGeo = new THREE.PlaneGeometry(windowSize, windowSize * 1.3);
          // Front
          const w1 = new THREE.Mesh(wGeo, windowMat);
          w1.position.set(wx, wy, depth / 2 + 0.05);
          buildingGroup.add(w1);
          // Back
          const w2 = new THREE.Mesh(wGeo, windowMat);
          w2.position.set(wx, wy, -depth / 2 - 0.05);
          w2.rotation.y = Math.PI;
          buildingGroup.add(w2);
        }
      }
    }

    buildingGroup.position.set(x, 0, z);
    buildingGroup.userData = {
      type: 'building',
      width,
      height,
      depth,
    };

    scene.add(buildingGroup);
    return buildingGroup;
  }, []);

  // ===== Initialize Game =====
  useEffect(() => {
    if (!mountRef.current) return;

    // ---- Renderer ----
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x87ceeb);
    mountRef.current.appendChild(renderer.domElement);

    // ---- Scene ----
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87ceeb, 100, WORLD_SIZE * 0.8);

    // ---- Camera ----
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.5, 500);

    // ---- Lights ----
    const ambientLight = new THREE.AmbientLight(0x6688aa, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    dirLight.position.set(50, 80, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.left = -100;
    dirLight.shadow.camera.right = 100;
    dirLight.shadow.camera.top = 100;
    dirLight.shadow.camera.bottom = -100;
    scene.add(dirLight);

    const hemiLight = new THREE.HemisphereLight(0x88bbff, 0x445522, 0.4);
    scene.add(hemiLight);

    // ---- Ground ----
    const groundGeo = new THREE.PlaneGeometry(WORLD_SIZE * 2, WORLD_SIZE * 2);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x556644 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // ---- Walls (surrounding city) ----
    const wallMat = new THREE.MeshLambertMaterial({ color: 0xaaa088 });
    const wallThickness = 4;
    const halfWorld = WORLD_SIZE / 2;
    const wallPositions = [
      { pos: [0, WALL_HEIGHT / 2, -halfWorld], size: [WORLD_SIZE, WALL_HEIGHT, wallThickness] },
      { pos: [0, WALL_HEIGHT / 2, halfWorld], size: [WORLD_SIZE, WALL_HEIGHT, wallThickness] },
      { pos: [-halfWorld, WALL_HEIGHT / 2, 0], size: [wallThickness, WALL_HEIGHT, WORLD_SIZE] },
      { pos: [halfWorld, WALL_HEIGHT / 2, 0], size: [wallThickness, WALL_HEIGHT, WORLD_SIZE] },
    ];
    wallPositions.forEach(w => {
      const geo = new THREE.BoxGeometry(...w.size);
      const wall = new THREE.Mesh(geo, wallMat);
      wall.position.set(...w.pos);
      wall.castShadow = true;
      wall.receiveShadow = true;
      scene.add(wall);
    });

    // ---- Buildings ----
    const buildings = [];
    for (let i = 0; i < BUILDING_COUNT; i++) {
      const x = (Math.random() - 0.5) * (WORLD_SIZE - 40);
      const z = (Math.random() - 0.5) * (WORLD_SIZE - 40);
      // Don't place too close to center (player spawn)
      if (Math.abs(x) < 20 && Math.abs(z) < 20) continue;
      buildings.push(createBuilding(scene, x, z));
    }

    // ---- Player ----
    const player = new THREE.Group();
    // Body
    const playerBodyMat = new THREE.MeshLambertMaterial({ color: 0x334455 });
    const playerBody = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.4), playerBodyMat);
    playerBody.position.y = 0.6;
    player.add(playerBody);
    // Cape (green)
    const capeMat = new THREE.MeshLambertMaterial({ color: 0x228844, side: THREE.DoubleSide });
    const cape = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.0), capeMat);
    cape.position.set(0, 0.7, -0.25);
    player.add(cape);
    // Head
    const playerHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 8, 8),
      new THREE.MeshLambertMaterial({ color: 0xddbb88 })
    );
    playerHead.position.y = 1.45;
    player.add(playerHead);
    // Blades
    const bladeMat = new THREE.MeshBasicMaterial({ color: 0xcccccc });
    [-1, 1].forEach(side => {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.8, 0.05), bladeMat);
      blade.position.set(side * 0.5, 0.5, 0);
      player.add(blade);
    });

    player.position.set(0, 0, 0);
    scene.add(player);

    // ---- Wire Visual ----
    const wireGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(), new THREE.Vector3()
    ]);
    const wireMat = new THREE.LineBasicMaterial({ color: 0xcccccc, linewidth: 2 });
    const wireLine = new THREE.Line(wireGeo, wireMat);
    wireLine.visible = false;
    scene.add(wireLine);

    // ---- Particles ----
    const particles = [];
    const particleGeo = new THREE.SphereGeometry(0.15, 4, 4);

    function spawnParticles(pos, color, count, speed) {
      for (let i = 0; i < count; i++) {
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
        const p = new THREE.Mesh(particleGeo, mat);
        p.position.copy(pos);
        p.userData = {
          vel: new THREE.Vector3(
            (Math.random() - 0.5) * speed,
            Math.random() * speed * 0.7,
            (Math.random() - 0.5) * speed
          ),
          life: 1.0,
        };
        scene.add(p);
        particles.push(p);
      }
    }

    // ---- Titans ----
    const titans = [];
    function spawnTitans(count) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 60 + Math.random() * 100;
        const pos = new THREE.Vector3(
          Math.cos(angle) * dist,
          0,
          Math.sin(angle) * dist
        );
        const size = 0.5 + Math.random() * 1.5;
        titans.push(createTitan(scene, pos, size));
      }
    }
    spawnTitans(5);

    // ---- Game State ----
    const state = {
      velocity: new THREE.Vector3(),
      onGround: true,
      wireTarget: null,
      wirePoint: null,
      isWired: false,
      hp: 100,
      gas: 100,
      score: 0,
      kills: 0,
      combo: 0,
      comboTimer: 0,
      cameraAngleY: 0,
      cameraAngleX: 0.3,
      attackCooldown: 0,
      slashEffects: [],
      gameOver: false,
      gameStarted: false,
      spawnTimer: 0,
      message: '',
      messageTimer: 0,
      dashTimer: 0,
    };

    gameRef.current = {
      renderer, scene, camera, player, buildings, titans,
      state, wireLine, particles, spawnParticles,
      spawnTitans: (n) => { spawnTitans(n); },
    };

    // ---- Keyboard (for desktop testing) ----
    const keys = {};
    const onKeyDown = (e) => { keys[e.code] = true; };
    const onKeyUp = (e) => { keys[e.code] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // ---- Resize ----
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    // ---- Game Loop ----
    const clock = new THREE.Clock();
    let animId;

    function gameLoop() {
      animId = requestAnimationFrame(gameLoop);
      const dt = Math.min(clock.getDelta(), 0.05);
      const input = inputRef.current;

      // Merge keyboard input
      if (keys['KeyW'] || keys['ArrowUp']) input.moveY = Math.max(input.moveY, 1);
      if (keys['KeyS'] || keys['ArrowDown']) input.moveY = Math.min(input.moveY, -1);
      if (keys['KeyA'] || keys['ArrowLeft']) input.moveX = Math.min(input.moveX, -1);
      if (keys['KeyD'] || keys['ArrowRight']) input.moveX = Math.max(input.moveX, 1);
      if (keys['Space']) input.jump = true;
      if (keys['KeyJ'] || keys['KeyZ']) input.attack = true;
      if (keys['KeyK'] || keys['KeyX']) input.wire = true;
      if (keys['ShiftLeft']) input.sprint = true;

      if (!state.gameStarted) {
        // Rotate camera around spawn
        state.cameraAngleY += dt * 0.3;
        const camDist = 20;
        camera.position.set(
          Math.sin(state.cameraAngleY) * camDist,
          10,
          Math.cos(state.cameraAngleY) * camDist
        );
        camera.lookAt(0, 5, 0);

        if (input.moveX !== 0 || input.moveY !== 0 || input.jump || input.attack) {
          state.gameStarted = true;
          state.message = '巨人を駆逐せよ！';
          state.messageTimer = 2;
          setGameState(prev => ({ ...prev, gameStarted: true, message: '巨人を駆逐せよ！', messageTimer: 2 }));
        }

        renderer.render(scene, camera);
        // Reset single-frame inputs
        input.jump = false;
        input.attack = false;
        input.wire = false;
        return;
      }

      if (state.gameOver) {
        renderer.render(scene, camera);
        input.jump = false;
        input.attack = false;
        input.wire = false;
        return;
      }

      // ---- Player Movement ----
      const speed = input.sprint ? PLAYER_SPRINT_SPEED : PLAYER_SPEED;
      const forward = new THREE.Vector3(
        -Math.sin(state.cameraAngleY),
        0,
        -Math.cos(state.cameraAngleY)
      );
      const right = new THREE.Vector3(forward.z, 0, -forward.x);

      const moveDir = new THREE.Vector3();
      moveDir.addScaledVector(forward, input.moveY);
      moveDir.addScaledVector(right, input.moveX);
      if (moveDir.length() > 0) moveDir.normalize();

      if (state.isWired && state.wirePoint) {
        // Wire movement - fly towards wire point
        const toWire = state.wirePoint.clone().sub(player.position);
        const wireDist = toWire.length();
        if (wireDist < 3 || state.gas <= 0) {
          state.isWired = false;
          wireLine.visible = false;
          state.velocity.y = Math.max(state.velocity.y, 15);
        } else {
          toWire.normalize();
          state.velocity.copy(toWire.multiplyScalar(WIRE_SPEED));
          state.gas = Math.max(0, state.gas - 20 * dt);
          state.onGround = false;

          // Update wire line
          const positions = wireLine.geometry.attributes.position.array;
          positions[0] = player.position.x;
          positions[1] = player.position.y + 1;
          positions[2] = player.position.z;
          positions[3] = state.wirePoint.x;
          positions[4] = state.wirePoint.y;
          positions[5] = state.wirePoint.z;
          wireLine.geometry.attributes.position.needsUpdate = true;
        }
      } else {
        // Normal movement
        if (state.onGround) {
          state.velocity.x = moveDir.x * speed;
          state.velocity.z = moveDir.z * speed;
        } else {
          // Air control
          state.velocity.x += moveDir.x * speed * 0.6 * dt;
          state.velocity.z += moveDir.z * speed * 0.6 * dt;
          // Air friction
          const horizSpeed = Math.sqrt(state.velocity.x ** 2 + state.velocity.z ** 2);
          if (horizSpeed > speed * 1.5) {
            state.velocity.x *= 0.98;
            state.velocity.z *= 0.98;
          }
        }
      }

      // Gravity
      if (!state.isWired) {
        state.velocity.y += GRAVITY * dt;
      }

      // Jump
      if (input.jump && state.onGround) {
        state.velocity.y = 15;
        state.onGround = false;
      }
      // Wall jump / double jump when in air
      if (input.jump && !state.onGround && state.gas > 5) {
        state.velocity.y = 12;
        state.gas = Math.max(0, state.gas - 5);
        spawnParticles(player.position.clone(), 0xaaddff, 5, 3);
      }

      // Wire action
      if (input.wire && !state.isWired && state.gas > 10) {
        // Find nearest wire-able surface (building top or wall)
        let bestTarget = null;
        let bestDist = WIRE_MAX_LENGTH;

        // Buildings
        buildings.forEach(b => {
          const bData = b.userData;
          const topPoint = new THREE.Vector3(
            b.position.x,
            bData.height,
            b.position.z
          );
          const dist = topPoint.distanceTo(player.position);
          if (dist < bestDist && topPoint.y > player.position.y) {
            bestDist = dist;
            bestTarget = topPoint;
          }
        });

        // Walls
        wallPositions.forEach(w => {
          const wp = new THREE.Vector3(
            w.pos[0] === 0 ? player.position.x : w.pos[0],
            WALL_HEIGHT,
            w.pos[2] === 0 ? player.position.z : w.pos[2]
          );
          const dist = wp.distanceTo(player.position);
          if (dist < bestDist) {
            bestDist = dist;
            bestTarget = wp;
          }
        });

        // Titans
        titans.forEach(t => {
          if (t.userData.hp <= 0) return;
          const napePos = t.position.clone();
          napePos.y += t.userData.scale * 0.75;
          const dist = napePos.distanceTo(player.position);
          if (dist < bestDist) {
            bestDist = dist;
            bestTarget = napePos;
          }
        });

        if (bestTarget) {
          state.wirePoint = bestTarget;
          state.isWired = true;
          state.gas -= 10;
          wireLine.visible = true;
          spawnParticles(player.position.clone(), 0xffffff, 3, 2);
        }
      }

      // Apply velocity
      player.position.addScaledVector(state.velocity, dt);

      // Ground collision
      if (player.position.y <= 0) {
        player.position.y = 0;
        state.velocity.y = 0;
        state.onGround = true;
        if (state.isWired) {
          state.isWired = false;
          wireLine.visible = false;
        }
      }

      // Building collision (simple)
      buildings.forEach(b => {
        const bData = b.userData;
        const dx = player.position.x - b.position.x;
        const dz = player.position.z - b.position.z;
        const halfW = bData.width / 2 + 0.5;
        const halfD = bData.depth / 2 + 0.5;

        if (Math.abs(dx) < halfW && Math.abs(dz) < halfD) {
          if (player.position.y < bData.height && player.position.y > bData.height - 2) {
            // Land on top
            player.position.y = bData.height;
            state.velocity.y = 0;
            state.onGround = true;
            if (state.isWired) {
              state.isWired = false;
              wireLine.visible = false;
            }
          } else if (player.position.y < bData.height - 2) {
            // Push out horizontally
            const overlapX = halfW - Math.abs(dx);
            const overlapZ = halfD - Math.abs(dz);
            if (overlapX < overlapZ) {
              player.position.x += Math.sign(dx) * overlapX;
            } else {
              player.position.z += Math.sign(dz) * overlapZ;
            }
          }
        }
      });

      // World bounds
      const bound = halfWorld - 3;
      player.position.x = Math.max(-bound, Math.min(bound, player.position.x));
      player.position.z = Math.max(-bound, Math.min(bound, player.position.z));

      // Rotate player towards movement direction
      if (moveDir.length() > 0.1) {
        const targetAngle = Math.atan2(moveDir.x, moveDir.z);
        player.rotation.y = targetAngle;
      }

      // Cape animation
      cape.rotation.x = Math.sin(Date.now() * 0.005) * 0.2 - 0.2;

      // ---- Attack ----
      state.attackCooldown -= dt;
      if (input.attack && state.attackCooldown <= 0) {
        state.attackCooldown = 0.3;

        // Slash effect
        const slashGeo = new THREE.RingGeometry(1, 3, 8, 1, 0, Math.PI);
        const slashMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide,
        });
        const slash = new THREE.Mesh(slashGeo, slashMat);
        slash.position.copy(player.position);
        slash.position.y += 1;
        slash.rotation.y = player.rotation.y;
        slash.userData = { life: 0.2 };
        scene.add(slash);
        state.slashEffects.push(slash);

        // Check titan hit
        titans.forEach(t => {
          if (t.userData.hp <= 0) return;
          const napePos = t.position.clone();
          napePos.y += t.userData.scale * 0.75;
          const dist = player.position.distanceTo(napePos);
          const bodyDist = player.position.distanceTo(t.position.clone().add(new THREE.Vector3(0, t.userData.scale * 0.5, 0)));

          // Nape hit (critical - must be behind/above)
          if (dist < ATTACK_RANGE) {
            const behindCheck = new THREE.Vector3(0, 0, -1).applyQuaternion(t.quaternion);
            const toPlayer = player.position.clone().sub(t.position).normalize();
            const dotProduct = behindCheck.dot(toPlayer);

            const isCritical = player.position.y > t.userData.scale * 0.5 && dotProduct > 0;
            const damage = isCritical ? t.userData.maxHp : ATTACK_DAMAGE;

            t.userData.hp -= damage;
            t.userData.hitFlash = 0.2;

            spawnParticles(
              napePos,
              isCritical ? 0xff4400 : 0xffaa00,
              isCritical ? 20 : 8,
              isCritical ? 15 : 8
            );

            if (isCritical) {
              state.message = 'うなじ斬り！！';
              state.messageTimer = 1.5;
            }

            if (t.userData.hp <= 0) {
              // Titan killed
              state.kills++;
              state.combo++;
              state.comboTimer = 5;
              const points = Math.floor(100 * t.userData.size * state.combo);
              state.score += points;
              state.message = state.combo > 1
                ? `${state.combo}コンボ！ +${points}pts`
                : `巨人撃破！ +${points}pts`;
              state.messageTimer = 2;

              spawnParticles(t.position.clone().add(new THREE.Vector3(0, t.userData.scale / 2, 0)), 0xff6600, 30, 20);

              // Steam dissolution effect
              for (let si = 0; si < 10; si++) {
                const steamGeo = new THREE.SphereGeometry(t.userData.scale * 0.2, 6, 6);
                const steamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
                const steam = new THREE.Mesh(steamGeo, steamMat);
                steam.position.copy(t.position).add(new THREE.Vector3(
                  (Math.random() - 0.5) * t.userData.scale,
                  Math.random() * t.userData.scale,
                  (Math.random() - 0.5) * t.userData.scale
                ));
                steam.userData = {
                  vel: new THREE.Vector3(0, 3 + Math.random() * 5, 0),
                  life: 1.5 + Math.random(),
                };
                scene.add(steam);
                particles.push(steam);
              }

              scene.remove(t);
            }
          } else if (bodyDist < ATTACK_RANGE + t.userData.scale * 0.2) {
            // Body hit (non-critical)
            t.userData.hp -= ATTACK_DAMAGE * 0.3;
            t.userData.hitFlash = 0.15;
            spawnParticles(
              player.position.clone().add(new THREE.Vector3(0, 1, 0)),
              0xffaa00,
              5, 5
            );
          }
        });
      }

      // ---- Titan AI ----
      titans.forEach(t => {
        if (t.userData.hp <= 0) return;

        const tData = t.userData;
        const toPlayer = player.position.clone().sub(t.position);
        const distToPlayer = toPlayer.length();

        tData.stateTimer -= dt;
        tData.attackCooldown -= dt;

        // Hit flash
        if (tData.hitFlash > 0) {
          tData.hitFlash -= dt;
          t.children.forEach(c => {
            if (c.material && c.material.emissive) {
              c.material.emissive.setHex(tData.hitFlash > 0 ? 0xff3333 : 0x000000);
            }
          });
        }

        // State machine
        if (distToPlayer < 80) {
          tData.state = 'chase';
        }
        if (distToPlayer < tData.scale * 1.5 && tData.attackCooldown <= 0) {
          tData.state = 'attack';
        }

        switch (tData.state) {
          case 'wander':
            if (tData.stateTimer <= 0) {
              tData.wanderDir = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
              tData.stateTimer = 3 + Math.random() * 4;
            }
            t.position.addScaledVector(tData.wanderDir, tData.speed * 0.3 * dt);
            t.lookAt(t.position.clone().add(tData.wanderDir));
            break;
          case 'chase':
            toPlayer.y = 0;
            toPlayer.normalize();
            t.position.addScaledVector(toPlayer, tData.speed * dt);
            t.lookAt(player.position.x, 0, player.position.z);
            if (distToPlayer > 120) tData.state = 'wander';
            break;
          case 'attack':
            // Swing animation
            const armSwing = Math.sin(Date.now() * 0.01) * 0.5;
            t.children.forEach(c => {
              if (c.geometry?.parameters?.height === tData.scale * 0.45) {
                c.rotation.x = armSwing;
              }
            });

            if (tData.attackCooldown <= 0) {
              // Damage player if in range and on ground level
              if (distToPlayer < tData.scale * 2 && player.position.y < tData.scale * 0.6) {
                const damage = 15 + tData.size * 5;
                state.hp -= damage;
                state.velocity.addScaledVector(toPlayer.normalize().negate(), 20);
                state.velocity.y = 10;
                spawnParticles(player.position.clone(), 0xff0000, 10, 8);

                if (state.hp <= 0) {
                  state.hp = 0;
                  state.gameOver = true;
                  state.message = 'GAME OVER';
                  state.messageTimer = 999;
                }
              }
              tData.attackCooldown = 2 + Math.random();
              tData.state = 'chase';
            }
            break;
          default:
            break;
        }

        // Keep titans in bounds
        t.position.x = Math.max(-bound, Math.min(bound, t.position.x));
        t.position.z = Math.max(-bound, Math.min(bound, t.position.z));

        // Simple walk animation
        t.children.forEach((c, i) => {
          if (c.geometry?.parameters?.height === tData.scale * 0.35) {
            c.position.y = tData.scale * 0.05 + Math.abs(Math.sin(Date.now() * 0.003 + i)) * 1.5;
          }
        });
      });

      // Remove dead titans from array
      for (let i = titans.length - 1; i >= 0; i--) {
        if (titans[i].userData.hp <= 0) {
          titans.splice(i, 1);
        }
      }

      // ---- Spawn more titans ----
      state.spawnTimer += dt;
      if (state.spawnTimer > 15 && titans.length < 10) {
        state.spawnTimer = 0;
        const count = 1 + Math.floor(state.kills / 5);
        spawnTitans(Math.min(count, 3));
        state.message = '新たな巨人が現れた！';
        state.messageTimer = 2;
      }

      // ---- Combo timer ----
      if (state.comboTimer > 0) {
        state.comboTimer -= dt;
        if (state.comboTimer <= 0) {
          state.combo = 0;
        }
      }

      // ---- Gas recovery (slow) ----
      if (state.onGround && !state.isWired) {
        state.gas = Math.min(100, state.gas + 3 * dt);
      }

      // ---- Update Particles ----
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.userData.life -= dt;
        if (p.userData.life <= 0) {
          scene.remove(p);
          particles.splice(i, 1);
          continue;
        }
        p.position.addScaledVector(p.userData.vel, dt);
        p.userData.vel.y -= 5 * dt;
        if (p.material.opacity !== undefined) {
          p.material.opacity = Math.max(0, p.userData.life);
        }
        p.scale.setScalar(p.userData.life);
      }

      // ---- Slash effects ----
      for (let i = state.slashEffects.length - 1; i >= 0; i--) {
        const s = state.slashEffects[i];
        s.userData.life -= dt;
        if (s.userData.life <= 0) {
          scene.remove(s);
          state.slashEffects.splice(i, 1);
        } else {
          s.scale.setScalar(1 + (0.2 - s.userData.life) * 5);
          s.material.opacity = s.userData.life * 4;
        }
      }

      // ---- Message timer ----
      if (state.messageTimer > 0) {
        state.messageTimer -= dt;
        if (state.messageTimer <= 0) {
          state.message = '';
        }
      }

      // ---- Camera ----
      // Auto-rotate camera toward player movement
      if (moveDir.length() > 0.1) {
        const targetCamY = Math.atan2(-moveDir.x, -moveDir.z);
        let diff = targetCamY - state.cameraAngleY;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        state.cameraAngleY += diff * 3 * dt;
      }

      const camDist = 12;
      const camHeight = 5 + Math.max(0, player.position.y * 0.3);
      camera.position.set(
        player.position.x + Math.sin(state.cameraAngleY) * camDist,
        player.position.y + camHeight,
        player.position.z + Math.cos(state.cameraAngleY) * camDist
      );
      camera.lookAt(
        player.position.x,
        player.position.y + 2,
        player.position.z
      );

      // Update directional light to follow player
      dirLight.position.set(
        player.position.x + 50,
        80,
        player.position.z + 30
      );
      dirLight.target.position.copy(player.position);

      // ---- Render ----
      renderer.render(scene, camera);

      // ---- Update React State ----
      setGameState({
        hp: Math.round(state.hp),
        maxHp: 100,
        gas: Math.round(state.gas),
        maxGas: 100,
        score: state.score,
        kills: state.kills,
        combo: state.combo,
        titanCount: titans.length,
        isWired: state.isWired,
        gameOver: state.gameOver,
        gameStarted: state.gameStarted,
        message: state.message,
        messageTimer: state.messageTimer,
      });

      // Reset single-frame inputs
      input.jump = false;
      input.attack = false;
      input.wire = false;
    }

    gameLoop();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [createTitan, createBuilding]);

  const handleRestart = useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <div className="titan-game">
      <div ref={mountRef} className="game-canvas" />
      <GameUI gameState={gameState} onRestart={handleRestart} />
      {gameState.gameStarted && !gameState.gameOver && (
        <MobileControls inputRef={inputRef} />
      )}
      {!gameState.gameStarted && (
        <div className="title-screen">
          <h1>巨人討伐戦</h1>
          <p className="subtitle">~ 立体機動アクション ~</p>
          <div className="start-prompt">画面をタッチして開始</div>
          <div className="controls-help">
            <div>左スティック: 移動</div>
            <div>Aボタン: ジャンプ / ワイヤー</div>
            <div>Bボタン: 攻撃</div>
            <div>巨人のうなじを斬れ！</div>
          </div>
        </div>
      )}
    </div>
  );
}
