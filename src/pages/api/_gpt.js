import OpenAI from "openai";

// 支持 OpenAI 官方，也支持任何 OpenAI 兼容的中转站（设 OPENAI_BASE_URL 即可）
const apiKey = process.env.OPENAI_API_KEY || "APIKEY_NOT_FOUND";
const baseURL = process.env.OPENAI_BASE_URL || undefined;

const openai = new OpenAI(baseURL ? { apiKey, baseURL } : { apiKey });

function systemPromptFor(instructions) {
  return `
  You are a helpful assistant reformat, clean, edit the markdown content. Below are the instructions to follow:
  ${instructions}
  
  Apply the instructions on user-provided markdown below and provide the array of string replacement operations required. Do note that changes are applied sequentially.
  
  Give your changes in JSON format: { "changeList": [{originalText: "SOMETHING HERE", changedTo: "WILL BE CHANGED TO THIS"}] }
  
  If your change is an addition, the originalText will be any lines before or after the addition, and the changedTo will be the addition itself along with the included before/after lines.

  MAKE SURE THE "originalText" PART IS EXACTLY AS IT APPEARS IN THE MARKDOWN OTHERWISE IT WILL NOT BE REPLACED.

  Respond with JSON only, no markdown code fences.
  `;
}

// 尽量从模型输出里抠出 JSON —— 有些模型会加 ```json 围栏或不严格遵守 JSON 模式
function extractJson(text) {
  if (!text) throw new Error("模型返回为空 / Empty response from model");
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  try {
    return JSON.parse(raw.trim());
  } catch (e) {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(raw.slice(start, end + 1));
    }
    throw new Error("模型返回的不是合法 JSON / Model did not return valid JSON");
  }
}

export async function runGPT(model, markdown, instructions) {
  const basePayload = {
    model: model,
    messages: [
      { role: "system", content: systemPromptFor(instructions) },
      { role: "user", content: markdown },
    ],
  };

  let content;
  try {
    // 先试 JSON 模式
    const response = await openai.chat.completions.create({
      ...basePayload,
      response_format: { type: "json_object" },
    });
    content = response.choices[0].message.content;
  } catch (error) {
    // 部分模型或中转站不支持 response_format，降级为普通请求
    console.log("JSON 模式不可用，降级为普通请求:", error.message);
    const response = await openai.chat.completions.create(basePayload);
    content = response.choices[0].message.content;
  }

  try {
    const parsed = extractJson(content);
    const changeList = parsed.changeList;
    if (!Array.isArray(changeList)) {
      throw new Error("返回里没有 changeList 数组 / No changeList in response");
    }
    let output = markdown;
    changeList.forEach((change) => {
      if (!change || !change.originalText) return;
      output = output.replace(change.originalText, change.changedTo ?? "");
    });
    return { content: output, changes: changeList };
  } catch (error) {
    console.error("解析模型输出失败:", error.message);
    throw new Error(`AI 处理失败 / AI processing failed: ${error.message}`);
  }
}
