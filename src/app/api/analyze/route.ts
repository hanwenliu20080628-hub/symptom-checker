import { NextRequest, NextResponse } from "next/server";
import { buildPrompt } from "@/lib/prompt";
import {
  parseAIResponse,
  hasBanned,
  fallbackResult,
  DISCLAIMER,
} from "@/lib/ai-guard";
import { AnalyzeResult } from "@/types";

/** 调用 DeepSeek，返回 AI 文本（失败抛错） */
async function callDeepSeek(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch(
    "https://api.deepseek.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-v4-flash",
        messages: [{ role: "user", content: prompt }],
        thinking: { type: "enabled" },
        reasoning_effort: "low",
        max_tokens: 4000,
        // response_format: { type: "json_object" },
        // ↑ 思考模式下是否支持需实测：支持就打开；返回 400 就保持注释，用正则提取
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error(`DeepSeek API error ${response.status}:`, errText);
    throw new Error(`DeepSeek API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

export async function POST(req: NextRequest) {
  try {
    const { bodyPart, symptoms } = await req.json();

    if (!bodyPart || !symptoms || symptoms.trim().length < 5) {
      return NextResponse.json(
        { error: "请提供有效的部位和症状描述（至少5个字）" },
        { status: 400 }
      );
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      // 开发模式下，如果未配置 API Key，返回模拟数据（9 字段契约）
      if (process.env.NODE_ENV === "development") {
        const mock: AnalyzeResult = {
          symptomSummary:
            "该部位疼痛约数天，活动后加重，休息可缓解；无麻木、无力等伴随表现。",
          possibleCauses: [
            "运动量突然增加或热身不足引起的肌肉疲劳",
            "长时间保持同一姿势或姿势不良",
            "该部位常见的相关问题还包括轻微软组织劳损等，具体原因需医生评估",
          ],
          severity: "medium",
          suggestions:
            "适当休息，暂时减少引起不适的活动\n保持正确姿势，避免久坐久站\n如过程中疼痛加重或出现不适，应停止并咨询专业人士。",
          whenToSeeDoctor: [
            "休息后症状不缓解或逐渐加重",
            "出现明显肿胀、关节卡住或打软腿",
            "出现麻木或无力",
            "影响日常活动或睡眠",
          ],
          questionsForDoctor: [
            "需要做哪些检查来明确原因？",
            "恢复期间哪些活动需要避免？",
            "什么情况下需要复诊？",
          ],
          department: "骨科 / 运动医学科 / 康复医学科",
          shouldSeeDoctor: true,
          disclaimer: "[开发模式] " + DISCLAIMER,
        };
        return NextResponse.json(mock);
      }

      return NextResponse.json(
        { error: "服务未配置，请联系管理员" },
        { status: 500 }
      );
    }

    const prompt = buildPrompt(bodyPart, symptoms);

    // 首次调用
    let content = await callDeepSeek(prompt, apiKey);
    let result = parseAIResponse(content, symptoms);

    // 违禁用语检查：命中则重试一次，再命中用兜底文案
    if (result && hasBanned(result)) {
      console.warn("Banned wording detected, retrying once");
      content = await callDeepSeek(prompt, apiKey);
      result = parseAIResponse(content, symptoms);
      if (result && hasBanned(result)) {
        result = null;
      }
    }

    // 解析失败或违禁仍命中：固定兜底，不展示 AI 原文
    if (!result) {
      result = fallbackResult(symptoms);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json(
      { error: "分析服务暂时不可用，请稍后重试" },
      { status: 500 }
    );
  }
}
