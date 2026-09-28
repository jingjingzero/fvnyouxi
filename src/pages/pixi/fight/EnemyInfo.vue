<template>
  <div class="space-y-4 h-[62vh] overflow-y-auto pr-2 enemy-info-scroll">
    <div v-for="(e, idx) in aliveEnemies" :key="e.uid || idx"
      class="rounded-xl border border-gray-700/70 bg-gradient-to-br from-gray-800 to-gray-900/90 p-4 shadow-lg shadow-black/30">
      <!-- ═══════ 头部：头像 + 名字 + 行动进度 ═══════ -->
      <div class="flex items-start justify-between mb-3">
        <div class="flex items-center gap-2.5">
          <!-- 🎭 敌人头像（head 图，juese → 头像映射；没有头像回退 emoji） -->
          <div class="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-gray-700/60"
            style="border: 1px solid rgba(239,68,68,0.4)">
            <img v-if="headUrl(e)" :src="headUrl(e)" :alt="e.name"
              class="h-full w-full object-cover" loading="lazy" @error="imgFailed(e, $event)">
            <div v-else class="flex h-full w-full items-center justify-center text-lg leading-none">👾</div>
          </div>
          <div>
            <div class="text-lg font-bold leading-tight text-white">{{ tr(e.name) }}</div>

          </div>
        </div>
        <div class="text-right">
          <div class="text-[11px] text-gray-500">{{ L('actionProgress') }}</div>
          <div class="text-lg font-bold text-cyan-400">{{ actionPct(e) }}%</div>
        </div>
      </div>

      <!-- ═══════ 血条 ═══════ -->
      <div class="mb-3.5">
        <div class="mb-1 flex items-center justify-between text-xs text-gray-300">
          <span class="font-medium text-red-300">❤️ HP</span>
          <span>{{ fmtNum(e.hp) }} / {{ fmtNum(e.maxHp) }}</span>
        </div>
        <div class="h-2.5 overflow-hidden rounded-full bg-gray-700/80">
          <div class="h-full rounded-full bg-gradient-to-r from-red-600 via-red-500 to-orange-400 transition-all duration-300"
            :style="{ width: hpPct(e) + '%' }"></div>
        </div>
      </div>

      <!-- ═══════ 属性面板（每种属性独立配色） ═══════ -->
      <div class="mb-4 grid grid-cols-2 gap-1.5 text-sm">
        <div v-for="attr in attrRows(e)" :key="attr.label"
          class="flex items-center justify-between rounded-md bg-gray-800/50 px-2.5 py-1.5"
          :style="{ borderLeft: `3px solid ${attr.color}` }">
          <span class="text-xs font-medium" :style="{ color: attr.color }">{{ attr.label }}</span>
          <span class="font-semibold" :style="{ color: attr.valueColor || '#ffffff' }">
            {{ attr.value }}
            <span v-if="attr.delta !== 0" :class="attr.delta > 0 ? 'text-emerald-400' : 'text-red-400'"
              class="text-[11px] font-normal">
              ({{ attr.delta > 0 ? '+' : '' }}{{ attr.delta }})
            </span>
          </span>
        </div>
      </div>

      <!-- ═══════ 状态标签（Buff / Debuff） ═══════ -->
      <div v-if="e.buffs?.length || e.debuffs?.length" class="mb-4 flex flex-wrap gap-1.5">
        <span v-for="b in e.buffs" :key="'b' + b.name"
          class="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300"
          style="border: 1px solid rgba(16,185,129,0.35)">
          {{ tr(b.name) }}
        </span>
        <span v-for="d in e.debuffs" :key="'d' + d.name"
          class="rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-medium text-red-300"
          style="border: 1px solid rgba(239,68,68,0.35)">
          {{ tr(d.name) }}
        </span>
      </div>

      <!-- ═══════ ⚔️ 普攻 ═══════ -->
      <div class="mb-3">
        <div class="mb-1.5 flex items-center gap-1 text-xs font-bold text-orange-400">
          <span>⚔️</span> {{ L('normalAttack') }}
        </div>
        <div class="rounded-lg bg-gray-800/60 p-2.5 text-sm leading-relaxed text-gray-200">
          {{ fmtAttack(e) }}
        </div>
      </div>

      <!-- ═══════ ✨ 技能 ═══════ -->
      <div class="mb-3">
        <div class="mb-1.5 flex items-center gap-1 text-xs font-bold text-sky-400">
          <span>✨</span> {{ L('skill') }}
          <span v-if="e.skills?.length" class="rounded-full bg-sky-500/15 px-1.5 text-[10px] font-normal text-sky-300"
            style="border: 1px solid rgba(14,165,233,0.35)">{{ e.skills.length }}</span>
        </div>
        <div v-if="e.skills?.length" class="space-y-1.5">
          <div v-for="(s, si) in e.skills" :key="si" class="rounded-lg bg-gray-800/60 p-2.5">
            <div class="flex items-center justify-between gap-2">
              <span class="truncate text-sm font-semibold text-white">{{ tr(s.name) }}</span>
              <span v-if="s.cooldown" class="shrink-0 text-[11px] text-gray-400">{{ F('cooldownTurnsFmt', { n: s.cooldown }) }}</span>
            </div>
            <div class="mt-1 text-xs leading-relaxed text-gray-300">{{ tr(s.desc) }}</div>
          </div>
        </div>
        <div v-else class="rounded-lg bg-gray-800/40 p-2.5 text-sm text-gray-500">{{ L('none') }}</div>
      </div>

      <!-- ═══════ ♻️ 被动 ═══════ -->
      <div>
        <div class="mb-1.5 flex items-center gap-1 text-xs font-bold text-emerald-400">
          <span>♻️</span> {{ L('passive') }}
          <span v-if="e.passives?.length"
            class="rounded-full bg-emerald-500/15 px-1.5 text-[10px] font-normal text-emerald-300"
            style="border: 1px solid rgba(16,185,129,0.35)">{{ e.passives.length }}</span>
        </div>
        <div v-if="e.passives?.length" class="space-y-1.5">
          <div v-for="(p, pi) in e.passives" :key="pi" class="rounded-lg bg-gray-800/60 p-2.5">
            <div class="text-sm font-semibold text-white">{{ tr(p.name) }}</div>
            <div class="mt-1 text-xs leading-relaxed text-gray-300">{{ tr(p.desc) }}</div>
          </div>
        </div>
        <div v-else class="rounded-lg bg-gray-800/40 p-2.5 text-sm text-gray-500">{{ L('none') }}</div>
      </div>
    </div>

    <!-- 无存活敌人 -->
    <div v-if="!aliveEnemies.length"
      class="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-700 py-12 text-gray-500">
      <div class="mb-2 text-3xl">😴</div>
      <div class="text-sm">{{ L('noAliveEnemies') }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { t, tr } from "@/i18n";

// 🌐 语言响应：语言切换后重渲染 + 词条读取
const langVersion = ref(0);
window.addEventListener('fvnyouxi-lang-changed', () => langVersion.value++);
function L(key) { langVersion.value; return t(key); }
function F(key, vars) { let s = L(key); if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]); return s; }

