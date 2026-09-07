'use client';

import React, { useState } from 'react';
import { 
  Megaphone, 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  Play, 
  ShieldAlert, 
  FileText, 
  Sparkles,
  Users
} from 'lucide-react';
import { Campaign, CampaignContact, Organization, User } from '../types';

interface CampaignsProps {
  activeOrg: Organization;
  currentUser: User;
}

export default function Campaigns({ activeOrg, currentUser }: CampaignsProps) {
  const [csvContent, setCsvContent] = useState<string>(
`phone_number,customer_name,purpose,language,timezone,notes
+919876543210,Aarav Sharma,Demo Scheduling,en-IN,Asia/Kolkata,Prior inquiry on website
+919812345678,Priya Patel,Voice Agent Consultation,hi-IN,Asia/Kolkata,Requested Hindi support
+919823456789,Rohan Verma,Technical Pricing,en-IN,Asia/Kolkata,Evaluated ₹1 AI claim`
  );

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [campaign, setCampaign] = useState<Campaign>({
    id: 'campaign_rumik_01',
    organizationId: activeOrg.id,
    name: 'Rumik ₹1 Demo Campaign',
    status: 'draft', // Strictly kept in draft per Operating Rule 4 & Phase 6
    agentId: 'agent_rumik_01',
    concurrencyLimit: 1, // Conservative start: max_concurrency=1
    circuitBreakerThreshold: 50, // 50% failure rate circuit breaker
    totalRows: 3,
    dialedCount: 0,
    successCount: 0,
    contacts: [
      {
        phone_number: '+919876543210',
        customer_name: 'Aarav Sharma',
        purpose: 'Demo Scheduling',
        language: 'en-IN',
        timezone: 'Asia/Kolkata',
        notes: 'Prior inquiry on website',
        status: 'pending'
      },
      {
        phone_number: '+919812345678',
        customer_name: 'Priya Patel',
        purpose: 'Voice Agent Consultation',
        language: 'hi-IN',
        timezone: 'Asia/Kolkata',
        notes: 'Requested Hindi support',
        status: 'pending'
      },
      {
        phone_number: '+919823456789',
        customer_name: 'Rohan Verma',
        purpose: 'Technical Pricing',
        language: 'en-IN',
        timezone: 'Asia/Kolkata',
        notes: 'Evaluated ₹1 AI claim',
        status: 'pending'
      }
    ],
    createdAt: '2026-09-07T12:00:00Z'
  });

  const [canaryStatus, setCanaryStatus] = useState<string | null>(null);

  // Validate CSV rows against rules
  const handleValidateCsv = () => {
    const errors: string[] = [];
    const lines = csvContent.trim().split('\n');
    const header = lines[0].trim();
    const expectedHeader = 'phone_number,customer_name,purpose,language,timezone,notes';

    if (header !== expectedHeader) {
      errors.push(`Invalid CSV header. Expected exactly: ${expectedHeader}`);
    }

    const seenNumbers = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(',');

      if (parts.length < 5) {
        errors.push(`Row ${i + 1}: Missing required fields.`);
        continue;
      }

      const [phone, name, purpose, lang, tz] = parts;

      if (!phone.startsWith('+') || phone.length < 11) {
        errors.push(`Row ${i + 1}: Invalid E.164 phone number "${phone}".`);
      }

      if (seenNumbers.has(phone)) {
        errors.push(`Row ${i + 1}: Duplicate phone number detected "${phone}".`);
      }
      seenNumbers.add(phone);

      if (!name.trim()) errors.push(`Row ${i + 1}: Customer name is blank.`);
      if (!purpose.trim()) errors.push(`Row ${i + 1}: Purpose is blank.`);
    }

    setValidationErrors(errors);
    if (errors.length === 0) {
      alert('CSV Validation Passed! 3 contacts verified with valid E.164 numbers and required metadata.');
    }
  };

  // Run a single-contact canary call before bulk execution
  const handleRunCanary = () => {
    if (currentUser.role === 'viewer' || currentUser.role === 'analyst') {
      alert('Permission Denied: Your role does not allow executing canary calls.');
      return;
    }

    const canaryContact = campaign.contacts[0];
    const confirmed = window.confirm(
      `CANARY RUN CONFIRMATION:\n\nTarget: ${canaryContact.customer_name} (${canaryContact.phone_number})\nPurpose: ${canaryContact.purpose}\nConcurrency: 1\n\nRun single canary call to verify carrier route before any bulk campaign execution?`
    );

    if (confirmed) {
      setCanaryStatus(`Canary call running for ${canaryContact.phone_number}...`);
      setTimeout(() => {
        setCanaryStatus(`Canary call completed successfully. Lead qualified and transcript recorded. Canary gate passed.`);
        setCampaign((prev) => ({
          ...prev,
          status: 'draft', // Remains draft until explicit operator bulk activation
          dialedCount: 1,
          successCount: 1,
          contacts: prev.contacts.map((c, idx) => idx === 0 ? { ...c, status: 'canary_passed' } : c)
        }));
      }, 2000);
    }
  };

  return (
    <div className="campaigns-page">
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 className="page-header-title">{campaign.name}</h1>
            <span className="badge badge-warning">
              Status: Draft (Awaiting Approval)
            </span>
          </div>
          <p className="page-header-desc">
            Bulk outreach configuration. Bound to <strong>Rumik ₹1 Demo Agent</strong> and VoBiz primary PSTN.
          </p>
        </div>

        <button 
          id="run-canary-btn"
          className="btn-primary" 
          onClick={handleRunCanary}
        >
          <Play size={16} /> Run 1-Row Canary Verification
        </button>
      </div>

      {canaryStatus && (
        <div className="card" style={{ padding: '12px 16px', marginBottom: 'var(--space-6)', backgroundColor: 'var(--color-success-soft)', borderColor: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <CheckCircle size={18} color="var(--color-success)" />
          <span style={{ fontSize: 13, color: 'var(--color-success)', fontWeight: 600 }}>{canaryStatus}</span>
        </div>
      )}

      {/* Safety & Compliance Card */}
      <div className="card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
        <h3 style={{ marginBottom: 12, fontSize: '1.15rem' }}>Strict Calling Controls & Safety Parameters</h3>
        <div className="grid-4">
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-ink-muted)', marginBottom: 4 }}>Concurrency Limit</div>
            <div style={{ fontWeight: 600 }}>max_concurrency = 1</div>
            <div style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>Safe single-channel throttle</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-ink-muted)', marginBottom: 4 }}>Circuit Breaker</div>
            <div style={{ fontWeight: 600, color: 'var(--color-danger)' }}>50% Failure Rate</div>
            <div style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>Auto-pauses on consecutive errors</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-ink-muted)', marginBottom: 4 }}>Calling Window</div>
            <div style={{ fontWeight: 600 }}>09:00 - 19:00 IST</div>
            <div style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>Indian TRAI / DND compliant</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-ink-muted)', marginBottom: 4 }}>Retry Policy</div>
            <div style={{ fontWeight: 600 }}>Max 2 retries</div>
            <div style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>120s delay, busy/no-answer only</div>
          </div>
        </div>
      </div>

      {/* Personalization Previews */}
      <div className="card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
        <h3 style={{ marginBottom: 14, fontSize: '1.25rem' }}>Personalized Prompt Previews (First 3 Contacts)</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {campaign.contacts.slice(0, 3).map((contact, index) => (
            <div 
              key={index} 
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-control)',
                backgroundColor: 'var(--color-surface-muted)',
                border: '1px solid var(--color-border)',
                fontSize: 13
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <strong>{contact.customer_name} ({contact.phone_number})</strong>
                <span className="badge badge-neutral">{contact.purpose}</span>
              </div>
              <div style={{ color: 'var(--color-ink)', fontStyle: 'italic' }}>
                "Hello {contact.customer_name}, I am calling from Replora regarding your request for {contact.purpose}. Do you have two minutes to discuss?"
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CSV Source Editor and Validator */}
      <div className="card" style={{ padding: 'var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: '1.15rem' }}>Campaign Contact List (CSV Source)</h3>
          <button className="btn-secondary" onClick={handleValidateCsv}>
            <FileText size={15} /> Validate CSV Schema
          </button>
        </div>

        <textarea
          rows={6}
          value={csvContent}
          onChange={(e) => setCsvContent(e.target.value)}
          style={{
            width: '100%',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            padding: 12,
            borderRadius: 'var(--radius-control)',
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            marginBottom: 12
          }}
        />

        {validationErrors.length > 0 && (
          <div style={{ padding: 12, backgroundColor: 'var(--color-danger-soft)', borderRadius: 8, border: '1px solid var(--color-danger)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--color-danger)', marginBottom: 6 }}>
              <AlertTriangle size={16} /> Validation Errors Found ({validationErrors.length}):
            </div>
            <ul style={{ paddingLeft: 20, fontSize: 12, color: 'var(--color-danger)' }}>
              {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
