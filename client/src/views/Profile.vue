<template>
  <div class="profile-page">
    <div class="page-header">
      <div class="container">
        <h1>👤 个人中心</h1>
        <p>管理你的个人信息和偏好设置</p>
      </div>
    </div>
    
    <div class="container">
      <div v-if="planSummary && planSummary.urgentPlans && planSummary.urgentPlans.length" class="urgent-banner">
        <div class="urgent-title">
          <el-icon class="urgent-icon"><WarningFilled /></el-icon>
          <span>你有 {{ planSummary.urgentPlans.length }} 个练习计划即将到期，快加油完成！</span>
        </div>
        <div class="urgent-list">
          <div v-for="plan in planSummary.urgentPlans" :key="plan.id" class="urgent-item" @click="activeTab = 'plans'">
            <div class="urgent-plan-head">
              <span class="urgent-inst">{{ plan.instrument }}</span>
              <span v-if="plan.daysRemaining === 0" class="badge badge-danger">今天截止</span>
              <span v-else-if="plan.daysRemaining === 1" class="badge badge-warning">还剩 1 天</span>
              <span v-else class="badge badge-warning">还剩 {{ plan.daysRemaining }} 天</span>
            </div>
            <div class="urgent-plan-progress">
              <el-progress :percentage="plan.overallProgress" :stroke-width="6" :color="urgentProgressColor(plan.overallProgress)" />
            </div>
            <div class="urgent-plan-desc">
              {{ plan.piece || '未指定曲目' }} · {{ plan.completedDays }}/{{ plan.targetDays }}天 · {{ plan.completedHours }}/{{ plan.targetHours }}h
            </div>
          </div>
        </div>
      </div>

      <el-tabs v-model="activeTab" type="card">
        <el-tab-pane label="基本信息" name="basic">
          <div class="form-wrap card">
            <div class="profile-top mb-20">
              <div class="avatar-edit">
                <img :src="form.avatar" class="avatar-xl" />
                <el-button size="small" type="primary" @click="randomAvatar">换一个</el-button>
              </div>
              <div class="quick-stats">
                <div class="stat">
                  <span class="num">{{ stats?.totalCount || 0 }}</span>
                  <span class="label">打卡次数</span>
                </div>
                <div class="stat">
                  <span class="num">{{ stats?.totalHours || 0 }}</span>
                  <span class="label">练琴小时</span>
                </div>
                <div class="stat">
                  <span class="num">{{ myInstruments.length }}</span>
                  <span class="label">发布乐器</span>
                </div>
                <div class="stat">
                  <span class="num highlight">{{ form.rating }}</span>
                  <span class="label">信用评分</span>
                </div>
              </div>
            </div>
            
            <el-form :model="form" label-width="100px">
              <el-form-item label="昵称">
                <el-input v-model="form.username" style="max-width: 300px" />
              </el-form-item>
              <el-form-item label="手机号">
                <el-input v-model="form.phone" style="max-width: 250px" />
              </el-form-item>
              <el-form-item label="所在城市">
                <el-input v-model="form.city" placeholder="如：北京市" style="max-width: 200px" />
                <el-input v-model="form.district" placeholder="如：海淀区" style="max-width: 200px; margin-left: 10px" />
              </el-form-item>
              <el-form-item label="水平等级">
                <el-radio-group v-model="form.skillLevel">
                  <el-radio value="初级">初级</el-radio>
                  <el-radio value="中级">中级</el-radio>
                  <el-radio value="高级">高级</el-radio>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="个人简介">
                <el-input v-model="form.bio" type="textarea" :rows="3" style="max-width: 500px" placeholder="介绍一下自己吧..." />
              </el-form-item>
              <el-form-item label="擅长乐器">
                <el-select
                  v-model="form.instruments"
                  multiple
                  filterable
                  allow-create
                  default-first-option
                  placeholder="选择或输入乐器"
                  style="max-width: 500px"
                >
                  <el-option v-for="inst in allInstruments" :key="inst" :label="inst" :value="inst" />
                </el-select>
              </el-form-item>
              <el-form-item label="喜欢的曲目">
                <el-select
                  v-model="form.favoritePieces"
                  multiple
                  filterable
                  allow-create
                  default-first-option
                  placeholder="选择或输入曲目"
                  style="max-width: 500px"
                >
                  <el-option v-for="p in commonPieces" :key="p" :label="p" :value="p" />
                </el-select>
              </el-form-item>
              <el-form-item label="空闲时间">
                <el-checkbox-group v-model="form.freeTimes">
                  <el-checkbox label="工作日白天" />
                  <el-checkbox label="工作日晚上" />
                  <el-checkbox label="周六上午" />
                  <el-checkbox label="周六下午" />
                  <el-checkbox label="周六晚上" />
                  <el-checkbox label="周日上午" />
                  <el-checkbox label="周日下午" />
                  <el-checkbox label="周日晚上" />
                  <el-checkbox label="每天早晨" />
                </el-checkbox-group>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" size="large" :loading="saving" @click="saveProfile">
                  <el-icon><Check /></el-icon>
                  保存修改
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="本周练习计划" name="plans">
          <div class="plans-layout">
            <div class="plans-left">
              <div class="card mb-20">
                <div class="plan-stats-grid">
                  <div class="plan-stat-item total">
                    <span class="num">{{ planSummary?.total || 0 }}</span>
                    <span class="label">总计划数</span>
                  </div>
                  <div class="plan-stat-item progress">
                    <span class="num">{{ planSummary?.inProgress || 0 }}</span>
                    <span class="label">进行中</span>
                  </div>
                  <div class="plan-stat-item done">
                    <span class="num">{{ planSummary?.completed || 0 }}</span>
                    <span class="label">已完成</span>
                  </div>
                  <div class="plan-stat-item expire">
                    <span class="num">{{ planSummary?.expired || 0 }}</span>
                    <span class="label">已过期</span>
                  </div>
                </div>
              </div>

              <div class="card">
                <h3 class="section-title-sm">
                  <el-icon><Plus /></el-icon>
                  创建新练习计划
                </h3>
                <el-form :model="planForm" label-width="90px" @submit.prevent>
                  <el-form-item label="练习乐器" required>
                    <el-select v-model="planForm.instrument" placeholder="选择乐器" style="width: 100%">
                      <el-option v-for="inst in planInstrumentOptions" :key="inst" :label="inst" :value="inst" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="练习曲目">
                    <el-select v-model="planForm.piece" filterable allow-create default-first-option placeholder="选择或输入曲目名称" style="width: 100%">
                      <el-option v-for="p in commonPieces" :key="p" :label="p" :value="p" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="目标时长" required>
                    <el-input-number v-model="planForm.targetHours" :min="1" :max="100" :step="1" />
                    <span class="form-unit">小时</span>
                  </el-form-item>
                  <el-form-item label="练习天数" required>
                    <el-input-number v-model="planForm.targetDays" :min="1" :max="30" :step="1" />
                    <span class="form-unit">天</span>
                  </el-form-item>
                  <el-form-item label="截止日期" required>
                    <el-date-picker
                      v-model="planForm.deadline"
                      type="date"
                      placeholder="选择截止日期"
                      :disabled-date="disabledPastDate"
                      value-format="YYYY-MM-DD"
                      style="width: 220px"
                    />
                  </el-form-item>
                  <el-form-item label="备注">
                    <el-input v-model="planForm.note" type="textarea" :rows="2" placeholder="例如：每天练习轮指30分钟..." />
                  </el-form-item>
                  <el-form-item>
                    <el-button type="primary" :loading="creatingPlan" @click="createPlan">
                      <el-icon><Calendar /></el-icon>
                      创建计划
                    </el-button>
                    <el-button @click="resetPlanForm">重置</el-button>
                  </el-form-item>
                </el-form>
              </div>
            </div>

            <div class="plans-right">
              <div class="card plan-list-card">
                <div class="plan-list-header">
                  <h3 class="section-title-sm">
                    <el-icon><List /></el-icon>
                    我的练习计划
                  </h3>
                  <el-radio-group v-model="planFilter" size="small">
                    <el-radio-button value="all">全部</el-radio-button>
                    <el-radio-button value="in_progress">进行中</el-radio-button>
                    <el-radio-button value="completed">已完成</el-radio-button>
                    <el-radio-button value="expired">已过期</el-radio-button>
                  </el-radio-group>
                </div>
                <div v-if="filteredPlans.length" class="plan-list">
                  <div v-for="plan in filteredPlans" :key="plan.id" class="plan-card" :class="['status-' + plan.currentStatus]">
                    <div class="plan-card-header">
                      <div class="plan-card-title">
                        <span class="plan-instrument">{{ plan.instrument }}</span>
                        <span v-if="plan.piece" class="plan-piece">《{{ plan.piece }}》</span>
                      </div>
                      <div class="plan-status-wrap">
                        <span v-if="plan.currentStatus === 'completed'" class="badge badge-success">
                          <el-icon><CircleCheckFilled /></el-icon> 已完成
                        </span>
                        <span v-else-if="plan.currentStatus === 'expired'" class="badge badge-danger">已过期</span>
                        <span v-else-if="plan.daysRemaining <= 1" class="badge badge-danger">
                          {{ plan.daysRemaining === 0 ? '今天截止' : '剩 1 天' }}
                        </span>
                        <span v-else-if="plan.daysRemaining <= 3" class="badge badge-warning">
                          剩 {{ plan.daysRemaining }} 天
                        </span>
                        <span v-else class="badge badge-primary">
                          剩 {{ plan.daysRemaining }} 天
                        </span>
                        <el-dropdown trigger="click" @command="(cmd) => handlePlanCommand(cmd, plan)">
                          <el-button size="small" text class="plan-more-btn">
                            <el-icon><MoreFilled /></el-icon>
                          </el-button>
                          <template #dropdown>
                            <el-dropdown-menu>
                              <el-dropdown-item command="delete">删除计划</el-dropdown-item>
                            </el-dropdown-menu>
                          </template>
                        </el-dropdown>
                      </div>
                    </div>

                    <div class="plan-progress-section">
                      <div class="plan-progress-row">
                        <div class="plan-progress-label">
                          <el-icon><Calendar /></el-icon>
                          <span>天数进度 {{ plan.completedDays }}/{{ plan.targetDays }} 天</span>
                        </div>
                        <el-progress :percentage="plan.progressDays" :stroke-width="8" :color="progressColor(plan.progressDays, plan.currentStatus)" />
                      </div>
                      <div class="plan-progress-row">
                        <div class="plan-progress-label">
                          <el-icon><Timer /></el-icon>
                          <span>时长进度 {{ plan.completedHours }}/{{ plan.targetHours }} 小时</span>
                        </div>
                        <el-progress :percentage="plan.progressHours" :stroke-width="8" :color="progressColor(plan.progressHours, plan.currentStatus)" />
                      </div>
                      <div class="plan-overall">
                        <span>综合进度</span>
                        <el-progress type="dashboard" :percentage="plan.overallProgress" :width="80" :stroke-width="10" :color="progressColor(plan.overallProgress, plan.currentStatus)">
                          <template #default="{ percentage }">
                            <span class="overall-percent">{{ percentage }}%</span>
                          </template>
                        </el-progress>
                      </div>
                    </div>

                    <div class="plan-meta">
                      <div class="plan-meta-item">
                        <el-icon><DatePicker /></el-icon>
                        <span>截止：{{ plan.deadline }}</span>
                      </div>
                      <div class="plan-meta-item">
                        <el-icon><Document /></el-icon>
                        <span>关联打卡 {{ plan.relatedCheckins }} 次</span>
                      </div>
                      <router-link v-if="plan.currentStatus !== 'completed' && plan.currentStatus !== 'expired'" to="/checkin" class="go-checkin-btn">
                        <el-button size="small" type="primary">
                          <el-icon><Edit /></el-icon>
                          去打卡
                        </el-button>
                      </router-link>
                    </div>

                    <div v-if="plan.note" class="plan-note">
                      <el-icon><ChatDotRound /></el-icon>
                      <span>{{ plan.note }}</span>
                    </div>
                  </div>
                </div>
                <div v-else class="empty-state">
                  <el-icon><Calendar /></el-icon>
                  <p>还没有练习计划，快去创建一个吧！</p>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="我的乐器" name="instruments">
          <div class="action-bar mb-20">
            <router-link to="/publish">
              <el-button type="primary" size="large">
                <el-icon><Plus /></el-icon>
                发布新乐器
              </el-button>
            </router-link>
          </div>
          <div v-if="myInstruments.length" class="grid grid-4 gap-20">
            <div v-for="inst in myInstruments" :key="inst.id" class="inst-item card">
              <img :src="inst.image" class="inst-image" />
              <div class="inst-info">
                <h4>{{ inst.name }}</h4>
                <div class="inst-tags">
                  <span class="badge badge-primary">{{ inst.category }}</span>
                  <span class="badge" :class="inst.status === 'available' ? 'badge-success' : 'badge-warning'">
                    {{ inst.status === 'available' ? '可借用' : '借用中' }}
                  </span>
                </div>
                <div class="inst-price">¥{{ inst.dailyFee }}/天 · 押金¥{{ inst.deposit }}</div>
                <div class="inst-actions">
                  <router-link :to="`/instruments/${inst.id}`">
                    <el-button size="small">查看</el-button>
                  </router-link>
                  <el-button size="small" type="danger" @click="deleteInstrument(inst)">下架</el-button>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <el-icon><Goods /></el-icon>
            <p>你还没有发布任何乐器</p>
            <router-link to="/publish" class="btn-primary mt-20">去发布我的第一件闲置乐器</router-link>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="我的评价" name="reviews">
          <div class="rating-summary card mb-20">
            <div class="rating-main">
              <span class="rating-num">{{ form.rating }}</span>
              <el-rate v-model="form.rating" disabled show-score text-color="#ff9900" />
              <span class="review-count">（{{ form.reviewCount }}条评价）</span>
            </div>
          </div>
          <div v-if="myReviews.length" class="review-list">
            <div class="review-item card" v-for="r in myReviews" :key="r.id">
              <img :src="r.reviewer?.avatar" class="avatar-sm" />
              <div class="review-body">
                <div class="review-header">
                  <span class="reviewer">{{ r.reviewer?.username }}</span>
                  <el-rate v-model="r.rating" disabled size="small" />
                  <span class="badge badge-primary">{{ r.context }}</span>
                  <span class="time">{{ new Date(r.createdAt).toLocaleDateString() }}</span>
                </div>
                <p>{{ r.content }}</p>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <el-icon><ChatLineSquare /></el-icon>
            <p>暂无评价</p>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { checkinApi, instrumentApi, reviewApi, planApi } from '../api'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Check, Plus, Goods, ChatLineSquare, Calendar, List, Timer, DatePicker,
  Document, Edit, WarningFilled, CircleCheckFilled, MoreFilled, ChatDotRound
} from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()