const props = defineProps({
  enemies: Array
})

// ✅ 提前过滤出活着的敌人
const aliveEnemies = computed(() => (props.enemies || []).filter(e => e.hp > 0))

// ============ 🎭 敌人头像（juese 骨骼名 → head 头像文件名） ============
// 与 store/counter.js 的 tujian.monster 映射一致；没有头像（head: null）的敌人回退 emoji
const HEAD_MAP = {
  monster1: 'anying',          // 暗影
  guaiwu2: 'mohuamao',         // 魔化猫
  guaiwu3: 'leiniao',          // 雷鸟
  anyingwang: 'anyingwang',    // 暗影王
  nvhuang: 'leiniaonvhuang',   // 雷鸟女皇
  fengxi: 'fengxi',            // 风息
  jutong: '',                  // 巨型眼瞳（无头像）
  // 队友/其他骨骼（战斗敌人一般用不到，兜底）
  huli: 'huli', jinmao: 'jinmao', tuzi: 'tuzi', yu: 'yu',
  jingling: 'jingling', jqr: 'jqr', two19: 'two19',
  linen: 'zhujue', NPC1: 'NPC1', NPC2: 'NPC2', NPC3: 'NPC3', NPC4: 'NPC4', NPC5: 'NPC5',
}
// 头像文件缓存（避免每次渲染重复 new URL）
const _headCache = {}
function headUrl(e) {
  const juese = e?.juese || e?.data?.juese
  const file = HEAD_MAP[juese]
  if (!file) return ''
  if (_headCache[file]) return _headCache[file]
  try {
    const url = new URL(`../../../assets/fullBody/head/${file}.webp`, import.meta.url).href
    _headCache[file] = url
    return url
  } catch (err) {
    return ''
  }
}
// 头像加载失败（文件缺失）→ 置空走 emoji 回退
function imgFailed(e, event) {
  const juese = e?.juese || e?.data?.juese
  if (HEAD_MAP[juese]) HEAD_MAP[juese] = ''  // 记住失败，避免反复请求
  const img = event?.target
  if (img) img.style.display = 'none'
}

