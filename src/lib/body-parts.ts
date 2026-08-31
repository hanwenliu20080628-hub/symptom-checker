import { BodyPart } from "@/types";

export const BODY_PARTS: BodyPart[] = [
  // 头部
  { id: "head", name: "头部", meshNames: ["head", "skull"], category: "head" },
  { id: "left_eye", name: "左眼", meshNames: ["left_eye"], category: "head" },
  { id: "right_eye", name: "右眼", meshNames: ["right_eye"], category: "head" },
  { id: "nose", name: "鼻子", meshNames: ["nose"], category: "head" },
  { id: "mouth", name: "口腔/下颌", meshNames: ["mouth", "jaw"], category: "head" },
  { id: "left_ear", name: "左耳", meshNames: ["left_ear"], category: "head" },
  { id: "right_ear", name: "右耳", meshNames: ["right_ear"], category: "head" },
  { id: "neck", name: "颈部", meshNames: ["neck"], category: "head" },

  // 躯干
  { id: "chest", name: "胸部", meshNames: ["chest", "ribcage"], category: "torso" },
  { id: "abdomen", name: "腹部", meshNames: ["abdomen", "belly"], category: "torso" },
  { id: "back_upper", name: "上背部", meshNames: ["upper_back"], category: "torso" },
  { id: "back_lower", name: "下背部/腰椎", meshNames: ["lower_back", "lumbar"], category: "torso" },
  { id: "pelvis", name: "骨盆/髋部", meshNames: ["pelvis", "hip"], category: "torso" },

  // 上肢
  { id: "left_shoulder", name: "左肩", meshNames: ["left_shoulder"], category: "arm" },
  { id: "right_shoulder", name: "右肩", meshNames: ["right_shoulder"], category: "arm" },
  { id: "left_upper_arm", name: "左上臂", meshNames: ["left_upper_arm"], category: "arm" },
  { id: "right_upper_arm", name: "右上臂", meshNames: ["right_upper_arm"], category: "arm" },
  { id: "left_elbow", name: "左肘", meshNames: ["left_elbow"], category: "arm" },
  { id: "right_elbow", name: "右肘", meshNames: ["right_elbow"], category: "arm" },
  { id: "left_forearm", name: "左前臂", meshNames: ["left_forearm"], category: "arm" },
  { id: "right_forearm", name: "右前臂", meshNames: ["right_forearm"], category: "arm" },
  { id: "left_wrist", name: "左手腕/手", meshNames: ["left_wrist", "left_hand"], category: "arm" },
  { id: "right_wrist", name: "右手腕/手", meshNames: ["right_wrist", "right_hand"], category: "arm" },

  // 下肢
  { id: "left_thigh", name: "左大腿", meshNames: ["left_thigh"], category: "leg" },
  { id: "right_thigh", name: "右大腿", meshNames: ["right_thigh"], category: "leg" },
  { id: "left_vastus_medialis", name: "左股内侧肌", meshNames: ["left_vastus_medialis"], category: "leg" },
  { id: "right_vastus_medialis", name: "右股内侧肌", meshNames: ["right_vastus_medialis"], category: "leg" },
  { id: "left_knee", name: "左膝", meshNames: ["left_knee"], category: "leg" },
  { id: "right_knee", name: "右膝", meshNames: ["right_knee"], category: "leg" },
  { id: "left_calf", name: "左小腿", meshNames: ["left_calf", "left_shin"], category: "leg" },
  { id: "right_calf", name: "右小腿", meshNames: ["right_calf", "right_shin"], category: "leg" },
  { id: "left_ankle", name: "左脚踝/足", meshNames: ["left_ankle", "left_foot"], category: "leg" },
  { id: "right_ankle", name: "右脚踝/足", meshNames: ["right_ankle", "right_foot"], category: "leg" },
];

/** 根据 mesh 名称或部位 id 查找对应的身体部位 */
export function findBodyPartByMesh(meshName: string): BodyPart | null {
  const lowerName = meshName.toLowerCase();
  for (const part of BODY_PARTS) {
    // 优先精确匹配 id，再匹配 meshNames
    if (part.id === lowerName) return part;
    if (part.meshNames.some((n) => lowerName.includes(n))) {
      return part;
    }
  }
  return null;
}

/** 根据 ID 查找身体部位 */
export function getBodyPartById(id: string): BodyPart | null {
  return BODY_PARTS.find((p) => p.id === id) || null;
}
