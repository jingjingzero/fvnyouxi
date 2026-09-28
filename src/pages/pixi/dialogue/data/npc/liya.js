/**
 * 里亚 对话数据 —— 失踪的商人（tiled dungeon2 dungeon_objects 里亚 NPC）
 * loadData: 'npc/liya'（tiled dialogLoadData 配置）
 * 任务：「寻找失踪的里亚」——与里亚对话标记 liyaFound + 完成「找到里亚」步骤，
 *       之后回商人莫奇处对话即完成任务（sr10 onEnter 判定）
 */
import emitter from "@/bus";
import { useCounterStore } from "@/store/counter";
const user = useCounterStore();

export default {
  // ===== 找到里亚：对话 + 标记已找到 =====
  ly01: { onStage: "shangren2", name: "里亚", text: "……是你？莫奇让你来找我的吗？", next: "ly02" },
  ly02: { name: "林恩", text: "你就是里亚吧？莫奇很担心你。", next: "ly03" },
  ly03: { onStage: "shangren2", name: "里亚", text: "唉……我在这深处的贸易出了点岔子，被困住了。你能带我回去找莫奇吗？", next: "ly04" },
  ly04: {
    name: "林恩",
    text: "当然，跟我走吧。",
    onEnter: () => {
      // 📍 标记已找到里亚 + 完成「找到里亚」任务步骤（幂等：重复对话不重复完成）
      user.setDialogueFlag('liyaFound', true);
      const _r = user.completeTaskStep?.('find_liya', 'find');
      console.log('[里亚调试] ly04 find步骤结果 →', _r, 'liyaFound=', user.getDialogueFlag('liyaFound'), 'sideTasks=', JSON.stringify((user.allTasks?.sideTasks || []).map(t => ({ id: t.id, c: t.isCompleted, s: (t.steps || []).map(x => x.id + ':' + !!x.isCompleted) }))));
    },
    next: "ly05",
  },
  ly05: { onStage: "shangren2", name: "里亚", text: "谢谢你……我们这就回去见莫奇。", next: "lyEnd" },
  // ===== 可重复结束节点（不标记完成，可重复对话） =====
  lyEnd: {
    end: 2,
    onEnter: () => {
      // 🚶 里亚随玩家回去见莫奇：标记已离开，地牢中隐藏该 NPC（仅一次，持久）
      user.setDialogueFlag('liyaGone', true);
      emitter.emit('dungeonLiyaGone');
    },
  },
};
