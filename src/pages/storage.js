import { useCounterStore } from "@/store/counter";

const SETTINGS_FILE_NAME = "_settings.json";
const DEFAULT_SETTINGS = {
  volume: 0.6,
  text_speed: 98,
  textSize: 18,
};

// 判断是否为 5+APP 环境
function isPlus() {
  return typeof window.plus !== "undefined";
}

// 通用存储方法
export function setStorage(key, value) {
  console.log("保存存档");
  const stringValue = typeof value === "string" ? value : JSON.stringify(value);
  if (isPlus()) {
    plus.storage.setItem(key, stringValue);
  } else {
    localStorage.setItem(key, stringValue);
  }
}

export function getStorage(key) {
  let value;
  if (isPlus()) {
    value = plus.storage.getItem(key);
  } else {
    value = localStorage.getItem(key);
  }

  try {
    return JSON.parse(value);
  } catch (e) {
    return value; // 如果不是 JSON 字符串，直接返回原始值
  }
}

// 读取设置
export async function readSettings() {
  let str;
  if (isPlus()) {
    str = plus.storage.getItem(SETTINGS_FILE_NAME);
  } else {
    str = localStorage.getItem(SETTINGS_FILE_NAME);
  }

  const obj = str ? JSON.parse(str) : {};
  return Object.assign({}, DEFAULT_SETTINGS, obj);
}

// 保存设置
export async function saveSettings(settings) {
  const user = useCounterStore();
  const jsonStr = JSON.stringify(settings);

  if (isPlus()) {
    user.shoujitishi.con1 = "5+APP";
    plus.storage.setItem(SETTINGS_FILE_NAME, jsonStr);
  } else {
    user.shoujitishi.con1 = "本地";
    localStorage.setItem(SETTINGS_FILE_NAME, jsonStr);
  }
}

// 更新单个设置
export async function updateSetting(key, value) {
  const settings = await readSettings();
  settings[key] = value;
  await saveSettings(settings);
}
