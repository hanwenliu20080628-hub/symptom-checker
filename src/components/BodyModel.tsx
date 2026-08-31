"use client";

import { Suspense, useCallback, useRef, useMemo, useState, useEffect } from "react";
import { Canvas, ThreeEvent, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import {
  getMarkerPositions,
  getMarkerNames,
  getMarkerSize,
  getDeletedMarkerIds,
  getCustomMarkers,
  getWhiteDots,
  getWhiteDotSize,
  onMarkerPositionsUpdated,
  type WhiteDot,
} from "@/lib/marker-settings";
import { MARKER_DOTS, type MarkerDot } from "@/lib/marker-dots";

interface BodyModelProps {
  onPartClick: (id: string, name?: string) => void;
  /** "rotate" 自由旋转+平移+缩放；"pan" 锁定旋转，只能在当前角度平移和缩放 */
  interactionMode?: "rotate" | "pan";
  /** 递增信号：变化时把相机回到初始位置 */
  resetSignal?: number;
}

// ========== 坐标 → 身体部位映射 ==========
// 基于 GLB 模型实际包围盒: Y: 0~1.899, X: -0.533~0.533

function getBodyPartFromHit(localX: number, localY: number, localZ: number): string {
  const absX = Math.abs(localX);
  const normY = localY / 1.899;

  if (normY > 0.87) {
    if (absX > 0.12) return localX < 0 ? "left_ear" : "right_ear";
    return "head";
  }
  if (normY > 0.83) return "neck";
  if (normY > 0.78) {
    if (absX > 0.25) return localX < 0 ? "left_shoulder" : "right_shoulder";
    return localZ < 0 ? "chest" : "back_upper";
  }
  if (normY > 0.72) {
    if (absX > 0.28) return localX < 0 ? "left_upper_arm" : "right_upper_arm";
    return "chest";
  }
  if (normY > 0.65) {
    if (absX > 0.30) return localX < 0 ? "left_elbow" : "right_elbow";
    return "abdomen";
  }
  if (normY > 0.58) {
    if (absX > 0.30) return localX < 0 ? "left_forearm" : "right_forearm";
    return "abdomen";
  }
  if (normY > 0.52) {
    if (absX > 0.30) return localX < 0 ? "left_wrist" : "right_wrist";
    return localZ < 0 ? "abdomen" : "back_lower";
  }
  if (normY > 0.46) return "pelvis";
  if (normY > 0.35) {
    if (absX > 0.045) return localX < 0 ? "left_thigh" : "right_thigh";
    return "pelvis";
  }
  if (normY > 0.24) {
    if (absX > 0.045) return localX < 0 ? "left_knee" : "right_knee";
    return "pelvis";
  }
  if (normY > 0.10) {
    if (absX > 0.045) return localX < 0 ? "left_calf" : "right_calf";
    return "pelvis";
  }
  return localX < 0 ? "left_ankle" : "right_ankle";
}

// ========== 找到场景中的第一个 mesh ==========
function findFirstMesh(root: THREE.Object3D): THREE.Mesh | null {
  let result: THREE.Mesh | null = null;
  root.traverse((child) => {
    if (!result && child instanceof THREE.Mesh) result = child;
  });
  return result;
}

// ========== 可点击标记点组件 ==========
function MarkerDotSphere({
  marker,
  size,
  isHovered,
  onClick,
  onPointerOver,
  onPointerOut,
}: {
  marker: MarkerDot;
  size: number;
  isHovered: boolean;
  onClick: () => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  // 各层尺寸基于中心红点半径 size 缩放
  const coreRadius = size;
  const glowRadius = size * 1.8;
  const hitRadius = size * 4;

  useFrame((_, delta) => {
    if (ref.current) {
      const scale = isHovered ? 1.7 : 1 + Math.sin(Date.now() * 0.004 + marker.position[1]) * 0.2;
      ref.current.scale.setScalar(scale);
    }
    if (glowRef.current) {
      const opacity = 0.2 + Math.abs(Math.sin(Date.now() * 0.004)) * 0.2;
      glowRef.current.scale.setScalar(1 + Math.sin(Date.now() * 0.003) * 0.25);
      if (glowRef.current.material instanceof THREE.Material) {
        glowRef.current.material.opacity = opacity;
      }
    }
  });

  // 事件处理函数
  const handleEvent = {
    onClick: (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onClick(); },
    onPointerOver: (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onPointerOver(); },
    onPointerOut: (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onPointerOut(); },
  };

  return (
    <group>
      {/* 隐形碰撞球（可点击区域） */}
      <mesh
        position={marker.position}
        onClick={handleEvent.onClick}
        onPointerOver={handleEvent.onPointerOver}
        onPointerOut={handleEvent.onPointerOut}
      >
        <sphereGeometry args={[hitRadius, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthTest={true} />
      </mesh>
      {/* 外圈光晕 */}
      <mesh
        ref={glowRef}
        position={marker.position}
        onClick={handleEvent.onClick}
        onPointerOver={handleEvent.onPointerOver}
        onPointerOut={handleEvent.onPointerOut}
      >
        <sphereGeometry args={[glowRadius, 16, 16]} />
        <meshBasicMaterial
          color="#ff4444"
          transparent
          opacity={0.25}
          depthTest={true}
        />
      </mesh>
      {/* 中心红点 */}
      <mesh
        ref={ref}
        position={marker.position}
        onClick={handleEvent.onClick}
        onPointerOver={handleEvent.onPointerOver}
        onPointerOut={handleEvent.onPointerOut}
      >
        <sphereGeometry args={[coreRadius, 16, 16]} />
        <meshBasicMaterial color={isHovered ? "#ff0000" : "#ff4444"} depthTest={true} />
      </mesh>
    </group>
  );
}

// ========== 标记点集合 ==========
function BodyPartMarkers({
  onMarkerClick,
}: {
  onMarkerClick: (id: string, name: string) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const gltf = useGLTF("/models/human_body.glb");

  // 监听配置更新事件，触发重渲染
  const [version, setVersion] = useState(0);
  useEffect(() => {
    return onMarkerPositionsUpdated(() => setVersion((v) => v + 1));
  }, []);

  // 计算每个 marker 吸附到模型表面的位置（并应用用户自定义覆盖、过滤删除、追加自定义）
  const surfaceMarkers = useMemo(() => {
    const customPositions = getMarkerPositions();
    const markerNames = getMarkerNames();
    const deletedIds = new Set(getDeletedMarkerIds());
    const customMarkers = getCustomMarkers();

    const mesh = findFirstMesh(gltf.scene);
    if (mesh) mesh.updateWorldMatrix(true, false);
    const baseMarkers = mesh
      ? MARKER_DOTS.filter((m) => !deletedIds.has(m.id)).map((marker) => {
          const name = markerNames[marker.id] ?? marker.name;
          // 用户自定义坐标优先
          if (customPositions[marker.id]) {
            return { ...marker, name, position: customPositions[marker.id] };
          }

          const [x, y, z] = marker.position;
          const isFront = z >= 0;
          const origin = new THREE.Vector3(x, y, isFront ? 0.4 : -0.4);
          const direction = new THREE.Vector3(0, 0, isFront ? -1 : 1);
          const raycaster = new THREE.Raycaster(origin, direction, 0, 2);
          const intersections = raycaster.intersectObject(mesh, true);
          if (intersections.length > 0) {
            const hit = intersections[0].point;
            const offset = 0.006;
            const newZ = isFront ? hit.z + offset : hit.z - offset;
            return { ...marker, name, position: [hit.x, hit.y, newZ] as [number, number, number] };
          }
          return { ...marker, name };
        })
      : MARKER_DOTS.filter((m) => !deletedIds.has(m.id)).map((marker) => ({
          ...marker,
          name: markerNames[marker.id] ?? marker.name,
        }));

    // 追加自定义标记点
    const customDots: MarkerDot[] = customMarkers.map((m) => ({
      id: m.id,
      name: m.name,
      position: m.position,
    }));

    return [...baseMarkers, ...customDots];
  }, [gltf.scene, version]);

  // 读取标记点大小
  const markerSize = useMemo(() => getMarkerSize(), [version]);

  return (
    <group>
      {surfaceMarkers.map((marker) => (
        <MarkerDotSphere
          key={marker.id}
          marker={marker}
          size={markerSize}
          isHovered={hoveredId === marker.id}
          onClick={() => onMarkerClick(marker.id, marker.name)}
          onPointerOver={() => setHoveredId(marker.id)}
          onPointerOut={() => setHoveredId(null)}
        />
      ))}
    </group>
  );
}

// ========== 自定义白点 ==========
function WhiteDotSphere({
  dot,
  size,
  isHovered,
  onClick,
  onPointerOver,
  onPointerOut,
}: {
  dot: WhiteDot;
  size: number;
  isHovered: boolean;
  onClick: () => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
}) {
  const handleEvent = {
    onClick: (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onClick(); },
    onPointerOver: (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onPointerOver(); },
    onPointerOut: (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onPointerOut(); },
  };

  return (
    <group>
      {/* 隐形碰撞球（可点击区域） */}
      <mesh
        position={dot.position}
        onClick={handleEvent.onClick}
        onPointerOver={handleEvent.onPointerOver}
        onPointerOut={handleEvent.onPointerOut}
      >
        <sphereGeometry args={[size * 4, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthTest={true} />
      </mesh>
      {/* 白点本体：强制纯白自发光，不依赖可能被 localStorage 污染成黑色的 dot.color */}
      <mesh
        position={dot.position}
        scale={isHovered ? 1.7 : 1}
        onClick={handleEvent.onClick}
        onPointerOver={handleEvent.onPointerOver}
        onPointerOut={handleEvent.onPointerOut}
      >
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={1.8}
          toneMapped={false}
          roughness={1}
          metalness={0}
          depthTest={true}
        />
      </mesh>
    </group>
  );
}

function WhiteDots({
  onDotClick,
}: {
  onDotClick: (id: string, name: string) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // 监听配置更新事件，触发重渲染
  const [version, setVersion] = useState(0);
  useEffect(() => {
    return onMarkerPositionsUpdated(() => setVersion((v) => v + 1));
  }, []);

  const dots = useMemo(() => getWhiteDots(), [version]);
  const size = useMemo(() => getWhiteDotSize(), [version]);

  return (
    <group>
      {dots.map((dot) => (
        <WhiteDotSphere
          key={dot.id}
          dot={dot}
          size={size}
          isHovered={hoveredId === dot.id}
          onClick={() => onDotClick(dot.id, dot.name)}
          onPointerOver={() => setHoveredId(dot.id)}
          onPointerOut={() => setHoveredId(null)}
        />
      ))}
    </group>
  );
}

// ========== 真实模型加载 ==========
function RealHumanModel({
  onMeshClick,
}: {
  onMeshClick: (id: string, name?: string) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const gltf = useGLTF("/models/human_body.glb");
  const modelScene = useMemo(() => gltf.scene.clone(), [gltf.scene]);

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      const hitPoint = event.point.clone();

      if (groupRef.current) {
        groupRef.current.updateWorldMatrix(true, false);
        const localPoint = hitPoint.applyMatrix4(
          groupRef.current.matrixWorld.clone().invert()
        );
        const meshName = getBodyPartFromHit(
          localPoint.x,
          localPoint.y,
          localPoint.z
        );
        onMeshClick(meshName);
      }
    },
    [onMeshClick]
  );

  return (
    <group
      ref={groupRef}
      onClick={handleClick}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      <primitive object={modelScene} />
    </group>
  );
}

// ========== 主组件 ==========
export default function BodyModel({ onPartClick, interactionMode = "rotate", resetSignal = 0 }: BodyModelProps) {
  const handleMeshClick = useCallback(
    (id: string, name?: string) => {
      onPartClick(id, name);
    },
    [onPartClick]
  );

  const controlsRef = useRef<any>(null);

  // 回到初始位置
  useEffect(() => {
    if (resetSignal > 0 && controlsRef.current) {
      const controls = controlsRef.current;
      controls.target.set(0, 0.95, 0);
      controls.object.position.set(0, 1, 3.5);
      controls.update();
    }
  }, [resetSignal]);

  return (
    <div className="relative w-full max-w-2xl aspect-square max-h-[70vh] rounded-xl overflow-hidden bg-gradient-to-b from-blue-50 to-white border border-gray-200 shadow-sm">
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            加载 3D 模型中...
          </div>
        }
      >
        <Canvas
          camera={{ position: [0, 1, 3.5], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
          style={{ background: "transparent" }}
        >
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 5, 5]} intensity={1.0} />
          <directionalLight position={[-3, 3, -3]} intensity={0.4} />

          <RealHumanModel onMeshClick={handleMeshClick} />
          <BodyPartMarkers onMarkerClick={handleMeshClick} />
          <WhiteDots onDotClick={handleMeshClick} />

          <OrbitControls
            ref={controlsRef}
            enablePan={true}
            enableZoom={true}
            enableRotate={interactionMode === "rotate"}
            rotateSpeed={1.3}
            mouseButtons={{
              LEFT: interactionMode === "pan" ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE,
              MIDDLE: THREE.MOUSE.DOLLY,
              RIGHT: THREE.MOUSE.PAN,
            }}
            minDistance={1.5}
            maxDistance={6}
            target={[0, 0.95, 0]}
          />
        </Canvas>
      </Suspense>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-1.5 text-xs text-gray-500 shadow-sm border border-gray-200">
        🖱️ 拖拽旋转 &nbsp;|&nbsp; 滚轮缩放 &nbsp;|&nbsp; 点击部位
      </div>
    </div>
  );
}
