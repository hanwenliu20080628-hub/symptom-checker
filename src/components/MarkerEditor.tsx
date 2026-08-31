"use client";

import { useState, useEffect, useCallback } from "react";
import { MARKER_DOTS, type MarkerDot } from "@/lib/marker-dots";
import {
  getMarkerPositions,
  saveMarkerPosition,
  getMarkerNames,
  renameMarker,
  getMarkerSize,
  saveMarkerSize,
  getDeletedMarkerIds,
  setMarkerDeleted,
  getCustomMarkers,
  addCustomMarker,
  renameCustomMarker,
  updateCustomMarkerPosition,
  removeCustomMarker,
  getWhiteDots,
  addWhiteDot,
  updateWhiteDot,
  removeWhiteDot,
  getWhiteDotSize,
  saveWhiteDotSize,
  exportAllMarkerConfig,
  importAllMarkerConfig,
  resetAllMarkers,
  DEFAULT_MARKER_SIZE,
  DEFAULT_WHITE_DOT_SIZE,
  DEFAULT_WHITE_DOT_COLOR,
  type MarkerPositions,
  type CustomMarker,
  type WhiteDot,
} from "@/lib/marker-settings";

interface MarkerEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

const AXES = [
  { key: 0, label: "X" },
  { key: 1, label: "Y" },
  { key: 2, label: "Z" },
] as const;

/** 坐标编辑行 */
function CoordInputs({
  position,
  onChange,
}: {
  position: [number, number, number];
  onChange: (axis: number, value: number) => void;
}) {
  return (
    <div className="flex gap-2">
      {AXES.map((axis) => (
        <div key={axis.key} className="flex items-center gap-1">
          <span className="text-xs text-gray-400 w-3">{axis.label}</span>
          <input
            type="number"
            step={0.01}
            value={position[axis.key].toFixed(2)}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!Number.isNaN(v)) onChange(axis.key, v);
            }}
            className="w-14 px-1.5 py-1 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-700"
          />
        </div>
      ))}
    </div>
  );
}

/** 删除按钮 */
function DeleteButton({ onClick, title }: { onClick: () => void; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  );
}

