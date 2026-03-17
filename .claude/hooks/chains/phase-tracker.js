#!/usr/bin/env node

/**
 * Phase Tracker - Multi-phase plan progress tracking
 *
 * Tracks progress through multi-phase implementation plans,
 * enabling automatic continuation to next phase after git-manager.
 */

const fs = require('fs');
const path = require('path');
const { getState, updateState } = require('./chain-utils');

const PLANS_DIR = path.join(process.env.HOME, '.claude', 'plans');

/**
 * Extract phases from plan content
 * Looks for patterns: ## Phase N, ### Step N, ## N., numbered phases
 */
function extractPhases(planContent) {
  const phases = [];
  const lines = planContent.split('\n');

  // Pattern 1: ## Phase N: Title or ## Phase N - Title
  const phaseRegex = /^##\s*(?:Phase|Step|Stage)\s*(\d+)[:\s-]*(.*)/i;
  // Pattern 2: ## N. Title (numbered headers)
  const numberedRegex = /^##\s*(\d+)\.\s*(.*)/;
  // Pattern 3: ### Implementation Phase N
  const implPhaseRegex = /^###?\s*(?:Implementation\s+)?(?:Phase|Step)\s*(\d+)/i;

  for (const line of lines) {
    let match = line.match(phaseRegex) || line.match(numberedRegex) || line.match(implPhaseRegex);
    if (match) {
      phases.push({
        number: parseInt(match[1]),
        title: (match[2] || '').trim(),
        line: line
      });
    }
  }

  return phases;
}

/**
 * Find the most recent plan file
 */
function findRecentPlan(sessionId) {
  // Check state for planFile first
  const state = getState(sessionId);
  if (state?.planFile && fs.existsSync(state.planFile)) {
    return state.planFile;
  }

  // Fallback: find most recent .md in plans/
  if (!fs.existsSync(PLANS_DIR)) return null;

  const files = fs.readdirSync(PLANS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => ({
      name: f,
      path: path.join(PLANS_DIR, f),
      mtime: fs.statSync(path.join(PLANS_DIR, f)).mtime
    }))
    .sort((a, b) => b.mtime - a.mtime);

  return files[0]?.path || null;
}

/**
 * Initialize phase tracking for a session
 */
function initPhaseTracking(sessionId) {
  const planFile = findRecentPlan(sessionId);
  if (!planFile) return null;

  try {
    const planContent = fs.readFileSync(planFile, 'utf-8');
    const phases = extractPhases(planContent);

    if (phases.length <= 1) return null;

    return {
      planFile,
      totalPhases: phases.length,
      completedPhases: 0,
      phases: phases.map(p => ({ ...p, completed: false }))
    };
  } catch (e) {
    return null;
  }
}

/**
 * Check if more phases remain and return next action
 * @param {string} sessionId - Session identifier
 * @param {string} agentOutput - Output from the completed agent (unused currently)
 * @returns {Object} Phase progress info
 */
function checkPhaseProgress(sessionId, agentOutput) {
  const state = getState(sessionId) || {};

  // Initialize phase tracking if not present
  if (!state.phaseTracking) {
    const tracking = initPhaseTracking(sessionId);
    if (!tracking) return { hasMore: false };

    state.phaseTracking = tracking;
    updateState(sessionId, state);
  }

  // Increment completed phase
  state.phaseTracking.completedPhases++;
  const current = state.phaseTracking.completedPhases;
  const total = state.phaseTracking.totalPhases;

  // Mark phase as completed
  if (state.phaseTracking.phases[current - 1]) {
    state.phaseTracking.phases[current - 1].completed = true;
  }

  updateState(sessionId, state);

  if (current < total) {
    const nextPhase = state.phaseTracking.phases[current];
    return {
      hasMore: true,
      currentPhase: current,
      totalPhases: total,
      nextPhase: nextPhase?.title || `Phase ${current + 1}`,
      planFile: state.phaseTracking.planFile
    };
  }

  // All phases done - clean up
  delete state.phaseTracking;
  updateState(sessionId, state);
  return { hasMore: false, allComplete: true };
}

/**
 * Reset phase tracking for a session
 */
function resetPhaseTracking(sessionId) {
  const state = getState(sessionId);
  if (state?.phaseTracking) {
    delete state.phaseTracking;
    updateState(sessionId, state);
  }
}

/**
 * Get current phase info without modifying state
 */
function getPhaseInfo(sessionId) {
  const state = getState(sessionId);
  if (!state?.phaseTracking) return null;

  const { completedPhases, totalPhases, phases, planFile } = state.phaseTracking;
  return {
    completedPhases,
    totalPhases,
    remainingPhases: totalPhases - completedPhases,
    phases,
    planFile
  };
}

module.exports = {
  extractPhases,
  findRecentPlan,
  checkPhaseProgress,
  resetPhaseTracking,
  getPhaseInfo
};
