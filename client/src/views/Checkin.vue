<template>
  <div class="checkin-page">
    <div class="page-header">
      <div class="container">
        <h1>🎯 练琴打卡</h1>
        <p>记录每一次进步，和搭子互相督促</p>
      </div>
    </div>
    
    <div class="container">
      <div class="checkin-grid">
        <div class="left-col">
          <div class="stats-card card mb-20">
            <div class="stats-grid">
              <div class="stat-item">
                <div class="icon-wrap streak"><el-icon><Trophy /></el-icon></div>
                <div>
                  <span class="num">{{ stats?.currentStreak || 0 }}</span>
                  <span class="label">连续天数</span>
                </div>
              </div>
              <div class="stat-item">
                <div class="icon-wrap count"><el-icon><Document /></el-icon></div>
                <div>
                  <span class="num">{{ stats?.totalCount || 0 }}</span>
                  <span class="label">总打卡</span>
                </div>
              </div>
              <div class="stat-item">
                <div class="icon-wrap hours"><el-icon><Timer /></el-icon></div>
                <div>
                  <span class="num">{{ stats?.totalHours || 0 }}</span>
                  <span class="label">总小时</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="card mb-20" v-if="stats?.instrumentStats && Object.keys(stats.instrumentStats).length">
            <h3><el-icon><PieChart /></el-icon> 按乐器统计</h3>
            <div class="inst-stats">
              <div class="inst-stat" v-for="(v, k) in stats.instrumentStats" :key="k">
                <div class="inst-stat-header">
                  <span class="inst-name">{{ k }}</span>
                  <span class="inst-hours">{{ Math.round(v.minutes/60*10)/10 }}小时 / {{ v.count }}次</span>
                </div>
                <el-progress :percentage="Math.min(100, v.minutes / maxMinutes * 100)" :stroke-width="8" />
              </div>
            </div>
          </div>

          <div class="card mb-20" v-if="activePlans.length">
            <h3><el-icon><Calendar /></el-icon> 进行中的练习计划</h3>
            <div class="active-plan-list">
              <div v-for="plan in activePlans" :key="plan.id" class="active-plan-item" :class="{ selected: form.planId === plan.id }" @click="selectPlan(plan)">
                <div class="active-plan-head">
                  <span class="active-plan-inst">{{ plan.instrument }}</span>
                  <span class="badge" :class="plan.daysRemaining <= 1 ? 'badge-danger' : plan.daysRemaining <= 3 ? 'badge-warning' : 'badge-primary'">
                    {{ plan.daysRemaining === 0 ? '今天截止' : plan.daysRemaining + ' 天' }}
                  </span>
                </div>
                <div v-if="plan.piece" class="active-plan-piece">《{{ plan.piece }}》</div>
                <div class="active-plan-progress">
                  <el-progress :percentage="plan.overallProgress" :stroke-width="6" />
                </div>
                <div class="active-plan-meta">
                  {{ plan.completedDays }}/{{ plan.targetDays }}天 · {{ plan.completedHours }}/{{ plan.targetHours }}h
                </div>
              </div>
            </div>
          </div>
          
          <div class="checkin-form card">
            <h3><el-icon><Edit /></el-icon> 今日打卡</h3>
            <el-form :model="form" label-width="80px" @submit.prevent>
              <el-form-item label="练习乐器" required>
                <el-select v-model="form.instrument" placeholder="选择乐器" style="width: 100%" @change="onInstrumentChange">
                  <el-option v-for="inst in instrumentOptions" :key="inst" :label="inst" :value="inst" />
                </el-select>
              </el-form-item>
              <el-form-item label="关联计划">
                <el-select v-model="form.planId" placeholder="可选择关联练习计划" clearable style="width: 100%">
                  <el-option
                    v-for="plan in matchingPlans"
                    :key="plan.id"
                    :label="`${plan.instrument}${plan.piece ? ' - ' + plan.piece : ''} (剩${plan.daysRemaining}天)`"
                    :value="plan.id"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="练习曲目">
                <el-select v-model="form.piece" filterable allow-create default-first-option placeholder="选择或输入曲目" style="width: 100%">
                  <el-option v-for="p in pieceOptions" :key="p" :label="p" :value="p" />
                </el-select>
              </el-form-item>
              <el-form-item label="练习时长" required>
                <el-input-number v-model="form.duration" :min="5" :max="600" :step="10" />
                <span style="margin-left: 12px; color: var(--text-secondary)">分钟</span>
              </el-form-item>
              <el-form-item label="练习笔记">
                <el-input v-model="form.notes" type="textarea" :rows="3" placeholder="今天练了什么？有什么心得？" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" size="large" :loading="submitting" @click="submit">
                  <el-icon><SuccessFilled /></el-icon>
                  打卡
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </div>
        
        <div class="right-col">
          <div class="card" style="min-height: 600px">
            <div class="feed-header">
              <h3><el-icon><Promotion /></el-icon> 打卡动态</h3>
              <el-radio-group v-model="feedFilter" size="small">
                <el-radio-button value="all">全部</el-radio-button>
                <el-radio-button value="mine">我的</el-radio-button>
              </el-radio-group>
            </div>
            <div v-if="filteredFeed.length" class="checkin-feed">
              <CheckinCard v-for="c in filteredFeed" :key="c.id" :checkin="c" />
            </div>
            <div v-else class="empty-state">
              <el-icon><Document /></el-icon>
              <p>暂无打卡记录，去完成今天的第一次打卡吧！</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useUserStore } from '../stores/user'
