/** 标记点定义 —— 供 3D 模型和编辑面板共用 */

export interface MarkerDot {
  id: string;        // 对应 body part id
  name: string;      // 中文名称
  position: [number, number, number]; // [x, y, z] —— z 仅表示前后方向（正=正面，负=背面），实际吸附由 raycast 计算
}

// 基于模型纹理中肌肉色块白点的精确位置（自动识别校正），z 为前后方向标记
export const MARKER_DOTS: MarkerDot[] = [
  // 头部
  { id: "head",       name: "头部",     position: [ 0.015,  1.790,  0.15 ] },
  { id: "left_eye",   name: "左眼",     position: [-0.080,  1.806,  0.15 ] },
  { id: "right_eye",  name: "右眼",     position: [ 0.058,  1.764,  0.15 ] },
  { id: "nose",       name: "鼻子",     position: [ 0.004,  1.753,  0.15 ] },
  { id: "mouth",      name: "口腔/下颌",position: [ 0.000,  1.675,  0.15 ] },
  { id: "left_ear",   name: "左耳",     position: [-0.200,  1.720,  0.10 ] },
  { id: "right_ear",  name: "右耳",     position: [ 0.200,  1.720,  0.10 ] },
  { id: "neck",       name: "颈部",     position: [ 0.003,  1.589,  0.12 ] },
  // 躯干正面
  { id: "chest",      name: "胸部",     position: [ 0.060,  1.425,  0.15 ] },
  { id: "abdomen",    name: "腹部",     position: [-0.021,  1.153,  0.15 ] },
  { id: "pelvis",     name: "骨盆/髋部",position: [-0.042,  0.895,  0.14 ] },
  // 躯干背面
  { id: "back_upper", name: "上背部",   position: [-0.033,  1.405, -0.14 ] },
  { id: "back_lower", name: "下背部/腰椎",position: [ 0.026,  1.107, -0.14 ] },
  // 上肢
  { id: "left_shoulder",  name: "左肩",   position: [-0.265, 1.437,  0.08 ] },
  { id: "right_shoulder", name: "右肩",   position: [ 0.243, 1.426,  0.08 ] },
  { id: "left_upper_arm", name: "左上臂", position: [-0.338, 1.242,  0.08 ] },
  { id: "right_upper_arm",name: "右上臂", position: [ 0.260, 1.346,  0.08 ] },
  { id: "left_elbow",     name: "左肘",   position: [-0.426, 1.113,  0.08 ] },
  { id: "right_elbow",    name: "右肘",   position: [ 0.411, 1.143,  0.08 ] },
  { id: "left_forearm",   name: "左前臂", position: [-0.494, 0.958,  0.08 ] },
  { id: "right_forearm",  name: "右前臂", position: [ 0.489, 0.967,  0.08 ] },
  { id: "forearm_medial_right", name: "右小臂内侧", position: [-0.34, 1.2, 0.01 ] },
  { id: "forearm_medial_left",  name: "左小臂内侧", position: [ 0.34, 1.2, 0.01 ] },
  { id: "left_wrist",     name: "左手腕/手",position: [-0.505, 0.899,  0.10 ] },
  { id: "right_wrist",    name: "右手腕/手",position: [ 0.503, 0.875,  0.10 ] },
  // 下肢
  { id: "left_thigh",   name: "左大腿",   position: [-0.125,  0.619,  0.06 ] },
  { id: "right_thigh",  name: "右大腿",   position: [ 0.133,  0.637,  0.06 ] },
  { id: "left_vastus_medialis",  name: "左股内侧肌", position: [-0.079, 0.588, 0.06 ] },
  { id: "right_vastus_medialis", name: "右股内侧肌", position: [ 0.090, 0.589, 0.06 ] },
  { id: "left_knee",    name: "左膝",     position: [-0.165,  0.505,  0.08 ] },
  { id: "right_knee",   name: "右膝",     position: [ 0.164,  0.492,  0.08 ] },
  { id: "left_calf",    name: "左小腿",   position: [-0.174,  0.272,  0.06 ] },
  { id: "right_calf",   name: "右小腿",   position: [ 0.202,  0.246,  0.06 ] },
  { id: "left_ankle",   name: "左脚踝/足",position: [-0.205,  0.052,  0.12 ] },
  { id: "right_ankle",  name: "右脚踝/足",position: [ 0.199,  0.021,  0.12 ] },
];

export const MARKER_DOT_IDS = MARKER_DOTS.map((m) => m.id);