export default function MarkerEditor({ isOpen, onClose }: MarkerEditorProps) {
  const [size, setSize] = useState<number>(DEFAULT_MARKER_SIZE);
  const [positions, setPositions] = useState<MarkerPositions>({});
  const [markerNames, setMarkerNames] = useState<Record<string, string>>({});
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [customMarkers, setCustomMarkers] = useState<CustomMarker[]>([]);
  const [whiteDots, setWhiteDots] = useState<WhiteDot[]>([]);
  const [whiteDotSize, setWhiteDotSizeState] = useState<number>(DEFAULT_WHITE_DOT_SIZE);
  const [newName, setNewName] = useState("");
  const [newDotName, setNewDotName] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);

  // 打开时加载当前配置
  useEffect(() => {
    if (isOpen) {
      setSize(getMarkerSize());
      setPositions(getMarkerPositions());
      setMarkerNames(getMarkerNames());
      setDeletedIds(getDeletedMarkerIds());
      setCustomMarkers(getCustomMarkers());
      setWhiteDots(getWhiteDots());
      setWhiteDotSizeState(getWhiteDotSize());
    }
  }, [isOpen]);

  // ===== 大小 =====
  const handleSizeChange = useCallback((value: number) => {
    setSize(value);
    saveMarkerSize(value);
  }, []);

  // ===== 白点 =====
  const handleWhiteDotSizeChange = useCallback((value: number) => {
    setWhiteDotSizeState(value);
    saveWhiteDotSize(value);
  }, []);

  const handleAddWhiteDot = useCallback(() => {
    if (!newDotName.trim()) return;
    addWhiteDot(newDotName.trim(), [0, 0.95, 0.16], DEFAULT_WHITE_DOT_COLOR);
    setNewDotName("");
    setWhiteDots(getWhiteDots());
    setToast(`已添加白点「${newDotName.trim()}」`);
  }, [newDotName]);

  const [toast, setToast] = useState("");
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleWhiteDotChange = useCallback(
    (id: string, patch: Partial<Omit<WhiteDot, "id">>) => {
      updateWhiteDot(id, patch);
      setWhiteDots(getWhiteDots());
    },
    []
  );

  const handleRemoveWhiteDot = useCallback((id: string) => {
    removeWhiteDot(id);
    setWhiteDots(getWhiteDots());
  }, []);

  // ===== 默认标记点 =====
  const handlePositionChange = useCallback((id: string, axis: number, value: number) => {
    setPositions((prev) => {
      const base = prev[id] ?? MARKER_DOTS.find((m) => m.id === id)!.position;
      const next: [number, number, number] = [...base];
      next[axis] = value;
      saveMarkerPosition(id, next);
      return { ...prev, [id]: next };
    });
  }, []);

  const handleDeleteDefault = useCallback((id: string) => {
    setMarkerDeleted(id, true);
    setDeletedIds(getDeletedMarkerIds());
  }, []);

  const handleRenameDefault = useCallback((id: string, name: string) => {
    renameMarker(id, name);
    setMarkerNames(getMarkerNames());
  }, []);

  const handleRestoreDefault = useCallback((id: string) => {
    setMarkerDeleted(id, false);
    setDeletedIds(getDeletedMarkerIds());
  }, []);

  // ===== 自定义标记点 =====
  const handleAddCustom = useCallback(() => {
    if (!newName.trim()) return;
    addCustomMarker(newName.trim(), [0, 0.95, 0.16]);
    setNewName("");
    setCustomMarkers(getCustomMarkers());
  }, [newName]);

  const handleCustomPositionChange = useCallback((id: string, axis: number, value: number) => {
    setCustomMarkers((prev) => {
      const next = prev.map((m) => {
        if (m.id !== id) return m;
        const pos: [number, number, number] = [...m.position];
        pos[axis] = value;
        updateCustomMarkerPosition(id, pos);
        return { ...m, position: pos };
      });
      return next;
    });
  }, []);

  const handleRenameCustom = useCallback((id: string, name: string) => {
    renameCustomMarker(id, name);
    setCustomMarkers(getCustomMarkers());
  }, []);

  const handleRemoveCustom = useCallback((id: string) => {
    removeCustomMarker(id);
    setCustomMarkers(getCustomMarkers());
  }, []);

  const handleResetAll = useCallback(() => {
    if (window.confirm("确定重置所有标记点配置吗？包括大小、位置、新增和删除。" )) {
      resetAllMarkers();
      setSize(DEFAULT_MARKER_SIZE);
      setPositions({});
      setDeletedIds([]);
      setCustomMarkers([]);
      setWhiteDots([]);
      setWhiteDotSizeState(DEFAULT_WHITE_DOT_SIZE);
    }
  }, []);

  // ===== 导出 / 导入 =====
  const [showExport, setShowExport] = useState(false);
  const [importText, setImportText] = useState("");

  const handleExport = useCallback(async () => {
    const json = exportAllMarkerConfig();
    try {
      await navigator.clipboard.writeText(json);
      setShowExport(true);
      setImportText(json);
      alert("配置已复制到剪贴板，可粘贴到其他网页导入");
    } catch {
      setShowExport(true);
      setImportText(json);
    }
  }, []);

  const handleImport = useCallback(() => {
    if (!importText.trim()) return;
    if (importAllMarkerConfig(importText)) {
      setSize(getMarkerSize());
      setPositions(getMarkerPositions());
      setDeletedIds(getDeletedMarkerIds());
      setCustomMarkers(getCustomMarkers());
      setWhiteDots(getWhiteDots());
      setWhiteDotSizeState(getWhiteDotSize());
      setShowExport(false);
      setImportText("");
      alert("导入成功！");
    } else {
      alert("导入失败：JSON 格式无效");
    }
  }, [importText]);

  // 分组
  const groups = [
    { title: "头部", ids: ["head", "left_eye", "right_eye", "nose", "mouth", "left_ear", "right_ear", "neck"] },
    { title: "躯干", ids: ["chest", "abdomen", "pelvis", "back_upper", "back_lower"] },
    { title: "上肢", ids: ["left_shoulder", "right_shoulder", "left_upper_arm", "right_upper_arm", "left_elbow", "right_elbow", "left_forearm", "right_forearm", "forearm_medial_right", "forearm_medial_left", "left_wrist", "right_wrist"] },
    { title: "下肢", ids: ["left_thigh", "right_thigh", "left_vastus_medialis", "right_vastus_medialis", "left_knee", "right_knee", "left_calf", "right_calf", "left_ankle", "right_ankle"] },
  ];

  const deletedMarkers = MARKER_DOTS.filter((m) => deletedIds.includes(m.id));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* 侧边面板 */}
      <div className="relative w-full max-w-sm bg-white shadow-2xl h-full flex flex-col animate-slide-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-base font-semibold text-gray-900">调整标记点</h3>
            <p className="text-xs text-gray-400 mt-0.5">修改后自动保存，实时更新模型</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 操作反馈提示 */}
        {toast && (
          <div className="px-5 py-2 bg-green-50 border-b border-green-100">
            <p className="text-xs text-green-700">{toast}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* 标记点大小 */}
          <div className="mb-5 p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">标记点大小</span>
              <span className="text-xs text-gray-400">{(size * 100).toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0.008}
              max={0.05}
              step={0.002}
              value={size}
              onChange={(e) => handleSizeChange(parseFloat(e.target.value))}
              className="w-full accent-red-500"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
              <span>小</span>
              <span>大</span>
            </div>
          </div>

          {/* 白点管理 */}
          <div className="mb-5 p-3 bg-gray-50 rounded-xl">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">白点管理</span>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  自定义可点击白点：可增删、调大小/位置/颜色
                </p>
              </div>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 rounded-full px-2 py-0.5">
                {whiteDots.length} 个
              </span>
            </div>

            {/* 白点大小 */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">白点大小</span>
                <span className="text-xs text-gray-400">{(whiteDotSize * 100).toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={0.004}
                max={0.04}
                step={0.002}
                value={whiteDotSize}
                onChange={(e) => handleWhiteDotSizeChange(parseFloat(e.target.value))}
                className="w-full accent-slate-500"
              />
            </div>

            {/* 新增白点 */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newDotName}
                onChange={(e) => setNewDotName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddWhiteDot(); }}
                placeholder="输入白点名称，如：左肩前侧"
                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-700"
              />
              <button
                onClick={handleAddWhiteDot}
                disabled={!newDotName.trim()}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  newDotName.trim()
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                添加
              </button>
            </div>

            {/* 白点列表（按生成时间倒序，最新的在前） */}
            {whiteDots.length === 0 && (
              <p className="text-xs text-gray-400 py-1">暂无白点</p>
            )}
            {[...whiteDots]
              .reverse()
              .map((dot) => (
                <div key={dot.id} className="py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="color"
                        value={dot.color}
                        onChange={(e) => handleWhiteDotChange(dot.id, { color: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer border border-gray-200 flex-shrink-0 p-0.5"
                        title="白点颜色"
                      />
                      <input
                        type="text"
                        value={dot.name}
                        onChange={(e) => handleWhiteDotChange(dot.id, { name: e.target.value })}
                        className="text-sm font-medium text-gray-700 border border-transparent hover:border-gray-200 focus:border-blue-400 rounded px-1 py-0.5 outline-none w-28 flex-shrink"
                      />
                  </div>
                  <DeleteButton onClick={() => handleRemoveWhiteDot(dot.id)} title="删除此白点" />
                </div>
                <CoordInputs
                  position={dot.position}
                  onChange={(a, v) => {
                    const next = [...dot.position] as [number, number, number];
                    next[a] = v;
                    handleWhiteDotChange(dot.id, { position: next });
                  }}
                />
              </div>
            ))}
          </div>

          {/* 默认标记点分组 */}
          {groups.map((group) => (
            <div key={group.title} className="mb-4">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                {group.title}
              </h4>
              {group.ids.map((id) => {
                if (deletedIds.includes(id)) return null;
                const marker = MARKER_DOTS.find((m) => m.id === id)!;
                const position = positions[id] ?? marker.position;
                return (
                  <div key={id} className="py-2 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <input
                        type="text"
                        value={markerNames[id] ?? marker.name}
                        onChange={(e) => handleRenameDefault(id, e.target.value)}
                        className="text-sm font-medium text-gray-700 border border-transparent hover:border-gray-200 focus:border-blue-400 rounded px-1 py-0.5 outline-none w-28 flex-shrink"
                        title="点击可修改名称"
                      />
                      <DeleteButton onClick={() => handleDeleteDefault(id)} title="删除此标记点" />
                    </div>
                    <CoordInputs position={position} onChange={(a, v) => handlePositionChange(id, a, v)} />
                  </div>
                );
              })}
            </div>
          ))}

          {/* 自定义标记点 */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">自定义标记点</h4>
              <button
                onClick={() => setNewName("")}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                清空
              </button>
            </div>
            {/* 新增 */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddCustom(); }}
                placeholder="输入部位名称，如：左肩胛骨"
                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-700"
              />
              <button
                onClick={handleAddCustom}
                disabled={!newName.trim()}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  newName.trim()
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                添加
              </button>
            </div>
            {/* 自定义标记点列表 */}
            {customMarkers.length === 0 && (
              <p className="text-xs text-gray-400 py-1">暂无自定义标记点</p>
            )}
            {customMarkers.map((m) => (
              <div key={m.id} className="py-2 border-b border-gray-100">
                <div className="flex items-center justify-between mb-1.5">
                  <input
                    type="text"
                    value={m.name}
                    onChange={(e) => handleRenameCustom(m.id, e.target.value)}
                    className="text-sm font-medium text-gray-700 border border-transparent hover:border-gray-200 focus:border-blue-400 rounded px-1 py-0.5 outline-none w-40"
                  />
                  <DeleteButton onClick={() => handleRemoveCustom(m.id)} title="删除此标记点" />
                </div>
                <CoordInputs position={m.position} onChange={(a, v) => handleCustomPositionChange(m.id, a, v)} />
              </div>
            ))}
          </div>

          {/* 已删除的默认标记点 */}
          {deletedMarkers.length > 0 && (
            <div className="mb-4">
              <button
                onClick={() => setShowDeleted(!showDeleted)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
              >
                <svg className={`w-3 h-3 transition-transform ${showDeleted ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                已删除的标记点（{deletedMarkers.length}）
              </button>
              {showDeleted && (
                <div className="mt-2">
                  {deletedMarkers.map((m) => (
                    <div key={m.id} className="flex items-center justify-between py-1.5 border-b border-gray-100">
                      <span className="text-sm text-gray-400 line-through">{m.name}</span>
                      <button
                        onClick={() => handleRestoreDefault(m.id)}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        恢复
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 导出/导入配置 */}
        {(showExport || importText) && (
          <div className="px-5 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600">
                配置数据（JSON）—— 在其他网页导入可迁移标记点
              </span>
              <button
                onClick={() => { setShowExport(false); setImportText(""); }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                关闭
              </button>
            </div>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="粘贴配置 JSON 后点击「导入配置」"
              className="w-full h-24 px-3 py-2 text-xs font-mono border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-700"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleImport}
                className="flex-1 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                导入配置
              </button>
              <button
                onClick={handleExport}
                className="flex-1 py-2 rounded-lg text-xs font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
              >
                重新导出并复制
              </button>
            </div>
          </div>
        )}

        <div className="px-5 py-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={handleExport}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-colors"
          >
            导出
          </button>
          <button
            onClick={() => { setShowExport(true); setImportText(""); }}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-colors"
          >
            导入
          </button>
          <button
            onClick={handleResetAll}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
          >
            重置
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
