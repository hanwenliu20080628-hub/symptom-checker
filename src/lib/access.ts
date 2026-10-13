/**
 * 访问码门禁（受邀制软门槛）
 *
 * 注意：访问码硬编码在前端，会被打进 JS chunk，懂技术的人可从浏览器源码看到。
 * 本机制用于"防陌生人误入"，非真正的安全认证。要真安全需移到后端验证。
 */

export const ACCESS_CODE = "20261234";
const ACCESS_KEY = "access_granted";

/** 当前浏览器是否已通过访问码验证 */
export function hasAccess(): boolean {
  try {
    return localStorage.getItem(ACCESS_KEY) === "yes";
  } catch {
    return false;
  }
}

/** 记录已通过验证（本浏览器记住，刷新无需重输） */
export function grantAccess(): void {
  try {
    localStorage.setItem(ACCESS_KEY, "yes");
  } catch {
    // localStorage 不可用：仅本次会话有效
  }
}
