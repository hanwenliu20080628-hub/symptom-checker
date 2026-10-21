/**
 * 自建统计（Supabase）共享模块。
 * 只存匿名编号 + 页面路径 + 时间 + 问卷选项；不存 IP、不存自由文本。
 * anon key 为公开钥匙，权限已被 RLS 限制为仅这几张表。
 */
export const SB_URL = "https://tfeereouyxkhvvrieiud.supabase.co";
export const SB_KEY = "sb_publishable_ggO28Lk6R233xO97I5B_gA_x_I1qJi3";

export function getVisitorId(): string {
  try {
    let v = localStorage.getItem("vid");
    if (!v) {
      v =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `v-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem("vid", v);
    }
    return v;
  } catch {
    return "";
  }
}

export function sbHeaders(pref?: string): Record<string, string> {
  const h: Record<string, string> = {
    apikey: SB_KEY,
    Authorization: `Bearer ${SB_KEY}`,
    "Content-Type": "application/json",
  };
  if (pref) h.Prefer = pref;
  return h;
}

/** 插入一行（静默失败，不阻塞 UI） */
export function sbPost(table: string, row: Record<string, unknown>, pref?: string) {
  try {
    fetch(`${SB_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: sbHeaders(pref),
      body: JSON.stringify(row),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

/** 记录一次浏览：UV 去重 + PV +1 */
export function trackPageView(path: string) {
  const vid = getVisitorId();
  sbPost("visitors", { visitor_id: vid }, "resolution=ignore-duplicates,return=minimal");
  sbPost("page_views", { visitor_id: vid, path });
}

/** 记录一条问卷（仅选项） */
export function trackSurvey(opts: {
  rating?: string | null;
  bodyPart?: string | null;
  answers?: Record<string, unknown>;
}) {
  sbPost("survey_responses", {
    visitor_id: getVisitorId(),
    rating: opts.rating ?? null,
    body_part: opts.bodyPart ?? null,
    answers: opts.answers ?? {},
  });
}

/** 计数（利用 content-range 拿总数） */
export async function sbCount(table: string, col = "id"): Promise<number> {
  const res = await fetch(`${SB_URL}/rest/v1/${table}?select=${col}&limit=1`, {
    headers: sbHeaders("count=exact"),
  });
  if (!res.ok) throw new Error(`统计读取失败（HTTP ${res.status}）`);
  const range = res.headers.get("content-range") || "0-0/0";
  const total = parseInt(range.split("/")[1] || "0", 10);
  return Number.isFinite(total) ? total : 0;
}

/** 查询多行 */
export async function sbSelect<T = Record<string, unknown>>(
  table: string,
  cols: string,
  limit = 2000
): Promise<T[]> {
  const res = await fetch(
    `${SB_URL}/rest/v1/${table}?select=${cols}&limit=${limit}&order=ts.desc`,
    { headers: sbHeaders() }
  );
  if (!res.ok) throw new Error(`评价读取失败（HTTP ${res.status}）`);
  return (await res.json()) as T[];
}
