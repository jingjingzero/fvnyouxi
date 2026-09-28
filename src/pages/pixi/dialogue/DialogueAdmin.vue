<template>
  <div class="dladmin h-screen w-screen flex flex-col overflow-hidden select-none!"
    style="background:#0d1016;color:#e5e7eb;">
    <!-- ===== 顶部栏 ===== -->

    <!-- ===== Tab 栏（分段式 + 右侧收起/展开按钮） ===== -->
    <div class="px-5  shrink-0">
      <div class="flex items-center gap-2 p-1.5 rounded-xl w-full"
        style="background:#141821;border:1px solid rgba(255,255,255,.08)">
        <div v-if="!tabsCollapsed" class="grid grid-cols-7 gap-1 flex-1 min-w-0">
          <button v-for="t in tabs" :key="t.key" @click="curTab = t.key"
            class="px-1.5 py-0.7vh rounded-lg text-[12px] font-bold transition-all text-center truncate"
            :class="curTab === t.key ? '' : 'opacity-50 hover:opacity-90'"
            :style="curTab === t.key ? 'background:linear-gradient(135deg,#243042,#1f2937);color:#fbbf24;box-shadow:0 1px 8px rgba(0,0,0,.45)' : 'color:#9ca3af'">
            {{ t.label }}
          </button>
        </div>
        <button @click="toggleTabsCollapsed" class="rounded-lg font-bold transition-all shrink-0"
          :class="tabsCollapsed ? 'px-2 py-0.3vh text-[10px] opacity-80' : 'px-3 py-1vh text-[13px]'"
          :style="tabsCollapsed ? 'color:#fbbf24;background:rgba(251,191,36,.12);border:1px solid rgba(251,191,36,.28)' : 'color:#9ca3af;opacity:.8'">
          {{ tabsCollapsed ? '展开' : '收起' }}
        </button>
      </div>
    </div>

    <div class="flex-1 min-h-0 p-4 pt-1vh" style="background:#0d1016">
      <!-- ============ Tab1 对话编辑器 ============ -->
      <div v-show="curTab === 'edit'" class="h-full flex gap-3">
        <!-- 左栏：文件 + 节点列表（始终保持左右布局） -->
        <div class="relative shrink-0 flex flex-col rounded-xl overflow-hidden"
          :class="canvasResize ? '' : 'transition-all duration-200'" :style="leftMode === 'canvas'
            ? { width: canvasLeftW + 'px', minWidth: '360px', background: '#141821', border: '1px solid rgba(255,255,255,.08)' }
            : { width: '300px', minWidth: '280px', background: '#141821', border: '1px solid rgba(255,255,255,.08)' }">
          <div class="px-3 py-2.5 flex items-center gap-2 border-b border-white/10">
            <el-select v-model="curFile" size="small" filterable class="flex-1!">
              <el-option v-for="f in FILES" :key="f" :label="f + '.js'" :value="f" />
            </el-select>
            <el-button size="small" @click="loadFile" :loading="loadingFile">加载</el-button>
          </div>
          <div v-show="leftMode === 'list' && !isMobile"
            class="px-3 py-2 flex items-center gap-2 border-b border-white/10">
            <el-input v-model="kw" size="small" placeholder="搜索节点 id / 文本" clearable class="flex-1!" />
            <span class="text-[11px] shrink-0 whitespace-nowrap" style="color:rgba(229,231,235,.45)">{{ nodeKeys.length
            }}
              节点</span>
          </div>
          <div class="px-3 py-1.5 flex items-center gap-2 border-b border-white/10">
            <el-radio-group v-model="leftMode" size="small">
              <el-radio-button value="list">📃 列表</el-radio-button>
              <el-radio-button value="canvas">🕸 画布</el-radio-button>
            </el-radio-group>
            <div class="flex-1"></div>
            <button v-if="leftMode === 'canvas'" class="chip-btn" @click="relayoutCanvas">重新布局</button>
            <button v-if="leftMode === 'canvas'" class="chip-btn" @click="saveCanvasPos">保存位置</button>
          </div>
          <div class="px-3 py-1.5 flex items-center gap-1.5 border-b border-white/10">
            <button @click="nodeFilter = ''" class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all"
              :style="nodeFilter === '' ? 'background:linear-gradient(135deg,#243042,#1f2937);color:#fbbf24;box-shadow:0 1px 8px rgba(0,0,0,.45)' : 'color:#9ca3af;opacity:.7'">全部</button>
            <button @click="nodeFilter = 'transit'" class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all"
              :style="nodeFilter === 'transit' ? 'background:linear-gradient(135deg,#243042,#1f2937);color:#fbbf24;box-shadow:0 1px 8px rgba(0,0,0,.45)' : 'color:#9ca3af;opacity:.7'">中转站</button>
            <button @click="nodeFilter = 'menu'" class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all"
              :style="nodeFilter === 'menu' ? 'background:linear-gradient(135deg,#243042,#1f2937);color:#fbbf24;box-shadow:0 1px 8px rgba(0,0,0,.45)' : 'color:#9ca3af;opacity:.7'">选项</button>
            <button @click="nodeFilter = 'chat'" class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all"
              :style="nodeFilter === 'chat' ? 'background:linear-gradient(135deg,#243042,#1f2937);color:#fbbf24;box-shadow:0 1px 8px rgba(0,0,0,.45)' : 'color:#9ca3af;opacity:.7'">对话</button>
            <div class="flex-1"></div>
            <span class="text-[10px]" style="color:rgba(107,114,128,.55)">{{ filteredKeys.length }} 个</span>
          </div>
          <div ref="leftListRef" v-show="leftMode === 'list'" class="flex-1 min-h-0 overflow-y-auto p-2">
            <!-- 搜索时平铺 -->
            <template v-if="kw && kw.trim()">
              <div class="space-y-1">
                <div v-for="id in filteredKeys" :key="id" @click="selectNode(id)"
                  class="px-2.5 py-2 rounded-lg cursor-pointer border transition-all" :style="selNodeId === id
                    ? 'background:rgba(251,191,36,.12);border-color:rgba(251,191,36,.45)'
                    : 'background:rgba(255,255,255,.04);border-color:transparent'">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-amber-300 font-mono text-xs font-bold">{{ id }}</span>
                    <span v-if="nodeType(id)" class="text-[10px] px-1 rounded shrink-0"
                      style="background:rgba(251,191,36,.15);color:#fcd34d">{{ nodeType(id) }}</span>
                    <span v-if="nodeType(id)" class="text-[10px] px-1 rounded shrink-0"
                      style="background:rgba(251,191,36,.15);color:#fcd34d">{{ nodeType(id) }}</span>
                    <span v-if="nodes[id]?.onStage" class="text-[10px] px-1 rounded"
                      style="background:rgba(56,189,248,.18);color:#7dd3fc">👥{{ Array.isArray(nodes[id].onStage) ?
                        nodes[id].onStage.length : 1 }}</span>
                    <span v-if="nodes[id]?.npcSkin" class="text-[10px] px-1 rounded"
                      style="background:rgba(232,121,249,.18);color:#f0abfc">🎨{{ nodes[id].npcSkin }}</span>
                    <span v-if="nodes[id]?.next" class="text-[10px] px-1 rounded"
                      style="background:rgba(52,211,153,.18);color:#6ee7b7">→{{ typeof nodes[id].next === 'function' ? '条件跳转' : nodes[id].next }}</span>
                    <span v-if="isEnd(nodes[id])" class="text-[10px] px-1 rounded"
                      style="background:rgba(248,113,113,.18);color:#fca5a5">END</span>
                  </div>
                  <div class="text-[11px] mt-1 truncate" style="color:rgba(156,163,175,.85)">{{ nodeDesc(id) }}</div>
                </div>
                <div v-if="!filteredKeys.length" class="text-xs py-6 text-center" style="color:rgba(107,114,128,.6)">
                  无匹配节点</div>
              </div>
            </template>
            <!-- 按对话流分组：一段对话到结束为一类（支持筛选后分组 + 展开收起） -->
            <template v-else>
              <div v-for="g in filteredGroups" :key="g.entry" class="mb-2.5">
                <div
                  class="flex items-center gap-1.5 px-1.5 py-1.5 rounded-lg mb-1 cursor-pointer transition-all select-none!"
                  style="background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.15)"
                  @click="toggleGroup(g.entry)" title="点击收起/展开">
                  <span class="text-[11px] w-3 shrink-0 text-center transition-transform" style="color:#fbbf24">{{
                    collapsedGroups[g.entry] ? '▶' : '▼' }}</span>
                  <span class="text-[11px] font-black" style="color:#fbbf24">{{ g.entry }}</span>
                  <span class="text-[10px]" style="color:rgba(148,163,184,.65)">{{ g.count }}节点</span>
                  <span v-if="g.preview" class="text-[10px] truncate flex-1" style="color:rgba(148,163,184,.5)">{{
                    g.preview }}</span>
                </div>
                <div v-if="!collapsedGroups[g.entry]" class="space-y-1 pl-1">
                  <template v-for="(id, idx) in g.ids" :key="id">
                    <div :data-nid="id" @click="selectNode(id)"
                      class="px-2.5 py-2 rounded-lg cursor-pointer border transition-all" :style="selNodeId === id
                        ? 'background:rgba(251,191,36,.12);border-color:rgba(251,191,36,.45)'
                        : 'background:rgba(255,255,255,.04);border-color:transparent'">
                      <div class="flex items-center gap-1.5 flex-wrap">
                        <span class="text-amber-300 font-mono text-xs font-bold">{{ id }}</span>
                        <span v-if="nodes[id]?.onStage" class="text-[10px] px-1 rounded"
                          style="background:rgba(56,189,248,.18);color:#7dd3fc">👥{{ Array.isArray(nodes[id].onStage) ?
                            nodes[id].onStage.length : 1 }}</span>
                        <!-- <span v-if="nodes[id]?.npcSkin" class="text-[10px] px-1 rounded" style="background:rgba(232,121,249,.18);color:#f0abfc">🎨{{ nodes[id].npcSkin }}</span> -->
                        <span v-if="nodes[id]?.next" class="text-[10px] px-1 rounded"
                          style="background:rgba(52,211,153,.18);color:#6ee7b7">→{{ typeof nodes[id].next === 'function' ? '条件跳转' : nodes[id].next }}</span>
                        <span v-if="isEnd(nodes[id])" class="text-[10px] px-1 rounded"
                          style="background:rgba(248,113,113,.18);color:#fca5a5">END</span>
                      </div>
                      <div class="text-[11px] mt-1 truncate" style="color:rgba(156,163,175,.85)">{{ nodeDesc(id) }}
                      </div>
                    </div>
                    <!-- ➖ 对话段分隔线：顶层 next 不连续处（选项节点 / 跳到其它段 / 段尾） -->
                    <div v-if="idx < g.ids.length - 1 && hasSegBreak(g.ids, idx)" class="h-[2px] mx-1 rounded-full"
                      style="background:linear-gradient(90deg,transparent,rgba(148,163,184,.95),transparent);box-shadow:0 0 8px rgba(148,163,184,.4)">
                    </div>
                  </template>
                </div>
              </div>
            </template>
          </div>
          <!-- 🕸 画布视图（Canvas）：节点拖动 + next 连线 + Ctrl滚轮缩放 -->
          <div v-show="leftMode === 'canvas'" ref="canvasWrapRef" class="flex-1 min-h-0 relative overflow-hidden"
            style="background:#0f131a">
            <div
              class="absolute top-2 left-2 z-10 w-max max-w-[92%] text-[10px] px-2 py-1 rounded pointer-events-none leading-relaxed"
              style="background:rgba(15,19,26,.85);color:rgba(148,163,184,.6);border:1px solid rgba(255,255,255,.08)">
              {{ isMobile
                ? '拖动节点=移动 · 单指拖空白=平移 · 双指捏合=缩放 · 点击=编辑'
                : '左键拖节点=移动 · 中键拖空白=平移 · 点击=编辑 · Ctrl+滚轮=缩放（' + Math.round(viewScale * 100) + '%）' }}
            </div>
            <canvas ref="canvasEl" class="w-full h-full block touch-none" style="touch-action:none"
              @pointerdown="onCanvasPointerDown" @pointermove="onCanvasPointerMove" @pointerup="onCanvasPointerUp"
              @pointercancel="onCanvasPointerUp" @wheel.prevent="onCanvasWheel" @mousedown.prevent="onCanvasMouseDown"
              @contextmenu.prevent></canvas>
          </div>
          <!-- ⇿ 拖拽手柄：调整画布宽度（移动端隐藏） -->
          <div v-if="leftMode === 'canvas' && !isMobile"
            class="absolute top-0 bottom-0 right-0 w-[7px] cursor-col-resize z-20"
            style="border-right:2px solid rgba(251,191,36,.28)"
            :class="canvasResize ? 'bg-amber-400/25' : 'hover:bg-amber-400/15'" @pointerdown="startCanvasResize"
            @pointermove="onCanvasResizeMove" @pointerup="endCanvasResize" @pointercancel="endCanvasResize"
            title="拖动调整画布宽度">
          </div>
        </div>

        <!-- 右栏：节点编辑器 -->
        <div class="flex-1 min-w-0 min-h-0 flex flex-col gap-3 overflow-hidden ">
          <!-- 操作栏（固定，始终显示） -->
          <div class="shrink-0 rounded-xl p-3" style="background:#141821;border:1px solid rgba(255,255,255,.08)">
            <div class="flex items-center gap-2 flex-wrap">
              <el-button size="small" type="warning" @click="genNodeCode" v-if="!isMobile">生成节点代码</el-button>
              <el-select v-model="insertPos" size="small" class="w-30!" title="插入位置：需先在左侧选中一个节点">
                <el-option label="插到选中前" value="before" />
                <el-option label="插到选中后" value="after" />
                <el-option label="文件末尾" value="end" />
              </el-select>
              <el-button size="small" type="primary" @click="queueInsert">插入节点</el-button>
              <el-button size="small" type="danger" plain @click="queueReplace">替换节点</el-button>
              <el-button size="small" type="danger" plain :disabled="!selNodeId" @click="queueDelete">删除节点</el-button>
              <el-button size="small" type="success" @click="writeToProject"
                :disabled="!patchOps.length">直接写入项目</el-button>
              <el-button size="small" @click="copyNodeCode">复制代码</el-button>
              <el-button size="small" @click="resetForm">重置</el-button>
            </div>
          </div>

          <!-- 编辑器 -->
          <div v-if="selNodeId" ref="rightPanelRef"
            class="flex-1 min-h-0 rounded-xl overflow-y-auto p-4 space-y-3  pb-13vh!"
            style="background:#141821;border:1px solid rgba(255,255,255,.08)">
            <!-- 分区：基础信息 -->
            <div class="rounded-lg p-3" style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06)">
              <div class="flex items-center justify-between mb-2.5">
                <span class="text-[11px] font-bold tracking-wide" style="color:#fbbf24">▍基础信息</span>
                <button @click="toggleSec('base')"
                  class="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-amber-400/30 text-gray-300">{{
                    secCollapsed.base
                      ? '展开' : '收起' }}</button>
              </div>
              <div class="space-y-2.5" v-show="!secCollapsed.base">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold w-16 shrink-0" style="color:rgba(156,163,175,.9)">节点ID</span>
                  <el-input v-model="form.id" size="small" class="flex-1! id-bright" />
                  <el-button size="small" type="warning" plain @click="genNextNodeId"
                    title="生成当前节点 ID 最接近的不重复 ID（如 sr02 → sr02_1）">✨ 一键生成</el-button>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-[10px]" style="color:rgba(148,163,184,.8)">id 与 next 跳转引用关联</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold w-16 shrink-0" style="color:rgba(156,163,175,.9)">说话人</span>
                  <el-autocomplete v-model="form.name" :fetch-suggestions="querySpeakerName" size="small" clearable
                    placeholder="说话人（可直接输入，如：系统）" class="flex-1! input-light" />
                </div>
                <!-- 在场人数 onStage -->
                <div class="flex items-start gap-2">
                  <span class="text-xs font-bold w-16 shrink-0 leading-7" style="color:rgba(156,163,175,.9)">在场人数</span>
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                      <el-radio-group v-model="onStageMode" size="small">
                        <el-radio-button value="none">无NPC</el-radio-button>
                        <el-radio-button value="single">单人</el-radio-button>
                        <el-radio-button value="multi">多人</el-radio-button>
                        <el-radio-button value="narration">旁白</el-radio-button>
                      </el-radio-group>
                    </div>
                    <div v-if="onStageMode !== 'none' && onStageMode !== 'narration'"
                      class="flex items-center gap-2 flex-wrap mt-3vh">
                      <el-select v-if="onStageMode === 'single'" v-model="form.onStage" size="small" filterable
                        allow-create default-first-option class="w-40!">
                        <el-option v-for="s in uniqueSpeakers" :key="s.img" :label="(s.name || '') + ' → ' + s.img"
                          :value="s.img" />
                      </el-select>
                      <template v-else>
                        <el-select v-model="form.onStage" size="small" multiple filterable allow-create
                          default-first-option class="flex-1!">
                          <el-option v-for="s in uniqueSpeakers" :key="s.img" :label="(s.name || '') + ' → ' + s.img"
                            :value="s.img" />
                        </el-select>
                      </template>

                    </div>
                  </div>
                </div>
                <!-- 皮肤（旁白时不显示） -->
                <div v-if="onStageMode !== 'narration'" class="flex items-start gap-2">
                  <span class="text-xs font-bold w-16 shrink-0 leading-7" style="color:rgba(156,163,175,.9)">皮肤</span>
                  <div class="flex-1 space-y-1.5">
                    <div class="flex items-center gap-2">
                      <span class="text-[10px] shrink-0 w-9" style="color:rgba(148,163,184,.6)">玩家</span>
                      <el-select v-model="form.playerSkin" size="small" clearable filterable allow-create
                        default-first-option class="flex-1!" @change="onSkinChanged('player', form.playerSkin)">
                        <el-option v-for="s in skinsForRole('player')" :key="s" :label="s" :value="s" />
                      </el-select>
                      <button class="chip-btn" @click="openSkinPreview('player', form.playerSkin)">▶ 皮肤</button>

                    </div>
                    <template v-if="onStageMode !== 'multi'">
                      <div class="flex items-center gap-2">
                        <span class="text-[10px] shrink-0 w-9" style="color:rgba(148,163,184,.6)">NPC</span>
                        <el-select v-model="form.npcSkin" size="small" clearable filterable allow-create
                          default-first-option class="flex-1!" @change="onSkinChanged(form.onStage, form.npcSkin)">
                          <el-option v-for="s in skinsForRole(form.onStage)" :key="s" :label="s" :value="s" />
                        </el-select>
                        <button class="chip-btn" @click="openSkinPreview(form.onStage, form.npcSkin)">▶ 皮肤</button>

                      </div>
                    </template>
                    <template v-else>
                      <div v-for="p in (Array.isArray(form.onStage) ? form.onStage : [])" :key="p"
                        class="flex items-center gap-2">
                        <span class="text-[10px] shrink-0 w-24 truncate" style="color:rgba(148,163,184,.8)"
                          :title="p">{{ p }}</span>
                        <el-select v-model="form.npcSkins[p]" size="small" clearable filterable allow-create
                          default-first-option class="flex-1!" @change="onSkinChanged(p, form.npcSkins[p])">
                          <el-option v-for="s in skinsForRole(p)" :key="s" :label="s" :value="s" />
                        </el-select>
                        <button class="chip-btn" @click="openSkinPreview(p, form.npcSkins[p])">▶ 皮肤</button>
                      </div>

                    </template>
                  </div>
                </div>
                <!-- 🎨 皮肤预览（内联，不弹窗，fixed 右上角） -->
                <div v-if="skinPrevVisible" class="fixed z-[1300] top-3 right-3 w-[200px] rounded-lg p-2.5"
                  style="background:#1a1f2e;border:1px solid rgba(255,255,255,.15);box-shadow:0 8px 30px rgba(0,0,0,.5)">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-[11px] font-bold" style="color:#fbbf24">🎨 皮肤预览</span>
                    <button class="chip-btn danger" @click="closeSkinPreview">✕ 关闭</button>
                  </div>
                  <div ref="skinPrevBox"
                    class="w-[170px] h-[170px] mx-auto rounded-lg overflow-hidden bg-black/40 flex items-center justify-center">
                  </div>
                  <div class="mt-2 text-center text-[11px] text-gray-300">{{ skinPrevInfo }}</div>
                </div>
                <!-- 头像动画 avatarFx（目标必须是在场头像；可新增多条，各自配动画 → 数组） -->
                <div v-if="onStageMode !== 'narration'" class="flex items-start gap-2">
                  <span class="text-xs font-bold w-16 shrink-0 leading-7" style="color:rgba(156,163,175,.9)">头像动画</span>
                  <div class="flex-1">
                    <div v-if="fxItems.length" class="space-y-1.5 mb-1">
                      <div v-for="(it, ii) in fxItems" :key="ii" class="flex items-center gap-1.5">
                        <span class="text-[10px] shrink-0" style="color:rgba(156,163,175,.6)">#{{ ii + 1 }}</span>
                        <el-select v-model="it.target" size="small" filterable clearable placeholder="目标头像"
                          class="flex-1!" @change="applyAvatarFx">
                          <el-option label="玩家 (player)" value="player" />
                          <el-option v-for="tt in fxTargetOptions" :key="tt" :label="tt" :value="tt" />
                        </el-select>
                        <el-select v-model="it.fx" size="small" clearable filterable allow-create default-first-option
                          placeholder="动画" class="w-40!" @change="applyAvatarFx">
                          <el-option v-for="n in AVATAR_FX_NAMES" :key="n"
                            :label="(AVATAR_FX_LABELS[n] || n) + ' (' + n + ')'" :value="n" />
                        </el-select>
                        <button class="chip-btn" @click="openFxPreview(it)">▶ 预览</button>
                        <button class="chip-btn danger" @click="removeFxItem(ii)">删</button>
                      </div>
                    </div>
                    <div class="flex items-center gap-x-2 mt-1vh">
                      <button class="chip-btn" @click="addFxItem">＋ 新增动画</button>
                      <button class="chip-btn danger" @click="fxItems = []; form.avatarFx = ''">清除</button>

                    </div>
                  </div>
                </div>
              </div>
            </div>
            <!-- 分区：对话内容 -->
            <div class="rounded-lg p-3" style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06)">
              <div class="flex items-center justify-between mb-2.5">
                <span class="text-[11px] font-bold tracking-wide" style="color:#34d399">▍对话内容</span>
                <button @click="toggleSec('content')"
                  class="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-amber-400/30 text-gray-300">{{
                    secCollapsed.content ? '展开' : '收起' }}</button>
              </div>
              <div class="space-y-2.5" v-show="!secCollapsed.content">
                <!-- 文本 -->
                <div class="flex items-start gap-2">
                  <span class="text-xs font-bold w-16 shrink-0 leading-7" style="color:rgba(156,163,175,.9)">文本</span>
                  <div class="flex-1">
                    <div class="flex items-center gap-1.5 mb-1.5">
                      <button @click="form.textMode = 'text'" class="text-[10px] px-2 py-0.5 rounded transition-all"
                        :style="form.textMode === 'text' ? 'background:rgba(52,211,153,.18);color:#6ee7b7;border:1px solid rgba(52,211,153,.45)' : 'background:rgba(255,255,255,.05);color:rgba(156,163,175,.7);border:1px solid transparent'">普通文本</button>
                      <button @click="form.textMode = 'fn'" class="text-[10px] px-2 py-0.5 rounded transition-all"
                        :style="form.textMode === 'fn' ? 'background:rgba(251,191,36,.18);color:#fcd34d;border:1px solid rgba(251,191,36,.45)' : 'background:rgba(255,255,255,.05);color:rgba(156,163,175,.7);border:1px solid transparent'">动态函数</button>
                      <span v-if="form.textMode === 'fn'" class="text-[10px]" style="color:rgba(107,114,128,.6)">text
                        函数源码（原样保留，如
                        sr50 轮换台词）</span>
                    </div>
                    <!-- 🎨 富文本快速插入：选中文字后一键包裹标签（[c=色][size=n][b][i]） -->
                    <div v-if="form.textMode === 'text'" class="flex items-center gap-1.5 mb-1.5 flex-wrap">
                      <span class="text-[10px]" style="color:rgba(148,163,184,.6)">富文本</span>
                      <el-input-number v-model="form.textSizePick" :min="1" :max="64" :step="0.25" size="small"
                        class="w-24! input-light" />
                      <button class="chip-btn" @click="wrapTextSize">字号</button>
                      <span class="inline-flex items-center mb-3vh"
                        style="height:24px;align-self:center"><el-color-picker v-model="form.textColorPick"
                          size="small" /></span>
                      <button class="chip-btn" style="background:#111;color:#fbbf24"
                        @click="savePaletteColor">存色</button>
                      <button class="chip-btn" @click="wrapTextColor">颜色</button>
                      <el-popover placement="top" :width="248" trigger="click" :teleported="true"
                        popper-class="palette-pop">
                        <template #reference>
                          <button class="chip-btn" title="已存颜色（点击立即使用）">🎨 色板</button>
                        </template>
                        <div class="select-none">
                          <div class="text-xs font-bold mb-2" style="color:#333">已存颜色</div>
                          <div v-if="paletteColors.length" class="flex flex-wrap gap-2">
                            <div v-for="(c, ci) in paletteColors" :key="c + ci" class="relative group">
                              <div class="w-[22px] h-[22px] rounded cursor-pointer border border-black/25 shadow"
                                :style="{ background: c }" :title="c" @click="pickPaletteColor(c)"></div>
                              <button
                                class="absolute -top-[7px] -right-[7px] w-[14px] h-[14px] leading-[12px] text-[10px] text-center rounded-full bg-[#ef4444] text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                                @click.stop="removePaletteColor(ci)">×</button>
                            </div>
                          </div>
                          <div v-else class="text-xs" style="color:#999">还没有保存的颜色，先在下面取色，再点工具条上的「存色」</div>
                        </div>
                      </el-popover>
                      <button class="chip-btn" @click="wrapTextBold"><b>加粗</b></button>
                      <button class="chip-btn" @click="wrapTextItalic"><i>倾斜</i></button>
                      <button class="chip-btn" @click="wrapTextUnderline"><u>下划线</u></button>
                      <button class="chip-btn" style="background:#0e7490;color:#fff"
                        @click="previewTextVisible = true">预览</button>
                      <button class="chip-btn" style="background:#7c3aed;color:#fff" :disabled="!textHistory.length"
                        @click="undoText">撤销</button>
                      <span class="text-[10px]" style="color:rgba(107,114,128,.6)">先选中文本，再点按钮 → 用标签包裹</span>
                    </div>
                    <el-dialog v-model="previewTextVisible" title="文本预览" width="70vw" append-to-body :modal="true">
                      <div class="txt-preview-box">
                        <div v-html="previewTextHtml" class="txt-preview-text"></div>
                      </div>
                      <div class="text-[11px] mt-2" style="color:#9ca3af">基础字号为 5vh，[size=Xvh] 按实际 vh 放大/缩小，效果与游戏内对话一致。
                      </div>
                    </el-dialog>
                    <el-input ref="textAreaRef" v-if="form.textMode === 'text'" v-model="form.text" type="textarea"
                      :rows="3" size="small" placeholder="对话文本 / i18n:key" />
                    <el-input v-else v-model="form.textFn" type="textarea" :rows="7" size="small"
                      style="font-family:ui-monospace,Consolas,monospace;font-size:11px"
                      placeholder="() => { ... } 完整函数，例：() => { const n = 1; return n === 1 ? 'A' : 'B'; }" />
                    <div v-if="form.textMode === 'fn' && !isRotateFn" class="mt-2 rounded p-2"
                      style="background:rgba(56,189,248,.06);border:1px dashed rgba(56,189,248,.3)">
                      <div class="flex items-center gap-2 mb-1.5">
                        <span class="text-[11px] font-bold" style="color:#7dd3fc">🧩 条件分支台词</span>
                        <div class="flex-1"></div>
                        <button class="chip-btn" @click="parseReturnListFromFn()">🔍 解析台词</button>
                        <button class="chip-btn" style="background:#0e7490;color:#fff" @click="applyReturnTexts()">✅
                          应用台词</button>
                      </div>
                      <div v-if="returns.length" class="space-y-1.5">
                        <div v-for="(r, ri) in returns" :key="ri" class="rounded p-1.5"
                          style="background:rgba(56,189,248,.08)">
                          <div class="text-[10px] mb-1 truncate"
                            :style="r.cond === '(兜底)' ? 'color:#94a3b8' : 'color:#7dd3fc'" :title="r.cond">if：{{ r.cond
                            }}</div>
                          <el-input v-model="r.text" size="small" type="textarea" :autosize="{ minRows: 1, maxRows: 6 }"
                            placeholder="返回的台词（可多行，高度自动贴合）" class="input-light" />
                        </div>
                      </div>
                      <div v-else class="text-[10px]" style="color:rgba(148,163,184,.6)">未解析到 return 台词，点「解析台词」试试。</div>
                      <div class="text-[10px] mt-1.5" style="color:rgba(125,211,252,.55)">列出函数里每个 return
                        的台词（含各自条件摘要），可直接改文本；涉及发奖励/清标记等副作用的逻辑保留在源码不动。改完点「应用台词」再「生成节点代码」。</div>
                    </div>
                    <div v-if="form.textMode === 'fn' && isRotateFn" class="mt-2 rounded p-2"
                      style="background:rgba(251,191,36,.06);border:1px dashed rgba(251,191,36,.25)">
                      <div class="flex items-center gap-2 mb-1.5">
                        <span class="text-[11px] font-bold" style="color:#fcd34d">🔁 多段台词轮换</span>
                        <div class="flex-1"></div>
                        <button class="chip-btn" @click="parseLinesFromFn()">🔍 解析台词</button>
                        <button class="chip-btn" @click="applyLinesFn()">✅ 应用台词</button>
                      </div>
                      <div class="flex items-center gap-2 mb-1.5">
                        <span class="text-[10px] shrink-0" style="color:rgba(156,163,175,.7)">索引 flag</span>
                        <el-input v-model="linesFlag" size="small" class="w-56! input-light"
                          placeholder="轮换索引来源，如 shangrenTaleIdx" />
                      </div>
                      <div v-if="lines.length" class="space-y-1.5">
                        <div v-for="(ln, li) in lines" :key="li" class="flex items-center gap-1.5">
                          <span class="text-[10px] w-5 text-right shrink-0" style="color:rgba(148,163,184,.6)">#{{ li
                          }}</span>
                          <el-input v-model="lines[li]" size="small" placeholder="第 {{ li }} 段台词"
                            class="flex-1! input-light" />
                          <button class="chip-btn danger" @click="lines.splice(li, 1)">删</button>
                        </div>
                      </div>
                      <div v-else class="text-[10px] mb-1" style="color:rgba(107,114,128,.6)">
                        尚未解析出台词。点「解析台词」从当前函数提取；或点「＋
                        添加台词」新建。</div>
                      <div class="mt-1.5 flex items-center gap-2">
                        <button class="chip-btn" @click="lines.push('')">＋ 添加台词</button>
                        <span class="text-[10px]" style="color:rgba(107,114,128,.6)">按索引取第 N 段，越界回退第 0 段</span>
                      </div>
                    </div>
                    <!-- 🎬 nextTextOnce：跳转到下一句时替换目标节点文本（仅一次） -->
                    <div class="mt-2 rounded p-2"
                      style="background:rgba(251,191,36,.05);border:1px dashed rgba(251,191,36,.22)">
                      <div class="flex items-center gap-2 mb-1.5">
                        <span class="text-[11px] font-bold" style="color:#fcd34d">🎬 替换下句文本</span>
                        <div class="flex-1"></div>
                        <button class="chip-btn" @click="form.nextTextOnceOn = !form.nextTextOnceOn"
                          :style="form.nextTextOnceOn ? 'background:#f59e0b;color:#fff' : ''">{{ form.nextTextOnceOn ?
                            '关闭' :
                            '开启' }}</button>
                      </div>
                      <template v-if="form.nextTextOnceOn">
                        <el-input v-model="form.nextTextOnce" size="small" type="textarea"
                          :autosize="{ minRows: 1, maxRows: 4 }" placeholder="跳转到下一句时，用它替换目标节点的文本，仅生效一次"
                          class="input-light" />
                        <div class="text-[10px] mt-1" style="color:rgba(107,114,128,.6)">生成 nextTextOnce 属性：跳转时注入，目标节点（如
                          sr10 等动态开场文本）消费一次后清除。</div>
                      </template>
                    </div>
                  </div>
                </div>
                <!-- 跳转 / 结束 -->
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold w-16 shrink-0" style="color:rgba(156,163,175,.9)">跳转</span>
                  <el-input v-model="form.next" size="small" placeholder="输入节点 id"
                    class="flex-1! input-light min-w-9vw" />
                  <el-select v-model="form.next" size="small" filterable clearable placeholder="选节点" class="w-32!">
                    <el-option v-for="id in nodeKeys" :key="id" :label="id" :value="id" />
                  </el-select>
                  <span class="text-xs font-bold shrink-0" style="color:rgba(156,163,175,.9)">结束</span>
                  <el-select v-model="form.end" size="small" clearable class="w-36!">
                    <el-option label="（不结束）" value="" />
                    <el-option label="end: 1（开商店等动作）" :value="1" />
                    <el-option label="end: 2（可重复结束）" :value="2" />
                    <el-option label="end: true" :value="true" />
                    <el-option label="end: 3" :value="3" />
                  </el-select>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold w-16 shrink-0" style="color:rgba(156,163,175,.9)">中转站</span>
                  <el-switch v-model="form.isTransit" size="small" />
                  <span class="text-[10px]" style="color:rgba(107,114,128,.65)">开启后显示跳转条件：不显示对话文本，按条件分流到不同对话</span>
                </div>
                <div v-if="form.isTransit" class="flex items-start gap-2">
                  <span class="text-xs font-bold w-16 shrink-0 pt-1" style="color:rgba(156,163,175,.9)">跳转条件</span>
                  <div class="flex-1 space-y-1">
                    <!-- 💡 大白话说明 -->
                    <div class="text-[11px] leading-5 rounded-lg p-2"
                      style="background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.22);color:#e5d5a8;">
                      💡 条件是“满足不满足某个情况”的判断（比如：有没有做过某段剧情、好感度够不够、背包里有没有某件东西）。
                      游戏会<b>从上往下</b>一条条看：哪一条「如果」的情况满足，就进入它右边选的对话；如果<b>一条都不满足</b>，
                      就走下面「否则」——也就是上方「跳转」框里填的那个对话（保底），不会卡住。
                    </div>
                    <!-- 条件规则：自上而下判断，满足即跳对应节点 -->
                    <div v-for="(r, ri) in form.nextRules" :key="ri" class="flex items-center gap-1">
                      <span class="text-[10px] font-bold shrink-0" style="color:#fbbf24">如果</span>
                      <el-input v-model="r.cond" size="small" placeholder="条件（可点「快速条件」插入）" class="flex-1! input-light" />
                      <span class="text-[10px] font-bold shrink-0" style="color:#fbbf24">→ 跳转</span>
                      <el-select v-model="r.next" size="small" filterable clearable placeholder="选节点" class="w-32!">
                        <el-option v-for="id in nodeKeys" :key="id" :label="id" :value="id" />
                      </el-select>
                      <button class="chip-btn danger" @click="form.nextRules.splice(ri, 1)">删除</button>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <span class="text-[10px] font-bold shrink-0" style="color:#52C41A">否则</span>
                      <span class="text-[10px]" style="color:rgba(156,163,175,.75)">所有条件都不满足 → 跳上方「跳转」节点（{{ form.next || '未填' }}）</span>
                    </div>
                    <div class="flex items-center gap-1">
                      <button class="chip-btn" style="background:#0ea5e9;color:#fff"
                        @click="form.nextRules.push({ cond: '', next: '' })">＋ 添加条件</button>
                      <button class="chip-btn" style="background:#0ea5e9;color:#fff" @click="openQuickHelp('cond')">? 快速条件</button>
                      <button class="chip-btn" style="background:#10b981;color:#fff" @click="condTutorialVisible = true">📖 条件说明</button>
                      <span class="text-[10px]" style="color:rgba(156,163,175,.55)">条件支持 cond.flag('xx')、user.getDialogueFlag('xx') 等表达式</span>
                    </div>
                    <!-- 高级：已有跳转函数含无法可视化的逻辑时仅显示 -->
                    <template v-if="form.nextCond">
                      <div class="text-[10px] mt-1" style="color:rgba(107,114,128,.7)">⚠️ 原跳转函数含高级逻辑（只读展示，改规则后保存会替换它）：</div>
                      <div class="text-[10px] rounded p-1.5" style="background:rgba(255,255,255,.05);color:rgba(156,163,175,.85);white-space:pre-wrap;word-break:break-all;">{{ form.nextCond }}</div>
                    </template>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold w-16 shrink-0" style="color:rgba(156,163,175,.9)">repeatable</span>
                  <el-switch v-model="form.repeatable" />
                  <span class="text-[10px] ml-2" style="color:rgba(107,114,128,.6)">起始节点 repeatable:true = 可无限重复</span>
                </div>
              </div>
            </div>
            <!-- 分区：CG 剧情 -->
            <div class="rounded-lg p-3" style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06)">
              <div class="flex items-center justify-between mb-2.5">
                <span class="text-[11px] font-bold tracking-wide" style="color:#f472b6">🎬 CG 剧情</span>
                <button @click="toggleSec('cg')"
                  class="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-amber-400/30 text-gray-300">{{
                    secCollapsed.cg ?
                      '展开' : '收起' }}</button>
              </div>
              <div class="space-y-2.5" v-show="!secCollapsed.cg">
                <!-- CG 模式 -->
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold w-16 shrink-0" style="color:rgba(156,163,175,.9)">CG</span>
                  <el-radio-group v-model="form.cgMode" size="small">
                    <el-radio-button value="none">不处理</el-radio-button>
                    <el-radio-button value="show">显示</el-radio-button>
                    <el-radio-button value="hide">隐藏</el-radio-button>
                  </el-radio-group>
                  <el-popover placement="bottom" :width="340" trigger="click" :teleported="true">
                    <template #reference>
                      <button class="chip-btn" style="background:#f472b6;color:#fff">说明</button>
                    </template>
                    <div class="select-none" style="color:#333;font-size:12px;line-height:1.7">
                      <div class="font-bold text-[13px] mb-1.5" style="color:#db2777">CG 模式（showCg）含义</div>
                      <div class="mb-1"><b style="color:#ec4899">不处理</b>：不生成 showCg，CG 保持上一段的状态，既不显示也不隐藏；填动画名可切换当前 CG 动画。</div>
                      <div class="mb-1"><b style="color:#ec4899">显示</b>：生成 <code>showCg:"名称"</code>，打开并播放该
                        CG，并应用下方动画/循环/皮肤设置。
                      </div>
                      <div class="mb-1"><b style="color:#ec4899">隐藏</b>：生成 <code>showCg:""</code>，关闭当前 CG。</div>
                      <div class="mt-1.5 pt-1.5 border-t" style="border-color:#e5e7eb;color:#888">典型用法：A 显示 → B 不处理（CG
                        继续播）→ C
                        隐藏（收掉）。</div>
                    </div>
                  </el-popover>

                </div>
                <template v-if="form.cgMode === 'show'">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold w-16 shrink-0" style="color:rgba(156,163,175,.9)">CG名</span>
                    <el-input v-model="form.showCg" size="small" placeholder="如 chuzuwu / manhua2 / taiyangyueliang"
                      class="flex-1! input-light" />
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold w-16 shrink-0" style="color:rgba(156,163,175,.9)">循环</span>
                    <el-switch v-model="form.cgLoop" />
                    <span class="text-[10px]" style="color:rgba(107,114,128,.6)">开=循环播放；关=播一次后停止（等动画播完才可继续）</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold w-16 shrink-0" style="color:rgba(156,163,175,.9)">显头像</span>
                    <el-switch v-model="form.cgShowAvatar" />
                    <span class="text-[10px]" style="color:rgba(107,114,128,.6)">CG 播放时是否仍显示头像框</span>
                  </div>
                </template>
                <div v-if="form.cgMode !== 'hide'" class="flex items-center gap-2">
                  <span class="text-xs font-bold w-16 shrink-0" style="color:rgba(156,163,175,.9)">动画</span>
                  <el-input v-model="form.cgAnimation" size="small" placeholder="动画名，默认 animation；不处理也能切换当前 CG 动画"
                    class="flex-1! input-light" />
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold w-16 shrink-0" style="color:rgba(156,163,175,.9)">恢复动画</span>
                  <el-switch v-model="form.cgResume" />
                  <span class="text-[10px]" style="color:rgba(107,114,128,.6)">本节点推进时恢复被「pause 标记点」暂停的 CG 继续播放（未标记则保持暂停定格）</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold w-16 shrink-0" style="color:rgba(156,163,175,.9)">皮肤</span>
                  <el-input v-model="form.cgSkin" size="small" placeholder="CG 的 Spine 皮肤名（可空=默认皮肤）；不重载 CG 也能独立换肤"
                    class="flex-1! input-light" />
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold w-16 shrink-0" style="color:rgba(156,163,175,.9)">隐对话</span>
                  <el-switch v-model="form.hideUI" />
                  <span class="text-[10px]" style="color:rgba(107,114,128,.6)">生成 hideUI:true，隐藏对话框只显示
                    CG（点击层也禁用，配合自动下一句播放）</span>
                </div>
                <div v-if="form.hideUI" class="flex items-center gap-2">
                  <span class="text-xs font-bold w-16 shrink-0" style="color:rgba(156,163,175,.9)">自动下句</span>
                  <el-input v-model="form.autoNext" size="small" placeholder="毫秒，如 2000=2秒后自动进入下一句；留空=不自动"
                    class="flex-1! input-light" />
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold w-16 shrink-0" style="color:rgba(156,163,175,.9)">黑屏</span>
                  <el-switch v-model="form.blackScreen" />
                  <span class="text-[10px]" style="color:rgba(107,114,128,.6)">生成
                    blackScreen:true，全屏黑底白字模式（选项显示在文字下方）</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold w-16 shrink-0" style="color:rgba(156,163,175,.9)">字速</span>
                  <el-input v-model="form.textSpeed" size="small" placeholder="每秒字数，如 20；留空=默认速度"
                    class="flex-1! input-light" @input="form.textSpeedTouched = true" />
                  <span class="text-[10px]" style="color:rgba(107,114,128,.6)">生成
                    textSpeed:N，普通/黑屏文字都生效；设置后点击不能跳过打字</span>
                </div>
                <div class="text-[10px]" style="color:rgba(107,114,128,.6)">说明：隐藏 CG 选「隐藏」；仅换皮肤/切动画不重载 CG 时选「不处理」并填皮肤名/动画名即可。
                </div>
              </div>
            </div>
            <!-- 分区：逻辑 -->
            <div class="rounded-lg p-3" style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06)">
              <div class="flex items-center justify-between mb-2.5">
                <span class="text-[11px] font-bold tracking-wide" style="color:#38bdf8">▍逻辑</span>
                <button @click="toggleSec('logic')"
                  class="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-amber-400/30 text-gray-300">{{
                    secCollapsed.logic ? '展开' : '收起' }}</button>
              </div>
              <div class="space-y-2.5" v-show="!secCollapsed.logic">
                <!-- 条件 -->
                <div class="flex items-start gap-2">
                  <span class="text-xs font-bold w-16 shrink-0 leading-7" style="color:rgba(156,163,175,.9)">条件</span>
                  <div class="flex-1">
                    <el-input v-model="form.condition" type="textarea" :rows="2" size="small"
                      placeholder="（决定这个对话能不能触发）" />
                    <div class="flex items-center gap-1 mt-1 flex-wrap">
                      <span class="text-[10px] text-gray-500">快捷插入：</span>
                      <button class="chip-btn" style="background:#0ea5e9;color:#fff" @click="openQuickHelp('cond')">?
                        说明</button>
                      <button v-for="c in COND_PRESETS" :key="c.label" @click="insertCond(c.code)"
                        class="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-amber-400/30 text-gray-300"
                        :title="c.desc">{{ c.label }}</button>
                    </div>
                  </div>
                </div>
                <!-- onEnter 函数 -->
                <div class="flex items-start gap-2">
                  <span class="text-xs font-bold w-16 shrink-0 leading-7"
                    style="color:rgba(156,163,175,.9)">onEnter</span>
                  <div class="flex-1">
                    <el-input v-model="form.onEnter" type="textarea" :rows="2" size="small"
                      placeholder="onEnter 函数体（不含外层箭头函数）。留空 = 不生成 onEnter" />
                    <div class="mt-1">
                      <button v-if="!onEnterOpen" @click="onEnterOpen = true"
                        class="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-amber-400/30 text-gray-300">＋
                        快速逻辑</button>
                      <div v-else class="flex items-center gap-1 flex-wrap">
                        <span class="text-[10px] text-gray-500">快捷插入：</span>
                        <button class="chip-btn" style="background:#f59e0b;color:#fff" @click="openQuickHelp('enter')">?
                          说明</button>
                        <button v-for="c in ONENTER_PRESETS" :key="c.label" @click="insertOnEnter(c.code)"
                          class="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-amber-400/30 text-gray-300"
                          :title="c.desc">{{ c.label }}</button>
                        <button @click="onEnterOpen = false"
                          class="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-red-400/30 text-gray-300">收起</button>
                      </div>
                    </div>
                    <div class="text-[10px] mt-1" style="color:rgba(107,114,128,.6)">例：user.setDialogueFlag('xx', true);
                      或
                      user.completeTaskStep?.('find_liya','find');</div>
                  </div>
                </div>
              </div>
            </div>
            <!-- 分区：选项 -->
            <div class="rounded-lg p-3" style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06)">
              <div class="flex items-center justify-between mb-2.5">
                <span class="text-[11px] font-bold tracking-wide" style="color:#a78bfa">▍选项</span>
                <button @click="toggleSec('options')"
                  class="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-amber-400/30 text-gray-300">{{
                    secCollapsed.options ? '展开' : '收起' }}</button>
              </div>
              <div class="space-y-2.5" v-show="!secCollapsed.options">
                <!-- 选项 options -->
                <div class="flex items-start gap-2">
                  <span class="text-xs font-bold w-16 shrink-0 leading-7" style="color:rgba(156,163,175,.9)">选项</span>
                  <div class="flex-1">
                    <div v-if="form.options.length" class="space-y-2">
                      <div v-for="(o, oi) in form.options" :key="oi" class="rounded p-2"
                        style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07)">
                        <div class="flex items-center gap-2 mb-1">
                          <span class="text-[10px]" style="color:rgba(156,163,175,.7)">选项 {{ oi + 1 }}</span>
                          <div class="flex-1"></div>
                          <button class="chip-btn danger" @click="form.options.splice(oi, 1)">删除</button>
                          <button class="chip-btn" @click="moveOption(oi, -1)">↑</button>
                          <button class="chip-btn" @click="moveOption(oi, 1)">↓</button>
                        </div>
                        <div class="flex items-center gap-2 mb-1">
                          <el-input v-model="o.text" size="small" placeholder="选项文本" class="flex-1! input-light" />
                          <el-input v-model="o.next" size="small" placeholder="跳转节点" class="w-32! input-light" />
                        </div>
                        <el-input v-model="o.nextCond" size="small" type="textarea" :autosize="{ minRows: 1, maxRows: 2 }"
                          placeholder="跳转条件（可选）：条件表达式返回目标节点 id；留空则直接跳「跳转节点」。例：cond.flag('A') ? 'sr101' : 'sr10'"
                          class="input-light mb-1" />
                        <el-input v-model="o.condition" size="small" placeholder="（决定这个选项显不显示）" class="input-light" />
                        <div class="mt-1">
                          <button v-if="!optCondOpen[oi]" @click="optCondOpen[oi] = true"
                            class="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-amber-400/30 text-gray-300">＋
                            快速条件</button>
                          <template v-else>
                            <div class="flex items-center gap-1 flex-wrap">
                              <span class="text-[10px] text-gray-500">快捷插入：</span>
                              <button class="chip-btn" style="background:#0ea5e9;color:#fff"
                                @click="openQuickHelp('cond')">? 说明</button>
                              <button v-for="c in COND_PRESETS" :key="c.label" @click="insertOptCond(oi, c.code)"
                                class="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-amber-400/30 text-gray-300"
                                :title="c.desc">{{ c.label }}</button>
                              <button @click="optCondOpen[oi] = false"
                                class="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-red-400/30 text-gray-300">收起</button>
                            </div>
                          </template>
                        </div>
                        <div class="flex items-center gap-3 mt-1">
                          <label class="flex items-center gap-1 text-[10px] text-gray-500"><el-checkbox
                              v-model="o.hideOnChosen" size="small" />选后消失</label>
                          <label class="flex items-center gap-1 text-[10px] text-gray-500"><el-checkbox
                              v-model="o.repeatable" size="small" />可重复</label>
                        </div>
                        <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span class="text-[10px] text-gray-500">色：</span>
                          <button v-for="(pt, pi) in OPTION_COLOR_PRESETS" :key="pi"
                            class="w-[18px] h-[16px] rounded cursor-pointer transition-all hover:scale-110"
                            :style="{ background: pt.bg }" :title="pt.name"
                            :class="optActivePreset(o, pt) ? 'ring-2 ring-amber-400' : ''"
                            @click="applyOptPreset(o, pt)"></button>
                          <span class="text-[10px] text-gray-500">背景</span>
                          <el-color-picker v-model="o.optionBg" size="small" class="mb-3vh" />
                          <span class="text-[10px] text-gray-500">文字</span>
                          <el-color-picker v-model="o.optionColor" size="small" class="mb-3vh" />
                          <button class="chip-btn" @click="clearOptColor(o)">重置</button>
                          <span class="inline-block px-2 py-0.5 rounded text-[11px] font-bold"
                            :style="optPreviewStyle(o)">预览</span>
                        </div>
                        <el-input v-model="o.onSelect" type="textarea" :rows="2" resize="none" size="small"
                          placeholder="onSelect：选择后执行逻辑（可多行，自动包成 () => { ... }，如 user.setDialogueFlag('xx', true)）"
                          class="input-light mt-1" />
                        <div class="mt-1">
                          <button v-if="!optOnSelOpen[oi]" @click="optOnSelOpen[oi] = true"
                            class="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-amber-400/30 text-gray-300">＋
                            快速逻辑</button>
                          <template v-else>
                            <div class="flex items-center gap-1 flex-wrap">
                              <span class="text-[10px] text-gray-500">快捷插入：</span>
                              <button class="chip-btn" style="background:#f59e0b;color:#fff"
                                @click="openQuickHelp('enter')">? 说明</button>
                              <button v-for="c in ONENTER_PRESETS" :key="c.label" @click="insertOptOnSel(oi, c.code)"
                                class="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-amber-400/30 text-gray-300"
                                :title="c.desc">{{ c.label }}</button>
                              <button @click="optOnSelOpen[oi] = false"
                                class="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-red-400/30 text-gray-300">收起</button>
                            </div>
                          </template>
                        </div>
                      </div>
                    </div>
                    <el-button size="small" type="primary" plain @click="addOption">＋ 添加选项</el-button>
                  </div>
                </div>

              </div>
            </div>

          </div>
          <div v-else class="flex-1 flex items-center justify-center text-gray-600 text-sm">← 选择左侧节点，或加载文件</div>

          <!-- 💡 快捷按钮说明弹窗 -->
          <el-dialog v-model="quickHelpVisible" :title="quickHelpTab === 'cond' ? '快速条件（决定出现时机）' : '快速逻辑（进入/选择后执行的动作）'"
            width="60vw" append-to-body :modal="true">
            <div v-show="quickHelpTab === 'cond'"
              class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[58vh] overflow-y-auto">
              <div v-for="c in COND_PRESETS" :key="c.label" class="rounded p-2"
                style="background:#f8fafc;border:1px solid #e2e8f0">
                <div class="text-[13px] font-bold" style="color:#0ea5e9">{{ c.label }}</div>
                <div class="text-[12px] text-gray-600 mt-1">{{ c.desc }}</div>
                <div class="text-[11px] font-mono text-gray-500 mt-1 break-all bg-white rounded px-1.5 py-0.5"
                  style="border:1px solid #e5e7eb">{{ c.code }}</div>
              </div>
            </div>
            <div v-show="quickHelpTab === 'enter'"
              class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[58vh] overflow-y-auto">
              <div v-for="c in ONENTER_PRESETS" :key="c.label" class="rounded p-2"
                style="background:#fffbeb;border:1px solid #fde68a">
                <div class="text-[13px] font-bold" style="color:#d97706">{{ c.label }}</div>
                <div class="text-[12px] text-gray-600 mt-1">{{ c.desc }}</div>
                <div class="text-[11px] font-mono text-gray-500 mt-1 break-all bg-white rounded px-1.5 py-0.5"
                  style="border:1px solid #e5e7eb">{{ c.code }}</div>
              </div>
            </div>
          </el-dialog>

          <el-dialog v-model="condTutorialVisible" title="📖 条件说明（大白话版）" width="52vw" append-to-body :modal="true">
            <div class="space-y-3 max-h-[60vh] overflow-y-auto" style="color:#334155">
              <div class="rounded p-3" style="background:#f0f9ff;border:1px solid #bae6fd">
                <div class="text-[13px] font-bold" style="color:#0369a1">条件是什么？</div>
                <div class="text-[12px] mt-1 leading-5">条件就是一个“满足不满足某个情况”的判断。游戏会从上往下一条条看：哪条满足，就进它右边的对话；全不满足就走「否则」保底。</div>
              </div>
              <div class="rounded p-3" style="background:#f8fafc;border:1px solid #e2e8f0">
                <div class="text-[13px] font-bold" style="color:#0f172a">常用写法（复制即用）</div>
                <table class="w-full mt-1 text-[12px]">
                  <tr><td class="py-1 pr-2 align-top" style="color:#64748b">开关开了（是/否状态，如“有没有问过价格”）</td><td class="py-1 font-mono" style="color:#0ea5e9">cond.flag('开关名')</td></tr>
                  <tr><td class="py-1 pr-2 align-top" style="color:#64748b">开关没开</td><td class="py-1 font-mono" style="color:#0ea5e9">cond.notFlag('开关名')</td></tr>
                  <tr><td class="py-1 pr-2 align-top" style="color:#64748b">某段剧情没做过 / 做过了</td><td class="py-1 font-mono" style="color:#0ea5e9">cond.notCompleted('节点id') / cond.completed('节点id')</td></tr>
                  <tr><td class="py-1 pr-2 align-top" style="color:#64748b">数值达标（好感度、次数等）</td><td class="py-1 font-mono" style="color:#0ea5e9">cond.flagNumGte('名字', 20)</td></tr>
                  <tr><td class="py-1 pr-2 align-top" style="color:#64748b">多个条件同时满足</td><td class="py-1 font-mono" style="color:#0ea5e9">cond.all(cond.flag('a'), cond.flag('b'))</td></tr>
                  <tr><td class="py-1 pr-2 align-top" style="color:#64748b">多个条件满足一个就行</td><td class="py-1 font-mono" style="color:#0ea5e9">cond.any(cond.flag('a'), cond.flag('b'))</td></tr>
                </table>
              </div>
              <div class="rounded p-3" style="background:#fffbeb;border:1px solid #fde68a">
                <div class="text-[13px] font-bold" style="color:#b45309">开关（flag）在哪设置？</div>
                <div class="text-[12px] mt-1 leading-5">在选项的「onSelect」或节点的「onEnter」里写：</div>
                <div class="text-[11px] font-mono mt-1 rounded px-2 py-1" style="background:#fff7ed;border:1px solid #fed7aa;color:#c2410c">
                  user.setDialogueFlag('开关名', true)　　// 打开<br>
                  user.setDialogueFlag('开关名', false)　　// 关闭
                </div>
              </div>
              <div class="rounded p-3" style="background:#f0fdf4;border:1px solid #bbf7d0">
                <div class="text-[13px] font-bold" style="color:#15803d">完整例子</div>
                <div class="text-[12px] mt-1 leading-5">想让“第一次问价格”走 sr101，“之后再来”走 sr102：</div>
                <div class="text-[11px] font-mono mt-1 rounded px-2 py-1" style="background:#f0fdf4;border:1px solid #bbf7d0;color:#166534">
                  1. sr01 的选项「onSelect」写：user.setDialogueFlag('问过价格', true)<br>
                  2. sr100 中转站条件列表：<br>
                     &nbsp;&nbsp;如果 cond.flag('问过价格') → 跳 sr102<br>
                     &nbsp;&nbsp;否则 → 跳 sr101
                </div>
              </div>
              <div class="text-[11px]" style="color:#94a3b8">💡 当前 sr100 里已有的两条条件（见过里亚 / 某开关）只是示例占位，请替换成你自己的真实条件。</div>
            </div>
          </el-dialog>

          <!-- 底部：补丁队列 + 代码预览（移动端整个隐藏） -->
          <div v-if="!isMobile" class="rounded-xl p-3 flex flex-col gap-2 shrink-0 max-h-[34%] overflow-y-auto"
            style="background:#141821;border:1px solid rgba(255,255,255,.08)">
            <div class="flex items-center gap-2 shrink-0">
              <span class="text-xs font-bold" style="color:rgba(229,231,235,.85)">📋 补丁队列（插入/替换操作）</span>
              <div class="flex-1"></div>
              <el-button size="small" type="danger" plain @click="clearPatch">清空</el-button>
            </div>
            <div v-if="patchOps.length" class="space-y-1 overflow-y-auto shrink-0">
              <div v-for="(p, pi) in patchOps" :key="pi" class="flex items-center gap-2 text-[11px] rounded px-2 py-1.5"
                style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06)">
                <span
                  :class="p.kind === 'insert' ? 'text-emerald-300' : (p.kind === 'delete' ? 'text-red-400' : 'text-red-300')">{{
                    p.kind === 'insert' ? '插入' : (p.kind === 'delete' ? '删除' : '替换') }}</span>
                <span class="text-amber-300 font-mono">{{ p.id }}</span>
                <span class="text-gray-500">{{ p.file }}</span>
                <span class="text-gray-600 truncate flex-1">{{ p.preview }}</span>
                <button class="chip-btn danger" @click="patchOps.splice(pi, 1)">✕</button>
              </div>
            </div>
            <div v-else class="text-[11px]" style="color:rgba(107,114,128,.6)">暂无操作。编辑节点后点「加入补丁」，最后点右上角「生成补丁脚本」导出。</div>
            <!-- 代码预览 -->
            <div v-if="genCode" class="rounded overflow-hidden shrink-0" style="border:1px solid rgba(255,255,255,.08)">
              <div class="flex items-center gap-2 px-2 py-1.5" style="background:rgba(255,255,255,.04)">
                <span class="text-[10px] font-bold" style="color:rgba(156,163,175,.8)">节点代码预览</span>
                <div class="flex-1"></div>
                <button class="text-[10px] px-1.5 rounded bg-white/10 hover:bg-amber-400/30 text-gray-300"
                  @click="copyNodeCode">复制</button>
              </div>
              <pre class="text-[11px] text-emerald-200/90 font-mono overflow-auto p-2 max-h-40 whitespace-pre">{{ genCode }}
      </pre>
            </div>
          </div>

        </div>
      </div>

      <!-- ============ Tab2 查看剧情对话 ============ -->
      <div v-show="curTab === 'story'" class="h-full flex flex-col gap-2">
        <div class="flex items-center gap-2 shrink-0 flex-wrap">
          <span class="text-xs text-gray-400">从当前文件 <b class="text-amber-300">{{ curFile }}.js</b>
            生成剧情预览（按对话流分组，可选中文字复制）</span>
          <div class="flex-1"></div>
          <el-button size="small" type="warning" @click="buildStoryText()">↻ 重新生成</el-button>
          <el-button size="small" type="primary" @click="copyText(plainStoryText)">📋 复制全文</el-button>
        </div>
        <pre class="flex-1 min-h-0 overflow-auto rounded-lg p-3 text-[16px] font-mono whitespace-pre leading-relaxed"
          style="background:#0b0e14;border:1px solid rgba(255,255,255,.08);color:rgba(209,213,219,.92);user-select:text!important;-webkit-user-select:text!important"
          v-html="storyText || '（加载文件后点「重新生成」）'"></pre>
      </div>

      <!-- ============ Tab3 编辑天赋 ============ -->
      <div v-if="curTab === 'talent'" class="h-full flex flex-col gap-2">
        <div class="flex items-center gap-2 shrink-0">
          <span class="text-xs font-bold" style="color:rgba(229,231,235,.85)">🎓 编辑天赋</span>
          <span class="text-[10px]" style="color:rgba(107,114,128,.7)">src/store/counter-store.js · 保存后读档自动生效</span>
          <div class="flex-1"></div>
          <span v-if="talentAllPoint > 0" class="text-[11px] font-bold px-2 py-1 rounded-lg shrink-0"
            style="background:rgba(52,211,153,.12);color:#6ee7b7;border:1px solid rgba(52,211,153,.3)">💎 全部点满共
            {{ talentAllPoint }} 点</span>
          <el-button size="small" type="success" plain @click="addTalent">＋ 新增天赋</el-button>
          <el-button size="small" @click="loadTalentConfig()">加载</el-button>
          <el-button size="small" type="primary" :disabled="!talentLoaded" @click="saveTalentConfig()">💾
            保存写入</el-button>
        </div>
        <!-- 🕸️ 画布：左画布（天赋树）+ 右表单 -->
        <div class="flex-1 min-h-0 flex gap-2 rounded-xl p-3"
          style="background:#141821;border:1px solid rgba(255,255,255,.08)">
          <div class="flex-1 min-w-0 relative overflow-hidden rounded-lg" style="background:#0b0e14">
            <canvas ref="talentCanvasRef" class="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
              @mousedown="onTalentCanvasDown" @wheel.prevent="onTalentCanvasWheel"
              @touchstart="onTalentCanvasTouchStart" @touchmove.prevent="onTalentCanvasTouchMove"
              @touchend="onTalentCanvasTouchEnd"></canvas>
            <div class="absolute bottom-2 right-2 text-[10px] rounded px-1.5 py-0.5"
              style="background:rgba(0,0,0,.55);color:#9ca3af">滚轮缩放 · 拖动平移（Ctrl+Z 撤销移动）· 点击节点选中</div>
          </div>
          <!-- 选中天赋编辑表单（画布模式右侧） -->
          <div class="w-[32vw] shrink-0 overflow-y-auto pr-1 space-y-1.5 pb-11vh" v-if="selTalent">
            <div class="flex items-center gap-1.5 pb-1.5 border-b border-white/10">
              <el-button size="small" type="success" plain @click="addTalentBefore">🔺 前置位添加</el-button>
              <el-button size="small" type="warning" plain @click="addTalentAfter">🔻 后置位添加</el-button>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] w-4vw shrink-0" style="color:rgba(156,163,175,.9)">ID</span>
              <el-input v-model="selTalent.id" size="small" class="input-light flex-1!" />
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] w-4vw shrink-0" style="color:rgba(156,163,175,.9)">名称</span>
              <el-input v-model="selTalent.name" size="small" class="input-light flex-1!" />
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] w-4vw   shrink-0" style="color:rgba(156,163,175,.9)">皮肤名</span>
              <el-input v-model="selTalent.icon" size="small" placeholder="tianfu 皮肤名（默认=天赋 id）"
                class="input-light flex-1!" />
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] w-4vw shrink-0" style="color:rgba(156,163,175,.9)">升级花费</span>
              <el-input-number v-model="selTalent.cost" :min="0" :max="99" size="small" class="input-light flex-1!" />
              <span class="text-[10px] w-4vw shrink-0 ml-1.5vw" style="color:rgba(156,163,175,.9)">解锁花费</span>
              <el-input-number v-model="selTalent.levelCost" :min="0" :max="99" size="small"
                class="input-light flex-1!" />
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] w-4vw shrink-0" style="color:rgba(156,163,175,.9)">上限</span>
              <el-input-number v-model="selTalent.maxLevel" :min="1" :max="99" size="small"
                class="input-light flex-1!" />
              <span class="text-[10px] w-4vw shrink-0" style="color:rgba(156,163,175,.9)">颜色</span>
              <el-color-picker v-model="selTalent.color" size="small" class="mb-5vh!" />
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] w-4vw shrink-0" style="color:rgba(156,163,175,.9)">层级</span>
              <el-input-number v-model="selTalent.tier" :min="1" :max="20" size="small" class="input-light flex-1!" />
              <span class="text-[10px] w-4vw shrink-0" style="color:rgba(156,163,175,.9)">列</span>
              <el-input-number v-model="selTalent.col" :step="0.1" size="small" class="input-light flex-1!" />
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
                <button class="chip-btn danger shrink-0" @click="selTalent.prerequisites.splice(pi, 1)">✕</button>
              </div>
              <div v-if="!selTalent.prerequisites?.length" class="text-[10px]" style="color:rgba(107,114,128,.6)">
                无前置（初始层天赋）
              </div>
            </div>
            <!-- 🔒 属性需求（达标才可解锁，可多条） -->
            <div>
              <div class="flex items-center gap-1.5 mb-1">
                <span class="text-[10px]" style="color:rgba(156,163,175,.9)">属性需求（达标才可解锁，可多条）</span>
                <div class="flex-1"></div>
                <el-button size="small" @click="addTalentAttrReq">＋ 添加属性需求</el-button>
              </div>
              <div v-if="talentAttrReqs.length" class="space-y-1 mb-1">
                <div v-for="(r, ri) in talentAttrReqs" :key="ri" class="flex items-center gap-1.5">
                  <el-select v-model="r.key" size="small" class="input-light flex-1!">
                    <el-option v-for="a in ATTR_REQ_OPTIONS" :key="a.key" :label="a.label" :value="a.key" />
                  </el-select>
                  <span class="text-[10px] shrink-0" style="color:rgba(156,163,175,.7)">≥</span>
                  <el-input-number v-model="r.value" :min="0" :max="999" size="small" class="input-light w-24!" />
                  <button class="chip-btn danger shrink-0" @click="removeTalentAttrReq(ri)">✕</button>
                </div>
              </div>
              <div v-else class="text-[10px]" style="color:rgba(107,114,128,.6)">无属性需求（默认）</div>
            </div>
            <div class="flex items-start gap-1.5">
              <span class="text-[10px] w-4vw shrink-0 pt-1" style="color:rgba(156,163,175,.9)">描述</span>
              <el-input v-model="selTalent.description" type="textarea" :rows="4" size="small"
                class="input-light flex-1!"
                placeholder="支持 ${eff.key} 占位符，渲染时按等级自动替换为效果值，如：每使用${eff.needCards}张牌恢复${eff.mp}点灵力" />
            </div>
            <!-- 🎯 战斗效果（key 由战斗代码读取，value 未配置时用代码默认值） -->
            <div>
              <div class="flex items-center gap-1.5 mb-1">
                <span class="text-[14px]" style="color:rgba(156,163,175,.9)"> 战斗效果</span>
                <div class="flex-1"></div>
                <el-button size="small" @click="addTalentEffect">＋ 添加</el-button>
              </div>
              <div v-for="(ef, ei) in selTalent.effectEntries" :key="ei" class="mb-1">
                <div class="flex items-center gap-1.5">
                  <el-input v-model="ef.key" size="small" placeholder="key（如 atkPct）" class="input-light flex-1!" />
                  <el-input v-model="ef.value" size="small" placeholder="数值" class="input-light flex-1!" />
                  <button class="chip-btn danger shrink-0" @click="selTalent.effectEntries.splice(ei, 1)">✕</button>
                </div>
                <div v-if="effectKeyHint(ef.key)" class="text-[14px] mt-0.5vh pl-1 leading-tight"
                  style="color:rgba(148,163,184,.8)">{{ effectKeyHint(ef.key) }}</div>
              </div>
              <div v-if="!selTalent.effectEntries?.length" class="text-[10px]" style="color:rgba(107,114,128,.6)">无效果值 →
                战斗使用代码默认值</div>
            </div>
            <div class="flex items-center gap-2 pt-1">
              <el-button size="small" type="danger" plain @click="delTalent">🗑 删除该天赋</el-button>
              <span class="text-[10px]" style="color:rgba(107,114,128,.6)">保存后读档自动生效</span>
            </div>
          </div>
          <div v-else class="w-[340px] shrink-0 text-[11px]"
            style="color:rgba(107,114,128,.6);display:flex;align-items:center;justify-content:center">← 点击画布节点编辑</div>
        </div>
      </div>

    </div>

    <!-- 复制提示 -->
    <div v-if="toast"
      class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black/80 text-amber-300 text-xs px-4 py-2 rounded-full border border-amber-400/40">
      {{ toast }}</div>

    <!-- 🎬 头像动画预览 -->
    <el-dialog v-model="fxPreviewVisible" title="🎬 头像动画预览" width="70vw" append-to-body :close-on-click-modal="false"
      @closed="closeFxPreview">
      <div class="flex flex-row items-start gap-3">
        <div class="flex flex-col items-center shrink-0">
          <div ref="fxPreviewBox"
            class="w-[260px] h-[300px] relative overflow-hidden rounded-lg bg-[#14141f] border border-white/10 flex items-center justify-center">
          </div>
          <div class="mt-2 flex items-center gap-2">
            <button class="chip-btn" @click="playFxPrevOnce(fxPreviewFx)">▶ 播放</button>
          </div>
          <div class="mt-1 text-xs text-gray-600 text-center max-w-[260px]">{{ fxPreviewInfo }}</div>
        </div>
        <div class="flex-1 grid grid-cols-3 gap-1.5 max-h-[330px] overflow-y-auto pr-1 min-w-0">
          <button v-for="n in AVATAR_FX_NAMES" :key="n"
            class="px-1 py-1 rounded text-[16px] border transition-all leading-tight"
            :class="fxPreviewFx === n ? 'bg-amber-400 text-black border-amber-300 font-bold' : 'bg-white/5 text-gray-500 border-white/10 hover:bg-white/15'"
            @click="onFxPrevSwitchBy(n)">
            {{ AVATAR_FX_LABELS[n] || n }}
          </button>
        </div>
      </div>
    </el-dialog>

    <!-- ============ Tab4 地牢编辑 ============ -->
    <div v-if="curTab === 'dungeon'" class="h-full flex flex-col gap-2">
      <div class="flex items-center gap-2 shrink-0">
        <span class="text-xs font-bold" style="color:rgba(229,231,235,.85)">🗺️ 地牢编辑</span>
        <span class="text-[10px]" style="color:rgba(107,114,128,.7)">dungeon/config.js + dropRates.js · 保存后重进地牢生效</span>
        <div class="flex-1"></div>
        <el-button size="small" @click="loadDungeonConfig()">加载</el-button>
        <el-button size="small" type="primary" :disabled="!dungeonLoaded" @click="saveDungeonConfig()">💾
          保存写入</el-button>
      </div>
      <div v-if="!dungeonLoaded" class="flex-1 flex items-center justify-center text-[13px]"
        style="color:rgba(148,163,184,.7)">
        {{ dungeonLoading ? '⏳ 正在加载地牢配置…' : '尚未加载，点击右上角「加载」' }}
      </div>
      <div v-else class="flex-1 min-h-0 overflow-y-auto rounded-xl p-3 space-y-2"
        style="background:#141821;border:1px solid rgba(255,255,255,.08)">
        <div v-for="g in dungeonGroups" :key="g.key" class="rounded-lg px-3 py-1.5"
          style="background:rgba(255,255,255,.03)">
          <div class="flex items-center gap-2 cursor-pointer select-none py-1"
            @click="dungeonOpen[g.key] = !dungeonOpen[g.key]">
            <span class="text-xs font-bold" style="color:#fbbf24">{{ g.icon }} {{ g.title }}</span>
            <span class="text-[10px]" style="color:rgba(148,163,184,.6)">{{ g.desc }}</span>
            <span class="flex-1"></span>
            <span class="text-[10px]" style="color:rgba(148,163,184,.6)">{{ dungeonOpen[g.key] ? '▼ 收起' : '▶ 展开'
              }}</span>
          </div>
          <div v-show="dungeonOpen[g.key]" class="space-y-1.5 pt-1">
            <template v-if="g.key === 'weatherTable'">
              <div v-for="(w, sc) in dungeonCfg?.weatherTable" :key="sc" class="rounded-lg p-2"
                style="background:rgba(255,255,255,.04)">
                <div class="text-[11px] font-bold mb-1" style="color:#93c5fd">{{ dungeonSceneName(sc) }}（{{ sc }}）</div>
                <div class="flex flex-wrap gap-x-3 gap-y-1">
                  <div v-for="(v, wk) in w" :key="wk" class="flex items-center gap-1">
                    <span class="text-[10px] w-7 text-right shrink-0" style="color:rgba(156,163,175,.9)">{{
                      DUNGEON_WEATHER_LABELS[wk] || wk }}</span>
                    <el-input-number v-model="dungeonCfg.weatherTable[sc][wk]" :min="0" :max="999" :step="1"
                      size="small" controls-position="right" class="dungeon-num" />
                  </div>
                </div>
              </div>
              <div class="text-[10px]" style="color:rgba(107,114,128,.7)">权重越高越容易抽中；0 = 该天气不会出现。</div>
            </template>
            <template v-else-if="g.key === 'weather'">
              <div v-for="(w, wk) in dungeonCfg?.weather" :key="wk" class="rounded-lg p-2"
                style="background:rgba(255,255,255,.04)">
                <div class="text-[11px] font-bold mb-1" style="color:#93c5fd">{{ DUNGEON_WEATHER_LABELS[wk] || wk }}
                  {{ DUNGEON_WEATHER_ICONS[wk] || '' }}</div>
                <div class="flex flex-wrap gap-x-3 gap-y-1 items-center">
                  <span class="text-[10px]" style="color:rgba(156,163,175,.9)">玩家减速</span>
                  <el-input-number v-model="dungeonCfg.weather[wk].playerSlow" :min="0" :max="1" :step="0.05"
                    size="small" controls-position="right" class="dungeon-num" />
                  <span class="text-[10px]" style="color:rgba(156,163,175,.9)">可见度减少(格)</span>
                  <el-input-number v-model="dungeonCfg.weather[wk].fogReduce" :min="0" :max="20" :step="1" size="small"
                    controls-position="right" class="dungeon-num" />
                  <span class="text-[10px]" style="color:rgba(156,163,175,.9)">敌人加速</span>
                  <el-input-number v-model="dungeonCfg.weather[wk].enemySpeedUp" :min="0" :max="1" :step="0.05"
                    size="small" controls-position="right" class="dungeon-num" />
                </div>
              </div>
            </template>
            <template v-else-if="g.key === 'weatherDesc'">
              <div v-for="(info, wk) in DUNGEON_WEATHER_PREVIEW" :key="wk" class="rounded px-2 py-1.5"
                style="background:rgba(255,255,255,.04)">
                <div class="flex items-center gap-2 mb-1">
                  <span :style="{ color: info.color, fontWeight: 700 }">{{ info.icon }} {{ info.name }}</span>
                  <span class="flex-1"></span>
                  <button class="text-[10px] px-1.5 py-0.5 rounded bg-sky-400/15 text-sky-300 hover:bg-sky-400/30"
                    @click="regenerateWeatherDesc(wk)">按数值生成</button>
                </div>
                <el-input v-model="dungeonCfg.weather[wk].desc" type="textarea" :rows="2" resize="none"
                  class="input-light" placeholder="留空 = 按数值自动生成" />
                <div class="text-[10px] mt-0.5 whitespace-pre-line" style="color:rgba(148,163,184,.75)">
                  自动生成：{{ info.desc }}</div>
              </div>
              <div class="text-[10px]" style="color:rgba(107,114,128,.7)">
                说明可手动修改并写入配置；清空输入框恢复「按数值自动生成」；「按数值生成」用当前数值填入，改数值后再点可同步。</div>
            </template>
            <template v-else-if="g.key === 'player' || g.key === 'enemy' || g.key === 'battle'">
              <div v-for="f in DUNGEON_FIELDS[g.key === 'battle' ? 'battle' : g.key]" :key="f.k"
                class="flex items-center gap-2 py-0.5">
                <span class="text-[11px] w-26 shrink-0 text-right" style="color:rgba(156,163,175,.95)">{{ f.label
                  }}</span>
                <el-input-number v-model="dungeonCfg[f.k]" :min="f.min ?? 0" :max="f.max ?? 99" :step="f.step ?? 1"
                  size="small" controls-position="right" class="dungeon-num" />
                <span class="text-[10px]" style="color:rgba(107,114,128,.7)">{{ f.hint }}</span>
              </div>
              <template v-if="g.key === 'battle'">
                <div class="flex items-center gap-2 py-0.5">
                  <span class="text-[11px] w-26 shrink-0 text-right" style="color:rgba(156,163,175,.95)">雪天冻伤</span>
                  <span class="text-[10px]" style="color:rgba(156,163,175,.9)">呆满</span>
                  <el-input-number v-model="dungeonCfg.frost.staySec" :min="1" :max="600" size="small"
                    controls-position="right" class="dungeon-num" />
                  <span class="text-[10px]" style="color:rgba(156,163,175,.9)">秒后每</span>
                  <el-input-number v-model="dungeonCfg.frost.dmgInterval" :min="1" :max="120" size="small"
                    controls-position="right" class="dungeon-num" />
                  <span class="text-[10px]" style="color:rgba(107,114,128,.7)">秒扣 1% 生命</span>
                </div>
                <div class="flex flex-wrap items-center gap-x-2 gap-y-1 py-0.5">
                  <span class="text-[11px] w-26 shrink-0 text-right" style="color:rgba(156,163,175,.95)">血月加成</span>
                  <template v-for="f in DUNGEON_FIELDS.bloodmoon" :key="f.k">
                    <span class="text-[10px]" style="color:rgba(156,163,175,.9)">{{ f.label }}</span>
                    <el-input-number v-model="dungeonCfg.bloodmoonBattle[f.k]" :min="0" :max="5" :step="0.05"
                      size="small" controls-position="right" class="dungeon-num-sm" />
                  </template>
                </div>
              </template>
            </template>
            <template v-else-if="g.key === 'drops'">
              <div v-for="(rows, mon) in dungeonDrops" :key="mon" class="rounded-lg p-2"
                style="background:rgba(255,255,255,.04)">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-[11px] font-bold" style="color:#f9a8d4">{{ dungeonEnemyName(mon) }}（{{ mon
                    }}）</span>
                  <span class="text-[10px]" style="color:rgba(107,114,128,.7)">从上到下依次检测，命中即停，最多掉 1 种</span>
                  <span class="flex-1"></span>
                  <button
                    class="text-[11px] px-1.5 py-0.5 rounded bg-emerald-400/15 text-emerald-300 hover:bg-emerald-400/30"
                    @click="addDropRow(mon)">＋ 添加</button>
                </div>
                <div v-for="(r, ri) in rows" :key="ri" class="flex items-center gap-2 py-0.5">
                  <el-input v-model="r.item" size="small" class="dungeon-item-input input-light" placeholder="道具名" />
                  <span class="text-[10px]" style="color:rgba(156,163,175,.9)">概率</span>
                  <el-input-number v-model="r.base" :min="0" :max="1" :step="0.01" size="small"
                    controls-position="right" class="dungeon-num" />
                  <span class="text-[10px] font-bold w-14 shrink-0" style="color:#6ee7b7">{{ Math.round((r.base || 0) *
                    10000) / 100 }}%</span>
                  <button class="text-red-400 text-[12px] px-1 rounded hover:bg-red-500/20"
                    @click="rows.splice(ri, 1)">✕</button>
                </div>
              </div>
            </template>
            <template v-else-if="g.key === 'respawn'">
              <div class="flex items-center gap-2 py-0.5">
                <span class="text-[11px] w-26 shrink-0 text-right" style="color:rgba(156,163,175,.95)">稀有池占比</span>
                <el-input-number v-model="dungeonCfg.rarePoolPercent" :min="0" :max="100" size="small"
                  controls-position="right" class="dungeon-num" />
                <span class="text-[10px]" style="color:rgba(107,114,128,.7)">%：rare=true 的稀有道具共占此概率区间</span>
              </div>
              <div v-for="(it, ii) in dungeonCfg.respawnPool" :key="ii"
                class="flex flex-wrap items-center gap-2 py-0.5">
                <el-input v-model="it.name" size="small" class="dungeon-item-input input-light" placeholder="道具名" />
                <span class="text-[10px]" style="color:rgba(156,163,175,.9)">概率%</span>
                <el-input-number v-model="it.chance" :min="0" :max="100" :step="1" size="small"
                  controls-position="right" class="dungeon-num" />
                <el-input v-model="it.img" size="small" class="dungeon-img-input input-light" placeholder="皮肤名" />
                <span class="text-[10px]" style="color:rgba(156,163,175,.9)">最多</span>
                <el-input-number v-model="it.max" :min="1" :max="99" size="small" controls-position="right"
                  class="dungeon-num-sm" />
                <label class="flex items-center gap-1 text-[10px]" style="color:rgba(156,163,175,.9)">
                  <input type="checkbox" v-model="it.rare" class="accent-amber-400" />稀有
                </label>
                <button class="text-red-400 text-[12px] px-1 rounded hover:bg-red-500/20"
                  @click="dungeonCfg.respawnPool.splice(ii, 1)">✕</button>
              </div>
              <button class="text-[11px] px-2 py-1 rounded bg-emerald-400/15 text-emerald-300 hover:bg-emerald-400/30"
                @click="dungeonCfg.respawnPool.push({ name: '', chance: 10, img: '', max: undefined, rare: false })">＋
                添加道具</button>
            </template>
            <template v-else-if="g.key === 'audio'">
              <div class="text-[10px] mb-1" style="color:rgba(156,163,175,.8)">🎵 背景音乐音量</div>
              <div class="flex flex-wrap gap-x-3 gap-y-1">
                <div v-for="(v, mk) in dungeonCfg.bgVolume" :key="'b' + mk" class="flex items-center gap-1">
                  <span class="text-[10px] w-8 text-right shrink-0" style="color:rgba(156,163,175,.9)">{{
                    DUNGEON_WEATHER_LABELS[mk] || mk }}</span>
                  <el-input-number v-model="dungeonCfg.bgVolume[mk]" :min="0" :max="1" :step="0.05" size="small"
                    controls-position="right" class="dungeon-num-sm" />
                </div>
              </div>
              <div class="text-[10px] mt-2 mb-1" style="color:rgba(156,163,175,.8)">🎧 音效音量（未配置默认 0.7）</div>
              <div class="flex flex-wrap gap-x-3 gap-y-1">
                <div v-for="(v, sk) in dungeonCfg.sfxVolume" :key="'s' + sk" class="flex items-center gap-1">
                  <span class="text-[10px] w-9 text-right shrink-0" style="color:rgba(156,163,175,.9)">{{ sk }}</span>
                  <el-input-number v-model="dungeonCfg.sfxVolume[sk]" :min="0" :max="1" :step="0.05" size="small"
                    controls-position="right" class="dungeon-num-sm" />
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ Tab5 物品编辑 ============ -->
    <div v-if="curTab === 'items'" class="h-full flex flex-col gap-2">
      <div class="flex items-center gap-2 shrink-0">
        <span class="text-xs font-bold" style="color:rgba(229,231,235,.85)">🎒 物品编辑</span>
        <span class="text-[10px]" style="color:rgba(107,114,128,.7)">store/configs.js · 物品/售价/商店/炼制配方/合成图纸 ·
          保存后整页重载生效</span>
        <div class="flex-1"></div>
        <el-button size="small" @click="loadItemsConfig()">加载</el-button>
        <el-button size="small" type="primary" :disabled="!itemsLoaded" @click="saveItemsConfig()">💾 保存写入</el-button>
      </div>
      <div v-if="!itemsLoaded" class="flex-1 flex items-center justify-center text-[13px]"
        style="color:rgba(148,163,184,.7)">
        {{ itemsLoading ? '⏳ 正在加载物品数据…' : '尚未加载，点击右上角「加载」' }}
      </div>
      <div v-else class="flex-1 min-h-0 flex gap-2">
        <!-- 左侧：模式 + 列表 -->
        <div class="w-[25vw] shrink-0 rounded-xl p-2 flex flex-col gap-2 min-h-0"
          style="background:#141821;border:1px solid rgba(255,255,255,.08)">
          <div class="flex gap-1 shrink-0">
            <button v-for="m in ITEM_MODES" :key="m.key"
              class="px-2 py-1 rounded text-[11px] font-bold transition-all shrink-0"
              :class="itemMode === m.key ? 'bg-amber-400/15 text-amber-300' : 'text-gray-500 hover:text-gray-300'"
              @click="itemMode = m.key">{{ m.label }}</button>
          </div>
          <!-- 物品模式 -->
          <template v-if="itemMode === 'items'">
            <div class="flex gap-1 shrink-0">
              <el-input v-model="itemKeyword" size="small" placeholder="搜索名称/描述" class="input-light flex-1" />
              <el-select v-model="itemTypeFilter" size="small" class="w-20!">
                <el-option v-for="t in ITEM_TYPES" :key="t.value" :label="t.label" :value="t.value" />
              </el-select>
            </div>
            <div class="flex-1 min-h-0 overflow-y-auto space-y-1 pb-20vh">
              <div v-for="it in itemList" :key="it.name"
                class="px-2 py-1 rounded cursor-pointer flex items-center gap-1.5 text-[11px]"
                :class="selItem && selItem.name === it.name ? 'bg-amber-400/15' : 'hover:bg-white/5'"
                @click="selectItem(it)">
                <span class="w-3 h-3 rounded-full shrink-0" :style="{ background: it.color || '#888' }"></span>
                <span class="font-bold truncate flex-1" style="color:rgba(229,231,235,.9)">{{ it.name }}</span>
                <span class="text-[10px] shrink-0" style="color:rgba(148,163,184,.7)">{{
                  ITEM_TYPE_NAMES[itemTypeValue(it)] || '物品' }}</span>
              </div>
            </div>
            <button
              class="text-[11px] px-2 py-1 rounded bg-emerald-400/15 text-emerald-300 hover:bg-emerald-400/30 shrink-0"
              @click="addItem()">＋ 新增物品</button>
          </template>
          <!-- 炼制配方（左侧列表） -->
          <template v-else-if="itemMode === 'lianzhi'">
            <!-- ⚙️ 炼制等级配置（全局，写入 LIANZHI_LEVEL_CFG） -->
            <div class="px-2 py-1.5 mb-1 rounded shrink-0 text-[10px] space-y-1 "
              style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)">
              <div class="flex items-center gap-2">
                <span class="font-bold" style="color:#fbbf24">⚙️ 炼制等级（全局）</span>
                <div class="flex-1"></div>
                <label class="flex items-center gap-1" style="color:rgba(156,163,175,.9)">最大等级
                  <el-input-number v-model="itemState.lianzhiLevel.maxLevel" :min="2" :max="99" size="small"
                    controls-position="right" class="item-num" style="width:84px" /></label>
                <button class="chip-btn" @click="addLevelRow()">＋ 加一级</button>
              </div>
              <div v-for="(lv, li) in itemState.lianzhiLevel.levels" :key="li" class="flex items-center gap-1.5">
                <span class="w-7 text-[9px] shrink-0" style="color:rgba(148,163,184,.7)">Lv.{{ li + 2 }}</span>
                <el-input-number v-model="lv.need" :min="1" :max="99999" size="small" controls-position="right"
                  class="item-num" style="width:108px" />
                <el-input-number v-model="lv.reduce" :min="0" :max="1" :step="0.005" size="small"
                  controls-position="right" class="item-num" style="width:96px" />
                <span class="text-[9px] shrink-0" style="color:rgba(107,114,128,.55)">熟练度 / 减免</span>
                <div class="flex-1"></div>
                <button class="chip-btn danger" @click="removeLevelRow(li)">✕</button>
              </div>
              <div class="text-[9px]" style="color:rgba(107,114,128,.6)">每行 = 一级（从 Lv.2 起）：左=升到该级所需熟练度，右=该级失败率减免。行数应 =
                最大等级-1，保存时自动对齐。</div>
            </div>
            <div class="flex-1 min-h-0 overflow-y-auto space-y-1">
              <div v-for="r in recipeList" :key="r.id" class="px-2 py-1 rounded cursor-pointer text-[11px]"
                :class="selRecipe && selRecipe.id === r.id ? 'bg-amber-400/15' : 'hover:bg-white/5'"
                @click="selectRecipe(r)">
                <div class="font-bold truncate" style="color:rgba(229,231,235,.9)">{{ r.name }}</div>
                <div class="text-[10px] truncate" style="color:rgba(148,163,184,.6)">{{ r.id }} · 失败 {{
                  Math.round((r.failRate || 0) * 100) }}% · 熟练 +{{ r.proficiencyGain }}</div>
              </div>
            </div>
            <button
              class="text-[11px] px-2 py-1 rounded bg-emerald-400/15 text-emerald-300 hover:bg-emerald-400/30 shrink-0"
              @click="addRecipe()">＋ 新增配方</button>
          </template>
          <!-- 合成图纸（左侧列表） -->
          <template v-else-if="itemMode === 'craft'">
            <div class="flex-1 min-h-0 overflow-y-auto space-y-1">
              <div v-for="b in blueprintList" :key="b.id" class="px-2 py-1 rounded cursor-pointer text-[11px]"
                :class="selBlueprint && selBlueprint.id === b.id ? 'bg-amber-400/15' : 'hover:bg-white/5'"
                @click="selectBlueprint(b)">
                <div class="font-bold truncate" style="color:rgba(229,231,235,.9)">{{ b.name }}</div>
                <div class="text-[10px] truncate" style="color:rgba(148,163,184,.6)">{{ b.id }} · {{ b.category }} · {{
                  b.craftTime }}s</div>
              </div>
            </div>
            <button
              class="text-[11px] px-2 py-1 rounded bg-emerald-400/15 text-emerald-300 hover:bg-emerald-400/30 shrink-0"
              @click="addBlueprint()">＋ 新增图纸</button>
          </template>
          <!-- 商店（左侧列表） -->
          <template v-else-if="itemMode === 'shop'">
            <div class="flex-1 min-h-0 overflow-y-auto space-y-1  pb-20vh">
              <div v-for="s in shopList" :key="s.id" class="px-2 py-1 rounded cursor-pointer text-[11px]"
                :class="selShopItem && selShopItem.id === s.id ? 'bg-amber-400/15' : 'hover:bg-white/5'"
                @click="selectShopItem(s)">
                <div class="font-bold truncate" style="color:rgba(229,231,235,.9)">{{ s.name }}</div>
                <div class="text-[10px]" style="color:rgba(148,163,184,.6)">{{ s.price }} 金币 · {{ s.limit === -1 ? '无限'
                  : '限购 ' + s.limit }}</div>
              </div>
              <div class="flex gap-1 shrink-0 mt-1.5vh!">
                <el-select v-model="shopPickItem" size="small" class="input-light flex-1!" placeholder="从物品添加…"
                  filterable clearable>
                  <el-option v-for="it in itemList" :key="it.name" :label="it.name" :value="it.name" />
                </el-select>
                <button
                  class="text-[11px] px-2 py-1 rounded bg-emerald-400/15 text-emerald-300 hover:bg-emerald-400/30 shrink-0"
                  @click="addShopItem()">＋ 新增</button>
              </div>
            </div>
          </template>
          <!-- 材料用途（左侧列表） -->
          <template v-else-if="itemMode === 'materials'">
            <div class="flex-1 min-h-0 overflow-y-auto space-y-1">
              <div v-for="m in materialUsageList" :key="m.name" class="px-2 py-1 rounded cursor-pointer text-[11px]"
                :class="selMaterial && selMaterial.name === m.name ? 'bg-amber-400/15' : 'hover:bg-white/5'"
                @click="selectMaterial(m)">
                <div class="flex items-center gap-1.5">
                  <span class="w-3 h-3 rounded-full shrink-0" :style="{ background: m.color || '#888' }"></span>
                  <span class="font-bold truncate flex-1" style="color:rgba(229,231,235,.9)">{{ m.name }}</span>
                  <span class="text-[10px] shrink-0" style="color:rgba(148,163,184,.7)">{{ m.usedBy.length }} 配方 · {{
                    m.numTotal }} 个</span>
                </div>
                <div class="text-[10px] truncate" style="padding-left:18px;color:rgba(148,163,184,.6)">{{ matDescOf(m)
                  }}</div>
              </div>
            </div>
            <div class="text-[10px] shrink-0" style="color:rgba(107,114,128,.6)">聚合「🧪 合成 + ⚗️
              炼制」全部配方的所需材料，按总需求量排序，点击查看用途。</div>
          </template>
        </div>
        <!-- 右侧：编辑表单 -->
        <div class="flex-1 min-h-0 rounded-xl p-3 overflow-y-auto"
          style="background:#141821;border:1px solid rgba(255,255,255,.08)">
          <!-- 物品表单 -->
          <template v-if="itemMode === 'items'">
            <div v-if="selItem" class="space-y-2 pb-50vh">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold" style="color:rgba(229,231,235,.85)">✏️ 编辑物品</span>
                <span class="text-[10px]" style="color:rgba(107,114,128,.7)">改名后旧条目同步迁移（售价/商店联动）</span>
                <div class="flex-1"></div>
                <button class="chip-btn danger" @click="deleteItem()">🗑 删除</button>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">名称
                  <el-input v-model="selItem.name" size="small" class="input-light" /></label>
                <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">图片（daojuall 皮肤名）
                  <el-input v-model="selItem.img" size="small" class="input-light" placeholder="如 chimei" /></label>
                <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">颜色
                  <el-color-picker v-model="selItem.color" size="small" /></label>
                <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">分类
                  <el-select v-model="selItem.type" size="small">
                    <el-option v-for="t in ITEM_TYPES.slice(1)" :key="t.value" :label="t.label" :value="t.value" />
                  </el-select></label>
                <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">售价（留空=自动：商店半价或材料2金币）
                  <el-input v-model="selItem.sellPrice" size="small" class="input-light" placeholder="留空=自动" /></label>
                <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">购买价（仅商店有售时生效，留空=不改）
                  <el-input v-model="selItem.buyPrice" size="small" class="input-light" placeholder="留空=不改" /></label>
                <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">特殊效果（special）
                  <el-input v-model="selItem.special" size="small" class="input-light"
                    placeholder="如 expGain / talentPoint" /></label>
                <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">来源（source）
                  <el-input v-model="selItem.source" size="small" class="input-light" placeholder="获取途径说明" /></label>
              </div>
              <div class="flex items-center gap-3 flex-wrap">
                <el-checkbox v-model="selItem.food" size="small">食物</el-checkbox>
                <el-checkbox v-model="selItem.shiyong" size="small">可食用/使用</el-checkbox>
                <el-checkbox v-model="selItem.isItem" size="small">道具</el-checkbox>
                <el-checkbox v-model="selItem.isSpecial" size="small">特殊</el-checkbox>
                <el-checkbox v-model="selItem.isGachaItem" size="small">抽卡资源</el-checkbox>
                <el-checkbox v-model="selItem.giveNpc" size="small">可赠送NPC</el-checkbox>
              </div>
              <div class="grid grid-cols-3 gap-2 pt-1 border-t" style="border-color:rgba(255,255,255,.08)">
                <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">回复生命（Hp）
                  <el-input v-model="selItem.Hp" size="small" class="input-light" placeholder="如 20" /></label>
                <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">回复魔力（moli）
                  <el-input v-model="selItem.moli" size="small" class="input-light" placeholder="如 10" /></label>
                <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">效果数值（effectValue）
                  <el-input v-model="selItem.effectValue" size="small" class="input-light"
                    placeholder="百分比用整数，如 25=25%" /></label>
                <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">使用上限（maxUses）
                  <el-input v-model="selItem.maxUses" size="small" class="input-light" placeholder="如 30" /></label>
                <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">叠加上限（maxTotal）
                  <el-input v-model="selItem.maxTotal" size="small" class="input-light"
                    placeholder="如 90 = 90%" /></label>
                <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">食用经验（eatExp，魔晶用）
                  <el-input v-model="selItem.eatExp" size="small" class="input-light" placeholder="如 10" /></label>
                <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">投喂经验（feedExp，魔晶用）
                  <el-input v-model="selItem.feedExp" size="small" class="input-light" placeholder="如 25" /></label>
                <label class="text-[11px] flex flex-col gap-0.5"
                  style="color:rgba(156,163,175,.9)">突破加成（btBoost，突破材料用，各阶段整数%）
                  <el-input v-model="selItem.btBoostText" size="small" class="input-light"
                    placeholder='如 {"1":20,"2":15,"3":10}' /></label>
                <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">装备加成 buffs（JSON）
                  <el-input v-model="selItem.buffsText" size="small" class="input-light"
                    placeholder='如 {"attack":10,"luck":15}' /></label>
              </div>
              <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">描述模板（miaoshu，支持 ${字段}
                运行时渲染）
                <el-input v-model="selItem.miaoshu" type="textarea" :rows="3" class="input-light" />
                <div class="text-[10px]" style="color:rgba(148,163,184,.6)">可用占位：${Hp} ${moli} ${effectValue} ${maxUses}
                  ${maxTotal} ${buffs.attack} ${buffs.armor} ${buffs.speed} ${buffs.luck} ${buffs.expPct}；修改数值后描述自动同步。
                </div>
                <button class="chip-btn" style="align-self:flex-start" @click="genItemDescTemplate()">✨
                  按效果生成描述模板</button>
              </label>
            </div>
            <div v-else class="h-full flex items-center justify-center text-[12px]" style="color:rgba(107,114,128,.6)">←
              点击左侧物品编辑</div>
          </template>
          <!-- 配方表单 -->
          <template v-else-if="itemMode === 'lianzhi'">
            <div v-if="selRecipe" class="space-y-2">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold" style="color:rgba(229,231,235,.85)">⚗️ 编辑炼制配方</span>
                <div class="flex-1"></div>
                <button class="chip-btn danger" @click="deleteRecipe()">🗑 删除</button>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">ID（唯一标识）
                  <el-input v-model="selRecipe.id" size="small" class="input-light" /></label>
                <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">名称
                  <el-input v-model="selRecipe.name" size="small" class="input-light" /></label>
                <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">材料（逗号分隔）
                  <el-input v-model="selRecipe.materialsText" size="small" class="input-light"
                    placeholder="魔力灵液,幽冥花蕊" /></label>
                <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">颜色
                  <el-color-picker v-model="selRecipe.color" size="small" /></label>
                <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">基础失败率（0~1）
                  <el-input-number v-model="selRecipe.failRate" :min="0" :max="1" :step="0.05" size="small"
                    controls-position="right" class="item-num" /></label>
                <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">每次成功熟练度
                  <el-input-number v-model="selRecipe.proficiencyGain" :min="1" :max="999" size="small"
                    controls-position="right" class="item-num" /></label>
              </div>
              <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">说明（desc）
                <el-input v-model="selRecipe.desc" type="textarea" :rows="2" class="input-light" /></label>
              <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">产出（每行：几率|产出名|数量，如
                0.5|生命灵药|1）
                <el-input v-model="selRecipe.resultsText" type="textarea" :rows="3" class="input-light" /></label>
              <div class="text-[10px]" style="color:rgba(107,114,128,.6)">提示：每级熟练度需求与失败率减免在左侧「炼制等级」表逐级配置；达到最大等级后熟练度溢出丢弃。
              </div>
            </div>
            <div v-else class="h-full flex items-center justify-center text-[12px]" style="color:rgba(107,114,128,.6)">←
              点击左侧配方编辑</div>
          </template>
          <!-- 图纸表单 -->
          <template v-else-if="itemMode === 'craft'">
            <div v-if="selBlueprint" class="space-y-2">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold" style="color:rgba(229,231,235,.85)">🧪 编辑合成图纸</span>
                <div class="flex-1"></div>
                <button class="chip-btn danger" @click="deleteBlueprint()">🗑 删除</button>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">ID
                  <el-input v-model="selBlueprint.id" size="small" class="input-light" /></label>
                <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">名称
                  <el-input v-model="selBlueprint.name" size="small" class="input-light" /></label>
                <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">大类（category）
                  <el-input v-model="selBlueprint.category" size="small" class="input-light"
                    placeholder="药水/永浆" /></label>
                <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">小类（subcategory）
                  <el-input v-model="selBlueprint.subcategory" size="small" class="input-light"
                    placeholder="生命恢复/增益" /></label>
                <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">制作耗时（秒）
                  <el-input-number v-model="selBlueprint.craftTime" :min="0.5" :max="120" :step="0.5" size="small"
                    controls-position="right" class="item-num" /></label>
                <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">产出名称
                  <el-input v-model="selBlueprint.outputName" size="small" class="input-light" /></label>
                <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">产出数量
                  <el-input-number v-model="selBlueprint.outputNum" :min="1" :max="999" size="small"
                    controls-position="right" class="item-num" /></label>
                <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">产出图片（皮肤名）
                  <el-input v-model="selBlueprint.outputImg" size="small" class="input-light" /></label>
                <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">产出颜色
                  <el-color-picker v-model="selBlueprint.outputColor" size="small" /></label>
              </div>
              <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">所需材料（每行：材料名,数量）
                <el-input v-model="selBlueprint.materialsText" type="textarea" :rows="3" class="input-light"
                  placeholder="赤莓,1&#10;翠息草,1" /></label>
              <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">说明（desc）
                <el-input v-model="selBlueprint.desc" type="textarea" :rows="2" class="input-light" /></label>
              <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">产出描述（miaoshu）
                <el-input v-model="selBlueprint.outputMiaoshu" type="textarea" :rows="2" class="input-light" /></label>
            </div>
            <div v-else class="h-full flex items-center justify-center text-[12px]" style="color:rgba(107,114,128,.6)">←
              点击左侧图纸编辑</div>
          </template>
          <!-- 商店表单 -->
          <template v-else-if="itemMode === 'shop'">
            <div v-if="selShopItem" class="space-y-2">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold" style="color:rgba(229,231,235,.85)">🏪 编辑商店物品</span>
                <div class="flex-1"></div>
                <button class="chip-btn danger" @click="deleteShopItem()">🗑 删除</button>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">ID
                  <el-input v-model="selShopItem.id" size="small" class="input-light" /></label>
                <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">名称
                  <el-input v-model="selShopItem.name" size="small" class="input-light" /></label>
                <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">售价（金币）
                  <el-input-number v-model="selShopItem.price" :min="0" :max="999999" size="small"
                    controls-position="right" class="item-num" /></label>
                <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">限购（-1=无限）
                  <el-input-number v-model="selShopItem.limit" :min="-1" :max="999" size="small"
                    controls-position="right" class="item-num" /></label>
                <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">图片（皮肤名）
                  <el-input v-model="selShopItem.img" size="small" class="input-light" /></label>
                <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">颜色
                  <el-color-picker v-model="selShopItem.color" size="small" /></label>
              </div>
              <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">装备加成
                buffs（JSON，可装备物品用）
                <el-input v-model="selShopItem.buffsText" size="small" class="input-light"
                  placeholder='如 {"attack":10,"armor":10,"speed":10,"expPct":15,"expBonus":0.15}' /></label>
              <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">描述（miaoshu，支持
                ${buffs.xx} 运行时渲染）
                <el-input v-model="selShopItem.miaoshu" type="textarea" :rows="3" class="input-light" /></label>
              <div class="text-[10px]" style="color:rgba(107,114,128,.6)">提示：购买后剩余为 0 即显示「已售罄」并自动下架（游戏内逻辑）。</div>
            </div>
            <div v-else class="h-full flex items-center justify-center text-[12px]" style="color:rgba(107,114,128,.6)">←
              点击左侧商品编辑</div>
          </template>
          <!-- 材料用途详情 -->
          <template v-else-if="itemMode === 'materials'">
            <div v-if="selMaterial" class="space-y-3">
              <div class="flex items-center gap-2">
                <span class="w-4 h-4 rounded-full shrink-0" :style="{ background: selMaterial.color || '#888' }"></span>
                <span class="text-xs font-bold" style="color:rgba(229,231,235,.9)">{{ selMaterial.name }}</span>
                <span v-if="selMaterial.img" class="text-[10px] px-1.5 py-0.5 rounded"
                  style="background:rgba(255,255,255,.05);color:rgba(148,163,184,.8)">皮肤 {{ selMaterial.img }}</span>
                <div class="flex-1"></div>
                <span class="text-[10px]" style="color:rgba(148,163,184,.7)">配方合计需求 {{ selMaterial.numTotal }} 个</span>
              </div>
              <div class="text-[12px] leading-relaxed rounded-lg p-3"
                style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);color:rgba(229,231,235,.9)">
                {{ matDescOf(selMaterial) }}</div>
              <div class="text-[11px] font-bold" style="color:rgba(156,163,175,.9)">用于以下配方（{{ selMaterial.usedBy.length
                }}）</div>
              <div class="space-y-1">
                <div v-for="(u, ui) in selMaterial.usedBy" :key="ui"
                  class="rounded px-2 py-1.5 space-y-1.5"
                  style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06)">
                  <div class="flex items-center gap-2 text-[11px]">
                    <span class="text-[10px] px-1.5 py-0.5 rounded shrink-0"
                      :style="u.kind === '合成' ? 'background:rgba(52,211,153,.12);color:#34d399' : 'background:rgba(167,139,250,.12);color:#a78bfa'">{{
                      u.kind }}</span>
                    <span class="font-bold flex-1 truncate" style="color:rgba(229,231,235,.9)">{{ u.name }}</span>
                    <span class="shrink-0" style="color:rgba(148,163,184,.7)">× {{ u.num }}</span>
                  </div>
                  <div class="space-y-1.5 rounded p-2" style="background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.06)">
                    <div v-for="(e, ei) in usageEffectOf(u)" :key="ei" class="text-[11px] space-y-0.5">
                      <div class="flex items-center gap-1.5">
                        <span class="text-[10px] px-1 py-0.5 rounded shrink-0" style="background:rgba(251,191,36,.12);color:#fbbf24">{{ e.chance < 1 ? '成功 ' + Math.round(e.chance * 100) + '%' : '成功' }}</span>
                        <span class="font-bold" style="color:rgba(229,231,235,.9)">{{ e.output.name }}</span>
                        <span v-if="e.output.num" class="text-[10px] shrink-0" style="color:rgba(148,163,184,.7)">×{{ e.output.num }}</span>
                      </div>
                      <div style="color:rgba(203,213,225,.85)">{{ renderItemDesc(e.output.miaoshu, e.output) }}</div>
                    </div>
                    <div v-if="!usageEffectOf(u).length" class="text-[10px]" style="color:rgba(148,163,184,.6)">该配方暂无产出配置</div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="h-full flex items-center justify-center text-[12px]" style="color:rgba(107,114,128,.6)">←
              点击左侧材料查看用途</div>
          </template>
        </div>
      </div>
    </div>
    <!-- ============ Tab 装备编辑 ============ -->
    <div v-if="curTab === 'equip'" class="h-full flex flex-col gap-2">
      <div class="flex items-center gap-2 shrink-0">
        <span class="text-xs font-bold" style="color:rgba(229,231,235,.85)">⚔️ 装备编辑</span>
        <span class="text-[10px]" style="color:rgba(107,114,128,.7)">store/configs.js · 可装备道具（isItem 非消耗品）属性 · 保存后整页重载生效</span>
        <div class="flex-1"></div>
        <el-button size="small" @click="loadItemsConfig()">加载</el-button>
        <el-button size="small" type="primary" :disabled="!itemsLoaded" @click="saveEquipConfig()">💾 保存写入</el-button>
      </div>
      <div v-if="!itemsLoaded" class="flex-1 flex items-center justify-center text-[13px]" style="color:rgba(148,163,184,.7)">
        {{ itemsLoading ? '⏳ 正在加载物品数据…' : '尚未加载，点击右上角「加载」' }}
      </div>
      <div v-else class="flex-1 min-h-0 flex gap-2">
        <!-- 左侧：装备列表 -->
        <div class="w-[22vw] shrink-0 rounded-xl p-2 flex flex-col gap-2 min-h-0 pb-30vh" style="background:#141821;border:1px solid rgba(255,255,255,.08)">
          <el-input v-model="equipKeyword" size="small" placeholder="搜索装备名/描述" class="input-light" />
          <div class="flex-1 min-h-0 overflow-y-auto space-y-1">
            <div v-for="eq in equipList" :key="eq.name"
              class="px-2 py-1 rounded cursor-pointer flex items-center gap-1.5 text-[11px]"
              :class="selEquip && selEquip.name === eq.name ? 'bg-amber-400/15' : 'hover:bg-white/5'"
              @click="selectEquip(eq)">
              <span class="w-3 h-3 rounded-full shrink-0" :style="{ background: eq.color || '#888' }"></span>
              <span class="font-bold truncate flex-1" style="color:rgba(229,231,235,.9)">{{ eq.name }}</span>
              <span class="text-[10px] shrink-0" style="color:rgba(148,163,184,.7)">装备</span>
            </div>
          </div>
          <div class="text-[10px]" style="color:rgba(107,114,128,.6)">共 {{ equipList.length }} 件可装备道具</div>
        </div>
        <!-- 右侧：编辑表单 -->
        <div class="flex-1 min-h-0 overflow-y-auto rounded-xl p-2 pb-30vh!" style="background:#141821;border:1px solid rgba(255,255,255,.08)">
          <div v-if="selEquip" class="space-y-2 pb-10vh">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold" style="color:rgba(229,231,235,.85)">✏️ 编辑装备</span>
              <span class="text-[10px]" style="color:rgba(107,114,128,.7)">改名后旧条目同步迁移（售价/商店联动）</span>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">名称
                <el-input v-model="selEquip.name" size="small" class="input-light" /></label>
              <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">图片（daojuall 皮肤名）
                <el-input v-model="selEquip.img" size="small" class="input-light" placeholder="如 jiezhi1" /></label>
              <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">颜色
                <el-color-picker v-model="selEquip.color" size="small" /></label>
            </div>
            <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">装备加成 buffs（JSON，佩戴后静态加成）
              <el-input v-model="selEquip.buffsText" type="textarea" :rows="2" class="input-light" placeholder='如 {"attack":10,"luck":15}' />
              <div class="text-[10px]" style="color:rgba(148,163,184,.6)">支持键：attack / armor / speed / luck / charm（整数点，直接加基础属性）。buffs 为空将删除加成。</div>
            </label>
            <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">战斗效果参数 fx（JSON，进入战斗后生效）
              <el-input v-model="selEquip.fxText" type="textarea" :rows="2" class="input-light" placeholder='如 {"atkPct":0.05,"hpCostPct":0.04,"boostPct":0.2}' />
              <div class="text-[10px]" style="color:rgba(148,163,184,.6)">支持字段（0.05=5%）：幽暗手套 atkPct(进场攻击%)/hpCostPct(攻击牌耗命%)/boostPct(攻击牌增伤%)；怒焰斗篷 fireDmgPct；雷电勋章 basePct/speedScale(每速度点系数)；精灵王冠 allAttrPct。留空 = 删除 fx（恢复代码默认值）。改 fx 后描述文案请同步。</div>
            </label>
            <label class="text-[11px] flex flex-col gap-0.5" style="color:rgba(156,163,175,.9)">描述模板（miaoshu，支持 ${字段} 运行时渲染）
              <el-input v-model="selEquip.miaoshu" type="textarea" :rows="4" class="input-light" />
              <div class="text-[10px]" style="color:rgba(148,163,184,.6)">可用占位：${buffs.attack} ${buffs.armor} ${buffs.speed} ${buffs.luck} ${buffs.charm}；战斗效果（如怒焰斗篷火伤+35%）由代码按装备名实现，改数值需改战斗代码。</div>
            </label>
          </div>
          <div v-else class="h-full flex items-center justify-center text-[12px]" style="color:rgba(107,114,128,.6)">←
            点击左侧装备编辑</div>
        </div>
      </div>
    </div>
    <div v-if="curTab === 'levelUp'" class="h-full flex flex-col gap-2">
      <div class="flex items-center gap-2 shrink-0">
        <span class="text-xs font-bold" style="color:rgba(229,231,235,.85)">⬆️ 升级编辑</span>
        <span class="text-[10px]" style="color:rgba(107,114,128,.7)">store/configs.js · LEVEL_UP_CFG · 经验公式/成长/上限/初始属性 ·
          保存后整页重载生效</span>
        <div class="flex-1"></div>
        <el-button size="small" @click="loadLevelUpConfig()">加载</el-button>
        <el-button size="small" type="primary" :disabled="!levelUpLoaded" @click="saveLevelUpConfig()">💾
          保存写入</el-button>
      </div>
      <div v-if="!levelUpLoaded" class="flex-1 flex items-center justify-center text-[13px]"
        style="color:rgba(148,163,184,.7)">
        {{ levelUpLoading ? '⏳ 正在加载升级配置…' : '尚未加载，点击右上角「加载」' }}
      </div>
      <div v-else class="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1 pb-2">
        <!-- 🏆 局外养成（META_ROLE_CFG） -->
        <div class="rounded-xl p-3 space-y-2" style="background:#141821;border:1px solid rgba(255,255,255,.08)">
          <div class="flex items-center justify-between mb-2.5">
            <span class="text-xs font-bold" style="color:#fbbf24">🏆 局外养成</span>
            <button @click="toggleSec('metaRole')"
              class="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-amber-400/30 text-gray-300">{{
                secCollapsed.metaRole ? '展开' : '收起' }}</button>
          </div>
          <div class="space-y-2" v-show="!secCollapsed.metaRole">
            <div class="flex items-center gap-3 flex-wrap">
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">局外等级上限 maxLevel
                <el-input-number v-model="metaRoleCfg.maxLevel" :min="1" :max="999" size="small"
                  controls-position="right" class="item-num" style="width:90px" /></label>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">初始所需经验 expBase
                <el-input-number v-model="metaRoleCfg.expBase" :min="1" :max="999999" size="small"
                  controls-position="right" class="item-num" style="width:104px" /></label>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">每级经验递增 expStep
                <el-input-number v-model="metaRoleCfg.expStep" :min="0" :max="99999" :step="5" size="small"
                  controls-position="right" class="item-num" style="width:104px" /></label>
            </div>
            <div class="flex items-center gap-3 flex-wrap">
              <span class="text-[11px] font-bold" style="color:rgba(156,163,175,.9)">每级固定属性提升
                perLevelStats：</span>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">攻击
                <el-input-number v-model="metaRoleCfg.perLevelStats.attack" :min="0" :max="9999" size="small"
                  controls-position="right" class="item-num" style="width:80px" /></label>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">生命
                <el-input-number v-model="metaRoleCfg.perLevelStats.maxHp" :min="0" :max="99999" size="small"
                  controls-position="right" class="item-num" style="width:90px" /></label>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">速度
                <el-input-number v-model="metaRoleCfg.perLevelStats.speed" :min="0" :max="9999" size="small"
                  controls-position="right" class="item-num" style="width:80px" /></label>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">护甲
                <el-input-number v-model="metaRoleCfg.perLevelStats.armor" :min="0" :max="9999" size="small"
                  controls-position="right" class="item-num" style="width:80px" /></label>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">魔抗
                <el-input-number v-model="metaRoleCfg.perLevelStats.magicResist" :min="0" :max="9999" size="small"
                  controls-position="right" class="item-num" style="width:80px" /></label>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">本局经验转换率
                expConversionRate
                <el-input-number v-model="metaRoleCfg.expConversionRate" :min="0" :max="1" :step="0.05" size="small"
                  controls-position="right" class="item-num" style="width:90px" />（0.2 = 20%）</label>
            </div>
            <div class="text-[10px]" style="color:rgba(107,114,128,.6)">经验公式：每级所需 = expBase + expStep ×
              (当前等级-1)；开局初始属性提升 = (等级-1) × perLevelStats（攻击/生命/速度/护甲/魔抗 各属性独立固定数值）；游戏失败返回时本局累计经验
              × expConversionRate 结算给局外角色。</div>
          </div>
        </div>
        <!-- 💎 突破编辑（BREAKTHROUGH_STAGES / BREAKTHROUGH_QUALITY_PENALTY） -->
        <div class="rounded-xl p-3 space-y-2" style="background:#141821;border:1px solid rgba(255,255,255,.08)">
          <div class="flex items-center justify-between mb-2.5">
            <span class="text-xs font-bold" style="color:#a78bfa">💎 突破编辑</span>
            <button @click="toggleSec('btBreakthrough')"
              class="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-amber-400/30 text-gray-300">{{
                secCollapsed.btBreakthrough ? '展开' : '收起' }}</button>
          </div>
          <div class="space-y-2" v-show="!secCollapsed.btBreakthrough">
            <!-- 各阶段基础概率 -->
            <div class="flex items-center gap-3 flex-wrap">
              <span class="text-[11px] font-bold" style="color:rgba(156,163,175,.9)">各阶段基础成功率：</span>
              <label v-for="(s, sk) in btState.stages" :key="sk" class="text-[11px] flex items-center gap-1"
                style="color:rgba(156,163,175,.9)">阶段{{ sk }}（Lv.{{ s.level }}）
                <el-input-number v-model="s.baseRatePct" :min="1" :max="100" :step="1" size="small"
                  controls-position="right" class="item-num" style="width:76px" />%</label>
            </div>
            <div class="text-[10px]" style="color:rgba(107,114,128,.6)">基础成功率 = 无惩罚时的突破成功率（阶段1=10级 / 阶段2=20级 /
              阶段3=30级）。</div>
            <!-- 突破后属性提升（写回 BREAKTHROUGH_STAGES.attr / talent） -->
            <div class="flex items-center gap-3 flex-wrap">
              <span class="text-[11px] font-bold" style="color:rgba(156,163,175,.9)">突破后属性提升：</span>
              <label v-for="(s, sk) in btState.stages" :key="'attr' + sk"
                class="text-[11px] flex items-center gap-1 rounded px-2 py-1"
                style="color:rgba(156,163,175,.9);background:rgba(167,139,250,.06);border:1px solid rgba(167,139,250,.15)">
                阶段{{ sk }} 生命
                <el-input-number v-model="s.attr.maxHp" :min="0" :max="99999" size="small"
                  controls-position="right" class="item-num" style="width:70px" />攻击
                <el-input-number v-model="s.attr.attack" :min="0" :max="99999" size="small"
                  controls-position="right" class="item-num" style="width:70px" />护甲
                <el-input-number v-model="s.attr.armor" :min="0" :max="99999" size="small"
                  controls-position="right" class="item-num" style="width:70px" />速度
                <el-input-number v-model="s.attr.speed" :min="0" :max="99999" size="small"
                  controls-position="right" class="item-num" style="width:70px" />
              </label>
            </div>
            <div class="text-[10px]" style="color:rgba(107,114,128,.6)">突破后属性提升 = 基础值 × 魔晶品质倍率（向下取整），随「保存写入」一并写回
              BREAKTHROUGH_STAGES。</div>
            <div class="text-[10px]" style="color:rgba(167,139,250,.85)">💎 突破天赋点固定公式：品质1 得 5 点，品质每 +1 额外 +2 点（品质2=7、
              3=9、4=11、5=13、6=15、7=17），不受阶段与品质倍率影响。</div>
            <!-- 各品质属性倍率（BREAKTHROUGH_QUALITY_BONUS 全局一份，不含天赋点） -->
            <div class="flex items-center gap-3 flex-wrap">
              <span class="text-[11px] font-bold" style="color:rgba(156,163,175,.9)">各品质属性倍率：</span>
              <label v-for="q in 7" :key="q" class="text-[11px] flex items-center gap-1"
                style="color:rgba(156,163,175,.9)">品质{{ q }}
                <el-input-number v-model="btState.qualityBonus[q]" :min="0.1" :max="20" :step="0.1" size="small"
                  controls-position="right" class="item-num" style="width:66px" />
              </label>
            </div>
            <div class="text-[10px]" style="color:rgba(107,114,128,.6)">各品质属性倍率 = 突破后属性提升 = 阶段属性 × 品质倍率（向下取整），全局一份，
              所有突破阶段通用（一破也能用品质7），不含天赋点（天赋点固定公式：品质1=5、每+1品质+2）。</div>
            <!-- 各品质魔晶成功率惩罚 -->
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-[11px] font-bold" style="color:rgba(156,163,175,.9)">各品质魔晶成功率惩罚：</span>
              <label v-for="(p, q) in btState.penalties" :key="q" class="text-[11px] flex items-center gap-1"
                style="color:rgba(156,163,175,.9)">品质{{ q }}
                <el-input-number v-model="btState.penalties[q]" :min="0" :max="90" :step="1" size="small"
                  controls-position="right" class="item-num" style="width:66px" />%</label>
            </div>
            <div class="text-[10px]" style="color:rgba(107,114,128,.6)">品质惩罚：实际成功率 = 基础率 × (1 − 惩罚%)。品质越高惩罚越大（成功率越低），
              品质 1 无惩罚。</div>
            <!-- 失败补偿 -->
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-[11px] font-bold" style="color:rgba(156,163,175,.9)">失败后成功率补偿：</span>
              <label v-for="(c, q) in btState.compensation" :key="q" class="text-[11px] flex items-center gap-1"
                style="color:rgba(156,163,175,.9)">品质{{ q }}
                <el-input-number v-model="btState.compensation[q]" :min="0" :max="100" :step="1" size="small"
                  controls-position="right" class="item-num" style="width:66px" />%</label>
              <label class="text-[11px] flex items-center gap-1 ml-2" style="color:rgba(156,163,175,.9)">累计上限
                <el-input-number v-model="btState.compCap" :min="0" :max="100" :step="1" size="small"
                  controls-position="right" class="item-num" style="width:66px" />%</label>
            </div>
            <div class="text-[10px]" style="color:rgba(107,114,128,.6)">失败补偿：用该品质魔晶突破失败后，下次突破成功率额外 +对应%（按突破阶段独立累计，
              成功清零），最高不超过累计上限。例：品质1 失败 +2%、上限 +25%。</div>
            <!-- 实时预览表 -->
            <div class="rounded-lg overflow-hidden" style="border:1px solid rgba(255,255,255,.08)">
              <table class="w-full text-[10px]">
                <thead>
                  <tr style="background:rgba(255,255,255,.05);color:rgba(156,163,175,.85)">
                    <th class="px-2 py-1 text-left font-medium">魔晶品质</th>
                    <th class="px-2 py-1 text-center font-medium">阶段1 成功率</th>
                    <th class="px-2 py-1 text-center font-medium">阶段2 成功率</th>
                    <th class="px-2 py-1 text-center font-medium">阶段3 成功率</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="q in 7" :key="q" style="border-top:1px solid rgba(255,255,255,.05)">
                    <td class="px-2 py-1" style="color:rgba(229,231,235,.85)">品质 {{ q }}<span class="text-white/30">（{{
                        btQualityName(q) }}）</span></td>
                    <td class="px-2 py-1 text-center font-bold"
                      :style="{ color: btRateColor(btPreview(1, q)) }">{{ btPreview(1, q) }}%</td>
                    <td class="px-2 py-1 text-center font-bold"
                      :style="{ color: btRateColor(btPreview(2, q)) }">{{ btPreview(2, q) }}%</td>
                    <td class="px-2 py-1 text-center font-bold"
                      :style="{ color: btRateColor(btPreview(3, q)) }">{{ btPreview(3, q) }}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <!-- 🧮 成功率预览（按游戏公式实时计算） -->
            <div class="rounded-lg p-2.5 space-y-2" style="background:rgba(167,139,250,.07);border:1px solid rgba(167,139,250,.22)">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-[11px] font-bold" style="color:#a78bfa">🧮 成功率预览</span>
                <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">突破阶段
                  <el-input-number v-model="btState.previewStage" :min="1" :max="3" size="small"
                    controls-position="right" class="item-num" style="width:64px" /></label>
                <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">魔晶品质
                  <el-input-number v-model="btState.previewQuality" :min="1" :max="7" size="small"
                    controls-position="right" class="item-num" style="width:64px" /></label>
                <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">已失败次数
                  <el-input-number v-model="btState.previewFails" :min="0" :max="20" size="small"
                    controls-position="right" class="item-num" style="width:64px" /></label>
              </div>
              <template v-if="btCalcPreview()">
                <div class="flex items-center gap-2 flex-wrap text-[11px]"
                  style="color:rgba(203,213,225,.85)">
                  <span>基础成功率 <b style="color:#e2e8f0">{{ btCalcPreview().basePct }}%</b></span>
                  <span style="color:rgba(148,163,184,.6)">→</span>
                  <span>品质惩罚后 <b style="color:#e2e8f0">{{ btCalcPreview().penalized }}%</b></span>
                  <span v-if="btCalcPreview().compPct > 0" style="color:rgba(148,163,184,.6)">→</span>
                  <span v-if="btCalcPreview().compPct > 0">失败补偿 <b style="color:#34d399">+{{ btCalcPreview().compPct }}%</b></span>
                  <span style="color:rgba(148,163,184,.6)">→</span>
                  <span class="text-[13px] font-bold"
                    :style="{ color: btRateColor(btCalcPreview().finalPct) }">最终成功率
                    {{ btCalcPreview().finalPct }}%</span>
                </div>
                <div class="text-[10px]" style="color:rgba(148,163,184,.6)">公式：基础率 × (1 − 品质惩罚%) + min(失败次数 × 该品质补偿,
                  累计上限)，下限 5%、上限 100%。阶段{{ btState.previewStage }}（Lv.{{ btCalcPreview().level }}）。
                </div>
              </template>
            </div>
            <div class="text-[10px]" style="color:rgba(107,114,128,.6)">保存升级配置时连同突破配置一并写入
              BREAKTHROUGH_STAGES / BREAKTHROUGH_QUALITY_PENALTY。</div>
          </div>
        </div>
        <!-- 🧙 玩家 -->
        <div class="rounded-xl p-3 space-y-2" style="background:#141821;border:1px solid rgba(255,255,255,.08)">
          <div class="flex items-center justify-between mb-2.5">
            <span class="text-xs font-bold" style="color:#fbbf24">🧙 玩家</span>
            <button @click="toggleSec('levelUpPlayer')"
              class="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-amber-400/30 text-gray-300">{{
                secCollapsed.levelUpPlayer ? '展开' : '收起' }}</button>
          </div>
          <div class="space-y-2" v-show="!secCollapsed.levelUpPlayer">
            <div class="flex items-center gap-3 flex-wrap">
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">最大等级
                <el-input-number v-model="levelUpCfg.player.maxLevel" :min="1" :max="999" size="small"
                  controls-position="right" class="item-num" style="width:90px" /></label>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">初始所需经验 expBase
                <el-input-number v-model="levelUpCfg.player.expBase" :min="1" :max="999999" size="small"
                  controls-position="right" class="item-num" style="width:104px" /></label>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">每级经验递增 expStep
                <el-input-number v-model="levelUpCfg.player.expStep" :min="1" :max="99999" :step="5" size="small"
                  controls-position="right" class="item-num" style="width:104px" /></label>
            </div>
            <div class="text-[10px]" style="color:rgba(107,114,128,.6)">经验公式：每级所需 = expBase + expStep ×
              (当前等级-1)（线性递增）。
            </div>
            <div class="flex items-center gap-3 flex-wrap">
              <span class="text-[11px] font-bold" style="color:rgba(156,163,175,.9)">新游戏初始自由属性点：</span>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">点数
                <el-input-number v-model="levelUpCfg.player.freeAttrPointsStart" :min="0" :max="9999" size="small"
                  controls-position="right" class="item-num" style="width:90px" /></label>
              <span class="text-[11px] font-bold" style="color:rgba(156,163,175,.9)">新游戏初始天赋点：</span>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">点数
                <el-input-number v-model="levelUpCfg.player.initialTalentPoints" :min="0" :max="9999" size="small"
                  controls-position="right" class="item-num" style="width:90px" /></label>
            </div>
            <div class="flex items-center gap-3 flex-wrap">
              <span class="text-[11px] font-bold" style="color:rgba(156,163,175,.9)">每级成长：</span>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">自由属性点
                <el-input-number v-model="levelUpCfg.player.freeAttrPerLevel" :min="0" :max="9999" size="small"
                  controls-position="right" class="item-num" style="width:90px" /></label>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">天赋点
                <el-input-number v-model="levelUpCfg.player.talentPerLevel" :min="0" :max="9999" size="small"
                  controls-position="right" class="item-num" style="width:90px" /></label>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">基础攻击力
                <el-input-number v-model="levelUpCfg.player.attackPerLevel" :min="0" :max="999" size="small"
                  controls-position="right" class="item-num" style="width:90px" /></label>
            </div>
            <div class="text-[10px]" style="color:rgba(107,114,128,.6)">每级成长 = 玩家每升 1 级获得的奖励（自由属性点可分配 力量/智慧/元素精通；天赋点默认 0
              不增长；基础攻击力加到基础攻击上，读档按等级差额补发）。</div>
            <div class="flex items-center gap-3 flex-wrap">
              <span class="text-[11px] font-bold" style="color:rgba(156,163,175,.9)">初始属性：</span>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">生命
                <el-input-number v-model="levelUpCfg.player.base.maxHp" :min="1" :max="999999" size="small"
                  controls-position="right" class="item-num" style="width:90px" /></label>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">攻击
                <el-input-number v-model="levelUpCfg.player.base.attack" :min="1" :max="99999" size="small"
                  controls-position="right" class="item-num" style="width:90px" /></label>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">护甲
                <el-input-number v-model="levelUpCfg.player.base.armor" :min="0" :max="99999" size="small"
                  controls-position="right" class="item-num" style="width:90px" /></label>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">速度
                <el-input-number v-model="levelUpCfg.player.base.speed" :min="1" :max="99999" size="small"
                  controls-position="right" class="item-num" style="width:90px" /></label>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">幸运
                <el-input-number v-model="levelUpCfg.player.base.luck" :min="0" :max="999" size="small"
                  controls-position="right" class="item-num" style="width:90px" /></label>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">力量
                <el-input-number v-model="levelUpCfg.player.base.strength" :min="0" :max="99999" size="small"
                  controls-position="right" class="item-num" style="width:90px" /></label>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">智慧
                <el-input-number v-model="levelUpCfg.player.base.intelligence" :min="0" :max="99999" size="small"
                  controls-position="right" class="item-num" style="width:90px" /></label>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">元素精通
                <el-input-number v-model="levelUpCfg.player.base.elementMastery" :min="0" :max="99999" size="small"
                  controls-position="right" class="item-num" style="width:90px" /></label>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">魅力
                <el-input-number v-model="levelUpCfg.player.base.charm" :min="0" :max="99999" size="small"
                  controls-position="right" class="item-num" style="width:90px" /></label>
            </div>
            <div class="text-[10px]" style="color:rgba(107,114,128,.6)">初始属性 = 新游戏时的基础属性；升级不再自动成长，改为每升 1 级获得
              自由属性点（数量见「每级成长」，个人信息面板分配）。</div>
          </div>
        </div>
        <!-- 💪 自由属性系数 -->
        <div class="rounded-xl p-3 space-y-2" style="background:#141821;border:1px solid rgba(255,255,255,.08)">
          <div class="flex items-center justify-between mb-2.5">
            <span class="text-xs font-bold" style="color:#fbbf24">💪 自由属性系数（每点属性对应的加成）</span>
            <button @click="toggleSec('levelUpAttr')"
              class="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-amber-400/30 text-gray-300">{{
                secCollapsed.levelUpAttr ? '展开' : '收起' }}</button>
          </div>
          <div class="space-y-2" v-show="!secCollapsed.levelUpAttr">
            <div class="text-[10px]" style="color:rgba(107,114,128,.6)">专精定位：力量/智慧/元素精通 每 1 点 = 等价攻击力（按当前攻击力折算，填 2 =
              该系伤害是攻击力的 2 倍），仅作用于对应伤害类型；攻击力全系通用但单系不如专精。生命为整数；魅力为好感百分比（1 = 1%）。保存写入后读档自动生效。</div>
            <div class="flex items-center gap-3 flex-wrap">
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">💪 力量·物理攻击等价
                <el-input-number v-model="levelUpCfg.attrRates.strengthPhysDmg" :min="0" :max="999" :step="0.5"
                  size="small" controls-position="right" class="item-num" style="width:100px" /></label>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">💪 力量·最大生命 +
                <el-input-number v-model="levelUpCfg.attrRates.strengthHp" :min="0" :max="9999" size="small"
                  controls-position="right" class="item-num" style="width:100px" /></label>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">🧠 智慧·元素攻击等价
                <el-input-number v-model="levelUpCfg.attrRates.intelligenceEleDmg" :min="0" :max="999" :step="0.5"
                  size="small" controls-position="right" class="item-num" style="width:100px" /></label>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">✨ 精通·反应攻击等价
                <el-input-number v-model="levelUpCfg.attrRates.elementMasteryReactDmg" :min="0" :max="999" :step="0.5"
                  size="small" controls-position="right" class="item-num" style="width:100px" /></label>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">🧠 智慧·附加精通
                <el-input-number v-model="levelUpCfg.attrRates.intelligenceMastery" :min="0" :max="99" :step="0.1"
                  size="small" controls-position="right" class="item-num" style="width:100px" /></label>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">⚔️ 物理基础暴击率 %
                <el-input-number v-model="levelUpCfg.attrRates.baseCritRate" :min="0" :max="100" :step="1" size="small"
                  controls-position="right" class="item-num" style="width:100px" /></label>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">🍀 幸运·暴击率上限 %
                <el-input-number v-model="levelUpCfg.attrRates.luckCritRate" :min="0" :max="100" :step="1" size="small"
                  controls-position="right" class="item-num" style="width:100px" /></label>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">🍀 幸运·暴伤上限 %
                <el-input-number v-model="levelUpCfg.attrRates.luckCritDmg" :min="0" :max="200" :step="1" size="small"
                  controls-position="right" class="item-num" style="width:100px" /></label>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">🍀 幸运·掉落上限 %
                <el-input-number v-model="levelUpCfg.attrRates.luckDrop" :min="0" :max="100" :step="1" size="small"
                  controls-position="right" class="item-num" style="width:100px" /></label>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">💖 魅力·好感获取 %
                <el-input-number v-model="levelUpCfg.attrRates.charmAffection" :min="0" :max="999" :step="0.5"
                  size="small" controls-position="right" class="item-num" style="width:100px" /></label>
            </div>
          </div>
        </div>
        <!-- 🧪 元素反应 -->
        <div class="rounded-xl p-3 space-y-2" style="background:#141821;border:1px solid rgba(255,255,255,.08)">
          <div class="flex items-center justify-between mb-2.5">
            <span class="text-xs font-bold" style="color:#fbbf24">🧪 元素反应（固定伤害）</span>
            <button @click="toggleSec('levelUpReaction')"
              class="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-amber-400/30 text-gray-300">{{
                secCollapsed.levelUpReaction ? '展开' : '收起' }}</button>
          </div>
          <div class="space-y-2" v-show="!secCollapsed.levelUpReaction">
            <div class="text-[11px]" style="color:rgba(156,163,175,.7)">触发对应元素组合时，造成固定伤害 = 基础值 + 每级成长 ×（等级-1）（不吃攻击力倍率；元素精通/反应增伤等乘区仍叠加）</div>
            <div class="grid grid-cols-2 gap-2">
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">❄️💧 冻结（霜冻+湿润）
                <el-input-number v-model="levelUpCfg.elementReaction.freezeBase" :min="0" :max="9999" :step="1" size="small"
                  controls-position="right" class="item-num" style="width:88px" />
                <span class="text-[10px] shrink-0" style="color:rgba(107,114,128,.7)">每级+</span>
                <el-input-number v-model="levelUpCfg.elementReaction.freezePerLv" :min="0" :max="999" :step="1" size="small"
                  controls-position="right" class="item-num" style="width:88px" /></label>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">❄️ 冻结概率（基础，吃幸运）
                <el-input-number v-model="levelUpCfg.elementReaction.freezeChance" :min="0" :max="1" :step="0.01" size="small"
                  controls-position="right" class="item-num" style="width:100px" /></label>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">💧🔥 蒸发（湿润+灼烧）
                <el-input-number v-model="levelUpCfg.elementReaction.vaporizeBase" :min="0" :max="9999" :step="1" size="small"
                  controls-position="right" class="item-num" style="width:88px" />
                <span class="text-[10px] shrink-0" style="color:rgba(107,114,128,.7)">每级+</span>
                <el-input-number v-model="levelUpCfg.elementReaction.vaporizePerLv" :min="0" :max="999" :step="1" size="small"
                  controls-position="right" class="item-num" style="width:88px" /></label>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">❄️🔥 融化（霜冻+灼烧）
                <el-input-number v-model="levelUpCfg.elementReaction.meltBase" :min="0" :max="9999" :step="1" size="small"
                  controls-position="right" class="item-num" style="width:70px" />
                <span class="text-[10px] shrink-0" style="color:rgba(107,114,128,.7)">每级+</span>
                <el-input-number v-model="levelUpCfg.elementReaction.meltPerLv" :min="0" :max="999" :step="1" size="small"
                  controls-position="right" class="item-num" style="width:70px" />
                <span class="text-[10px] shrink-0" style="color:rgba(107,114,128,.7)">降甲</span>
                <el-input-number v-model="levelUpCfg.elementReaction.meltArmorReduce" :min="0" :max="1" :step="0.01" size="small"
                  controls-position="right" class="item-num" style="width:70px" /></label>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">💧⚡ 感电（湿润+电流）
                <el-input-number v-model="levelUpCfg.elementReaction.electrochargeBase" :min="0" :max="9999" :step="1" size="small"
                  controls-position="right" class="item-num" style="width:70px" />
                <span class="text-[10px] shrink-0" style="color:rgba(107,114,128,.7)">每级+</span>
                <el-input-number v-model="levelUpCfg.elementReaction.electrochargePerLv" :min="0" :max="999" :step="1" size="small"
                  controls-position="right" class="item-num" style="width:70px" />
                <span class="text-[10px] shrink-0" style="color:rgba(107,114,128,.7)">行动条↓</span>
                <el-input-number v-model="levelUpCfg.elementReaction.electrochargeActionDrop" :min="0" :max="1" :step="0.01" size="small"
                  controls-position="right" class="item-num" style="width:70px" /></label>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">❄️⚡ 超导（霜冻+电流）
                <el-input-number v-model="levelUpCfg.elementReaction.superconductBase" :min="0" :max="9999" :step="1" size="small"
                  controls-position="right" class="item-num" style="width:70px" />
                <span class="text-[10px] shrink-0" style="color:rgba(107,114,128,.7)">每级+</span>
                <el-input-number v-model="levelUpCfg.elementReaction.superconductPerLv" :min="0" :max="999" :step="1" size="small"
                  controls-position="right" class="item-num" style="width:70px" />
                <span class="text-[10px] shrink-0" style="color:rgba(107,114,128,.7)">物伤↑</span>
                <el-input-number v-model="levelUpCfg.elementReaction.superconductPhysUp" :min="0" :max="1" :step="0.01" size="small"
                  controls-position="right" class="item-num" style="width:70px" /></label>
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">🔥⚡ 爆燃（灼烧+电流）
                <el-input-number v-model="levelUpCfg.elementReaction.overloadBase" :min="0" :max="9999" :step="1" size="small"
                  controls-position="right" class="item-num" style="width:88px" />
                <span class="text-[10px] shrink-0" style="color:rgba(107,114,128,.7)">每级+</span>
                <el-input-number v-model="levelUpCfg.elementReaction.overloadPerLv" :min="0" :max="999" :step="1" size="small"
                  controls-position="right" class="item-num" style="width:88px" /></label>
            </div>
          </div>
        </div>
        <!-- 🤝 NPC -->
        <div class="rounded-xl p-3 space-y-2" style="background:#141821;border:1px solid rgba(255,255,255,.08)">
          <div class="flex items-center justify-between mb-2.5">
            <span class="text-xs font-bold" style="color:#fbbf24">🤝 NPC（同伴）</span>
            <button @click="toggleSec('levelUpAlly')"
              class="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-amber-400/30 text-gray-300">{{
                secCollapsed.levelUpAlly ? '展开' : '收起' }}</button>
          </div>
          <div class="space-y-2" v-show="!secCollapsed.levelUpAlly">
            <div class="flex items-center gap-3 flex-wrap">
              <label class="text-[11px] flex items-center gap-1" style="color:rgba(156,163,175,.9)">最大等级
                <el-input-number v-model="levelUpCfg.ally.maxLevel" :min="1" :max="999" size="small"
                  controls-position="right" class="item-num" style="width:90px" /></label>
            </div>
            <div class="text-[11px] font-bold" style="color:rgba(156,163,175,.9)">各 NPC 经验配置（初始所需经验 expBase / 每级经验系数
              expMult，每个角色独立）：</div>
            <div class="grid grid-cols-2 gap-2">
              <div v-for="(eb, role) in levelUpCfg.ally.expBase" :key="role" class="flex items-center gap-1.5">
                <span class="text-[11px] font-bold w-14 shrink-0" style="color:rgba(229,231,235,.85)">{{ role }}</span>
                <label class="text-[10px] flex items-center gap-0.5" style="color:rgba(156,163,175,.9)">expBase
                  <el-input-number v-model="levelUpCfg.ally.expBase[role]" :min="1" :max="999999" size="small"
                    controls-position="right" class="item-num" style="width:88px" /></label>
                <label class="text-[10px] flex items-center gap-0.5" style="color:rgba(156,163,175,.9)">expMult
                  <el-input-number v-model="levelUpCfg.ally.expMult[role]" :min="1.01" :max="10" :step="0.05"
                    size="small" controls-position="right" class="item-num" style="width:88px" /></label>
              </div>
            </div>
            <div class="text-[11px] font-bold" style="color:rgba(156,163,175,.9)">各 NPC 每级成长（攻击 / 速度，每个角色独立）：</div>
            <div class="grid grid-cols-2 gap-2">
              <div v-for="(g, role) in levelUpCfg.ally.growth" :key="role" class="flex items-center gap-1.5">
                <span class="text-[11px] font-bold w-14 shrink-0" style="color:rgba(229,231,235,.85)">{{ role }}</span>
                <label class="text-[10px] flex items-center gap-0.5" style="color:rgba(156,163,175,.9)">攻击
                  <el-input-number v-model="g.attack" :min="0" :max="9999" size="small" controls-position="right"
                    class="item-num" style="width:84px" /></label>
                <label class="text-[10px] flex items-center gap-0.5" style="color:rgba(156,163,175,.9)">速度
                  <el-input-number v-model="g.speed" :min="0" :max="9999" size="small" controls-position="right"
                    class="item-num" style="width:84px" /></label>
              </div>
            </div>
            <div class="text-[11px] font-bold" style="color:rgba(156,163,175,.9)">各 NPC 初始属性（基础攻击 / 基础速度）：</div>
            <div class="grid grid-cols-2 gap-2">
              <div v-for="(b, role) in levelUpCfg.ally.base" :key="role" class="flex items-center gap-1.5">
                <span class="text-[11px] font-bold w-14 shrink-0" style="color:rgba(229,231,235,.85)">{{ role }}</span>
                <label class="text-[10px] flex items-center gap-0.5" style="color:rgba(156,163,175,.9)">攻击
                  <el-input-number v-model="b.attack" :min="1" :max="99999" size="small" controls-position="right"
                    class="item-num" style="width:84px" /></label>
                <label class="text-[10px] flex items-center gap-0.5" style="color:rgba(156,163,175,.9)">速度
                  <el-input-number v-model="b.speed" :min="1" :max="99999" size="small" controls-position="right"
                    class="item-num" style="width:84px" /></label>
              </div>
            </div>
          </div>
        </div>
        <!-- 🎒 初始背包（DEFAULT_inventory，新游戏发放） -->
        <div class="rounded-xl p-3 space-y-2 pb-25vh" style="background:#141821;border:1px solid rgba(255,255,255,.08)">
          <div class="flex items-center justify-between mb-2.5">
            <span class="text-xs font-bold" style="color:#fbbf24">🎒 初始背包（新游戏发放）</span>
            <button @click="toggleSec('levelUpInv')"
              class="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-amber-400/30 text-gray-300">{{
                secCollapsed.levelUpInv ? '展开' : '收起' }}</button>
          </div>
          <div class="space-y-2" v-show="!secCollapsed.levelUpInv">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-[10px]" style="color:rgba(107,114,128,.7)">DEFAULT_inventory · 新增/删除/编辑数量 ·
                保存后新游戏生效</span>
              <div class="flex-1"></div>
              <el-button size="small" @click="loadInitInv()">加载</el-button>
              <el-button size="small" type="primary" :disabled="!initInvLoaded" @click="saveInitInventory()">💾
                保存背包</el-button>
            </div>
            <div v-if="!initInvLoaded" class="text-[11px]" style="color:rgba(148,163,184,.6)">
              {{ initInvLoading ? '⏳ 正在加载初始背包…' : '点击「加载」读取当前初始背包配置' }}
            </div>
            <template v-else>
              <div v-for="(row, ri) in initInvRows" :key="ri" class="flex items-center gap-2">
                <el-select v-model="row.name" filterable allow-create default-first-option size="small"
                  class="input-light" style="width:190px" placeholder="物品名（可选或手输）">
                  <el-option v-for="n in initInvOptions" :key="n" :label="n" :value="n" />
                </el-select>
                <el-input-number v-model="row.num" :min="1" :max="999999" size="small" controls-position="right"
                  class="item-num" style="width:130px" />
                <button class="chip-btn danger" @click="initInvRows.splice(ri, 1)">✕</button>
              </div>
              <div class="flex items-center gap-2">
                <el-button size="small" type="primary" plain @click="initInvRows.push({ name: '', num: 1, _raw: {} })">➕
                  新增物品</el-button>
                <span class="text-[10px]" style="color:rgba(148,163,184,.5)">共 {{ initInvRows.length }}
                  项。物品名可下拉选（已有物品）或手输（自动补图标/描述）；保存写入后需新游戏生效，旧存档保留原背包。</span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
    <div v-else-if="curTab === 'achievements'" class="h-full flex flex-col gap-2">
      <div class="flex items-center gap-2 shrink-0">
        <span class="text-xs font-bold" style="color:rgba(229,231,235,.85)">🏆 成就编辑</span>
        <span class="text-[10px]" style="color:rgba(107,114,128,.7)">store/configs.js · ACHIEVEMENT_DEFS ·
          新增/修改成就、达成条件（统计键+阈值）、奖励天赋点 / 自由属性点 · 保存后整页重载生效</span>
        <div class="flex-1"></div>
        <el-button size="small" @click="loadAchievementsConfig()">加载</el-button>
        <el-button size="small" type="primary" :disabled="!achLoaded" @click="saveAchievementsConfig()">💾
          保存写入</el-button>
      </div>
      <div v-if="!achLoaded" class="flex-1 flex items-center justify-center text-[13px]"
        style="color:rgba(148,163,184,.7)">
        {{ achLoading ? '⏳ 正在加载成就数据…' : '尚未加载，点击右上角「加载」' }}
      </div>
      <div v-else class="flex-1 min-h-0 flex gap-2">
        <!-- 左：成就列表 -->
        <div class="w-[22vw] shrink-0 rounded-xl p-2 flex flex-col gap-2 min-h-0"
          style="background:#141821;border:1px solid rgba(255,255,255,.08)">
          <div class="flex items-center gap-1 shrink-0">
            <el-input v-model="achKeyword" size="small" placeholder="搜索成就" class="input-light flex-1" />
            <el-button size="small" type="primary" @click="addAchievementDef()">➕ 新增</el-button>
          </div>
          <div class="flex-1 min-h-0 overflow-y-auto space-y-1 pb-10vh">
            <div v-for="a in achList" :key="a.key" class="px-2 py-1.5 rounded cursor-pointer"
              :class="selAchKey === a.key ? 'bg-amber-400/15' : 'hover:bg-white/5'" @click="selAchKey = a.key">
              <div class="text-[12px] font-bold" style="color:#fbbf24">{{ a.name || a.key }}</div>
              <div class="text-[10px] truncate" style="color:rgba(148,163,184,.6)">{{ a.desc }}</div>
              <div class="text-[9px] mt-0.5" style="color:rgba(107,114,128,.6)">奖励 {{ a.talentReward }} 天赋点{{ a.attrReward ?
                ' · ' + a.attrReward + ' 属性点' : '' }} · {{ a.stat ? a.stat + ' ≥ ' + a.condition : '手动触发' }}</div>
            </div>
          </div>
        </div>
        <!-- 右：编辑表单 -->
        <div class="flex-1 rounded-xl p-3 flex flex-col gap-2.5 overflow-y-auto min-h-0"
          style="background:#141821;border:1px solid rgba(255,255,255,.08)">
          <template v-if="selAch">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold w-24 shrink-0" style="color:rgba(156,163,175,.9)">内部ID</span>
              <el-input v-model="selAch.key" size="small" class="input-light flex-1!" style="font-weight:700" />
              <span class="text-[10px] shrink-0" style="color:rgba(148,163,184,.6)">游戏逻辑引用用，改名会断关联</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold w-24 shrink-0" style="color:rgba(156,163,175,.9)">显示名</span>
              <el-input v-model="selAch.name" size="small" placeholder="留空=使用内部ID" class="input-light flex-1!" />
            </div>
            <div class="flex items-start gap-2">
              <span class="text-xs font-bold w-24 shrink-0 pt-1.5" style="color:rgba(156,163,175,.9)">描述</span>
              <el-input v-model="selAch.desc" type="textarea" :rows="2" size="small" class="input-light flex-1!" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold w-24 shrink-0" style="color:rgba(156,163,175,.9)">达成条件</span>
              <el-select v-model="selAch.stat" size="small" class="input-light flex-1!">
                <el-option v-for="o in ACH_STAT_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
              </el-select>
            </div>
            <div v-if="selAch.stat" class="flex items-center gap-2">
              <span class="text-xs font-bold w-24 shrink-0" style="color:rgba(156,163,175,.9)">达标阈值</span>
              <el-input-number v-model="selAch.condition" :min="1" :max="999999" size="small"
                class="input-light flex-1!" />
              <span class="text-[10px] shrink-0" style="color:rgba(148,163,184,.6)">累计达到该值自动解锁（可编辑达成条件）</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold w-24 shrink-0" style="color:rgba(156,163,175,.9)">天赋点奖励</span>
              <el-input-number v-model="selAch.talentReward" :min="0" :max="999" size="small"
                class="input-light flex-1!" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold w-24 shrink-0" style="color:rgba(156,163,175,.9)">属性点奖励</span>
              <el-input-number v-model="selAch.attrReward" :min="0" :max="999" size="small"
                class="input-light flex-1!" />
              <span class="text-[10px] shrink-0" style="color:rgba(148,163,184,.6)">达成后奖励自由属性点，可与天赋点同时奖励</span>
            </div>
            <div class="flex items-center gap-2 pt-1">
              <el-button size="small" type="danger" plain @click="delAchievementDef()">🗑 删除此成就</el-button>
              <span class="text-[10px]" style="color:rgba(148,163,184,.5)">删除后不再显示与解锁（已获得的保留）</span>
            </div>
          </template>
          <div v-else class="flex-1 flex items-center justify-center text-[12px]" style="color:rgba(107,114,128,.6)">
            点击左侧成就进行编辑</div>
        </div>
      </div>
    </div>
    <div v-else-if="curTab === 'tasks'" class="h-full flex flex-col gap-2">
      <div class="flex items-center gap-2 shrink-0">
        <span class="text-xs font-bold" style="color:rgba(229,231,235,.85)">📜 任务编辑</span>
        <span class="text-[10px]" style="color:rgba(107,114,128,.7)">store/configs.js · TASK_DEFS · 新增/编辑/删除任务、达成步骤（含目标次数）、完成奖励、隐藏显示</span>
        <div class="flex-1"></div>
        <el-button size="small" @click="loadTasksConfig()">加载</el-button>
        <el-button size="small" type="primary" :disabled="!taskLoaded" @click="saveTasksConfig()">💾 保存写入</el-button>
      </div>
      <div v-if="!taskLoaded" class="flex-1 flex items-center justify-center text-[13px]"
        style="color:rgba(148,163,184,.7)">{{ taskLoading ? '⏳ 正在加载任务数据…' : '尚未加载，点击右上角「加载」' }}</div>
      <div v-else class="flex-1 min-h-0 flex gap-2">
        <!-- 左：任务列表 -->
        <div class="w-[22vw] shrink-0 rounded-xl p-2 flex flex-col gap-2 min-h-0"
          style="background:#141821;border:1px solid rgba(255,255,255,.08)">
          <div class="flex items-center gap-1 shrink-0">
            <el-input v-model="taskKeyword" size="small" placeholder="搜索任务" class="input-light flex-1" />
            <el-button size="small" type="primary" @click="addTaskDef()">➕ 新增</el-button>
          </div>
          <div class="flex-1 min-h-0 overflow-y-auto space-y-1 pb-10vh">
            <div v-for="t in taskList" :key="t._i" class="px-2 py-1.5 rounded cursor-pointer"
              :class="selTaskIdx === t._i ? 'bg-amber-400/15' : 'hover:bg-white/5'"
              @click="selTaskIdx = t._i">
              <div class="flex items-center gap-1.5">
                <span class="text-[12px] font-bold truncate" style="color:#fbbf24">{{ t.name || ('任务#' + t.id) }}</span>
                <span class="text-[9px] px-1 rounded shrink-0"
                  :style="t.type === 'main' ? 'background:rgba(251,191,36,.15);color:#fbbf24' : 'background:rgba(99,179,237,.15);color:#67c3ec'">{{ t.type === 'main' ? '主线' : '支线' }}</span>
                <span v-if="t.hidden" class="text-[9px] px-1 rounded shrink-0"
                  style="background:rgba(239,68,68,.15);color:#f87171">隐藏</span>
              </div>
              <div class="text-[10px] truncate mt-0.5" style="color:rgba(148,163,184,.6)">{{ t.description || '（无描述）' }}</div>
              <div class="text-[9px] mt-0.5" style="color:rgba(107,114,128,.6)">{{ (t.steps || []).length }} 步
                <template v-if="t.reward"> · 奖励{{ t.reward.exp ? ' 经验+' + t.reward.exp : '' }}{{ t.reward.money ? ' 金币+' + t.reward.money : '' }}{{ (t.reward.items || []).filter(i => i && i.name).length ? ' 物品×' + (t.reward.items || []).filter(i => i && i.name).length : '' }}</template>
              </div>
            </div>
          </div>
        </div>
        <!-- 右：编辑表单 -->
        <div class="flex-1 rounded-xl p-3 flex flex-col gap-2.5 overflow-y-auto min-h-0"
          style="background:#141821;border:1px solid rgba(255,255,255,.08)">
          <template v-if="selTask">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold w-24 shrink-0" style="color:rgba(156,163,175,.9)">内部ID</span>
              <el-input-number v-model="selTask.id" :min="1" :max="999999" size="small" class="input-light flex-1!" />
              <span class="text-[10px] shrink-0" style="color:rgba(148,163,184,.6)">剧情/代码引用用，勿随意改</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold w-24 shrink-0" style="color:rgba(156,163,175,.9)">任务名</span>
              <el-input v-model="selTask.name" size="small" class="input-light flex-1!" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold w-24 shrink-0" style="color:rgba(156,163,175,.9)">类型</span>
              <el-select v-model="selTask.type" size="small" class="input-light flex-1!">
                <el-option label="主线" value="main" />
                <el-option label="支线" value="side" />
              </el-select>
              <span class="text-xs font-bold w-20 shrink-0 text-right mr-1" style="color:rgba(156,163,175,.9)">隐藏</span>
              <el-switch v-model="selTask.hidden" :active-value="1" :inactive-value="0" size="small" />
              <span class="text-[10px] shrink-0" style="color:rgba(148,163,184,.6)">勾选后任务面板不显示（进度保留）</span>
            </div>
            <div class="flex items-start gap-2">
              <span class="text-xs font-bold w-24 shrink-0 pt-1.5" style="color:rgba(156,163,175,.9)">描述</span>
              <el-input v-model="selTask.description" type="textarea" :rows="2" size="small" class="input-light flex-1!" />
            </div>
            <!-- 达成步骤 -->
            <div class="border-t pt-2" style="border-color:rgba(255,255,255,.08)">
              <div class="flex items-center gap-2 mb-1.5">
                <span class="text-xs font-bold" style="color:rgba(156,163,175,.9)">🎯 达成步骤</span>
                <span class="text-[10px]" style="color:rgba(148,163,184,.5)">target=达成目标次数（0/空=不显示进度）</span>
                <div class="flex-1"></div>
                <el-button size="small" type="primary" plain @click="addTaskStep()">➕ 步骤</el-button>
              </div>
              <div v-for="(s, si) in selTask.steps" :key="si" class="flex items-center gap-1.5 mb-1.5">
                <el-input v-model="s.id" size="small" placeholder="ID" class="input-light" style="width:70px;font-weight:700" />
                <el-input v-model="s.desc" size="small" placeholder="达成条件描述" class="input-light flex-1!" />
                <el-input-number v-model="s.target" :min="0" :max="99999" size="small" class="input-light" style="width:110px" />
                <el-button size="small" type="danger" plain @click="selTask.steps.splice(si,1)">✕</el-button>
              </div>
            </div>
            <!-- 完成奖励 -->
            <div class="border-t pt-2" style="border-color:rgba(255,255,255,.08)">
              <div class="flex items-center gap-2 mb-1.5">
                <span class="text-xs font-bold" style="color:rgba(156,163,175,.9)">🎁 完成奖励</span>
                <span class="text-[10px]" style="color:rgba(148,163,184,.5)">优先于 TASK_REWARDS 表</span>
              </div>
              <div class="flex items-center gap-2 mb-1.5">
                <span class="text-xs w-24 shrink-0" style="color:rgba(156,163,175,.9)">经验</span>
                <el-input-number v-model="selTask.reward.exp" :min="0" :max="999999" size="small" class="input-light flex-1!" />
                <span class="text-xs w-24 shrink-0" style="color:rgba(156,163,175,.9)">金币</span>
                <el-input-number v-model="selTask.reward.money" :min="0" :max="9999999" size="small" class="input-light flex-1!" />
              </div>
              <div class="flex items-start gap-2">
                <span class="text-xs w-24 shrink-0 pt-1" style="color:rgba(156,163,175,.9)">物品</span>
                <div class="flex-1 flex flex-col gap-1.5">
                  <div v-for="(it, ii) in selTask.reward.items" :key="ii" class="flex items-center gap-1.5">
                    <el-input v-model="it.name" size="small" placeholder="物品名" class="input-light flex-1!" />
                    <el-input-number v-model="it.num" :min="1" :max="999" size="small" class="input-light" style="width:100px" />
                    <el-button size="small" type="danger" plain @click="selTask.reward.items.splice(ii,1)">✕</el-button>
                  </div>
                  <div><el-button size="small" type="primary" plain @click="addTaskRewardItem()">➕ 奖励物品</el-button></div>
                </div>
              </div>
              <div class="flex items-start gap-2 mt-1.5">
                <span class="text-xs w-24 shrink-0 pt-1" style="color:rgba(156,163,175,.9)">解锁天赋</span>
                <div class="flex-1 flex flex-col gap-1.5">
                  <div v-for="(tid, ti) in (selTask.reward.talents || [])" :key="ti" class="flex items-center gap-1.5">
                    <el-input v-model="selTask.reward.talents[ti]" size="small" placeholder="天赋ID（如 moqi_blessing）" class="input-light flex-1!" />
                    <el-button size="small" type="danger" plain @click="removeTaskRewardTalent(ti)">✕</el-button>
                  </div>
                  <div><el-button size="small" type="primary" plain @click="addTaskRewardTalent()">➕ 解锁天赋</el-button></div>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2 pt-1">
              <el-button size="small" type="danger" plain @click="delTaskDef()">🗑 删除此任务</el-button>
              <span class="text-[10px]" style="color:rgba(148,163,184,.5)">删除后保存写入：新游戏不再生成，已有存档中的该模板任务也会移除</span>
            </div>
          </template>
          <div v-else class="flex-1 flex items-center justify-center text-[12px]" style="color:rgba(107,114,128,.6)">
            点击左侧任务进行编辑</div>
        </div>
      </div>
    </div>

    <!-- ============ 🎴 卡牌编辑（DEFAULT_CARD_DATA） ============ -->
    <div v-else-if="curTab === 'cards'" class="h-full flex flex-col gap-2">
      <div class="flex items-center gap-2 shrink-0">
        <span class="text-xs font-bold" style="color:rgba(229,231,235,.85)">🎴 卡牌编辑</span>
        <span class="text-[10px]" style="color:rgba(107,114,128,.7)">store/configs.js · DEFAULT_CARD_DATA · 灵力消耗 / 1-3星倍率 · 描述与数值变量绑定实时预览</span>
        <div class="flex-1"></div>
        <el-button size="small" @click="loadCardsConfig()">加载</el-button>
        <el-button size="small" type="primary" :disabled="!cardsLoaded" @click="saveCardsConfig()">💾 保存写入</el-button>
      </div>
      <div v-if="!cardsLoaded" class="flex-1 flex items-center justify-center text-[13px]"
        style="color:rgba(148,163,184,.7)">{{ cardsLoading ? '⏳ 正在加载卡牌数据…' : '尚未加载，点击右上角「加载」' }}</div>
      <div v-else class="flex-1 min-h-0 flex flex-col gap-2">
        <!-- 🎰 抽取概率：两个卡池独立合计，各自必须 = 100%（可收起） -->
        <div class="shrink-0 rounded-xl px-2.5 py-2 space-y-2"
          style="background:#141821;border:1px solid rgba(255,255,255,.08)">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold" style="color:rgba(229,231,235,.85)">🎰 抽取概率</span>
              <span class="text-[10px]" style="color:rgba(107,114,128,.65)">两卡池独立合计，保存时强制各 = 100%</span>
            </div>
            <button @click="toggleSec('cardsGacha')"
              class="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-amber-400/30 text-gray-300">{{
                secCollapsed.cardsGacha ? '展开' : '收起' }}</button>
          </div>
          <div class="flex items-center gap-4 flex-wrap" v-show="!secCollapsed.cardsGacha">
            <!-- 普通卡池 -->
            <div class="flex items-center gap-1.5">
              <span class="text-[11px] font-bold" style="color:#94D8C3">普通池</span>
              <label v-for="(_, rk) in gachaRates.normal" :key="rk"
                class="flex items-center gap-1 text-[10px]" style="color:rgba(156,163,175,.9)">
                {{ GACHA_RARITY_NAMES[rk] || rk }}
                <el-input-number v-model="gachaRates.normal[rk]" :min="0" :max="100" size="small" controls-position="right"
                  class="input-light" style="width:72px" />
              </label>
              <span class="text-[11px] font-bold ml-1" :style="{ color: gachaTotal('normal') === 100 ? '#52C41A' : '#EA6668' }">
                合计 {{ gachaTotal('normal') }}%{{ gachaTotal('normal') === 100 ? ' ✓' : ' ✗' }}
              </span>
            </div>
            <!-- 高级卡池 -->
            <div class="flex items-center gap-1.5">
              <span class="text-[11px] font-bold" style="color:#E1B98F">高级池</span>
              <label v-for="(_, rk) in gachaRates.premium" :key="rk"
                class="flex items-center gap-1 text-[10px]" style="color:rgba(156,163,175,.9)">
                {{ GACHA_RARITY_NAMES[rk] || rk }}
                <el-input-number v-model="gachaRates.premium[rk]" :min="0" :max="100" size="small" controls-position="right"
                  class="input-light" style="width:72px" />
              </label>
              <span class="text-[11px] font-bold ml-1" :style="{ color: gachaTotal('premium') === 100 ? '#52C41A' : '#EA6668' }">
                合计 {{ gachaTotal('premium') }}%{{ gachaTotal('premium') === 100 ? ' ✓' : ' ✗' }}
              </span>
            </div>
          </div>
        </div>
        <div class="flex-1 min-h-0 flex gap-2">
        <!-- 左侧：卡牌列表 -->
        <div class="w-[24vw] shrink-0 rounded-xl px-2vw flex flex-col gap-2 min-h-0   pb-20vh!"
          style="background:#141821;border:1px solid rgba(255,255,255,.08)">
          <div class="flex gap-1 shrink-0">
            <el-input v-model="cardKeyword" size="small" placeholder="搜索卡牌名" class="input-light flex-1" />
            <el-select v-model="cardRarityFilter" size="small" class="w-24!">
              <el-option label="全部" value="all" />
              <el-option v-for="r in CARD_RARITIES" :key="r.value" :label="r.label" :value="r.value" />
            </el-select>
          </div>
          <div class="flex gap-1 shrink-0">
            <el-select v-model="cardTypeFilter" size="small" style="width:100%">
              <el-option v-for="t in CARD_TYPE_FILTERS" :key="t.value" :label="t.label" :value="t.value" />
            </el-select>
          </div>
          <div class="flex-1 min-h-0 overflow-y-auto space-y-1 pb-10vh">
            <div v-for="c in cardList" :key="c.name"
              class="px-2 py-1 rounded cursor-pointer flex items-center gap-1.5 text-[11px]"
              :class="selCard && selCard.name === c.name ? 'bg-amber-400/15' : 'hover:bg-white/5'"
              @click="selectCard(c)">
              <span class="w-3 h-3 rounded-full shrink-0" :style="{ background: c.color || '#888' }"></span>
              <span class="font-bold truncate flex-1" style="color:rgba(229,231,235,.9)">{{ c.name }}</span>
              <span v-if="c.cardType === 'exclusive'" class="text-[10px] shrink-0 font-bold" style="color:#fbbf24">独占</span>
              <span v-else-if="c.cardType === 'special'" class="text-[10px] shrink-0 font-bold" style="color:#9ca3af">特殊</span>
              <span class="text-[10px] shrink-0" style="color:rgba(148,163,184,.7)">{{ rarityName(c.rarity) }}</span>
            </div>
          </div>
          <div class="text-[10px] shrink-0 mb-4vh" style="color:rgba(107,114,128,.6)">{{ cardList.length }} 张卡牌 · 保存写入后整页重载生效</div>
        </div>
        <!-- 右侧：编辑表单 -->
        <div class="flex-1 min-h-0 rounded-xl p-3 overflow-y-auto pb-30vh"
          style="background:#141821;border:1px solid rgba(255,255,255,.08)">
          <template v-if="selCard">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-xs font-bold" style="color:rgba(229,231,235,.85)">✏️ 编辑卡牌</span>
              <span class="w-3 h-3 rounded-full shrink-0" :style="{ background: selCard.color || '#888' }"></span>
              <span class="text-[15px] font-bold" :style="{ color: selCard.color || '#fff' }">{{ selCard.name }}</span>
              <el-select v-model="selCard.rarity" size="small" style="width:104px" class="input-light">
                <el-option v-for="r in CARD_RARITIES" :key="r.value" :label="r.label" :value="r.value" />
              </el-select>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-medium"
                :style="{ background: rarityColor(selCard.rarity) + '22', color: rarityColor(selCard.rarity) }">{{ rarityName(selCard.rarity) }}</span>
              <span class="text-[10px]" style="color:rgba(148,163,184,.6)">伤害类型：{{ dmgTypeName(selCard.dmgType) }}</span>
            </div>
            <!-- 灵力消耗 -->
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xs font-bold w-20 shrink-0" style="color:rgba(156,163,175,.9)">💧 灵力消耗</span>
              <el-input-number v-model="selCard.cost" :min="0" :max="99" size="small" controls-position="right"
                class="input-light" style="width:130px" />
              <span class="text-[10px]" style="color:rgba(148,163,184,.6)">打出该卡牌消耗的灵力（cost），0 = 无消耗</span>
            </div>
            <!-- 🪙 分解金币（留空 = 按稀有度默认：普通5 / 优秀15 / 稀有30 / 史诗60 / 传说120） -->
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xs font-bold w-20 shrink-0" style="color:rgba(156,163,175,.9)">🪙 分解金币</span>
              <el-input-number v-model="decomposeGoldModel" :min="1" :max="999999" :step="5" size="small"
                controls-position="right" class="input-light" style="width:130px" />
              <span class="text-[10px]" style="color:rgba(148,163,184,.6)">分解该卡牌获得的固定金币（1星基数，2星×2.5、3星×6）；留空 = 按稀有度默认</span>
            </div>
            <!-- 💰 分解收益预览：按当前有效金币基数 × 星级倍率（向下取整） -->
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xs font-bold w-20 shrink-0" style="color:rgba(156,163,175,.9)">分解收益</span>
              <span class="text-[11px] font-bold" style="color:#111;background:#fff;border:1px solid #c8cdd4;border-radius:4px;padding:2px 8px">{{ decomposePreview }}</span>
              <span class="text-[10px]" style="color:rgba(148,163,184,.6)">分别分解 1 张 1星 / 2星 / 3星 卡实际获得的金币</span>
            </div>
            <!-- 🎰 可被卡池抽取：关闭后该卡牌不会出现在普通/高级卡池抽取结果中（如诅咒卡） -->
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xs font-bold w-20 shrink-0" style="color:rgba(156,163,175,.9)">可被卡池抽取</span>
              <el-switch :model-value="selCard.canDraw !== false" @change="selCard.canDraw = $event" size="small" />
              <span class="text-[10px]" style="color:rgba(148,163,184,.6)">关闭后该卡牌不会出现在普通卡池 / 高级卡池的抽取结果中（如诅咒卡）</span>
            </div>
            <!-- 🎴 卡牌类型：普通牌（抽奖+商店）/ 特殊牌（暂无获取来源）/ 独占牌（仅指定角色可获得） -->
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xs font-bold w-20 shrink-0" style="color:rgba(156,163,175,.9)">🎴 卡牌类型</span>
              <el-select v-model="cardTypeModel" size="small" style="width:130px" class="input-light">
                <el-option v-for="t in CARD_TYPES" :key="t.value" :label="t.label" :value="t.value" />
              </el-select>
              <span class="text-[10px]" style="color:rgba(148,163,184,.6)">普通牌可从抽奖/商店获得；特殊牌暂无获取来源；独占牌仅「独占角色」可选时获得</span>
            </div>
            <!-- 👤 独占角色：仅卡牌类型为「独占牌」时显示 -->
            <div v-if="cardTypeModel === 'exclusive'" class="flex items-center gap-2 mb-2">
              <span class="text-xs font-bold w-20 shrink-0" style="color:rgba(156,163,175,.9)">👤 独占角色</span>
              <el-select v-model="selCard.exclusiveRole" size="small" style="width:130px" class="input-light">
                <el-option v-for="r in CARD_EXCLUSIVE_ROLES" :key="r.value" :label="r.label" :value="r.value" />
              </el-select>
              <span class="text-[10px]" style="color:rgba(148,163,184,.6)">只有选择该角色开局时，此卡才会出现在抽奖及商店中</span>
            </div>
            <!-- 星级倍率 -->
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-bold w-20 shrink-0" style="color:rgba(156,163,175,.9)">⚔️ 攻击倍率</span>
              <label class="flex items-center gap-1 text-[10px]" style="color:#fbbf24">⭐1星
                <el-input-number v-model="selCard.atkRatio[0]" :min="0" :max="99" :step="0.01" :precision="2" size="small"
                  controls-position="right" class="input-light" style="width:108px" /></label>
              <label class="flex items-center gap-1 text-[10px]" style="color:#f59e0b">⭐2星
                <el-input-number v-model="selCard.atkRatio[1]" :min="0" :max="99" :step="0.01" :precision="2" size="small"
                  controls-position="right" class="input-light" style="width:108px" /></label>
              <label class="flex items-center gap-1 text-[10px]" style="color:#d97706">⭐3星
                <el-input-number v-model="selCard.atkRatio[2]" :min="0" :max="99" :step="0.01" :precision="2" size="small"
                  controls-position="right" class="input-light" style="width:108px" /></label>
            </div>
            <div class="text-[10px] mb-3" style="color:rgba(107,114,128,.6)">atkRatio = 1/2/3 星攻击力倍率（0.14=14%，2.0=200%），升星后自动取对应星值</div>
            <!-- 🎯 总倍率（多段伤害卡牌：段数 × 单段倍率） -->
            <div v-if="cardTotalHits > 1" class="flex items-center gap-3 mb-3 px-2 py-1.5 rounded"
              style="background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.2)">
              <span class="text-[11px] font-bold shrink-0" style="color:#fbbf24">🎯 总倍率（{{ cardHitsLabel }}）</span>
              <span v-for="st in [0, 1, 2]" :key="st" class="text-[11px] font-bold"
                :style="{ color: ['#fbbf24', '#f59e0b', '#d97706'][st] }">
                ⭐{{ st + 1 }}星 {{ totalRatioPct(st) }}
              </span>
            </div>
            <!-- ✨ 特殊效果（动态字段，数值可调，描述实时联动） -->
            <div v-if="specialFields.length" class="border-t pt-2 mb-3" style="border-color:rgba(255,255,255,.08)">
              <div class="text-xs font-bold mb-1.5" style="color:rgba(229,231,235,.85)">✨ 特殊效果（数值可调，描述实时联动）</div>
              <div v-for="f in specialFields" :key="f.key" class="mb-1.5">
                <!-- 嵌套对象（星级特殊效果 starEffects 等） -->
                <template v-if="f.type === 'object'">
                  <div class="text-[11px] font-bold mb-1" style="color:#fbbf24">{{ effectLabel(f.key) }}</div>
                  <div v-for="(sub, sk) in selCard[f.key]" :key="sk" class="mb-1 pl-3"
                    style="border-left:2px solid rgba(251,191,36,.25)">
                    <!-- ⭐ 数字键（星级特殊效果 starEffects）显示「⭐N 星」；字段键显示字段名（如 mastery） -->
                    <div class="text-[10px] font-bold mb-0.5" style="color:#f59e0b">{{ /^\d+$/.test(String(sk)) ? '⭐' + sk + ' 星' : effectLabel(sk) }}</div>
                    <!-- 子值是对象：按字段类型渲染（数字/文本/开关，字符串不再当数组遍历报错） -->
                    <template v-if="sub !== null && typeof sub === 'object'">
                      <div v-for="(vv, kk) in sub" :key="kk" class="flex items-center gap-2 mb-1 pl-2">
                        <span class="text-[11px] w-28 shrink-0" style="color:rgba(156,163,175,.9)">{{ effectLabel(kk) }}</span>
                        <el-input-number v-if="typeof vv === 'number'" v-model="selCard[f.key][sk][kk]" :min="0" :max="9999" :step="0.01" :precision="2"
                          size="small" controls-position="right" class="input-light" style="width:120px" />
                        <el-input v-else-if="typeof vv === 'string'" v-model="selCard[f.key][sk][kk]" size="small" class="input-light" style="width:150px" />
                        <el-switch v-else-if="typeof vv === 'boolean'" v-model="selCard[f.key][sk][kk]" size="small" />
                        <span v-else class="text-[9px] break-all" style="color:rgba(107,114,128,.55)">{{ JSON.stringify(vv) }}</span>
                      </div>
                    </template>
                    <!-- 子值是标量：直接渲染单控件 -->
                    <div v-else class="flex items-center gap-2 mb-1 pl-2">
                      <span class="text-[11px] w-28 shrink-0" style="color:rgba(156,163,175,.9)">{{ effectLabel(sk) }}</span>
                      <el-input-number v-if="typeof sub === 'number'" v-model="selCard[f.key][sk]" :min="0" :max="99999" :step="1"
                        size="small" controls-position="right" class="input-light" style="width:120px" />
                      <el-input v-else-if="typeof sub === 'string'" v-model="selCard[f.key][sk]" size="small" class="input-light" style="width:200px" />
                      <el-switch v-else-if="typeof sub === 'boolean'" v-model="selCard[f.key][sk]" size="small" />
                      <span v-else class="text-[9px] break-all" style="color:rgba(107,114,128,.55)">{{ JSON.stringify(sub) }}</span>
                    </div>
                  </div>
                </template>
                <!-- 数组字段（按元素逐个编辑） -->
                <template v-else-if="f.type === 'array'">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-[11px] w-28 shrink-0" style="color:rgba(156,163,175,.9)">{{ effectLabel(f.key) }}</span>
                    <template v-for="(vv, i) in selCard[f.key]" :key="i">
                      <el-input-number v-if="typeof vv === 'number'" v-model="selCard[f.key][i]" :min="0" :max="999" :step="0.01" :precision="2"
                        size="small" controls-position="right" class="input-light" style="width:110px" />
                      <el-input v-else-if="typeof vv === 'string'" v-model="selCard[f.key][i]" size="small" class="input-light" style="width:110px" />
                      <el-switch v-else-if="typeof vv === 'boolean'" v-model="selCard[f.key][i]" size="small" />
                      <span v-else class="text-[9px]" style="color:rgba(107,114,128,.55)">{{ JSON.stringify(vv) }}</span>
                    </template>
                    <span class="text-[9px]" style="color:rgba(107,114,128,.55)">按顺序 = 1/2/3星</span>
                  </div>
                </template>
                <!-- 布尔字段 -->
                <template v-else-if="f.type === 'boolean'">
                  <div class="flex items-center gap-2">
                    <span class="text-[11px] w-28 shrink-0" style="color:rgba(156,163,175,.9)">{{ effectLabel(f.key) }}</span>
                    <el-switch v-model="selCard[f.key]" size="small" />
                  </div>
                </template>
                <!-- 字符串字段（文本直接编辑，如某些配置值） -->
                <template v-else-if="f.type === 'string'">
                  <div class="flex items-center gap-2">
                    <span class="text-[11px] w-28 shrink-0" style="color:rgba(156,163,175,.9)">{{ effectLabel(f.key) }}</span>
                    <el-input v-model="selCard[f.key]" size="small" class="input-light" style="width:200px" />
                  </div>
                </template>
                <!-- 数值字段 -->
                <template v-else>
                  <div class="flex items-center gap-2">
                    <span class="text-[11px] w-28 shrink-0" style="color:rgba(156,163,175,.9)">{{ effectLabel(f.key) }}</span>
                    <el-input-number v-model="selCard[f.key]" :min="0" :max="9999" :step="0.01" :precision="2"
                      size="small" controls-position="right" class="input-light" style="width:120px" />
                    <span class="text-[9px]" style="color:rgba(107,114,128,.55)">{{ f.key === 'maxCooldown' ? '回合数' : '乘数：0.1=10%' }}</span>
                  </div>
                </template>
              </div>
            </div>
            <!-- ⭐ 升星说明（手动文案，每星一条，保存写入 configs） -->
            <div class="border-t pt-2 mb-3" style="border-color:rgba(255,255,255,.08)">
              <div class="text-xs font-bold mb-1.5" style="color:rgba(229,231,235,.85)">⭐ 升星说明（1/2/3 星手动文案）</div>
              <div v-for="st in [0, 1, 2]" :key="st" class="flex items-center gap-2 mb-1">
                <span class="text-[11px] w-12 shrink-0 font-bold"
                  :style="{ color: ['#fbbf24', '#f59e0b', '#d97706'][st] }">⭐{{ st + 1 }}星</span>
                <el-input v-model="selCard.starDesc[st]" size="small" class="input-light flex-1"
                  placeholder="填写该星级的升星说明（留空则不展示）" maxlength="120" show-word-limit />
              </div>
            </div>
            <!-- 描述预览（跟变量绑定） -->
            <div class="border-t pt-2 pb-5vh" style="border-color:rgba(255,255,255,.08)">
              <div class="text-xs font-bold mb-1.5" style="color:rgba(229,231,235,.85)">📝 描述预览（随数值实时联动）</div>
              <div v-for="st in [1, 2, 3]" :key="st" class="mb-1 px-2 py-1.5 rounded text-[11px] leading-relaxed"
                style="background:rgba(255,255,255,.04);color:rgba(229,231,235,.85)">
                <span class="font-bold mr-1" :style="{ color: ['#fbbf24', '#f59e0b', '#d97706'][st - 1] }">⭐{{ st }}星</span>
                <span style="color:rgba(148,163,184,.7)">消耗 {{ selCard.cost ?? 0 }} 灵力 · </span>
                <span v-html="cardDescPreview(selCard, st)"></span>
              </div>
              <div class="text-[10px]" style="color:rgba(107,114,128,.6)">描述由数值模板动态生成（跟 cost / atkRatio 等变量绑定），修改后立即联动</div>
            </div>
          </template>
          <div v-else class="flex-1 flex items-center justify-center text-[12px]" style="color:rgba(107,114,128,.6)">
            点击左侧卡牌进行编辑</div>
        </div>
      </div>
      </div>
    </div>
    <!-- ============ 🎭 角色初始配置编辑 ============ -->
    <div v-else-if="curTab === 'roleInit'" class="h-full flex flex-col gap-2 ">
      <div class="flex items-center gap-2 shrink-0">
        <span class="text-xs font-bold" style="color:rgba(229,231,235,.85)">🎭 角色初始配置</span>
        <span class="text-[10px]" style="color:rgba(107,114,128,.7)">configs.js ROLE_INIT_CONFIGS · 开局角色选择的初始卡组 / 属性点 / 天赋点，每个角色独立</span>
        <div class="flex-1"></div>
        <el-button size="small" @click="loadRoleInitConfig()">加载</el-button>
        <el-button size="small" type="primary" :disabled="!roleInitLoaded" @click="saveRoleInitConfig()">💾 保存写入</el-button>
      </div>
      <div v-if="!roleInitLoaded" class="flex-1 flex items-center justify-center text-[13px]"
        style="color:rgba(148,163,184,.7)">{{ roleInitLoading ? '⏳ 正在加载角色配置…' : '尚未加载，点击右上角「加载」' }}</div>
      <div v-else class="flex-1 min-h-0 overflow-y-auto pr-1 pb-2 space-y-2  pb-35vh">
        <div v-for="(rc, rid) in roleInitState" :key="rid"
          class="rounded-xl p-2.5 space-y-2" style="background:#141821;border:1px solid rgba(255,255,255,.08)">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-[13px] font-bold" style="color:#fbbf24">{{ rc.name }}
              <span class="text-[10px] font-normal" style="color:rgba(148,163,184,.7)">{{ rc.desc }} · {{ rid }}</span>
            </span>
            <div class="flex-1"></div>
            <span class="text-[10px]" style="color:rgba(107,114,128,.7)">🔓 开局可选</span>
            <el-switch v-model="rc.unlocked" size="small" />
            <span class="text-[10px]" style="color:rgba(107,114,128,.7)">🎖 天赋点</span>
            <el-input-number v-model="rc.talentPoints" size="small" :min="0" :max="999" controls-position="right" class="input-light" style="width:100px" />
            <span class="text-[10px]" style="color:rgba(107,114,128,.7)">🆓 自由属性点</span>
            <el-input-number v-model="rc.freeAttrPoints" size="small" :min="0" :max="999" controls-position="right" class="input-light" style="width:100px" />
          </div>
          <div class="flex items-center gap-1.5 flex-wrap">
            <template v-for="k in roleAttrKeys" :key="k">
              <span class="text-[11px]" style="color:rgba(156,163,175,.9)">{{ roleAttrLabels[k] }}</span>
              <el-input-number v-model="rc.attrs[k]" size="small" :min="-999" :max="999" controls-position="right" class="input-light" style="width:88px" />
            </template>
          </div>
          <div class="space-y-1">
            <div class="text-[12px]" style="color:rgba(156,163,175,.9)">🃏 初始卡牌（{{ (rc.deck || []).length }} 种）</div>
            <div class="flex items-center gap-1.5 flex-wrap">
              <el-tag v-for="(cn, i) in rc.deck" :key="cn + i" closable size="small" @close="rc.deck.splice(i, 1)">{{ cn }}</el-tag>
              <el-select v-model="rcDeckAdd[rid]" size="small" placeholder="＋ 添加卡牌" filterable clearable style="width:190px"
                @change="v => roleDeckAdd(rid, v)">
                <el-option v-for="cn in roleNotInDeck(rid)" :key="cn" :label="cn" :value="cn" />
              </el-select>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- ============ 🎖 熟练度编辑 ============ -->
    <div v-else-if="curTab === 'cardMastery'" class="h-full flex flex-col gap-2">
      <div class="flex items-center gap-2 shrink-0">
        <span class="text-xs font-bold" style="color:rgba(229,231,235,.85)">🎖 熟练度编辑</span>
        <span class="text-[10px]" style="color:rgba(107,114,128,.7)">configs.js 每张卡的 mastery 字段 · 战斗出牌每次 +1 熟练度，达到阈值（base×2^等级）升级变强，阈值翻倍无上限</span>
        <div class="flex-1"></div>
        <el-button size="small" @click="loadMasteryConfig()">加载</el-button>
        <el-button size="small" type="primary" :disabled="!masteryLoaded" @click="saveMasteryConfig()">💾 保存写入</el-button>
      </div>
      <div v-if="!masteryLoaded" class="flex-1 flex items-center justify-center text-[13px]"
        style="color:rgba(148,163,184,.7)">{{ masteryLoading ? '⏳ 正在加载卡牌数据…' : '尚未加载，点击右上角「加载」' }}</div>
      <div v-else class="flex-1 min-h-0 overflow-y-auto pr-1 pb-2 space-y-1.5">
        <div v-for="(m, cname) in masteryState" :key="cname"
          class="rounded-xl p-2.5 space-y-1.5" style="background:#141821;border:1px solid rgba(255,255,255,.08)">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-[13px] font-bold" style="color:#fbbf24">{{ cname }}</span>
            <span class="text-[10px]" style="color:rgba(107,114,128,.6)">阈值 base×2^等级：{{ m && m.base ? m.base + ' → ' + (m.base*2) + ' → ' + (m.base*4) + '…' : '未配置变强效果' }}</span>
            <div class="flex-1"></div>
            <el-select v-model="m.type" size="small" style="width:150px">
              <el-option label="固定伤害（flatDmg）" value="flatDmg" />
              <el-option label="伤害提升（percentDmg）" value="percentDmg" />
              <el-option label="无变强效果" value="none" />
            </el-select>
          </div>
          <template v-if="m.type === 'flatDmg' || m.type === 'percentDmg'">
            <div class="flex items-center gap-2 flex-wrap">
              <label class="flex items-center gap-1.5 text-[11px]" style="color:rgba(156,163,175,.9)">
                初始阈值
                <el-input-number v-model="m.base" :min="1" :max="99999" size="small" controls-position="right" class="input-light" style="width:110px" />
              </label>
              <label class="flex items-center gap-1.5 text-[11px]" style="color:rgba(156,163,175,.9)">
                {{ m.type === 'flatDmg' ? '每级提升量' : '每级提升(%)' }}
                <el-input-number v-model="m.value" :min="1" :max="99999" size="small" controls-position="right" class="input-light" style="width:110px" />
              </label>
              <span class="text-[10px]" style="color:rgba(107,114,128,.6)">
                {{ m.type === 'flatDmg'
                  ? '每级固定增加该数值伤害（随卡牌属性类型，如火球=火属性）'
                  : '每级伤害 ×(1+百分比%)，累乘叠加（15% → Lv.1=1.15x / Lv.2≈1.32x）' }}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[11px] w-16 shrink-0" style="color:rgba(156,163,175,.9)">描述</span>
              <el-input v-model="m.desc" size="small" placeholder="升级提示 / 图鉴描述用" class="input-light" />
            </div>
          </template>
        </div>
      </div>
    </div>
    <div v-else-if="curTab === 'monsters'" class="h-full flex flex-col gap-2 ">
      <div class="flex items-center gap-2 shrink-0">
        <span class="text-xs font-bold" style="color:rgba(229,231,235,.85)">👾 怪物编辑</span>
        <span class="text-[10px]" style="color:rgba(107,114,128,.7)">matter1/enemiesData.js · HP/攻击/护甲/魔抗/速度/幸运 ·
          技能被动动画不受影响，保存后整页重载生效</span>
        <div class="flex-1"></div>
        <el-button size="small" @click="loadMonstersConfig()">加载</el-button>
        <el-button size="small" type="primary" :disabled="!monstersLoaded" @click="saveMonstersConfig()">💾 保存写入</el-button>
      </div>
      <div v-if="!monstersLoaded" class="flex-1 flex items-center justify-center text-[13px]"
        style="color:rgba(148,163,184,.7)">{{ monstersLoading ? '⏳ 正在加载怪物数据…' : '尚未加载，点击右上角「加载」' }}</div>
      <div v-else class="flex-1 min-h-0 flex flex-col gap-2">
        <!-- 怪物选择 -->
        <div class="shrink-0 flex items-center gap-2 flex-wrap rounded-xl px-2.5 py-2"
          style="background:#141821;border:1px solid rgba(255,255,255,.08)">
          <button v-for="m in monsterList" :key="m.key" @click="selMonsterKey = m.key"
            class="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all"
            :style="selMonsterKey === m.key
              ? 'background:rgba(251,191,36,.15);border-color:rgba(251,191,36,.6);color:#fbbf24'
              : 'border:1px solid rgba(255,255,255,.1);color:#9ca3af;background:rgba(255,255,255,.03)'">
            {{ m.data.name || m.key }}
          </button>
        </div>
        <!-- 数值编辑 -->
        <div v-if="selMonster" class="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 pb-2 pb-26vh">
          <div class="rounded-xl p-3 space-y-2.5" style="background:#141821;border:1px solid rgba(255,255,255,.08)">
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold" style="color:#fbbf24">👾 {{ selMonster.data.name }}</span>
              <span class="text-[10px]" style="color:rgba(107,114,128,.65)">键名 {{ selMonster.key }}</span>
              <!-- 🏷️ 怪物类型：普通/精英/Boss（保存写入 enemiesData.js rank 字段，图鉴标记联动） -->
              <el-select v-model="selMonster.data.rank" size="small" class="input-light" style="width:96px">
                <el-option v-for="r in MONSTER_RANK_OPTIONS" :key="r.value" :label="r.label" :value="r.value" />
              </el-select>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <label v-for="f in MONSTER_NUM_FIELDS" :key="f"
                class="flex items-center justify-between gap-2 text-[11px] rounded-lg px-2 py-1.5"
                style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07)">
                <span style="color:rgba(156,163,175,.9)">{{ MONSTER_FIELD_LABELS[f] || f }}</span>
                <el-input-number v-model="selMonster.data[f]" :min="0" :max="99999" size="small" controls-position="right"
                  class="input-light" style="width:110px" />
              </label>
            </div>
            <!-- ⚔️ 普攻配置 -->
            <div class="rounded-lg p-2 space-y-1.5" style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06)">
              <div class="text-[10px] font-bold" style="color:rgba(156,163,175,.8)">⚔️ 普攻配置</div>
              <div class="grid grid-cols-3 gap-2">
                <label v-if="typeof selMonster.data.attackMultiplier === 'number'" class="flex items-center justify-between gap-2 text-[11px]"
                  style="color:rgba(156,163,175,.9)">倍率
                  <el-input-number v-model="selMonster.data.attackMultiplier" :min="0" :max="10" :step="0.05" size="small" controls-position="right"
                    class="input-light" style="width:100px" />
                </label>
                <label v-if="typeof selMonster.data.attackHits === 'number'" class="flex items-center justify-between gap-2 text-[11px]"
                  style="color:rgba(156,163,175,.9)">段数
                  <el-input-number v-model="selMonster.data.attackHits" :min="1" :max="10" size="small" controls-position="right"
                    class="input-light" style="width:100px" />
                </label>
                <label v-if="typeof selMonster.data.attackDmgType === 'string'" class="flex items-center justify-between gap-2 text-[11px]"
                  style="color:rgba(156,163,175,.9)">属性
                  <el-select v-model="selMonster.data.attackDmgType" size="small" class="input-light" style="width:100px">
                    <el-option v-for="dt in MONSTER_DMG_TYPES" :key="dt.value" :label="dt.label" :value="dt.value" />
                  </el-select>
                </label>
                <!-- 🧪 普攻中毒（attackPoison 存在时显示）：毒持续回合 + 毒伤倍率 -->
                <template v-if="selMonster.data.attackPoison">
                  <label class="flex items-center justify-between gap-2 text-[11px]" style="color:#7ee2a8">毒持续回合
                    <el-input-number v-model="selMonster.data.attackPoison.turns" :min="1" :max="10" size="small"
                      controls-position="right" class="input-light" style="width:100px" />
                  </label>
                  <label class="flex items-center justify-between gap-2 text-[11px]" style="color:#7ee2a8">毒伤倍率
                    <el-input-number v-model="selMonster.data.attackPoison.ratio" :min="0" :max="5" :step="0.05" size="small"
                      controls-position="right" class="input-light" style="width:100px" />
                  </label>
                </template>
              </div>
            </div>
            <!-- 🔧 其他数值（易伤/增伤/减伤等） -->
            <div v-if="monsterExtraNumKeys.length" class="rounded-lg p-2 space-y-1.5" style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06)">
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-bold" style="color:rgba(156,163,175,.8)">🔧 其他数值</span>
                <button @click="monsterExtraCollapsed = !monsterExtraCollapsed"
                  class="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-amber-400/30 text-gray-300">{{
                    monsterExtraCollapsed ? '展开' : '收起' }}</button>
              </div>
              <div class="grid grid-cols-3 gap-2" v-show="!monsterExtraCollapsed">
                <label v-for="k in monsterExtraNumKeys" :key="k"
                  class="flex items-center justify-between gap-2 text-[11px] rounded-lg px-2 py-1"
                  style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05)">
                  <span style="color:rgba(156,163,175,.85)">{{ MONSTER_FIELD_CN[k] || k }}</span>
                  <el-input-number v-model="selMonster.data[k]" :min="0" :max="99999" :step="0.05" size="small" controls-position="right"
                    class="input-light" style="width:100px" />
                </label>
              </div>
            </div>
            <!-- 🎯 技能（数值可编辑，desc/type 只读） -->
            <div v-if="(selMonster.data.skills || []).length" class="space-y-1.5 pt-1">
              <div class="text-[10px] font-bold" style="color:rgba(156,163,175,.75)">🎯 技能（数值字段可编辑，保存生效）</div>
              <div v-for="(s, si) in selMonster.data.skills" :key="'s' + si"
                class="rounded-lg p-2 space-y-1.5" style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06)">
                <div class="flex items-center gap-2">
                  <span class="text-[11px] font-bold" style="color:#94D8C3">⚡ {{ s.name }}</span>
                  <span class="text-[9px] px-1 rounded" style="background:rgba(255,255,255,.06);color:rgba(148,163,184,.7)">{{ s.type }}</span>
                </div>
                <div class="text-[10px]" style="color:rgba(148,163,184,.75)">{{ s.desc }}
                  <span v-if="s.type === 'summon'" class="ml-1 text-[9px]" style="color:rgba(94,234,212,.6)">🔗 随上方数值自动更新</span>
                </div>
                <div class="grid grid-cols-3 gap-1.5">
                  <label v-for="k in numKeysOf(s)" :key="k"
                    class="flex items-center justify-between gap-1 text-[10px] rounded px-1.5 py-1"
                    style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05)">
                    <span style="color:rgba(156,163,175,.85)">{{ MONSTER_FIELD_CN[k] || k }}</span>
                    <el-input-number v-model="s[k]" :min="0" :max="99999" :step="0.01" size="small" controls-position="right"
                      class="input-light" style="width:96px" />
                  </label>
                </div>
              </div>
            </div>
            <!-- ♻️ 被动（数值可编辑，desc/type 只读） -->
            <div v-if="(selMonster.data.passives || []).length" class="space-y-1.5 pt-1">
              <div class="text-[10px] font-bold" style="color:rgba(156,163,175,.75)">♻️ 被动（数值字段可编辑，保存生效）</div>
              <div v-for="(p, pi) in selMonster.data.passives" :key="'p' + pi"
                class="rounded-lg p-2 space-y-1.5" style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06)">
                <div class="flex items-center gap-2">
                  <span class="text-[11px] font-bold" style="color:#E1B98F">♻️ {{ p.name }}</span>
                  <span class="text-[9px] px-1 rounded" style="background:rgba(255,255,255,.06);color:rgba(148,163,184,.7)">{{ p.type }}</span>
                </div>
                <div class="text-[10px]" style="color:rgba(148,163,184,.75)">{{ p.desc }}</div>
                <div class="grid grid-cols-3 gap-1.5">
                  <label v-for="k in numKeysOf(p)" :key="k"
                    class="flex items-center justify-between gap-1 text-[10px] rounded px-1.5 py-1"
                    style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05)">
                    <span style="color:rgba(156,163,175,.85)">{{ MONSTER_FIELD_CN[k] || k }}</span>
                    <el-input-number v-model="p[k]" :min="0" :max="99999" :step="0.01" size="small" controls-position="right"
                      class="input-light" style="width:96px" />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="flex-1 flex items-center justify-center text-[12px]" style="color:rgba(107,114,128,.6)">
          点击上方怪物进行编辑</div>
      </div>
    </div>
    <!-- ============ 🧭 指引编辑 ============ -->
    <div v-else-if="curTab === 'guide'" class="h-full overflow-y-auto">
      <div class="max-w-3xl mx-auto mt-6 space-y-4 px-2">
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold" style="color:rgba(229,231,235,.85)">🧭 指引文本编辑</span>
          <span class="text-[10px]" style="color:rgba(107,114,128,.7)">i18n/ui-core.js · guideHint（主世界左上角提示），保存后刷新游戏生效</span>
          <div class="flex-1"></div>
          <el-button size="small" @click="loadGuideConfig()">加载</el-button>
          <el-button size="small" type="primary" @click="saveGuideConfig()">💾 保存写入</el-button>
        </div>
        <div class="rounded-xl p-4 space-y-4" style="background:#141821;border:1px solid rgba(255,255,255,.08)">
          <div>
            <div class="text-[11px] mb-1 font-bold" style="color:rgba(148,163,184,.8)">中文</div>
            <el-input v-model="guideZh" placeholder="输入中文指引文本（主世界左上角显示）" />
          </div>
          <div>
            <div class="text-[11px] mb-1 font-bold" style="color:rgba(148,163,184,.8)">English</div>
            <el-input v-model="guideEn" placeholder="Enter English guide text" />
          </div>
          <div class="text-[10px]" style="color:rgba(107,114,128,.6)">预览（中文）：{{ guideZh || '（空）' }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch, nextTick, onMounted, onBeforeUnmount, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { SkeletonBinary, SkeletonJson, TextureAtlas, AtlasAttachmentLoader } from '@esotericsoftware/spine-core'
import { Application, Assets, Container } from 'pixi.js'
import { Spine } from '@esotericsoftware/spine-pixi-v8'
import { ITEM_SKIN_MAP } from '../dungeon/config'



// ============ 数据源：对话文件（只读加载） ============
// 硬编码保序 + 动态 glob 补齐：新增 data/npc/*.js 会自动出现在下拉（如 opening.js）
const _KNOWN_FILES = ['shangren1', 'liya', 'jingling', 'jingling-shared', 'jingling-zhuxian', 'jingling-yushi', 'jingling-translations', 'jingling-guanri']
const mods = import.meta.glob('./data/npc/*.js')
const _GLOB_FILES = Object.keys(mods).map(k => k.replace('./data/npc/', '').replace('.js', ''))
const FILES = [..._KNOWN_FILES.filter(f => _GLOB_FILES.includes(f)), ..._GLOB_FILES.filter(f => !_KNOWN_FILES.includes(f))]

// ============ 枚举（说话人 / 皮肤 / 条件 / 任务） ============
const SPEAKERS = [
  { name: '', img: null, desc: '旁白（空名）' },
  { name: '林恩', img: null, desc: '玩家' },
  { name: '商人', img: 'shangren1', desc: '莫奇' },
  { name: '莫奇', img: 'shangren1', desc: 'moqiName 后显示名' },
  { name: '里亚', img: 'shangren2', desc: '被救商人' },
  { name: '晨曦', img: 'jinmao', desc: '金毛' },
  { name: '云弥', img: 'yu', desc: '' },
  { name: '西亚', img: 'huli', desc: '狐狸' },
  { name: '黑米', img: 'heimi', desc: '半魔化精灵（兔子）' },
  { name: '白朔', img: 'maomi', desc: '猫咪' },
  { name: '天选者', img: 'npc1', desc: 'NPCQ 骨骼' },
  { name: '神秘精灵', img: 'npc2', desc: 'NPCQ 骨骼' },
  { name: '众人', img: null, desc: '集体说话' },
]
// 👥 说话人下拉：按 img 去重（商人/莫奇同用 shangren1，避免同 value 双选中）
const uniqueSpeakers = computed(() => {
  const seen = new Set()
  return SPEAKERS.filter(x => x.img && !seen.has(x.img) && (seen.add(x.img), true))
})
const PLAYER_SKINS = ['head_front', 'head_left', 'head_right', 'head_back', 'moren']
const SKIN_PRESETS = ['moren', 'moren1', 'jingit', 'daxiao1', 'angry', 'happy', 'sad', 'shock']
const COND_PRESETS = [
  { label: '没说过这段', code: "cond.notCompleted('xx')", desc: '这段对话还没触发过' },
  { label: '说过了这段', code: "cond.completed('xx')", desc: '这段对话已经触发过' },
  { label: '互斥剧情没做过', code: "cond.notAnyCompleted(['xx','yy'])", desc: '列出的剧情做过任一个则不出现' },
  { label: '今天没做过', code: "cond.notCompletedToday(['xx'])", desc: '今天已触发过则不出现' },
  { label: '开关已开启', code: "cond.flag('xx')", desc: '某个标记为开启（如已领过）' },
  { label: '开关未开启', code: "cond.notFlag('xx')", desc: '某个标记未开启（如没问过）' },
  { label: '数值达到阈值', code: "cond.flagNumGte('xx', 20)", desc: '好感度/次数等数字达标' },
  { label: '第 N 天之后', code: "cond.dayGte(3)", desc: '到了第 N 天之后才出现' },
  { label: '仅限当天', code: "cond.dayEqualsFlag('xx')", desc: '只在记录的当天出现' },
  { label: '事件后过 N 天', code: "cond.daysSinceFlag('xx', 1)", desc: '某事件发生后过 N 天' },
  { label: '角色在现场', code: "cond.needNpc('tuzi')", desc: '指定的角色在地图上' },
  { label: '携带队友', code: "cond.carryNpc('tuzi')", desc: '当前携带的队友是指定角色（tuzi=黑米 / jinmao=晨曦 / yu=云弥 / huli=西亚 / maomi=白朔）' },
  { label: '好感度达标', code: "cond.favorGte('huli', 50)", desc: 'NPC 好感度达到数值' },
  { label: '背包有物品', code: "cond.needItem('草药', 1)", desc: '背包里拥有物品' },
  { label: '多个条件全满足', code: "cond.all(cond.flag('a'), cond.dayGte(2))", desc: '所有条件同时成立（且）' },
  { label: '多个条件满足其一', code: "cond.any(cond.needItem('钥匙'), cond.dayGte(3))", desc: '任意一个成立即可（或）' },
]
// 🔧 onEnter 快速插入预设（写入函数体，不含外层箭头函数）
// 🎬 头像动画（AVATAR_FX 注册表键名，与 duihua.vue 同步）
const AVATAR_FX_NAMES = ['shake', 'pulse', 'pop', 'bounce', 'angry', 'sad', 'nervous', 'sway', 'hop', 'spin', 'excited', 'laugh', 'announce', 'sob', 'shrink', 'awkward', 'tilt', 'sneer', 'dizzy', 'shy', 'nod', 'headshake', 'think', 'gentle', 'cute', 'proud', 'tired', 'yawn', 'shiver', 'frantic', 'alert', 'moved', 'speechless', 'dazzled', 'sneaky', 'surpriseBack', 'impact', 'stretch', 'cartoonJump']
const AVATAR_FX_LABELS = {
  shake: '颤抖', pulse: '脉动', pop: '弹出', bounce: '弹跳', angry: '生气',
  sad: '难过', nervous: '紧张', sway: '摇摆', hop: '蹦跳', spin: '旋转',
  excited: '兴奋', laugh: '大笑', announce: '宣布', sob: '抽泣', shrink: '缩小',
  awkward: '尴尬', tilt: '倾斜', sneer: '冷笑', dizzy: '眩晕', shy: '害羞',
  nod: '点头', headshake: '摇头', think: '思考', gentle: '温柔', cute: '可爱',
  proud: '骄傲', tired: '疲惫', yawn: '打哈欠', shiver: '发抖', frantic: '抓狂',
  alert: '警惕', moved: '感动', speechless: '无语', dazzled: '炫目', sneaky: '鬼祟',
  surpriseBack: '吓一跳', impact: '冲击', stretch: '伸展', cartoonJump: '卡通跳跃',
}
// 说话人联想：可自由输入任意文本，也提供预设人物联想
// ⚠️ el-autocomplete 的候选对象必须有 value 字段才会正常展示（否则只显示一条）
function querySpeakerName(q, cb) {
  const kw = (q || '').trim()
  const list = SPEAKERS
    .filter(s => s.name && (!kw || s.name.includes(kw)))
    .map(s => ({ value: s.name, desc: s.desc || '' }))
  cb(list)
}

// 头像动画：条目列表（每条 = 目标 + 动画），多条 → 数组，各自独立配动画
const fxItems = ref([])
// 可选目标 = 玩家 + 对话框在场头像（onStage 里的人；无头像时整块隐藏）
const fxTargetOptions = computed(() => {
  const os = form.value.onStage
  if (typeof os === 'string' && os) return [os]
  if (Array.isArray(os)) return os.filter(Boolean)
  return []
})
function addFxItem() { fxItems.value.push({ target: '', fx: '' }) }
function removeFxItem(i) { fxItems.value.splice(i, 1); applyAvatarFx() }
function applyAvatarFx() {
  const items = fxItems.value.filter(x => x && x.fx)
  if (!items.length) { form.value.avatarFx = ''; return }
  if (items.length === 1) {
    form.value.avatarFx = items[0].target ? items[0].target + ':' + items[0].fx : items[0].fx
    return
  }
  form.value.avatarFx = items.map(x => x.target ? { target: x.target, fx: x.fx } : { fx: x.fx })
}
// 从 avatarFx 反向拆分到条目列表（支持字符串 target:fx / 纯 fx / 数组）
function parseAvatarFx(v) {
  fxItems.value = []
  if (Array.isArray(v) && v.length) {
    v.forEach(x => { if (x && x.fx) fxItems.value.push({ target: x.target || '', fx: typeof x.fx === 'string' ? x.fx : '' }) })
    return
  }
  if (typeof v !== 'string' || !v) return
  const i = v.indexOf(':')
  if (i > 0 && AVATAR_FX_NAMES.includes(v.slice(i + 1))) {
    fxItems.value.push({ target: v.slice(0, i), fx: v.slice(i + 1) })
  } else if (AVATAR_FX_NAMES.includes(v)) {
    fxItems.value.push({ target: '', fx: v })
  }
}
const ONENTER_PRESETS = [
  { label: '开启一个开关', code: "user.setDialogueFlag('xx', true);", desc: '设某个标记为开启（如已问过/已领过）' },
  { label: '关闭一个开关', code: "user.setDialogueFlag('xx', false);", desc: '设某个标记为关闭' },
  { label: '次数加一', code: "user.setDialogueFlag('xx', (user.getDialogueFlag('xx') || 0) + 1);", desc: '累计次数/好感等数字' },
  { label: '记下今天', code: "user.setDialogueFlag('xx', user.pixi?.player?.day ?? 1);", desc: '记录当前天数，供隔天判断' },
  { label: '推进任务进度', code: "user.completeTaskStep?.('taskId', 'step');", desc: '完成任务步骤（如找里亚）' },
  { label: '给一件道具', code: "user.addItemToInventory({ name: 'xx', num: 1 });", desc: '往背包添加物品' },
  { label: '好感/数值增加', code: "user.setDialogueFlag('xx', (user.getDialogueFlag('xx') || 0) + 5);", desc: '给数字标记加数值' },
  { label: '触发剧情事件', code: "emitter.emit('xxx', { ... });", desc: '广播全局事件' },
]
// 🎨 选项按钮配色预设（固定色板一键选择；可在下方单独改背景/文字色）
const OPTION_COLOR_PRESETS = [
  { name: '经典蓝', bg: '#409EFF', color: '#ffffff' },
  { name: '深蓝', bg: '#1f6feb', color: '#ffffff' },
  { name: '翠绿', bg: '#2ecc71', color: '#ffffff' },
  { name: '朱红', bg: '#e74c3c', color: '#ffffff' },
  { name: '暖橙', bg: '#f39c12', color: '#ffffff' },
  { name: '紫罗兰', bg: '#9b59b6', color: '#ffffff' },
  { name: '墨黑', bg: '#1a1a2e', color: '#ffffff' },
  { name: '纯白', bg: '#ffffff', color: '#333333' },
]
function applyOptPreset(o, p) { o.optionBg = p.bg; o.optionColor = p.color }
function optActivePreset(o, p) { return o.optionBg === p.bg && o.optionColor === p.color }
function clearOptColor(o) { o.optionBg = ''; o.optionColor = '' }
function optPreviewStyle(o) {
  return { backgroundColor: o?.optionBg || '#409EFF', color: o?.optionColor || '#ffffff', fontSize: '11px', fontWeight: 'bold' }
}
const TASK_TEMPLATES = [
  {
    id: 'find_liya', desc: '寻找失踪的里亚', steps: [
      { id: 'find', label: '找到里亚' },
      { id: 'return', label: '带回给莫奇' },
    ],
  },
]

// ============ 状态 ============
const router = useRouter()
const tabs = [
  { key: 'edit', label: '对话编辑器' },
  { key: 'story', label: '查看剧情对话' },
  { key: 'talent', label: '编辑天赋' },
  { key: 'dungeon', label: '地牢编辑' },
  { key: 'items', label: '物品编辑' },
  { key: 'equip', label: '装备编辑' },
  { key: 'levelUp', label: '升级编辑' },
  { key: 'tasks', label: '任务编辑' },
  { key: 'achievements', label: '成就编辑' },
  { key: 'cards', label: '卡牌编辑' },
  { key: 'roleInit', label: '角色初始' },
  { key: 'cardMastery', label: '熟练度编辑' },
  { key: 'monsters', label: '怪物编辑' },
  { key: 'guide', label: '指引编辑' },
]
const curTab = ref('edit')
// 🗂️ Tab 栏收起/展开（持久化）
const tabsCollapsed = ref(localStorage.getItem('dladmin_tabs_collapsed') === '1')
function toggleTabsCollapsed() {
  tabsCollapsed.value = !tabsCollapsed.value
  localStorage.setItem('dladmin_tabs_collapsed', tabsCollapsed.value ? '1' : '0')
}
const curFile = ref('shangren1')
const nodes = ref({})           // 当前文件节点对象
const loadingFile = ref(false)
const rawFile = ref('') // 当前文件源码文本（用于还原 cond.all/cond.any 等工厂调用的原始表达式）
const kw = ref('')
const selNodeId = ref(null)
const genCode = ref('')
const storyText = ref('')          // 📖 剧情预览 HTML（渲染富文本颜色）
const plainStoryText = ref('')     // 📖 剧情预览纯文本（复制用）
const patchOps = ref([])        // 补丁操作队列
// 🧹 清空补丁队列 + 节点代码预览（显式设置 ref.value，避免模板内联赋值不生效）
function clearPatch() {
  patchOps.value = []
  genCode.value = ''
}
const collapsedGroups = reactive({}) // 🪟 左栏对话流分组：已收起的组（entry -> true）
const insertPos = ref('after')  // 📍 插入位置：before=选中前 / after=选中后 / end=文件末尾（默认插到选中后）
// 🔁 切换插入位置时，自动填充新节点的跳转：
//   after  → 新节点.next = 选中节点的原 next（插入后接续：sr02 → 新节点 → sr02b）
//   before → 新节点.next = 选中节点自身（插入到它前面：新节点 → sr02 → sr02b）
watch(insertPos, (pos) => {
  const sid = selNodeId.value
  const nd = sid ? nodes.value[sid] : null
  if (!nd) return
  if (pos === 'after') {
    if (typeof nd.next === 'string') form.value.next = nd.next
  } else if (pos === 'before') {
    form.value.next = sid
  }
})
// 💡 是否有草稿节点（表单 id 非空即可生成/生成补丁）
const draftCode = computed(() => !!form.value.id.trim())
// 是否为「简单轮换函数」（含 return [ 数组 / 取模轮换）——只有这类才显示多段台词轮换面板；
// 条件分支函数（如 sr10 的一长串 if/return）会被 parseLinesFromFn 误提取成一堆台词，故隐藏面板
const isRotateFn = computed(() => {
  const s = form.value.textFn || ''
  // 简单轮换函数的特征：return [ 数组、lines[n] 索引访问、[n] 取模轮换。
  // sr50 是 return lines[n] ?? lines[0] 形态，故用 /\[n\]/ 兜底识别；条件分支函数（sr10 的 if/return）不含 [n]
  return s.includes('return [') || /\[n\]/.test(s) || /% \d/.test(s)
})
const patchScript = ref('')
const toast = ref('')

// 编辑器表单
const form = ref(emptyForm())
// 🖤 黑屏模式全屏盖住 CG → 开启黑屏时 CG 模式自动切为「不处理」
watch(() => form.value.blackScreen, (v) => {
  if (v && form.value.cgMode !== 'none') form.value.cgMode = 'none'
})
function emptyForm() {
  return {
    id: '', name: '', text: '', next: '', nextCond: '', nextRules: [], isTransit: false, end: null, repeatable: false,
    textMode: 'text', textFn: '', onStage: '', playerSkin: 'moren', npcSkin: 'moren', npcSkins: {}, avatarFx: '', textSizePick: 2, textColorPick: '#ff0000', condition: '', onEnter: '', options: [],
    // 🎬 CG 剧情：cgMode=none不处理 / show显示 / hide隐藏
    cgMode: 'none', showCg: '', cgAnimation: '', cgLoop: false, cgSkin: '', cgShowAvatar: false,
    // 🎬 cgResume：本节点推进时恢复被「pause 标记点」暂停的 CG 继续播放
    cgResume: false,
    // 🎬 CG 附加：hideUI 隐藏对话框只显示CG / autoNext 毫秒后自动进入下一句
    hideUI: false, autoNext: '',
    // 🎬 展示控制：blackScreen 黑屏文字模式 / textSpeed 打字速度（每秒字数；textSpeedTouched=是否显式修改过，默认20但不生成）
    blackScreen: false, textSpeed: '20', textSpeedTouched: false,
    // 🎬 nextTextOnce：跳转时替换目标节点文本（仅一次；nextTextOnceOn=按钮开关）
    nextTextOnce: '', nextTextOnceOn: false,
  }
}
// ✨ 一键生成：基于当前节点 ID 生成最接近的不重复 ID
//    - 末尾带数字：数字递增（sr02b_1 → sr02b_2 → sr02b_3…，已存在则继续往后）
//    - 末尾不带数字：追加 _N（sr02 → sr02_1，已存在则 sr02_2…）
function genNextNodeId() {
  const cur = (form.value.id || '').trim()
  if (!cur) { ElMessage.warning('请先输入节点 ID'); return }
  const exists = new Set(Object.keys(nodes.value))
  if (!exists.has(cur)) { form.value.id = cur; return }
  const m = cur.match(/^(.*?)(\d+)$/)
  let candidate = ''
  if (m) {
    // 末尾有数字：前缀 + 数字+1，继续递增直到不重复
    const pre = m[1], num = Number(m[2])
    let n = num + 1
    candidate = pre + n
    while (exists.has(candidate)) { n++; candidate = pre + n }
  } else {
    // 末尾无数字：追加 _1，已存在则 _2…
    let n = 1
    candidate = cur + '_' + n
    while (exists.has(candidate)) { n++; candidate = cur + '_' + n }
  }
  form.value.id = candidate
  ElMessage.success('已生成：' + form.value.id)
}
// 📦 右侧分区折叠状态（持久化到 localStorage，再次进入保持）
const SEC_KEY = 'dladmin_sec_collapsed'
const secCollapsed = reactive(JSON.parse(localStorage.getItem(SEC_KEY) || '{}'))
function toggleSec(key) {
  secCollapsed[key] = !secCollapsed[key]
  localStorage.setItem(SEC_KEY, JSON.stringify(secCollapsed))
}
const onStageMode = ref('none')
// 🛡️ 切换在场人数模式时，同步转换 onStage 的形态（single=字符串 / multi=数组）
watch(onStageMode, (mode) => {
  if (mode === 'multi' && typeof form.value.onStage === 'string' && form.value.onStage) {
    form.value.onStage = [form.value.onStage]
  } else if (mode === 'single' && Array.isArray(form.value.onStage)) {
    form.value.onStage = form.value.onStage[0] || ''
  } else if (mode === 'narration' || mode === 'none') {
    form.value.onStage = ''
    // 📖 旁白：说话人保持当前值（可输入如"系统"），默认空白由 emptyForm 决定
  }
})
// 🌟 多人模式：在场人物皮肤默认 moren（deep 监听 onStage 增删）
watch(() => form.value.onStage, (val) => {
  if (Array.isArray(val) && val.length) {
    val.forEach(pp => { if (form.value.npcSkins[pp] == null) form.value.npcSkins[pp] = 'moren' })
  }
}, { deep: true })

const nodeKeys = computed(() => Object.keys(nodes.value || {}))
// 🔀 节点分类：中转站（next 为条件跳转函数）/ 选项（带选项列表）/ 常规对话
function nodeCategory(id) {
  const nd = nodes.value[id]
  if (!nd) return ''
  if (typeof nd.next === 'function') return 'transit'
  if (nd.options?.length) return 'menu'
  return 'chat'
}
const nodeFilter = ref('')
const filteredKeys = computed(() => {
  const k = (kw.value || '').trim().toLowerCase()
  return nodeKeys.value.filter(id => {
    if (nodeFilter.value && nodeCategory(id) !== nodeFilter.value) return false
    if (!k) return true
    const nd = nodes.value[id]
    const hitId = id.toLowerCase().includes(k)
    const hitText = (typeof nd?.text === 'string' && nd.text.toLowerCase().includes(k))
    return hitId || hitText
  })
})

// ============ 对话流分组：把节点按「一段对话到结束」分类 ============
const nodeGroups = computed(() => {
  const ks = nodeKeys.value
  if (!ks.length) return []
  const isEndId = (id) => {
    const nd = nodes.value[id]
    return nd && nd.end != null && nd.end !== false && nd.end !== 0
  }
  const targetsOf = (id) => {
    const nd = nodes.value[id]
    if (!nd) return []
    const t = []
    if (nd.next) t.push(nd.next)
    if (Array.isArray(nd.options)) nd.options.forEach(o => o && o.next && t.push(o.next))
    return t
  }
  // 入边统计 + 父节点集合
  const indeg = {}
  const inParents = {}
  ks.forEach(id => { indeg[id] = 0; inParents[id] = [] })
  ks.forEach(id => targetsOf(id).forEach(t => {
    if (indeg[t] == null) return
    indeg[t]++
    if (!inParents[t].includes(id)) inParents[t].push(id)
  }))
  // 汇合菜单：被多处指向 且 自身有多个分支（如 sr10 买卖菜单）
  const isMenu = (id) => indeg[id] >= 2 && targetsOf(id).length >= 2
  // 入口：无入边起点 ∪ 汇合菜单 ∪ 由菜单单点指向的分支起点（如 sr20/sr30 话题段）
  const isEntry = (id) => {
    if (indeg[id] === 0) return true
    if (isMenu(id)) return true
    return inParents[id].length === 1 && isMenu(inParents[id][0])
  }
  const entries = ks.filter(id => !isEndId(id) && isEntry(id))
  const entrySet = new Set(entries)
  const visited = {}
  const groups = []
  entries.forEach(entry => {
    if (visited[entry]) return
    const ids = []
    const stack = [entry]                        // 🧭 深度优先：让对话链路（next）顺序相邻（sr02 → sr02b → sr02c）
    visited[entry] = true
    while (stack.length) {
      const cur = stack.pop()
      ids.push(cur)
      const ts = targetsOf(cur)
      for (let k = ts.length - 1; k >= 0; k--) { // 逆序入栈 → 保持选项顺序
        const t = ts[k]
        if (!nodes.value[t] || visited[t]) continue
        if (isEndId(t)) { visited[t] = true; ids.push(t); continue }   // end 节点归入本段
        if (t !== entry && entrySet.has(t)) continue                    // 汇合菜单/其它入口，不吞并
        visited[t] = true
        stack.push(t)
      }
    }
    groups.push({ entry, ids, count: ids.length, preview: buildGroupPreview(ids) })
  })
  // 兜底：未被覆盖的非 end 节点
  const rest = ks.filter(id => !visited[id] && !isEndId(id))
  if (rest.length) groups.push({ entry: '(其它)', ids: rest, count: rest.length, preview: '' })
  // 🔗 前驱并入：「插到选中前」产生的新节点（单节点组、next 指向组内节点）应并入目标组，
  //    并显示在目标节点上方（如 sr021 → sr02，sr021 显示在 sr02 上面），而不是另起分类
  const posOf = {}
  groups.forEach((g, gi) => g.ids.forEach((id, idx) => { posOf[id] = { gi, idx } }))
  const merged = new Set()
  groups.forEach((g, gi) => {
    if (merged.has(gi) || g.ids.length !== 1) return
    const nd = nodes.value[g.ids[0]]
    if (!nd || typeof nd.next !== 'string') return
    // 仅并入「插到选中前」物理位置产生的节点：本节点在文件中紧邻目标节点之前
    // （sr50/sr12 这类独立话题分支虽也指向 sr10，但位置在 sr10 之后，保持独立组）
    if (ks.indexOf(g.ids[0]) !== ks.indexOf(nd.next) - 1) return
    const t = posOf[nd.next]
    if (!t || t.gi === gi) return
    const tg = groups[t.gi]
    tg.ids.splice(t.idx, 0, g.ids[0])
    merged.add(gi)
  })
  const finalGroups = groups.filter((g, gi) => !merged.has(gi))
  finalGroups.forEach(g => { g.count = g.ids.length; g.preview = buildGroupPreview(g.ids) })
  return finalGroups
})

// 🔀 筛选后的分组：仍按「一段对话到结束」分组、可展开收起，组内只留命中的节点
const filteredGroups = computed(() => {
  if (!nodeFilter.value) return nodeGroups.value
  return nodeGroups.value
    .map(g => {
      const ids = g.ids.filter(id => nodeCategory(id) === nodeFilter.value)
      return { ...g, ids, count: ids.length }
    })
    .filter(g => g.count > 0)
})

// 收集皮肤：预设 + 从所有文件收集 npcSkin / playerSkin（惰性：点击 tab 时收集一次）
const allSkins = computed(() => {
  const set = new Set(SKIN_PRESETS)
  const collect = (obj) => {
    if (!obj || typeof obj !== 'object') return
    for (const k of Object.keys(obj)) {
      const v = obj[k]
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        if (typeof v.npcSkin === 'string') set.add(v.npcSkin)
        if (typeof v.playerSkin === 'string') set.add(v.playerSkin)
        collect(v.options)
      }
    }
  }
  collect(nodes.value)
  return [...set].sort()
})

// 👥 角色 → 拥有的皮肤：静态默认 + 从对话文件收集该角色实际用过的皮肤
const CHARACTER_SKIN_BASE = {
  player: ['moren'], // 玩家只有 moren 一套皮肤
}
const roleSkins = computed(() => {
  const map = {}
  for (const [r, skins] of Object.entries(CHARACTER_SKIN_BASE)) map[r] = new Set(skins)
  const collect = (obj) => {
    if (!obj || typeof obj !== 'object') return
    for (const k of Object.keys(obj)) {
      const v = obj[k]
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        if (typeof v.npcSkin === 'string') {
          const on = typeof v.onStage === 'string' ? v.onStage : (Array.isArray(v.onStage) ? v.onStage[0] : null)
          if (on) {
            if (!map[on]) map[on] = new Set()
            map[on].add(v.npcSkin)
          }
        } else if (v.npcSkin && typeof v.npcSkin === 'object' && !Array.isArray(v.npcSkin)) {
          for (const [name, skin] of Object.entries(v.npcSkin)) {
            if (!skin) continue
            if (!map[name]) map[name] = new Set()
            map[name].add(skin)
          }
        }
        if (typeof v.playerSkin === 'string') {
          if (!map.player) map.player = new Set()
          map.player.add(v.playerSkin)
        }
        collect(v.options)
      }
    }
  }
  collect(nodes.value)
  return map
})
// 🦴 角色 → 头像 spine 资源（带 head 才是对话头像，与 loadAssets.js 对应，用于枚举真实拥有的皮肤）
const ROLE_SPINE = {
  player: { skel: '/lihui/xzhujuehead.skel', atlas: '/lihui/xzhujuehead.atlas' },
  shangren1: { skel: '/lihui/shangren1head.skel', atlas: '/lihui/shangren1head.atlas' },
  shangren2: { skel: '/lihui/shangren2head.skel', atlas: '/lihui/shangren2head.atlas' },
  jingling: { skel: '/lihui/jinglinghead.skel', atlas: '/lihui/jinglinghead.atlas' },
  jinmao: { skel: '/lihui/jinmaohead.skel', atlas: '/lihui/jinmaohead.atlas' },
  yu: { skel: '/lihui/yuhead.skel', atlas: '/lihui/yuhead.atlas' },
  huli: { skel: '/lihui/hulihead.skel', atlas: '/lihui/hulihead.atlas' },
  maomi: { skel: '/lihui/maomihead.skel', atlas: '/lihui/maomihead.atlas' },
  heimi: { skel: '/lihui/heimi.skel', atlas: '/lihui/heimi.atlas' },
  fengxi: { skel: '/lihui/fengxihead.skel', atlas: '/lihui/fengxihead.atlas' },
}
// 枚举结果缓存：role → 真实皮肤列表
const roleSkinMap = reactive({}) // { role: string[] }

// ============ 🎬 头像动画预览（spine 渲染 + 循环播放，播完静止一小会） ============
const fxPreviewVisible = ref(false)
const fxPreviewBox = ref(null)
const fxPreviewInfo = ref('')
let fxPrevApp = null
let fxPrevSpine = null
let fxPrevContainer = null
let fxPrevTimer = null
let fxPrevRole = null
const fxPreviewFx = ref(null)
// 🎨 皮肤预览（内联 fixed，不弹窗）
const skinPrevVisible = ref(false)
const skinPrevInfo = ref('')
const skinPrevBox = ref(null)
let skinPrevApp = null
let skinPrevSpine = null
let skinPrevRole = ''
async function openFxPreview(item) {
  if (!item || !item.fx) { ElMessage.warning('请先选择要预览的动画'); return }
  // 目标角色：条目选了目标用目标；没选（作用于当前说话者）→ 单人 onStage，否则玩家
  let role = item.target && item.target !== 'player' ? item.target : null
  if (!role && onStageMode.value === 'single' && form.value.onStage) role = form.value.onStage
  const cfg = (role && ROLE_SPINE[role]) || ROLE_SPINE.player
  fxPreviewInfo.value = `目标：${role || '当前说话者'} · 动画：${item.fx}`
  fxPreviewVisible.value = true
  await nextTick()
  try {
    if (!fxPrevApp && fxPreviewBox.value) {
      fxPrevApp = new Application()
      await fxPrevApp.init({ width: 480, height: 300, backgroundAlpha: 0, antialias: true, autoDensity: true, resolution: window.devicePixelRatio || 1 })
      fxPreviewBox.value.appendChild(fxPrevApp.canvas)
    }
    // 注册并加载角色头像 spine（与游戏端一致的别名加载方式）
    const skelKey = (role || 'player') + '_skel'
    const atlasKey = (role || 'player') + '_atlas'
    if (!Assets.cache.has(skelKey)) {
      Assets.add({ alias: skelKey, src: cfg.skel })
      Assets.add({ alias: atlasKey, src: cfg.atlas })
      await Assets.load([skelKey, atlasKey])
    }
    // 重建 spine（每次预览都重建，避免残留动画状态）
    if (fxPrevSpine) { fxPrevSpine.destroy({ children: true }); fxPrevSpine = null }
    fxPrevSpine = new Spine({ skeleton: skelKey, atlas: atlasKey, allowMissingRegions: true })
    // 默认皮肤 moren（有则设）
    const defSkin = fxPrevSpine.skeleton.data.findSkin('moren')
    if (defSkin) { fxPrevSpine.skeleton.setSkin(defSkin); fxPrevSpine.skeleton.setupPoseSlots() }
    // 头像包一层容器：AVATAR_FX 是容器 tween 动画（位移/缩放/旋转），不是 spine 动画
    if (fxPrevContainer) { fxPrevContainer.destroy({ children: true }); fxPrevContainer = null }
    fxPrevContainer = new Container()
    fxPrevApp.stage.addChild(fxPrevContainer)
    fxPrevContainer.addChild(fxPrevSpine)
    // 居中缩放适配（spine-pixi-v8 的 Spine 无 anchor，用 bounds 计算居中）
    const b = fxPrevSpine.getLocalBounds()
    if (b && b.width > 0) {
      const scale = Math.min(300 / b.width, 230 / b.height, 3)
      fxPrevSpine.scale.set(scale)
      fxPrevSpine.x = 240 - (b.x + b.width / 2) * scale
      fxPrevSpine.y = 170 - (b.y + b.height / 2) * scale
    } else {
      fxPrevSpine.x = 240
      fxPrevSpine.y = 170
    }
    // 播放头像基础动画（静置展示用）
    const _anims = fxPrevSpine.skeleton.data.animations
    const _baseAnim = _anims && (_anims.some(a => a.name === 'animation') ? 'animation' : (_anims.length ? _anims[0].name : null))
    if (_baseAnim) fxPrevSpine.state.setAnimation(0, _baseAnim, true)
    // 播放容器 tween 动画一次（点“播放”可再播）
    fxPrevRole = role
    fxPreviewFx.value = item.fx
    playFxPrevOnce(item.fx)
  } catch (e) {
    console.warn('[预览] 加载失败', e)
    ElMessage.error('预览加载失败：' + (e && e.message ? e.message : e))
  }
}
// AVATAR_FX 容器动画配置（与 duihua.vue 一致，ticker 驱动）
const AVATAR_FX_PREVIEW = {
  shake: { type: 'shake', duration: 0.5, intensity: 10 },
  pulse: { type: 'pulse', duration: 0.6, scaleTo: 1.25 },
  pop: { type: 'pulse', duration: 0.45, scaleTo: 1.35 },
  bounce: { type: 'bounce', duration: 0.7, height: 10 },
  angry: { type: 'angry', duration: 0.8, intensity: 8, scaleTo: 1.15 },
  sad: { type: 'sad', duration: 0.9, drop: 8 },
  nervous: { type: 'shake', duration: 0.7, intensity: 4 },
  sway: { type: 'sway', duration: 0.8, distance: 14, times: 3 },
  hop: { type: 'bounce', duration: 0.8, height: 14, times: 3 },
  spin: { type: 'spin', duration: 0.9, angle: 0.9, times: 1 },
  excited: { type: 'excited', duration: 0.9, scaleTo: 1.3, height: 12 },
  laugh: { type: 'laugh', duration: 0.9, intensity: 6, angle: 0.25 },
  announce: { type: 'pulse', duration: 0.8, scaleTo: 1.2 },
  sob: { type: 'sob', duration: 1.0, drop: 8 },
  shrink: { type: 'shrink', duration: 0.6, amount: 0.18 },
  awkward: { type: 'shrink', duration: 0.8, amount: 0.12, times: 2 },
  tilt: { type: 'tilt', duration: 0.7, angle: 0.35 },
  sneer: { type: 'sway', duration: 1.0, distance: 10, times: 2, angle: 0.2 },
  dizzy: { type: 'spin', duration: 1.1, angle: 0.5, times: 3 },
  shy: { type: 'tilt', duration: 1.0, angle: -0.3, times: 2 },
  nod: { type: 'bounce', duration: 0.5, height: 5, times: 1 },
  headshake: { type: 'sway', duration: 0.6, distance: 9, times: 2 },
  think: { type: 'sway', duration: 1.2, distance: 6, times: 1 },
  gentle: { type: 'sway', duration: 1.2, distance: 6, times: 1, angle: 0.1 },
  cute: { type: 'bounce', duration: 0.7, height: 12, times: 2 },
  proud: { type: 'sway', duration: 0.9, distance: 8, times: 2, angle: 0.15 },
  tired: { type: 'sad', duration: 1.3, drop: 6 },
  yawn: { type: 'pulse', duration: 1.5, scaleTo: 1.08 },
  shiver: { type: 'shake', duration: 0.6, intensity: 3 },
  frantic: { type: 'shake', duration: 0.6, intensity: 12, angle: 0.1 },
  alert: { type: 'pulse', duration: 0.5, scaleTo: 1.1 },
  moved: { type: 'sob', duration: 1.2, drop: 4 },
  speechless: { type: 'tilt', duration: 1.2, angle: -0.15 },
  dazzled: { type: 'pulse', duration: 0.6, scaleTo: 1.4 },
  sneaky: { type: 'sway', duration: 1.4, distance: 4, times: 1 },
  surpriseBack: { type: 'shrink', duration: 0.4, amount: 0.12 },
  impact: { type: 'squash', duration: 0.4, amount: 0.25, times: 1 },
  stretch: { type: 'squash', duration: 1.0, amount: 0.12, times: 2 },
  cartoonJump: { type: 'excited', duration: 0.8, scaleTo: 1.25, height: 16, squash: 0.15 },
}
// 在容器上跑一次 tween（与 runAvatarFxTween 同逻辑；完成后复位并回调）
function runFxPrevTween(fx, container, app, onDone) {
  if (!container || !app) { onDone && onDone(); return }
  const spec = typeof fx === 'string' ? AVATAR_FX_PREVIEW[fx] : fx
  if (!spec || !spec.type) { onDone && onDone(); return }
  const baseX = container.x || 0
  const baseY = container.y || 0
  const baseScale = container.scale?.x ?? 1
  const baseRot = container.rotation ?? 0
  const dur = (spec.duration || 0.6) * 1000
  const start = app.ticker.lastTime
  const amp = spec.intensity ?? 8
  const scaleTo = spec.scaleTo ?? 1.25
  const times = spec.times ?? 1
  const tick = () => {
    const p = Math.min(1, (app.ticker.lastTime - start) / dur)
    const wave = Math.sin(p * Math.PI)
    switch (spec.type) {
      case 'shake': {
        const a = amp * (1 - p)
        container.position.set(baseX + (Math.random() * 2 - 1) * a, baseY + (Math.random() * 2 - 1) * a)
        if (spec.angle) container.rotation = baseRot + Math.sin(p * Math.PI * 8) * spec.angle * (1 - p)
        break
      }
      case 'pulse': {
        const s = baseScale + (scaleTo - 1) * wave
        container.scale.set(s, s)
        break
      }
      case 'bounce': {
        const b = Math.abs(Math.sin(p * Math.PI * times)) * (spec.height ?? 10)
        container.position.y = baseY - b
        break
      }
      case 'angry': {
        const a = amp * (1 - p)
        container.position.x = baseX + Math.sin(p * Math.PI * 10) * a
        const s = baseScale + (scaleTo - 1) * wave
        container.scale.set(s, s)
        break
      }
      case 'sad': {
        container.position.y = baseY + (spec.drop ?? 8) * wave
        break
      }
      case 'sway': {
        container.position.x = baseX + Math.sin(p * Math.PI * times) * (spec.distance ?? 12)
        if (spec.angle) container.rotation = baseRot + Math.sin(p * Math.PI * times) * spec.angle
        break
      }
      case 'spin': {
        container.rotation = baseRot + Math.sin(p * Math.PI * times) * (spec.angle ?? 0.9)
        break
      }
      case 'tilt': {
        container.rotation = baseRot + (spec.angle ?? 0.35) * Math.sin(p * Math.PI * times)
        break
      }
      case 'shrink': {
        const dip = (spec.amount ?? 0.15) * Math.abs(Math.sin(p * Math.PI * times))
        const s = baseScale - dip
        container.scale.set(s, s)
        break
      }
      case 'sob': {
        const jitter = (Math.random() * 2 - 1) * 1.5 * (1 - p)
        container.position.y = baseY + (spec.drop ?? 8) * wave + jitter
        break
      }
      case 'laugh': {
        const a = amp * (1 - p)
        container.position.x = baseX + Math.sin(p * Math.PI * 8) * a
        container.rotation = baseRot + Math.sin(p * Math.PI * 4) * (spec.angle ?? 0.25) * (1 - p)
        break
      }
      case 'excited': {
        let s = baseScale + (scaleTo - 1) * wave
        if (spec.squash) {
          const sq = spec.squash * Math.abs(Math.sin(p * Math.PI * 2))
          container.scale.set(s * (1 - sq), s * (1 + sq))
        } else {
          container.scale.set(s, s)
        }
        container.position.y = baseY - (spec.height ?? 12) * Math.abs(Math.sin(p * Math.PI * 2))
        break
      }
      case 'squash': {
        const sq = (spec.amount ?? 0.15) * Math.abs(Math.sin(p * Math.PI * times))
        container.scale.set(baseScale * (1 - sq), baseScale * (1 + sq))
        break
      }
    }
    if (p >= 1) {
      app.ticker.remove(tick)
      container.position.set(baseX, baseY)
      container.scale.set(baseScale, baseScale)
      container.rotation = baseRot
      onDone && onDone()
    }
  }
  app.ticker.add(tick)
}
// 弹窗内点击动画 → 切换并立即播一次
function onFxPrevSwitchBy(fx) {
  if (!fx) return
  fxPreviewFx.value = fx
  fxPreviewInfo.value = `目标：${fxPrevRole || '当前说话者'} · 动画：${fx}`
  playFxPrevOnce(fx)
}
// 播放容器动画一次（打开预览时播一次；点击“▶ 播放”再播一次）
function playFxPrevOnce(fx) {
  clearTimeout(fxPrevTimer)
  if (!AVATAR_FX_PREVIEW[fx]) { ElMessage.warning(`该动画「${fx}」不存在`); return }
  if (!fxPreviewVisible.value || !fxPrevApp || !fxPrevContainer) return
  runFxPrevTween(fx, fxPrevContainer, fxPrevApp, null)
}
// 🎨 皮肤预览：内联渲染角色头像 + 指定皮肤（不弹窗，fixed 右上角）
async function openSkinPreview(role, skin) {
  skinPrevVisible.value = true
  await nextTick()
  try {
    const cfg = (role && ROLE_SPINE[role]) || ROLE_SPINE.player
    if (!skinPrevApp && skinPrevBox.value) {
      skinPrevApp = new Application()
      await skinPrevApp.init({ width: 170, height: 170, backgroundAlpha: 0, antialias: true, autoDensity: true, resolution: window.devicePixelRatio || 1 })
      skinPrevBox.value.appendChild(skinPrevApp.canvas)
    }
    // 🆕 同角色复用已有 spine，只切换皮肤（实时刷新不闪烁）；角色变化才重建
    const sameRole = skinPrevRole === role && skinPrevSpine
    if (!sameRole) {
      const skelKey = (role || 'player') + '_skel'
      const atlasKey = (role || 'player') + '_atlas'
      if (!Assets.cache.has(skelKey)) {
        Assets.add({ alias: skelKey, src: cfg.skel })
        Assets.add({ alias: atlasKey, src: cfg.atlas })
        await Assets.load([skelKey, atlasKey])
      }
      if (skinPrevSpine) { skinPrevSpine.destroy({ children: true }); skinPrevSpine = null }
      skinPrevSpine = new Spine({ skeleton: skelKey, atlas: atlasKey, allowMissingRegions: true })
      skinPrevApp.stage.addChild(skinPrevSpine)
      // 播放基础动画（仅新建时）
      const _anims = skinPrevSpine.skeleton.data.animations
      const _baseAnim = _anims && (_anims.some(a => a.name === 'animation') ? 'animation' : (_anims.length ? _anims[0].name : null))
      if (_baseAnim) skinPrevSpine.state.setAnimation(0, _baseAnim, true)
    }
    skinPrevRole = role
    // 应用皮肤（空 → moren；有则设）——同角色下拉改变时实时刷新
    const sname = skin || 'moren'
    const sk = skinPrevSpine.skeleton.data.findSkin(sname)
    if (sk) { skinPrevSpine.skeleton.setSkin(sk); skinPrevSpine.skeleton.setupPoseSlots() }
    skinPrevSpine.update(0.05)
    // 🆕 每次应用皮肤后都按最新 bounds 重新居中缩放（避免切皮肤后局部放大/偏移）
    const b = skinPrevSpine.getLocalBounds()
    const cw = 170, ch = 170
    if (b && b.width > 0) {
      const scale = Math.min(cw / b.width, ch / b.height, 4)
      skinPrevSpine.scale.set(scale)
      skinPrevSpine.x = cw / 2 - (b.x + b.width / 2) * scale
      skinPrevSpine.y = ch / 2 - (b.y + b.height / 2) * scale
    } else {
      skinPrevSpine.x = cw / 2
      skinPrevSpine.y = ch / 2
    }
    skinPrevInfo.value = `${role || 'player'} · ${sname}`
  } catch (e) {
    console.warn('[皮肤预览] 加载失败', e)
    ElMessage.error('皮肤预览失败：' + (e && e.message ? e.message : e))
  }
}
// 🆕 皮肤下拉改变 → 若预览正打开且目标角色一致，则实时刷新预览
function onSkinChanged(role, skin) {
  if (!skinPrevVisible.value) return
  if (skinPrevRole !== role) return
  openSkinPreview(role, skin)
}
function closeSkinPreview() {
  skinPrevVisible.value = false
  if (skinPrevSpine) { skinPrevSpine.destroy({ children: true }); skinPrevSpine = null }
  if (skinPrevApp) { skinPrevApp.destroy({ children: true, texture: true, textureSource: true, releaseGlobalResources: false }); skinPrevApp = null }
  if (skinPrevBox.value) skinPrevBox.value.innerHTML = ''
}
function closeFxPreview() {
  clearTimeout(fxPrevTimer)
  if (fxPrevContainer) { fxPrevContainer.destroy({ children: true }); fxPrevContainer = null }
  if (fxPrevSpine) { fxPrevSpine = null }
  if (fxPrevApp) { fxPrevApp.destroy({ children: true, texture: true, textureSource: true, releaseGlobalResources: false }); fxPrevApp = null }
  if (fxPreviewBox.value) fxPreviewBox.value.innerHTML = ''
}
async function fetchRoleSkins(role) {
  const cfg = ROLE_SPINE[role]
  if (!cfg) return null
  try {
    const [skelResp, atlasResp] = await Promise.all([
      fetch(cfg.skel).then(r => (r.ok ? r.arrayBuffer() : null)),
      fetch(cfg.atlas).then(r => (r.ok ? r.text() : null)),
    ])
    if (!skelResp || !atlasResp) return null
    // 解析 atlas（dummy 纹理即可，枚举 skin 不依赖真实纹理）
    const atlas = new TextureAtlas(atlasResp, () => ({}))
    const loader = new AtlasAttachmentLoader(atlas)
    let data
    if (/.json$/.test(cfg.skel)) {
      data = new SkeletonJson(loader).readSkeletonData(new TextDecoder().decode(skelResp))
    } else {
      data = new SkeletonBinary(loader).readSkeletonData(new Uint8Array(skelResp))
    }
    const names = data.skins.map(sk => sk.name).filter(n => n && n !== 'default') // 过滤编辑器默认的 default 皮肤
    return names.length ? names : null
  } catch (e) {
    console.warn('[角色皮肤] 枚举失败', role, e)
    return null
  }
}
// 确保某个角色皮肤已加载（幂等；加载完成后 reactive 触发重渲染）
function ensureRoleSkins(role) {
  if (!role || roleSkinMap[role] !== undefined) return
  roleSkinMap[role] = null // 标记加载中/失败，避免重复请求
  fetchRoleSkins(role).then(names => { roleSkinMap[role] = names || null })
}
// 目标角色的可选皮肤：优先用 spine 真实拥有的皮肤；未枚举到 → 收集的 → 兜底全部
function skinsForRole(role) {
  ensureRoleSkins(role)
  if (roleSkinMap[role] && roleSkinMap[role].length) return [...roleSkinMap[role]].sort()
  if (role === 'player') return [...(roleSkins.value.player || ['moren'])].sort()
  const set = roleSkins.value[role]
  if (set && set.size) return [...set].sort()
  return allSkins.value
}

// ============ 加载文件 ============
// 左栏滚动位置保持（写入项目 / 重新加载后不跳顶）
const leftListRef = ref(null)
const rightPanelRef = ref(null) // 📋 右侧编辑面板（保存/恢复滚动位置）
let savedLeftTop = 0
function saveLeftScroll() { savedLeftTop = leftListRef.value?.scrollTop ?? 0 }
function restoreLeftScroll() {
  nextTick(() => { const el = leftListRef.value; if (el) el.scrollTop = savedLeftTop })
}
// 💡 已加载提示防重：写入项目可能触发 HMR/页面重载导致 loadFile 连调两次，2 秒内只提示一次
//    （状态挂 window，避免模块热重载时变量重置导致防重失效）
let _lastLoadToast = (window.__dladmin_lastLoadToast = window.__dladmin_lastLoadToast || { t: 0 })
async function loadFile() {
  saveLeftScroll()
  loadingFile.value = true
  try {
    const key = `./data/npc/${curFile.value}.js`
    const mod = mods[key]
    if (!mod) { ElMessage.warning('未找到文件'); return }
    const loaded = await mod()
    // 兼容命名导出分片文件（如 jingling-yushi.js: export const yushiDialogues = {...}）
    let data = loaded.default
    if (!data || typeof data !== 'object') {
      const named = Object.keys(loaded).find(k => loaded[k] && typeof loaded[k] === 'object' && !Array.isArray(loaded[k]))
      data = named ? loaded[named] : {}
    }
    nodes.value = data
    computeCanvasLayout()
    if (leftMode.value === 'canvas') nextTick(() => drawCanvas())
    // 抓取源码文本：运行时对象会丢失 cond.all(...) 等工厂调用的参数，需从源码还原
    try {
      const resp = await fetch(`/src/pages/pixi/dialogue/data/npc/${curFile.value}.js`)
      rawFile.value = resp.ok ? await resp.text() : ''
    } catch (e) { rawFile.value = '' }
    selNodeId.value = null
    form.value = emptyForm()
    genCode.value = ''
    // 🔖 恢复选中：写入项目后回到写入前选中的节点（列表滚动居中 / 画布镜头跟随）
    const restoreId = sessionStorage.getItem('dladmin_restore')
    if (restoreId) {
      sessionStorage.removeItem('dladmin_restore')
      if (nodes.value[restoreId]) {
        selectNode(restoreId)
        nextTick(() => {
          const g = nodeGroups.value.find(gr => gr.ids.includes(restoreId))
          if (g && collapsedGroups[g.entry]) collapsedGroups[g.entry] = false
          nextTick(() => {
            const el = leftListRef.value?.querySelector('[data-nid="' + CSS.escape(String(restoreId)) + '"]')
            if (el) el.scrollIntoView({ block: 'center' })
            if (leftMode.value === 'canvas') focusCanvasNode(restoreId)
            // 📜 还原右侧编辑面板滚动位置（面板内容渲染可能滞后，延迟重试 + 超界钳制）
            const rt = Number(sessionStorage.getItem('dladmin_restore_rt') || 0)
            if (rt > 0) {
              sessionStorage.removeItem('dladmin_restore_rt')
              const applyRt = () => {
                const el = rightPanelRef.value
                if (el) {
                  const max = Math.max(0, el.scrollHeight - el.clientHeight)
                  el.scrollTop = Math.min(rt, max)
                }
              }
              applyRt()
              setTimeout(applyRt, 100)
              setTimeout(applyRt, 400)
            }
          })
        })
      }
    }
    const _now = Date.now()
    if (_now - _lastLoadToast.t > 2000) {
      _lastLoadToast.t = _now
      ElMessage.success(`已加载 ${curFile.value}.js`)
    }
  } catch (e) {
    console.error('[dladmin] 加载失败', e)
    ElMessage.error('加载失败：' + (e?.message || e))
  } finally {
    loadingFile.value = false
    restoreLeftScroll()
  }
}

// ============ 节点选择 ============
function isEnd(nd) {
  return nd?.end != null && nd.end !== false && nd.end !== 0
}
function nodePreview(id) {
  const nd = nodes.value[id]
  if (!nd) return ''
  let t = typeof nd.text === 'string' ? nd.text : (typeof nd.text === 'function' ? '[函数文本]' : '')
  if (t.startsWith('i18n:')) t = t.slice(5)
  if (!t && nd.options?.length) t = '（选项菜单：' + nd.options.map(o => typeof o.text === 'string' ? o.text : '?').join(' / ') + '）'
  return t || '（无文本）'
}
// 🔖 节点类型标签：一段对话里这个节点是干什么的
function nodeType(id) {
  const nd = nodes.value[id]
  if (!nd) return ''
  if (isEnd(nd)) return '结束'
  if (nd.options?.length) return '选项'
  if (typeof nd.text === 'function') return '动态'
  if (nd.next) return '对话'
  return '节点'
}
// 📝 节点简短描述（类型 + 功能 + 文本摘要）
function nodeDesc(id) {
  const nd = nodes.value[id]
  if (!nd) return ''
  const descs = []
  if (isEnd(nd)) descs.push('结束对话')
  if (nd.options?.length) descs.push('选项：' + nd.options.map(o => typeof o.text === 'string' ? o.text.slice(0, 5) : '?').join('/'))
  if (nd.onEnter) descs.push('进入执行逻辑')
  if (nd.repeatable) descs.push('可重复')
  const t = nd.text
  if (typeof t === 'function') descs.push('动态文本')
  else if (typeof t === 'string' && t.trim()) descs.push(t.slice(0, 22))
  return descs.filter(Boolean).join(' · ') || '（空节点）'
}
// ➖ 对话段判定：当前节点顶层 next 恰好指向列表下一个节点 → 同段无缝；否则该节点底部画分隔线
function hasSegBreak(ids, i) {
  const a = nodes.value[ids[i]]
  const b = ids[i + 1]
  if (!a) return true
  return !(typeof a.next === 'string' && a.next === b)
}
// ============ 🕸 画布模式：节点可拖动 + next 连线视图 ============
const NODE_W = 140
const NODE_H = 50
const leftMode = ref('list')
// 📱 移动端适配：按屏幕大小判断（window.screen.width < 768 = 真手机/小屏设备；桌面浏览器窗口缩放/拉窄不影响）
const isMobile = ref(false)
let _mqClean = null
if (typeof window !== 'undefined') {
  const _updateMobile = () => {
    const w = (typeof window.screen !== 'undefined' && window.screen.width) ? window.screen.width : window.innerWidth
    isMobile.value = w < 1024
  }
  _updateMobile()
  window.addEventListener('resize', _updateMobile)
  _mqClean = () => window.removeEventListener('resize', _updateMobile)
}
onUnmounted(() => { if (_mqClean) _mqClean() })
const canvasWrapRef = ref(null)
const canvasNodes = ref([])
const canvasSel = ref(null)
const canvasDrag = ref(null)
const CANVAS_COLORS = { '结束': '#f87171', '菜单': '#c084fc', '动态': '#fbbf24', '对话': '#38bdf8', '节点': '#94a3b8' }
function canvasStorageKey() { return 'dladmin_canvas_' + (curFile.value || '') }
function loadCanvasSaved() { try { return JSON.parse(localStorage.getItem(canvasStorageKey()) || '{}') } catch (e) { return {} } }
function saveCanvasPos() {
  const obj = {}
  for (const n of canvasNodes.value) obj[n.id] = { x: n.x, y: n.y }
  localStorage.setItem(canvasStorageKey(), JSON.stringify(obj))
}
function computeCanvasLayout() {
  const ids = Object.keys(nodes.value)
  if (!ids.length) { canvasNodes.value = []; return }
  // 收集节点所有跳转目标：顶层 next + 每个选项的 next
  const targetsOf = (id) => {
    const nd = nodes.value[id]
    if (!nd) return []
    const t = []
    if (typeof nd.next === 'string') t.push(nd.next)
    if (Array.isArray(nd.options)) nd.options.forEach(o => { if (o && typeof o.next === 'string') t.push(o.next) })
    return t
  }
  const hasPred = {}
  for (const id of ids) targetsOf(id).forEach(nx => { if (nodes.value[nx]) hasPred[nx] = true })
  const depth = {}
  for (const id of ids) depth[id] = hasPred[id] ? null : 0
  // 深度传播：sr01(0) → 选项 sr02/sr03/sr04(1) → sr02b(2) → …不断向右延伸
  for (let k = 0; k < ids.length; k++) {
    for (const id of ids) {
      if (depth[id] === null) continue
      const d = depth[id]
      for (const nx of targetsOf(id)) {
        if (!nodes.value[nx]) continue
        const cand = d + 1
        if (depth[nx] === null || cand < depth[nx]) depth[nx] = cand
      }
    }
  }
  for (const id of ids) if (depth[id] === null) depth[id] = 0
  const cols = {}
  for (const id of ids) { const d = depth[id] || 0; (cols[d] = cols[d] || []).push(id) }
  const saved = loadCanvasSaved()
  const gapX = NODE_W + 50, gapY = 18
  const arr = []
  for (const d of Object.keys(cols).map(Number).sort((a, b) => a - b)) {
    cols[d].forEach((id, i) => {
      const pos = saved[id] || { x: d * gapX + 12, y: i * (NODE_H + gapY) + 12 }
      arr.push({ id, x: pos.x, y: pos.y })
    })
  }
  canvasNodes.value = arr
}
// 🎯 画布镜头聚焦：让指定节点居中显示（列表选中后切到画布时调用）
function focusCanvasNode(id) {
  const wrap = canvasWrapRef.value
  if (!wrap) return
  const n = canvasNodes.value.find(x => x.id === id)
  if (!n) return
  const cw = wrap.clientWidth, ch = wrap.clientHeight
  if (cw <= 0 || ch <= 0) return
  const s = viewScale.value
  viewOffset.value.x = cw / 2 - (n.x + NODE_W / 2) * s
  viewOffset.value.y = ch / 2 - (n.y + NODE_H / 2) * s
  wrap.scrollLeft = 0
  wrap.scrollTop = 0
  drawCanvas()
}
const canvasSize = computed(() => {
  let w = 400, h = 300
  for (const n of canvasNodes.value) {
    w = Math.max(w, n.x + NODE_W + 40)
    h = Math.max(h, n.y + NODE_H + 40)
  }
  return { w, h }
})
const canvasEdges = computed(() => {
  const edges = []
  for (const n of canvasNodes.value) {
    const nd = nodes.value[n.id]
    if (!nd) continue
    // 收集所有跳转目标：顶层 next + 每个选项的 next（sr01 三个选项 → 三条连线）
    const targets = []
    if (typeof nd.next === 'string') targets.push(nd.next)
    if (Array.isArray(nd.options)) nd.options.forEach(o => { if (o && typeof o.next === 'string') targets.push(o.next) })
    const seen = new Set()
    for (const nx of targets) {
      if (seen.has(nx)) continue
      seen.add(nx)
      if (!nodes.value[nx]) continue
      const t = canvasNodes.value.find(m => m.id === nx)
      if (!t) continue
      const x1 = n.x + NODE_W, y1 = n.y + NODE_H / 2
      const x2 = t.x, y2 = t.y + NODE_H / 2
      const mx = (x1 + x2) / 2
      edges.push({ id: n.id + '->' + nx, x1, y1, x2, y2, mx, active: canvasSel.value === n.id || canvasSel.value === nx })
    }
  }
  return edges
})
// ============ 🖼 Canvas 渲染与交互（缩放/平移/拖拽） ============
const canvasEl = ref(null)
const canvasCtx = ref(null)
const viewScale = ref(1)
const viewOffset = ref({ x: 24, y: 24 })
let canvasRO = null
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
function drawNode(ctx, nd) {
  const c = CANVAS_COLORS[nodeType(nd.id)] || '#94a3b8'
  const active = canvasSel.value === nd.id
  const x = nd.x, y = nd.y
  rr(ctx, x, y, NODE_W, NODE_H, 8)
  ctx.fillStyle = active ? 'rgba(251,191,36,.14)' : 'rgba(20,24,33,.95)'
  ctx.fill()
  ctx.lineWidth = active ? 2 : 1
  ctx.strokeStyle = active ? '#fbbf24' : c
  ctx.stroke()
  // id（金色粗体，放大）
  ctx.fillStyle = '#fbbf24'
  ctx.font = 'bold 14px monospace'
  ctx.textBaseline = 'middle'
  const idW = ctx.measureText(nd.id).width
  ctx.fillText(nd.id, x + 8, y + 13)
  // 类型徽标
  const t = nodeType(nd.id)
  if (t) {
    ctx.font = '9px sans-serif'
    const tw = ctx.measureText(t).width
    const bx = x + 8 + idW + 6
    if (bx + tw + 8 < x + NODE_W - 4) {
      ctx.fillStyle = c + '22'
      rr(ctx, bx, y + 6.5, tw + 8, 13, 4)
      ctx.fill()
      ctx.fillStyle = c
      ctx.fillText(t, bx + 4, y + 13.5)
    }
  }
  // 摘要（截断）
  ctx.font = '10px sans-serif'
  ctx.fillStyle = 'rgba(156,163,175,.85)'
  ctx.save()
  ctx.beginPath()
  ctx.rect(x + 8, y + 24, NODE_W - 16, NODE_H - 28)
  ctx.clip()
  const desc = nodeDesc(nd.id)
  ctx.fillText(desc, x + 8, y + 34)
  ctx.restore()
}
function drawEdge(ctx, e) {
  ctx.strokeStyle = e.active ? '#fbbf24' : '#4b5563'
  ctx.lineWidth = e.active ? 2.5 : 1.5
  ctx.globalAlpha = 0.85
  ctx.beginPath()
  ctx.moveTo(e.x1, e.y1)
  ctx.bezierCurveTo(e.mx, e.y1, e.mx, e.y2, e.x2, e.y2)
  ctx.stroke()
  // 终点箭头（朝右进入目标）
  const asz = 6
  ctx.fillStyle = e.active ? '#fbbf24' : '#4b5563'
  ctx.beginPath()
  ctx.moveTo(e.x2, e.y2)
  ctx.lineTo(e.x2 - asz, e.y2 - asz * 0.6)
  ctx.lineTo(e.x2 - asz, e.y2 + asz * 0.6)
  ctx.closePath()
  ctx.fill()
  ctx.globalAlpha = 1
}
function drawCanvas() {
  const c = canvasEl.value
  if (!c) return
  if (!canvasCtx.value) canvasCtx.value = c.getContext('2d')
  const ctx = canvasCtx.value
  const dpr = window.devicePixelRatio || 1
  const w = c.clientWidth || 0, h = c.clientHeight || 0
  if (w <= 0 || h <= 0) return
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr) }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)
  ctx.save()
  ctx.translate(viewOffset.value.x, viewOffset.value.y)
  ctx.scale(viewScale.value, viewScale.value)
  for (const e of canvasEdges.value) drawEdge(ctx, e)
  for (const nd of canvasNodes.value) drawNode(ctx, nd)
  ctx.restore()
}
function screenToWorld(ev) {
  const c = canvasEl.value
  if (!c) return { x: 0, y: 0 }
  const rect = c.getBoundingClientRect()
  const sx = ev.clientX - rect.left, sy = ev.clientY - rect.top
  return { x: (sx - viewOffset.value.x) / viewScale.value, y: (sy - viewOffset.value.y) / viewScale.value }
}
function hitNode(wx, wy) {
  for (const nd of canvasNodes.value) {
    if (wx >= nd.x && wx <= nd.x + NODE_W && wy >= nd.y && wy <= nd.y + NODE_H) return nd
  }
  return null
}
// 📱 触摸支持：单指拖空白=平移，双指捏合=缩放（桌面仍走中键平移/Ctrl滚轮缩放）
const canvasPointers = new Map()
let canvasPinch = null
function onCanvasPointerDown(ev) {
  if (!canvasEl.value) return
  canvasPointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY })
  // 左键：命中节点 → 拖节点；未命中 → 触摸时单指拖空白平移，鼠标不操作（平移改由中键）
  if (ev.button === 0) {
    const wpt = screenToWorld(ev)
    const nd = hitNode(wpt.x, wpt.y)
    try { canvasEl.value.setPointerCapture?.(ev.pointerId) } catch (e) { }
    if (nd) {
      canvasSel.value = nd.id
      selectNode(nd.id)
      canvasDrag.value = { id: nd.id, offX: wpt.x - nd.x, offY: wpt.y - nd.y, moved: false, sx: ev.clientX, sy: ev.clientY }
      drawCanvas()
    } else if (ev.pointerType === 'touch') {
      // 📱 触摸空白处：单指拖动 = 平移画布
      canvasPan.value = { startX: ev.clientX, startY: ev.clientY, ox: viewOffset.value.x, oy: viewOffset.value.y, moved: false }
    } else {
      canvasDrag.value = null
    }
    return
  }
  // 中键：拖动空白平移画布（右键被手势软件占用，不用）
  if (ev.button === 1) {
    try { canvasEl.value.setPointerCapture?.(ev.pointerId) } catch (e) { }
    canvasPan.value = { startX: ev.clientX, startY: ev.clientY, ox: viewOffset.value.x, oy: viewOffset.value.y, moved: false }
  }
}
function onCanvasPointerMove(ev) {
  if (canvasPointers.has(ev.pointerId)) { const p = canvasPointers.get(ev.pointerId); p.x = ev.clientX; p.y = ev.clientY }
  // 📱 双指捏合缩放（触摸，且未在拖节点）
  if (canvasPointers.size >= 2 && !canvasDrag.value) {
    const pts = [...canvasPointers.values()]
    const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
    if (!canvasPinch) canvasPinch = { d, scale: viewScale.value }
    else if (canvasPinch.d > 0) {
      viewScale.value = Math.min(3, Math.max(0.2, canvasPinch.scale * (d / canvasPinch.d)))
      drawCanvas()
    }
    return
  }
  if (canvasDrag.value) {
    const wpt = screenToWorld(ev)
    const nd = canvasNodes.value.find(n => n.id === canvasDrag.value.id)
    if (nd) {
      nd.x = Math.max(0, wpt.x - canvasDrag.value.offX)
      nd.y = Math.max(0, wpt.y - canvasDrag.value.offY)
      if (Math.abs(ev.clientX - canvasDrag.value.sx) + Math.abs(ev.clientY - canvasDrag.value.sy) > 4) canvasDrag.value.moved = true
      drawCanvas()
    }
  } else if (canvasPan.value) {
    viewOffset.value.x = canvasPan.value.ox + (ev.clientX - canvasPan.value.startX)
    viewOffset.value.y = canvasPan.value.oy + (ev.clientY - canvasPan.value.startY)
    if (Math.abs(ev.clientX - canvasPan.value.startX) + Math.abs(ev.clientY - canvasPan.value.startY) > 4) canvasPan.value.moved = true
    drawCanvas()
  }
}
function onCanvasMouseDown(ev) {
  // 阻止中键的浏览器原生默认行为（自动滚动），右键不再接管
  if (ev.button === 1) { try { ev.preventDefault() } catch (e) { } }
}
function onCanvasPointerUp(ev) {
  canvasPointers.delete(ev.pointerId)
  canvasPinch = null
  if (canvasDrag.value) { saveCanvasPos(); canvasDrag.value = null }
  canvasPan.value = null
  drawCanvas()
}
function onCanvasWheel(ev) {
  if (!ev.ctrlKey) return
  const c = canvasEl.value
  if (!c) return
  ev.preventDefault()
  const rect = c.getBoundingClientRect()
  const mx = ev.clientX - rect.left, my = ev.clientY - rect.top
  const factor = ev.deltaY < 0 ? 1.12 : 1 / 1.12
  const ns = Math.min(2.5, Math.max(0.3, viewScale.value * factor))
  const k = ns / viewScale.value
  viewOffset.value.x = mx - (mx - viewOffset.value.x) * k
  viewOffset.value.y = my - (my - viewOffset.value.y) * k
  viewScale.value = ns
  drawCanvas()
}
onMounted(() => {
  if (canvasEl.value) {
    canvasCtx.value = canvasEl.value.getContext('2d')
    if (canvasRO) canvasRO.disconnect()
    canvasRO = new ResizeObserver(() => drawCanvas())
    canvasRO.observe(canvasEl.value)
  }
})
onBeforeUnmount(() => { if (canvasRO) canvasRO.disconnect(); canvasRO = null })
function canvasNodeStyle(nd) {
  const c = CANVAS_COLORS[nodeType(nd.id)] || '#94a3b8'
  const active = canvasSel.value === nd.id
  return {
    left: nd.x + 'px', top: nd.y + 'px', width: NODE_W + 'px', height: NODE_H + 'px',
    background: active ? 'rgba(251,191,36,.14)' : 'rgba(20,24,33,.95)',
    border: active ? '2px solid #fbbf24' : '1px solid ' + c,
    boxShadow: active ? '0 0 14px rgba(251,191,36,.4)' : '0 2px 8px rgba(0,0,0,.45)',
  }
}
function typeBadgeStyle(id) {
  const c = CANVAS_COLORS[nodeType(id)] || '#94a3b8'
  return { background: c + '22', color: c }
}
function startCanvasDrag(id, ev) {
  const nd = canvasNodes.value.find(n => n.id === id)
  if (!nd || !canvasWrapRef.value) return
  if (canvasSel.value !== id) selectNode(id)
  const rect = canvasWrapRef.value.getBoundingClientRect()
  canvasDrag.value = { id, offX: ev.clientX - rect.left - nd.x, offY: ev.clientY - rect.top - nd.y }
  try { ev.currentTarget.setPointerCapture?.(ev.pointerId) } catch (e) { }
}
function onCanvasMove(ev) {
  if (!canvasDrag.value || !canvasWrapRef.value) return
  const nd = canvasNodes.value.find(n => n.id === canvasDrag.value.id)
  if (!nd) return
  const rect = canvasWrapRef.value.getBoundingClientRect()
  nd.x = Math.max(0, ev.clientX - rect.left - canvasDrag.value.offX)
  nd.y = Math.max(0, ev.clientY - rect.top - canvasDrag.value.offY)
}
function onCanvasUp() {
  if (!canvasDrag.value) return
  saveCanvasPos()
  canvasDrag.value = null
}
function relayoutCanvas() {
  localStorage.removeItem(canvasStorageKey())
  computeCanvasLayout()
  if (leftMode.value === 'canvas') drawCanvas()
}
// ✋ 画布平移：按住左键拖空白处滚动页面
const canvasPan = ref(null)
function startCanvasPan(ev) {
  if (ev.button !== 0 || !canvasWrapRef.value) return
  canvasPan.value = {
    startX: ev.clientX, startY: ev.clientY,
    sl: canvasWrapRef.value.scrollLeft, st: canvasWrapRef.value.scrollTop,
  }
  try { ev.currentTarget.setPointerCapture?.(ev.pointerId) } catch (e) { }
}
function onCanvasPanMove(ev) {
  if (!canvasPan.value || !canvasWrapRef.value) return
  const w = canvasWrapRef.value
  w.scrollLeft = canvasPan.value.sl - (ev.clientX - canvasPan.value.startX)
  w.scrollTop = canvasPan.value.st - (ev.clientY - canvasPan.value.startY)
}
function onCanvasPanUp() { canvasPan.value = null }
// ⇿ 画布左栏宽度拖拽
const canvasLeftW = ref(720)
let canvasResize = null
try { canvasLeftW.value = Math.min(960, Math.max(360, Number(localStorage.getItem('dladmin_canvas_w')) || 720)) } catch (e) { }
function startCanvasResize(ev) {
  if (ev.button !== 0) return
  canvasResize = { startX: ev.clientX, w: canvasLeftW.value }
  try { ev.currentTarget.setPointerCapture?.(ev.pointerId) } catch (e) { }
}
function onCanvasResizeMove(ev) {
  if (!canvasResize) return
  canvasLeftW.value = Math.min(960, Math.max(360, canvasResize.w + (ev.clientX - canvasResize.startX)))
}
function endCanvasResize() {
  if (!canvasResize) return
  localStorage.setItem('dladmin_canvas_w', String(canvasLeftW.value))
  canvasResize = null
}
watch(leftMode, async (m) => {
  if (m === 'canvas') {
    computeCanvasLayout()
    await nextTick()
    // 🎯 列表选中节点后切到画布：镜头移动到该节点居中
    const focusId = canvasSel.value || selNodeId.value
    if (focusId && canvasNodes.value.some(x => x.id === focusId)) {
      focusCanvasNode(focusId)
    } else {
      drawCanvas()
    }
  } else {
    // 🎯 画布选中节点后切回列表：滚动到该节点并居中（所在分组收起时先展开）
    await nextTick()
    const focusId = canvasSel.value || selNodeId.value
    if (focusId && leftListRef.value) {
      const g = nodeGroups.value.find(gr => gr.ids.includes(focusId))
      if (g && collapsedGroups[g.entry]) collapsedGroups[g.entry] = false
      await nextTick()
      const el = leftListRef.value.querySelector('[data-nid="' + CSS.escape(String(focusId)) + '"]')
      if (el) el.scrollIntoView({ block: 'center' })
    }
  }
})
// 🔎 分组摘要：把整段对话的关键文本（含选项）串起来，供标题条预览这一段讲什么
function buildGroupPreview(ids) {
  const parts = []
  const clean = (t) => {
    if (typeof t !== 'string') return ''
    let s = t.trim()
    if (!s) return ''
    if (s.startsWith('i18n:')) s = s.slice(5).trim()
    return s
  }
  for (const id of ids) {
    const nd = nodes.value[id]
    if (!nd || isEnd(nd)) continue
    const t = clean(nd.text)
    if (t) parts.push(t)
    if (nd.options?.length) {
      for (const o of nd.options) {
        const ot = clean(o.text)
        if (ot) parts.push(ot)
      }
    }
    if (parts.join('，').length >= 28) break
  }
  const joined = parts.join('，')
  return joined ? joined.slice(0, 30) : ''
}
// 📖 剧情预览：按对话流分组提取说话人 + 台词 + 选项，生成可读文本（查看剧情对话 tab）
function extractNodeTexts(id) {
  const nd = nodes.value[id]
  if (!nd) return []
  if (typeof nd.text === 'string') return [nd.text]
  if (typeof nd.text !== 'function') return []
  // 动态函数台词：只取 text 函数体内部，避免把 options/flag 名当台词
  const src = rawFile.value.replace(/\r\n/g, '\n')
  const re = new RegExp('^  ' + id + ': \\{[\\s\\S]*?\\n  \\},?', 'm')
  const m = src.match(re)
  if (!m) return ['（动态文本：见代码）']
  const ti = m[0].indexOf('text:')
  if (ti < 0) return ['（动态文本：见代码）']
  const body = m[0].slice(ti)
  const fnM = body.match(/text:\s*(?:\(\s*\)\s*=>|function\s*\([^)]*\))\s*\{/)
  let fnBody = null
  if (fnM) {
    const start = body.indexOf('{', fnM.index)
    let depth = 0, i = start
    for (; i < body.length; i++) {
      if (body[i] === '{') depth++
      else if (body[i] === '}') { depth--; if (depth === 0) break }
    }
    fnBody = body.slice(start + 1, i)
  } else {
    fnBody = body
  }
  const isZh = (s0) => /[\u4e00-\u9fff]/.test(s0) && !s0.startsWith('i18n:')
  const out = []
  const arrM = fnBody.match(/\[([\s\S]*?)\]/)
  if (arrM) {
    const items = arrM[1].match(/'([^']+)'|"([^"]+)"/g) || []
    for (const x of items) {
      const s0 = x.slice(1, -1)
      if (isZh(s0)) out.push(s0)
    }
  }
  if (!out.length) {
    const all = [...fnBody.matchAll(/['"]([^'"]{2,})['"]/g)].map(x => x[1])
    for (const s0 of all) {
      if (isZh(s0)) out.push(s0)
    }
  }
  return out.length ? [...new Set(out)] : ['（动态文本：见代码）']
}
// 🎨 富文本标签 → HTML（渲染颜色/加粗/斜体/下划线/字号），并去掉标签本身
const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
function richToHtml(s) {
  let h = escHtml(s)
  h = h.replace(/\[c=([#a-zA-Z0-9]+)\]/g, '<span style="color:$1;user-select:text;-webkit-user-select:text">').replace(/\[\/c\]/g, '</span>')
  h = h.replace(/\[b\]/g, '<b>').replace(/\[\/b\]/g, '</b>')
  h = h.replace(/\[i\]/g, '<i>').replace(/\[\/i\]/g, '</i>')
  h = h.replace(/\[u\]/g, '<u>').replace(/\[\/u\]/g, '</u>')
  h = h.replace(/\[size=([^\]\s]+)\]/g, '<span style="font-size:$1;user-select:text;-webkit-user-select:text">').replace(/\[\/size\]/g, '</span>')
  return h
}
function stripRich(s) {
  return String(s).replace(/\[c=[^\]]*\]|\[\/c\]|\[b\]|\[\/b\]|\[i\]|\[\/i\]|\[u\]|\[\/u\]|\[size=[^\]]*\]|\[\/size\]/g, '')
}
function buildStoryText() {
  const groups = nodeGroups.value
  if (!groups.length) { storyText.value = '（暂无节点，请先加载文件）'; plainStoryText.value = storyText.value; return }
  const L = []   // HTML 渲染版
  const P = []   // 纯文本版（复制用）
  const seen = new Set()
  L.push(escHtml('# ' + curFile.value + ' 全部对话文本提取'))
  P.push('# ' + curFile.value + ' 全部对话文本提取')
  const emitNode = (id) => {
    const nd = nodes.value[id]
    if (!nd) return
    const sp = (typeof nd.name === 'string' && nd.name.trim())
      ? nd.name
      : (nd.onStage ? (Array.isArray(nd.onStage) ? '众人' : '旁白') : '旁白')
    const texts = extractNodeTexts(id)
    for (const t of texts) {
      L.push((sp !== '旁白' ? escHtml(sp + '：') : '') + richToHtml(t))
      P.push((sp !== '旁白' ? sp + '：' : '') + stripRich(t))
    }
  }
  const emitOptions = (nd) => {
    L.push('&gt; 选项：')
    P.push('> 选项：')
    nd.options.forEach((o, i) => {
      const ot = typeof o.text === 'string' ? o.text.replace(/^i18n:[^.]*\./, '') : ''
      L.push('&gt; ' + (i + 1) + '. ' + richToHtml(ot) + (o.next ? ' → ' + escHtml(o.next) : '') + (o.hideOnChosen ? '（一次性）' : ''))
      P.push('> ' + (i + 1) + '. ' + stripRich(ot) + (o.next ? ' → ' + o.next : '') + (o.hideOnChosen ? '（一次性）' : ''))
    })
  }
  const branchLabel = (o) => (typeof o.text === 'string' ? o.text.replace(/^i18n:[^.]*\./, '') : '').slice(0, 10)
  const titleFor = (id, label) => {
    const nd = nodes.value[id]
    let t = '## ' + id
    if (label) t += '｜' + label
    else if (nd) {
      if (Array.isArray(nd.options) && nd.options.length) t += '｜选项'
      else if (typeof nd.text === 'string' && nd.text.trim()) t += '｜' + nd.text.trim().slice(0, 10)
      else if (typeof nd.text === 'function') t += '｜动态台词'
      else if (isEnd(nd)) t += '｜结束'
    }
    return t
  }
  // 递归：开节 → 台词 → 选项则列选项并递归分支；否则沿 next 链（遇选项/汇合点停止，留给顶层）
  const walk = (id, label) => {
    if (!id || id === 'end' || seen.has(id)) return
    const nd = nodes.value[id]
    if (!nd) return
    seen.add(id)
    L.push('')
    P.push('')
    const ttl = titleFor(id, label)
    L.push(escHtml(ttl))
    P.push(stripRich(ttl))
    emitNode(id)
    if (Array.isArray(nd.options) && nd.options.length) {
      emitOptions(nd)
      for (const o of nd.options) if (o.next && o.next !== 'end') walk(o.next, branchLabel(o))
      return
    }
    let cur = nd.next
    while (cur && cur !== 'end') {
      const cnd = nodes.value[cur]
      if (!cnd || seen.has(cur)) break
      // 遇选项节点或汇合点（被多个节点指向）→ 停止，该节点由顶层统一处理
      const isOption = Array.isArray(cnd.options) && cnd.options.length
      if (isOption || predCount[cur] >= 2) {
        if (!seen.has(cur)) pending.add(cur)
        break
      }
      seen.add(cur)
      emitNode(cur)
      cur = cnd.next
    }
  }
  // 前驱统计 + 顶层入口 = 无前驱节点 + 汇合点
  const predCount = {}
  for (const [k, v] of Object.entries(nodes.value)) {
    if (typeof v.next === 'string' && v.next) predCount[v.next] = (predCount[v.next] || 0) + 1
    if (Array.isArray(v.options)) for (const o of v.options) if (o.next) predCount[o.next] = (predCount[o.next] || 0) + 1
  }
  const order = {}
  groups.forEach((g, gi) => g.ids.forEach((id, ii) => { order[id] = gi * 1e6 + ii }))
  const byOrder = (a, b) => (order[a] ?? 1e9) - (order[b] ?? 1e9)
  const pending = new Set()
  const entries = Object.keys(nodes.value)
    .filter(k => {
      const nd = nodes.value[k]
      if (isEnd(nd)) return false
      return !predCount[k] || predCount[k] >= 2
    })
    .sort(byOrder)
  for (const e of entries) pending.add(e)
  // 兜底：任何未被访问的节点
  for (const k of Object.keys(nodes.value)) if (!seen.has(k)) pending.add(k)
  const ordered = [...pending].sort(byOrder)
  for (const e of ordered) if (!seen.has(e)) walk(e, null)
  storyText.value = L.join('\n')
  plainStoryText.value = P.join('\n')
}
watch(curTab, (v) => { if (v === 'story') buildStoryText(); if (v === 'talent' && !talentLoaded) loadTalentConfig(); if (v === 'dungeon' && !dungeonLoaded) loadDungeonConfig() })
// 🔁 多段台词轮换：可视化编辑动态 text 函数的台词数组
const lines = ref([])
const linesFlag = ref('')
function extractQuoted(s) {
  const out = []; const re = /'([^']*)'|"([^"]*)"/g; let m
  while ((m = re.exec(s))) { out.push(m[1] !== undefined ? m[1] : m[2]); if (out.length > 300) break }
  return out
}
function parseLinesFromFn(src) {
  const fnSrc = src ?? (form.value.textFn || '')
  const flagM = fnSrc.match(/getDialogueFlag\('([^']+)'\)/)
  linesFlag.value = flagM ? flagM[1] : ''
  const arrStart = fnSrc.indexOf('return [')
  if (arrStart >= 0) {
    const seg = fnSrc.slice(arrStart + 8)
    const arrEnd = seg.indexOf(']')
    const content = arrEnd < 0 ? seg : seg.slice(0, arrEnd)
    lines.value = extractQuoted(content)
  } else {
    // 三目/普通：按源码顺序提取所有字符串字面量作台词（去掉 getDialogueFlag 参数名）
    lines.value = extractQuoted(fnSrc)
    if (linesFlag.value && lines.value[0] === linesFlag.value) lines.value = lines.value.slice(1)
  }
  if (!lines.value.length) lines.value = ['']
}
function applyLinesFn() {
  const flag = linesFlag.value || 'someFlag'
  const arr = lines.value.map(l => "'" + String(l).replace(/'/g, "\\'") + "'").join(', ')
  const fb = String(lines.value[0] || '').replace(/'/g, "\\'")
  form.value.textFn = `() => {
      const n = Number(user.getDialogueFlag('${flag}') || 0);
      return [${arr}][n] || '${fb}';
    }`
}
// 🧩 条件分支台词：列出 if/return 函数的每个 return 台词（+条件摘要），仅安全替换文本，副作用源码不动
const returns = ref([])
function parseReturnListFromFn() {
  const src = form.value.textFn || ''
  const mm = src.match(/=>\s*\{([\s\S]*)\}\s*$/)
  const body = mm ? mm[1] : src
  const out = []
  const re = /return\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)/g
  let m
  while ((m = re.exec(body)) !== null) {
    const raw = m[1]
    const quote = raw[0]
    const text = raw.slice(1, -1).replace(/\\(.)/g, '$1')
    // 往回找最近的 if( 条件（平衡括号提取，支持嵌套）
    const before = body.slice(0, m.index)
    let cond = '(兜底)'
    const lastIf = Math.max(before.lastIndexOf('if ('), before.lastIndexOf('if('))
    if (lastIf >= 0) {
      const open = before.indexOf('(', lastIf)
      let depth = 0, j = open, inStr = null
      for (; j < before.length; j++) {
        const c = before[j]
        if (inStr) { if (c === '\\') { j++; continue } if (c === inStr) inStr = null; continue }
        if (c === "'" || c === '"' || c === '`') { inStr = c; continue }
        if (c === '(') depth++
        else if (c === ')') { depth--; if (depth === 0) { j++; break } }
      }
      if (j > open + 1) cond = before.slice(open + 1, j - 1).replace(/\s+/g, ' ').trim().slice(0, 40)
    }
    out.push({ cond, text, })
  }
  returns.value = out
}
function applyReturnTexts() {
  const src = form.value.textFn || ''
  const mm = src.match(/=>\s*\{([\s\S]*)\}\s*$/)
  if (!mm) { ElMessage.warning('未识别到函数体'); return }
  const body = mm[1]
  const re = /return\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)/g
  let out = '', last = 0, idx = 0, m
  while ((m = re.exec(body)) !== null) {
    const newText = returns.value[idx] ? String(returns.value[idx].text || '') : ''
    const esc = newText.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')
    out += body.slice(last, m.index) + 'return \'' + esc + '\''
    last = m.index + m[0].length
    idx++
  }
  out += body.slice(last)
  const newBody = src.slice(0, mm.index) + '=> {' + out + '}' + src.slice(mm.index + mm[0].length)
  form.value.textFn = newBody
  ElMessage.success('已应用 ' + idx + ' 条台词')
  parseReturnListFromFn()
}
function fnBody(fn) {
  // 从 (args) => { body } 提取函数体（不含外层箭头函数）
  const s = fn.toString()
  const m = s.match(/=>\s*\{([\s\S]*)\}\s*$/)
  if (!m) return s
  const body = m[1]
  const ls = body.split('\n')
  const indents = ls.filter(l => l.trim()).map(l => (l.match(/^\s*/) || [''])[0].length)
  const base = indents.length ? Math.min(...indents) : 0
  return ls.map(l => l.slice(base)).join('\n').replace(/^\s+|\s+$/g, '')
}
// 提取 condition 函数体：兼容 有花括号 ()=>{...} 与 无花括号表达式 ()=>expr 两种形态，统一去掉外层箭头
function condBody(fn) {
  const s = fn.toString().trim()
  let m = s.match(/=>\s*\{([\s\S]*)\}\s*$/)
  if (m) {
    const body = m[1]
    const ls = body.split('\n')
    const indents = ls.filter(l => l.trim()).map(l => (l.match(/^\s*/) || [''])[0].length)
    const base = indents.length ? Math.min(...indents) : 0
    return ls.map(l => l.slice(base)).join('\n').replace(/^\s+|\s+$/g, '')
  }
  m = s.match(/=>\s*([\s\S]+)$/)
  if (m) return m[1].trim()
  return s
}
// 🚦 解析条件跳转函数（next: () => { if (条件) return '节点'; ... return '保底节点' }）为可视化规则列表
//    解析失败返回空 rules（nextRules 为空时表单退化为「跳转节点」普通跳转，不丢原始函数体：保存在 nextCond）
function nextRulesFromFn(fn) {
  const body = condBody(fn)
  const rules = []
  const re = /if\s*\(([\s\S]*?)\)\s*\{?\s*return\s*['"]([^'"]+)['"]\s*\}?/g
  let m
  while ((m = re.exec(body))) {
    rules.push({ cond: m[1].trim(), next: m[2] })
  }
  let elseNext = ''
  const em = body.match(/return\s*['"]([^'"]+)['"]\s*;?\s*(?:\/\/[^\n]*)?\s*$/)
  if (em) elseNext = em[1]
  // 能完整还原 if 链才算解析成功；否则交给高级文本框（nextCond）保留原始函数
  const ok = rules.length > 0 || /^return\s*['"]/.test(body.trim())
  return ok ? { rules, elseNext } : { rules: [], elseNext: '' }
}
// ============ 源码文本提取（还原 cond.all / cond.any 工厂调用原始表达式） ============
// 花括号配平定位「\n  id: { ... }」节点块（跳过字符串与注释）
function findNodeBlock(src, id) {
  const needle = '\n  ' + id + ': {'
  const st = src.indexOf(needle)
  if (st < 0) return null
  let i = st + needle.length - 1
  let depth = 0, inStr = null
  for (; i < src.length; i++) {
    const ch = src[i]
    if (inStr) {
      if (ch === '\\') { i++; continue }
      if (ch === inStr) inStr = null
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue }
    if (ch === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue }
    if (ch === '/' && src[i + 1] === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i++; continue }
    if (ch === '{') depth++
    else if (ch === '}') { depth--; if (depth === 0) return { start: st, end: i + 1 } }
  }
  return null
}
// 从某段文本的 condition: 后提取表达式（括号/引号配平到顶层逗号）
function extractCondExpr(text) {
  const idx = text.indexOf('condition:')
  if (idx < 0) return ''
  let i = idx + 'condition:'.length
  while (i < text.length && /\s/.test(text[i])) i++
  if (i >= text.length) return ''
  let depth = 0, inStr = null
  const start = i
  for (; i < text.length; i++) {
    const ch = text[i]
    if (inStr) { if (ch === '\\') { i++; continue } if (ch === inStr) inStr = null; continue }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue }
    if (ch === '(' || ch === '[' || ch === '{') depth++
    else if (ch === ')' || ch === ']' || ch === '}') depth--
    else if (ch === ',' && depth === 0) return text.slice(start, i).trim()
  }
  return text.slice(start).trim().replace(/,$/, '')
}
// 提取选项对象内的字符串属性（text / next）
function extractStrProp(objText, key) {
  const re = new RegExp(key + '\\s*:\\s*([\"\'])(.*?)\\1')
  const m = re.exec(objText)
  return m ? m[2] : ''
}
// 从源码提取该节点 options 数组（还原 cond 工厂调用的原始表达式）
function extractOptionsFromRaw(src, id) {
  const blk = findNodeBlock(src, id)
  if (!blk) return null
  const block = src.slice(blk.start, blk.end)
  const om = block.match(/options\s*:\s*\[/)
  if (!om) return null
  let i = om.index + om[0].length - 1
  let depth = 0, inStr = null
  const arrStart = i
  for (; i < block.length; i++) {
    const ch = block[i]
    if (inStr) { if (ch === '\\') { i++; continue } if (ch === inStr) inStr = null; continue }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue }
    if (ch === '/' && block[i + 1] === '/') { while (i < block.length && block[i] !== '\n') i++; continue }
    if (ch === '/' && block[i + 1] === '*') { i += 2; while (i < block.length && !(block[i] === '*' && block[i + 1] === '/')) i++; i++; continue }
    if (ch === '[') depth++
    else if (ch === ']') { depth--; if (depth === 0) break }
  }
  const arrText = block.slice(arrStart, i + 1)
  const out = []
  let j = 0
  while (j < arrText.length) {
    const b = arrText.indexOf('{', j)
    if (b < 0) break
    let d2 = 0, s2 = null, k = b
    for (; k < arrText.length; k++) {
      const c = arrText[k]
      if (s2) { if (c === '\\') { k++; continue } if (c === s2) s2 = null; continue }
      if (c === '"' || c === "'" || c === '`') { s2 = c; continue }
      if (c === '{') d2++
      else if (c === '}') { d2--; if (d2 === 0) break }
    }
    const objText = arrText.slice(b, k + 1)
    out.push({
      text: extractStrProp(objText, 'text'),
      next: extractStrProp(objText, 'next'),
      condition: extractCondExpr(objText),
      onSelect: extractOnSelectRaw(objText),
      hideOnChosen: /hideOnChosen\s*:\s*true/.test(objText),
      repeatable: /repeatable\s*:\s*true/.test(objText),
      optionBg: extractStrProp(objText, 'optionBg'),
      optionColor: extractStrProp(objText, 'optionColor'),
    })
    j = k + 1
  }
  return out.length ? out : null
}
// 从源码提取选项 onSelect 函数体（箭头函数体，不含 () => 前缀）
function extractOnSelectRaw(objText) {
  const i = objText.indexOf('onSelect:')
  if (i < 0) return ''
  let s = objText.slice(i + 'onSelect:'.length)
  const m = s.match(/^\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)?\s*=>/)
  if (!m) return ''
  let body = s.slice(m[0].length)
  const b = body.search(/\S/)
  if (b < 0) return ''
  body = body.slice(b)
  if (body[0] === '{') {
    let d = 0
    for (let k = 0; k < body.length; k++) {
      const c = body[k]
      if (c === '{') d++
      else if (c === '}') { d--; if (d === 0) return body.slice(1, k).trim() }
    }
    return body.slice(1).trim()
  }
  return body.replace(/,\s*$/, '').trim()
}
// 从源码提取节点级 condition（cond 工厂原文）
function extractNodeCondFromRaw(src, id) {
  const blk = findNodeBlock(src, id)
  if (!blk) return ''
  return extractCondExpr(src.slice(blk.start, blk.end))
}
// 组装选项表单数据：优先源码还原（含 cond 原文），失败回退运行时
function buildOptionsForForm(id, nd) {
  const rawOpts = rawFile.value ? extractOptionsFromRaw(rawFile.value, id) : null
  const arr = rawOpts || (Array.isArray(nd.options) ? nd.options.map(o => ({
    text: typeof o.text === 'string' ? o.text : (typeof o.text === 'function' ? '[函数]' : ''),
    next: typeof o.next === 'string' ? o.next : '',
    nextCond: typeof o.next === 'function' ? condBody(o.next) : '',
    condition: typeof o.condition === 'function' ? condBody(o.condition) : '',
    onSelect: typeof o.onSelect === 'function' ? fnBody(o.onSelect) : '',
    hideOnChosen: !!o.hideOnChosen, repeatable: !!o.repeatable,
  })) : [])
  return arr.map((o, idx) => {
    // 源码还原时 next 函数（中转站）取不到字符串 → 从运行时同名选项补回跳转条件
    const rn = Array.isArray(nd.options) ? nd.options[idx] : null
    const rnNextIsFn = rn && typeof rn.next === 'function'
    return {
      ...o,
      next: rnNextIsFn ? '' : (typeof o.next === 'string' && o.next ? o.next : (rn && typeof rn.next === 'string' ? rn.next : '')),
      nextCond: rnNextIsFn ? condBody(rn.next) : (o.nextCond ?? ''),
      optionBg: typeof o.optionBg === 'string' ? o.optionBg : '',
      optionColor: typeof o.optionColor === 'string' ? o.optionColor : '',
    }
  })
}
function selectNode(id) {
  selNodeId.value = id
  canvasSel.value = id
  const nd = nodes.value[id]
  form.value = {
    id,
    name: nd.name ?? '',
    text: typeof nd.text === 'string' ? nd.text : '',
    textMode: typeof nd.text === 'function' ? 'fn' : 'text',
    textFn: typeof nd.text === 'function' ? nd.text.toString() : '',
    next: typeof nd.next === 'string' ? nd.next : (typeof nd.next === 'function' ? nextRulesFromFn(nd.next).elseNext : ''),
    nextCond: typeof nd.next === 'function' ? condBody(nd.next) : '',
    nextRules: typeof nd.next === 'function' ? nextRulesFromFn(nd.next).rules : [],
    isTransit: typeof nd.next === 'function',
    end: nd.end ?? null,
    repeatable: !!nd.repeatable,
    onStage: Array.isArray(nd.onStage) ? [...nd.onStage] : (nd.onStage ?? ''),
    playerSkin: nd.playerSkin || 'moren',
    npcSkin: (() => {
      if (typeof nd.npcSkin === 'string') return nd.npcSkin
      if (nd.npcSkin && typeof nd.npcSkin === 'object' && !Array.isArray(nd.npcSkin)) {
        const key = typeof nd.onStage === 'string' ? nd.onStage : (Array.isArray(nd.onStage) ? nd.onStage[0] : null)
        if (key && nd.npcSkin[key] != null) return nd.npcSkin[key]
      }
      return 'moren'
    })(),
    npcSkins: nd.npcSkin && typeof nd.npcSkin === 'object' && !Array.isArray(nd.npcSkin) ? { ...nd.npcSkin } : {},
    avatarFx: nd.avatarFx != null ? (typeof nd.avatarFx === 'string' ? nd.avatarFx : JSON.parse(JSON.stringify(nd.avatarFx))) : '',
    textSizePick: 2, textColorPick: '#ff0000',
    condition: (rawFile.value ? extractNodeCondFromRaw(rawFile.value, id) : '') || (typeof nd.condition === 'function' ? condBody(nd.condition) : ''),
    onEnter: typeof nd.onEnter === 'function' ? fnBody(nd.onEnter) : '',
    options: buildOptionsForForm(id, nd),
    cgMode: nd.showCg !== undefined ? (nd.showCg === '' ? 'hide' : 'show') : 'none',
    showCg: typeof nd.showCg === 'string' && nd.showCg !== '' ? nd.showCg : '',
    cgAnimation: typeof nd.cgAnimation === 'string' ? nd.cgAnimation : '',
    cgLoop: !!nd.cgLoop,
    cgSkin: typeof nd.cgSkin === 'string' ? nd.cgSkin : '',
    cgShowAvatar: !!nd.cgShowAvatar,
    cgResume: nd.cgResume === true,
    hideUI: nd.hideUI === true,
    autoNext: typeof nd.autoNext === 'number' ? String(nd.autoNext) : '',
    blackScreen: nd.blackScreen === true,
    textSpeed: typeof nd.textSpeed === 'number' ? String(nd.textSpeed) : '20',
    textSpeedTouched: typeof nd.textSpeed === 'number',
    nextTextOnce: typeof nd.nextTextOnce === 'string' ? nd.nextTextOnce : '',
    nextTextOnceOn: typeof nd.nextTextOnce === 'string' && !!nd.nextTextOnce,
  }
  onStageMode.value = Array.isArray(nd.onStage) ? 'multi' : (nd.onStage ? 'single' : ((nd.narration === true || (nd.name == null || nd.name === '')) ? 'narration' : 'none'))
  if (form.value.textMode === 'fn') parseLinesFromFn(form.value.textFn)
  if (form.value.textMode === 'fn' && !isRotateFn.value) parseReturnListFromFn()
  parseAvatarFx(form.value.avatarFx)
  genCode.value = ''
}
function resetForm() {
  if (selNodeId.value) selectNode(selNodeId.value)
  else form.value = emptyForm()
}
function moveOption(i, d) {
  const arr = form.value.options
  const j = i + d
  if (j < 0 || j >= arr.length) return
  const t = arr[i]; arr[i] = arr[j]; arr[j] = t
}
function addOption() {
  form.value.options.push({ text: '', next: '', condition: '', onSelect: '', hideOnChosen: false, repeatable: false, optionBg: '', optionColor: '' })
}
function insertCond(code) {
  form.value.condition = form.value.condition ? form.value.condition + ' && ' + code : code
}
// onEnter「快速逻辑」面板展开状态
// 💡 快捷按钮说明弹窗（快速条件 / 快速逻辑）
const quickHelpVisible = ref(false)
const quickHelpTab = ref('cond')
const condTutorialVisible = ref(false)
function openQuickHelp(tab) { quickHelpTab.value = tab || 'cond'; quickHelpVisible.value = true }
const onEnterOpen = ref(false)
// 给 onEnter 追加一段逻辑（换行拼接）
function insertOnEnter(code) {
  const cur = (form.value.onEnter || '').trim()
  form.value.onEnter = cur ? cur + '\n' + code : code
}
// 每个选项的「快速条件」面板展开状态（key=选项下标）
const optCondOpen = reactive({})
// 每个选项的「快速逻辑」面板展开状态（key=选项下标）
const optOnSelOpen = reactive({})
// 给指定选项的 onSelect 追加一段逻辑（换行拼接）
function insertOptOnSel(oi, code) {
  const o = form.value.options[oi]
  if (!o) return
  const cur = (o.onSelect || '').trim()
  o.onSelect = cur ? cur + '\n' + code : code
}
// 给指定选项的 condition 追加一条快捷条件（用 && 连接）
function insertOptCond(oi, code) {
  const o = form.value.options[oi]
  if (!o) return
  o.condition = o.condition ? o.condition + ' && ' + code : code
}

// 🎨 富文本快速插入：选中文字后用标签包裹（[c=色][size=n][b][i]）
const textAreaRef = ref(null)
function getTextAreaEl() {
  try { return textAreaRef.value?.$el?.querySelector('textarea') || null } catch (e) { return null }
}
function applyTextTag(openTag, closeTag) {
  const ta = getTextAreaEl()
  const text = form.value.text || ''
  // 未选中文字 → 默认包裹整段文本；有选区 → 只包裹选中部分
  let selStart, selEnd
  if (ta && ta.selectionStart !== ta.selectionEnd) {
    selStart = ta.selectionStart; selEnd = ta.selectionEnd
  } else {
    selStart = 0; selEnd = text.length
  }
  const sel = text.slice(selStart, selEnd)
  form.value.text = text.slice(0, selStart) + openTag + sel + closeTag + text.slice(selEnd)
  // 恢复选区（光标落在选中文本上）
  nextTick(() => {
    const ta2 = getTextAreaEl()
    if (!ta2) return
    const ns = selStart + openTag.length
    ta2.focus()
    ta2.setSelectionRange(ns, ns + sel.length)
  })
}
function wrapTextBold() { applyTextTag('[b]', '[/b]') }
function wrapTextItalic() { applyTextTag('[i]', '[/i]') }
function wrapTextUnderline() { applyTextTag('[u]', '[/u]') }
function wrapTextSize() { const v = Number(form.value.textSizePick) || 2; applyTextTag(`[size=${v}vh]`, '[/size]') }
function wrapTextColor() { const c = form.value.textColorPick || '#ff0000'; applyTextTag(`[c=${c}]`, '[/c]') }
// 🎨 调色板：已存颜色（localStorage 持久化，上限 30）
const PALETTE_KEY = 'dladmin_palette'
const paletteColors = ref([])
try {
  const saved = localStorage.getItem(PALETTE_KEY)
  if (saved) { const arr = JSON.parse(saved); if (Array.isArray(arr)) paletteColors.value = arr.filter(c => typeof c === 'string' && /^#([0-9a-fA-F]{3,8})$/.test(c)) }
} catch (e) { }
function savePaletteColor() {
  const c = form.value.textColorPick
  if (!c || !/^#([0-9a-fA-F]{3,8})$/.test(c)) { ElMessage.warning('请先取一个颜色'); return }
  if (paletteColors.value.includes(c)) { ElMessage.info('该颜色已在色板中'); return }
  paletteColors.value.push(c)
  if (paletteColors.value.length > 30) paletteColors.value = paletteColors.value.slice(-30)
  localStorage.setItem(PALETTE_KEY, JSON.stringify(paletteColors.value))
  ElMessage.success('已保存颜色 ' + c)
}
function removePaletteColor(i) {
  paletteColors.value.splice(i, 1)
  localStorage.setItem(PALETTE_KEY, JSON.stringify(paletteColors.value))
}
function pickPaletteColor(c) {
  form.value.textColorPick = c
  wrapTextColor()
}
// 👁 文本预览：解析富文本标签（[c][size][b][i]）成最终 HTML
const previewTextVisible = ref(false)
function previewRichTextHtml() {
  const raw = form.value.text || ''
  const segs = []
  let current = { text: '', color: null, size: null, bold: false, italic: false, underline: false }
  const stack = []
  const re = /\[(c|size|b|i|u)(?:=([^\]]+))?\]|\[\/(c|size|b|i|u)\]/g
  let last = 0, m
  const flush = () => { if (current.text) segs.push({ ...current }); current = { text: '', color: null, size: null, bold: false, italic: false } }
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) current.text += raw.slice(last, m.index)
    if (m[3]) {
      flush()
      if (stack.length) {
        stack.pop()
        current = { text: '', color: null, size: null, bold: false, italic: false }
        for (const s of stack) { if (s.color) current.color = s.color; if (s.size) current.size = s.size; if (s.bold) current.bold = true; if (s.italic) current.italic = true; if (s.underline) current.underline = true }
      }
    } else {
      flush()
      const st = {}
      if (m[1] === 'c') st.color = m[2]
      else if (m[1] === 'size') st.size = m[2]
      else if (m[1] === 'b') st.bold = true
      else if (m[1] === 'i') st.italic = true
      stack.push(st)
      // 从整个栈重建样式（保留外层 color/bold/size，防止嵌套时丢失）
      current = { text: '', color: null, size: null, bold: false, italic: false }
      for (const s of stack) { if (s.color) current.color = s.color; if (s.size) current.size = s.size; if (s.bold) current.bold = true; if (s.italic) current.italic = true; if (s.underline) current.underline = true }
    }
    last = re.lastIndex
  }
  if (last < raw.length) current.text += raw.slice(last)
  flush()
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return segs.map(s => {
    let style = ''
    if (s.color) style += `color:${s.color};`
    if (s.size) style += `font-size:${parseFloat(s.size)}vh;`
    if (s.bold) style += 'font-weight:bold;'
    if (s.italic) style += 'font-style:italic;'
    if (s.underline) style += 'text-decoration:underline;text-underline-offset:0.25em;'
    const body = esc(s.text)
    return style ? `<span style="${style}">${body}</span>` : body
  }).join('')
}
const previewTextHtml = computed(() => previewRichTextHtml())
// ↩️ 文本撤销：自动记录每一步改动，误操作可返回上一步
const textHistory = ref([])
const MAX_HISTORY = 50
let textWatchActive = true
watch(
  () => form.value.text,
  (nv, ov) => {
    if (textWatchActive && ov !== undefined && ov !== nv) {
      textHistory.value.push(ov)
      if (textHistory.value.length > MAX_HISTORY) textHistory.value.shift()
    }
  }
)
function undoText() {
  if (!textHistory.value.length) { ElMessage.info('没有可撤销的操作'); return }
  const prev = textHistory.value.pop()
  textWatchActive = false
  form.value.text = prev
  nextTick(() => { textWatchActive = true })
}

// ============ 序列化：生成节点代码 ============
function jsStr(v) {
  return '"' + String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"'
}
// condition 生成：已是箭头函数（() => ... / x => ...）或 cond. 工厂调用（本身返回函数）→ 直接放；
// 其余纯表达式（如 !user.getDialogueFlag('x')）包 () => 箭头函数
function condCode(expr) {
  const e = (expr || '').trim()
  if (!e) return ''
  if (e.startsWith('cond.') || /^(\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/.test(e)) return e
  return '() => ' + e
}
function genNodeCode() {
  const f = form.value
  if (!f.id.trim()) { ElMessage.warning('节点 id 不能为空'); return null }
  const lines = []
  lines.push(`  ${f.id.trim()}: {`)
  if (f.name !== '') lines.push(`    name: ${jsStr(f.name)},`)
  if (onStageMode.value === 'narration') lines.push(`    narration: true,`)
  // onStage
  if (onStageMode.value !== 'none' && onStageMode.value !== 'narration' && f.onStage) {
    if (onStageMode.value === 'single') lines.push(`    onStage: ${jsStr(f.onStage)},`)
    else {
      const arr = Array.isArray(f.onStage) ? f.onStage : [f.onStage]
      lines.push(`    onStage: [${arr.map(jsStr).join(', ')}],`)
    }
  }
  if (f.playerSkin) lines.push(`    playerSkin: ${jsStr(f.playerSkin)},`)
  // npcSkin：按在场人物分别指定（对象 { key: skin }）——单人/多人都是对象，明确指定 NPC
  if (onStageMode.value === 'multi') {
    const skins = {}
    if (Array.isArray(f.onStage)) f.onStage.forEach(pp => { if (f.npcSkins && f.npcSkins[pp]) skins[pp] = f.npcSkins[pp] })
    if (Object.keys(skins).length) lines.push(`    npcSkin: ${JSON.stringify(skins)},`)
  } else if (onStageMode.value === 'single' && f.onStage && f.npcSkin) {
    const skins = {}
    skins[f.onStage] = f.npcSkin
    lines.push(`    npcSkin: ${JSON.stringify(skins)},`)
  } else if (f.npcSkin) {
    lines.push(`    npcSkin: ${jsStr(f.npcSkin)},`)
  }
  if (f.textMode === 'fn' && f.textFn && f.textFn.trim()) {
    lines.push(`    text: ${f.textFn.trim()},`)
  } else if (f.text && typeof f.text === 'string') {
    lines.push(`    text: ${jsStr(f.text)},`)
  }
  // 🎬 nextTextOnce：跳转时替换目标节点文本（仅一次，需按钮开启）
  if (f.nextTextOnceOn && f.nextTextOnce && f.nextTextOnce.trim()) {
    lines.push(`    nextTextOnce: ${jsStr(f.nextTextOnce.trim())},`)
  }
  if (f.condition && f.condition.trim()) lines.push(`    condition: ${condCode(f.condition)},`)
  if (f.onEnter && f.onEnter.trim()) lines.push(`    onEnter: () => {\n      ${f.onEnter.trim().split('\n').join('\n      ')}\n    },`)
  if (f.avatarFx) {
    if (typeof f.avatarFx === 'string' && f.avatarFx.trim()) lines.push(`    avatarFx: ${jsStr(f.avatarFx.trim())},`)
    else if (Array.isArray(f.avatarFx) && f.avatarFx.length) lines.push(`    avatarFx: ${JSON.stringify(f.avatarFx)},`)
  }
  // 🎬 CG 剧情（showCg 显示/隐藏 + cgAnimation/cgLoop/cgSkin/cgShowAvatar）
  if (f.cgMode === 'show' && f.showCg && f.showCg.trim()) {
    lines.push(`    showCg: ${jsStr(f.showCg.trim())},`)
    if (f.cgLoop) lines.push('    cgLoop: true,')
    if (f.cgShowAvatar) lines.push('    cgShowAvatar: true,')
  } else if (f.cgMode === 'hide') {
    lines.push('    showCg: "",')
  }
  // cgAnimation 独立生成：不处理/显示 都能切换当前 CG 动画（index.js 支持独立 cgAnimation）
  if (f.cgMode !== 'hide' && f.cgAnimation && f.cgAnimation.trim()) lines.push(`    cgAnimation: ${jsStr(f.cgAnimation.trim())},`)
  // 🎬 cgResume：本节点推进时恢复被 pause 暂停的 CG（duihua.vue watch(currentDialogue) 读取）
  if (f.cgResume) lines.push('    cgResume: true,')
  // cgSkin 独立生成：CG 未显示也能单独切换皮肤（index.js 支持独立 cgSkin）
  if (f.cgSkin && f.cgSkin.trim()) lines.push(`    cgSkin: ${jsStr(f.cgSkin.trim())},`)
  // 🎬 hideUI：隐藏对话框只显示 CG（独立于 cgMode 生成）
  if (f.hideUI) lines.push('    hideUI: true,')
  // 🎬 autoNext：毫秒后自动进入下一句（独立于 cgMode 生成）
  if (f.autoNext && Number(f.autoNext) > 0) lines.push(`    autoNext: ${Number(f.autoNext)},`)
  // 🎬 blackScreen：全屏黑底白字模式（独立于 cgMode 生成）
  if (f.blackScreen) lines.push('    blackScreen: true,')
  // 🎬 textSpeed：打字速度（每秒字数；仅显式修改过才生成，默认 20 不写）
  if (f.textSpeedTouched && f.textSpeed && Number(f.textSpeed) > 0) lines.push(`    textSpeed: ${Number(f.textSpeed)},`)
  // options
  if (f.options.some(o => o.text || o.next || o.nextCond || o.condition || o.onSelect)) {
    lines.push('    options: [')
    for (const o of f.options) {
      if (!o.text && !o.next && !o.nextCond && !o.condition && !o.onSelect) continue
      lines.push('      {')
      if (o.text) lines.push(`        text: ${jsStr(o.text)},`)
      if (o.nextCond && o.nextCond.trim()) {
        lines.push(`        next: () => (${o.nextCond.trim()}),`)
      } else if (o.next) {
        lines.push(`        next: ${jsStr(o.next)},`)
      }
      if (o.condition && o.condition.trim()) lines.push(`        condition: ${condCode(o.condition)},`)
      if (o.onSelect && o.onSelect.trim()) {
        lines.push('        onSelect: () => {')
        lines.push(o.onSelect.trim().split('\n').map(l => '          ' + l).join('\n'))
        lines.push('        },')
      }
      if (o.hideOnChosen) lines.push('        hideOnChosen: true,')
      if (o.repeatable) lines.push('        repeatable: true,')
      if (o.optionBg) lines.push(`        optionBg: ${jsStr(o.optionBg)},`)
      if (o.optionColor) lines.push(`        optionColor: ${jsStr(o.optionColor)},`)
      lines.push('      },')
    }
    lines.push('    ],')
  }
  if (f.repeatable) lines.push('    repeatable: true,')
  // 跳转：中转站（isTransit）用可视化条件规则（if 链）生成 next 函数；否则普通字符串跳转
  const _rules = (f.nextRules || []).filter(r => r.cond && r.cond.trim() && r.next)
  if (f.isTransit && _rules.length) {
    if (!f.next || !f.next.trim()) {
      ElMessage.warning('已添加跳转条件，请在上方「跳转」填写保底跳转节点（所有条件都不满足时进入）')
      return null
    }
    let nc = '    next: () => {\n'
    for (const r of _rules) nc += `      if (${r.cond.trim()}) return ${jsStr(r.next)}\n`
    nc += `      return ${jsStr(f.next.trim())}\n    },`
    lines.push(nc)
  } else if (f.isTransit && f.nextCond && f.nextCond.trim()) {
    lines.push(`    next: () => (${f.nextCond.trim()}),`)
  } else if (f.next) {
    lines.push(`    next: ${jsStr(f.next)},`)
  }
  if (f.end != null && f.end !== '') {
    lines.push(`    end: ${typeof f.end === 'boolean' ? 'true' : f.end},`)
  }
  lines.push('  },')
  genCode.value = lines.join('\n')
  return genCode.value
}

// ============ 补丁操作 ============
function queueInsert() {
  const code = genNodeCode()
  if (!code) return
  const id = form.value.id.trim()
  // 🛡️ 插入只允许全新 id：若该 id 已存在，禁止插入（请改 id 或用「整块替换」）
  if (nodes.value[id]) {
    ElMessage.warning(`节点 ${id} 已存在，禁止「加入补丁（插入）」；请换一个新 id，或改用「加入补丁（整块替换此节点）」`)
    return
  }
  // 📍 按「插入位置」决定锚点：before=选中前 / after=选中后 / end=文件末尾
  let afterId = null
  let pos = 'end'
  if (selNodeId.value && insertPos.value !== 'end') {
    afterId = selNodeId.value
    pos = insertPos.value
  }
  patchOps.value.push({
    kind: 'insert', id, file: curFile.value,
    code, preview: (form.value.text || '(无文本)').slice(0, 30),
    afterId, pos,
  })
  // 🔁 插入语义增强：让新节点接入对话链路
  //    after  → 重定向选中节点.next → 新节点（选中节点 → 新节点 → 原后继）
  //    before → 重定向「顶层 next 指向选中节点」的前驱.next → 新节点（前驱 → 新节点 → 选中节点）
  //             例：选中 sr02b，新建 sr02b1，则 sr02.next 自动改为 sr02b1，形成 sr02 → sr02b1 → sr02b
  let retargeted = []
  if (selNodeId.value && selNodeId.value !== id) {
    if (pos === 'after' && nodes.value[selNodeId.value]?.next) {
      patchOps.value.push({
        kind: 'nextRetarget', file: curFile.value,
        fromId: selNodeId.value, toId: id,
        preview: `${selNodeId.value}.next → ${id}`,
      })
      retargeted.push(selNodeId.value)
    } else if (pos === 'before') {
      const pres = Object.keys(nodes.value).filter(k => nodes.value[k]?.next === selNodeId.value)
      for (const p of pres) {
        patchOps.value.push({
          kind: 'nextRetarget', file: curFile.value,
          fromId: p, toId: id,
          preview: `${p}.next → ${id}`,
        })
        retargeted.push(p)
      }
    }
  }
  ElMessage.success(`已插入`)
}
function queueReplace() {
  const code = genNodeCode()
  if (!code) return
  const id = form.value.id.trim()
  if (!nodes.value[id]) { ElMessage.warning('目标文件里没有该 id，无法整块替换'); return }
  patchOps.value.push({
    kind: 'replace', id, file: curFile.value,
    code, preview: (form.value.text || '(无文本)').slice(0, 30),
  })
  ElMessage.success(`已替换`)
}
function queueDelete() {
  const id = form.value.id.trim()
  if (!id || !nodes.value[id]) { ElMessage.warning('请先在左侧选择要删除的节点'); return }
  // 🔗 自动拼合：若有其它节点 next 指向本节点，先把它们重定向到本节点的 next，再删除本节点
  const target = nodes.value[id]
  const targetNext = (typeof target?.next === 'string' && target.next) ? target.next : null
  const referrers = Object.keys(nodes.value).filter(k => nodes.value[k]?.next === id)
  if (referrers.length) {
    if (targetNext) {
      for (const r of referrers) {
        patchOps.value.push({ kind: 'nextRetarget', fromId: r, toId: targetNext, file: curFile.value, preview: `拼合：${r}.next → ${targetNext}` })
      }
      ElMessage.success(`删除 ${id} 后将自动拼合：${referrers.join('、')} → ${targetNext}`)
    } else {
      ElMessage.warning(`⚠️ 节点 ${id} 没有 next，但被 ${referrers.join('、')} 引用，删除后无法自动拼合（会断链），请先手动改这些节点的跳转`)
    }
  }
  patchOps.value.push({ kind: 'delete', id, file: curFile.value, preview: '删除节点 ' + id })
  ElMessage.success(`已加入删除操作：${id}（写入后该节点整块移除）`)
}
function toggleGroup(entry) {
  collapsedGroups[entry] = !collapsedGroups[entry]
}

// ============ 生成补丁脚本 ============
function genPatch() {
  if (!patchOps.value.length) {
    queueInsert()
    if (!patchOps.value.length) return
  }
  const script = buildPatchScript(patchOps.value)
  patchScript.value = script
  curTab.value = 'patch'
}
function buildPatchScript(ops) {
  const head = `// _p_dlg.cjs — 由「对话管理系统」生成于 ${new Date().toISOString().slice(0, 19).replace('T', ' ')}\n`
  const body = `
const fs = require('fs');
function apply(file, fn) {
  const p = 'src/pages/pixi/dialogue/data/npc/' + file + '.js';
  const crlf = fs.existsSync(p) ? fs.readFileSync(p, 'utf8').includes('\\r\\n') : false;
  let s = fs.readFileSync(p, 'utf8').replace(/\\r\\n/g, '\\n');
  const out = fn(s);
  if (!out.changed) { console.log('!! ' + file + ' 无改动'); return; }
  fs.writeFileSync(p, out.s.replace(/\\n/g, crlf ? '\\r\\n' : '\\n'));
  console.log('ok ' + file + (out.msg ? ' · ' + out.msg : ''));
}
`
  const steps = ops.map((op, i) => {
    const code = JSON.stringify(op.code)
    if (op.kind === 'insert') {
      const afterId = op.afterId
      const pos = op.pos === 'after' ? 'after' : (op.pos === 'end' ? 'end' : 'before')
      let guard
      let note
      if (!afterId || pos === 'end') {
        note = '文件末尾'
        guard = `const idx = s.search(/\\n\\};/);
      if (idx < 0) { console.error('!! 未找到文件末尾'); return { changed: false }; }
      s = s.slice(0, idx) + '\\n' + NODE${i} + s.slice(idx);`
      } else if (pos === 'after') {
        note = '锚点 ' + afterId + ' 之后'
        guard = `const start = s.indexOf('\\n  ' + ${JSON.stringify(afterId)} + ': ');
      if (start < 0) { console.error('!! 未找到锚点节点 ${afterId}'); return { changed: false }; }
      const lineEnd = s.indexOf('\\n', start + 1);
      const firstLine = (lineEnd < 0 ? s.slice(start) : s.slice(start, lineEnd));
      let blockEnd;
      if (/},\\s*$/.test(firstLine)) {
        blockEnd = start + firstLine.length;
      } else {
        const e = s.indexOf('\\n  },', start);
        if (e < 0) { console.error('!! 未找到节点边界 ${afterId}'); return { changed: false }; }
        blockEnd = e + 5;
      }
      s = s.slice(0, blockEnd) + '\\n' + NODE${i} + s.slice(blockEnd);`
      } else {
        note = '锚点 ' + afterId + ' 之前'
        guard = `const idx = s.indexOf('\\n  ' + ${JSON.stringify(afterId)} + ': ');
      if (idx < 0) { console.error('!! 未找到锚点节点 ${afterId}'); return { changed: false }; }
      s = s.slice(0, idx) + '\\n' + NODE${i} + s.slice(idx);`
      }
      return `// 插入节点 ${op.id}（${note}）\n      const NODE${i} = ${code};\n      apply(${JSON.stringify(op.file)}, (s) => {\n        ${guard}\n        return { changed: true, s, msg: '插入 ${op.id}' };\n      });`
    } else if (op.kind === 'delete') {
      const id = op.id
      return `// 删除节点 ${id}
      apply(${JSON.stringify(op.file)}, (s) => {
        const lines = s.split('\\n');
        let si = -1;
        for (let i = 0; i < lines.length; i++) { if (lines[i].startsWith('  ${id}: ')) { si = i; break; } }
        if (si < 0) { console.error('!! 未找到节点 ${id}'); return { changed: false }; }
        let ei = si;
        if (!/},\\s*$/.test(lines[si])) {
          for (let i = si + 1; i < lines.length; i++) { if (/^  },/.test(lines[i])) { ei = i; break; } }
          if (ei === si) { console.error('!! 未找到节点边界 ${id}'); return { changed: false }; }
        }
        lines.splice(si, ei - si + 1);
        return { changed: true, s: lines.join('\n'), msg: '删除 ${id}' };
      });`
    } else if (op.kind === 'nextRetarget') {
      const fromId = op.fromId
      const toId = op.toId
      return `// 重定向 ${fromId}.next → ${toId}
      apply(${JSON.stringify(op.file)}, (s) => {
        const start = s.indexOf('\\n  ' + ${JSON.stringify(fromId)} + ': ');
        if (start < 0) { console.error('!! 未找到节点 ${fromId}'); return { changed: false }; }
        const lineEnd = s.indexOf('\\n', start + 1);
        const firstLine = (lineEnd < 0 ? s.slice(start) : s.slice(start, lineEnd));
        const isSingle = /},\\s*$/.test(firstLine);
        let end;
        if (isSingle) {
          end = start + firstLine.length;
        } else {
          const e = s.indexOf('\\n  },', start);
          if (e < 0) { console.error('!! 未找到节点边界 ${fromId}'); return { changed: false }; }
          end = e + 5;
        }
        const block = s.slice(start, end);
        const m = isSingle ? block.match(/next:\\s*["'][^"']*["']/) : block.match(/^    next:\\s*["'][^"']*["']/m);
        if (!m) { console.error('!! 节点 ${fromId} 无 next 字段，无法重定向'); return { changed: false }; }
        const repl = isSingle ? 'next: ' + JSON.stringify(${JSON.stringify(toId)}) : '    next: ' + JSON.stringify(${JSON.stringify(toId)});
        s = s.slice(0, start) + block.replace(m[0], repl) + s.slice(end);
        return { changed: true, s, msg: '${fromId}.next → ${toId}' };
      });`
    } else {
      const id = op.id
      return `// 整块替换节点 ${id}\n      const NODE${i} = ${code};\n      apply(${JSON.stringify(op.file)}, (s) => {\n        const start = s.indexOf('\\n  ' + ${JSON.stringify(id)} + ': ');\n        if (start < 0) { console.error('!! 未找到节点 ${id}'); return { changed: false }; }\n        const lineEnd = s.indexOf('\\n', start + 1);\n        const firstLine = (lineEnd < 0 ? s.slice(start) : s.slice(start, lineEnd));\n        let end;\n        if (/},\\s*$/.test(firstLine)) {\n          end = start + firstLine.length;\n        } else {\n          const e = s.indexOf('\\n  },', start);\n          if (e < 0) { console.error('!! 未找到节点边界 ${id}'); return { changed: false }; }\n          end = e + 5;\n        }\n        s = s.slice(0, start) + '\\n' + NODE${i} + s.slice(end);\n        return { changed: true, s, msg: '替换 ${id}' };\n      });`
    }
  }).join('\n\n')
  return head + body + '\n' + steps + '\n'
}

// ============ 任务节点生成 ============
function genTaskNode(t) {
  const steps = t.steps.map(s =>
    `    // 达成任务步骤：${s.label}（${s.id}）\n    if (stepId === ${JSON.stringify(s.id)}) {\n      user.completeTaskStep?.(${JSON.stringify(t.id)}, ${JSON.stringify(s.id)});\n    }`
  ).join('\n')
  const nodeId = t.id + 'Done'
  const code = `  ${nodeId}: {\n    name: ${jsStr(form.value.name || '林恩')},\n    text: "任务达成：${t.desc}。",\n    onEnter: (stepId) => {\n${steps}\n    },\n    next: "end",\n  },`
  genCode.value = code
  patchOps.value.push({ kind: 'insert', id: nodeId, file: curFile.value, code, preview: `任务 ${t.id} 节点`, afterId: selNodeId.value || null })
  ElMessage.success(`已生成任务节点 ${nodeId} 并加入补丁`)
  selNodeId.value = null
}

// ============ 直接写入项目（开发模式：POST 到 Vite 中间件） ============
async function writeToProject() {
  if (!patchOps.value.length) {
    const c = genNodeCode()
    if (!c) return
    patchOps.value.push({ kind: 'insert', id: form.value.id.trim(), file: curFile.value, code: c, preview: '手动加入', afterId: selNodeId.value || null })
  }
  // 🔖 记录写入前选中：替换操作恢复新节点 id，其余恢复原选中
  const prevSel = selNodeId.value
  const replaceOp = patchOps.value.find(o => o.kind === 'replace')
  const restoreId = replaceOp?.id || prevSel
  // 📜 保存右侧编辑面板滚动位置（HMR/重载后还原）
  const rt = rightPanelRef.value?.scrollTop ?? 0
  if (rt > 0) sessionStorage.setItem('dladmin_restore_rt', String(rt))
  const body = { ops: patchOps.value.map(o => ({ kind: o.kind, file: o.file, code: o.code, afterId: o.afterId || null, id: o.id, pos: o.pos, fromId: o.fromId || null, toId: o.toId || null })) }
  try {
    const resp = await fetch('/__dladmin_write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await resp.json()
    if (data?.ok) {
      const fails = (data.results || []).filter(r => !r.ok)
      if (fails.length) {
        ElMessage.warning('部分写入失败：' + fails.map(f => f.file + ' · ' + f.msg).join('；'))
      } else {
        // ElMessage.success('✅ 已直接写入项目！' + (data.results || []).map(r => r.file + ' ' + r.msg).join('；'))
        patchOps.value = []
        // 🔖 记录要恢复选中的节点 id（sessionStorage：写入会触发 HMR 重跑 setup / 页面重载，
        //    由顶层 loadFile 消费标记恢复选中；若 HMR 未触发（中间件 unwatch 生效），1.2s 后强制 reload 兜底）
        if (restoreId) sessionStorage.setItem('dladmin_restore', restoreId)
        // 📁 记录当前加载的文件：写入后重载仍停留在本文件（而不是回默认商人文件）
        sessionStorage.setItem('dladmin_restore_file', curFile.value)
        setTimeout(() => {
          if (sessionStorage.getItem('dladmin_restore')) location.reload()
        }, 1200)
      }
    } else {
      ElMessage.error('写入失败：' + (data?.msg || '未知错误'))
    }
  } catch (e) {
    console.error('[dladmin] 写入失败', e)
    ElMessage.error('写入失败：请确认当前是 npm run dev 开发模式运行（localhost:8081）')
  }
}

// ============ 🗺️ 地牢编辑 ============
const dungeonLoaded = ref(false)
const dungeonLoading = ref(false)
const dungeonCfg = ref(null)
const dungeonDrops = ref(null)
const dungeonOpen = reactive({
  weatherTable: true, weather: true, weatherDesc: true, player: true,
  enemy: true, battle: true, drops: true, respawn: true, audio: true,
})
const DUNGEON_WEATHER_LABELS = { sunny: '晴天', rain: '雨天', fog: '雾天', storm: '暴风雨', thunderstorm: '雷雨天', bloodmoon: '血月', snow: '雪天' }
const DUNGEON_WEATHER_ICONS = { sunny: '☀️', rain: '🌧️', fog: '🌫️', storm: '⛈️', thunderstorm: '⚡', bloodmoon: '🌕', snow: '❄️' }
const DUNGEON_WEATHER_COLORS = { sunny: '#ffffff', rain: '#7ab8ff', fog: '#d9e3ee', storm: '#ff9d5c', thunderstorm: '#ffd84d', bloodmoon: '#ff6b6b', snow: '#dff0ff' }
const dungeonGroups = [
  { key: 'weatherTable', icon: '🌦️', title: '天气概率', desc: '各场景天气权重（0=不出现）' },
  { key: 'weather', icon: '🌡️', title: '天气数值', desc: '玩家减速 / 可见度 / 敌人加速' },
  { key: 'weatherDesc', icon: '📋', title: '天气说明', desc: '自动由数值生成（只读）' },
  { key: 'player', icon: '🏃', title: '玩家', desc: '移速 / 可见 / 天黑 / 冰面 / 摇杆' },
  { key: 'enemy', icon: '👾', title: '敌人', desc: '索敌范围 / 角度 / 追击 / 暗影' },
  { key: 'battle', icon: '⚔️', title: '战斗数值', desc: '雷击 / 岩浆 / 冻伤 / 血月加成' },
  { key: 'drops', icon: '💰', title: '敌人掉落表', desc: '每个敌人独立掉落概率' },
  { key: 'respawn', icon: '🎲', title: '刷新道具池', desc: '地牢随机刷新物品' },
  { key: 'audio', icon: '🎵', title: '音量', desc: '背景音乐 / 音效' },
]
const DUNGEON_FIELDS = {
  player: [
    { k: 'moveSpeed', label: '玩家移速', hint: '格/秒', min: 1, max: 20, step: 0.5 },
    { k: 'playerVisibleRadius', label: '玩家可见', hint: '格（tiled viewRadius 可覆盖）', min: 1, max: 20 },
    { k: 'nightAfterSec', label: '天黑时间', hint: '进入后多少秒天黑', min: 10, max: 600 },
    { k: 'nightFadeSec', label: '天黑渐变', hint: '秒', min: 1, max: 120 },
    { k: 'iceSlideSpeedRatio', label: '冰面倍率', hint: '冰面移动速度', min: 0.1, max: 5, step: 0.05 },
    { k: 'iceSlideDecay', label: '冰面消耗', hint: '每滑一格能量', min: 0, max: 1, step: 0.05 },
    { k: 'iceSlideInitEnergy', label: '初始滑行', hint: '能量', min: 0, max: 5, step: 0.1 },
    { k: 'pushSpeedRatio', label: '推动倍率', hint: '推箱速度', min: 0.05, max: 1, step: 0.05 },
    { k: 'joyDeadzone', label: '摇杆死区', hint: '', min: 0, max: 0.9, step: 0.02 },
    { k: 'gridScale', label: '镜头缩放', hint: '', min: 0.1, max: 2, step: 0.05 },
  ],
  enemy: [
    { k: 'enemyAggroRadius', label: '索敌半径', hint: '格（tiled aggroRadius 可覆盖）', min: 1, max: 30 },
    { k: 'enemyFovDeg', label: '索敌角度', hint: '度（tiled fovAngle 可覆盖）', min: 10, max: 360 },
    { k: 'enemyChaseBonus', label: '追击加成', hint: '追击时范围额外提升（格）', min: 0, max: 10 },
    { k: 'shadowAggro', label: '暗影索敌', hint: '暗影怪索敌半径（格）', min: 1, max: 30 },
    { k: 'shadowFovDeg', label: '暗影角度', hint: '暗影怪索敌角度（度）', min: 10, max: 360 },
    { k: 'shadowClose', label: '暗影近身', hint: '近身圆形索敌半径', min: 0.5, max: 10, step: 0.5 },
    { k: 'nightEnemySpeedBonus', label: '夜晚加速', hint: '血月/夜晚敌人移速加成', min: 0, max: 20 },
    { k: 'leiniaofuSightScale', label: '雷鸟半径', hint: '雷鸟索敌半径倍率', min: 0.1, max: 3, step: 0.1 },
    { k: 'leiniaofuFovMult', label: '雷鸟角度', hint: '雷鸟索敌角度倍率', min: 0.1, max: 3, step: 0.1 },
  ],
  battle: [
    { k: 'thunderInterval', label: '雷击间隔', hint: '秒', min: 1, max: 60 },
    { k: 'thunderWarnTime', label: '雷击预警', hint: '秒', min: 0, max: 10 },
    { k: 'thunderDmgPct', label: '雷击伤害', hint: '最大生命百分比', min: 0, max: 1, step: 0.01 },
    { k: 'thunderConductPct', label: '传导伤害', hint: '水面传导比例', min: 0, max: 1, step: 0.01 },
    { k: 'magmaDmgPctScale', label: '岩浆伤害', hint: 'tiled damage × 此比例', min: 0, max: 0.1, step: 0.001 },
    { k: 'frostDmgPct', label: '冻伤扣血', hint: '最大生命百分比/次', min: 0, max: 0.2, step: 0.005 },
  ],
  bloodmoon: [
    { k: 'actionBar', label: '行动条+' }, { k: 'atk', label: '攻击+' }, { k: 'hp', label: '生命+' },
    { k: 'spd', label: '速度+' }, { k: 'exp', label: '经验+' },
  ],
}
const DUNGEON_SCENE_NAMES = { battle_01: '幽暗森林', battle_02: '碎石场', battle_03: '宽阔平原' }
function dungeonSceneName(sc) { return DUNGEON_SCENE_NAMES[sc] || sc }
const DUNGEON_ENEMY_NAMES = { monster1: '暗影', guaiwu2: '魔化猫', guaiwu3: '雷鸟', anyingwang: '暗影王', jutong: '巨型眼瞳', nvhuang: '雷鸟女皇', fengxi: '风息' }
function dungeonEnemyName(mon) { return DUNGEON_ENEMY_NAMES[mon] || mon }
function dungeonWeatherDesc(wk) {
  const c = dungeonCfg.value || {}
  const w = c.weather?.[wk] || {}
  const f = c.frost || {}
  const bb = c.bloodmoonBattle || {}
  const nes = c.nightEnemySpeedBonus
  switch (wk) {
    case 'sunny': return '风和日丽，无任何特殊效果。'
    case 'rain': return `玩家移动速度降低 ${Math.round((w.playerSlow || 0) * 100)}%。`
    case 'fog': return `玩家可见度降低 ${w.fogReduce || 0} 格。\n敌人的索敌框隐藏，玩家更容易被偷袭`
    case 'storm': return `玩家移动速度降低 ${Math.round((w.playerSlow || 0) * 100)}%，可见度降低 ${w.fogReduce || 0} 格\n每隔一段时间都会刮来一阵暴风，强制移动玩家位置。`
    case 'thunderstorm': return `玩家移动速度降低 ${Math.round((w.playerSlow || 0) * 100)}%，可见度降低 ${w.fogReduce || 0} 格\n每 ${c.thunderInterval} 秒在玩家附近预警 ${c.thunderWarnTime} 秒并降下雷电，造成 ${Math.round((c.thunderDmgPct || 0) * 100)}% 最大生命值伤害。`
    case 'bloodmoon': return `敌人移动速度提升 ${nes} 格\n敌人进入战斗后行动条立即提升 ${Math.round((bb.actionBar || 0) * 100)}%，攻击力 +${Math.round((bb.atk || 0) * 100)}%，最大生命值 +${Math.round((bb.hp || 0) * 100)}%，速度 +${Math.round((bb.spd || 0) * 100)}%\n击败敌人的经验值 +${Math.round((bb.exp || 0) * 100)}%`
    case 'snow': return `玩家移动速度降低 ${Math.round((w.playerSlow || 0) * 100)}%，灯光失效\n岩浆被冻结为石板、水面结冰\n战斗中双方附着霜冻\n呆满 ${f.staySec} 秒后每 ${f.dmgInterval} 秒扣除 1% 最大生命值。`
    default: return ''
  }
}
const DUNGEON_WEATHER_PREVIEW = computed(() => {
  const out = {}
  for (const wk of Object.keys(DUNGEON_WEATHER_LABELS)) {
    out[wk] = { name: DUNGEON_WEATHER_LABELS[wk], icon: DUNGEON_WEATHER_ICONS[wk], color: DUNGEON_WEATHER_COLORS[wk], desc: dungeonWeatherDesc(wk) }
  }
  return out
})
// ✍️ 天气说明：把「按当前数值自动生成」的文案填入该天气的 desc（可在此基础上手动改）
function regenerateWeatherDesc(wk) {
  const w = dungeonCfg.value?.weather?.[wk]
  if (!w) return
  w.desc = dungeonWeatherDesc(wk)
}
function dnum(v, fallback) { const n = Number(v); return Number.isFinite(n) ? String(n) : String(fallback ?? 0) }
function dstr(v) { return JSON.stringify(String(v ?? '')) }
function serializeDungeonCfg(cfg) {
  const c = cfg || {}
  const L = []
  const numKeyCmt = {
    moveSpeed: '玩家格子移动速度（格/秒）', playerVisibleRadius: '玩家可见默认格数（tiled viewRadius 可覆盖）',
    nightAfterSec: '进入地牢后多少秒天黑', nightFadeSec: '天黑前渐变秒数',
    iceSlideSpeedRatio: '冰面移动速度倍率', iceSlideDecay: '每滑一格消耗能量', iceSlideInitEnergy: '初始滑行能量',
    pushSpeedRatio: '推动木箱速度倍率', joyDeadzone: '摇杆死区', gridScale: '镜头固定缩放',
    enemyAggroRadius: '普通敌人索敌半径（格）', enemyFovDeg: '普通敌人索敌角度（度）', enemyChaseBonus: '追击范围额外提升（格）',
    shadowAggro: '暗影怪索敌半径（格）', shadowFovDeg: '暗影怪索敌角度（度）', shadowClose: '暗影怪近身圆形索敌半径（格）',
    nightEnemySpeedBonus: '血月/夜晚敌人移速加成（格/秒）', leiniaofuSightScale: '雷鸟索敌半径倍率', leiniaofuFovMult: '雷鸟索敌角度倍率',
    thunderInterval: '雷击间隔（秒）', thunderWarnTime: '雷击预警（秒）', thunderDmgPct: '雷击伤害（最大生命百分比）',
    thunderConductPct: '水面传导伤害比例', magmaDmgPctScale: '岩浆每秒伤害比例', frostDmgPct: '冻伤每次扣血（最大生命百分比）',
    rarePoolPercent: '稀有道具占比（%）',
  }
  const order = ['moveSpeed', 'playerVisibleRadius', 'nightAfterSec', 'nightFadeSec', 'iceSlideSpeedRatio', 'iceSlideDecay', 'iceSlideInitEnergy', 'pushSpeedRatio', 'joyDeadzone', 'gridScale', 'enemyAggroRadius', 'enemyFovDeg', 'enemyChaseBonus', 'shadowAggro', 'shadowFovDeg', 'shadowClose', 'nightEnemySpeedBonus', 'leiniaofuSightScale', 'leiniaofuFovMult', 'thunderInterval', 'thunderWarnTime', 'thunderDmgPct', 'thunderConductPct', 'magmaDmgPctScale', 'frostDmgPct', 'rarePoolPercent']
  for (const k of order) {
    if (!(k in c)) continue
    const pad = ' '.repeat(Math.max(1, 18 - k.length))
    L.push(`  ${k}:${pad}${dnum(c[k])},${numKeyCmt[k] ? ' // ' + numKeyCmt[k] : ''}`)
  }
  L.push(`  frost: { staySec: ${dnum(c.frost?.staySec, 90)}, dmgInterval: ${dnum(c.frost?.dmgInterval, 12)} },  // 雪天冻伤：呆满秒数 / 扣血间隔`)
  const bb = c.bloodmoonBattle || {}
  L.push(`  bloodmoonBattle: { actionBar: ${dnum(bb.actionBar)}, atk: ${dnum(bb.atk)}, hp: ${dnum(bb.hp)}, spd: ${dnum(bb.spd)}, exp: ${dnum(bb.exp)} },`)
  L.push('  respawnPool: [')
  for (const it of (c.respawnPool || [])) {
    let s = `    { name: ${dstr(it.name)}, chance: ${dnum(it.chance)}, img: ${dstr(it.img)}`
    if (it.max != null && it.max !== '') s += `, max: ${dnum(it.max)}`
    if (it.rare) s += ', rare: true'
    L.push(s + ' },')
  }
  L.push('  ],')
  L.push('  weather: {')
  for (const [wk, w] of Object.entries(c.weather || {})) {
    const ww = w || {}
    let s = `    ${wk}:        { playerSlow: ${dnum(ww.playerSlow)}, fogReduce: ${dnum(ww.fogReduce)}, enemySpeedUp: ${dnum(ww.enemySpeedUp)}`
    if (ww.desc) s += `, desc: ${dstr(ww.desc)}`
    L.push(s + ' },')
  }
  L.push('  },')
  L.push('  weatherTable: {')
  for (const [sc, w] of Object.entries(c.weatherTable || {})) {
    const ww = w || {}
    L.push(`    ${sc}: { sunny: ${dnum(ww.sunny)}, rain: ${dnum(ww.rain)}, fog: ${dnum(ww.fog)}, storm: ${dnum(ww.storm)}, thunderstorm: ${dnum(ww.thunderstorm)}, bloodmoon: ${dnum(ww.bloodmoon)}, snow: ${dnum(ww.snow)} },`)
  }
  L.push('  },')
  const bg = c.bgVolume || {}
  L.push(`  bgVolume: { sunny: ${dnum(bg.sunny)}, fog: ${dnum(bg.fog)}, bloodmoon: ${dnum(bg.bloodmoon)}, rain: ${dnum(bg.rain)}, storm: ${dnum(bg.storm)}, thunderstorm: ${dnum(bg.thunderstorm)}, snow: ${dnum(bg.snow)} },`)
  const sf = c.sfxVolume || {}
  const sfKeys = ['zoulu', 'caishui', 'shatu', 'shoushang', 'dalei', 'lock', 'open', 'shiqu', 'jingti', 'zhandou', 'kongbugongji']
  L.push('  sfxVolume: { ' + sfKeys.map(k => `${k}: ${dnum(sf[k])}`).join(', ') + ' },')
  return L.join('\n')
}
function serializeDrops(drops) {
  const L = []
  for (const [mon, rows] of Object.entries(drops || {})) {
    L.push(`  // ${dungeonEnemyName(mon)}（战斗 spine=${mon}）`)
    L.push(`  ${mon}: [`)
    for (const r of (rows || [])) L.push(`    { item: ${dstr(r.item)}, base: ${dnum(r.base)} },`)
    L.push('  ],')
  }
  return L.join('\n')
}
async function loadDungeonConfig() {
  dungeonLoading.value = true
  try {
    const t = Date.now()
    const cfgMod = await import(`/src/pages/pixi/dungeon/config.js?t=${t}`)
    const dropMod = await import(`/src/pages/pixi/dungeon/dropRates.js?t=${t}`)
    dungeonCfg.value = JSON.parse(JSON.stringify(cfgMod.DUNGEON_EDIT_CFG || {}))
    dungeonDrops.value = JSON.parse(JSON.stringify(dropMod.ENEMY_DROP_RATES || {}))
    dungeonLoaded.value = true
    ElMessage.success('地牢配置已加载')
  } catch (e) {
    console.error('[dladmin] 地牢配置加载失败', e)
    ElMessage.error('加载失败：' + ((e && e.message) || e))
  } finally {
    dungeonLoading.value = false
  }
}
async function saveDungeonConfig() {
  if (!dungeonLoaded.value) { ElMessage.warning('请先加载'); return }
  const ops = [
    { kind: 'dungeon', code: serializeDungeonCfg(dungeonCfg.value) },
    { kind: 'dungeonDrops', code: serializeDrops(dungeonDrops.value) },
  ]
  try {
    const resp = await fetch('/__dladmin_write', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ops }),
    })
    const j = await resp.json()
    const bad = (j.results || []).filter(r => !r.ok)
    if (bad.length) ElMessage.error('写入失败：' + bad.map(b => b.file + ' ' + b.msg).join('；'))
    else {
      ElMessage.success('地牢配置已写入，重进地牢生效')
      localStorage.setItem('dladmin_restore_tab', 'dungeon') // 保存后 Vite reload，恢复本 tab
    }
  } catch (e) {
    ElMessage.error('写入失败：' + ((e && e.message) || e))
  }
}
function addDropRow(mon) {
  if (!dungeonDrops.value[mon]) dungeonDrops.value[mon] = []
  dungeonDrops.value[mon].push({ item: '', base: 0.1 })
}

// ============ 🎓 编辑天赋 ============
const talentEditList = ref([])
const talentSelId = ref('')
// 💎 点满全部天赋所需天赋点（实时计算）
const talentAllPoint = computed(() => talentEditList.value.reduce((sum, t) => sum + talentPointToMax(t), 0))
const talentLoaded = ref(false)
const selTalent = computed(() => talentEditList.value.find(t => t.id === talentSelId.value) || null)

async function loadTalentConfig() {
  try {
    const resp = await fetch('/src/store/counter-store.js')
    const src = await resp.text()
    const m = src.match(/const DEFAULT_TALENT_CONFIG_SNAPSHOT = \[[\s\S]*?^        \];/m)
    if (!m) { ElMessage.error('未找到天赋配置数组'); return }
    const arrText = m[0].slice(m[0].indexOf('[') + 1, m[0].lastIndexOf(']'))
    const arr = Function('return [' + arrText + ']')()
    talentEditList.value = (Array.isArray(arr) ? arr : []).map(t => ({
      ...t,
      prerequisites: (t.prerequisites || []).map(p => typeof p === 'string' ? { id: p, minLevel: 1 } : { id: p.id, minLevel: p.minLevel || 1 }),
      tier: t.tier || 1, col: t.col ?? 0,
      cost: t.cost ?? 1, levelCost: t.levelCost ?? t.cost ?? 1, maxLevel: t.maxLevel ?? 1,
      effectEntries: Object.entries(t.effect || {}).map(([k, v]) => ({ key: k, value: v !== null && typeof v === 'object' ? JSON.stringify(v) : String(v) })),
      icon: t.icon || '',
    }))
    talentLoaded.value = true
    // 🎯 恢复上次保存时的页面状态（保存后若触发 HMR 刷新，仍停留天赋页）
    try {
      const st = JSON.parse(sessionStorage.getItem('dladmin_talent_state') || 'null')
      if (st && st.tab === 'talent') {
        curTab.value = 'talent'
        if (st.selId && talentEditList.value.some(x => x.id === st.selId)) talentSelId.value = st.selId
        if (typeof st.ox === 'number') talentViewOffset.value.x = st.ox
        if (typeof st.oy === 'number') talentViewOffset.value.y = st.oy
        if (typeof st.scale === 'number' && st.scale > 0) talentScale.value = st.scale
      }
    } catch (e) { }
    if (!talentSelId.value && talentEditList.value.length) talentSelId.value = talentEditList.value[0].id
    if (talentView.value === 'canvas') preloadTalentIcons()
    if (talentView.value === 'canvas') nextTick(() => drawTalentCanvas())
    ElMessage.success(`已加载 ${talentEditList.value.length} 个天赋`)
  } catch (e) {
    console.error('[dladmin] 加载天赋失败', e)
    ElMessage.error('加载天赋失败：' + (e?.message || e))
  }
}
function selectTalent(id) { talentSelId.value = id }
function addTalent() {
  ElMessageBox.prompt('输入新天赋的中文名（id 自动生成）', '＋ 新增天赋', {
    inputValue: '新天赋', confirmButtonText: '创建', cancelButtonText: '取消',
    inputValidator: v => { if (!String(v || '').trim()) return '名称不能为空'; return true },
  }).then(({ value }) => {
    const name = String(value || '').trim()
    const id = 'new_talent_' + Date.now().toString(36)
    // 📍 新天赋放到第一行（tier=1）最靠右天赋的右侧
    const row1 = talentEditList.value.filter(t => (t.tier || 1) === 1)
    const maxCol = row1.length ? Math.max(...row1.map(t => Number(t.col) || 0)) : 0
    talentEditList.value.push({ id, name, description: '', cost: 1, color: '#409EFF', tier: 1, col: maxCol + 1, prerequisites: [], maxLevel: 1, levelCost: 1, icon: '', effectEntries: [] })
    talentSelId.value = id
    ElMessage.success('已新增「' + name + '」，设置后点「保存写入」')
    if (talentView.value === 'canvas') nextTick(() => drawTalentCanvas())
  }).catch(() => { })
}
function addPrereq() {
  if (!selTalent.value) return
  if (!selTalent.value.prerequisites) selTalent.value.prerequisites = []
  selTalent.value.prerequisites.push({ id: '', minLevel: 1 })
}
function delTalent() {
  const t = selTalent.value
  if (!t) return
  ElMessageBox.confirm('确定删除天赋「' + (t.name || t.id) + '」？删除后需点「保存写入」才真正生效。', '删除确认', {
    type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消',
  }).then(() => {
    talentEditList.value = talentEditList.value.filter(x => x.id !== t.id)
    talentSelId.value = talentEditList.value[0]?.id || ''
    ElMessage.success('已删除，点「保存写入」生效')
  }).catch(() => { })
}
const EFFECT_KEY_HINTS = {
  dropMult: '击杀掉落概率加成（0.25 = +25%）',
  dmgBonus: '伤害加成（0.2 = +20%）',
  takenReduce: '受到伤害减免（0.12 = -12%）',
  atkPct: '攻击力百分比加成（0.4 = +40%）',
  atkBuffPct: '攻击 Buff 加成百分比（每层 +N%）',
  mpPerLv: '每级魔力数值（每级 +N）',
  mp: '魔力数值（+N 点）',
  baseMp: '基础魔力（+N 点）',
  basePct: '基础百分比（随天赋等级）',
  perLvPct: '每级追加百分比',
  rates: '各等级取值数组（按等级取对应项）',
  baseLuck: '基础幸运（+N 点）',
  perLvLuck: '每级幸运（每级 +N 点）',
  thresholdBase: '斩杀血量阈值基础（0.25 = 25% 血以下）',
  thresholdPerLv: '斩杀阈值每级追加（+0.1 = +10%）',
  dmgBase: '伤害倍率基础（0.2 = 攻击力 20%）',
  dmgPerLv: '伤害倍率每级追加（+0.025 = +2.5%）',
  perLv: '每级加成值',
  baseProb: '基础触发概率（0.3 = 30%）',
  probPerLv: '每级触发概率追加',
  dmgRatios: '各等级伤害倍率数组',
  vulnPct: '易伤：敌人受伤提升（0.15 = +15%）',
  actionPerLv: '行动条（2000 = 20% 行动条）',
  mpLv1: '1 级魔力回复值',
  mpLv2: '2 级魔力回复值',
  // ===== 补充的常用效果 key =====
  baseProgress: '基础行动条进度（1000 = 10%）',
  perLvProgress: '每级行动条进度追加（+1000 = +10%）',
  baseRate: '基础概率（0.3 = 30%）',
  perLvRate: '每级概率追加（+0.05 = +5%）',
  maxRate: '概率上限（0.5 = 50%）',
  perStackRate: '每层叠加概率（+0.05 = +5%）',
  incProb: '触发概率提升（0.1 = +10%）',
  cdReduce: '冷却缩减（0.1 = -10%）',
  keepHp: '免死：受到致命伤害时保留生命值（1 = 保留 1 点）',
  actionBarReducePct: '敌人行动条获取速率降低百分比（50 = 降 50%）',
  attackReducePct: '敌人攻击力降低百分比（20 = 降 20%）',
  slowSpeed: '敌人追击减速百分比（20 = 降 20%）',
  healPct: '回复生命百分比（0.1 = +10%）',
  shieldPct: '护盾百分比（0.15 = 最大生命 15% 护盾）',
  hpRate: '生命值百分比相关（0.1 = +10%）',
  selfHurtPct: '自伤百分比（0.05 = 扣 5% 生命）',
  transferPct: '转移百分比（0.1 = 转移 10%）',
  hits: '额外攻击次数（+N 次）',
  ticks: '持续结算跳数（+N 次）',
  enable: '开关（1 = 启用该效果）',
  needCards: '恢复灵力所需手牌数（5 = 每使用5张）',
  perLvCards: '每级所需手牌数变化（-1 = 每级少1张）',
  extraSlot: '额外装备栏位（+N 格）',
}
function effectKeyHint(k) {
  if (!k) return ''
  return EFFECT_KEY_HINTS[String(k).trim()] || '自定义效果 key：战斗代码按此 key 读取，未配置时使用代码默认值'
}

function addTalentEffect() {
  if (!selTalent.value) return
  if (!selTalent.value.effectEntries) selTalent.value.effectEntries = []
  selTalent.value.effectEntries.push({ key: '', value: '' })
}
function genTalentIdNear(base) {
  const ids = new Set(talentEditList.value.map(t => t.id))
  let n = 1
  let id = base + '_' + n
  while (ids.has(id)) { n++; id = base + '_' + n }
  return id
}
function addTalentBefore() {
  const sel = selTalent.value
  if (!sel) return
  if (!sel.prerequisites?.length) { ElMessage.warning('根节点天赋无法添加前置位'); return }
  ElMessageBox.prompt('输入新前置天赋的中文名（id 自动生成，自动连线）', '🔺 前置位添加', {
    inputValue: '新前置天赋', confirmButtonText: '创建', cancelButtonText: '取消',
    inputValidator: v => { if (!String(v || '').trim()) return '名称不能为空'; return true },
  }).then(({ value }) => {
    const name = String(value || '').trim()
    const id = genTalentIdNear(sel.id + '_pre')
    talentEditList.value.push({ id, name, description: '', cost: 1, color: '#67C23A', tier: Math.max(1, (sel.tier || 1) - 1), col: sel.col ?? 0, prerequisites: [], maxLevel: 1, levelCost: 1, icon: '', effectEntries: [] })
    sel.prerequisites.push({ id, minLevel: 1 })
    talentSelId.value = id
    ElMessage.success('已在前置位新增「' + name + '」并自动连线')
    if (talentView.value === 'canvas') nextTick(() => drawTalentCanvas())
  }).catch(() => { })
}
function addTalentAfter() {
  const sel = selTalent.value
  if (!sel) return
  ElMessageBox.prompt('输入新后继天赋的中文名（id 自动生成，自动连线）', '🔻 后置位添加', {
    inputValue: '新后继天赋', confirmButtonText: '创建', cancelButtonText: '取消',
    inputValidator: v => { if (!String(v || '').trim()) return '名称不能为空'; return true },
  }).then(({ value }) => {
    const name = String(value || '').trim()
    const id = genTalentIdNear(sel.id + '_next')
    talentEditList.value.push({ id, name, description: '', cost: 1, color: '#E6A23C', tier: (sel.tier || 1) + 1, col: sel.col ?? 0, prerequisites: [{ id: sel.id, minLevel: 1 }], maxLevel: 1, levelCost: 1, icon: '', effectEntries: [] })
    talentSelId.value = id
    ElMessage.success('已在新后继位新增「' + name + '」并自动连线')
    if (talentView.value === 'canvas') nextTick(() => drawTalentCanvas())
  }).catch(() => { })
}
function serializeTalentArray(arr) {
  const order = ['id', 'name', 'description', 'cost', 'color', 'icon', 'tier', 'col', 'prerequisites', 'maxLevel', 'levelCost', 'autoGranted', 'attrReq', 'levelDescriptions']
  return arr.map(t => {
    const lines = []
    for (const k of order) {
      const v = t[k]
      if (v === undefined) continue
      if (k === 'icon' && !String(v || '').trim()) continue
      if (k === 'prerequisites') {
        const prs = (v || []).map(p => p && typeof p === 'object' ? `{ id: ${JSON.stringify(p.id || '')}, minLevel: ${Number(p.minLevel) || 1} }` : `'${p}'`)
        lines.push(`prerequisites: [${prs.join(', ')}],`)
      } else if (Array.isArray(v)) {
        lines.push(`${k}: [${v.map(x => JSON.stringify(x)).join(', ')}],`)
      } else if (typeof v === 'string') lines.push(`${k}: ${JSON.stringify(v)},`)
      else if (typeof v === 'boolean') lines.push(`${k}: ${v},`)
      else lines.push(`${k}: ${v},`)
    }
    // 🎯 战斗效果（effectEntries → effect 对象，数字转数字、其余转字符串）
    const eff = (t.effectEntries || []).filter(e => e && e.key && String(e.key).trim())
    if (eff.length) {
      const parts = eff.map(e => {
        const key = JSON.stringify(String(e.key).trim())
        const raw = String(e.value ?? '').trim()
        let val
        if (!raw) val = 0
        else if (/^-?\d*\.?\d+$/.test(raw)) val = Number(raw)
        else {
          try {
            const parsed = JSON.parse(raw)
            // JSON 文本即合法 JS 对象字面量（如 {"1":0.4,"2":0.5}），原样输出
            val = (parsed !== null && typeof parsed === 'object') ? raw : JSON.stringify(raw)
          } catch (err) { val = JSON.stringify(raw) }
        }
        return key + ': ' + val
      })
      lines.push('effect: { ' + parts.join(', ') + ' },')
    }
    return '          {\n            ' + lines.join('\n            ') + '\n          },'
  }).join('\n')
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
      ElMessage.success('✅ 天赋已写入 counter-store.js，读档自动生效')
      // 🎯 热刷新运行中的 store（派发 window 事件，不静态 import，避免 HMR 重置管理页）
      window.dispatchEvent(new CustomEvent('dladmin:talent-config-changed'))
      // 💾 记录状态（含画布视口/缩放）：即使发生 HMR 刷新也自动还原
      try { sessionStorage.setItem('dladmin_talent_state', JSON.stringify({ tab: 'talent', view: talentView.value, selId: talentSelId.value, ox: talentViewOffset.value.x, oy: talentViewOffset.value.y, scale: talentScale.value })) } catch (e) { }
    } else {
      ElMessage.error('写入失败：' + (data?.results?.[0]?.msg || data?.msg || '未知错误'))
    }
  } catch (e) {
    console.error('[dladmin] 天赋写入失败', e)
    ElMessage.error('写入失败：' + (e?.message || e))
  }
}

// ============ 🕸️ 天赋画布视图 ============
const talentView = ref('canvas')
const talentCanvasRef = ref(null)
const talentViewOffset = ref({ x: 0, y: 0 })
const talentScale = ref(0.7)
let talentNodePos = {}
let talentDragStart = null, talentDragOff = null
let talentTouchStart = null
let talentPinch = null // 📱 双指捏合缩放记录

const T_NODE_R = 34
const T_TIER_GAP = 170
const T_NODE_GAP = 150
const T_CENTER_COL = 4

function switchTalentView(v) {
  talentView.value = v
  if (v === 'canvas') {
    nextTick(() => drawTalentCanvas())
    preloadTalentIcons()
  }
}
// 📊 点满天赋所需天赋点 = 解锁 cost + levelCost ×（maxLevel-1）
// 🎁 任务获取（autoGranted: true）不消耗天赋点
function talentPointToMax(t) {
  if (t.autoGranted) return 0
  const cost = Number(t.cost) || 0
  const maxLv = Math.max(1, Number(t.maxLevel) || 1)
  const lvCost = Number(t.levelCost) || 0
  return cost + lvCost * (maxLv - 1)
}
// 递归收集某天赋的全部前置树（去重，防环）
function collectPrereqTree(t, out = new Set()) {
  for (const pre of t.prerequisites || []) {
    const preId = (pre && typeof pre === 'object') ? pre.id : pre
    if (!preId || out.has(preId)) continue
    out.add(preId)
    const p = talentEditList.value.find(x => x.id === preId)
    if (p) collectPrereqTree(p, out)
  }
  return out
}
// 计算点满某天赋全部前置所需天赋点
function calcPrereqCost(t) {
  const tree = collectPrereqTree(t)
  let total = 0
  for (const id of tree) {
    const p = talentEditList.value.find(x => x.id === id)
    if (p) total += talentPointToMax(p)
  }
  return { tree, total }
}
// 点满某天赋所需天赋点 = 前置树并集点满 + 该天赋自身点满
function talentNeedTotal(t) {
  const { total } = calcPrereqCost(t)
  return total + talentPointToMax(t)
}
function computeTalentLayout(W, H) {
  const pos = {}
  const cx = W / 2, cy = H / 2
  const maxTier = Math.max(1, ...talentEditList.value.map(t => t.tier || 1))
  const startY = cy - (maxTier * T_TIER_GAP) / 2 + T_TIER_GAP / 2
  for (const t of talentEditList.value) {
    const y = startY + ((t.tier || 1) - 1) * T_TIER_GAP
    const x = cx + ((t.col ?? 0) - T_CENTER_COL) * T_NODE_GAP
    pos[t.id] = { x, y }
  }
  return pos
}
function drawTalentCanvas() {
  const canvas = talentCanvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  if (!rect.width || !rect.height) return
  const dpr = window.devicePixelRatio || 1
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
  const W = rect.width, H = rect.height
  ctx.clearRect(0, 0, W, H)
  const pos = computeTalentLayout(W, H)
  talentNodePos = pos
  const s = talentScale.value, ox = talentViewOffset.value.x, oy = talentViewOffset.value.y
  ctx.save()
  ctx.translate(ox, oy)
  ctx.scale(s, s)
  // 连线（前置 → 本节点，与 TalentTree 同布局）
  for (const t of talentEditList.value) {
    const from = pos[t.id]
    if (!from || !t.prerequisites?.length) continue
    for (const pre of t.prerequisites) {
      const preId = (pre && typeof pre === 'object') ? pre.id : pre
      const to = pos[preId]
      if (!to) continue
      const minLv = (pre && typeof pre === 'object' && pre.minLevel) || 1
      ctx.beginPath()
      ctx.moveTo(to.x, to.y)
      ctx.lineTo(from.x, from.y)
      ctx.strokeStyle = 'rgba(148,163,184,.35)'
      ctx.lineWidth = 2
      ctx.stroke()
      if (minLv > 1) {
        const mx = (to.x + from.x) / 2, my = (to.y + from.y) / 2
        ctx.fillStyle = '#fbbf24'
        ctx.font = 'bold 11px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('Lv.' + minLv, mx, my + 14)
      }
    }
  }
  // 节点
  for (const t of talentEditList.value) {
    const p = pos[t.id]
    if (!p) continue
    const r = T_NODE_R
    const col = t.color || '#409EFF'
    const isSel = talentSelId.value === t.id
    if (isSel) {
      ctx.beginPath(); ctx.arc(p.x, p.y, r + 7, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(251,191,36,.25)'; ctx.fill()
    }
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
    ctx.fillStyle = col + '33'; ctx.fill()
    ctx.strokeStyle = isSel ? '#fbbf24' : col + 'aa'
    ctx.lineWidth = isSel ? 3 : 2
    ctx.stroke()
    // 🖼️ 天赋图标（tianfu spine 皮肤 = 皮肤名，可编辑，默认天赋 id）
    const ic = _tIconCache[(t.icon && String(t.icon).trim()) || t.id]
    if (ic) ctx.drawImage(ic, p.x - r + 3, p.y - r + 3, (r - 3) * 2, (r - 3) * 2)
    ctx.font = 'bold 12px sans-serif'
    ctx.fillStyle = isSel ? '#fbbf24' : '#e2e8f0'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    const label = t.name || t.id
    const maxW = r * 2.4
    let txt = label
    if (ctx.measureText(txt).width > maxW) {
      while (txt.length > 1 && ctx.measureText(txt + '…').width > maxW) txt = txt.slice(0, -1)
      txt += '…'
    }
    ctx.fillText(txt, p.x, p.y + r + 6)
  }
  // 📊 所有节点下方：点满该节点自身所需天赋点
  const r = T_NODE_R
  ctx.font = 'bold 10px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  for (const t of talentEditList.value) {
    const p = pos[t.id]
    if (!p) continue
    if (t.autoGranted) {
      ctx.fillStyle = 'rgba(167,139,250,.9)'
      ctx.fillText('🎁 任务获取', p.x, p.y + r + 22)
      continue
    }
    const pm = talentPointToMax(t)
    ctx.fillStyle = pm > 0 ? 'rgba(52,211,153,.85)' : 'rgba(148,163,184,.45)'
    ctx.fillText('点满 ' + pm + ' 点', p.x, p.y + r + 22)
  }
  // 📊 所有非根节点显示「需要 X 点」= 前置并集点满 + 自身点满（根节点不显示）
  // 末行节点按共享前置分组合并去重后显示（如向死而生/灵能愈合共同显示），其余非根节点各自显示
  ctx.font = 'bold 11px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  const maxTier = Math.max(1, ...talentEditList.value.map(t => t.tier || 1))
  const lastRow = talentEditList.value.filter(t => (t.tier || 1) === maxTier)
  const lastIdSet = new Set(lastRow.map(t => t.id))
  for (const t of talentEditList.value) {
    if (lastIdSet.has(t.id)) continue
    if (!t.prerequisites?.length) continue // 根节点（无前置）不显示
    const p = pos[t.id]
    if (!p) continue
    ctx.fillStyle = 'rgba(251,191,36,.92)'
    ctx.fillText('需要 ' + talentNeedTotal(t) + ' 点', p.x, p.y + r + 38)
  }
  if (lastRow.length) {
    // 分组：前置树有交集的末行节点归为一组（传递合并）
    const items = lastRow.map(t => ({ t, tree: collectPrereqTree(t) }))
    const groups = []
    for (const it of items) {
      let placed = false
      for (const g of groups) {
        const share = g.some(x => x.t.id === it.t.id || [...x.tree].some(id => it.tree.has(id)))
        if (share) { g.push(it); placed = true; break }
      }
      if (!placed) groups.push([it])
    }
    let grandTotal = 0
    for (const g of groups) {
      const all = new Set()
      let total = 0
      for (const it of g) {
        for (const id of it.tree) {
          if (!all.has(id)) {
            all.add(id)
            const tp = talentEditList.value.find(x => x.id === id)
            if (tp) total += talentPointToMax(tp)
          }
        }
        total += talentPointToMax(it.t) // 该节点自身点满
      }
      grandTotal += total
      const xs = g.map(it => pos[it.t.id]?.x || 0)
      const ys = g.map(it => pos[it.t.id]?.y || 0)
      const cx2 = (Math.min(...xs) + Math.max(...xs)) / 2
      const cy = ys.reduce((a, b) => a + b, 0) / ys.length
      ctx.fillStyle = 'rgba(251,191,36,.92)'
      ctx.fillText('需要 ' + total + ' 点', cx2, cy + r + 38)
    }
    // 汇总：全部末行节点（含自身，共有前置只算一次）总消耗
    const ysAll = lastRow.map(t => pos[t.id]?.y || 0)
    const cyAll = ysAll.reduce((a, b) => a + b, 0) / ysAll.length
    const xsAll = lastRow.map(t => pos[t.id]?.x || 0)
    const cx2All = (Math.min(...xsAll) + Math.max(...xsAll)) / 2
    ctx.fillStyle = 'rgba(52,211,153,.95)'
    ctx.fillText('Σ 末行全部（含自身去重）共 ' + grandTotal + ' 点', cx2All, cyAll + r + 60)
  }
  ctx.restore()
}
function talentScreenToCanvas(sx, sy) {
  return { x: (sx - talentViewOffset.value.x) / talentScale.value, y: (sy - talentViewOffset.value.y) / talentScale.value }
}
function hitTalentNode(sx, sy) {
  for (const t of talentEditList.value) {
    const p = talentNodePos[t.id]
    if (!p) continue
    const dx = sx - p.x, dy = sy - p.y
    if (dx * dx + dy * dy < T_NODE_R * T_NODE_R) return t
  }
  return null
}
let talentNodeDrag = null
// ↩️ 画布节点移动历史（Ctrl+Z 撤销，上限 50 步）
const talentColHistory = []
function onTalentCanvasDown(e) {
  const rect = talentCanvasRef.value.getBoundingClientRect()
  const c = talentScreenToCanvas(e.clientX - rect.left, e.clientY - rect.top)
  // 🖱️ 拖动全程监听 window：拖出画布边界不中断（取消范围限制）
  window.addEventListener('mousemove', onTalentCanvasMove)
  window.addEventListener('mouseup', onTalentCanvasUp)
  // 🖱️ 中键（button===1）：只平移画布，不命中/拖动/选中节点，并阻止浏览器中键自动滚动
  if (e.button === 1) {
    e.preventDefault()
    talentNodeDrag = null
    talentDragStart = { x: e.clientX, y: e.clientY, middle: true }
    talentDragOff = { x: talentViewOffset.value.x, y: talentViewOffset.value.y }
    return
  }
  const hit = hitTalentNode(c.x, c.y)
  if (hit) {
    talentNodeDrag = { id: hit.id, startCol: hit.col ?? 0, startX: e.clientX, moved: false }
    return
  }
  talentDragStart = { x: e.clientX, y: e.clientY }
  talentDragOff = { x: talentViewOffset.value.x, y: talentViewOffset.value.y }
}
function onTalentCanvasMove(e) {
  if (talentNodeDrag) {
    const t = talentEditList.value.find(x => x.id === talentNodeDrag.id)
    if (t) {
      const dx = (e.clientX - talentNodeDrag.startX) / talentScale.value / T_NODE_GAP
      const nc = Math.round((talentNodeDrag.startCol + dx) * 100) / 100
      if (Math.abs(nc - (t.col ?? 0)) > 0.001) { t.col = nc; talentNodeDrag.moved = true }
    }
    drawTalentCanvas()
    return
  }
  if (!talentDragStart) return
  talentViewOffset.value.x = talentDragOff.x + (e.clientX - talentDragStart.x)
  talentViewOffset.value.y = talentDragOff.y + (e.clientY - talentDragStart.y)
  drawTalentCanvas()
}
function onTalentCanvasUp(e) {
  // 🖱️ 拖动结束解绑 window 监听
  window.removeEventListener('mousemove', onTalentCanvasMove)
  window.removeEventListener('mouseup', onTalentCanvasUp)
  if (talentNodeDrag) {
    if (talentNodeDrag.moved) { talentColHistory.push({ id: talentNodeDrag.id, col: talentNodeDrag.startCol }); if (talentColHistory.length > 50) talentColHistory.shift() }
    if (!talentNodeDrag.moved) {
      const rect = talentCanvasRef.value.getBoundingClientRect()
      const c = talentScreenToCanvas(e.clientX - rect.left, e.clientY - rect.top)
      const hit = hitTalentNode(c.x, c.y)
      if (hit) selectTalent(hit.id)
    }
    talentNodeDrag = null
    return
  }
  if (!talentDragStart) return
  const dx = Math.abs(e.clientX - talentDragStart.x)
  const dy = Math.abs(e.clientY - talentDragStart.y)
  // 🖱️ 中键平移抬起：不选中节点（减少误触），左键单击才选中
  if (!talentDragStart.middle && dx < 5 && dy < 5) {
    const rect = talentCanvasRef.value.getBoundingClientRect()
    const c = talentScreenToCanvas(e.clientX - rect.left, e.clientY - rect.top)
    const hit = hitTalentNode(c.x, c.y)
    if (hit) selectTalent(hit.id)
  }
  talentDragStart = null
}
function onTalentCanvasWheel(e) {
  const rect = talentCanvasRef.value.getBoundingClientRect()
  const mx = e.clientX - rect.left, my = e.clientY - rect.top
  const cx0 = (mx - talentViewOffset.value.x) / talentScale.value
  const cy0 = (my - talentViewOffset.value.y) / talentScale.value
  const ns = Math.max(0.3, Math.min(2, +(talentScale.value + (e.deltaY > 0 ? -0.1 : 0.1)).toFixed(2)))
  talentViewOffset.value.x = mx - cx0 * ns
  talentViewOffset.value.y = my - cy0 * ns
  talentScale.value = ns
  drawTalentCanvas()
}
function onTalentCanvasTouchStart(e) {
  // 📱 双指：记录捏合起始距离与缩放
  if (e.touches.length === 2) {
    const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY)
    talentPinch = { d, scale: talentScale.value }
    talentNodeDrag = null
    talentDragStart = null
    talentTouchStart = null
    return
  }
  if (e.touches.length !== 1) return
  const t = e.touches[0]
  talentTouchStart = { x: t.clientX, y: t.clientY }
  const rect = talentCanvasRef.value.getBoundingClientRect()
  const c = talentScreenToCanvas(t.clientX - rect.left, t.clientY - rect.top)
  const hit = hitTalentNode(c.x, c.y)
  if (hit) {
    talentNodeDrag = { id: hit.id, startCol: hit.col ?? 0, startX: t.clientX, moved: false }
    return
  }
  talentDragStart = { x: t.clientX, y: t.clientY }
  talentDragOff = { x: talentViewOffset.value.x, y: talentViewOffset.value.y }
}
function onTalentCanvasTouchMove(e) {
  // 📱 双指捏合缩放（以双指中心为锚点，保持中心点不动）
  if (e.touches.length === 2 && talentPinch) {
    const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY)
    if (talentPinch.d > 0) {
      const ns = Math.max(0.3, Math.min(2, +(talentPinch.scale * (d / talentPinch.d)).toFixed(2)))
      const rect = talentCanvasRef.value.getBoundingClientRect()
      const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left
      const my = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top
      const cx0 = (mx - talentViewOffset.value.x) / talentScale.value
      const cy0 = (my - talentViewOffset.value.y) / talentScale.value
      talentViewOffset.value.x = mx - cx0 * ns
      talentViewOffset.value.y = my - cy0 * ns
      talentScale.value = ns
      drawTalentCanvas()
    }
    return
  }
  if (e.touches.length !== 1) return
  const t = e.touches[0]
  if (talentNodeDrag) {
    const t2 = talentEditList.value.find(x => x.id === talentNodeDrag.id)
    if (t2) {
      const dx = (t.clientX - talentNodeDrag.startX) / talentScale.value / T_NODE_GAP
      const nc = Math.round((talentNodeDrag.startCol + dx) * 100) / 100
      if (Math.abs(nc - (t2.col ?? 0)) > 0.001) { t2.col = nc; talentNodeDrag.moved = true }
    }
    drawTalentCanvas()
    return
  }
  if (!talentDragStart) return
  talentViewOffset.value.x = talentDragOff.x + (t.clientX - talentDragStart.x)
  talentViewOffset.value.y = talentDragOff.y + (t.clientY - talentDragStart.y)
  drawTalentCanvas()
}
function onTalentCanvasTouchEnd() {
  talentPinch = null
  if (talentNodeDrag) {
    if (talentNodeDrag.moved) { talentColHistory.push({ id: talentNodeDrag.id, col: talentNodeDrag.startCol }); if (talentColHistory.length > 50) talentColHistory.shift() }
    if (!talentNodeDrag.moved && talentTouchStart) {
      const rect = talentCanvasRef.value.getBoundingClientRect()
      const c = talentScreenToCanvas(talentTouchStart.x - rect.left, talentTouchStart.y - rect.top)
      const hit = hitTalentNode(c.x, c.y)
      if (hit) selectTalent(hit.id)
    }
    talentNodeDrag = null
    talentTouchStart = null
    return
  }
  if (talentDragStart && talentTouchStart) {
    const dx = Math.abs(talentDragOff.x - talentViewOffset.value.x)
    const dy = Math.abs(talentDragOff.y - talentViewOffset.value.y)
    if (dx < 5 && dy < 5) {
      const rect = talentCanvasRef.value.getBoundingClientRect()
      const c = talentScreenToCanvas(talentTouchStart.x - rect.left, talentTouchStart.y - rect.top)
      const hit = hitTalentNode(c.x, c.y)
      if (hit) selectTalent(hit.id)
    }
    talentTouchStart = null
  }
  talentDragStart = null
}
// 🖼️ 天赋图标：优先读 TalentTree 写入的 sessionStorage 缓存，无则动态加载 tianfu spine 离屏渲染
const _tIconCache = {}
let _tIconSpineReady = null
async function _ensureTalentSpine() {
  if (_tIconSpineReady) return _tIconSpineReady
  _tIconSpineReady = (async () => {
    const { Application, Container, RenderTexture, Assets } = await import('pixi.js')
    const { Spine } = await import('@esotericsoftware/spine-pixi-v8')
    await Assets.add({ alias: 'tianfu_skel', src: '/tianfu/tianfu.skel' })
    await Assets.add({ alias: 'tianfu_atlas', src: '/tianfu/tianfu.atlas' })
    await Assets.load(['tianfu_skel', 'tianfu_atlas'])
    const app = new Application()
    await app.init({ width: 1, height: 1, backgroundAlpha: 0, antialias: false, autoStart: false, preference: 'webgl2', preserveDrawingBuffer: true })
    return { Application, Container, RenderTexture, Assets, Spine, app }
  })()
  return _tIconSpineReady
}
async function loadTalentIcon(talentId, skinName) {
  const skin = (skinName && String(skinName).trim()) || talentId
  if (_tIconCache[skin]) return _tIconCache[skin]
  // 优先复用 TalentTree 的 sessionStorage 缓存（key 用皮肤名，改皮肤名后自动重新渲染）
  try {
    const raw = sessionStorage.getItem('talent_icon_cache')
    if (raw) {
      const data = JSON.parse(raw)
      if (data[skin]) {
        const img = new Image()
        img.src = data[skin]
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej })
        _tIconCache[skin] = img
        return img
      }
    }
  } catch (e) { /* 缓存损坏则走 spine 渲染 */ }
  // 离屏渲染 tianfu spine
  try {
    const { Container, RenderTexture, Spine, app } = await _ensureTalentSpine()
    const iconSize = 80, dpr = window.devicePixelRatio || 1
    const canvas = document.createElement('canvas')
    canvas.width = iconSize * dpr; canvas.height = iconSize * dpr
    const container = new Container()
    const spine = new Spine({ skeleton: 'tianfu_skel', atlas: 'tianfu_atlas', allowMissingRegions: true, autoUpdate: false })
    const skins = spine.skeleton.data?.skins?.map(s => s.name) || []
    if (skins.includes(skin)) spine.skeleton.setSkinByName(skin)
    else if (skins.length > 0) spine.skeleton.setSkinByName(skins[0])
    if (spine.state) spine.state.clearTracks()
    container.addChild(spine)
    const renderTexture = RenderTexture.create({ width: Math.max(1, iconSize * dpr), height: Math.max(1, iconSize * dpr), resolution: 1 })
    await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame)
    const bounds = spine.getBounds()
    const s = Math.min((iconSize * 1.2) / Math.max(bounds.width, 1), (iconSize * 1.2) / Math.max(bounds.height, 1)) * dpr
    spine.scale.set(s); spine.x = (iconSize * dpr) / 2; spine.y = (iconSize * dpr) / 2
    spine.update(0)
    app.renderer.render({ container, target: renderTexture, clear: true })
    const source = app.renderer.extract.canvas(renderTexture)
    const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
    container.destroy({ children: true }); renderTexture.destroy()
    _tIconCache[skin] = canvas
    try {
      const raw = sessionStorage.getItem('talent_icon_cache') || '{}'
      const data = JSON.parse(raw)
      data[skin] = canvas.toDataURL()
      sessionStorage.setItem('talent_icon_cache', JSON.stringify(data))
    } catch (e) { /* ignore */ }
    return canvas
  } catch (e) {
    console.error('[天赋图标] 渲染失败', talentId, e)
    return null
  }
}
async function preloadTalentIcons() {
  const list = talentEditList.value
  const batch = 4
  for (let i = 0; i < list.length; i += batch) {
    await Promise.all(list.slice(i, i + batch).map(t => loadTalentIcon(t.id, (t.icon && String(t.icon).trim()) || t.id)))
  }
  if (talentView.value === 'canvas') drawTalentCanvas()
}

function onTalentResize() { if (talentView.value === 'canvas') drawTalentCanvas() }
window.addEventListener('resize', onTalentResize)
watch(talentEditList, () => { if (talentView.value === 'canvas') nextTick(() => drawTalentCanvas()) }, { deep: true })
// 🔁 切回「编辑天赋」tab 时重绘画布（v-if 重建后 / 隐藏期间加载过天赋的场景）
watch(curTab, () => {
  if (curTab.value === 'talent' && talentView.value === 'canvas') nextTick(() => drawTalentCanvas())
})
watch(talentSelId, () => { if (talentView.value === 'canvas') nextTick(() => drawTalentCanvas()) })
// ↩️ Ctrl+Z 撤销画布节点移动（焦点在输入框时不拦截，留给文本撤销）
function onTalentCanvasKeydown(e) {
  if (talentView.value !== 'canvas') return
  if (!(e.ctrlKey || e.metaKey) || (e.key !== 'z' && e.key !== 'Z')) return
  const tag = (e.target && e.target.tagName) || ''
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target && e.target.isContentEditable)) return
  const last = talentColHistory.pop()
  if (!last) return
  const t = talentEditList.value.find(x => x.id === last.id)
  if (t) { t.col = last.col; drawTalentCanvas(); ElMessage({ message: '↩️ 已撤销节点移动', type: 'success', duration: 900 }) }
}
window.addEventListener('keydown', onTalentCanvasKeydown)

// ============ 通用工具 ============
function copyText(t) {
  navigator.clipboard?.writeText(String(t)).then(() => {
    toast.value = '已复制：' + String(t)
    setTimeout(() => (toast.value = ''), 1200)
  }).catch(() => {
    toast.value = '复制失败（请手动复制）'
    setTimeout(() => (toast.value = ''), 1200)
  })
}
function copyNodeCode() {
  const c = genNodeCode()
  if (c) copyText(c)
}
function gotoGame() {
  router.push('/matter')
}

const ITEM_MODES = [{ key: 'items', label: '物品' },
  { key: 'lianzhi', label: '炼制' },
  { key: 'craft', label: '合成' },
  { key: 'shop', label: '商店' },
  { key: 'materials', label: '材料用途' },
]
// 📦 材料用途：聚合合成+炼制全部配方的所需材料

const selMaterial = ref(null)

const materialUsageList = computed(() => {
  const map = new Map()
  const add = (kind, recipe, mat, num) => {
    const key = String(mat?.name || '').trim()
    if (!key) return
    if (!map.has(key)) map.set(key, { name: key, img: mat?.img || '', numTotal: 0, usedBy: [], desc: '', color: '' })
    const it = map.get(key)
    const n = Math.max(1, Number(num) || 1)
    it.numTotal += n
    it.usedBy.push({ kind, name: recipe?.name || recipe?.id || '', id: recipe?.id || '', num: n })
  }
  for (const r of itemState.value.craft || []) {
    for (const m of r.materials || []) add('合成', r, m, m.num)
  }
  for (const r of itemState.value.lianzhi || []) {
    for (const m of r.materials || []) add('炼制', r, m, 1)
  }
  const list = [...map.values()]
  for (const it of list) {
    const def = itemState.value.defs[it.name]
    const inv = itemState.value.inventory.find(x => x.name === it.name)
    if (!it.img) it.img = def?.img || inv?.img || ''
    it.desc = def?.miaoshu || inv?.miaoshu || ''
    it.color = def?.color || inv?.color || '#888'
  }
  return list.sort((a, b) => b.numTotal - a.numTotal || a.name.localeCompare(b.name, 'zh'))
})
// 通用描述渲染：${xxx} 占位替换为实际数值（支持 buffs.attack 这类路径）

function renderItemDesc(s, src) {
  if (!s || !s.includes('${')) return s || ''
  return s.replace(/\$\{([^}]+)\}/g, (_, k) => {
    const v = k.split('.').reduce((o, p) => (o == null ? o : o[p]), src)
    return v === undefined || v === null ? _ : String(v)
  })
}
// 材料描述：取 ITEM_DEFS / 初始背包的描述并渲染占位

function matDescOf(it) {
  const s = it?.desc || ''
  if (!s.includes('${')) return s
  const def = itemState.value.defs[it.name]
  const inv = itemState.value.inventory.find(x => x.name === it.name)
  const src = (def && Object.keys(def).length ? def : inv) || {}
  return renderItemDesc(s, src)
}
// 🔍 配方产出物：按配方 id 找合成/炼制，返回 [{ chance, output }]

function usageEffectOf(u) {
  if (!u) return []
  const craft = itemState.value.craft.find(r => r.id === u.id)
  if (craft?.output) {
    const o = { ...craft.output }
    if (!o.miaoshu) o.miaoshu = craft.desc || ''
    return [{ chance: 1, output: o }]
  }
  const lian = itemState.value.lianzhi.find(r => r.id === u.id)
  if (lian?.results) {
    return lian.results.map(r => ({ ...r, output: { ...r.output, miaoshu: r.output?.miaoshu || lian.desc || '' } }))
  }
  return []
}

function selectMaterial(m) { selMaterial.value = m }

const ITEM_TYPES = [
  { value: 'all', label: '全部' },
  { value: 'material', label: '材料' },
  { value: 'food', label: '食物' },
  { value: 'consumable', label: '消耗品' },
  { value: 'item', label: '道具' },
  { value: 'breakthrough', label: '突破' },
  { value: 'special', label: '特殊' },
]

const ITEM_TYPE_NAMES = { material: '材料', food: '食物', consumable: '消耗品', item: '道具', breakthrough: '突破', special: '特殊' }

function sellPriceOf(name) { return itemState.value.sellPrices[name] }

function deleteItem() {
  const n = selItem.value.name
  ElMessageBox.confirm(`确定删除物品「${n}」？将从 ITEM_DEFS / 售价表 / 商店中移除（不影响已入档背包）。`, '删除确认', { type: 'warning' }).then(() => {
    delete itemState.value.defs[n]
    delete itemState.value.sellPrices[n]
    const si = itemState.value.shop.findIndex(s => s.name === n)
    if (si > -1) itemState.value.shop.splice(si, 1)
    selItem.value = null
    ElMessage.success('已删除（点保存写入生效）')
  }).catch(() => { })
}

function addItem() {
  const base = '新物品'
  let n = base, i = 1
  while (itemState.value.defs[n] || itemList.value.some(x => x.name === n)) { i++; n = base + i }
  itemState.value.defs[n] = { status: 'material', color: '#ffffff', img: '', miaoshu: '' }
  selectItem({ name: n, ...itemState.value.defs[n] })
  ElMessage.success('已新增「' + n + '」（编辑后点保存写入）')
}

// ===== 炼制配方 =====

const recipeList = computed(() => itemState.value.lianzhi)

function deleteRecipe() {
  const i = itemState.value.lianzhi.findIndex(x => x.id === selRecipe.value.id)
  ElMessageBox.confirm(`确定删除炼制配方「${selRecipe.value.name}」？`, '删除确认', { type: 'warning' }).then(() => {
    if (i > -1) itemState.value.lianzhi.splice(i, 1)
    selRecipe.value = null
    ElMessage.success('已删除（点保存写入生效）')
  }).catch(() => { })
}

function addRecipe() {
  const base = 'new_recipe'
  let id = base, i = 1
  while (itemState.value.lianzhi.some(x => x.id === id)) { i++; id = base + i }
  itemState.value.lianzhi.push({ id, name: '新配方', desc: '', icon: '', color: '#ffffff', materials: [{ name: '材料A' }, { name: '材料B' }], failRate: 0.2, proficiencyGain: 10, results: [{ chance: 1, output: { name: '产出', num: 1, img: '' } }] })
  selectRecipe(itemState.value.lianzhi[itemState.value.lianzhi.length - 1])
}

// ===== 合成图纸 =====

const blueprintList = computed(() => itemState.value.craft)

function deleteBlueprint() {
  const i = itemState.value.craft.findIndex(x => x.id === selBlueprint.value.id)
  ElMessageBox.confirm(`确定删除合成图纸「${selBlueprint.value.name}」？`, '删除确认', { type: 'warning' }).then(() => {
    if (i > -1) itemState.value.craft.splice(i, 1)
    selBlueprint.value = null
    ElMessage.success('已删除（点保存写入生效）')
  }).catch(() => { })
}

function addBlueprint() {
  const base = 'new_craft'
  let id = base, i = 1
  while (itemState.value.craft.some(x => x.id === id)) { i++; id = base + i }
  itemState.value.craft.push({ id, craftTime: 2, name: '新图纸', category: '药水', subcategory: '', desc: '', materials: [{ name: '材料A', num: 1, img: '' }], output: { name: '产出', num: 1, img: '', miaoshu: '', isItem: true, shiyong: true, color: '#ffffff' } })
  selectBlueprint(itemState.value.craft[itemState.value.craft.length - 1])
}

// ===== 商店 =====

const shopList = computed(() => itemState.value.shop)

function deleteShopItem() {
  const i = itemState.value.shop.findIndex(x => x.id === selShopItem.value.id)
  ElMessageBox.confirm(`确定删除商店物品「${selShopItem.value.name}」？`, '删除确认', { type: 'warning' }).then(() => {
    if (i > -1) itemState.value.shop.splice(i, 1)
    selShopItem.value = null
    ElMessage.success('已删除（点保存写入生效）')
  }).catch(() => { })
}

const shopPickItem = ref('')

function addShopItem() {
  const base = 'shop_new'
  let id = base, i = 1
  while (itemState.value.shop.some(x => x.id === id)) { i++; id = base + i }
  itemState.value.shop.push({ id, name: '新商品', price: 10, limit: -1, img: '', miaoshu: '', color: '#ffffff', buffsText: '' })
  selectShopItem(itemState.value.shop[itemState.value.shop.length - 1])
}

// 🏪 从物品列表一键添加为商品（自动带出 名称/图片/描述/颜色）

function addShopItemFromItem(it) {
  const exist = itemState.value.shop.find(s => s.name === it.name)
  if (exist) { selectShopItem(exist); ElMessage.info('「' + it.name + '」已在商店，已为你选中'); return }
  const base = 'shop_' + String(it.name || 'new').toLowerCase().replace(/[^\w\u4e00-\u9fa5]/g, '')
  let id = base, i = 1
  while (itemState.value.shop.some(x => x.id === id)) { i++; id = base + '_' + i }
  itemState.value.shop.push({ id, name: it.name, price: 10, limit: -1, img: it.img || '', miaoshu: it.miaoshu || '', color: it.color || '#ffffff' })
  selectShopItem(itemState.value.shop[itemState.value.shop.length - 1])
}

// ===== 序列化（生成 JS 源码） =====

function itemDefSrc(efSrc) {
  const lines = []
  for (const [name, d] of Object.entries(itemState.value.defs)) {
    const f = []
    if (d.status) f.push(`status: ${jstr(d.status)}`)
    if (d.food) f.push('food: true')
    if (d.shiyong) f.push('shiyong: true')
    if (d.isItem) f.push('isItem: true')
    if (d.isSpecial) f.push('isSpecial: true')
    if (d.isGachaItem) f.push('isGachaItem: true')
    if (d.special) f.push(`special: ${jstr(d.special)}`)
    if (d.bType) f.push(`bType: ${jstr(d.bType)}`)
    if (d.bCrystal != null) f.push(`bCrystal: ${d.bCrystal}`)
    if (d.bBoost != null) f.push(`bBoost: ${d.bBoost}`)
    if (d.giveNpc) f.push('giveNpc: true')
    if (d.Hp != null) f.push(`Hp: ${d.Hp}`)
    if (d.moli != null) f.push(`moli: ${d.moli}`)
    if (d.effectValue != null) f.push(`effectValue: ${d.effectValue}`)
    if (d.maxUses != null) f.push(`maxUses: ${d.maxUses}`)
    if (d.maxTotal != null) f.push(`maxTotal: ${d.maxTotal}`)
    if (d.eatExp != null) f.push(`eatExp: ${d.eatExp}`)
    if (d.feedExp != null) f.push(`feedExp: ${d.feedExp}`)
    if (d.btBoost && typeof d.btBoost === 'object') f.push('btBoost: ' + JSON.stringify(d.btBoost))
    if (d.buffs && typeof d.buffs === 'object' && Object.keys(d.buffs).length) f.push(`buffs: ${JSON.stringify(d.buffs)}`)
    if (d.fx && typeof d.fx === 'object' && Object.keys(d.fx).length) f.push(`fx: ${JSON.stringify(d.fx)}`)
    if (d.color) f.push(`color: ${jstr(d.color)}`)
    if (d.img) f.push(`img: ${jstr(d.img)}`)
    if (d.source) f.push(`source: ${jstr(d.source)}`)
    f.push(`miaoshu: ${jstr(d.miaoshu || '')}`)
    lines.push(`  ${jstr(name)}: { ${f.join(', ')} },`)
  }
  return lines.join('\n')
}

function sellPriceSrc() {
  return Object.entries(itemState.value.sellPrices).map(([n, v]) => `  ${jstr(n)}: ${Number(v) || 0},`).join('\n')
}

function lianzhiSrc() {
  return itemState.value.lianzhi.map(r => {
    const f = []
    f.push(`id: ${jstr(r.id)}`)
    f.push(`name: ${jstr(r.name)}`)
    if (r.desc) f.push(`desc: ${jstr(r.desc)}`)
    if (r.icon) f.push(`icon: ${jstr(r.icon)}`)
    if (r.color) f.push(`color: ${jstr(r.color)}`)
    f.push(`materials: [${(r.materials || []).map(m => `{ name: ${jstr(m.name)} }`).join(', ')}]`)
    f.push(`failRate: ${r.failRate ?? 0}`)
    f.push(`proficiencyGain: ${r.proficiencyGain ?? 10}`)
    f.push(`results: [${(r.results || []).map(x => `{ chance: ${x.chance ?? 1}, output: { ${outFields(x.output)} } }`).join(', ')}]`)
    return `  {\n    ${f.join(',\n    ')},\n  }`
  }).join(',\n')
}

function craftSrc() {
  return itemState.value.craft.map(b => {
    const f = []
    f.push(`id: ${jstr(b.id)}`)
    f.push(`craftTime: ${b.craftTime ?? 2}`)
    f.push(`name: ${jstr(b.name)}`)
    if (b.category) f.push(`category: ${jstr(b.category)}`)
    if (b.subcategory) f.push(`subcategory: ${jstr(b.subcategory)}`)
    if (b.desc) f.push(`desc: ${jstr(b.desc)}`)
    f.push(`materials: [${(b.materials || []).map(m => `{ name: ${jstr(m.name)}, num: ${m.num ?? 1}, img: ${jstr(m.img || '')} }`).join(', ')}]`)
    f.push(`output: { ${outFields(b.output)} }`)
    return `  {\n    ${f.join(',\n    ')},\n  }`
  }).join(',\n')
}

function lianzhiLevelSrc() {
  const c = itemState.value.lianzhiLevel || {}
  const maxLv = Math.max(2, Number(c.maxLevel) || 2)
  const lvls = (c.levels || []).slice(0, maxLv - 1)
  while (lvls.length < maxLv - 1) lvls.push({ need: 100, reduce: 0.02 })
  return [
    `  // 最大等级：达到后熟练度溢出丢弃（不再累积）`,
    `  maxLevel: ${maxLv},`,
    `  // 等级表：levels[i] = Lv.(i+2) 的配置。need = 升到本级所需熟练度；reduce = 本级失败率减免（Lv.1 减免 0）`,
    '  levels: [',
    ...lvls.map(l => `    { need: ${Number(l.need) || 100}, reduce: ${Number(l.reduce) || 0} },`),
    '  ],',
  ].join('\n')
}
// ＋ 增加一级（等级表行）

function addLevelRow() {
  itemState.value.lianzhiLevel.levels.push({ need: 100, reduce: 0.02 })
}
// ✕ 删除一级：删掉最高级行时自动下调最大等级（否则保存时会被自动补齐回来）

function removeLevelRow(i) {
  const st = itemState.value.lianzhiLevel
  const wasLast = i === st.levels.length - 1
  st.levels.splice(i, 1)
  if (wasLast) {
    st.maxLevel = Math.max(2, (Number(st.maxLevel) || 2) - 1)
  }
}
// 🎛 归一化炼制等级配置：兼容旧格式（固定每级）→ 等级表

function genItemDescTemplate() {
  const d = selItem.value
  if (!d) return
  const sp = d.special || ''
  let tpl = ''
  if (sp === 'dungeonSpeed') tpl = '下一次地牢中移动速度提升 ${effectValue}%，可在地牢中使用。'
  else if (sp === 'permAttack') tpl = '永久提升基础攻击力 ${effectValue} 点（最多 ${maxUses} 次），可给予 NPC 使用。'
  else if (sp === 'permArmor') tpl = '永久提升基础护甲 ${effectValue} 点（最多 ${maxUses} 次），可给予 NPC 使用。'
  else if (sp === 'permSpeed') tpl = '永久提升基础速度 ${effectValue} 点（最多 ${maxUses} 次），可给予 NPC 使用。'
  else if (sp === 'talentPoint') tpl = '服用后天赋点 +${effectValue}（最多 ${maxUses} 次）。'
  else if (sp === 'expGain') tpl = '永久提升 ${effectValue}% 经验获取（最多 ${maxUses} 次，叠加上限 ${maxTotal}%）。'
  else if (sp === 'permHp') tpl = '永久提升基础生命值 ${effectValue} 点（仅限 ${maxUses} 次）。'
  else if (sp === 'permMana') tpl = '永久提升 ${effectValue} 点最大魔力（最多 ${maxUses} 次）。'
  else if (sp === 'permAtkFlower') tpl = '幽冥之花的花蕊，稀有的炼制材料。可直接食用，永久提升 ${effectValue} 点基础攻击力（最多 ${maxUses} 次），不可投喂。'
  if (!tpl && d.Hp !== '') tpl = '饮用后恢复 ${Hp} 点生命值。'
  if (!tpl && d.moli !== '') tpl = '饮用后恢复 ${moli} 点魔力。'
  if (!tpl) {
    let b = {}
    try { b = JSON.parse(d.buffsText || '{}') } catch (e) { }
    const parts = []
    if (b.attack != null) parts.push('攻击力+${buffs.attack}')
    if (b.armor != null) parts.push('护甲+${buffs.armor}')
    if (b.speed != null) parts.push('速度+${buffs.speed}')
    if (b.luck != null) parts.push('幸运+${buffs.luck}')
    if (b.expPct != null) parts.push('击败敌人额外获得${buffs.expPct}%经验值')
    if (parts.length) tpl = parts.join('，') + '。'
  }
  if (!tpl) { ElMessage.warning('未设置 special / Hp / moli / buffs，无法生成描述模板'); return }
  d.miaoshu = tpl
  ElMessage.success('已按效果生成描述模板（${} 为运行时变量）')
}

// 提交前：把编辑副本写回状态

function flushItemEdits() {
  if (selItem.value) {
    const d = selItem.value
    const oldName = d._oldName || d.name
    if (oldName !== d.name) {
      if (itemState.value.defs[oldName]) { itemState.value.defs[d.name] = itemState.value.defs[oldName]; delete itemState.value.defs[oldName] }
      if (itemState.value.sellPrices[oldName] != null) { itemState.value.sellPrices[d.name] = itemState.value.sellPrices[oldName]; delete itemState.value.sellPrices[oldName] }
      const si = itemState.value.shop.findIndex(s => s.name === oldName)
      if (si > -1) itemState.value.shop[si].name = d.name
    }
    const def = itemState.value.defs[d.name] || (itemState.value.defs[d.name] = {})
    delete def.status; delete def.food; delete def.shiyong; delete def.isItem; delete def.isSpecial; delete def.bType
    if (d.type === 'material') def.status = 'material'
    if (d.type === 'food') { def.food = true; def.status = d.status || 'material' }
    if (d.type === 'consumable') { def.isItem = true; def.shiyong = true }
    if (d.type === 'item') def.isItem = true
    if (d.type === 'breakthrough') def.bType = d.bType || 'crystal'
    if (d.type === 'special') def.isSpecial = true
    def.img = d.img || undefined
    def.miaoshu = d.miaoshu
    if (d.special) def.special = d.special; else delete def.special
    if (d.Hp !== '') def.Hp = Number(d.Hp) || 0; else delete def.Hp
    if (d.moli !== '') def.moli = Number(d.moli) || 0; else delete def.moli
    if (d.effectValue !== '') def.effectValue = Number(d.effectValue) || 0; else delete def.effectValue
    if (d.maxUses !== '') def.maxUses = Number(d.maxUses) || 0; else delete def.maxUses
    if (d.maxTotal !== '') def.maxTotal = Number(d.maxTotal) || 0; else delete def.maxTotal
    if (d.eatExp !== '') def.eatExp = Number(d.eatExp) || 0; else delete def.eatExp
    if (d.feedExp !== '') def.feedExp = Number(d.feedExp) || 0; else delete def.feedExp
    if (d.btBoostText !== '') { try { def.btBoost = JSON.parse(d.btBoostText) } catch (e) { ElMessage.error('btBoost 不是合法 JSON'); return } } else delete def.btBoost
    if (d.buffsText && d.buffsText.trim()) { try { def.buffs = JSON.parse(d.buffsText); } catch (e) { ElMessage.warning('buffs 不是合法 JSON，未保存'); } } else delete def.buffs
    def.color = d.color || '#ffffff'
    def.source = d.source || undefined
    if (d.sellPrice === '' || d.sellPrice == null) delete itemState.value.sellPrices[d.name]
    else itemState.value.sellPrices[d.name] = Math.max(1, Math.round(Number(d.sellPrice) || 1))
    if (d.buyPrice !== '' && d.buyPrice != null) {
      const si = itemState.value.shop.find(s => s.name === d.name)
      if (si) si.price = Math.max(0, Math.round(Number(d.buyPrice) || 0))
    }
  }
  if (selRecipe.value) {
    const r = selRecipe.value
    const tr = itemState.value.lianzhi.find(x => x.id === r.id)
    if (tr) {
      tr.name = r.name; tr.desc = r.desc; tr.color = r.color
      tr.materials = r.materialsText.split(/[,，]/).map(s => s.trim()).filter(Boolean).map(n => ({ name: n }))
      tr.failRate = Number(r.failRate) || 0
      tr.proficiencyGain = Number(r.proficiencyGain) || 10
      tr.results = r.resultsText.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
        const [c, n, num] = l.split('|').map(s => s.trim())
        return { chance: Number(c) || 1, output: { name: n || '产出', num: Number(num) || 1, img: tr.results?.[0]?.output?.img || '', color: tr.results?.[0]?.output?.color || '#ffffff' } }
      })
    }
  }
  if (selBlueprint.value) {
    const b = selBlueprint.value
    const tb = itemState.value.craft.find(x => x.id === b.id)
    if (tb) {
      tb.name = b.name; tb.category = b.category; tb.subcategory = b.subcategory; tb.desc = b.desc
      tb.craftTime = Number(b.craftTime) || 2
      tb.materials = b.materialsText.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
        const [n, num] = l.split(/[,，]/).map(s => s.trim())
        if (!n) return null
        // 🎨 保留原材料 img；缺失时按物品名回退 ITEM_SKIN_MAP（防止保存后材料图丢失）
        const old = (tb.materials || []).find(m => m.name === n)
        return { name: n, num: Number(num) || 1, img: old?.img || ITEM_SKIN_MAP[n] || '' }
      }).filter(Boolean)
      tb.output = { ...(tb.output || {}), name: b.outputName, num: Number(b.outputNum) || 1, img: b.outputImg, miaoshu: b.outputMiaoshu, color: b.outputColor || '#ffffff' }
    }
  }
  if (selShopItem.value) {
    const s = selShopItem.value
    const ts = itemState.value.shop.find(x => x.id === s.id)
    if (ts) {
      ts.name = s.name; ts.price = Number(s.price) || 0; ts.limit = Number(s.limit) ?? -1; ts.img = s.img; ts.miaoshu = s.miaoshu; ts.color = s.color
      if (s.buffsText && s.buffsText.trim()) { try { ts.buffs = JSON.parse(s.buffsText); } catch (e) { ElMessage.warning('商店 buffs 不是合法 JSON，未保存'); } } else delete ts.buffs
    }
  }
}

async function saveItemsConfig() {
  if (!itemsLoaded.value) { ElMessage.warning('请先加载'); return }
  flushItemEdits()
  const ops = [
    { kind: 'items', code: itemDefSrc() },
    { kind: 'sellPrices', code: sellPriceSrc() },
    { kind: 'lianzhi', code: lianzhiSrc() },
    { kind: 'craft', code: craftSrc() },
    { kind: 'shop', code: shopSrc() },
    { kind: 'lianzhiLevel', code: lianzhiLevelSrc() },
  ]
  try {
    const resp = await fetch('/__dladmin_write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ops }),
    })
    const data = await resp.json()
    const bad = (data.results || []).filter(r => !r.ok)
    if (bad.length) { ElMessage.error('部分写入失败：' + bad.map(b => b.msg).join('；')); return }
    // 💾 记录当前编辑位置（模式 + 选中项）：Vite reload 后自动恢复，与天赋编辑一致
    try {
      let _sel = ''
      if (itemMode.value === 'lianzhi') _sel = selRecipe.value?.id || ''
      else if (itemMode.value === 'craft') _sel = selBlueprint.value?.id || ''
      else if (itemMode.value === 'shop') _sel = selShopItem.value?.id || ''
      else _sel = selItem.value?.name || ''
      sessionStorage.setItem('dladmin_items_state', JSON.stringify({ mode: itemMode.value, sel: _sel }))
    } catch (e) { }
    localStorage.setItem('dladmin_restore_tab', 'items') // 保存后 Vite reload，恢复本 tab
    window.dispatchEvent(new CustomEvent('dladmin:items-config-changed')) // 🔄 热刷新运行中的 store
    ElMessage.success('✅ 物品配置已写入，读档自动生效')
    setTimeout(() => location.reload(), 600) // 🔄 整页刷新：让 dladmin 表单回读写入后的最新配置
  } catch (e) {
    console.error('[物品编辑] 保存失败', e)
    ElMessage.error('保存失败：' + (e?.message || e))
  }
}

// ========================
// ⬆️ 升级编辑（LEVEL_UP_CFG：玩家/NPC 经验公式·成长·上限·初始属性）
// ========================

function levelUpSrc() {const c = levelUpCfg.value
  const L = []
  L.push('  player: {')
  L.push('    maxLevel: ' + c.player.maxLevel + ',')
  L.push('    expBase: ' + c.player.expBase + ',')
  L.push('    expStep: ' + c.player.expStep + ',')
  L.push('    freeAttrPointsStart: ' + (c.player.freeAttrPointsStart ?? 10) + ',')
  L.push('    initialTalentPoints: ' + (c.player.initialTalentPoints ?? 0) + ',')
  L.push('    attackPerLevel: ' + (c.player.attackPerLevel ?? 3) + ',')
  L.push('    freeAttrPerLevel: ' + (c.player.freeAttrPerLevel ?? 4) + ',')
  L.push('    talentPerLevel: ' + (c.player.talentPerLevel ?? 0) + ',')
  L.push('    base: { maxHp: ' + c.player.base.maxHp + ', attack: ' + c.player.base.attack + ', armor: ' + c.player.base.armor + ', speed: ' + c.player.base.speed + ', luck: ' + c.player.base.luck + ', strength: ' + (c.player.base.strength ?? 0) + ', intelligence: ' + (c.player.base.intelligence ?? 0) + ', elementMastery: ' + (c.player.base.elementMastery ?? 0) + ', charm: ' + (c.player.base.charm ?? 0) + ' },')
  L.push('  },')
  L.push('  ally: {')
  L.push('    maxLevel: ' + c.ally.maxLevel + ',')
  L.push('    expBase: {')
  for (const [role, eb] of Object.entries(c.ally.expBase || {})) {
    L.push('      ' + role + ': ' + eb + ',')
  }
  L.push('    },')
  L.push('    expMult: {')
  for (const [role, em] of Object.entries(c.ally.expMult || {})) {
    L.push('      ' + role + ': ' + em + ',')
  }
  L.push('    },')
  L.push('    growth: {')
  for (const [role, g] of Object.entries(c.ally.growth || {})) {
    L.push('      ' + role + ': { attack: ' + g.attack + ', speed: ' + g.speed + ' },')
  }
  L.push('    },')
  L.push('    base: {')
  for (const [role, b] of Object.entries(c.ally.base || {})) {
    L.push('      ' + role + ': { attack: ' + b.attack + ', speed: ' + b.speed + ' },')
  }
  L.push('    },')
  L.push('  },')
  L.push('  attrRates: {')
  L.push('    strengthPhysDmg: ' + c.attrRates.strengthPhysDmg + ',')
  L.push('    strengthHp: ' + c.attrRates.strengthHp + ',')
  L.push('    intelligenceEleDmg: ' + c.attrRates.intelligenceEleDmg + ',')
  L.push('    elementMasteryReactDmg: ' + c.attrRates.elementMasteryReactDmg + ',')
  L.push('    intelligenceMastery: ' + (c.attrRates.intelligenceMastery ?? 0.2) + ',')
  L.push('    baseCritRate: ' + (c.attrRates.baseCritRate ?? 5) + ',')
  L.push('    luckCritRate: ' + (c.attrRates.luckCritRate ?? 30) + ',')
  L.push('    luckCritDmg: ' + (c.attrRates.luckCritDmg ?? 100) + ',')
  L.push('    luckDrop: ' + (c.attrRates.luckDrop ?? 100) + ',')
  L.push('    charmAffection: ' + c.attrRates.charmAffection + ',')
  L.push('  },')
  L.push('  elementReaction: {')
  L.push('    freezeBase: ' + (c.elementReaction?.freezeBase ?? 137) + ',')
  L.push('    freezePerLv: ' + (c.elementReaction?.freezePerLv ?? 3) + ',')
  L.push('    freezeChance: ' + (c.elementReaction?.freezeChance ?? 0.35) + ',')
  L.push('    vaporizeBase: ' + (c.elementReaction?.vaporizeBase ?? 237) + ',')
  L.push('    vaporizePerLv: ' + (c.elementReaction?.vaporizePerLv ?? 4) + ',')
  L.push('    meltBase: ' + (c.elementReaction?.meltBase ?? 162) + ',')
  L.push('    meltPerLv: ' + (c.elementReaction?.meltPerLv ?? 3) + ',')
  L.push('    meltArmorReduce: ' + (c.elementReaction?.meltArmorReduce ?? 0.1) + ',')
  L.push('    electrochargeBase: ' + (c.elementReaction?.electrochargeBase ?? 162) + ',')
  L.push('    electrochargePerLv: ' + (c.elementReaction?.electrochargePerLv ?? 3) + ',')
  L.push('    electrochargeActionDrop: ' + (c.elementReaction?.electrochargeActionDrop ?? 0.12) + ',')
  L.push('    superconductBase: ' + (c.elementReaction?.superconductBase ?? 125) + ',')
  L.push('    superconductPerLv: ' + (c.elementReaction?.superconductPerLv ?? 3) + ',')
  L.push('    superconductPhysUp: ' + (c.elementReaction?.superconductPhysUp ?? 0.25) + ',')
  L.push('    overloadBase: ' + (c.elementReaction?.overloadBase ?? 100) + ',')
  L.push('    overloadPerLv: ' + (c.elementReaction?.overloadPerLv ?? 2) + ',')
  L.push('  },')
  return L.join('\n')
}

// 🏆 局外养成序列化（META_ROLE_CFG 对象体，锚点与结尾由 vite 写入段补齐）
function metaRoleSrc() {
  const c = metaRoleCfg.value
  const L = []
  L.push('  maxLevel: ' + (c.maxLevel ?? 50) + ',')
  L.push('  expBase: ' + (c.expBase ?? 100) + ',')
  L.push('  expStep: ' + (c.expStep ?? 30) + ',')
  const _ps = c.perLevelStats || {}
  L.push('  perLevelStats: { attack: ' + (_ps.attack ?? 2) + ', maxHp: ' + (_ps.maxHp ?? 20) + ', speed: ' + (_ps.speed ?? 1) + ', armor: ' + (_ps.armor ?? 1) + ', magicResist: ' + (_ps.magicResist ?? 1) + ' },')
  L.push('  expConversionRate: ' + (c.expConversionRate ?? 0.2) + ',')
  return L.join('\n')
}

async function saveLevelUpConfig() {
  if (!levelUpLoaded.value) { ElMessage.warning('请先加载'); return }
  const c = levelUpCfg.value
  if (!c?.player || !c?.ally) { ElMessage.warning('配置不完整'); return }
  try {
    const resp = await fetch('/__dladmin_write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ops: [
        { kind: 'metaRole', code: metaRoleSrc() }, // 🏆 局外养成
        { kind: 'levelUp', code: levelUpSrc() },
        { kind: 'btStages', code: btStagesSrc() },   // 💎 突破基础成功率
        { kind: 'btQuality', code: btQualityBonusSrc() }, // 💎 全局品质属性倍率
        { kind: 'btPenalty', code: btPenaltySrc() }, // 💎 各品质魔晶成功率惩罚
        { kind: 'btComp', code: btCompSrc() },       // 💎 失败后成功率补偿（各品质）
        { kind: 'btCap', code: btCapSrc() },         // 💎 失败补偿累计上限
      ] }),
    })
    const data = await resp.json()
    const bad = (data.results || []).filter(r => !r.ok)
    if (bad.length) { ElMessage.error('写入失败：' + bad.map(b => b.msg).join('；')); return }
    localStorage.setItem('dladmin_restore_tab', 'levelUp') // 保存后 Vite reload，恢复本 tab
    ElMessage.success('✅ 升级配置已写入，读档自动生效')
    setTimeout(() => location.reload(), 600) // 🔄 整页刷新：让表单回读最新配置
  } catch (e) {
    console.error('[升级编辑] 保存失败', e)
    ElMessage.error('保存失败：' + (e?.message || e))
  }
}

// ========== 🎒 初始背包（DEFAULT_inventory） ==========

function initInvSrc() {
  const L = []
  L.push('  // 🎒 初始背包（dladmin 升级编辑维护）：新游戏发放的道具列表')
  for (const r of initInvRows.value) {
    const name = String(r.name || '').trim()
    if (!name) continue
    const num = Math.max(1, Math.floor(Number(r.num) || 1))
    const raw = r._raw || {}
    const def = initInvDefs.value[name] || {}
    const o = { name, num }
    // 常用展示/功能字段：优先原字段，其次 ITEM_DEFS 定义，缺省不写
    for (const k of ['img', 'miaoshu', 'color', 'status', 'isItem', 'food', 'isGachaItem', 'shiyong', 'isSpecial', 'special', 'source', 'bType', 'bCrystal', 'quality', 'buffs', 'Hp', 'moli', 'effectValue', 'maxUses', 'maxTotal', 'eatExp', 'feedExp', 'btBoost', 'expBonus', 'expPct', 'exp', 'breakthrough', 'shoot']) {
      if (raw[k] !== undefined) o[k] = raw[k]
      else if (def[k] !== undefined) o[k] = def[k]
    }
    // 其余原始字段兜底保留（不漏字段）
    for (const [k, v] of Object.entries(raw)) {
      if (!(k in o) && k !== 'name' && k !== 'num') o[k] = v
    }
    L.push('  ' + JSON.stringify(o) + ',')
  }
  return L.join('\n')
}

async function saveInitInventory() {
  if (!initInvLoaded.value) { ElMessage.warning('请先加载'); return }
  const seen = new Set()
  for (const r of initInvRows.value) {
    const n = String(r.name || '').trim()
    if (!n) continue
    if (seen.has(n)) { ElMessage.warning('存在重复物品：' + n); return }
    seen.add(n)
  }
  try {
    const resp = await fetch('/__dladmin_write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ops: [{ kind: 'initInventory', code: initInvSrc() }] }),
    })
    const data = await resp.json()
    const bad = (data.results || []).filter(r => !r.ok)
    if (bad.length) { ElMessage.error('写入失败：' + bad.map(b => b.msg).join('；')); return }
    localStorage.setItem('dladmin_restore_tab', 'levelUp') // 保存后 Vite reload，恢复本 tab
    ElMessage.success('✅ 初始背包已写入，新游戏生效')
    setTimeout(() => location.reload(), 600)
  } catch (e) {
    console.error('[初始背包] 保存失败', e)
    ElMessage.error('保存失败：' + (e?.message || e))
  }
}

// ========== 🏆 成就编辑（ACHIEVEMENT_DEFS） ==========

const ACH_STAT_OPTIONS = [{ value: '', label: '无（手动触发）' },
  { value: 'kills', label: '击杀数 kills' },
  { value: 'explored', label: '探索格数 explored' },
  { value: 'deaths', label: '死亡次数 deaths' },
  { value: 'chests', label: '打开宝箱 chests' },
  { value: 'bloodmoon', label: '血月次数 bloodmoon' },
  { value: 'thunder', label: '雷击次数 thunder' },
  { value: 'bloodmoonNight', label: '血月+夜晚 bloodmoonNight' },
  { value: 'night', label: '经历夜晚 night' },
  { value: 'magma', label: '岩浆伤害 magma' },
  { value: 'pickups', label: '拾取道具 pickups' },
]

const achKeyword = ref('')

const selAch = computed(() => achDefs.value.find(a => a.key === selAchKey.value) || null)

const achList = computed(() => {
  const k = achKeyword.value.trim()
  return achDefs.value.filter(a => !k || (a.key + (a.name || '') + a.desc).includes(k))
})

async function achievementDefsSrc() {
  const esc = (x) => String(x ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  const lines = achDefs.value.map(d => {
    const parts = ["desc: '" + esc(d.desc) + "'", 'talentReward: ' + (Number(d.talentReward) || 1)]
    if (d.attrReward) parts.push('attrReward: ' + (Number(d.attrReward) || 0))
    if (d.name) parts.push("name: '" + esc(d.name) + "'")
    if (d.stat) parts.push("stat: '" + esc(d.stat) + "'", 'condition: ' + (Number(d.condition) || 1))
    return "  '" + esc(d.key) + "': { " + parts.join(', ') + ' },'
  })
  return [
    '  // 🏰 地牢成就（每个奖励 1 点永久属性点，跨游戏保留）',
    '  // ⚙️ stat=统计键（见 trackDungeonStat），condition=达成阈值；无 stat 的成就由游戏逻辑手动触发',
    ...lines,
  ].join('\n')
}

async function saveAchievementsConfig() {
  if (!achLoaded.value) { ElMessage.warning('请先加载'); return }
  const seen = new Set()
  for (const d of achDefs.value) {
    const k = (d.key || '').trim()
    if (!k) { ElMessage.error('成就内部ID不能为空'); return }
    if (seen.has(k)) { ElMessage.error('内部ID重复：' + k); return }
    seen.add(k)
  }
  try {
    const resp = await fetch('/__dladmin_write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ops: [{ kind: 'achievements', code: achievementDefsSrc() }] }),
    })
    const data = await resp.json()
    const bad = (data.results || []).filter(r => !r.ok)
    if (bad.length) { ElMessage.error('部分写入失败：' + bad.map(b => b.msg).join('；')); return }
    localStorage.setItem('dladmin_restore_tab', 'achievements') // 保存后 Vite reload，恢复本 tab
    ElMessage.success('✅ 成就配置已写入，读档自动生效')
    setTimeout(() => location.reload(), 600) // 🔄 整页刷新：让表单回读最新配置
  } catch (e) {
    console.error('[成就编辑] 保存失败', e)
    ElMessage.error('保存失败：' + (e?.message || e))
  }
}

function addAchievementDef() {
  let n = achDefs.value.length + 1
  let key = '新成就' + n
  while (achDefs.value.some(a => a.key === key)) { n++; key = '新成就' + n }
  achDefs.value.push({ key, name: '', desc: '新成就描述。', stat: '', condition: 1, talentReward: 1, attrReward: 0 })
  selAchKey.value = key
}

function delAchievementDef() {
  if (!selAch.value) return
  achDefs.value = achDefs.value.filter(a => a.key !== selAchKey.value)
  selAchKey.value = achDefs.value[0]?.key || ''
}

// ============ 📜 任务编辑 ============

const taskKeyword = ref('')

const selTask= computed(() => (taskLoaded.value && selTaskIdx.value >= 0) ? taskDefs.value[selTaskIdx.value] : null)

const taskList = computed(() => {
  const kw = (taskKeyword.value || '').trim()
  return taskDefs.value.map((t, i) => ({ ...t, _i: i }))
    .filter(t => !kw || (t.name || '').includes(kw) || String(t.id).includes(kw))
})

async function taskDefsSrc() {
  const esc = (x) => String(x ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  const lines = taskDefs.value.map(t => {
    const steps = (t.steps || []).map(s => {
      const parts = ["id: '" + esc(s.id) + "'", "desc: '" + esc(s.desc) + "'"]
      if (Number(s.target) > 0) parts.push('target: ' + Number(s.target))
      return '{ ' + parts.join(', ') + ' }'
    }).join(', ')
    const rewardItems = (t.reward?.items || []).filter(it => it && it.name)
      .map(it => "{ name: '" + esc(it.name) + "', num: " + (Number(it.num) || 1) + ' }').join(', ')
    const rewardTalents = (t.reward?.talents || []).map(x => String(x || '').trim()).filter(Boolean)
      .map(x => "'" + esc(x) + "'").join(', ')
    const rewardParts = []
    if (Number(t.reward?.exp) > 0) rewardParts.push('exp: ' + Number(t.reward.exp))
    if (Number(t.reward?.money) > 0) rewardParts.push('money: ' + Number(t.reward.money))
    if (rewardItems) rewardParts.push('items: [' + rewardItems + ']')
    if (rewardTalents) rewardParts.push('talents: [' + rewardTalents + ']')
    const parts = [
      'id: ' + (Number(t.id) || 0),
      "name: '" + esc(t.name || '新任务') + "'",
      "type: '" + (t.type === 'main' ? 'main' : 'side') + "'",
      "description: '" + esc(t.description || '') + "'",
      'hidden: ' + (t.hidden ? 1 : 0),
      'steps: [' + steps + ']'
    ]
    if (rewardParts.length) parts.push('reward: { ' + rewardParts.join(', ') + ' }')
    return '  { ' + parts.join(', ') + ' },'
  })
  return [
    '  // 📜 任务模板（dladmin「任务编辑」维护）：新增/编辑/删除/隐藏任务',
    '  // type=main 主线 / side 支线；hidden=1 隐藏（面板不显示，进度保留）',
    '  // steps=[{ id, desc, target? }] 达成步骤；reward={ exp, money, items:[{name,num}], talents:["天赋id"] } 完成奖励',
    '  // talents 为任务解锁型天赋（autoGranted: true，如莫奇的祝福 moqi_blessing），完成后自动激活',
    ...lines,
  ].join('\n')
}

async function saveTasksConfig() {
  if (!taskLoaded.value) { ElMessage.warning('请先加载'); return }
  const seen = new Set()
  for (const t of taskDefs.value) {
    const id = String(t.id ?? '').trim()
    if (!id || Number(id) <= 0) { ElMessage.error('任务内部ID不能为空'); return }
    if (seen.has(id)) { ElMessage.error('任务ID重复：' + id); return }
    seen.add(id)
  }
  try {
    const resp = await fetch('/__dladmin_write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ops: [{ kind: 'tasks', code: await taskDefsSrc() }] }),
    })
    const data = await resp.json()
    const bad = (data.results || []).filter(r => !r.ok)
    if (bad.length) { ElMessage.error('部分写入失败：' + bad.map(b => b.msg).join('；')); return }
    try { window.dispatchEvent(new CustomEvent('dladmin:tasks-config-changed')) } catch (e) { }
    localStorage.setItem('dladmin_restore_tab', 'tasks') // 保存后 Vite reload，恢复本 tab
    ElMessage.success('✅ 任务配置已写入，读档自动生效')
    setTimeout(() => location.reload(), 600) // 🔄 整页刷新：让表单回读最新配置
  } catch (e) {
    console.error('[任务编辑] 保存失败', e)
    ElMessage.error('保存失败：' + (e?.message || e))
  }
}

function addTaskDef() {
  let n = 1
  const used = new Set(taskDefs.value.map(t => Number(t.id)))
  while (used.has(n)) n++
  taskDefs.value.push({ id: n, name: '新任务' + n, type: 'side', description: '新任务描述。', hidden: 0, steps: [{ id: 's1', desc: '达成条件描述', target: 1 }], reward: { exp: 10, money: 0, items: [], talents: [] } })
  selTaskIdx.value = taskDefs.value.length - 1
}

function delTaskDef() {
  if (!selTask.value) return
  taskDefs.value.splice(selTaskIdx.value, 1)
  selTaskIdx.value = taskDefs.value.length ? 0 : -1
}

function addTaskStep() {
  if (!selTask.value) return
  const n = selTask.value.steps.length + 1
  selTask.value.steps.push({ id: 's' + n, desc: '', target: 0 })
}

function addTaskRewardItem() {
  if (!selTask.value) return
  selTask.value.reward.items.push({ name: '', num: 1 })
}
function addTaskRewardTalent() {
  if (!selTask.value?.reward) selTask.value.reward = { exp: 0, money: 0, items: [], talents: [] }
  if (!Array.isArray(selTask.value.reward.talents)) selTask.value.reward.talents = []
  selTask.value.reward.talents.push('')
}
function removeTaskRewardTalent(ti) {
  if (Array.isArray(selTask.value?.reward?.talents)) selTask.value.reward.talents.splice(ti, 1)
}

// 初始加载

 // 🎓 初始自动加载天赋配置（编辑天赋 tab 秒开）
 // ⬆️ 初始自动加载升级配置（升级编辑 tab 秒开）
 // 🏆 初始自动加载成就配置（成就编辑 tab 秒开）
 // 📜 初始自动加载任务配置（任务编辑 tab 秒开）

// 💾 保存写入会触发 Vite 整页 reload（config.js/dropRates.js 无 HMR 接受者），
// 用 localStorage 记住保存前所在 tab 并在重载后恢复；Vite 刚写完文件可能还在编译，
// 主动延迟加载，失败自动重试（最多 3 次）

const ATTR_REQ_OPTIONS = [
  { key: 'strength', label: '力量' },
  { key: 'intelligence', label: '智慧' },
  { key: 'elementMastery', label: '元素精通' },
  { key: 'attack', label: '攻击力' },
  { key: 'armor', label: '护甲' },
  { key: 'magicResist', label: '魔抗' },
  { key: 'speed', label: '速度' },
  { key: 'luck', label: '幸运' },
  { key: 'charm', label: '魅力' },
]
// 属性需求列表（兼容旧单对象格式 → 数组）

const talentAttrReqs = computed(() => {
  const t = selTalent.value
  if (!t) return []
  if (!Array.isArray(t.attrReq)) t.attrReq = (t.attrReq && t.attrReq.key) ? [t.attrReq] : []
  return t.attrReq
})

function addTalentAttrReq() {
  if (!selTalent.value) return
  if (!Array.isArray(selTalent.value.attrReq)) {
    selTalent.value.attrReq = (selTalent.value.attrReq && selTalent.value.attrReq.key) ? [selTalent.value.attrReq] : []
  }
  selTalent.value.attrReq.push({ key: 'intelligence', value: 10 })
}

function removeTalentAttrReq(i) {
  const t = selTalent.value
  if (!t?.attrReq) return
  if (Array.isArray(t.attrReq)) t.attrReq.splice(i, 1)
  else t.attrReq = []
}

const _tIconRenderApp = null

const _tIconLoadedAliases = []

const itemsLoaded = ref(false)

const itemsLoading = ref(false)

const itemState = ref({ defs: {}, inventory: [], shop: [], sellPrices: {}, lianzhi: [], craft: [], lianzhiLevel: { maxLevel: 10, levels: Array.from({ length: 9 }, () => ({ need: 100, reduce: 0.02 })) } })

const itemMode = ref('items') // items | lianzhi | craft | shop

const itemKeyword = ref('')

const itemTypeFilter = ref('all')

const selItem = ref(null)      // 物品行编辑副本

const selRecipe = ref(null)    // 炼制配方编辑副本

const selBlueprint = ref(null) // 合成图纸编辑副本

const selShopItem = ref(null)  // 商店物品编辑副本

async function loadItemsConfig() {
  itemsLoading.value = true
  try {
    const t = Date.now()
    const mod = await import(`/src/store/configs.js?t=${t}`)
    itemState.value = {
      defs: JSON.parse(JSON.stringify(mod.ITEM_DEFS || {})),
      inventory: JSON.parse(JSON.stringify(mod.DEFAULT_inventory || [])),
      shop: JSON.parse(JSON.stringify(mod.DEFAULT_SHOP_ITEMS || [])),
      sellPrices: JSON.parse(JSON.stringify(mod.DEFAULT_SELL_PRICES || {})),
      lianzhi: JSON.parse(JSON.stringify(mod.LIANZHI_RECIPES || [])),
      craft: JSON.parse(JSON.stringify(mod.CRAFT_RECIPES || [])),
      lianzhiLevel: normLianzhiCfg(mod.LIANZHI_LEVEL_CFG),
    }
    itemsLoaded.value = true
    selItem.value = null; selRecipe.value = null; selBlueprint.value = null; selShopItem.value = null
    ElMessage.success(`物品数据已加载：${Object.keys(itemState.value.defs).length + itemState.value.inventory.length} 物品 / ${itemState.value.lianzhi.length} 配方 / ${itemState.value.craft.length} 图纸 / ${itemState.value.shop.length} 商品`)
  } catch (e) {
    console.error('[物品编辑] 加载失败', e)
    ElMessage.error('加载失败：' + (e?.message || e))
  } finally {
    itemsLoading.value = false
  }
}

// 🎯 写入后恢复：按 mode 定位并选中保存时的条目（与天赋编辑一致：保留当前编辑位置）

function restoreItemSelection(mode, sel) {
  if (!sel) return
  if (mode === 'lianzhi') { const r = itemState.value.lianzhi.find(x => x.id === sel); if (r) selectRecipe(r) }
  else if (mode === 'craft') { const b = itemState.value.craft.find(x => x.id === sel); if (b) selectBlueprint(b) }
  else if (mode === 'shop') { const s = itemState.value.shop.find(x => x.id === sel); if (s) selectShopItem(s) }
  else { const it = itemList.value.find(x => x.name === sel); if (it) selectItem(it) }
}

// 物品合并列表（ITEM_DEFS + 初始背包去重）

const itemList = computed(() => {
  const map = {}
  for (const [name, def] of Object.entries(itemState.value.defs)) map[name] = { name, ...def }
  for (const it of itemState.value.inventory) {
    if (!it || !it.name) continue
    // 📌 defs（ITEM_DEFS，dladmin 写入的权威配置）覆盖 inventory：修改后表单回读最新值
    map[it.name] = { name: it.name, ...it, ...(map[it.name] || {}) }
  }
  let list = Object.values(map).filter(i => i && i.name && !/^测试/.test(i.name))
  const kw = itemKeyword.value.trim()
  if (kw) list = list.filter(i => i.name.includes(kw) || (i.miaoshu || '').includes(kw))
  if (itemTypeFilter.value !== 'all') list = list.filter(i => itemTypeValue(i) === itemTypeFilter.value)
  return list
})

function shopPriceOf(name) { return itemState.value.shop.find(s => s.name === name)?.price }

function outFields(o) {
  if (!o) return ''
  const f = []
  if (o.name) f.push(`name: ${jstr(o.name)}`)
  if (o.num != null) f.push(`num: ${o.num}`)
  if (o.img) f.push(`img: ${jstr(o.img)}`)
  if (o.miaoshu) f.push(`miaoshu: ${jstr(o.miaoshu)}`)
  if (o.isItem) f.push('isItem: true')
  if (o.shiyong) f.push('shiyong: true')
  if (o.special) f.push(`special: ${jstr(o.special)}`)
  if (o.status) f.push(`status: ${jstr(o.status)}`)
  if (o.giveNpc) f.push('giveNpc: true')
  if (o.Hp != null) f.push(`Hp: ${o.Hp}`)
  if (o.color) f.push(`color: ${jstr(o.color)}`)
  return f.join(', ')
}

const levelUpLoaded = ref(false)

const levelUpLoading = ref(false)

// 🏆 局外养成（META_ROLE_CFG）：失败结算经验 / 升级提升初始属性 / 经验转换率
const metaRoleCfg = ref({ maxLevel: 50, expBase: 100, expStep: 30, perLevelStats: { attack: 2, maxHp: 20, speed: 1, armor: 1, magicResist: 1 }, expConversionRate: 0.2 })

async function loadLevelUpConfig() {
  if (levelUpLoading.value) return // 🔒 防重复：初始自动加载进行中则跳过（避免二次弹窗）
  levelUpLoading.value = true
  try {
    const resp = await fetch('/src/store/configs.js?t=' + Date.now())
    const src = resp.ok ? await resp.text() : ''
    const m = src.match(/const LEVEL_UP_CFG = \{[\s\S]*?\n\};/)
    if (!m) { ElMessage.error('未找到 LEVEL_UP_CFG'); return }
    const body = m[0].replace(/^const LEVEL_UP_CFG = /, '').replace(/;$/, '') // 去掉结尾 ;，避免 return ({...};) 语法错误
    const cfg = new Function('return (' + body + ')')()
    // 🔁 旧版共享成长结构 { attack, speed } → 转换为按角色独立成长（兜底兼容）
    const _ag = cfg.ally.growth || {}
    if (_ag.attack != null && !_ag.tuzi) {
      cfg.ally.growth = {}
      for (const role of Object.keys(cfg.ally.base || {})) cfg.ally.growth[role] = { attack: _ag.attack ?? 2, speed: _ag.speed ?? 1 }
    }
    // 🔁 旧版数字 expBase/expMult → 转换为按角色独立（兜底兼容）
    if (typeof cfg.ally.expBase === 'number') {
      const _old = cfg.ally.expBase
      cfg.ally.expBase = {}
      for (const role of Object.keys(cfg.ally.base || {})) cfg.ally.expBase[role] = _old
    }
    if (typeof cfg.ally.expMult === 'number') {
      const _old = cfg.ally.expMult
      cfg.ally.expMult = {}
      for (const role of Object.keys(cfg.ally.base || {})) cfg.ally.expMult[role] = _old
    }
    // 🆓 旧配置无 freeAttrPointsStart → 默认 10
    if (cfg.player.freeAttrPointsStart == null) cfg.player.freeAttrPointsStart = 10
    // 🎓 旧配置无 initialTalentPoints → 默认 0
    if (cfg.player.initialTalentPoints == null) cfg.player.initialTalentPoints = 0
    // 📈 旧配置无每级成长字段 → 默认值兜底（与游戏内默认一致）
    if (cfg.player.attackPerLevel == null) cfg.player.attackPerLevel = 3
    if (cfg.player.freeAttrPerLevel == null) cfg.player.freeAttrPerLevel = 4
    if (cfg.player.talentPerLevel == null) cfg.player.talentPerLevel = 0
    // 🔢 旧配置 base 缺新属性（力量/智慧/元素精通/魅力）→ 默认 0
    const _pb = cfg.player.base || (cfg.player.base = {})
    if (_pb.strength == null) _pb.strength = 0
    if (_pb.intelligence == null) _pb.intelligence = 0
    if (_pb.elementMastery == null) _pb.elementMastery = 0
    if (_pb.charm == null) _pb.charm = 0
    // 💪 旧配置无 attrRates → 默认值兜底
    const _ar = cfg.attrRates || {}
    cfg.attrRates = {
      strengthPhysDmg: _ar.strengthPhysDmg ?? 1.5,
      strengthHp: _ar.strengthHp ?? 2,
      intelligenceEleDmg: _ar.intelligenceEleDmg ?? 1.5,
      elementMasteryReactDmg: _ar.elementMasteryReactDmg ?? 1,
      intelligenceMastery: _ar.intelligenceMastery ?? 0.2,
      baseCritRate: _ar.baseCritRate ?? 5,
      luckCritRate: _ar.luckCritRate ?? 30,
      luckCritDmg: _ar.luckCritDmg ?? 100,
      luckDrop: _ar.luckDrop ?? 100,
      charmAffection: _ar.charmAffection ?? 5,
    }
    // 🧪 旧配置缺 elementReaction 字段（元素反应固定伤害：基础值 + 每级成长）→ 默认值兜底
    const _er = cfg.elementReaction || (cfg.elementReaction = {})
    if (_er.freezeBase == null) _er.freezeBase = 137
    if (_er.freezePerLv == null) _er.freezePerLv = 3
    if (_er.freezeChance == null) _er.freezeChance = 0.35
    if (_er.vaporizeBase == null) _er.vaporizeBase = 237
    if (_er.vaporizePerLv == null) _er.vaporizePerLv = 4
    if (_er.meltBase == null) _er.meltBase = 162
    if (_er.meltPerLv == null) _er.meltPerLv = 3
    if (_er.meltArmorReduce == null) _er.meltArmorReduce = 0.1
    if (_er.electrochargeBase == null) _er.electrochargeBase = 162
    if (_er.electrochargePerLv == null) _er.electrochargePerLv = 3
    if (_er.electrochargeActionDrop == null) _er.electrochargeActionDrop = 0.12
    if (_er.superconductBase == null) _er.superconductBase = 125
    if (_er.superconductPerLv == null) _er.superconductPerLv = 3
    if (_er.superconductPhysUp == null) _er.superconductPhysUp = 0.25
    if (_er.overloadBase == null) _er.overloadBase = 100
    if (_er.overloadPerLv == null) _er.overloadPerLv = 2
    // 🏆 局外养成配置提取（META_ROLE_CFG，缺字段默认值兜底）
    const mMeta = src.match(/export const META_ROLE_CFG = \{[\s\S]*?\n\};/)
    if (mMeta) {
      const mBody = mMeta[0].replace(/^export const META_ROLE_CFG = /, '').replace(/;$/, '')
      try {
        const mCfg = new Function('return (' + mBody + ')')()
        metaRoleCfg.value = {
          maxLevel: mCfg.maxLevel ?? 50,
          expBase: mCfg.expBase ?? 100,
          expStep: mCfg.expStep ?? 30,
          perLevelStats: mCfg.perLevelStats || { attack: 2, maxHp: 20, speed: 1, armor: 1, magicResist: 1 },
          expConversionRate: mCfg.expConversionRate ?? 0.2,
        }
      } catch (e) { console.warn('[升级编辑] 局外养成配置解析失败，使用默认', e) }
    }
    levelUpCfg.value = cfg
    levelUpLoaded.value = true
    loadBreakthroughConfig(src) // 💎 同源提取突破配置（BREAKTHROUGH_STAGES / QUALITY_PENALTY）
    ElMessage.success('升级配置已加载')
  } catch (e) {
    console.error('[升级编辑] 加载失败', e)
    ElMessage.error('加载失败：' + (e?.message || e))
  } finally {
    levelUpLoading.value = false
  }
}
// 序列化 LEVEL_UP_CFG 为 JS 源码

// 💎 突破编辑（BREAKTHROUGH_STAGES / BREAKTHROUGH_QUALITY_PENALTY）
const btLoaded = ref(false)
const BT_QUALITY_NAMES = { 1: '魔晶LV1', 2: '魔晶LV2', 3: '魔晶LV3', 4: '魔晶LV4', 5: '魔晶LV5', 6: '魔晶LV6', 7: '魔晶LV7' }
const btState = ref({ stages: {}, penalties: {}, compensation: {}, compCap: 25, qualityBonus: {}, previewStage: 1, previewQuality: 1, previewFails: 0 })

function loadBreakthroughConfig(src) {
  const stages = {}
  const m1 = src.match(/export const BREAKTHROUGH_STAGES = \{[\s\S]*?\n\};/)
  if (m1) {
    const body = m1[0].replace(/^export const BREAKTHROUGH_STAGES = /, '').replace(/;$/, '')
    const cfg = new Function('return (' + body + ')')()
    for (const [k, v] of Object.entries(cfg || {})) {
      stages[k] = {
        level: v.level,
        baseRatePct: Math.round((v.baseRate ?? 0.5) * 100),
        attr: v.attr,
      }
    }
  }
  const qualityBonus = {}
  const m1b = src.match(/export const BREAKTHROUGH_QUALITY_BONUS = \{[\s\S]*?\n\};/)
  if (m1b) {
    const body = m1b[0].replace(/^export const BREAKTHROUGH_QUALITY_BONUS = /, '').replace(/;$/, '')
    const cfg = new Function('return (' + body + ')')()
    Object.assign(qualityBonus, cfg || {})
  }
  const penalties = {}
  const m2 = src.match(/export const BREAKTHROUGH_QUALITY_PENALTY = \{[\s\S]*?\};/)
  if (m2) {
    const body = m2[0].replace(/^export const BREAKTHROUGH_QUALITY_PENALTY = /, '').replace(/;$/, '')
    const cfg = new Function('return (' + body + ')')()
    for (const [k, v] of Object.entries(cfg || {})) penalties[k] = Math.round((v ?? 0) * 100)
  }
  // 💎 失败补偿（各品质）与补偿上限
  const compensation = {}
  const m3 = src.match(/export const BREAKTHROUGH_FAIL_COMPENSATION = \{[\s\S]*?\};/)
  if (m3) {
    const body = m3[0].replace(/^export const BREAKTHROUGH_FAIL_COMPENSATION = /, '').replace(/;$/, '')
    const cfg = new Function('return (' + body + ')')()
    for (const [k, v] of Object.entries(cfg || {})) compensation[k] = Math.round((v ?? 0) * 100)
  }
  let compCap = 25
  const m4 = src.match(/export const BREAKTHROUGH_COMPENSATION_CAP = ([\d.]+);/)
  if (m4) compCap = Math.round(parseFloat(m4[1]) * 100)
  btState.value = { ...btState.value, stages, penalties, compensation, compCap, qualityBonus }
  btLoaded.value = true
}

function btQualityName(q) { return BT_QUALITY_NAMES[q] || ('魔晶LV' + q) }

// 💎 实际成功率 = 基础率 × (1 − 品质惩罚%)，四舍五入到整数百分比（下限 1%）
function btPreview(stage, q) {
  const s = btState.value.stages[stage]
  const p = btState.value.penalties[q] ?? 0
  if (!s) return 0
  return Math.max(1, Math.min(100, Math.round((s.baseRatePct / 100) * (1 - p / 100) * 100)))
}
function btRateColor(rate) { return rate >= 60 ? '#22c55e' : rate >= 40 ? '#fbbf24' : '#ef4444' }

// 🧮 成功率预览（与游戏 calcBreakthroughRate 一致：基础率 ×(1−惩罚%) + 失败补偿，下限5% 上限100%）
function btCalcPreview() {
  const st = btState.value
  const s = st.stages[st.previewStage]
  if (!s) return null
  const q = st.previewQuality
  const p = st.penalties[q] ?? 0
  const basePct = s.baseRatePct
  const penalized = Math.round((basePct / 100) * (1 - p / 100) * 100)
  const compRaw = (st.compCap / 100) < ((st.previewFails || 0) * ((st.compensation[q] ?? 0) / 100))
    ? (st.compCap / 100) : ((st.previewFails || 0) * ((st.compensation[q] ?? 0) / 100))
  const compPct = Math.round(compRaw * 100)
  const rate = Math.max(0.05, Math.min(1, (basePct / 100) * (1 - p / 100) + compRaw))
  return {
    basePct, penalized, compPct,
    finalPct: Math.round(rate * 100),
    level: s.level,
  }
}

// 序列化 BREAKTHROUGH_STAGES 对象体（baseRate 百分数转回小数）
function btStagesSrc() {
  const L = []
  for (const [k, s] of Object.entries(btState.value.stages)) {
    L.push('  ' + k + ': { level: ' + s.level + ', baseRate: ' + ((s.baseRatePct ?? 50) / 100)
      + ', attr: { maxHp: ' + (s.attr?.maxHp ?? 0) + ', attack: ' + (s.attr?.attack ?? 0) + ', armor: ' + (s.attr?.armor ?? 0) + ', speed: ' + (s.attr?.speed ?? 0) + ' } },')
  }
  return L.join('\n')
}
// 序列化 BREAKTHROUGH_QUALITY_BONUS 对象体（全局一份，品质1-7）
function btQualityBonusSrc() {
  const L = []
  const obj = btState.value.qualityBonus || {}
  for (let q = 1; q <= 7; q++) L.push('  ' + q + ': ' + (obj[q] ?? 1) + ',')
  return L.join('\n')
}
// 序列化 BREAKTHROUGH_QUALITY_PENALTY 对象体
function btPenaltySrc() {
  const L = []
  for (const [k, v] of Object.entries(btState.value.penalties)) L.push('  ' + k + ': ' + ((v ?? 0) / 100) + ',')
  return L.join('\n')
}
// 序列化 BREAKTHROUGH_FAIL_COMPENSATION 对象体
function btCompSrc() {
  const L = []
  for (const [k, v] of Object.entries(btState.value.compensation)) L.push('  ' + k + ': ' + ((v ?? 0) / 100) + ',')
  return L.join('\n')
}
// 序列化 BREAKTHROUGH_COMPENSATION_CAP（单行小数）
function btCapSrc() {
  return String(((btState.value.compCap ?? 25) / 100).toFixed(2))
}

const initInvOptions = ref([])

const initInvDefs = ref({})

const initInvLoaded = ref(false)

const initInvLoading = ref(false)

async function loadInitInv() {
  if (initInvLoading.value) return // 🔒 防重复
  initInvLoading.value = true
  try {
    const t = Date.now()
    const mod = await import(`/src/store/configs.js?t=${t}`)
    initInvDefs.value = mod.ITEM_DEFS || {}
    initInvRows.value = (mod.DEFAULT_inventory || []).map(it => ({ ...it, _raw: { ...it } }))
    initInvOptions.value = [...new Set([...Object.keys(initInvDefs.value), ...(mod.DEFAULT_inventory || []).map(x => x.name).filter(Boolean)])]
    initInvLoaded.value = true
    ElMessage.success(`初始背包已加载：${initInvRows.value.length} 项`)
  } catch (e) {
    console.error('[初始背包] 加载失败', e)
    ElMessage.error('加载失败：' + (e?.message || e))
  } finally {
    initInvLoading.value = false
  }
}
// 序列化初始背包（保留原字段；新增物品用 ITEM_DEFS 补全图标/描述/颜色等）

const achLoaded = ref(false)

const achLoading = ref(false)

const taskLoaded = ref(false)

const taskLoading = ref(false)

// ========================
// 🎴 卡牌编辑（DEFAULT_CARD_DATA：灵力消耗 / 1-3星倍率 / 描述变量绑定）
// ========================

const cardsLoaded = ref(false)

const cardsLoading = ref(false)

const cardsState = ref({}) // 卡牌名 → 配置对象（深拷贝副本）

const cardKeyword = ref('')

const cardRarityFilter = ref('all')

const cardTypeFilter = ref('all') // 🎴 卡牌类型筛选（all=全部 / normal=普通牌 / special=特殊牌 / exclusive=独占牌）

const selCard = ref(null) // 当前编辑卡牌（含 name）

const CARD_RARITIES = [
  { value: 'common', label: '普通' },
  { value: 'excellent', label: '优秀' },
  { value: 'rare', label: '稀有' },
  { value: 'epic', label: '史诗' },
  { value: 'legendary', label: '传说' },
]

const CARD_RARITY_NAMES = { common: '普通', excellent: '优秀', rare: '稀有', epic: '史诗', legendary: '传说' }

const CARD_RARITY_COLORS = { common: '#909399', excellent: '#409EFF', rare: '#8B5CF6', epic: '#E6A23C', legendary: '#F56C6C' }

const CARD_TYPE_FILTERS = [
  { value: 'all', label: '全部类型' },
  { value: 'normal', label: '普通牌' },
  { value: 'special', label: '特殊牌' },
  { value: 'exclusive', label: '独占牌' },
]

const DMG_TYPE_NAMES = { physical: '物理', fire: '火', water: '水', lightning: '电', ice: '冰', poison: '毒', wind: '风', null: '无' }

function rarityName(r) { return CARD_RARITY_NAMES[r] || '普通' }

function rarityColor(r) { return CARD_RARITY_COLORS[r] || '#909399' }

function dmgTypeName(t) { return DMG_TYPE_NAMES[t] || t || '未知' }

// 🎴 卡牌类型（cardType）：normal=普通牌（抽奖+商店可获得）/ special=特殊牌（暂无获取来源）/ exclusive=独占牌（仅独占角色可获得）
const CARD_TYPES = [
  { value: 'normal', label: '普通牌' },
  { value: 'special', label: '特殊牌' },
  { value: 'exclusive', label: '独占牌' },
]
// 👤 独占角色（exclusiveRole）：开局可选的四名角色
const CARD_EXCLUSIVE_ROLES = [
  { value: 'linen', label: '林恩' },
  { value: 'jinmao', label: '晨曦' },
  { value: 'yu', label: '云弥' },
  { value: 'huli', label: '西亚' },
]
// 🎴 卡牌类型选择器模型：普通牌不写 cardType 字段（配置保持干净），特殊/独占牌写入
const cardTypeModel = computed({
  get: () => selCard.value?.cardType || 'normal',
  set: (v) => {
    const c = selCard.value
    if (!c) return
    if (v === 'normal') { delete c.cardType; delete c.exclusiveRole }
    else { c.cardType = v; if (!c.exclusiveRole) c.exclusiveRole = 'linen' }
  },
})

// 🪙 分解金币默认值（与 counter-store.getCardGoldValue 保持一致：普通5 / 优秀15 / 稀有30 / 史诗60 / 传说120）
const DECOMPOSE_GOLD_DEFAULT = { common: 5, excellent: 15, rare: 30, epic: 60, legendary: 120 }
function defaultDecomposeGold(r) { return DECOMPOSE_GOLD_DEFAULT[r] || 5 }
// 🪙 分解金币输入模型：留空时按稀有度显示默认值（仅展示，不改写配置；修改后写入 decomposeGold）
const decomposeGoldModel = computed({
  get: () => {
    const c = selCard.value
    if (!c) return 0
    return c.decomposeGold != null ? Number(c.decomposeGold) : defaultDecomposeGold(c.rarity)
  },
  set: (v) => {
    const c = selCard.value
    if (!c) return
    c.decomposeGold = (v == null || v === '') ? undefined : Number(v)
  },
})
// 💰 分解收益预览：1星×1 / 2星×2.5 / 3星×6（向下取整，与 decomposeCard 一致）
const decomposePreview = computed(() => {
  const c = selCard.value
  if (!c) return ''
  const base = c.decomposeGold != null ? Number(c.decomposeGold) : defaultDecomposeGold(c.rarity)
  return '1星 ' + Math.floor(base * 1) + ' · 2星 ' + Math.floor(base * 2.5) + ' · 3星 ' + Math.floor(base * 6) + ' 金币'
})

// ✨ 卡牌特殊效果字段：基础字段跳过（基础区单独编辑），其余数值/数组/嵌套对象全部可调
const CARD_SKIP_FIELDS = ['name', 'skin', 'color', 'dmgType', 'rarity', 'num', 'desc', 'skillAnim', 'animDelay', 'starDesc', 'canDraw', 'decomposeGold', 'cardType', 'exclusiveRole']

// 特殊效果字段中文名（兜底显示原始 key）
const CARD_FIELD_NAMES = {
  decomposeGold: '分解金币',
  canDraw: '可被抽取',
  maxCooldown: '冷却回合', hitCount: '打击次数', fixedDmg: '固定伤害', limitPerTurn: '每回合限用', needTarget: '指定目标',
  starEffects: '星级特殊效果',
  critRateBonus: '暴击率加成', splashBoost: '溅射伤害加成', splashRatio: '主目标溅射比例',
  slowPct: '迟滞减速', pushbackPct: '行动条击退', armorBreakPct: '护甲击碎',
  cloneHpRatio: '影分身生命比例', cloneAtkRatio: '影分身攻击比例',
  manaRecover: '灵力恢复', atkBoostPct: '攻击提升', reflectArmorPct: '反弹护甲提升',
  weaknessBase: '弱点基础加成', weaknessPerStack: '弱点每层加成',
  poisonTakenBoost: '中毒易伤提升', poisonDotRatio: '毒素持续伤害比例',
  dotRatio: '引爆毒伤比例', allyActionBoost: '友方行动条提升', allyAtkBoost: '友方攻击提升',
  shieldRatio: '护盾比例', healRatio: '恢复生命比例', dotHealRatio: '持续恢复比例',
  manaGain: '魔力获得', speedBoostPct: '速度提升', shootBoostPct: '射击倍率提升',
  falloffPct: '伤害衰减', highHpThreshold: '高血量阈值', highHpBoostPct: '高血量增伤',
  armorShredPct: '护甲击碎', armorShredDuration: '击碎持续回合',
  poisonBoostPct: '毒素增伤', burnBoostPct: '灼烧增伤', chainCount: '连锁弹射次数',
  slowDuration: '减速持续回合',
}

function effectLabel(k) { return CARD_FIELD_NAMES[k] || k }

// 🎰 抽卡概率（DEFAULT_GACHA_RATES：普通池 + 高级池，各自合计必须 = 100%）
const gachaRates = ref({
  normal: { common: 50, excellent: 28, rare: 17, epic: 5, legendary: 0 },
  premium: { excellent: 35, rare: 40, epic: 18, legendary: 7 },
})

const GACHA_RARITY_NAMES = { common: '普通', excellent: '优秀', rare: '稀有', epic: '史诗', legendary: '传说' }

function gachaTotal(pool) {
  const p = gachaRates.value[pool]
  if (!p) return 0
  return Object.values(p).reduce((s, v) => s + (Number(v) || 0), 0)
}

// 从同一份 configs.js 源码解析 DEFAULT_GACHA_RATES（loadCardsConfig 内调用）
function loadGachaRates(src) {
  const m = src.match(/export const DEFAULT_GACHA_RATES = \{[\s\S]*?\n\};/m)
  if (!m) return
  const objText = m[0].slice(m[0].indexOf('{') + 1, m[0].lastIndexOf('}'))
  try {
    const data = Function('return {' + objText + '}')()
    if (data && data.normal && data.premium) gachaRates.value = data
  } catch (e) {
    console.error('[卡牌编辑] 解析 gachaRates 失败', e)
  }
}

// 🎰 生成 DEFAULT_GACHA_RATES 对象体源码（保持原 key 风格）
function gachaRatesSrc() {
  const L = []
  L.push('  // 普通卡池（消耗灵力晶核）')
  L.push('  normal: {')
  for (const [k, v] of Object.entries(gachaRates.value.normal || {})) L.push(`    ${k}: ${Number(v) || 0}, // ${GACHA_RARITY_NAMES[k] || ''}`)
  L.push('  },')
  L.push('  // 高级卡池（消耗魔力晶核，无保底）')
  L.push('  premium: {')
  for (const [k, v] of Object.entries(gachaRates.value.premium || {})) L.push(`    ${k}: ${Number(v) || 0}, // ${GACHA_RARITY_NAMES[k] || ''}`)
  L.push('  },')
  return L.join('\n')
}

// ✨ 当前卡牌可编辑的特殊效果字段列表（含类型，用于模板动态渲染）
const specialFields = computed(() => {
  const cfg = selCard.value
  if (!cfg) return []
  const out = []
  for (const [k, v] of Object.entries(cfg)) {
    if (CARD_SKIP_FIELDS.includes(k) || k === 'cost' || k === 'atkRatio') continue
    if (v === null || v === undefined) continue
    if (typeof v === 'object' && !Array.isArray(v)) {
      if (Object.keys(v).length) out.push({ key: k, type: 'object' })
    } else if (Array.isArray(v)) {
      out.push({ key: k, type: 'array' })
    } else if (typeof v === 'boolean') {
      out.push({ key: k, type: 'boolean' })
    } else if (typeof v === 'string') {
      out.push({ key: k, type: 'string' })
    } else {
      out.push({ key: k, type: 'number' })
    }
  }
  return out
})

// 🎴 卡牌合并列表（含 name，支持搜索/稀有度筛选）
const cardList = computed(() => {
  let list = Object.entries(cardsState.value).map(([name, c]) => ({ name, ...c }))
  const kw = cardKeyword.value.trim()
  if (kw) list = list.filter(i => i.name.includes(kw))
  if (cardRarityFilter.value !== 'all') list = list.filter(i => (i.rarity || 'common') === cardRarityFilter.value)
  // 🎴 卡牌类型筛选：普通牌=无 cardType 字段 / 特殊牌 / 独占牌
  const tf = cardTypeFilter.value
  if (tf === 'normal') list = list.filter(i => !i.cardType)
  else if (tf === 'special') list = list.filter(i => i.cardType === 'special')
  else if (tf === 'exclusive') list = list.filter(i => i.cardType === 'exclusive')
  return list
})

// 🎯 总倍率：多段伤害卡牌（hitCount > 1）显示 段数 × 单段倍率，让用户直观了解整卡总伤害倍率；
//    hitCount 支持数组（按星级取段数，如龙卷风暴 [5,6,7] / 禁忌狂雷 [8,10,12]）
function hitsOf(c, st) {
  const v = c && c.hitCount
  if (Array.isArray(v)) return v[st] ?? v[0] ?? 1
  return v ?? 1
}
const cardTotalHits = computed(() => Math.max(1, hitsOf(selCard.value, 0)))
const cardHitsLabel = computed(() => {
  const c = selCard.value
  if (!c) return ''
  if (Array.isArray(c.hitCount) && c.hitCount.length) return c.hitCount.join('/') + ' 段'
  const h = c.hitCount ?? 1
  return h > 1 ? h + ' 段' : ''
})
function totalRatioPct(st) {
  const c = selCard.value
  if (!c || !Array.isArray(c.atkRatio)) return '0%'
  const hits = Math.max(1, hitsOf(c, st))
  return Math.round(((c.atkRatio[st] ?? 0) * hits) * 100) + '%'
}

function selectCard(c) {
  // 🎯 直接引用 cardsState 原对象（写入同一引用）：改品质/倍率等标量字段立即联动左侧列表与保存
  const orig = cardsState.value[c.name]
  if (orig) {
    selCard.value = orig
    selCard.value.name = c.name // name 仅用于表单展示（序列化时过滤）
  } else {
    selCard.value = c
  }
  // 💧 灵力消耗：旧卡可能缺失 cost 字段（游戏内按 0 消耗处理），补全为数字，输入框才能显示当前值并可编辑
  if (typeof selCard.value.cost !== 'number') selCard.value.cost = 0
  // 🛡️ 部分卡牌（辅助/功能卡，如风之庇佑）没有 atkRatio 数组，模板直接索引 atkRatio[0] 会崩溃；
  //    补全为数组：数字倍率按 3 星同值补齐（语义不变），缺失补 0
  if (!Array.isArray(selCard.value.atkRatio)) {
    const r = typeof selCard.value.atkRatio === 'number' ? selCard.value.atkRatio : 0
    selCard.value.atkRatio = [r, r, r]
  }
  // ⭐ 升星说明：描述以 desc 为统一来源，缺失时留空可手动填写（不再自动生成）
  if (!Array.isArray(selCard.value.starDesc)) {
    selCard.value.starDesc = ['', '', '']
  } else {
    for (let _i = 0; _i < 3; _i++) {
      if (selCard.value.starDesc[_i] == null) selCard.value.starDesc[_i] = ''
    }
  }
}

async function loadCardsConfig() {
  cardsLoading.value = true
  try {
    const resp = await fetch('/src/store/configs.js')
    const src = await resp.text()
    const m = src.match(/export const DEFAULT_CARD_DATA = \{[\s\S]*?\n\};/m)
    if (!m) { ElMessage.error('未找到 DEFAULT_CARD_DATA'); return }
    const objText = m[0].slice(m[0].indexOf('{') + 1, m[0].lastIndexOf('}'))
    const data = Function('return {' + objText + '}')()
    cardsState.value = data || {}
    cardsLoaded.value = true
    loadGachaRates(src) // 🎰 同源读取抽卡概率
    selCard.value = null
    // 🎯 恢复上次保存时的选中卡牌
    try {
      const st = JSON.parse(sessionStorage.getItem('dladmin_cards_state') || 'null')
      if (st && st.sel && cardsState.value[st.sel]) selectCard({ name: st.sel, ...cardsState.value[st.sel] })
    } catch (e) { }
    if (!selCard.value) {
      const first = Object.keys(cardsState.value)[0]
      if (first) selectCard({ name: first, ...cardsState.value[first] })
    }
    ElMessage.success(`已加载 ${Object.keys(cardsState.value).length} 张卡牌`)
  } catch (e) {
    console.error('[卡牌编辑] 加载失败', e)
    ElMessage.error('加载失败：' + (e?.message || e))
  } finally {
    cardsLoading.value = false
  }
}

// 🎴 生成 DEFAULT_CARD_DATA 对象体源码（全字段序列化，保留注释头）
function cardsSrc() {
  const L = []
  L.push('  // ⭐ 卡牌配置（dladmin「卡牌编辑」写入）')
  L.push('  // cost=灵力消耗；atkRatio=1/2/3星攻击力倍率；desc=统一描述（游戏内/图鉴/dladmin 均读取此字段）')
  for (const [name, c] of Object.entries(cardsState.value)) {
    L.push('  ' + JSON.stringify(name) + ': {')
    for (const [k, v] of Object.entries(c)) {
      if (v === undefined) continue
      if (k === 'name') continue // name 为列表注入字段，不写入配置
      if (k === 'starDesc' && Array.isArray(v) && v.every(x => !x)) continue // ⭐ 全空升星说明不写入（描述以 desc 为统一来源）
      L.push('    ' + JSON.stringify(k) + ': ' + JSON.stringify(v) + ',')
    }
    L.push('  },')
  }
  return L.join('\n')
}

async function saveCardsConfig() {
  if (!cardsLoaded.value) { ElMessage.warning('请先加载'); return }
  // 🎰 抽卡概率校验：两个卡池各自合计必须 = 100%
  const nt = gachaTotal('normal')
  const pt = gachaTotal('premium')
  if (nt !== 100) { ElMessage.error(`普通卡池概率合计 ${nt}%，必须为 100%（当前差 ${nt > 100 ? '+' : ''}${nt - 100}）`); return }
  if (pt !== 100) { ElMessage.error(`高级卡池概率合计 ${pt}%，必须为 100%（当前差 ${pt > 100 ? '+' : ''}${pt - 100}）`); return }
  const ops = [
    { kind: 'cards', code: cardsSrc() },
    { kind: 'gachaRates', code: gachaRatesSrc() },
  ]
  try {
    const resp = await fetch('/__dladmin_write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ops }),
    })
    const data = await resp.json()
    const bad = (data.results || []).filter(r => !r.ok)
    if (bad.length) { ElMessage.error('写入失败：' + bad.map(b => b.msg).join('；')); return }
    // 💾 记录当前编辑位置：Vite reload 后自动恢复
    try { sessionStorage.setItem('dladmin_cards_state', JSON.stringify({ sel: selCard.value?.name || '' })) } catch (e) { }
    localStorage.setItem('dladmin_restore_tab', 'cards') // 保存后 Vite reload，恢复本 tab
    window.dispatchEvent(new CustomEvent('dladmin:cards-config-changed')) // 🔄 热刷新运行中的 store
    ElMessage.success('✅ 卡牌配置已写入，读档自动生效')
    setTimeout(() => location.reload(), 600) // 🔄 整页刷新：让表单回读写入后的最新配置
  } catch (e) {
    console.error('[卡牌编辑] 保存失败', e)
    ElMessage.error('保存失败：' + (e?.message || e))
  }
}

// ========== 🎭 角色初始配置编辑（configs.js · ROLE_INIT_CONFIGS） ==========
const roleInitLoaded = ref(false)
const roleInitLoading = ref(false)
const roleInitState = ref({}) // { linen: { name, desc, deck, attrs, talentPoints, freeAttrPoints }, ... }
const rcDeckAdd = reactive({}) // 每角色「添加卡牌」下拉的绑定值
const roleAttrKeys = ['strength', 'intelligence', 'elementMastery', 'charm', 'baseMaxHp', 'baseAttack', 'baseSpeed', 'baseArmor', 'baseMagicResist']
const roleAttrLabels = { strength: '💪力量', intelligence: '🧠智慧', elementMastery: '✨精通', charm: '💖魅力', baseMaxHp: '❤️生命', baseAttack: '⚔️攻击', baseSpeed: '👟速度', baseArmor: '🛡️护甲', baseMagicResist: '🧿魔抗' }

async function loadRoleInitConfig() {
  roleInitLoading.value = true
  try {
    const resp = await fetch('/src/store/configs.js')
    const src = await resp.text()
    const md = src.match(/export const ROLE_INIT_CONFIGS = \{([\s\S]*?)\n\};/)
    if (!md) { ElMessage.error('未找到 ROLE_INIT_CONFIGS 段'); return }
    const objText = md[1].replace(/\n/g, '')
    const data = Function('return {' + objText + '}')()
    roleInitState.value = data || {}
    // 🔓 旧配置无 unlocked 字段：主角默认解锁，其余默认锁定
    for (const [rid, rc] of Object.entries(roleInitState.value)) {
      if (rc.unlocked == null) rc.unlocked = (rid === 'linen')
    }
    // 下拉可选项依赖 deckAllCards（仅「初始卡组」Tab 加载时填充）；这里从同一份 configs.js 补齐卡名全集，否则未先加载初始卡组时下拉会显示 no data
    if (!deckAllCards.value.length) {
      const mc = src.match(/export const DEFAULT_CARD_DATA = \{[\s\S]*?\n\};/m)
      if (mc) {
        const cardText = mc[0].slice(mc[0].indexOf('{') + 1, mc[0].lastIndexOf('}'))
        const cardData = Function('return {' + cardText + '}')()
        deckAllCards.value = Object.keys(cardData || {})
      }
    }
    roleInitLoaded.value = true
    ElMessage.success('已加载角色初始配置')
  } catch (e) {
    console.error('[角色初始] 加载失败', e)
    ElMessage.error('加载失败：' + (e?.message || e))
  } finally {
    roleInitLoading.value = false
  }
}

/** 该角色尚未加入卡组的卡名（供下拉选择） */
function roleNotInDeck(rid) {
  const rc = roleInitState.value[rid]
  return deckAllCards.value.filter(n => !(rc?.deck || []).includes(n))
}
function roleDeckAdd(rid, name) {
  if (!name) return
  const rc = roleInitState.value[rid]
  if (!rc) return
  if (!rc.deck) rc.deck = []
  if (!rc.deck.includes(name)) rc.deck.push(name)
  rcDeckAdd[rid] = ''
}

/** 组装保存数据：整块 ROLE_INIT_CONFIGS 对象体（vite 写入器按锚点替换） */
function roleInitCode() {
  const lines = []
  for (const [rid, rc] of Object.entries(roleInitState.value)) {
    const deck = Array.isArray(rc.deck) && rc.deck.length ? rc.deck.map(n => JSON.stringify(n)).join(', ') : ''
    const attrs = rc.attrs || {}
    const at = roleAttrKeys.map(k => k + ': ' + (attrs[k] ?? 0)).join(', ')
    lines.push('  ' + rid + ': {\n' +
      '    name: ' + JSON.stringify(rc.name || '') + ',\n' +
      '    desc: ' + JSON.stringify(rc.desc || '') + ',\n' +
      '    deck: [' + deck + '],\n' +
      '    attrs: { ' + at + ' },\n' +
      '    talentPoints: ' + (rc.talentPoints ?? 0) + ',\n' +
      '    freeAttrPoints: ' + (rc.freeAttrPoints ?? 0) + ',\n' +
      '    unlocked: ' + (rc.unlocked ? 'true' : 'false') + ',\n' +
      '  },')
  }
  return lines.join('\n')
}

async function saveRoleInitConfig() {
  if (!roleInitLoaded.value) { ElMessage.warning('请先加载'); return }
  try {
    const resp = await fetch('/__dladmin_write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ops: [{ kind: 'roleInit', code: roleInitCode() }] }),
    })
    const data = await resp.json()
    const bad = (data.results || []).filter(r => !r.ok)
    if (bad.length) { ElMessage.error('写入失败：' + bad.map(b => b.msg).join('；')); return }
    localStorage.setItem('dladmin_restore_tab', 'roleInit') // 保存后 Vite reload，恢复本 tab
    ElMessage.success('✅ 角色初始配置已写入，新游戏开局生效')
    setTimeout(() => location.reload(), 600)
  } catch (e) {
    console.error('[角色初始] 保存失败', e)
    ElMessage.error('保存失败：' + (e?.message || e))
  }
}

// ========== 🎖 熟练度编辑（configs.js · 每张卡的 mastery 字段） ==========
const masteryLoaded = ref(false)
const masteryLoading = ref(false)
// { 卡名: { base, type, value, desc } }；type='none' 表示不配置变强效果（保存时置 null 删除字段）
const masteryState = ref({})

async function loadMasteryConfig() {
  masteryLoading.value = true
  try {
    const resp = await fetch('/src/store/configs.js')
    const src = await resp.text()
    const m = src.match(/export const DEFAULT_CARD_DATA = \{[\s\S]*?\n\};/m)
    if (!m) { ElMessage.error('未找到 DEFAULT_CARD_DATA'); return }
    const objText = m[0].slice(m[0].indexOf('{') + 1, m[0].lastIndexOf('}'))
    const data = Function('return {' + objText + '}')()
    const map = {}
    for (const [name, cfg] of Object.entries(data || {})) {
      const ms = cfg.mastery
      map[name] = ms && typeof ms === 'object'
        ? { base: Number(ms.base) || 100, type: ms.type || 'flatDmg', value: Number(ms.value) || 0, desc: ms.desc || '' }
        : { base: 100, type: 'none', value: 0, desc: '' }
    }
    masteryState.value = map
    masteryLoaded.value = true
    ElMessage.success(`已加载 ${Object.keys(map).length} 张卡牌的熟练度配置`)
  } catch (e) {
    console.error('[熟练度编辑] 加载失败', e)
    ElMessage.error('加载失败：' + (e?.message || e))
  } finally {
    masteryLoading.value = false
  }
}

// 💾 组装保存数据：type='none' → null（后端删除该卡的 mastery 字段）
function masteryCode() {
  const map = {}
  for (const [name, m] of Object.entries(masteryState.value)) {
    if (!m || m.type === 'none') { map[name] = null; continue }
    map[name] = { base: Number(m.base) || 100, type: (m.type === 'percentDmg' ? 'percentDmg' : 'flatDmg'), value: Number(m.value) || 0, desc: String(m.desc || '') }
  }
  return JSON.stringify(map)
}

async function saveMasteryConfig() {
  if (!masteryLoaded.value) { ElMessage.warning('请先加载'); return }
  try {
    const resp = await fetch('/__dladmin_write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ops: [{ kind: 'cardMastery', code: masteryCode() }] }),
    })
    const data = await resp.json()
    const bad = (data.results || []).filter(r => !r.ok)
    if (bad.length) { ElMessage.error('写入失败：' + bad.map(b => b.msg).join('；')); return }
    localStorage.setItem('dladmin_restore_tab', 'cardMastery') // 保存后 Vite reload，恢复本 tab
    ElMessage.success('✅ 熟练度配置已写入，读档自动生效')
    setTimeout(() => location.reload(), 600)
  } catch (e) {
    console.error('[熟练度编辑] 保存失败', e)
    ElMessage.error('保存失败：' + (e?.message || e))
  }
}

// ========== 🃏 初始卡组编辑（已移除：卡组编辑并入「角色初始」，每角色独立配置） ==========
// 全部卡名（来自 DEFAULT_CARD_DATA，供角色初始 Tab 下拉使用）
const deckAllCards = ref([])
// ========== 👾 怪物编辑（enemiesData.js · monsterConfigs） ==========

const monstersLoaded = ref(false)
const monstersLoading = ref(false)
const monsterList = ref([])          // [{ key, name, data }] data = 完整怪物对象（深拷贝）
const selMonsterKey = ref(null)
const monsterExtraCollapsed = ref(false)
const MONSTER_NUM_FIELDS = ['hp', 'attack', 'armor', 'magicResist', 'speed', 'luck']
const MONSTER_FIELD_LABELS = { hp: 'HP', attack: '攻击', armor: '护甲', magicResist: '魔抗', speed: '速度', luck: '幸运' }
// 🏷️ 怪层/技能/被动数值字段的中文说明（未收录的键原样显示）
const MONSTER_FIELD_CN = {
  // 怪层通用
  damageTaken: '易伤(受击增伤)',
  allDamageBonus: '增伤(造成伤害)',
  physDamageTaken: '物理易伤',
  executeDamageBonus: '最终增伤倍率',
  takenDamageReduce: '最终减伤倍率',
  attackArmorReducePct: '普攻削甲',
  attackMultiplier: '普攻倍率',
  attackHits: '普攻段数',
  baseExp: '基础经验',
  // 技能通用
  damageRatio: '伤害倍率',
  actionBarReduce: '行动条削减',
  cooldown: '冷却回合',
  initialCooldown: '初始冷却',
  summonCount: '召唤数量',
  summonStatRatio: '召唤属性比例',
  maxTotal: '场上最多敌人',
  minTotalForUse: '场上少于时使用',
  summonDelay: '召唤延迟(ms)',
  attackBoost: '攻击力加成',
  speedBoost: '速度加成',
  duration: '持续回合',
  basePct: '基础百分比',
  perLvPct: '每级百分比',
  perLvRate: '每级加成',
  baseRate: '基础比率',
  mult: '倍率',
  hitIntervalMs: '段间隔(ms)',
  manaCost: '魔力消耗',
  // 被动通用
  actionBarBoost: '行动条加成',
  maxStack: '最大叠层',
  manaDrain: '灵力汲取',
  hpThreshold: '触发血量阈值',
  physDamageReduce: '物理减伤',
  triggerPerTurn: '每回合触发',
  attackDmgType: '普攻属性',
}
const MONSTER_DMG_TYPES = [
  { value: 'physical', label: '物理' },
  { value: 'lightning', label: '雷' },
  { value: 'wind', label: '风' },
  { value: 'fire', label: '火' },
  { value: 'water', label: '水' },
  { value: 'ice', label: '冰' },
  { value: 'null', label: '无属性' },
]
// 🏷️ 怪物类型（图鉴标记：普通/精英/Boss）
const MONSTER_RANK_OPTIONS = [
  { value: 'normal', label: '普通' },
  { value: 'elite', label: '精英' },
  { value: 'boss', label: 'Boss' },
]
// 📋 怪物模板属性：怪未显式设置的字段按此默认值显示；保存时与模板相同的值不写入文件（战斗逻辑用 ?? 兜底，保持文件精简）
const MONSTER_TEMPLATE = {
  attackMultiplier: 1,        // 普攻倍率（战斗创建单位时 ?? 1）
  attackHits: 1,              // 普攻段数（?? 1）
  hitIntervalMs: 150,         // 多段普攻间隔
  attackDmgType: 'physical',  // 普攻属性（?? 'physical'）
  magicResist: 0,             // 魔抗（未设置时无魔抗）
  damageTaken: 0,             // 易伤
  allDamageBonus: 0,          // 增伤
  physDamageTaken: 0,         // 物理易伤
  executeDamageBonus: 1,      // 最终增伤倍率
  takenDamageReduce: 1,       // 最终减伤倍率
  attackArmorReducePct: 0,    // 普攻削甲
  rank: 'normal',             // 🏷️ 怪物类型：normal普通 / elite精英 / boss首领（图鉴标记联动）
}
const selMonster = computed(() => monsterList.value.find(m => m.key === selMonsterKey.value) || null)
// 🔗 召唤类技能描述联动：desc 随 summonCount / summonStatRatio / summonType 实时生成（不写死）
function syncSummonDesc(s) {
  if (!s || s.type !== 'summon') return
  const cnt = s.summonCount ?? 2
  const ratio = Math.round((s.summonStatRatio ?? 0.8) * 100)
  const sName = dungeonEnemyName(s.summonType) || '暗影'
  s.desc = `召唤${cnt}个拥有自己${ratio}%属性的${sName}`
}
// 🎭 塞咒类技能描述联动：desc 随 count 实时生成（诅咒布偶「怨咒」）
function syncCurseCardsDesc(s) {
  if (!s || s.type !== 'insertCurseCards') return
  const cnt = s.count ?? 3
  s.desc = `往玩家牌库塞入${cnt}张诅咒卡，离开地牢后清除。`
}
// 监听当前怪物技能数组变化（deep）：召唤类技能描述自动跟数值联动
watch(() => selMonster.value?.data?.skills, (sk) => {
  if (Array.isArray(sk)) { sk.forEach(syncSummonDesc); sk.forEach(syncCurseCardsDesc) }
}, { deep: true })
// 对象里的数值字段名（技能/被动通用）
function numKeysOf(obj) {
  return Object.entries(obj || {}).filter(([, v]) => typeof v === 'number').map(([k]) => k)
}
// 🔒 内部字段不展示：level（地牢等级倍率基准）、spineAlpha（骨骼渲染透明度）不是怪物编辑设计字段
const MONSTER_HIDDEN_KEYS = ['level', 'spineAlpha']
// 怪层除核心六项/普攻外的其他数值字段（易伤/增伤/减伤等）
const monsterExtraNumKeys = computed(() => {
  const d = selMonster.value?.data || {}
  return numKeysOf(d).filter(k => !MONSTER_NUM_FIELDS.includes(k) && k !== 'attackMultiplier' && k !== 'attackHits' && !MONSTER_HIDDEN_KEYS.includes(k))
})

async function loadMonstersConfig() {
  monstersLoading.value = true
  try {
    const mod = await import(`/src/pages/pixi/matter1/enemiesData.js?t=${Date.now()}`)
    const cfg = mod.monsterConfigs || {}
    monsterList.value = Object.entries(cfg).map(([key, c]) => ({
      key,
      name: c.name || key,
      // 模板铺底：缺失字段按模板显示（如风息无魔抗/暗影无普攻段数，均按模板补全）
      // ⚠️ reactive 包裹：普通对象属性修改不触发 Vue 响应式（数值联动 desc 需要响应式追踪）
      data: reactive({ ...MONSTER_TEMPLATE, ...JSON.parse(JSON.stringify(c)) }),
    }))
    monstersLoaded.value = true
    selMonsterKey.value = monsterList.value[0]?.key || null
    ElMessage.success(`已加载 ${monsterList.value.length} 个怪物`)
  } catch (e) {
    console.error('[怪物编辑] 加载失败', e)
    ElMessage.error('加载失败：' + (e?.message || e))
  } finally {
    monstersLoading.value = false
  }
}

// 👾 生成怪物编辑指令（后端按 怪名 → 技能/被动名 → 字段 定位，只改数值行，其余结构不动）
function monstersSrc() {
  const ops = []
  for (const m of monsterList.value) {
    const nm = m.data.name || m.key
    if (!nm) continue
    // 怪层：所有 number 字段 + 普攻属性（字符串）；与模板默认相同的值跳过（不写入文件，保持精简）
    for (const [k, v] of Object.entries(m.data)) {
      if (k === 'name') continue
      if (typeof v === 'number') {
        if (Object.prototype.hasOwnProperty.call(MONSTER_TEMPLATE, k) && v === MONSTER_TEMPLATE[k]) continue
        ops.push({ monster: nm, section: null, name: null, field: k, value: v })
      } else if (k === 'attackDmgType' && typeof v === 'string') {
        if (v === MONSTER_TEMPLATE.attackDmgType) continue
        ops.push({ monster: nm, section: null, name: null, field: k, value: v })
      }
    }
    // 🏷️ 怪物类型（rank）：精英/Boss 写入文件（普通为默认值不写，保持精简）
    const rank = m.data.rank || 'normal'
    if (rank !== 'normal') ops.push({ monster: nm, section: null, name: null, field: 'rank', value: rank })
    // 技能：数值字段
    for (const s of m.data.skills || []) {
      if (!s || typeof s.name !== 'string') continue
      // 🔗 召唤类技能 desc 联动写入（随 summonCount/summonStatRatio 更新，后端按字段替换）
      if (s.type === 'summon' && typeof s.desc === 'string') {
        syncSummonDesc(s)
        ops.push({ monster: nm, section: 'skills', name: s.name, field: 'desc', value: s.desc })
      }
      // 🎭 塞咒类技能 desc 联动写入（随 count 更新）
      if (s.type === 'insertCurseCards' && typeof s.desc === 'string') {
        syncCurseCardsDesc(s)
        ops.push({ monster: nm, section: 'skills', name: s.name, field: 'desc', value: s.desc })
      }
      for (const [k, v] of Object.entries(s)) {
        if (typeof v === 'number') ops.push({ monster: nm, section: 'skills', name: s.name, field: k, value: v })
      }
    }
    // 被动：数值字段
    for (const p of m.data.passives || []) {
      if (!p || typeof p.name !== 'string') continue
      for (const [k, v] of Object.entries(p)) {
        if (typeof v === 'number') ops.push({ monster: nm, section: 'passives', name: p.name, field: k, value: v })
      }
    }
  }
  return JSON.stringify(ops)
}

async function saveMonstersConfig() {
  if (!monstersLoaded.value) { ElMessage.warning('请先加载'); return }
  try {
    const resp = await fetch('/__dladmin_write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ops: [{ kind: 'monsters', code: monstersSrc() }] }),
    })
    const data = await resp.json()
    const bad = (data.results || []).filter(r => !r.ok)
    if (bad.length) { ElMessage.error('写入失败：' + bad.map(b => b.msg).join('；')); return }
    localStorage.setItem('dladmin_restore_tab', 'monsters') // 保存后 Vite reload，恢复本 tab
    ElMessage.success('✅ 怪物数值已写入，读档自动生效')
    setTimeout(() => location.reload(), 600) // 🔄 整页刷新：让表单回读最新配置
  } catch (e) {
    console.error('[怪物编辑] 保存失败', e)
    ElMessage.error('保存失败：' + (e?.message || e))
  }
}

// 🧭 指引文本编辑（i18n/ui-core.js · guideHint：主世界左上角提示）
const guideZh = ref('')
const guideEn = ref('')
async function loadGuideConfig() {
  try {
    const m = await import('@/i18n/ui-core')
    const dict = m.default || {}
    guideZh.value = dict?.zh?.guideHint || ''
    guideEn.value = dict?.en?.guideHint || ''
    ElMessage.success('已加载当前指引文本')
  } catch (e) {
    console.error('[指引] 加载失败', e)
    ElMessage.error('加载失败：' + (e?.message || e))
  }
}
async function saveGuideConfig() {
  try {
    const resp = await fetch('/__dladmin_write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ops: [{ kind: 'guide', code: JSON.stringify({ zh: guideZh.value, en: guideEn.value }) }] }),
    })
    const data = await resp.json()
    const bad = (data.results || []).filter(r => !r.ok)
    if (bad.length) { ElMessage.error('写入失败：' + bad.map(b => b.msg).join('；')); return }
    localStorage.setItem('dladmin_restore_tab', 'guide') // 保存后 Vite reload，恢复本 tab
    ElMessage.success('✅ 指引文本已写入，刷新游戏生效')
    setTimeout(() => location.reload(), 600)
  } catch (e) {
    console.error('[指引] 保存失败', e)
    ElMessage.error('保存失败：' + (e?.message || e))
  }
}

// ⭐ 按星级填充描述：将 desc 中的 "X/Y/Z%" 三档数值替换为当前星级实际值，并以金色加粗标注（例：1星显示"60%"）
function starSpecificDesc(desc, star) {
  if (!desc) return ''
  const idx = Math.max(1, Math.min(3, star || 1)) - 1
  // 📐 1️⃣ 条件句裁剪：二星起/三星生效的效果，当前星级未达到则整句删除（1星不显示未解锁效果；2星只显示二星档；3星替换为三星档数值并保留独有补充）
  const segs = desc.split(/([；。])/)
  let text = ''
  for (let k = 0; k < segs.length; k += 2) {
    const seg = segs[k], sep = segs[k + 1] || ''
    if (!seg) { text += sep; continue }
    if (/(二星|三星)/.test(seg)) {
      if (idx === 0) { text = text.replace(/；$/, '。'); continue } // 1星：效果未解锁，整句删除（前导分号改句号收尾）
      const isThreeOnly = /^(三星时|三星)/.test(seg.trim())
      let body = seg.trim().replace(/^(二星起|二星|三星时|三星)/, '')
      const m = body.match(/^(.*?)，三星(.*)$/)
      if (m) {
        if (idx === 1) {
          body = m[1] // 2星：只显示二星档
        } else {
          // 3星：二星档数值替换为三星档数值，保留三星独有补充（如"且…"、"（…）"）
          const v2 = (m[2].match(/[-+]?\d+(?:\.\d+)?(?:%| 点| 灵力| 张| 回合)?/) || [''])[0]
          body = v2 ? m[1].replace(/[-+]?\d+(?:\.\d+)?(?:%| 点| 灵力| 张| 回合)?/, v2) : m[1]
          const rest2 = m[2].replace(/^[^，]+?[-+]?\d+(?:\.\d+)?(?:%| 点| 灵力| 张| 回合)?/, '').trim()
          if (/^[且并（(]/.test(rest2)) body = `${body}${/^[（(]/.test(rest2) ? '' : '，'}${rest2}`
        }
      }
      if (isThreeOnly && idx === 1) { text = text.replace(/；$/, '。'); continue } // 三星专属：2星删除（前导分号改句号收尾）
      text += body + sep
    } else {
      text += seg + sep
    }
  }
  // 🎨 2️⃣ 剩余文本先做 HTML 转义防注入，再把星级变动的数值用金色加粗标注（百分比 / 次数 / 灵力三档均支持）
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return esc(text).replace(/(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)(%)?/g, (m, a, b, c, pct) => '<span style="color:#ffb400;font-weight:600">' + [a, b, c][idx] + (pct || '') + '</span>')
}
// 📖 卡牌描述预览：统一读取 CARD_DATA 的 desc（与游戏内 / 图鉴弹窗完全一致，dladmin 所见即所得）
function cardDescPreview(cfg, star) {
  if (!cfg) return ''
  return starSpecificDesc(cfg.desc || '', star || 1)
}

// ===== 重建的缺失声明（坏文件中无可用片段）=====
const _restoreTab = typeof localStorage !== 'undefined' ? localStorage.getItem('dladmin_restore_tab') : ''
const levelUpCfg = ref(null)
const selAchKey = ref('')
const selTaskIdx = ref(0)
const initInvRows = ref([])
const achDefs = ref([])
const taskDefs = ref([])

function itemTypeValue(it) {
  if (!it) return ''
  if (it.type) return it.type
  if (it.bType) return 'breakthrough'
  if (it.isSpecial) return 'special'
  if (it.food) return 'food'
  if (it.isItem && it.buffs) return 'item' // 🧰 可装备道具（佩戴加成）优先于消耗品
  if (it.shiyong) return 'consumable'
  if (it.isItem) return 'item'
  if (it.status === 'material') return 'material'
  return 'material'
}

function selectItem(it) { selItem.value = { ...it, type: it.type || itemTypeValue(it) } }

// ========================
// ⚔️ 装备编辑（Tab）：可装备道具（ITEM_DEFS 中 isItem 且非消耗品）属性修改
// ========================
const selEquip = ref(null)      // 装备行编辑副本
const equipKeyword = ref('')    // 装备搜索关键词

const equipList = computed(() => {
  const list = []
  for (const [name, def] of Object.entries(itemState.value.defs)) {
    if (def && def.isItem && !def.shiyong && !/^测试/.test(name)) list.push({ name, ...def })
  }
  const kw = equipKeyword.value.trim()
  if (kw) return list.filter(i => i.name.includes(kw) || (i.miaoshu || '').includes(kw))
  return list
})

function selectEquip(it) {
  selEquip.value = {
    ...it,
    _oldName: it.name,
    buffsText: it.buffs && typeof it.buffs === 'object' ? JSON.stringify(it.buffs) : '',
    fxText: it.fx && typeof it.fx === 'object' ? JSON.stringify(it.fx) : '',
  }
}

// 📝 把装备编辑副本写回 itemState.defs（buffs JSON 校验失败返回 false 中止保存）
function flushEquipEdits() {
  const d = selEquip.value
  if (!d) return true
  const oldName = d._oldName || d.name
  if (oldName !== d.name) {
    if (itemState.value.defs[oldName]) { itemState.value.defs[d.name] = itemState.value.defs[oldName]; delete itemState.value.defs[oldName] }
    if (itemState.value.sellPrices[oldName] != null) { itemState.value.sellPrices[d.name] = itemState.value.sellPrices[oldName]; delete itemState.value.sellPrices[oldName] }
    const si = itemState.value.shop.findIndex(s => s.name === oldName)
    if (si > -1) itemState.value.shop[si].name = d.name
  }
  const def = itemState.value.defs[d.name] || (itemState.value.defs[d.name] = {})
  def.isItem = true
  def.img = d.img || undefined
  def.color = d.color || '#ffffff'
  if (d.buffsText && d.buffsText.trim()) {
    try { def.buffs = JSON.parse(d.buffsText) } catch (e) { ElMessage.warning('装备加成 buffs 不是合法 JSON，未保存'); return false }
  } else delete def.buffs
  if (d.fxText && d.fxText.trim()) {
    try { def.fx = JSON.parse(d.fxText) } catch (e) { ElMessage.warning('战斗效果 fx 不是合法 JSON，未保存'); return false }
  } else delete def.fx
  def.miaoshu = d.miaoshu || ''
  return true
}

async function saveEquipConfig() {
  if (!itemsLoaded.value) { ElMessage.warning('请先加载'); return }
  if (flushEquipEdits() === false) return
  const ops = [
    { kind: 'items', code: itemDefSrc() },
    { kind: 'sellPrices', code: sellPriceSrc() },
    { kind: 'lianzhi', code: lianzhiSrc() },
    { kind: 'craft', code: craftSrc() },
    { kind: 'shop', code: shopSrc() },
    { kind: 'lianzhiLevel', code: lianzhiLevelSrc() },
  ]
  try {
    const resp = await fetch('/__dladmin_write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ops }),
    })
    const data = await resp.json()
    const bad = (data.results || []).filter(r => !r.ok)
    if (bad.length) { ElMessage.error('部分写入失败：' + bad.map(b => b.msg).join('；')); return }
    localStorage.setItem('dladmin_restore_tab', 'equip') // 保存后 Vite reload，恢复本 tab
    window.dispatchEvent(new CustomEvent('dladmin:items-config-changed')) // 🔄 热刷新运行中的 store
    ElMessage.success('✅ 装备配置已写入，读档自动生效')
    setTimeout(() => location.reload(), 600)
  } catch (e) {
    console.error('[装备编辑] 保存失败', e)
    ElMessage.error('保存失败：' + (e?.message || e))
  }
}
function selectRecipe(r) { selRecipe.value = r }
function selectBlueprint(b) { selBlueprint.value = b }
function selectShopItem(s) { selShopItem.value = s }

function normLianzhiCfg(cfg) { return cfg || { maxLevel: 2, levels: [] } }

function jstr(s) {
  return JSON.stringify(String(s ?? ''))
}

function shopSrc() {
  return itemState.value.shop.map(s => {
    const f = ['name: ' + jstr(s.name || '')]
    if (s.price != null) f.push('price: ' + s.price)
    if (s.stock != null) f.push('stock: ' + s.stock)
    if (s.limit != null) f.push('limit: ' + s.limit)
    if (s.desc) f.push('desc: ' + jstr(s.desc))
    return '  {\n    ' + f.join(',\n    ') + ',\n  }'
  }).join(',\n')
}

async function loadAchievementsConfig() {
  if (achLoading.value) return
  achLoading.value = true
  try {
    const resp = await fetch('/src/store/configs.js?t=' + Date.now())
    const src = await resp.text()
    const m = src.match(/const ACHIEVEMENT_DEFS = \{[\s\S]*?\n\};/)
    if (!m) { ElMessage.error('未找到成就配置'); return }
    const body = m[0].replace(/^const ACHIEVEMENT_DEFS = /, '').replace(/;$/, '')
    const cfg = new Function('return (' + body + ')')()
    achDefs.value = Object.entries(cfg || {}).map(([key, def]) => ({ key, ...def }))
    achLoaded.value = true
  } catch (e) {
    console.error('[成就编辑] 加载失败', e)
    ElMessage.error('加载失败：' + (e?.message || e))
  } finally {
    achLoading.value = false
  }
}

async function loadTasksConfig() {
  if (taskLoading.value) return
  taskLoading.value = true
  try {
    const resp = await fetch('/src/store/configs.js?t=' + Date.now())
    const src = await resp.text()
    const m = src.match(/const TASK_DEFS = \[[\s\S]*?\n\];/)
    if (!m) { ElMessage.error('未找到任务配置'); return }
    const body = m[0].replace(/^const TASK_DEFS = /, '').replace(/;$/, '')
    const arr = new Function('return (' + body + ')')()
    taskDefs.value = Array.isArray(arr) ? arr : []
    taskLoaded.value = true
  } catch (e) {
    console.error('[任务编辑] 加载失败', e)
    ElMessage.error('加载失败：' + (e?.message || e))
  } finally {
    taskLoading.value = false
  }
}

// 顶层副作用（原顺序保留：watch / onMounted / resize 监听 / 初始加载 / 恢复 tab）
// ============================================================
watch(insertPos, (pos) => {
  const sid = selNodeId.value
  const nd = sid ? nodes.value[sid] : null
  if (!nd) return
  if (pos === 'after') {
    if (typeof nd.next === 'string') form.value.next = nd.next
  } else if (pos === 'before') {
    form.value.next = sid
  }
})

watch(() => form.value.blackScreen, (v) => {
  if (v && form.value.cgMode !== 'none') form.value.cgMode = 'none'
})

watch(onStageMode, (mode) => {
  if (mode === 'multi' && typeof form.value.onStage === 'string' && form.value.onStage) {
    form.value.onStage = [form.value.onStage]
  } else if (mode === 'single' && Array.isArray(form.value.onStage)) {
    form.value.onStage = form.value.onStage[0] || ''
  } else if (mode === 'narration' || mode === 'none') {
    form.value.onStage = ''
    // 📖 旁白：说话人保持当前值（可输入如"系统"），默认空白由 emptyForm 决定
  }
})

watch(() => form.value.onStage, (val) => {
  if (Array.isArray(val) && val.length) {
    val.forEach(pp => { if (form.value.npcSkins[pp] == null) form.value.npcSkins[pp] = 'moren' })
  }
}, { deep: true })

if (typeof window !== 'undefined') {
  const _updateMobile = () => {
    const w = (typeof window.screen !== 'undefined' && window.screen.width) ? window.screen.width : window.innerWidth
    isMobile.value = w < 1024
  }
  _updateMobile()
  window.addEventListener('resize', _updateMobile)
  _mqClean = () => window.removeEventListener('resize', _updateMobile)
}

onUnmounted(() => { if (_mqClean) _mqClean() })

onMounted(() => {
  if (canvasEl.value) {
    canvasCtx.value = canvasEl.value.getContext('2d')
    if (canvasRO) canvasRO.disconnect()
    canvasRO = new ResizeObserver(() => drawCanvas())
    canvasRO.observe(canvasEl.value)
  }
})

onBeforeUnmount(() => { if (canvasRO) canvasRO.disconnect(); canvasRO = null })

try { canvasLeftW.value = Math.min(960, Math.max(360, Number(localStorage.getItem('dladmin_canvas_w')) || 720)) } catch (e) { }

watch(leftMode, async (m) => {
  if (m === 'canvas') {
    computeCanvasLayout()
    await nextTick()
    // 🎯 列表选中节点后切到画布：镜头移动到该节点居中
    const focusId = canvasSel.value || selNodeId.value
    if (focusId && canvasNodes.value.some(x => x.id === focusId)) {
      focusCanvasNode(focusId)
    } else {
      drawCanvas()
    }
  } else {
    // 🎯 画布选中节点后切回列表：滚动到该节点并居中（所在分组收起时先展开）
    await nextTick()
    const focusId = canvasSel.value || selNodeId.value
    if (focusId && leftListRef.value) {
      const g = nodeGroups.value.find(gr => gr.ids.includes(focusId))
      if (g && collapsedGroups[g.entry]) collapsedGroups[g.entry] = false
      await nextTick()
      const el = leftListRef.value.querySelector('[data-nid="' + CSS.escape(String(focusId)) + '"]')
      if (el) el.scrollIntoView({ block: 'center' })
    }
  }
})

watch(curTab, (v) => { if (v === 'story') buildStoryText(); if (v === 'talent' && !talentLoaded.value) loadTalentConfig(); if (v === 'dungeon' && !dungeonLoaded.value) loadDungeonConfig(); if (v === 'items' && !itemsLoaded.value) loadItemsConfig(); if (v === 'levelUp' && !levelUpLoaded.value) loadLevelUpConfig(); if (v === 'levelUp' && !initInvLoaded.value) loadInitInv(); if (v === 'monsters' && !monstersLoaded.value) loadMonstersConfig(); if (v === 'guide') loadGuideConfig(); if (v === 'cardMastery' && !masteryLoaded.value) loadMasteryConfig(); if (v === 'roleInit' && !roleInitLoaded.value) loadRoleInitConfig() })

try {
  const saved = localStorage.getItem(PALETTE_KEY)
  if (saved) { const arr = JSON.parse(saved); if (Array.isArray(arr)) paletteColors.value = arr.filter(c => typeof c === 'string' && /^#([0-9a-fA-F]{3,8})$/.test(c)) }
} catch (e) { }

watch(
  () => form.value.text,
  (nv, ov) => {
    if (textWatchActive && ov !== undefined && ov !== nv) {
      textHistory.value.push(ov)
      if (textHistory.value.length > MAX_HISTORY) textHistory.value.shift()
    }
  }
)

window.addEventListener('resize', onTalentResize)

watch(talentEditList, () => { if (talentView.value === 'canvas') nextTick(() => drawTalentCanvas()) }, { deep: true })

watch(curTab, () => {
  if (curTab.value === 'talent' && talentView.value === 'canvas') nextTick(() => drawTalentCanvas())
})

watch(talentSelId, () => { if (talentView.value === 'canvas') nextTick(() => drawTalentCanvas()) })

window.addEventListener('keydown', onTalentCanvasKeydown)

watch(shopPickItem, (v) => {
  if (!v) return
  const it = itemList.value.find(x => x.name === v)
  if (it) addShopItemFromItem(it)
  shopPickItem.value = ''
})

// 📁 写入项目后重载：恢复保存前加载的对话文件（如 opening.js），而不是回默认商人文件
const _restoreFile = sessionStorage.getItem('dladmin_restore_file')
if (_restoreFile) {
  sessionStorage.removeItem('dladmin_restore_file')
  curFile.value = _restoreFile
}
loadFile()

loadTalentConfig()

loadLevelUpConfig()

loadAchievementsConfig()

loadTasksConfig()

if (_restoreTab) {
  localStorage.removeItem('dladmin_restore_tab')
  // 🧹 只保留本次恢复目标自己的状态：防止其他 tab 残留的 sessionStorage 在异步加载完成后抢跳（如天赋 state 把 tab 抢回天赋页）
  if (_restoreTab !== 'talent') sessionStorage.removeItem('dladmin_talent_state')
  if (_restoreTab !== 'items') sessionStorage.removeItem('dladmin_items_state')
  if (_restoreTab !== 'levelUp') sessionStorage.removeItem('dladmin_levelup_state')
  if (_restoreTab !== 'cards') sessionStorage.removeItem('dladmin_cards_state')
  curTab.value = _restoreTab
  if (_restoreTab === 'dungeon') {
    let _tries = 0
    const _autoLoad = () => {
      loadDungeonConfig()
      if (!dungeonLoaded.value && _tries < 3) { _tries++; setTimeout(_autoLoad, 1000) }
    }
    setTimeout(_autoLoad, 300)
  }
  if (_restoreTab === 'cards') {
    let _tries = 0
    const _autoLoad = () => {
      loadCardsConfig()
      if (!cardsLoaded.value && _tries < 3) { _tries++; setTimeout(_autoLoad, 1000) }
    }
    setTimeout(_autoLoad, 300)
  }
  if (_restoreTab === 'equip') {
    let _tries = 0
    const _autoLoad = () => {
      loadItemsConfig()
      if (!itemsLoaded.value && _tries < 3) { _tries++; setTimeout(_autoLoad, 1000) }
    }
    setTimeout(_autoLoad, 300)
  }
  if (_restoreTab === 'items') {
    let _tries = 0
    const _autoLoad = () => {
      loadItemsConfig()
      if (!itemsLoaded.value && _tries < 3) { _tries++; setTimeout(_autoLoad, 1000); return }
      // 🎯 恢复保存时的模式与选中项（写入后保留当前编辑位置，与天赋编辑一致）
      try {
        const _st = JSON.parse(sessionStorage.getItem('dladmin_items_state') || 'null')
        sessionStorage.removeItem('dladmin_items_state')
        if (_st?.mode) itemMode.value = _st.mode
        if (_st?.sel) restoreItemSelection(_st.mode, _st.sel)
      } catch (e) { }
    }
    setTimeout(_autoLoad, 300)
  }
  if (_restoreTab === 'tasks') {
    let _tries = 0
    const _autoLoad = () => {
      loadTasksConfig()
      if (!taskLoaded.value && _tries < 3) { _tries++; setTimeout(_autoLoad, 1000) }
    }
    setTimeout(_autoLoad, 300)
  }
}


</script>


<style scoped>
.dladmin {
  font-family: -apple-system, 'Segoe UI', 'Microsoft YaHei', sans-serif;
}

.dladmin :deep(.el-input__inner),
.dladmin :deep(.el-textarea__inner) {
  background: rgba(255, 255, 255, 0.05);
  color: #e5e7eb;
  border-color: rgba(255, 255, 255, 0.12);
  font-size: 12px;
}

/* 节点 ID 输入框：白底黑字加粗，覆盖全局 input 文字色 */
.dladmin :deep(.id-bright .el-input__inner) {
  background: #ffffff !important;
  color: #111111 !important;
  font-weight: 800;
  font-size: 13px;
  border-color: #c8cdd4 !important;
}

.dladmin :deep(.id-bright .el-input__placeholder) {
  color: #9ca3af;
}

/* 浅色输入框（白底黑字）：选项区等需要醒目的输入框 */
.dladmin :deep(.input-light .el-input__inner) {
  background: #ffffff !important;
  color: #111111 !important;
  border-color: #c8cdd4 !important;
}

.dladmin :deep(.input-light .el-select__selected-item) {
  color: #111111 !important;
}

.dladmin :deep(.input-light .el-select__placeholder) {
  color: #9ca3af !important;
}

.dladmin :deep(.input-light .el-input__placeholder) {
  color: #9ca3af;
}

.dladmin :deep(.el-textarea__inner) {
  font-family: 'Consolas', 'Microsoft YaHei', monospace;
}

.dladmin :deep(.el-select__wrapper) {
  background: rgba(255, 255, 255, 0.05);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.12) inset;
}

.dladmin :deep(.el-select__placeholder),
.dladmin :deep(.el-select__selected-item) {
  color: #e5e7eb;
}

.dladmin :deep(.el-button) {
  font-size: 12px;
}

.dladmin :deep(.el-button--warning) {
  background: linear-gradient(135deg, #f59e0b, #fbbf24);
  border: none;
  color: #1f2937;
  font-weight: 700;
}

.dladmin :deep(.el-button--warning:hover) {
  filter: brightness(1.08);
}

/* 滚动条美化 */
.dladmin ::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.dladmin ::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, .12);
  border-radius: 4px;
}

.dladmin ::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, .2);
}

.dladmin ::-webkit-scrollbar-track {
  background: transparent;
}

/* 小徽标按钮（复制/删除等） */
.dladmin .chip-btn {
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 5px;
  cursor: pointer;
  background: rgba(255, 255, 255, .08);
  color: #d1d5db;
  transition: all .15s;
  border: 1px solid rgba(255, 255, 255, .06);
}

.dladmin .chip-btn:hover {
  background: rgba(251, 191, 36, .25);
  color: #fbbf24;
}

.dladmin .chip-btn.danger:hover {
  background: rgba(248, 113, 113, .25);
  color: #fca5a5;
}

.dladmin .txt-preview-box {
  background: #0b0f14;
  border: 1px solid rgba(255, 255, 255, .1);
  border-radius: 10px;
  padding: 3vh 2.5vw;
  min-height: 20vh;
  max-height: 60vh;
  overflow: auto;
  display: flex;
  align-items: center;
}

.dladmin .txt-preview-text {
  color: #ffffff;
  font-size: 5vh;
  line-height: 1.6;
  word-break: break-word;
  white-space: pre-wrap;
  width: 100%;
}

/* 🗺️ 地牢编辑 */
.dladmin :deep(.dungeon-num) {
  width: 7.5rem;
}

.dladmin :deep(.dungeon-num-sm) {
  width: 5.2rem;
}

.dladmin :deep(.dungeon-item-input) {
  width: 8.5rem;
}

.dladmin :deep(.dungeon-img-input) {
  width: 6.5rem;
}

.dladmin :deep(.dungeon-num .el-input__inner),
.dladmin :deep(.dungeon-num-sm .el-input__inner),
.dladmin :deep(.dungeon-item-input .el-input__inner),
.dladmin :deep(.dungeon-img-input .el-input__inner) {
  background: #ffffff !important;
  color: #111111 !important;
  border-color: #c8cdd4 !important;
  font-size: 12px;
}

/* 🎒 物品编辑 */
.dladmin :deep(.item-num) {
  width: 8.5rem;
}

.dladmin :deep(.item-num .el-input__inner) {
  background: #ffffff !important;
  color: #111111 !important;
  border-color: #c8cdd4 !important;
  font-size: 12px;
}
</style>
