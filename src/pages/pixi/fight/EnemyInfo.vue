<template>
  <div class="space-y-4 h-[60vh] overflow-y-auto pr-2">
    <div v-for="(e, idx) in aliveEnemies" :key="idx" class="bg-gray-800 p-4 rounded-lg">
      <div class="font-bold text-lg mb-2">{{ e.name }}</div>
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div>HP：{{ e.hp }} / {{ e.maxHp }}</div>

        <div>
          攻击：{{ e.baseAttack }}
          {{ formatSign(e.attack - e.baseAttack) }} {{ Math.abs(e.attack - e.baseAttack) }}
          = {{ e.attack }}
        </div>
        <div>
          护甲：{{ e.baseArmor }}
          {{ formatSign(e.armor - e.baseArmor) }} {{ Math.abs(e.armor - e.baseArmor) }}
          = {{ e.armor }}
        </div>
        <div>
          速度：{{ e.baseSpeed }}
          {{ formatSign(e.speed - e.baseSpeed) }} {{ Math.abs(e.speed - e.baseSpeed) }}
          = {{ e.speed }}
        </div>
        <div>
          幸运：{{ e.baseLuck }}
          {{ formatSign(e.luck - e.baseLuck) }} {{ Math.abs(e.luck - e.baseLuck) }}
          = {{ e.luck }}
        </div>
         <div v-if="e.damageTaken">受到伤害提升：{{ Math.round(e.damageTaken * 100) }}%</div>
        <div v-if="e.poisonTaken">受到毒素伤害提升：{{ Math.round(e.poisonTaken * 100) }}%</div>
        <div>行动进度：{{ Math.min(Math.round(e.actionProgress / 100), 100) }}%</div>
        <div>Buff：{{e.buffs.map(i => i.name).join('、') || '无'}}</div>
        <div>Debuff：{{e.debuffs.map(i => i.name).join('、') || '无'}}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  enemies: Array
})

// ✅ 提前过滤出活着的敌人
const aliveEnemies = computed(() => {
  return props.enemies.filter(e => e.hp > 0)
})

const formatSign = (value) => {
  return value >= 0 ? '+' : '-'
}
</script>