import { checkinApi, recommendApi, planApi } from '../api'
import CheckinCard from '../components/CheckinCard.vue'
import { ElMessage } from 'element-plus'
import { Trophy, Document, Timer, PieChart, Edit, SuccessFilled, Promotion, Calendar } from '@element-plus/icons-vue'

const userStore = useUserStore()

const stats = ref(null)
const feedFilter = ref('all')
const myCheckins = ref([])
const allCheckins = ref([])
const submitting = ref(false)
const myPlans = ref([])

const form = reactive({
  userId: userStore.userId,
  instrument: '',
  piece: '',
  duration: 60,
  notes: '',
  photo: '',
  planId: ''
})

const instrumentOptions = computed(() => {
  const base = userStore.currentUser?.instruments || ['古典吉他', '钢琴', '小提琴', '尤克里里']
  return [...new Set([...base, '古典吉他', '钢琴', '小提琴', '尤克里里', '架子鼓', '竹笛'])]
})

const pieceOptions = ref([])

const maxMinutes = computed(() => {
  if (!stats.value?.instrumentStats) return 1
  return Math.max(1, ...Object.values(stats.value.instrumentStats).map(v => v.minutes))
})

const filteredFeed = computed(() => {
  if (feedFilter.value === 'mine') return myCheckins.value
  return allCheckins.value
})

const activePlans = computed(() => {
  return myPlans.value.filter(p => p.currentStatus === 'in_progress')
})

const matchingPlans = computed(() => {
  if (!form.instrument) return activePlans.value
  return activePlans.value.filter(p => p.instrument === form.instrument)
})

onMounted(async () => {
  await loadData()
  try {
    const result = await recommendApi.pieces(userStore.userId)
    pieceOptions.value = result.recommendations.map(r => r.piece).slice(0, 20)
  } catch (e) {}
  form.instrument = userStore.currentUser?.instruments?.[0] || instrumentOptions.value[0]
})

const loadData = async () => {
  try {
    stats.value = await checkinApi.stats(userStore.userId)
  } catch (e) {}
  try {
    myCheckins.value = await checkinApi.list({ userId: userStore.userId })
  } catch (e) {}
  try {
    allCheckins.value = await checkinApi.list()
  } catch (e) {}
  try {
    myPlans.value = await planApi.list({ userId: userStore.userId })
  } catch (e) {}
}

const onInstrumentChange = (val) => {
  if (form.planId) {
    const plan = myPlans.value.find(p => p.id === form.planId)
    if (plan && plan.instrument !== val) {
      form.planId = ''
    }
  }
  if (!form.piece) {
    const match = matchingPlans.value[0]
    if (match && match.piece) {
      form.piece = match.piece
    }
  }
}

const selectPlan = (plan) => {
  form.planId = plan.id
  form.instrument = plan.instrument
  if (plan.piece) {
    form.piece = plan.piece
  }
}

const submit = async () => {
  if (!form.instrument || !form.duration) {
    ElMessage.warning('请填写乐器和时长')
    return
  }
  submitting.value = true
  try {
    const payload = { ...form }
    if (!payload.planId) delete payload.planId
    const result = await checkinApi.create(payload)
    if (result.success) {
      const plan = myPlans.value.find(p => p.id === form.planId)
      if (plan) {
        ElMessage.success(`打卡成功！「${plan.instrument}${plan.piece ? ' - ' + plan.piece : ''}」计划进度已更新 🎉`)
      } else {
        ElMessage.success('打卡成功！继续加油 🎉')
      }
      form.notes = ''
      form.piece = ''
      form.planId = ''
      form.duration = 60
      await loadData()
    }
  } catch (e) {
    ElMessage.error('打卡失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.checkin-grid {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 24px;
}

.stats-card .stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.stat-item {
  display: flex;
  gap: 12px;
  align-items: center;
}

.icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.icon-wrap.streak { background: linear-gradient(135deg, #f59e0b, #d97706); }
.icon-wrap.count { background: linear-gradient(135deg, #3b82f6, #2563eb); }
.icon-wrap.hours { background: linear-gradient(135deg, #10b981, #059669); }

.stat-item .num {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.stat-item .label {
  font-size: 12px;
  color: var(--text-secondary);
}

.card h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  margin-bottom: 16px;
}

.inst-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.inst-stat-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 13px;
}

.inst-name {
  font-weight: 500;
}

.inst-hours {
  color: var(--text-secondary);
}

.feed-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.checkin-feed {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.active-plan-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.active-plan-item {
  padding: 12px 14px;
  border-radius: 10px;
  border: 2px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.active-plan-item:hover {
  border-color: var(--primary-light);
  background: #eef2ff;
}

.active-plan-item.selected {
  border-color: var(--primary-color);
  background: #eef2ff;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);
}

.active-plan-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.active-plan-inst {
  font-weight: 600;
  color: var(--primary-color);
}

.active-plan-piece {
  font-size: 13px;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.active-plan-progress {
  margin-bottom: 4px;
}

.active-plan-meta {
  font-size: 12px;
  color: var(--text-secondary);
}

@media (max-width: 900px) {
  .checkin-grid {
    grid-template-columns: 1fr;
  }
}
</style>
