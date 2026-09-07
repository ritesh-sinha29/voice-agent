'use client';

import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Mic, 
  PhoneCall, 
  Bot, 
  Megaphone, 
  Settings, 
  Building2, 
  ChevronDown, 
  User as UserIcon, 
  ShieldCheck,
  Check
} from 'lucide-react';
import { Organization, User } from '../types';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeOrg: Organization;
  organizations: Organization[];
  currentUser: User;
  onOrgSwitch: (org: Organization) => void;
}

export default function Header({ 
  activeTab, 
  setActiveTab, 
  activeOrg, 
  organizations, 
  currentUser,
  onOrgSwitch
}: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'talk', label: 'Talk to it', icon: Mic },
    { id: 'telephony', label: 'Telephony', icon: PhoneCall },
    { id: 'agents', label: 'Agents', icon: Bot },
    { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
    { id: 'settings', label: 'Settings & Access', icon: Settings }
  ];

  const handleSelectOrg = (org: Organization) => {
    setDropdownOpen(false);
    if (org.id !== activeOrg.id) {
      onOrgSwitch(org);
    }
  };

  return (
    <header className="header-nav">
      <div className="brand-section">
        <div className="logo-container">
          <span className="brand-title">Replora</span>
          <span className="brand-tag">₹1 AI Voice Agent</span>
        </div>

        <nav className="nav-links" aria-label="Main Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="header-right">
        {/* Organization / Sub-account switcher */}
        <div style={{ position: 'relative' }}>
          <button 
            id="org-switcher-btn"
            className="org-selector-btn"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-expanded={dropdownOpen}
          >
            <Building2 size={15} color="var(--color-accent)" />
            <span style={{ fontWeight: 600 }}>{activeOrg.name}</span>
            {activeOrg.parentId && (
              <span style={{ fontSize: 11, color: 'var(--color-ink-muted)' }}>(Sub)</span>
            )}
            <ChevronDown size={14} />
          </button>

          {dropdownOpen && (
            <div 
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 6,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-control)',
                boxShadow: 'var(--shadow-lg)',
                minWidth: 260,
                zIndex: 100,
                padding: '6px 0'
              }}
            >
              <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--color-border)', fontSize: 12, color: 'var(--color-ink-muted)' }}>
                Switch Workspace / Sub-Account
              </div>
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleSelectOrg(org)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '8px 14px',
                    border: 'none',
                    background: org.id === activeOrg.id ? 'var(--color-surface-muted)' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: 'var(--color-ink)'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: org.id === activeOrg.id ? 600 : 400, fontSize: 13 }}>
                      {org.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-ink-muted)' }}>
                      {org.parentId ? `Sub-account of ${org.parentName}` : 'Parent Organization'}
                    </div>
                  </div>
                  {org.id === activeOrg.id && <Check size={14} color="var(--color-accent)" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User profile & Role Badge */}
        <div className="user-badge" id="user-role-badge">
          <UserIcon size={14} color="var(--color-ink-muted)" />
          <span style={{ fontWeight: 500 }}>{currentUser.name}</span>
          <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
            <ShieldCheck size={12} />
            {currentUser.role}
          </span>
        </div>
      </div>
    </header>
  );
}
