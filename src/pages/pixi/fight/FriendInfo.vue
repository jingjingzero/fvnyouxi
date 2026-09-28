<template>
  <div class="space-y-4 h-[62vh] overflow-y-auto pr-2 pb-5vh friend-info-scroll">
    <!-- ═══════════════ 主角 ═══════════════ -->
    <div class="rounded-xl border border-gray-700/70 bg-gradient-to-br from-indigo-900/60 to-gray-900/90 p-4 shadow-lg shadow-black/30">
      <!-- 头部：头像 + 名字 + 行动进度 -->
      <div class="mb-3 flex items-start justify-between">
        <div class="flex items-center gap-2.5">
          <div class="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-gray-700/60"
            style="border: 1px solid rgba(99,102,241,0.5)">
            <img v-if="headUrl('zhujue')" :src="headUrl('zhujue')" :alt="L('playerLabel')"
              class="h-full w-full object-cover" loading="lazy" @error="imgFailed('zhujue', $event)">
            <div v-else class="flex h-full w-full items-center justify-center text-lg leading-none">🧙</div>
          </div>
          <div>
            <div class="text-lg font-bold leading-tight text-white">{{ tr(player.name || L('playerLabel')) }}</div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-[11px] text-gray-500">{{ L('actionProgress') }}</div>
          <div class="text-lg font-bold text-cyan-400">{{ actionPct(player) }}%</div>
        </div>
      </div>

      <!-- 血条 -->
      <div class="mb-3.5">
        <div class="mb-1 flex items-center justify-between text-xs text-gray-300">
          <span class="font-medium text-red-300">❤️ HP</span>
          <span>{{ fmtNum(player.hp) }} / {{ fmtNum(player.maxHp) }}</span>
        </div>
        <div class="h-2.5 overflow-hidden rounded-full bg-gray-700/80">
          <div class="h-full rounded-full bg-gradient-to-r from-red-600 via-red-500 to-orange-400 transition-all duration-300"
            :style="{ width: hpPct(player) + '%' }"></div>
        </div>
        <!-- MP 条 -->
        <div v-if="player.maxMp > 0" class="mt-1.5">
          <div class="mb-1 flex items-center justify-between text-xs text-gray-300">
            <span class="font-medium text-sky-300">💧 MP</span>
            <span>{{ fmtNum(player.mp) }} / {{ fmtNum(player.maxMp) }}</span>
          </div>
          <div class="h-2 overflow-hidden rounded-full bg-gray-700/80">
            <div class="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-400 transition-all duration-300"
              :style="{ width: mpPct(player) + '%' }"></div>
          </div>
        </div>
      </div>

      <!-- 属性面板（基础值 ± 变化 = 最终值） -->
      <div class="mb-4 grid grid-cols-2 gap-1.5 text-sm">
        <div v-for="attr in playerAttrs" :key="attr.label"
          class="flex items-center justify-between rounded-md bg-gray-800/50 px-2.5 py-1.5"
          :style="{ borderLeft: `3px solid ${attr.color}` }">
          <span class="text-xs font-medium" :style="{ color: attr.color }">{{ attr.label }}</span>
          <span class="font-semibold text-white whitespace-nowrap">
            <template v-if="attr.hasDelta">
              <span class="text-gray-400 font-normal">{{ attr.base }}</span>
              <span :class="attr.delta > 0 ? 'text-emerald-400' : 'text-red-400'">
                {{ attr.delta > 0 ? '+' : '' }}{{ attr.delta }}
              </span>
              <span class="text-gray-500">=</span>
            </template>
            {{ attr.value }}
          </span>
        </div>
      </div>

      <!-- 状态标签 -->
      <div v-if="player.buffs?.length || player.debuffs?.length" class="flex flex-wrap gap-1.5">
        <span v-for="b in player.buffs" :key="'b' + b.name"
          class="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300"
          style="border: 1px solid rgba(16,185,129,0.35)">
          {{ tr(b.name) }}
        </span>
        <span v-for="d in player.debuffs" :key="'d' + d.name"
          class="rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-medium text-red-300"
          style="border: 1px solid rgba(239,68,68,0.35)">
          {{ tr(d.name) }}
        </span>
      </div>
    </div>

    <!-- ═══════════════ 队友 ═══════════════ -->
    <div v-for="(a, idx) in allies" :key="idx"
      class="rounded-xl border border-gray-700/70 bg-gradient-to-br from-emerald-900/50 to-gray-900/90 p-4 shadow-lg shadow-black/30">
      <!-- 头部：头像 + 名字 + 行动进度 -->
      <div class="mb-3 flex items-start justify-between">
        <div class="flex items-center gap-2.5">
          <div class="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-gray-700/60"
            style="border: 1px solid rgba(16,185,129,0.5)">
            <img v-if="headUrl(a.img || a.juese)" :src="headUrl(a.img || a.juese)" :alt="a.name"
              class="h-full w-full object-cover" loading="lazy" @error="imgFailed(a.img || a.juese, $event)">
            <div v-else class="flex h-full w-full items-center justify-center text-lg leading-none">🫂</div>
          </div>
          <div>
            <div class="text-lg font-bold leading-tight text-white">{{ tr(a.name) }}</div>

          </div>
        </div>
        <div class="text-right">
          <div class="text-[11px] text-gray-500">{{ L('actionProgress') }}</div>
          <div class="text-lg font-bold text-cyan-400">{{ actionPct(a) }}%</div>
        </div>
      </div>

      <!-- 血条 -->
      <div class="mb-3.5">
        <div class="mb-1 flex items-center justify-between text-xs text-gray-300">
          <span class="font-medium text-red-300">❤️ HP</span>
          <span>{{ fmtNum(a.hp) }} / {{ fmtNum(a.maxHp) }}</span>
        </div>
        <div class="h-2.5 overflow-hidden rounded-full bg-gray-700/80">
          <div class="h-full rounded-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 transition-all duration-300"
            :style="{ width: hpPct(a) + '%' }"></div>
        </div>
      </div>

      <!-- 属性面板（基础值 ± 变化 = 最终值） -->
      <div class="mb-4 grid grid-cols-2 gap-1.5 text-sm">
        <div v-for="attr in allyAttrs(a)" :key="attr.label"
          class="flex items-center justify-between rounded-md bg-gray-800/50 px-2.5 py-1.5"
          :style="{ borderLeft: `3px solid ${attr.color}` }">
          <span class="text-xs font-medium" :style="{ color: attr.color }">{{ attr.label }}</span>
          <span class="font-semibold text-white whitespace-nowrap">
            <template v-if="attr.hasDelta">
              <span class="text-gray-400 font-normal">{{ attr.base }}</span>
              <span :class="attr.delta > 0 ? 'text-emerald-400' : 'text-red-400'">
                {{ attr.delta > 0 ? '+' : '' }}{{ attr.delta }}
              </span>
              <span class="text-gray-500">=</span>
            </template>
            {{ attr.value }}
          </span>
        </div>
      </div>

      <!-- ⚔️ 普攻 -->
      <div class="mb-3">
        <div class="mb-1.5 flex items-center gap-1 text-xs font-bold text-orange-400">
          <span>⚔️</span> {{ L('normalAttack') }}
        </div>
        <div class="rounded-lg bg-gray-800/60 p-2.5 text-sm leading-relaxed text-gray-200">
          {{ fmtAllyAttack(a) }}
        </div>
      </div>

      <!-- ✨ 技能 -->
      <div class="mb-3">
        <div class="mb-1.5 flex items-center gap-1 text-xs font-bold text-sky-400">
          <span>✨</span> {{ L('skill') }}
        </div>
        <div v-if="a.skillName" class="rounded-lg bg-gray-800/60 p-2.5">
          <div class="flex items-center justify-between gap-2">
            <span class="truncate text-sm font-semibold text-white">{{ tr(a.skillName) }}</span>
            <span v-if="a.skillCooldown" class="shrink-0 text-[11px] text-gray-400">{{ F('cooldownTurnsFmt', { n: a.skillCooldown }) }}</span>
          </div>
          <div class="mt-1 text-xs leading-relaxed text-gray-300">{{ fmtAllySkill(a) }}</div>
        </div>
        <div v-else class="rounded-lg bg-gray-800/40 p-2.5 text-sm text-gray-500">{{ L('none') }}</div>
      </div>

      <!-- ♻️ 被动 -->
      <div>
        <div class="mb-1.5 flex items-center gap-1 text-xs font-bold text-emerald-400">
          <span>♻️</span> {{ L('passive') }}
        </div>
        <div v-if="a.passiveType" class="rounded-lg bg-gray-800/60 p-2.5">
          <div class="text-sm font-semibold text-white">{{ tr(a.passiveName || L('passive')) }}</div>
          <div class="mt-1 text-xs leading-relaxed text-gray-300">{{ fmtAllyPassive(a) }}</div>
        </div>
        <div v-else class="rounded-lg bg-gray-800/40 p-2.5 text-sm text-gray-500">{{ L('none') }}</div>
      </div>
    </div>

    <!-- 无队友 -->
    <div v-if="!allies.length"
      class="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-700 py-12 text-gray-500">
      <div class="mb-2 text-3xl">🫂</div>
      <div class="text-sm">{{ L('noAllies') }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { t } from "@/i18n";
import { useCounterStore, buildAllySkillDesc as fmtAllySkill, buildAllyPassiveDesc as fmtAllyPassive } from "@/store/counter";
import { tr } from "@/i18n";

// 🌐 语言响应：语言切换后重渲染 + 词条读取
const langVersion = ref(0);
window.addEventListener('fvnyouxi-lang-changed', () => langVersion.value++);
function L(key) { langVersion.value; return t(key); }
function F(key, vars) { let s = L(key); if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]); return s; }