// ============ 数值格式化 ============
const fmtNum = (v) => (v === null || v === undefined) ? '0' : Math.round(v * 100) / 100

const hpPct = (e) => e.maxHp > 0 ? Math.max(0, Math.min(100, (e.hp / e.maxHp) * 100)) : 0

const actionPct = (e) => Math.max(0, Math.min(100, Math.round((e.actionProgress || 0) / 100)))

// ============ 🎨 属性配色（每种属性独立颜色） ============
// 攻击红 / 护甲蓝 / 速度青 / 幸运金 / 行动条紫 / 易伤橙 / 毒易伤绿
const ATTR_STYLE = {
  attack:  { labelKey: 'attrAttack',   color: '#F87171' },
  armor:   { labelKey: 'attrArmor',    color: '#60A5FA' },
  speed:   { labelKey: 'attrSpeed',    color: '#22D3EE' },
  luck:    { labelKey: 'attrLuck',     color: '#FBBF24' },
  action:  { labelKey: 'attrActionBar', color: '#C084FC' },
  vuln:    { labelKey: 'attrVulnerable', color: '#FB923C' },
  poison:  { labelKey: 'attrPoisonVuln', color: '#4ADE80' },
}

// 属性行（含与基础值对比的增减 + 独立配色）
function attrRows(e) {
  const row = (key, value, base) => ({
    label: L(ATTR_STYLE[key]?.labelKey || key),
    color: ATTR_STYLE[key]?.color || '#9CA3AF',
    value: typeof value === 'number' ? fmtNum(value) : value,
    delta: (typeof value === 'number' && typeof base === 'number') ? Math.round((value - base) * 100) / 100 : 0,
  })
  const rows = [
    row('attack', e.attack, e.baseAttack),
    row('armor', e.armor, e.baseArmor),
    row('speed', e.speed, e.baseSpeed),
    row('luck', e.luck, e.baseLuck),
    row('action', `${actionPct(e)}%`, null),
  ]
  if (e.damageTaken) rows.push(row('vuln', `${Math.round(e.damageTaken * 100)}%`, null))
  if (e.poisonTaken) rows.push(row('poison', `${Math.round(e.poisonTaken * 100)}%`, null))
  return rows
}

// ============ 伤害类型映射 ============
const DMG_TYPE_NAME = {
  physical: 'dmgPhysical',
  lightning: 'dmgLightning',
  wind: 'dmgWind',
  fire: 'dmgFire',
  water: 'dmgWater',
  ice: 'dmgIce',
  poison: 'dmgPoison',
  true: 'dmgTrue',
}

// ============ 普攻描述 ============
function fmtAttack(e) {
  const hits = Math.max(1, e.attackHits ?? 1)
  const ratio = e.attackMultiplier ?? 0.1
  const ratioPct = Math.round(ratio * 100)
  const dmgType = L(DMG_TYPE_NAME[e.attackDmgType || 'physical'] || 'dmgPhysical')

  let desc
  if (hits > 1) {
    desc = F('enemyAtkMany', { hits, dmgType, pct: ratioPct })
  } else {
    desc = F('enemyAtkSingle', { pct: ratioPct, dmgType })
  }
  // 普攻附加效果（如巨型眼瞳削弱护甲）
  if (e.attackArmorReducePct) {
    desc += F('enemyAtkArmorShred', { pct: Math.round(e.attackArmorReducePct * 100) })
  }
  return desc
}
</script>

<style scoped>
.enemy-info-scroll::-webkit-scrollbar {
  width: 6px;
}
.enemy-info-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}
.enemy-info-scroll::-webkit-scrollbar-track {
  background: transparent;
}
</style>