const activeTab = ref('basic')
const saving = ref(false)
const stats = ref(null)
const myInstruments = ref([])
const myReviews = ref([])

const form = reactive({
  ...(userStore.currentUser || {}),
  instruments: [],
  favoritePieces: [],
  freeTimes: []
})

const allInstruments = ['古典吉他', '民谣吉他', '电吉他', '尤克里里', '钢琴', '电子琴', '小提琴', '中提琴', '大提琴', '架子鼓', '卡洪鼓', '竹笛', '长笛', '洞箫', '陶埙', '口琴', '萨克斯', '小号', '古筝', '二胡', '琵琶', '阮', '扬琴']
const commonPieces = ['爱的罗曼史', '阿尔罕布拉宫的回忆', '肖邦夜曲', '梦中的婚礼', '小星星变奏曲', '铃木小提琴教程', 'Take Five', '西班牙斗牛曲', '姑苏行', '平湖秋月', '卡农', '天空之城', '千与千寻', '菊次郎的夏天']

const plans = ref([])
const planSummary = ref(null)
const planFilter = ref('all')
const creatingPlan = ref(false)

const defaultDeadline = () => {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().split('T')[0]
}

const startOfToday = () => {
  return new Date().toISOString().split('T')[0]
}

const planForm = reactive({
  userId: userStore.userId,
  instrument: '',
  piece: '',
  targetHours: 5,
  targetDays: 5,
  deadline: defaultDeadline(),
  startDate: startOfToday(),
  note: ''
})

