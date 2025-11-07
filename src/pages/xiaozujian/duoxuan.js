export const dialogueTree = {
  start: {
    lines: ["请选择你的行动："],
    options: [
      { text: "选项1（需完成）", next: "node1", checkable: true },
      { text: "选项2（需完成）", next: "node2", checkable: true },
      { text: "普通选项", next: "node3", checkable: false },
    ]
  },
  node1: {
    lines: ["你选择了选项1的额外对话。"],
    options: []
  },
  node2: {
    lines: ["你选择了选项2的额外对话。"],
    options: []
  },
  node3: {
    lines: ["这是普通选项的对话。"],
    options: []
  },
  leave: {
    lines: ["感谢你的参与，离开吧！"],
    options: []
  }
}
