<template>
  <div class="space-y-4 h-[60vh] overflow-y-auto pr-2 pb-5vh">
    <!-- 主角 -->
    <div class="bg-gray-800 p-4 rounded-lg relative">
      <div class="font-bold text-lg mb-2">{{ player.name }}</div>
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div>HP：{{ player.hp }} / {{ player.maxHp }}</div>
        <div v-if="player.maxMp > 0">MP：{{ player.mp }} / {{ player.maxMp }}</div>

        <div>
          攻击：{{ player.baseAttack }}
          {{ formatSign(player.attack - player.baseAttack) }} {{ Math.abs(player.attack - player.baseAttack).toFixed(1) }}
          = {{ player.attack }}
        </div>
        <div>
          护甲：{{ player.baseArmor }}
          {{ formatSign(player.armor - player.baseArmor) }} {{ Math.abs(player.armor - player.baseArmor).toFixed(1) }}
          = {{ player.armor }}
        </div>
        <div>
          速度：{{ player.baseSpeed }}
          {{ formatSign(player.speed - player.baseSpeed) }} {{ Math.abs(player.speed - player.baseSpeed).toFixed(1) }}
          = {{ player.speed }}
        </div>
        <div>
          幸运：{{ player.baseLuck }}
          {{ formatSign(player.luck - player.baseLuck) }} {{ Math.abs(player.luck - player.baseLuck).toFixed(1) }}
          = {{ player.luck }}
        </div>
        <div>
          暴击伤害：{{ critDamagePercent }}%
        </div>
        <div v-if="player.physicalBoost">物理伤害加成：{{ Math.round(player.physicalBoost * 100) }}%</div>
        <div v-if="player.armorPenBoost">物理伤害无视护甲：{{ Math.round(player.armorPenBoost * 100) }}%</div>
        <div>行动进度：{{ Math.min(Math.round(player.actionProgress / 100), 100) }}%</div>
        <div>Buff：{{player.buffs.map(i => i.name).join('、') || '无'}}</div>
        <div>Debuff：{{player.debuffs.map(i => i.name).join('、') || '无'}}</div>
      </div>
    </div>

    <!-- 队友 -->
    <div v-for="(a, idx) in allies" :key="idx" class="bg-gray-800 p-4 rounded-lg">
      <div class="font-bold text-lg mb-2">{{ a.name }}</div>
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div>HP：{{ a.hp }} / {{ a.maxHp }}</div>

        <div v-if="a.baseAttack">
          攻击：{{ a.baseAttack }}
          {{ formatSign(a.attack - a.baseAttack) }} {{ Math.abs(a.attack - a.baseAttack) }}
          = {{ a.attack }}
        </div>
        <div v-if="a.baseArmor">
          护甲：{{ a.baseArmor }}
          {{ formatSign(a.armor - a.baseArmor) }} {{ Math.abs(a.armor - a.baseArmor) }}
          = {{ a.armor }}
        </div>

        <div>
          速度：{{ a.baseSpeed }}
          {{ formatSign(a.speed - a.baseSpeed) }} {{ Math.abs(a.speed - a.baseSpeed) }}
          = {{ a.speed }}
        </div>

        <div>行动进度：{{ Math.min(Math.round(a.actionProgress / 100), 100) }}%</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useCounterStore } from "@/store/counter";

const props = defineProps({
  player: Object,
  allies: Array
})

const user = useCounterStore()

// 计算暴击伤害百分比
const critDamagePercent = computed(() => {
  const baseCritMul = 1.5 // 基础暴击伤害 150%
  let talentBonus = 0
  
  // 检查天赋：致命一击 - 暴击伤害提升40%
  const talents = user.pixi.player.activatedTalents || []
  if (talents.includes('critical_strike')) {
    talentBonus += 0.4
  }
  
  return Math.round((baseCritMul + talentBonus) * 100)
})

// 自动显示 + 或 -
const formatSign = (value) => {
  return value >= 0 ? '+' : '-'
}
</script>