const props = defineProps({
  player: Object,
  allies: Array
})

const user = useCounterStore()

// ============ 🎭 头像（head 图缓存） ============
const _headCache = {}
// 头像文件名黑名单（加载失败后记住，避免反复请求）
const _headFailed = new Set()
function headUrl(key) {
  if (!key) return ''
  if (_headFailed.has(key)) return ''
  if (_headCache[key]) return _headCache[key]
  try {
    const url = new URL(`../../../assets/fullBody/head/${key}.webp`, import.meta.url).href
    _headCache[key] = url
    return url
  } catch (err) {
    return ''
  }
}
function imgFailed(key, event) {
  if (key) _headFailed.add(key)
  const img = event?.target
  if (img) img.style.display = 'none'
}

// ============ 数值格式化 ============
const fmtNum = (v) => (v === null || v === undefined) ? '0' : Math.round(v * 100) / 100
const pctNum = (v) => Math.round((v ?? 0) * 100)

const hpPct = (u) => u?.maxHp > 0 ? Math.max(0, Math.min(100, (u.hp / u.maxHp) * 100)) : 0
const mpPct = (u) => u?.maxMp > 0 ? Math.max(0, Math.min(100, (u.mp / u.maxMp) * 100)) : 0
const actionPct = (u) => Math.max(0, Math.min(100, Math.round((u?.actionProgress || 0) / 100)))

