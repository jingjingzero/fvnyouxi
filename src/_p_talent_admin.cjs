const fs = require('fs');
let n = 0;
function patch(path, fn) {
  const raw = fs.readFileSync(path, 'utf8');
  const crlf = raw.includes('\r\n');
  const result = fn(raw.replace(/\r/g, ''));
  fs.writeFileSync(path, crlf ? result.split('\n').join('\r\n') : result);
  n++;
}

// ========== 1) vite.config.js：中间件支持 talent 写入 ==========
patch('vite.config.js', (s) => {
  const R = (old, neu) => { if (!s.includes(old)) { console.error('✗ vite.config 锚点未找到: ' + old.slice(0, 60)); process.exit(1); } s = s.replace(old, neu); };
  R(`                const results = [];
                for (const op of ops) {
                  const rawFile = String(op.file || '');`,
`                const results = [];
                for (const op of ops) {
                  // 🎓 天赋配置写入：整块替换 counter.js 的 DEFAULT_TALENT_CONFIG_SNAPSHOT 数组（对话目录之外的特殊写入）
                  if (op.kind === 'talent') {
                    const code = String(op.code || '');
                    const tp = pathMod.join(process.cwd(), 'src', 'store', 'counter.js');
                    if (!fs.existsSync(tp)) { results.push({ file: 'counter.js', ok: false, msg: '文件不存在' }); continue; }
                    let ts = fs.readFileSync(tp, 'utf8');
                    const tcrlf = ts.includes('\\r\\n');
                    ts = ts.replace(/\\r\\n/g, '\\n');
                    const tStart = ts.indexOf('const DEFAULT_TALENT_CONFIG_SNAPSHOT = [');
                    if (tStart < 0) { results.push({ file: 'counter.js', ok: false, msg: '未找到天赋配置数组' }); continue; }
                    const tEndM = ts.slice(tStart).match(/^        \\];/m);
                    if (!tEndM) { results.push({ file: 'counter.js', ok: false, msg: '未找到天赋数组结尾' }); continue; }
                    const tEnd = tStart + tEndM.index + tEndM[0].length;
                    ts = ts.slice(0, tStart) + 'const DEFAULT_TALENT_CONFIG_SNAPSHOT = [\\n' + code + '\\n        ];' + ts.slice(tEnd);
                    try { server.watcher.unwatch(tp); } catch (e) {}
                    fs.writeFileSync(tp, tcrlf ? ts.replace(/\\n/g, '\\r\\n') : ts, 'utf8');
                    try { server.watcher.add(tp); } catch (e) {}
                    console.log('[dladmin-write] counter.js talent → OK');
                    results.push({ file: 'counter.js', ok: true, msg: '天赋配置写入' });
                    continue;
                  }
                  const rawFile = String(op.file || '');`);
  return s;
});

