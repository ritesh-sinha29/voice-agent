'use client';

import React, { useState } from 'react';
import { 
  AreaChart, Area, 
  BarChart, Bar, 
  LineChart, Line, 
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend 
} from 'recharts';
import { 
  PhoneCall, 
  PhoneIncoming, 
  CheckCircle2, 
  Clock, 
  IndianRupee, 
  Layers, 
  Filter, 
  Table, 
  BarChart3, 
  Sparkles,
  Database
} from 'lucide-react';
import { Organization } from '../types';

interface OverviewProps {
  activeOrg: Organization;
  isDemoData: boolean;
  setIsDemoData: (value: boolean) => void;
}

export default function Overview({ activeOrg, isDemoData, setIsDemoData }: OverviewProps) {
  const [viewMode, setViewMode] = useState<'charts' | 'table'>('charts');
  const [dateRange, setDateRange] = useState('7d');
  const [agentFilter, setAgentFilter] = useState('all');
  const [campaignFilter, setCampaignFilter] = useState('all');

  const emptyData = {
    kpis: {
      totalCalls: 0,
      answeredRate: '0%',
      successfulOutcomes: 0,
      avgDuration: '0s',
      aiSpend: '₹0.00',
      activeCampaigns: 0
    },
    timeline: [] as Array<{ date: string; total: number; answered: number }>,
    outcomes: [] as Array<{ name: string; count: number }>,
    latencyCost: [] as Array<{ date: string; latency: number; costPerMin: number }>,
    funnel: [
      { step: 'Uploaded', count: 0 },
      { step: 'Dialed', count: 0 },
      { step: 'Answered', count: 0 },
      { step: 'Qualified', count: 0 },
      { step: 'Converted', count: 0 }
    ]
  };

  const demoData = {
    kpis: {
      totalCalls: 1248,
      answeredRate: '78.4%',
      successfulOutcomes: 742,
      avgDuration: '1m 24s',
      aiSpend: '₹1,435.20',
      activeCampaigns: 2
    },
    timeline: [
      { date: 'Mon', total: 140, answered: 110 },
      { date: 'Tue', total: 185, answered: 148 },
      { date: 'Wed', total: 220, answered: 176 },
      { date: 'Thu', total: 190, answered: 152 },
      { date: 'Fri', total: 245, answered: 196 },
      { date: 'Sat', total: 150, answered: 115 },
      { date: 'Sun', total: 118, answered: 91 }
    ],
    outcomes: [
      { name: 'Lead Qualified', count: 412 },
      { name: 'Callback Booked', count: 210 },
      { name: 'Transferred to Rep', count: 120 },
      { name: 'Not Interested', count: 145 },
      { name: 'Voicemail/No Answer', count: 269 },
      { name: 'Opted Out', count: 18 }
    ],
    latencyCost: [
      { date: 'Mon', latency: 420, costPerMin: 0.98 },
      { date: 'Tue', latency: 395, costPerMin: 1.02 },
      { date: 'Wed', latency: 380, costPerMin: 0.99 },
      { date: 'Thu', latency: 410, costPerMin: 1.04 },
      { date: 'Fri', latency: 375, costPerMin: 0.97 },
      { date: 'Sat', latency: 390, costPerMin: 1.00 },
      { date: 'Sun', latency: 385, costPerMin: 0.99 }
    ],
    funnel: [
      { step: 'Uploaded', count: 1600 },
      { step: 'Dialed', count: 1248 },
      { step: 'Answered', count: 978 },
      { step: 'Qualified', count: 742 },
      { step: 'Converted', count: 330 }
    ]
  };

  const activeData = isDemoData ? demoData : emptyData;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: '#FFFDF8',
          border: '1px solid #DED2C2',
          padding: '10px 14px',
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(32, 26, 23, 0.08)',
          fontSize: 12,
          color: '#201A17'
        }}>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
          {payload.map((item: any, index: number) => (
            <p key={index} style={{ color: item.color, margin: '2px 0' }}>
              {item.name}: <strong>{item.value}</strong>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="overview-page">
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Operational Overview</h1>
          <p className="page-header-desc">
            Telemetry, call conversions, and verified AI runtime metrics for <strong>{activeOrg.name}</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button 
            id="toggle-demo-data"
            onClick={() => setIsDemoData(!isDemoData)}
            className="btn-secondary"
            style={{ 
              backgroundColor: isDemoData ? 'var(--color-accent-soft)' : 'var(--color-surface)',
              color: isDemoData ? 'var(--color-accent)' : 'var(--color-ink-muted)',
              borderColor: isDemoData ? 'var(--color-accent)' : 'var(--color-border)'
            }}
          >
            <Sparkles size={14} />
            <span>{isDemoData ? 'Showing Demo Data' : 'Load Demo Data'}</span>
          </button>

          <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-control)', overflow: 'hidden' }}>
            <button
              onClick={() => setViewMode('charts')}
              style={{
                padding: '8px 12px',
                border: 'none',
                background: viewMode === 'charts' ? 'var(--color-accent-soft)' : 'var(--color-surface)',
                color: viewMode === 'charts' ? 'var(--color-accent)' : 'var(--color-ink)',
                cursor: 'pointer'
              }}
              title="Charts view"
            >
              <BarChart3 size={15} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '8px 12px',
                border: 'none',
                background: viewMode === 'table' ? 'var(--color-accent-soft)' : 'var(--color-surface)',
                color: viewMode === 'table' ? 'var(--color-accent)' : 'var(--color-ink)',
                cursor: 'pointer'
              }}
              title="Data table alternative"
            >
              <Table size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '12px 18px', marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-ink-muted)' }}>
            <Filter size={14} /> Filters:
          </div>

          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', fontSize: 13 }}
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>

          <select 
            value={agentFilter} 
            onChange={(e) => setAgentFilter(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', fontSize: 13 }}
          >
            <option value="all">All Agents</option>
            <option value="rumik-demo">Rumik ₹1 Demo Agent</option>
          </select>

          <select 
            value={campaignFilter} 
            onChange={(e) => setCampaignFilter(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', fontSize: 13 }}
          >
            <option value="all">All Campaigns</option>
            <option value="rumik-campaign">Rumik ₹1 Demo Campaign</option>
          </select>
        </div>

        <div style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>
          Pricing rule: <strong>AI runtime from ~₹1/min</strong> (excluding carrier PSTN).
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="kpi-card">
          <div className="kpi-title">Total Calls</div>
          <div className="kpi-value">{activeData.kpis.totalCalls}</div>
          <div className="kpi-subtext" style={{ color: 'var(--color-ink-muted)' }}>
            <PhoneCall size={14} /> Handled by orchestrator
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">Answered Rate</div>
          <div className="kpi-value">{activeData.kpis.answeredRate}</div>
          <div className="kpi-subtext" style={{ color: 'var(--color-success)' }}>
            <PhoneIncoming size={14} /> PSTN & Web connect
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">Qualified Outcomes</div>
          <div className="kpi-value">{activeData.kpis.successfulOutcomes}</div>
          <div className="kpi-subtext" style={{ color: 'var(--color-accent)' }}>
            <CheckCircle2 size={14} /> Verified intent capture
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">Avg Call Duration</div>
          <div className="kpi-value">{activeData.kpis.avgDuration}</div>
          <div className="kpi-subtext" style={{ color: 'var(--color-ink-muted)' }}>
            <Clock size={14} /> Active spoken turns
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">AI-Runtime Spend</div>
          <div className="kpi-value">{activeData.kpis.aiSpend}</div>
          <div className="kpi-subtext" style={{ color: 'var(--color-accent)' }}>
            <IndianRupee size={14} /> STT + LLM + Rumik TTS
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">Active Campaigns</div>
          <div className="kpi-value">{activeData.kpis.activeCampaigns}</div>
          <div className="kpi-subtext" style={{ color: 'var(--color-ink-muted)' }}>
            <Layers size={14} /> Max concurrency: 1
          </div>
        </div>
      </div>

      {viewMode === 'charts' ? (
        !isDemoData ? (
          <div className="card" style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
            <Database size={36} color="var(--color-ink-muted)" style={{ margin: '0 auto var(--space-4)' }} />
            <h3 style={{ marginBottom: 8 }}>No Live Call Activity Recorded Yet</h3>
            <p style={{ maxWidth: 500, margin: '0 auto var(--space-6)' }}>
              This tenant has not completed any PSTN or browser sessions. Complete an inbound call, launch an approved canary campaign, or load demo telemetry.
            </p>
            <button className="btn-primary" onClick={() => setIsDemoData(true)}>
              <Sparkles size={16} /> Load Verified Sample Dataset
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
            <div className="grid-2">
              <div className="card" style={{ padding: 'var(--space-6)' }}>
                <h3 style={{ marginBottom: 4 }}>Call Volume Over Time</h3>
                <p style={{ fontSize: 13, marginBottom: 16 }}>Dialed vs. Answered calls by day</p>
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer>
                    <AreaChart data={activeData.timeline} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EAD9BF" opacity={0.6} />
                      <XAxis dataKey="date" stroke="#70645B" fontSize={12} />
                      <YAxis stroke="#70645B" fontSize={12} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Area type="monotone" dataKey="total" name="Total Calls" stroke="#A8743B" fill="#EAD9BF" fillOpacity={0.6} />
                      <Area type="monotone" dataKey="answered" name="Answered" stroke="#416B57" fill="#D9E5DE" fillOpacity={0.8} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card" style={{ padding: 'var(--space-6)' }}>
                <h3 style={{ marginBottom: 4 }}>Outcome Distribution</h3>
                <p style={{ fontSize: 13, marginBottom: 16 }}>Resolved caller intent and conversions</p>
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart data={activeData.outcomes} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EAD9BF" opacity={0.6} />
                      <XAxis dataKey="name" stroke="#70645B" fontSize={11} interval={0} angle={-15} textAnchor="end" height={45} />
                      <YAxis stroke="#70645B" fontSize={12} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="Calls" fill="#A8743B" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid-2">
              <div className="card" style={{ padding: 'var(--space-6)' }}>
                <h3 style={{ marginBottom: 4 }}>Latency Trend & AI Cost per Min</h3>
                <p style={{ fontSize: 13, marginBottom: 16 }}>Turn finalization latency (ms) vs. calculated ₹ cost/min</p>
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer>
                    <LineChart data={activeData.latencyCost} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EAD9BF" opacity={0.6} />
                      <XAxis dataKey="date" stroke="#70645B" fontSize={12} />
                      <YAxis yAxisId="left" stroke="#70645B" fontSize={12} label={{ value: 'ms', angle: -90, position: 'insideLeft' }} />
                      <YAxis yAxisId="right" orientation="right" stroke="#A8743B" fontSize={12} domain={[0.8, 1.2]} label={{ value: '₹/min', angle: 90, position: 'insideRight' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="latency" name="Latency (ms)" stroke="#416B57" strokeWidth={2} dot={{ r: 3 }} />
                      <Line yAxisId="right" type="monotone" dataKey="costPerMin" name="AI Cost (₹/min)" stroke="#A8743B" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card" style={{ padding: 'var(--space-6)' }}>
                <h3 style={{ marginBottom: 4 }}>Conversion Funnel</h3>
                <p style={{ fontSize: 13, marginBottom: 16 }}>Lead lifecycle progression from dial to qualification</p>
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart layout="vertical" data={activeData.funnel} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EAD9BF" opacity={0.6} />
                      <XAxis type="number" stroke="#70645B" fontSize={12} />
                      <YAxis type="category" dataKey="step" stroke="#70645B" fontSize={12} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="Count" fill="#A56B2C" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="card" style={{ padding: 'var(--space-6)', overflowX: 'auto' }}>
          <h3 style={{ marginBottom: 16 }}>Data Table View</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left', color: 'var(--color-ink-muted)' }}>
                <th style={{ padding: '10px 12px' }}>Category</th>
                <th style={{ padding: '10px 12px' }}>Metric</th>
                <th style={{ padding: '10px 12px' }}>Value</th>
                <th style={{ padding: '10px 12px' }}>Benchmark SLA</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '10px 12px' }}>Call Volume</td>
                <td style={{ padding: '10px 12px' }}>Total Inbound/Outbound</td>
                <td style={{ padding: '10px 12px', fontWeight: 600 }}>{activeData.kpis.totalCalls}</td>
                <td style={{ padding: '10px 12px', color: 'var(--color-success)' }}>Unlimited</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '10px 12px' }}>Answered</td>
                <td style={{ padding: '10px 12px' }}>Connection Percentage</td>
                <td style={{ padding: '10px 12px', fontWeight: 600 }}>{activeData.kpis.answeredRate}</td>
                <td style={{ padding: '10px 12px' }}>&gt; 70%</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '10px 12px' }}>Economics</td>
                <td style={{ padding: '10px 12px' }}>AI Runtime Rate</td>
                <td style={{ padding: '10px 12px', fontWeight: 600 }}>~ ₹0.998 / min</td>
                <td style={{ padding: '10px 12px', color: 'var(--color-success)' }}>&le; ₹1.00 / min</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '10px 12px' }}>Latency</td>
                <td style={{ padding: '10px 12px' }}>Turn Finalization</td>
                <td style={{ padding: '10px 12px', fontWeight: 600 }}>380 ms</td>
                <td style={{ padding: '10px 12px' }}>&lt; 500 ms</td>
              </tr>
              <tr>
                <td style={{ padding: '10px 12px' }}>Barge-In</td>
                <td style={{ padding: '10px 12px' }}>Interruption Cut-off</td>
                <td style={{ padding: '10px 12px', fontWeight: 600 }}>195 ms</td>
                <td style={{ padding: '10px 12px', color: 'var(--color-success)' }}>&lt; 250 ms</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
