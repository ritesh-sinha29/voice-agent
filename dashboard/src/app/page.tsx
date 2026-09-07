'use client';

import React, { useState } from 'react';
import Header from '../components/Header';
import Overview from '../components/Overview';
import TalkToIt from '../components/TalkToIt';
import Telephony from '../components/Telephony';
import Agents from '../components/Agents';
import Campaigns from '../components/Campaigns';
import Settings from '../components/Settings';
import { Organization, User } from '../types';

export default function VoiceStudioPage() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isDemoData, setIsDemoData] = useState<boolean>(false);

  // Tenant-scoped organizations with parent-child hierarchy
  const [organizations] = useState<Organization[]>([
    {
      id: 'org_parent_alpha',
      name: 'Replora Communications HQ',
      slug: 'replora-hq',
      parentId: null,
      createdAt: '2026-08-01T00:00:00Z',
      concurrencyLimit: 20
    },
    {
      id: 'org_sub_beta',
      name: 'North Region Healthcare Sub-Account',
      slug: 'north-health',
      parentId: 'org_parent_alpha',
      parentName: 'Replora Communications HQ',
      createdAt: '2026-08-15T00:00:00Z',
      concurrencyLimit: 5
    },
    {
      id: 'org_sub_gamma',
      name: 'Customer Care Desk Sub-Account',
      slug: 'care-desk',
      parentId: 'org_parent_alpha',
      parentName: 'Replora Communications HQ',
      createdAt: '2026-09-01T00:00:00Z',
      concurrencyLimit: 10
    }
  ]);

  const [activeOrg, setActiveOrg] = useState<Organization>(organizations[0]);

  // Current authenticated user
  const [currentUser] = useState<User>({
    id: 'usr_owner_01',
    name: 'Ritesh Sinha',
    email: 'admin@rumik-demo.local',
    role: 'owner'
  });

  // Strict tenant context clearing on workspace switch
  const handleOrgSwitch = (newOrg: Organization) => {
    // Reset tenant-specific state
    setIsDemoData(false);
    setActiveOrg(newOrg);
    console.log(`[Multi-Tenancy] Switched to workspace: ${newOrg.name} (${newOrg.id}). Context cleared.`);
  };

  return (
    <div className="app-container">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeOrg={activeOrg}
        organizations={organizations}
        currentUser={currentUser}
        onOrgSwitch={handleOrgSwitch}
      />

      <main className="main-content">
        {activeTab === 'overview' && (
          <Overview 
            activeOrg={activeOrg} 
            isDemoData={isDemoData} 
            setIsDemoData={setIsDemoData} 
          />
        )}

        {activeTab === 'talk' && (
          <TalkToIt activeOrg={activeOrg} />
        )}

        {activeTab === 'telephony' && (
          <Telephony activeOrg={activeOrg} currentUser={currentUser} />
        )}

        {activeTab === 'agents' && (
          <Agents activeOrg={activeOrg} currentUser={currentUser} />
        )}

        {activeTab === 'campaigns' && (
          <Campaigns activeOrg={activeOrg} currentUser={currentUser} />
        )}

        {activeTab === 'settings' && (
          <Settings 
            activeOrg={activeOrg} 
            organizations={organizations} 
            currentUser={currentUser} 
          />
        )}
      </main>
    </div>
  );
}
