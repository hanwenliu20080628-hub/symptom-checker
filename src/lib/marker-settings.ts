"use client";

/** 标记点配置管理 —— 坐标、大小、增删均持久化在 localStorage */

const KEYS = {
  positions: "marker_positions",
  size: "marker_size",
  deleted: "marker_deleted",
  custom: "marker_custom",
  whiteDots: "white_dots",
  whiteDotSize: "white_dot_size",
  deletedWhiteDots: "deleted_white_dots",
  markerNames: "marker_names",
};
const UPDATE_EVENT = "marker-positions-updated";

export type MarkerPositions = Record<string, [number, number, number]>;

/** 自定义新增的标记点 */
export interface CustomMarker {
  id: string;
  name: string;
  position: [number, number, number];
}

/** 自定义白点 */
export interface WhiteDot {
  id: string;
  name: string;
  position: [number, number, number];
  color: string; // hex 颜色
}

// ===== 默认配置（固化到代码，任何设备/网址都能看到） =====

/** 默认红点位置覆盖（用户固化） */
export const DEFAULT_POSITIONS: MarkerPositions = {
  head: [-0.29, 1.75, 0.18],
  mouth: [0, 1.67, 0.16],
  left_ear: [0.02, 1.72, 0.1],
  right_upper_arm: [0.42, 1.28, 0],
  left_upper_arm: [-0.42, 1.28, 0],
  back_lower: [0, 1.08, -0.14],
  abdomen: [0, 1.18, 0.15],
  left_knee: [-0.16, 0.505, 0.02],
  right_knee: [0.17, 0.5, 0.02],
  left_vastus_medialis: [-0.09, 0.61, 0.06],
  right_vastus_medialis: [0.1, 0.6, 0.06],
  right_ankle: [0.18, 0.11, -0.03],
  left_ankle: [-0.17, 0.12, -0.03],
  right_wrist: [0.49, 1.06, 0.07],
  right_forearm: [0.41, 1.23, 0.03],
  right_elbow: [0.43, 1.2, -0.05],
  left_forearm: [-0.41, 1.23, 0.03],
  left_elbow: [-0.43, 1.2, -0.05],
  left_wrist: [-0.49, 1.06, 0.07],
  forearm_medial_right: [-0.34, 1.2, 0.01],
  forearm_medial_left: [0.34, 1.2, 0.01],
};

/** 默认删除的红点 id（用户固化） */
export const DEFAULT_DELETED_MARKER_IDS: string[] = [
  "left_thigh",
  "right_thigh",
  "pelvis",
  "left_calf",
  "right_calf",
  "neck",
  "right_ear",
  "left_ear",
  "mouth",
  "nose",
  "right_eye",
  "left_eye",
  "head",
  "chest",
  "abdomen",
  "back_lower",
  "back_upper",
  "left_vastus_medialis",
  "right_vastus_medialis",
  "left_shoulder",
  "right_shoulder",
  "left_upper_arm",
  "right_upper_arm",
];

/** 默认红点名称覆盖（用户固化，纠正 marker-dots 左右命名反的问题） */
export const DEFAULT_MARKER_NAMES: Record<string, string> = {
  right_ankle: "左脚踝/足",
  left_ankle: "右脚踝/足",
  right_forearm: "左小臂前侧",
  left_forearm: "右小臂前侧",
  right_elbow: "左肘",
  left_elbow: "右肘",
  right_wrist: "左手腕/手",
  left_wrist: "右手腕/手",
  left_knee: "右膝",
  right_knee: "左膝",
};

