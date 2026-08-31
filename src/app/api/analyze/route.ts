import { NextRequest, NextResponse } from "next/server";
import { buildPrompt } from "@/lib/prompt";
import { AnalyzeResult } from "@/types";

function parseAIResponse(text: string): AnalyzeResult {
  try {
    // 尝试提取 JSON 块
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        possibleCauses: Array.isArray(parsed.possibleCauses)
          ? parsed.possibleCauses.slice(0, 3)
          : ["暂无法确定具体原因"],
        severity: ["low", "medium", "high"].includes(parsed.severity)
          ? parsed.severity
          : "medium",
        suggestions: parsed.suggestions || "请咨询专业医生获取建议",
        department: parsed.department || null,
        shouldSeeDoctor: Boolean(parsed.shouldSeeDoctor),
        disclaimer:
          parsed.disclaimer ||
          "本内容仅供参考，不能替代专业医疗诊断。如有持续或加重的症状，请及时就医。",
      };
    }
  } catch {
    // fallback
  }

  // 解析失败时的回退方案：将原文分段展示
  const lines = text.split("\n").filter((l) => l.trim());
  return {
    possibleCauses: ["无法解析 AI 返回结果，请查看下方原始建议"],
    severity: "medium",
    suggestions: lines.join("\n"),
    department: null,
    shouldSeeDoctor: true,
    disclaimer:
      "本内容仅供参考，不能替代专业医疗诊断。如有持续或加重的症状，请及时就医。",
  };
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

    const prompt = buildPrompt(bodyPart, symptoms);
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      // 开发模式下，如果未配置 API Key，返回模拟数据
      if (process.env.NODE_ENV === "development") {
        return NextResponse.json({
          possibleCauses: [
            "姿势不当引起的肌肉疲劳：长时间保持同一姿势所致",
            "轻度软组织损伤：可能因运动或日常活动引起",
            "关节退行性变化：随年龄增长的自然现象（如为中老年人）",
          ],
          severity: "medium",
          suggestions:
            "1. 适当休息，避免加重症状的活动\n2. 可尝试热敷缓解不适，每次15-20分钟\n3. 保持正确姿势，避免久坐久站\n4. 适度拉伸放松紧张肌肉\n5. 如3-5天症状未缓解或加重，建议就医",
          department: "骨科 / 康复科",
          shouldSeeDoctor: true,
          disclaimer:
            "[开发模式] 本内容仅供参考，不能替代专业医疗诊断。请配置 DEEPSEEK_API_KEY 获取真实分析。",
        });
      }

      return NextResponse.json(
        { error: "服务未配置，请联系管理员" },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://api.deepseek.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 800,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error(`DeepSeek API error ${response.status}:`, errText);
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const result = parseAIResponse(content);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json(
      { error: "分析服务暂时不可用，请稍后重试" },
      { status: 500 }
    );
  }
}