// ============ 🎨 属性配色 ============
const ATTR_STYLE = {
  attack:  { labelKey: 'attrAttack',    color: '#F87171' },
  armor:   { labelKey: 'attrArmor',     color: '#60A5FA' },
  speed:   { labelKey: 'attrSpeed',     color: '#22D3EE' },
  luck:    { labelKey: 'attrLuck',      color: '#FBBF24' },
  action:  { labelKey: 'attrActionBar', color: '#C084FC' },
  crit:    { labelKey: 'attrCritDmg',   color: '#F472B6' },
  bonus:   { labelKey: 'attrDmgBonus',  color: '#FB923C' },
  vuln:    { labelKey: 'attrVulnerable', color: '#F87171' },
  exeBonus:{ labelKey: 'attrFinalDmgBonus', color: '#EF4444' },
  exeReduce:{ labelKey: 'attrFinalDmgReduction', color: '#34D399' },
  physBoost:{ labelKey: 'attrPhysBoost', color: '#FF6B6B' },
  armorPen:{ labelKey: 'attrArmorPen',  color: '#FDBA74' },
}

// 主角属性行（基础值 ± 变化 = 最终值）
const playerAttrs = computed(() => {
  const p = props.player || {}
  const rows = []
  // base=基础值, value=最终值, delta=变化量（有变化时显示 基础±变化=最终）
  const add = (key, { base = null, value, delta = 0, show = true }) => {
    if (!show) return
    rows.push({
      label: L(ATTR_STYLE[key]?.labelKey || key),
      color: ATTR_STYLE[key]?.color || '#9CA3AF',
      base: base !== null ? fmtNum(base) : null,
      value,
      delta: Math.round((delta ?? 0) * 100) / 100,
      hasDelta: base !== null && delta !== 0,
    })
  }
  // 攻击/护甲/速度/幸运：基础值 + 增减 = 最终值
  add('attack', { base: p.baseAttack, value: fmtNum(p.attack), delta: (p.attack || 0) - (p.baseAttack || 0) })
  add('armor', { base: p.baseArmor, value: fmtNum(p.armor), delta: (p.armor || 0) - (p.baseArmor || 0) })
  add('speed', { base: p.baseSpeed, value: fmtNum(p.speed), delta: (p.speed || 0) - (p.baseSpeed || 0) })
  add('luck', { base: p.baseLuck, value: fmtNum(p.luck), delta: (p.luck || 0) - (p.baseLuck || 0) })
  add('action', { value: `${actionPct(p)}%` })
  // 增伤/易伤等百分比属性：显示最终值（有变化时也标出）
  add('bonus', { value: `${pctNum(p.allDamageBonus)}%`, delta: p.allDamageBonus ?? 0, show: !!p.allDamageBonus })
  add('vuln', { value: `${pctNum(p.damageTaken)}%`, delta: p.damageTaken ?? 0, show: !!p.damageTaken })
  add('exeBonus', { value: `${pctNum(p.executeDamageBonus - 1)}%`, delta: p.executeDamageBonus - 1, show: Math.round((p.executeDamageBonus - 1) * 100) !== 0 })
  add('exeReduce', { value: `${pctNum(1 - p.takenDamageReduce)}%`, delta: -(p.takenDamageReduce - 1), show: Math.round((1 - p.takenDamageReduce) * 100) !== 0 })
  add('physBoost', { value: `${pctNum(p.physicalBoost)}%`, delta: p.physicalBoost ?? 0, show: !!p.physicalBoost })
  add('armorPen', { value: `${pctNum(p.armorPenBoost)}%`, delta: p.armorPenBoost ?? 0, show: !!p.armorPenBoost })
  return rows
})