/** 默认白点（用户导出的完整配置固化） */
export const DEFAULT_WHITE_DOTS: WhiteDot[] = [
  { id: "dot_1786790275571", name: "右肩前侧", position: [-0.25, 1.53, -0.01], color: "#ffffff" },
  { id: "dot_1786790805415", name: "右胸部", position: [-0.09, 1.459, 0.12], color: "#ffffff" },
  { id: "dot_1786790895867", name: "左胸部", position: [0.09, 1.459, 0.12], color: "#ffffff" },
  { id: "dot_1786790998570", name: "左肩膀前侧", position: [0.2, 1.527, -0.01], color: "#ffffff" },
  { id: "dot_1786942802098", name: "右缝匠肌", position: [-0.08, 0.84, 0.1], color: "#ffffff" },
  { id: "dot_1786943230912", name: "左缝匠肌", position: [0.08, 0.84, 0.1], color: "#ffffff" },
  { id: "dot_1786943285944", name: "右股直肌", position: [-0.14, 0.78, 0.1], color: "#ffffff" },
  { id: "dot_1786943364549", name: "左股直肌", position: [0.14, 0.78, 0.1], color: "#ffffff" },
  { id: "dot_1786943847898", name: "腹直肌", position: [-0.04, 1.095, 0.13], color: "#ffffff" },
  { id: "dot_1786943903445", name: "腹直肌", position: [-0.04, 1.192, 0.14], color: "#ffffff" },
  { id: "dot_1786943957430", name: "腹直肌", position: [-0.04, 1.27, 0.14], color: "#ffffff" },
  { id: "dot_1786944029077", name: "腹直肌", position: [-0.05, 1.34, 0.14], color: "#ffffff" },
  { id: "dot_vm_mirror_1", name: "腹直肌", position: [0.04, 1.095, 0.13], color: "#ffffff" },
  { id: "dot_vm_mirror_2", name: "腹直肌", position: [0.04, 1.192, 0.14], color: "#ffffff" },
  { id: "dot_vm_mirror_3", name: "腹直肌", position: [0.04, 1.27, 0.14], color: "#ffffff" },
  { id: "dot_vm_mirror_4", name: "腹直肌", position: [0.05, 1.34, 0.14], color: "#ffffff" },
  { id: "dot_lat_right", name: "右背阔肌", position: [-0.11, 1.26, -0.1], color: "#ffffff" },
  { id: "dot_lat_left", name: "左背阔肌", position: [0.11, 1.26, -0.1], color: "#ffffff" },
  { id: "dot_trap", name: "右斜方肌", position: [-0.06, 1.57, -0.12], color: "#ffffff" },
  { id: "dot_delt_right", name: "右三角肌", position: [-0.27, 1.53, 0], color: "#ffffff" },
  { id: "dot_delt_left", name: "左三角肌", position: [0.27, 1.53, 0], color: "#ffffff" },
  { id: "dot_biceps_right", name: "右肱二头肌", position: [-0.27, 1.35, 0.03], color: "#ffffff" },
  { id: "dot_biceps_left", name: "左肱二头肌", position: [0.27, 1.35, 0.03], color: "#ffffff" },
  { id: "dot_glute_right", name: "右臀大肌", position: [-0.07, 0.98, -0.15], color: "#ffffff" },
  { id: "dot_glute_left", name: "左臀大肌", position: [0.08, 0.98, -0.15], color: "#ffffff" },
  { id: "dot_vl_right", name: "右股外侧肌", position: [-0.19, 0.75, 0.07], color: "#ffffff" },
  { id: "dot_vl_left", name: "左股外侧肌", position: [0.2, 0.76, 0.07], color: "#ffffff" },
  { id: "dot_itb_right", name: "右髂胫束", position: [-0.21, 0.7, 0.02], color: "#ffffff" },
  { id: "dot_itb_left", name: "左髂胫束", position: [0.21, 0.7, 0.01], color: "#ffffff" },
  { id: "dot_eo_right", name: "右腹外斜肌", position: [-0.13, 1.25, 0.08], color: "#ffffff" },
  { id: "dot_eo_left", name: "左腹外斜肌", position: [0.13, 1.25, 0.08], color: "#ffffff" },
  { id: "dot_sa_right", name: "右前锯肌", position: [-0.18, 1.36, 0.04], color: "#ffffff" },
  { id: "dot_sa_left", name: "左前锯肌", position: [0.19, 1.36, 0.04], color: "#ffffff" },
  { id: "dot_gas_lat_right", name: "右腓肠肌外侧头", position: [-0.19, 0.39, -0.15], color: "#ffffff" },
  { id: "dot_gas_med_right", name: "右腓肠肌内侧头", position: [-0.13, 0.36, -0.16], color: "#ffffff" },
  { id: "dot_gas_lat_left", name: "左腓肠肌外侧头", position: [0.19, 0.39, -0.17], color: "#ffffff" },
  { id: "dot_gas_med_left", name: "左腓肠肌内侧头", position: [0.13, 0.36, -0.16], color: "#ffffff" },
  { id: "dot_ta_right", name: "右胫骨前肌", position: [-0.2, 0.33, -0.04], color: "#ffffff" },
  { id: "dot_ta_left", name: "左胫骨前肌", position: [0.21, 0.34, -0.03], color: "#ffffff" },
  { id: "dot_1787393820622", name: "左股二头肌", position: [0.17, 0.73, -0.08], color: "#ffffff" },
  { id: "dot_1787393920705", name: "右股二头肌", position: [-0.16, 0.73, -0.08], color: "#ffffff" },
  { id: "dot_1787393969137", name: "左半腱肌", position: [0.09, 0.73, -0.09], color: "#ffffff" },
  { id: "dot_1787394054605", name: "右半腱肌", position: [-0.09, 0.73, -0.09], color: "#ffffff" },
  { id: "dot_1787394401868", name: "左肱三头肌", position: [0.27, 1.41, -0.1], color: "#ffffff" },
  { id: "dot_1787394561651", name: "右肱三头肌", position: [-0.27, 1.41, -0.1], color: "#ffffff" },
  { id: "dot_1787394642833", name: "左大圆肌", position: [0.16, 1.42, -0.14], color: "#ffffff" },
  { id: "dot_1787394746532", name: "右大圆肌", position: [-0.16, 1.42, -0.14], color: "#ffffff" },
  { id: "dot_1787394794965", name: "左冈上肌", position: [0.12, 1.47, -0.15], color: "#ffffff" },
  { id: "dot_1787394872690", name: "右冈上肌", position: [-0.12, 1.47, -0.14], color: "#ffffff" },
  { id: "dot_1787472897726", name: "左半膜肌", position: [0.06, 0.7, -0.07], color: "#ffffff" },
  { id: "dot_1787473532418", name: "右半膜肌", position: [-0.06, 0.69, -0.07], color: "#ffffff" },
  { id: "dot_1787475643329", name: "左大收肌", position: [0.03, 0.83, -0.07], color: "#ffffff" },
  { id: "dot_1787476195773", name: "右大收肌", position: [-0.02, 0.84, -0.07], color: "#ffffff" },
  { id: "dot_1787476613233", name: "右股薄肌", position: [-0.03, 0.73, 0.01], color: "#ffffff" },
  { id: "dot_1787478901450", name: "左股薄肌", position: [0.03, 0.73, 0.01], color: "#ffffff" },
  { id: "dot_1787478969513", name: "右长收肌", position: [-0.03, 0.85, 0.07], color: "#ffffff" },
  { id: "dot_1787479540677", name: "左长收肌", position: [0.03, 0.85, 0.07], color: "#ffffff" },
  { id: "dot_1787497574831", name: "右耻骨肌", position: [-0.05, 0.92, 0.09], color: "#ffffff" },
  { id: "dot_1787497606148", name: "左耻骨肌", position: [0.05, 0.92, 0.1], color: "#ffffff" },
  { id: "dot_1787497769023", name: "右阔筋膜张肌", position: [-0.15, 1.04, 0.06], color: "#ffffff" },
  { id: "dot_1787497857699", name: "左阔筋膜张肌", position: [0.15, 1.04, 0.06], color: "#ffffff" },
  { id: "dot_1787497960170", name: "右比目鱼肌", position: [-0.12, 0.35, -0.05], color: "#ffffff" },
  { id: "dot_1787498067732", name: "左比目鱼肌", position: [0.14, 0.35, -0.05], color: "#ffffff" },
  { id: "dot_1787498209301", name: "右小腿外侧", position: [-0.22, 0.27, -0.09], color: "#ffffff" },
  { id: "dot_1787498374451", name: "左小腿外侧", position: [0.23, 0.3, -0.09], color: "#ffffff" },
  { id: "dot_1787720898369", name: "左腰部", position: [0.04, 1.15, -0.09], color: "#ffffff" },
  { id: "dot_1787720938249", name: "右腰部", position: [-0.03, 1.15, -0.09], color: "#ffffff" },
  { id: "dot_1787721128794", name: "左斜方肌", position: [0.06, 1.57, -0.12], color: "#ffffff" },
  // 股内侧肌（原为红点，现改为白点）
  { id: "dot_vmedial_left", name: "左股内侧肌", position: [-0.09, 0.6, 0.06], color: "#ffffff" },
  { id: "dot_vmedial_right", name: "右股内侧肌", position: [0.1, 0.6, 0.06], color: "#ffffff" },
];

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
  } catch (err) {
    console.error("localStorage 写入失败:", key, err);
  }
}

