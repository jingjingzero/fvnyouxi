const FILE_NAME = '_mylist.json'
const SETTINGS_FILE_NAME = '_settings.json'
// 判断是否为 5+APP
function isPlus() {
  return typeof window.plus !== 'undefined'
}

// 保存整个数组
export async function saveArray(arrayData) {
  const jsonStr = JSON.stringify(arrayData)
  if (isPlus()) {
    saveToFile(jsonStr)
  } else {
    localStorage.setItem(FILE_NAME, jsonStr)
  }
}

// 读取整个数组
export async function readArray() {
  if (isPlus()) {
    return await readFromFile()
  } else {
    const str = localStorage.getItem(FILE_NAME)
    return str ? JSON.parse(str) : []
  }
}

// ✅ 添加一条数据（自动 push）
export async function pushItem(item) {
  const array = await readArray()
  array.push(item)
  await saveArray(array)
}

// ✅ 获取全部数据
export async function getAllItems() {
  return await readArray()
}

// ✅ 清空所有数据
export async function clearAll() {
  await saveArray([])
}

// ✅ 删除某一项（通过索引）
export async function deleteItem(index) {
  const array = await readArray()
  array.splice(index, 1)
  await saveArray(array)
}
export async function upsertItemById(id, newItem) {
  const array = await readArray()
  const index = array.findIndex(item => item.id === id)

  if (index !== -1) {
    array[index] = { ...array[index], ...newItem }
  } else {
    array.push({ id, ...newItem })
  }

  await saveArray(array)
}
// ------------------- 设置项（音量、文字速度）------------------- //

const DEFAULT_SETTINGS = {
  volume: 0.6,
  text_speed: 94,
}

export async function saveSettings(settings) {
  const jsonStr = JSON.stringify(settings)
  if (isPlus()) {
    saveToFile(SETTINGS_FILE_NAME, jsonStr)
  } else {
    localStorage.setItem(SETTINGS_FILE_NAME, jsonStr)
  }
}

export async function readSettings() {
  if (isPlus()) {
    const res = await readFromFile(SETTINGS_FILE_NAME, {})
    return Object.assign({}, DEFAULT_SETTINGS, res)
  } else {
    const str = localStorage.getItem(SETTINGS_FILE_NAME)
    const obj = str ? JSON.parse(str) : {}
    return Object.assign({}, DEFAULT_SETTINGS, obj)
  }
}

export async function updateSetting(key, value) {
  const settings = await readSettings()
  settings[key] = value
  await saveSettings(settings)
}

// ----------- 5+ APP 文件操作 ----------- //

function saveToFile(jsonStr) {
  plus.io.requestFileSystem(plus.io.PRIVATE_DOC, (fs) => {
    fs.root.getFile(FILE_NAME, { create: true }, (fileEntry) => {
      fileEntry.createWriter((writer) => {
        writer.write(jsonStr)
      })
    })
  })
}

function readFromFile() {
  return new Promise((resolve, reject) => {
    plus.io.requestFileSystem(plus.io.PRIVATE_DOC, (fs) => {
      fs.root.getFile(FILE_NAME, { create: false }, (fileEntry) => {
        fileEntry.file((file) => {
          const reader = new plus.io.FileReader()
          reader.onloadend = (e) => {
            try {
              resolve(JSON.parse(e.target.result))
            } catch (err) {
              reject(err)
            }
          }
          reader.readAsText(file)
        })
      }, () => resolve([])) // 如果文件不存在则返回空数组
    })
  })
}
