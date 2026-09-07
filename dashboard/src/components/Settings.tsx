'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  Users, 
  ShieldCheck, 
  Key, 
  UserPlus, 
  Trash2, 
  FileText, 
  CheckCircle, 
  Lock,
  History
} from 'lucide-react';
import { Organization, User, AuditLog, Role } from '../types';

interface SettingsProps {
  activeOrg: Organization;
  organizations: Organization[];
  currentUser: User;
  onUpdateOrgName?: (name: string) => void;
}

export default function Settings({ activeOrg, organizations, currentUser }: SettingsProps) {
  const [activeSubTab, setActiveSubTab] = useState<'workspace' | 'members' | 'audit'>('workspace');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('operator');
  const [inviteGenerated, setInviteGenerated] = useState<string | null>(null);

  // Tenant-scoped users and memberships
  const [members, setMembers] = useState<Array<{ id: string; name: string; email: string; role: Role }>>([
    { id: 'usr_1', name: 'Ritesh Sinha', email: 'owner@rumik-demo.local', role: 'owner' },
    { id: 'usr_2', name: 'Dev Lead', email: 'admin@rumik-demo.local', role: 'admin' },
    { id: 'usr_3', name: 'Operations Agent', email: 'ops@rumik-demo.local', role: 'operator' },
    { id: 'usr_4', name: 'Data Analyst', email: 'analyst@rumik-demo.local', role: 'analyst' },
    { id: 'usr_5', name: 'External Auditor', email: 'auditor@rumik-demo.local', role: 'viewer' }
  ]);

  // Tenant-scoped immutable audit trail
  const [auditLogs] = useState<AuditLog[]>([
    {
      id: 'aud_101',
      organizationId: activeOrg.id,
      userId: currentUser.id,
      userEmail: currentUser.email,
      action: 'WORKFLOW_PUBLISH',
      resource: 'Rumik ₹1 Demo Agent (v3)',
      details: 'Published graph with allow_interrupt=true',
      ipAddress: '127.0.0.1',
      timestamp: '2026-09-07T20:30:15Z'
    },
    {
      id: 'aud_102',
      organizationId: activeOrg.id,
      userId: currentUser.id,
      userEmail: currentUser.email,
      action: 'CARRIER_VERIFIED',
      resource: 'VoBiz Primary PSTN',
      details: 'Validated answer_url POST endpoint handshake',
      ipAddress: '127.0.0.1',
      timestamp: '2026-09-07T20:25:00Z'
    },
    {
      id: 'aud_103',
      organizationId: activeOrg.id,
      userId: currentUser.id,
      userEmail: currentUser.email,
      action: 'SUB_ACCOUNT_SWITCH',
      resource: activeOrg.name,
      details: 'Switched context and cleared local cache',
      ipAddress: '127.0.0.1',
      timestamp: '2026-09-07T20:10:00Z'
    }
  ]);

  const handleCreateInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    if (currentUser.role !== 'owner' && currentUser.role !== 'admin') {
      alert('Permission Denied: Only Workspace Owners and Admins can invite team members.');
      return;
    }

    const code = `inv_${Math.random().toString(36).substring(2, 10)}`;
    setInviteGenerated(`https://studio.rumik.ai/join?token=${code}&org=${activeOrg.id}`);
    setInviteEmail('');
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Settings & Multi-Tenant Access</h1>
          <p className="page-header-desc">
            Manage organization hierarchy, sub-accounts, user memberships, and audit trails for <strong>{activeOrg.name}</strong>.
          </p>
        </div>

        {/* Sub-tab switcher */}
        <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-control)', overflow: 'hidden' }}>
          <button
            onClick={() => setActiveSubTab('workspace')}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: activeSubTab === 'workspace' ? 'var(--color-accent-soft)' : 'var(--color-surface)',
              color: activeSubTab === 'workspace' ? 'var(--color-accent)' : 'var(--color-ink)',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: 13
            }}
          >
            Workspace & Sub-Accounts
          </button>
          <button
            onClick={() => setActiveSubTab('members')}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: activeSubTab === 'members' ? 'var(--color-accent-soft)' : 'var(--color-surface)',
              color: activeSubTab === 'members' ? 'var(--color-accent)' : 'var(--color-ink)',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: 13
            }}
          >
            Members & Roles
          </button>
          <button
            onClick={() => setActiveSubTab('audit')}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: activeSubTab === 'audit' ? 'var(--color-accent-soft)' : 'var(--color-surface)',
              color: activeSubTab === 'audit' ? 'var(--color-accent)' : 'var(--color-ink)',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: 13
            }}
          >
            Audit Log Trail
          </button>
        </div>
      </div>

      {activeSubTab === 'workspace' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          {/* Workspace Details Card */}
          <div className="card" style={{ padding: 'var(--space-6)' }}>
            <h3 style={{ marginBottom: 16 }}>Current Workspace Scope</h3>
            <div className="grid-2">
              <div>
                <div style={{ fontSize: 12, color: 'var(--color-ink-muted)', marginBottom: 4 }}>Organization Name</div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{activeOrg.name}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--color-ink-muted)', marginBottom: 4 }}>Unique Tenant ID</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{activeOrg.id}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--color-ink-muted)', marginBottom: 4 }}>Hierarchy Level</div>
                <div>{activeOrg.parentId ? `Sub-Account (Parent: ${activeOrg.parentName})` : 'Parent Organization'}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--color-ink-muted)', marginBottom: 4 }}>Channel Concurrency Limit</div>
                <div style={{ fontWeight: 600 }}>{activeOrg.concurrencyLimit} Channels</div>
              </div>
            </div>
          </div>

          {/* Sub-Accounts Hierarchy View */}
          <div className="card" style={{ padding: 'var(--space-6)' }}>
            <h3 style={{ marginBottom: 12 }}>Associated Workspaces & Hierarchy</h3>
            <p style={{ fontSize: 13, marginBottom: 16 }}>
              Parent rollups never expose child secrets. Child accounts have isolated credentials and call logs.
            </p>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left', color: 'var(--color-ink-muted)' }}>
                  <th style={{ padding: '8px 12px' }}>Organization</th>
                  <th style={{ padding: '8px 12px' }}>Type</th>
                  <th style={{ padding: '8px 12px' }}>Tenant ID</th>
                  <th style={{ padding: '8px 12px' }}>Concurrency</th>
                  <th style={{ padding: '8px 12px' }}>Isolation Status</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((org) => (
                  <tr key={org.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: org.id === activeOrg.id ? 700 : 500 }}>
                      {org.name} {org.id === activeOrg.id && '(Active)'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {org.parentId ? 'Sub-Account' : 'Parent Account'}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {org.id}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {org.concurrencyLimit} lines
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className="badge badge-success">Isolated</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'members' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          {/* Invite User Card */}
          <div className="card" style={{ padding: 'var(--space-6)' }}>
            <h3 style={{ marginBottom: 12 }}>Invite Team Member</h3>
            <form onSubmit={handleCreateInvite} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 240,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-control)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  fontSize: 13
                }}
                required
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as Role)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-control)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  fontSize: 13
                }}
              >
                <option value="admin">Admin (Manage agents & configs)</option>
                <option value="operator">Operator (Run agents & campaigns)</option>
                <option value="analyst">Analyst (View metrics & exports)</option>
                <option value="viewer">Viewer (Read-only access)</option>
              </select>
              <button type="submit" className="btn-primary">
                <UserPlus size={15} /> Generate Single-Use Invite
              </button>
            </form>

            {inviteGenerated && (
              <div style={{ marginTop: 14, padding: 12, backgroundColor: 'var(--color-accent-soft)', borderRadius: 8, fontSize: 13 }}>
                <strong>Single-Use Invite Link Generated (Valid for 24h):</strong>
                <div style={{ fontFamily: 'var(--font-mono)', marginTop: 4, wordBreak: 'break-all' }}>
                  {inviteGenerated}
                </div>
              </div>
            )}
          </div>

          {/* Members Table */}
          <div className="card" style={{ padding: 'var(--space-6)' }}>
            <h3 style={{ marginBottom: 16 }}>Active Workspace Members</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left', color: 'var(--color-ink-muted)' }}>
                  <th style={{ padding: '8px 12px' }}>Name</th>
                  <th style={{ padding: '8px 12px' }}>Email</th>
                  <th style={{ padding: '8px 12px' }}>Role</th>
                  <th style={{ padding: '8px 12px' }}>Permissions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{member.name}</td>
                    <td style={{ padding: '10px 12px' }}>{member.email}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                        {member.role}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-ink-muted)' }}>
                      {member.role === 'owner' && 'Full ownership, billing, delete tenant'}
                      {member.role === 'admin' && 'Manage configurations, telephony, agents'}
                      {member.role === 'operator' && 'Execute workflows, live test, canary calls'}
                      {member.role === 'analyst' && 'View analytics, latency, cost reports'}
                      {member.role === 'viewer' && 'Read-only dashboard monitoring'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'audit' && (
        <div className="card" style={{ padding: 'var(--space-6)' }}>
          <h3 style={{ marginBottom: 12 }}>Immutable Security & Operations Audit Trail</h3>
          <p style={{ fontSize: 13, marginBottom: 16 }}>
            Every configuration update, credential change, workflow publish, and call dispatch is logged with operator identity.
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left', color: 'var(--color-ink-muted)' }}>
                <th style={{ padding: '8px 12px' }}>Timestamp (UTC)</th>
                <th style={{ padding: '8px 12px' }}>User</th>
                <th style={{ padding: '8px 12px' }}>Action</th>
                <th style={{ padding: '8px 12px' }}>Resource</th>
                <th style={{ padding: '8px 12px' }}>Audit Details</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {log.timestamp}
                  </td>
                  <td style={{ padding: '10px 12px' }}>{log.userEmail}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span className="badge badge-neutral" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>{log.resource}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--color-ink-muted)' }}>{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