function notify(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
}

// ===== 坐标 =====

/** 读取用户自定义的标记点坐标（localStorage 无数据时返回默认覆盖） */
export function getMarkerPositions(): MarkerPositions {
  if (typeof window === "undefined") return DEFAULT_POSITIONS;
  try {
    const raw = window.localStorage.getItem(KEYS.positions);
    if (raw) {
      const parsed = JSON.parse(raw) as MarkerPositions;
      if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
        return parsed;
      }
    }
  } catch {
    // 忽略解析错误
  }
  return DEFAULT_POSITIONS;
}

/** 保存单个标记点 */
export function saveMarkerPosition(id: string, position: [number, number, number]): void {
  const all = getMarkerPositions();
  all[id] = position;
  writeJSON(KEYS.positions, all);
}

// ===== 默认标记点名称 =====

/** 读取默认标记点名称覆盖（固化改名 + 本地改名合并） */
export function getMarkerNames(): Record<string, string> {
  const stored = readJSON<Record<string, string>>(KEYS.markerNames, {});
  return { ...DEFAULT_MARKER_NAMES, ...stored };
}

/** 更改默认标记点名称 */
export function renameMarker(id: string, name: string): void {
  const names = getMarkerNames();
  const trimmed = name.trim();
  if (trimmed) {
    names[id] = trimmed;
  } else {
    delete names[id];
  }
  writeJSON(KEYS.markerNames, names);
}