// 队友属性行（基础值 ± 变化 = 最终值，与主角面板一致）
function allyAttrs(a) {
  const row = (key, base, value) => {
    const delta = (typeof value === 'number' && typeof base === 'number')
      ? Math.round((value - base) * 100) / 100 : 0
    return {
      label: L(ATTR_STYLE[key]?.labelKey || key),
      color: ATTR_STYLE[key]?.color || '#9CA3AF',
      base: base !== null && base !== undefined ? fmtNum(base) : null,
      value: typeof value === 'number' ? fmtNum(value) : value,
      delta,
      hasDelta: base !== null && base !== undefined && delta !== 0,
    }
  }
  return [
    row('attack', a.baseAttack, a.attack),
    row('armor', a.baseArmor, a.armor),
    row('speed', a.baseSpeed, a.speed),
    row('action', null, `${actionPct(a)}%`),
  ]
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
const dmgName = (t) => L(DMG_TYPE_NAME[t || 'physical'] || 'dmgPhysical')

// ============ 队友普攻描述 ============
function fmtAllyAttack(a) {
  const ratio = a.attackRatio ?? 0.6
  if (a.attackType === 'heal') {
    return F('allyHealDesc', { pct: pctNum(ratio) })
  }
  return F('allyAtkDesc', { pct: pctNum(ratio), dmgType: dmgName(a.attackDmgType) })
}

</script>

<style scoped>
.friend-info-scroll::-webkit-scrollbar {
  width: 6px;
}
.friend-info-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}
.friend-info-scroll::-webkit-scrollbar-track {
  background: transparent;
}
</style>
