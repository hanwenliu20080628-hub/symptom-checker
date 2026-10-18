/**
 * 参与同意状态管理（参与说明与免责声明）
 *
 * - 同意记录按声明版本号存储：声明内容更新时只需升级 CONSENT_VERSION，
 *   所有用户将重新弹出并需重新同意
 * - 同意记录存于访客浏览器 localStorage（每个访客自己的同意记录，
 *   属浏览器侧状态；声明全文与版本以源码为准，跨设备一致）
 */

export const CONSENT_VERSION = "v1.5";
export const CONSENT_EFFECTIVE_DATE = "2026 年 10 月 18 日";
export const CONSENT_KEY = `consent_${CONSENT_VERSION}`;
let sessionConsented: boolean | null = null;
let memoryOnlyConsent = false;

/** 是否已同意当前版本的声明 */
export function hasConsented(): boolean {
  if (sessionConsented === false) return false;
  // 只有无法写入存储时才采用内存同意；正常情况下读取最新持久状态，
  // 避免其他页面撤回后，本页或后退缓存继续使用旧的同意。
  if (memoryOnlyConsent) return true;
  try {
    return localStorage.getItem(CONSENT_KEY) === "agreed";
  } catch {
    return sessionConsented === true;
  }
}

/** 记录同意并广播事件（供 Tracker 等监听方在同意后再开始统计上报） */
export function markConsented(): void {
  sessionConsented = true;
  memoryOnlyConsent = false;
  try {
    localStorage.setItem(CONSENT_KEY, "agreed");
  } catch {
    memoryOnlyConsent = true;
    // localStorage 不可用（如部分无痕模式）：仅本次会话生效，刷新后需重新同意
  }
  window.dispatchEvent(new Event("consent-granted"));
}

/** 撤回当前版本同意；调用方随后离开当前文档以终止已运行的第三方脚本。 */
export function revokeConsent(): void {
  sessionConsented = false;
  memoryOnlyConsent = false;
  try {
    localStorage.removeItem(CONSENT_KEY);
  } catch {
    // 存储不可用时清除本页内存状态。
  }
}