// ===== 大小 =====

export const DEFAULT_MARKER_SIZE = 0.01;

/** 读取标记点大小（中心红点半径） */
export function getMarkerSize(): number {
  const size = readJSON<number | null>(KEYS.size, null);
  return typeof size === "number" && size > 0 ? size : DEFAULT_MARKER_SIZE;
}

/** 保存标记点大小 */
export function saveMarkerSize(size: number): void {
  writeJSON(KEYS.size, size);
}

// ===== 删除的默认标记点 =====

/** 读取已删除的默认标记点 id 列表（固化删除 + 本地删除合并） */
export function getDeletedMarkerIds(): string[] {
  const stored = readJSON<string[]>(KEYS.deleted, []);
  return [...new Set([...DEFAULT_DELETED_MARKER_IDS, ...stored])];
}

/** 设置某个默认标记点是否删除 */
export function setMarkerDeleted(id: string, deleted: boolean): void {
  const ids = getDeletedMarkerIds();
  const next = deleted ? [...new Set([...ids, id])] : ids.filter((x) => x !== id);
  writeJSON(KEYS.deleted, next);
}

// ===== 自定义标记点 =====

/** 读取自定义新增的标记点 */
export function getCustomMarkers(): CustomMarker[] {
  return readJSON<CustomMarker[]>(KEYS.custom, []);
}

/** 新增自定义标记点，返回创建的标记 */
export function addCustomMarker(name: string, position: [number, number, number]): CustomMarker {
  const markers = getCustomMarkers();
  const marker: CustomMarker = {
    id: `custom_${Date.now()}`,
    name: name.trim() || "自定义部位",
    position,
  };
  writeJSON(KEYS.custom, [...markers, marker]);
  return marker;
}

/** 更新自定义标记点的名称 */
export function renameCustomMarker(id: string, name: string): void {
  const markers = getCustomMarkers();
  const next = markers.map((m) => (m.id === id ? { ...m, name } : m));
  writeJSON(KEYS.custom, next);
}

/** 更新自定义标记点的坐标 */
export function updateCustomMarkerPosition(id: string, position: [number, number, number]): void {
  const markers = getCustomMarkers();
  const next = markers.map((m) => (m.id === id ? { ...m, position } : m));
  writeJSON(KEYS.custom, next);
}

/** 删除自定义标记点 */
export function removeCustomMarker(id: string): void {
  const markers = getCustomMarkers();
  writeJSON(KEYS.custom, markers.filter((m) => m.id !== id));
}

// ===== 自定义白点 =====

export const DEFAULT_WHITE_DOT_SIZE = 0.01;
export const DEFAULT_WHITE_DOT_COLOR = "#ffffff";

/** 读取被删除的默认白点 id 列表 */
function getDeletedWhiteDotIds(): string[] {
  return readJSON<string[]>(KEYS.deletedWhiteDots, []);
}

/** 读取白点列表（默认白点 + 本地额外白点，默认可被本地覆盖/删除） */
export function getWhiteDots(): WhiteDot[] {
  const deletedIds = new Set(getDeletedWhiteDotIds());
  const defaults = DEFAULT_WHITE_DOTS.filter((d) => !deletedIds.has(d.id));

  const stored = readJSON<WhiteDot[]>(KEYS.whiteDots, []);
  const storedMap = new Map(stored.map((d) => [d.id, d]));

  // 默认白点（本地同 id 的覆盖），额外白点追加在后面
  const defaultIds = new Set(defaults.map((d) => d.id));
  const merged = defaults.map((d) => storedMap.get(d.id) || d);
  const extras = stored.filter((d) => !defaultIds.has(d.id));
  return [...merged, ...extras];
}

