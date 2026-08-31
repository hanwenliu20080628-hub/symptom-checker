import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

/** 构建发送给 DeepSeek 的医学分析 prompt */
function buildPrompt(bodyPart, symptoms) {
  return `你是医学知识助手。用户选中了身体部位「${bodyPart}」，并描述了以下症状：

"${symptoms}"

请严格遵守以下格式回复（JSON 格式，不要加额外说明）：

{
  "possibleCauses": ["原因1", "原因2", "原因3"],
  "severity": "low" | "medium" | "high",
  "suggestions": "康复与护理建议，用换行分隔要点",
  "department": "推荐科室或null",
  "shouldSeeDoctor": true | false,
  "disclaimer": "本内容仅供参考，不能替代专业医疗诊断。如有持续或加重的症状，请及时就医。"
}

要求：
1. severity 判断标准：low=日常可自行处理，medium=建议关注，high=建议尽快就医
2. suggestions 要具体可执行，避免空泛
3. department 仅当 shouldSeeDoctor=true 时填写
4. 必须包含 disclaimer 字段
5. 所有回答基于通用医学知识，不虚构不夸大`;
}

/** 解析 DeepSeek 返回的文本为结构化结果 */
function parseAIResponse(text) {
  try {
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

/** 健康检查 */
app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "symptom-checker-server" });
});

/** 症状分析接口 */
app.post("/api/analyze", async (req, res) => {
  try {
    const { bodyPart, symptoms } = req.body || {};

    if (!bodyPart || !symptoms || String(symptoms).trim().length < 5) {
      return res
        .status(400)
        .json({ error: "请提供有效的部位和症状描述（至少5个字）" });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "服务未配置，请联系管理员" });
    }

    const prompt = buildPrompt(bodyPart, symptoms);
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
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
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`DeepSeek API error ${response.status}:`, errText);
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const result = parseAIResponse(content);

    return res.json(result);
  } catch (error) {
    console.error("Analyze error:", error);
    return res
      .status(500)
      .json({ error: "分析服务暂时不可用，请稍后重试" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`symptom-checker-server running on port ${PORT}`);
});
