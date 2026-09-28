<template>
  <!-- ⚡ 性能模式（节能=关氛围特效/粒子/流动层 + Spine 隔帧 + 昼夜静态化；启动页与游戏内设置共用） -->
  <div>
    <div class="text-2.4vh font-bold text-white/90 mb-1.2vh mt-2vh">{{ L('perfMode') }}</div>
    <div class="flex gap-x-2vw">
      <el-button :type="user.perfMode !== 'low' ? 'primary' : 'default'" size="large" class="flex-1!"
        @click="switchPerfMode('high')">{{ L('perfHigh') }}</el-button>
      <el-button :type="user.perfMode === 'low' ? 'primary' : 'default'" size="large" class="flex-1!"
        @click="switchPerfMode('low')">{{ L('perfLow') }}</el-button>
    </div>
  </div>
</template>

<script setup>
import { useCounterStore } from "@/store/counter";
import { setBattleLog } from "@/pages/pixi/fight/logger.js";
import { t as i18nT } from "@/i18n";

const user = useCounterStore();
function L(key) { return i18nT(key); }

// ⚡ 性能模式切换：联动战斗日志（节能=自动关日志，省 console 开销；高性能=全量日志方便调试）
function switchPerfMode(mode) {
  user.perfMode = mode;
  setBattleLog(mode !== 'low');
}
</script>