/** 新增白点，返回创建的白点 */
export function addWhiteDot(
  name: string,
  position: [number, number, number],
  color: string = DEFAULT_WHITE_DOT_COLOR
): WhiteDot {
  const dot: WhiteDot = {
    id: `dot_${Date.now()}`,
    name: name.trim() || "白点",
    position,
    color,
  };
  const stored = readJSON<WhiteDot[]>(KEYS.whiteDots, []);
  writeJSON(KEYS.whiteDots, [...stored, dot]);
  return dot;
}

/** 更新白点（名称/位置/颜色） */
export function updateWhiteDot(id: string, patch: Partial<Omit<WhiteDot, "id">>): void {
  const isDefault = DEFAULT_WHITE_DOTS.some((d) => d.id === id);
  const stored = readJSON<WhiteDot[]>(KEYS.whiteDots, []);
  if (isDefault && !stored.some((d) => d.id === id)) {
    // 默认白点首次修改：复制一份到本地存储（覆盖默认值）
    const def = DEFAULT_WHITE_DOTS.find((d) => d.id === id)!;
    writeJSON(KEYS.whiteDots, [...stored, { ...def, ...patch }]);
  } else {
    writeJSON(KEYS.whiteDots, stored.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }
}

/** 删除白点 */
export function removeWhiteDot(id: string): void {
  const isDefault = DEFAULT_WHITE_DOTS.some((d) => d.id === id);
  if (isDefault) {
    const deleted = getDeletedWhiteDotIds();
    writeJSON(KEYS.deletedWhiteDots, [...new Set([...deleted, id])]);
  } else {
    const stored = readJSON<WhiteDot[]>(KEYS.whiteDots, []);
    writeJSON(KEYS.whiteDots, stored.filter((d) => d.id !== id));
  }
}

/** 读取白点大小（半径） */
export function getWhiteDotSize(): number {
  const size = readJSON<number | null>(KEYS.whiteDotSize, null);
  return typeof size === "number" && size > 0 ? size : DEFAULT_WHITE_DOT_SIZE;
}

/** 保存白点大小 */
export function saveWhiteDotSize(size: number): void {
  writeJSON(KEYS.whiteDotSize, size);
}

// ===== 导出 / 导入 =====

/** 导出所有标记配置为 JSON 字符串 */
export function exportAllMarkerConfig(): string {
  return JSON.stringify(
    {
      positions: getMarkerPositions(),
      size: getMarkerSize(),
      deleted: getDeletedMarkerIds(),
      custom: getCustomMarkers(),
      whiteDots: getWhiteDots(),
      whiteDotSize: getWhiteDotSize(),
      names: getMarkerNames(),
    },
    null,
    2
  );
}

/** 从 JSON 字符串导入标记配置，成功返回 true */
export function importAllMarkerConfig(json: string): boolean {
  try {
    const config = JSON.parse(json);
    if (typeof config !== "object" || config === null) return false;

    if (config.positions && typeof config.positions === "object") {
      writeJSON(KEYS.positions, config.positions);
    }
    if (typeof config.size === "number") {
      writeJSON(KEYS.size, config.size);
    }
    if (Array.isArray(config.deleted)) {
      writeJSON(KEYS.deleted, config.deleted);
    }
    if (Array.isArray(config.custom)) {
      writeJSON(KEYS.custom, config.custom);
    }
    if (Array.isArray(config.whiteDots)) {
      writeJSON(KEYS.whiteDots, config.whiteDots);
    }
    if (typeof config.whiteDotSize === "number") {
      writeJSON(KEYS.whiteDotSize, config.whiteDotSize);
    }
    if (config.names && typeof config.names === "object") {
      writeJSON(KEYS.markerNames, config.names);
    }
    return true;
  } catch {
    return false;
  }
}

// ===== 全部重置 =====

/** 重置所有标记点配置 */
export function resetAllMarkers(): void {
  if (typeof window === "undefined") return;
  Object.values(KEYS).forEach((key) => window.localStorage.removeItem(key));
  notify();
}

/** 监听配置更新事件 */
export function onMarkerPositionsUpdated(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(UPDATE_EVENT, callback);
  return () => window.removeEventListener(UPDATE_EVENT, callback);
}
