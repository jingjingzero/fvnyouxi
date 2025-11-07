<!--
 * @作者: 冯星悦
 * @Date: 2025-06-04 14:41:33
 * @LastEditTime: 2025-07-25 17:20:00
-->
<template>
  <el-button type="primary" @click="open = true">Begin Tour</el-button>

  <el-divider />

  <el-space>
    <el-button ref="ref1">Upload</el-button>
    <el-button ref="ref2" type="primary">Save</el-button>
    <el-button ref="ref3" :icon="MoreFilled" />
  </el-space>

  <el-tour v-model="open">
    <el-tour-step :target="ref1?.$el" title="Upload File">
      <div>Put you files here.</div>
    </el-tour-step>
    <el-tour-step
      :target="ref2?.$el"
      title="Save"
      description="Save your changes"
    />
    <el-tour-step
      :target="ref3?.$el"
      title="Other Actions"
      description="Click to see other"
    />
  </el-tour>
</template>

<script setup>
import { ref } from 'vue'
import { MoreFilled } from '@element-plus/icons-vue'

const ref1 = ref()
const ref2 = ref()
const ref3 = ref()

const open = ref(false)
</script>