const planInstrumentOptions = computed(() => {
  const base = userStore.currentUser?.instruments || []
  return [...new Set([...base, ...allInstruments])]
})

const filteredPlans = computed(() => {
  if (planFilter.value === 'all') return plans.value
  return plans.value.filter(p => p.currentStatus === planFilter.value)
})

onMounted(async () => {
  if (userStore.currentUser) {
    Object.assign(form, userStore.currentUser)
  }
  try {
    stats.value = await checkinApi.stats(userStore.userId)
  } catch (e) {}
  try {
    myInstruments.value = await instrumentApi.list({ ownerId: userStore.userId })
  } catch (e) {}
  try {
    myReviews.value = await reviewApi.list({ revieweeId: userStore.userId })
  } catch (e) {}
  await loadPlans()
})

const loadPlans = async () => {
  try {
    plans.value = await planApi.list({ userId: userStore.userId })
  } catch (e) {}
  try {
    planSummary.value = await planApi.summary(userStore.userId)
  } catch (e) {}
}

const randomAvatar = () => {
  const seed = Math.random().toString(36).slice(2, 10)
  form.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`
}

const saveProfile = async () => {
  if (!form.username) {
    ElMessage.warning('请填写昵称')
    return
  }
  saving.value = true
  try {
    const result = await userStore.updateUser({ ...form })
    if (result.success) {
      ElMessage.success('保存成功！')
    }
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const deleteInstrument = async (inst) => {
  try {
    await ElMessageBox.confirm(`确定下架「${inst.name}」吗？`, '确认下架', { type: 'warning' })
  } catch { return }
  try {
    await instrumentApi.remove(inst.id)
    ElMessage.success('已下架')
    myInstruments.value = myInstruments.value.filter(i => i.id !== inst.id)
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

const disabledPastDate = (date) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
}

const resetPlanForm = () => {
  planForm.instrument = ''
  planForm.piece = ''
  planForm.targetHours = 5
  planForm.targetDays = 5
  planForm.deadline = defaultDeadline()
  planForm.note = ''
}

const createPlan = async () => {
  if (!planForm.instrument) {
    ElMessage.warning('请选择练习乐器')
    return
  }
  if (!planForm.targetHours || planForm.targetHours <= 0) {
    ElMessage.warning('请输入有效的目标时长')
    return
  }
  if (!planForm.targetDays || planForm.targetDays <= 0) {
    ElMessage.warning('请输入有效的练习天数')
    return
  }
  if (!planForm.deadline) {
    ElMessage.warning('请选择截止日期')
    return
  }
  creatingPlan.value = true
  try {
    const result = await planApi.create({ ...planForm })
    if (result.success) {
      ElMessage.success('练习计划创建成功！')
      resetPlanForm()
      await loadPlans()
    }
  } catch (e) {
    ElMessage.error('创建失败')
  } finally {
    creatingPlan.value = false
  }
}

const handlePlanCommand = async (cmd, plan) => {
  if (cmd === 'delete') {
    try {
      await ElMessageBox.confirm(
        `确定删除「${plan.instrument}${plan.piece ? ' - ' + plan.piece : ''}」的练习计划吗？`,
        '删除计划',
        { type: 'warning' }
      )
    } catch { return }
    try {
      await planApi.remove(plan.id)
      ElMessage.success('已删除')
      await loadPlans()
    } catch (e) {
      ElMessage.error('操作失败')
    }
  }
}

const progressColor = (percent, status) => {
  if (status === 'completed') return '#10b981'
  if (status === 'expired') return '#ef4444'
  if (percent >= 80) return '#10b981'
  if (percent >= 50) return '#6366f1'
  if (percent >= 20) return '#f59e0b'
  return '#ef4444'
}

const urgentProgressColor = (percent) => {
  if (percent >= 80) return '#10b981'
  if (percent >= 50) return '#f59e0b'
  return '#ef4444'
}
</script>

<style scoped>
.mb-20 { margin-bottom: 20px; }
.mt-20 { display: inline-block; margin-top: 20px; }

.form-wrap {
  padding: 30px 40px;
  max-width: 900px;
  margin: 0 auto;
}

.profile-top {
  display: flex;
  gap: 40px;
  padding-bottom: 24px;
  border-bottom: 1px dashed var(--border-color);
}

.avatar-edit {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.avatar-xl {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 4px solid #e0e7ff;
}

.quick-stats {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  align-content: center;
}

.stat {
  text-align: center;
  padding: 16px;
  background: var(--bg-light);
  border-radius: 12px;
}

.stat .num {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat .num.highlight {
  color: #f59e0b;
}

.stat .label {
  font-size: 12px;
  color: var(--text-secondary);
}

.action-bar {
  padding: 4px;
}

.grid-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.inst-item {
  overflow: hidden;
  padding: 0;
}

.inst-image {
  width: 100%;
  height: 160px;
  object-fit: cover;
}

.inst-info {
  padding: 14px;
}

.inst-info h4 {
  font-size: 15px;
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.inst-tags {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.inst-price {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.inst-actions {
  display: flex;
  gap: 8px;
}

.rating-summary {
  padding: 30px;
  text-align: center;
}

.rating-main {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.rating-num {
  font-size: 48px;
  font-weight: 700;
  color: #f59e0b;
}

.review-count {
  color: var(--text-secondary);
}

.review-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.review-item {
  display: flex;
  gap: 12px;
  padding: 18px;
}

.review-body {
  flex: 1;
}

.review-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.reviewer {
  font-weight: 500;
}

.time {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-secondary);
}

.urgent-banner {
  background: linear-gradient(135deg, #fff7ed, #fee2e2);
  border: 2px solid #f59e0b;
  border-radius: 12px;
  padding: 20px 24px;
  margin-bottom: 24px;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.15);
}

.urgent-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 17px;
  font-weight: 700;
  color: #b45309;
  margin-bottom: 14px;
}

.urgent-icon {
  font-size: 22px;
  color: #ef4444;
  animation: pulse 1.8s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.urgent-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.urgent-item {
  background: white;
  border-radius: 10px;
  padding: 14px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #fed7aa;
}

.urgent-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
}

.urgent-plan-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.urgent-inst {
  font-weight: 600;
  color: var(--text-primary);
}

.urgent-plan-progress {
  margin-bottom: 6px;
}

.urgent-plan-desc {
  font-size: 12px;
  color: var(--text-secondary);
}

.plans-layout {
  display: grid;
  grid-template-columns: 420px 1fr;
  gap: 24px;
}

.plan-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.plan-stat-item {
  text-align: center;
  padding: 16px 8px;
  border-radius: 10px;
  background: var(--bg-light);
}

.plan-stat-item .num {
  display: block;
  font-size: 26px;
  font-weight: 700;
  line-height: 1.2;
}

.plan-stat-item .label {
  font-size: 12px;
  color: var(--text-secondary);
}

.plan-stat-item.total .num { color: var(--primary-color); }
.plan-stat-item.progress .num { color: #3b82f6; }
.plan-stat-item.done .num { color: #10b981; }
.plan-stat-item.expire .num { color: #ef4444; }

.section-title-sm {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 18px;
}

.form-unit {
  margin-left: 10px;
  color: var(--text-secondary);
  font-size: 13px;
}

.plan-list-card {
  min-height: 600px;
}

.plan-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.plan-list-header .section-title-sm {
  margin-bottom: 0;
}

.plan-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.plan-card {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 18px 20px;
  background: white;
  transition: all 0.2s;
  position: relative;
}

.plan-card:hover {
  box-shadow: var(--shadow-md);
}

.plan-card.status-completed {
  border-color: #10b981;
  background: linear-gradient(135deg, #ffffff, #f0fdf4);
}

.plan-card.status-expired {
  border-color: #d1d5db;
  background: #fafafa;
  opacity: 0.8;
}

.plan-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.plan-card-title {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.plan-instrument {
  font-size: 17px;
  font-weight: 700;
  color: var(--primary-color);
}

.plan-piece {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

.plan-status-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.plan-more-btn {
  padding: 4px 6px;
}

.plan-progress-section {
  display: grid;
  grid-template-columns: 1fr 1fr 110px;
  gap: 20px;
  align-items: center;
  margin-bottom: 14px;
  padding: 14px;
  background: var(--bg-light);
  border-radius: 10px;
}

.plan-progress-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.plan-progress-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.plan-progress-label .el-icon {
  font-size: 14px;
}

.plan-overall {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.overall-percent {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.plan-meta {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--text-secondary);
}

.plan-meta-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.go-checkin-btn {
  margin-left: auto;
}

.plan-note {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--border-color);
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
}

.plan-note .el-icon {
  margin-top: 2px;
  color: #a78bfa;
}

@media (max-width: 1100px) {
  .plans-layout {
    grid-template-columns: 1fr;
  }
  .plan-progress-section {
    grid-template-columns: 1fr 1fr;
  }
  .plan-overall {
    grid-column: span 2;
  }
}

@media (max-width: 900px) {
  .profile-top {
    flex-direction: column;
    align-items: center;
  }
  .quick-stats {
    grid-template-columns: repeat(2, 1fr);
    width: 100%;
  }
  .grid-4 {
    grid-template-columns: 1fr 1fr;
  }
  .plan-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .urgent-list {
    grid-template-columns: 1fr;
  }
  .plan-progress-section {
    grid-template-columns: 1fr;
  }
  .plan-overall {
    grid-column: auto;
  }
}
</style>
