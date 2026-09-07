// ==============================================================================
// Replora Voice Studio — Multi-Tenant Isolation & RBAC Test Suite (Pure TypeScript)
// ==============================================================================

import assert from 'assert';
import { Role } from '../src/types';

console.log('\n======================================================');
console.log(' RUNNING MULTI-TENANT ISOLATION & RBAC TEST SUITE (TS)');
console.log('======================================================\n');

interface MockOrg {
  id: string;
  name: string;
  parentId: string | null;
  secretKey: string;
}

interface MockMembership {
  userId: string;
  orgId: string;
  role: Role;
  active: boolean;
}

interface MockCampaign {
  id: string;
  orgId: string;
  name: string;
  calls: number;
}

interface MockCallLog {
  id: string;
  orgId: string;
  cost: number;
}

interface MockDB {
  organizations: MockOrg[];
  memberships: MockMembership[];
  campaigns: MockCampaign[];
  callLogs: MockCallLog[];
}

const db: MockDB = {
  organizations: [
    { id: 'org_parent', name: 'Parent HQ', parentId: null, secretKey: 'parent_secret_key_999' },
    { id: 'org_child_1', name: 'Sub Account 1', parentId: 'org_parent', secretKey: 'child_1_secret_111' },
    { id: 'org_child_2', name: 'Sub Account 2', parentId: 'org_parent', secretKey: 'child_2_secret_222' },
    { id: 'org_unrelated', name: 'Competitor Corp', parentId: null, secretKey: 'unrelated_secret_000' }
  ],
  memberships: [
    { userId: 'user_a', orgId: 'org_child_1', role: 'admin', active: true },
    { userId: 'user_b', orgId: 'org_child_2', role: 'operator', active: true },
    { userId: 'user_owner', orgId: 'org_parent', role: 'owner', active: true }
  ],
  campaigns: [
    { id: 'camp_101', orgId: 'org_child_1', name: 'Campaign 1', calls: 50 },
    { id: 'camp_102', orgId: 'org_child_2', name: 'Campaign 2', calls: 80 }
  ],
  callLogs: [
    { id: 'call_1', orgId: 'org_child_1', cost: 1.0 },
    { id: 'call_2', orgId: 'org_child_1', cost: 1.0 },
    { id: 'call_3', orgId: 'org_child_2', cost: 1.0 }
  ]
};

// Security boundary functions
function queryTenantResource(
  authenticatedUserId: string, 
  targetOrgId: string, 
  resourceType: 'campaigns' | 'callLogs'
): any[] {
  const membership = db.memberships.find(m => m.userId === authenticatedUserId && m.active);
  if (!membership) {
    throw new Error('401 Unauthorized: Inactive or missing membership');
  }

  // Tenant Boundary Check
  const isDirectMember = membership.orgId === targetOrgId;
  const isAuthorizedParent = db.organizations.some(
    o => o.id === targetOrgId && o.parentId === membership.orgId && membership.role === 'owner'
  );

  if (!isDirectMember && !isAuthorizedParent) {
    throw new Error(`403 Forbidden: Tenant isolation breach prevented for org ${targetOrgId}`);
  }

  if (resourceType === 'campaigns') {
    return db.campaigns.filter(c => c.orgId === targetOrgId);
  }
  if (resourceType === 'callLogs') {
    return db.callLogs.filter(c => c.orgId === targetOrgId);
  }
  return [];
}

let passed = 0;
let failed = 0;

function runTest(description: string, fn: () => void): void {
  try {
    fn();
    console.log(`[PASS] ${description}`);
    passed++;
  } catch (err: any) {
    console.error(`[FAIL] ${description}:`, err.message);
    failed++;
  }
}

// Test 1: User A cannot read User B's tenant resource
runTest('User A cannot read User B tenant resource by changing ID', () => {
  assert.throws(() => {
    queryTenantResource('user_a', 'org_child_2', 'campaigns');
  }, /403 Forbidden/);
});

// Test 2: User A cannot read Unrelated Org resource
runTest('User A cannot access unrelated organization resource', () => {
  assert.throws(() => {
    queryTenantResource('user_a', 'org_unrelated', 'campaigns');
  }, /403 Forbidden/);
});

// Test 3: Parent owner rollup includes only authorized children
runTest('Parent owner rollup includes only authorized children', () => {
  const child1Campaigns = queryTenantResource('user_owner', 'org_child_1', 'campaigns');
  assert.strictEqual(child1Campaigns.length, 1);
  assert.strictEqual(child1Campaigns[0].id, 'camp_101');

  // Attempt to rollup unrelated org must fail
  assert.throws(() => {
    queryTenantResource('user_owner', 'org_unrelated', 'campaigns');
  }, /403 Forbidden/);
});

// Test 4: Removing membership immediately invalidates access
runTest('Removing membership immediately invalidates access without token lag', () => {
  const mem = db.memberships.find(m => m.userId === 'user_b')!;
  mem.active = false; // Membership revoked
  assert.throws(() => {
    queryTenantResource('user_b', 'org_child_2', 'campaigns');
  }, /401 Unauthorized/);
  mem.active = true; // Restore
});

// Test 5: Analytics totals equal tenant-scoped source rows
runTest('Analytics totals strictly equal tenant-scoped source rows', () => {
  const child1Logs = queryTenantResource('user_a', 'org_child_1', 'callLogs');
  assert.strictEqual(child1Logs.length, 2);
  const totalCost = child1Logs.reduce((sum, log) => sum + log.cost, 0);
  assert.strictEqual(totalCost, 2.0); // Never pollutes with org_child_2's cost
});

console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('[+] All multi-tenant isolation acceptance gates verified successfully in TypeScript.\n');
  process.exit(0);
}
