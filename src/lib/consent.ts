/**
 * 参与同意状态管理（参与说明与免责声明）
 *
 * - 同意记录按声明版本号存储：声明内容更新时只需升级 CONSENT_VERSION，
 *   所有用户将重新弹出并需重新同意
 * - 同意记录存于访客浏览器 localStorage（每个访客自己的同意记录，
 *   属浏览器侧状态；声明全文与版本以源码为准，跨设备一致）
 */

export const CONSENT_VERSION = "v1.1";
export const CONSENT_KEY = `consent_${CONSENT_VERSION}`;

/** 是否已同意当前版本的声明 */
export function hasConsented(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === "agreed";
  } catch {
    return false;
  }
}

/** 记录同意并广播事件（供 Tracker 等监听方在同意后再开始统计上报） */
export function markConsented(): void {
  try {
    localStorage.setItem(CONSENT_KEY, "agreed");
  } catch {
    // localStorage 不可用（如部分无痕模式）：仅本次会话生效，刷新后需重新同意
  }
  window.dispatchEvent(new Event("consent-granted"));
}