// ========== 2) DialogueAdmin.vue：story tab 左右布局 + 天赋编辑器 ==========
patch('pages/pixi/dialogue/DialogueAdmin.vue', (s) => {
  const R = (old, neu) => { if (!s.includes(old)) { console.error('✗ DialogueAdmin 锚点未找到: ' + old.slice(0, 60)); process.exit(1); } s = s.replace(old, neu); };

  // ① story tab：左剧情预览 + 右编辑天赋
  R(`      <!-- ============ Tab2 查看剧情对话 ============ -->
      <div v-show="curTab === 'story'" class="h-full flex flex-col gap-2">
        <div class="flex items-center gap-2 shrink-0 flex-wrap">
          <span class="text-xs text-gray-400">从当前文件 <b class="text-amber-300">{{ curFile }}.js</b> 生成剧情预览（按对话流分组，可选中文字复制）</span>
          <div class="flex-1"></div>
          <el-button size="small" type="warning" @click="buildStoryText()">↻ 重新生成</el-button>
          <el-button size="small" type="primary" @click="copyText(plainStoryText)">📋 复制全文</el-button>
        </div>
        <pre class="flex-1 min-h-0 overflow-auto rounded-lg p-3 text-[16px] font-mono whitespace-pre leading-relaxed" style="background:#0b0e14;border:1px solid rgba(255,255,255,.08);color:rgba(209,213,219,.92);user-select:text!important;-webkit-user-select:text!important" v-html="storyText || '（加载文件后点「重新生成」）'"></pre>
      </div>`,
`      <!-- ============ Tab2 查看剧情对话 ============ -->
      <div v-show="curTab === 'story'" class="h-full flex gap-2">
        <!-- 左侧：剧情预览 -->
        <div class="flex-1 min-w-0 flex flex-col gap-2">
          <div class="flex items-center gap-2 shrink-0 flex-wrap">
            <span class="text-xs text-gray-400">从当前文件 <b class="text-amber-300">{{ curFile }}.js</b> 生成剧情预览（按对话流分组，可选中文字复制）</span>
            <div class="flex-1"></div>
            <el-button size="small" type="warning" @click="buildStoryText()">↻ 重新生成</el-button>
            <el-button size="small" type="primary" @click="copyText(plainStoryText)">📋 复制全文</el-button>
          </div>
          <pre class="flex-1 min-h-0 overflow-auto rounded-lg p-3 text-[16px] font-mono whitespace-pre leading-relaxed" style="background:#0b0e14;border:1px solid rgba(255,255,255,.08);color:rgba(209,213,219,.92);user-select:text!important;-webkit-user-select:text!important" v-html="storyText || '（加载文件后点「重新生成」）'"></pre>
        </div>
        <!-- 🎓 右侧：编辑天赋 -->
        <div class="w-[420px] shrink-0 flex flex-col gap-2 rounded-xl p-3" style="background:#141821;border:1px solid rgba(255,255,255,.08)">
          <div class="flex items-center gap-2 shrink-0">
            <span class="text-xs font-bold" style="color:rgba(229,231,235,.85)">🎓 编辑天赋</span>
            <span class="text-[10px]" style="color:rgba(107,114,128,.7)">counter.js · 读档自动生效</span>
            <div class="flex-1"></div>
            <el-button size="small" @click="loadTalentConfig()">加载</el-button>
            <el-button size="small" type="primary" :disabled="!talentLoaded" @click="saveTalentConfig()">💾 保存写入</el-button>
          </div>
          <!-- 天赋列表 + 编辑表单 -->
          <div class="flex gap-2 min-h-0 flex-1">
            <div class="w-[170px] shrink-0 flex flex-col gap-1 overflow-y-auto pr-1">
              <button v-for="t in talentEditList" :key="t.id"
                class="text-left px-2 py-1 rounded text-[16px] transition-all truncate"
                :class="talentSelId === t.id ? 'bg-amber-400 text-black font-bold' : 'bg-white/5 text-gray-300 hover:bg-white/10'"
                @click="selectTalent(t.id)">
                <span class="text-[10px] opacity-60">T{{ t.tier || 1 }}</span> {{ t.id }}<span class="text-[10px] opacity-70"> · {{ t.name }}</span>
              </button>
              <button class="text-left px-2 py-1 rounded text-[16px] border border-dashed border-white/15 text-amber-300/90 hover:bg-white/10" @click="addTalent">＋ 新增天赋</button>
            </div>
            <!-- 选中天赋编辑表单 -->
            <div class="flex-1 min-w-0 overflow-y-auto pr-1 space-y-1.5" v-if="selTalent">
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] w-14 shrink-0" style="color:rgba(156,163,175,.9)">ID</span>
                <el-input v-model="selTalent.id" size="small" class="input-light flex-1!" />
              </div>
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] w-14 shrink-0" style="color:rgba(156,163,175,.9)">名称</span>
                <el-input v-model="selTalent.name" size="small" class="input-light flex-1!" />
              </div>
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] w-14 shrink-0" style="color:rgba(156,163,175,.9)">花费</span>
                <el-input-number v-model="selTalent.cost" :min="0" :max="99" size="small" class="input-light flex-1!" />
                <span class="text-[10px] w-14 shrink-0" style="color:rgba(156,163,175,.9)">升级花费</span>
                <el-input-number v-model="selTalent.levelCost" :min="0" :max="99" size="small" class="input-light flex-1!" />
              </div>
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] w-14 shrink-0" style="color:rgba(156,163,175,.9)">上限</span>
                <el-input-number v-model="selTalent.maxLevel" :min="1" :max="99" size="small" class="input-light flex-1!" />
                <span class="text-[10px] w-14 shrink-0" style="color:rgba(156,163,175,.9)">颜色</span>
                <el-color-picker v-model="selTalent.color" size="small" />
              </div>
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] w-14 shrink-0" style="color:rgba(156,163,175,.9)">层级</span>
                <el-input-number v-model="selTalent.tier" :min="1" :max="20" size="small" class="input-light flex-1!" />
                <span class="text-[10px] w-14 shrink-0" style="color:rgba(156,163,175,.9)">列</span>
                <el-input-number v-model="selTalent.col" :min="-20" :max="20" :step="0.1" size="small" class="input-light flex-1!" />
              </div>
              <!-- 前置天赋 -->
              <div>
                <div class="flex items-center gap-1.5 mb-1">
                  <span class="text-[10px]" style="color:rgba(156,163,175,.9)">前置天赋（点亮等级）</span>
                  <div class="flex-1"></div>
                  <el-button size="small" @click="addPrereq">＋ 添加</el-button>
                </div>
                <div v-for="(pr, pi) in selTalent.prerequisites" :key="pi" class="flex items-center gap-1.5 mb-1">
                  <el-input v-model="pr.id" size="small" placeholder="天赋 id" class="input-light flex-1!" />
                  <el-input-number v-model="pr.minLevel" :min="1" :max="99" size="small" class="input-light w-24!" />
                  <button class="chip-btn danger shrink-0" @click="selTalent.prerequisites.splice(pi,1)">✕</button>
                </div>
                <div v-if="!selTalent.prerequisites?.length" class="text-[10px]" style="color:rgba(107,114,128,.6)">无前置（初始层天赋）</div>
              </div>
              <div class="flex items-start gap-1.5">
                <span class="text-[10px] w-14 shrink-0 pt-1" style="color:rgba(156,163,175,.9)">描述</span>
                <el-input v-model="selTalent.description" type="textarea" :rows="2" size="small" class="input-light flex-1!" />
              </div>
              <div class="flex items-center gap-2 pt-1">
                <el-button size="small" type="danger" plain @click="delTalent">🗑 删除该天赋</el-button>
                <span class="text-[10px]" style="color:rgba(107,114,128,.6)">保存后读档自动生效</span>
              </div>
            </div>
            <div v-else class="flex-1 text-[11px]" style="color:rgba(107,114,128,.6);display:flex;align-items:center;justify-content:center">← 选择一个天赋编辑</div>
          </div>
        </div>
      </div>`);

  // ② script：天赋编辑逻辑（writeToProject 之后插入）
  R(`// ============ 通用工具 ============
function copyText(t) {`,
`// ============ 🎓 编辑天赋 ============
const talentEditList = ref([])
const talentSelId = ref('')
const talentLoaded = ref(false)
const selTalent = computed(() => talentEditList.value.find(t => t.id === talentSelId.value) || null)

async function loadTalentConfig() {
  try {
    const resp = await fetch('/src/store/counter.js')
    const src = await resp.text()
    const m = src.match(/const DEFAULT_TALENT_CONFIG_SNAPSHOT = \\[[\\s\\S]*?^        \\];/m)
    if (!m) { ElMessage.error('未找到天赋配置数组'); return }
    const arrText = m[0].slice(m[0].indexOf('[') + 1, m[0].lastIndexOf(']'))
    const arr = Function('return [' + arrText + ']')()
    talentEditList.value = (Array.isArray(arr) ? arr : []).map(t => ({
      ...t,
      prerequisites: (t.prerequisites || []).map(p => typeof p === 'string' ? { id: p, minLevel: 1 } : { id: p.id, minLevel: p.minLevel || 1 }),
      tier: t.tier || 1, col: t.col ?? 0,
      cost: t.cost ?? 1, levelCost: t.levelCost ?? t.cost ?? 1, maxLevel: t.maxLevel ?? 1,
    }))
    talentLoaded.value = true
    if (!talentSelId.value && talentEditList.value.length) talentSelId.value = talentEditList.value[0].id
    ElMessage.success(\`已加载 \${talentEditList.value.length} 个天赋\`)
  } catch (e) {
    console.error('[dladmin] 加载天赋失败', e)
    ElMessage.error('加载天赋失败：' + (e?.message || e))
  }
}
function selectTalent(id) { talentSelId.value = id }
function addTalent() {
  const id = 'new_talent_' + Date.now().toString(36)
  talentEditList.value.push({ id, name: '新天赋', description: '', cost: 1, color: '#409EFF', tier: 1, col: 0, prerequisites: [], maxLevel: 1, levelCost: 1 })
  talentSelId.value = id
  ElMessage.success('已新增，设置后点「保存写入」')
}
function addPrereq() {
  if (!selTalent.value) return
  if (!selTalent.value.prerequisites) selTalent.value.prerequisites = []
  selTalent.value.prerequisites.push({ id: '', minLevel: 1 })
}
function delTalent() {
  const t = selTalent.value
  if (!t) return
  talentEditList.value = talentEditList.value.filter(x => x.id !== t.id)
  talentSelId.value = talentEditList.value[0]?.id || ''
}
function serializeTalentArray(arr) {
  const order = ['id', 'name', 'description', 'cost', 'color', 'tier', 'col', 'prerequisites', 'maxLevel', 'levelCost', 'autoGranted', 'levelDescriptions']
  return arr.map(t => {
    const lines = []
    for (const k of order) {
      const v = t[k]
      if (v === undefined) continue
      if (k === 'prerequisites') {
        const prs = (v || []).map(p => p && typeof p === 'object' ? \`{ id: \${JSON.stringify(p.id || '')}, minLevel: \${Number(p.minLevel) || 1} }\` : \`'\${p}'\`)
        lines.push(\`prerequisites: [\${prs.join(', ')}],\`)
      } else if (Array.isArray(v)) {
        lines.push(\`\${k}: [\${v.map(x => JSON.stringify(x)).join(', ')}],\`)
      } else if (typeof v === 'string') lines.push(\`\${k}: \${JSON.stringify(v)},\`)
      else if (typeof v === 'boolean') lines.push(\`\${k}: \${v},\`)
      else lines.push(\`\${k}: \${v},\`)
    }
    return '          {\\n            ' + lines.join('\\n            ') + '\\n          },'
  }).join('\\n')
}
async function saveTalentConfig() {
  if (!talentLoaded.value) { ElMessage.warning('请先加载天赋'); return }
  const ids = talentEditList.value.map(t => t.id)
  if (new Set(ids).size !== ids.length) { ElMessage.warning('存在重复的天赋 id，无法保存'); return }
  const code = serializeTalentArray(talentEditList.value)
  try {
    const resp = await fetch('/__dladmin_write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ops: [{ kind: 'talent', code }] }),
    })
    const data = await resp.json()
    if (data?.ok && data.results?.[0]?.ok) {
      ElMessage.success('✅ 天赋已写入 counter.js，读档自动生效')
      loadTalentConfig()
    } else {
      ElMessage.error('写入失败：' + (data?.results?.[0]?.msg || data?.msg || '未知错误'))
    }
  } catch (e) {
    console.error('[dladmin] 天赋写入失败', e)
    ElMessage.error('写入失败：' + (e?.message || e))
  }
}

// ============ 通用工具 ============
function copyText(t) {`);

  return s;
});

console.log(`改造完成（${n} 个文件）`);
