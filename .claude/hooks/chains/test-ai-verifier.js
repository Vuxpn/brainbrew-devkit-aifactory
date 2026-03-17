#!/usr/bin/env node

/**
 * Test AI Verifier - Run verification tests
 * Usage: node test-ai-verifier.js [agent_type]
 */

const { verify } = require('./ai-verify-utils');

const TEST_CASES = {
  planner: {
    pass: `## Implementation Plan

### Phase 1: Setup
1. Create src/api/routes.ts with Express router
2. Add validation middleware in src/middleware/validate.ts
3. Update package.json with new dependencies

### Phase 2: Implementation
1. Implement GET /users endpoint
2. Add POST /users with validation
3. Write unit tests in tests/api.test.ts

### Files to modify:
- src/api/routes.ts (create)
- src/middleware/validate.ts (create)
- src/index.ts (update imports)`,

    fail: `I'll implement the feature.`
  },

  implementer: {
    pass: `Created the API routes:

\`\`\`typescript
// src/api/routes.ts
import { Router } from 'express';

const router = Router();

router.get('/users', async (req, res) => {
  const users = await db.users.findAll();
  res.json(users);
});

export default router;
\`\`\`

Modified src/index.ts to import the new routes.`,

    fail: `The code looks good, I'll implement it soon.`
  },

  tester: {
    pass: `Test Results:

✓ GET /users returns 200 (45ms)
✓ POST /users creates user (120ms)
✓ POST /users validates input (30ms)

3 passing, 0 failing
Coverage: 85%`,

    fail: `Tests passed.`
  }
};

async function runTest(agentType) {
  const cases = TEST_CASES[agentType];
  if (!cases) {
    console.log(`No test cases for: ${agentType}`);
    console.log(`Available: ${Object.keys(TEST_CASES).join(', ')}`);
    return;
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`Testing: ${agentType}`);
  console.log('═'.repeat(50));

  // Test PASS case
  console.log('\n--- PASS case (should pass) ---');
  const passResult = verify(agentType, cases.pass);
  console.log(`Result: ${passResult.pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Method: ${passResult.method}`);
  if (!passResult.pass) {
    console.log(`Issues: ${passResult.issues?.join(', ')}`);
  }

  // Test FAIL case
  console.log('\n--- FAIL case (should fail) ---');
  const failResult = verify(agentType, cases.fail);
  console.log(`Result: ${failResult.pass ? '❌ PASS (unexpected)' : '✅ FAIL (expected)'}`);
  console.log(`Method: ${failResult.method}`);
  if (failResult.issues) {
    console.log(`Issues: ${failResult.issues.join(', ')}`);
  }
  if (failResult.suggestion) {
    console.log(`Suggestion: ${failResult.suggestion}`);
  }
}

const agentType = process.argv[2] || 'planner';

if (agentType === 'all') {
  for (const type of Object.keys(TEST_CASES)) {
    runTest(type);
  }
} else {
  runTest(agentType);
}
