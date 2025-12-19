// /src/zujian/xlsx2story.js
import * as XLSX from "xlsx";

/**
 * 通用 Excel → story 对象解析器
 * 自动读取 Excel 所有列
 * 放在 public/story.xlsx
 */
export async function loadStoryAuto() {
  try {
    // 1️⃣ 读取 Excel
    const res = await fetch("/story.xlsx");
    if (!res.ok) throw new Error("无法加载 story.xlsx");

    const arrayBuffer = await res.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    // 2️⃣ 默认读取第一个 sheet
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    const story = {};

    rows.forEach((row, index) => {
      const node = row.node;
      const step = Number(row.step);

      // 跳过空行或非法 step
      if (!node || isNaN(step)) return;

      if (!story[node]) story[node] = { content: [] };

      const item = {};

      // 3️⃣ 自动遍历每一列
      Object.keys(row).forEach(key => {
        if (!row[key] || key === "node" || key === "step") return;

        // 3a. JSON 字段解析 (_json 后缀)
        if (key.endsWith("_json")) {
          try {
            item[key.replace("_json", "")] = JSON.parse(row[key]);
          } catch (e) {
            console.warn(`行 ${index + 2} ${key} 解析失败`, e);
          }
        }
        else if (key === "HPxushi") {
          item.HPxushi = String(row.HPxushi).split(/\r?\n/);
        } 
        // 3c. flags 多 flag 支持
        else if (key === "tishi") {
          item.tishi = Number(row.tishi)
        }
        else if(key === "kucun"){
          item.kucun = row.kucun=='1'?true:false
        }else if(key === "textJuxu"){
          item.textJuxu = row.textJuxu=='1'?true:false
        }
        // 3d. 其他字段直接赋值
        else {
          item[key] = row[key];
        }
      });

      // 4️⃣ 添加 step 临时字段，用于排序
      story[node].content.push({
        __step: step,
        ...item,
      });
    });

    // 5️⃣ 按 step 排序 & 删除临时字段
    Object.values(story).forEach(block => {
      block.content
        .sort((a, b) => a.__step - b.__step)
        .forEach(i => delete i.__step);
    });

    return story;
  } catch (err) {
    console.error("读取 story.xlsx 出错：", err);
    return {};
  }
}
