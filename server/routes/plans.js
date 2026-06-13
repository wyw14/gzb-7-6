const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readJSON, writeJSON } = require('../utils/storage');

const router = express.Router();

function getPlanCheckins(checkins, planId) {
  return checkins.filter(c => c.planId === planId);
}

function calculatePlanProgress(plan, checkins) {
  const planCheckins = getPlanCheckins(checkins, plan.id);

  const checkinDates = new Set(
    planCheckins.map(c => new Date(c.createdAt).toDateString())
  );

  const completedDays = checkinDates.size;
  const completedMinutes = planCheckins.reduce((sum, c) => sum + (c.duration || 0), 0);
  const completedHours = Math.round(completedMinutes / 60 * 10) / 10;

  const progressDays = Math.min(100, Math.round(completedDays / plan.targetDays * 100));
  const progressHours = Math.min(100, Math.round(completedMinutes / (plan.targetHours * 60) * 100));
  const overallProgress = Math.round((progressDays + progressHours) / 2);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(plan.deadline);
  deadline.setHours(0, 0, 0, 0);
  const daysRemaining = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

  let currentStatus = plan.status;
  if (plan.status !== 'completed') {
    if (completedDays >= plan.targetDays && completedHours >= plan.targetHours) {
      currentStatus = 'completed';
    } else if (daysRemaining < 0) {
      currentStatus = 'expired';
    } else {
      currentStatus = 'in_progress';
    }
  }

  return {
    ...plan,
    completedDays,
    completedHours,
    completedMinutes,
    progressDays,
    progressHours,
    overallProgress,
    daysRemaining,
    currentStatus,
    relatedCheckins: planCheckins.length
  };
}

router.get('/', (req, res) => {
  const plans = readJSON('plans.json', []);
  const checkins = readJSON('checkins.json', []);
  const { userId, status } = req.query;

  let result = plans;

  if (userId) {
    result = result.filter(p => p.userId === userId);
  }
  if (status) {
    result = result.filter(p => p.status === status);
  }

  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const enriched = result.map(plan => calculatePlanProgress(plan, checkins));

  res.json(enriched);
});

router.post('/', (req, res) => {
  const plans = readJSON('plans.json', []);

  const {
    userId, instrument, piece, targetHours, targetDays, deadline, startDate
  } = req.body;

  if (!userId || !instrument || !targetHours || !targetDays || !deadline) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  const newPlan = {
    id: 'p' + uuidv4().slice(0, 8),
    userId,
    instrument,
    piece: piece || '',
    targetHours: Number(targetHours),
    targetDays: Number(targetDays),
    deadline,
    startDate: startDate || new Date().toISOString().split('T')[0],
    status: 'in_progress',
    note: req.body.note || '',
    createdAt: new Date().toISOString()
  };

  plans.push(newPlan);
  writeJSON('plans.json', plans);

  res.json({ success: true, plan: newPlan });
});

router.put('/:id', (req, res) => {
  const plans = readJSON('plans.json', []);
  const idx = plans.findIndex(p => p.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ error: '计划不存在' });
  }

  plans[idx] = { ...plans[idx], ...req.body, id: plans[idx].id };
  writeJSON('plans.json', plans);

  res.json({ success: true, plan: plans[idx] });
});

router.delete('/:id', (req, res) => {
  let plans = readJSON('plans.json', []);
  plans = plans.filter(p => p.id !== req.params.id);
  writeJSON('plans.json', plans);

  res.json({ success: true });
});

router.get('/summary/:userId', (req, res) => {
  const plans = readJSON('plans.json', []);
  const checkins = readJSON('checkins.json', []);
  const { userId } = req.params;

  const userPlans = plans.filter(p => p.userId === userId);

  let pendingCount = 0;
  let expiredCount = 0;
  let completedCount = 0;
  let inProgressCount = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  userPlans.forEach(plan => {
    const planCheckins = getPlanCheckins(checkins, plan.id);

    const checkinDates = new Set(
      planCheckins.map(c => new Date(c.createdAt).toDateString())
    );

    const completedDays = checkinDates.size;
    const completedMinutes = planCheckins.reduce((sum, c) => sum + (c.duration || 0), 0);
    const completedHours = completedMinutes / 60;

    const deadline = new Date(plan.deadline);
    deadline.setHours(0, 0, 0, 0);
    const daysRemaining = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

    if (completedDays >= plan.targetDays && completedHours >= plan.targetHours) {
      completedCount++;
    } else if (daysRemaining < 0) {
      expiredCount++;
    } else {
      inProgressCount++;
      if (daysRemaining <= 2) {
        pendingCount++;
      }
    }
  });

  const urgentPlans = userPlans.filter(plan => {
    const planCheckins = getPlanCheckins(checkins, plan.id);

    const checkinDates = new Set(
      planCheckins.map(c => new Date(c.createdAt).toDateString())
    );

    const completedDays = checkinDates.size;
    const completedMinutes = planCheckins.reduce((sum, c) => sum + (c.duration || 0), 0);
    const completedHours = completedMinutes / 60;

    const deadline = new Date(plan.deadline);
    deadline.setHours(0, 0, 0, 0);
    const daysRemaining = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

    const isComplete = completedDays >= plan.targetDays && completedHours >= plan.targetHours;

    return !isComplete && daysRemaining >= 0 && daysRemaining <= 3;
  }).map(plan => calculatePlanProgress(plan, checkins));

  res.json({
    userId,
    total: userPlans.length,
    completed: completedCount,
    inProgress: inProgressCount,
    expired: expiredCount,
    pending: pendingCount,
    urgentPlans
  });
});

module.exports = router;
