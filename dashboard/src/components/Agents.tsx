'use client';

import React, { useState } from 'react';
import { 
  Bot, 
  ArrowRight, 
  CheckCircle, 
  Sparkles, 
  Settings, 
  Volume2, 
  Zap, 
  ShieldCheck, 
  AlertCircle,
  Play
} from 'lucide-react';
import { AgentWorkflow, Organization, User } from '../types';

interface AgentsProps {
  activeOrg: Organization;
  currentUser: User;
}

export default function Agents({ activeOrg, currentUser }: AgentsProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  // Proven Rumik ₹1 Demo Agent configuration
  const [agent, setAgent] = useState<AgentWorkflow>({
    id: 'agent_rumik_01',
    organizationId: activeOrg.id,
    name: 'Rumik ₹1 Demo Agent',
    role: 'Warm Indian receptionist & lead qualifier (Multilingual)',
    language: 'multilingual (en-IN, hi-IN, Hinglish, gu-IN, pa-IN)',
    isPublished: true,
    publishedVersion: 4,
    sttProvider: 'deepgram',
    sttModel: 'nova-3-general',
    llmProvider: 'groq',
    llmModel: 'qwen-3.8-27b / llama-3.3',
    ttsProvider: 'rumik',
    ttsVoice: 'mulberry',
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: 'Just now',
    nodes: [
      {
        id: 'node_1',
        name: 'Start / Greeting',
        type: 'greeting',
        prompt: 'Namaste! Thanks for calling Replora. My name is Maya. How can I help you today?',
        allowInterrupt: true,
        nextNodes: ['node_2']
      },
      {
        id: 'node_2',
        name: 'Discover Intent',
        type: 'intent',
        prompt: 'I understand. Could you tell me a little more about what you are looking for so I can point you in the right direction?',
        allowInterrupt: true,
        nextNodes: ['node_3', 'node_optout']
      },
      {
        id: 'node_3',
        name: 'Answer or Qualify',
        type: 'qualify',
        prompt: 'Got it. We support fully self-hosted voice agents starting at around one rupee per minute for the AI pipeline. May I have your name and preferred contact number?',
        allowInterrupt: true,
        nextNodes: ['node_4']
      },
      {
        id: 'node_4',
        name: 'Capture Outcome',
        type: 'outcome',
        prompt: 'Thank you! I have noted down your details. Would you prefer our technical lead to call you back today or tomorrow morning?',
        allowInterrupt: true,
        nextNodes: ['node_5', 'node_transfer']
      },
      {
        id: 'node_transfer',
        name: 'Transfer / Callback',
        type: 'transfer',
        prompt: 'Sure, let me connect you with one of our engineers right away. Please hold on.',
        allowInterrupt: true,
        nextNodes: ['node_5']
      },
      {
        id: 'node_optout',
        name: 'Opt-Out Handling',
        type: 'end',
        prompt: 'I completely understand. I have removed your number from our contact list and you will not be called again. Have a good day!',
        allowInterrupt: false,
        nextNodes: []
      },
      {
        id: 'node_5',
        name: 'End & Confirmation',
        type: 'end',
        prompt: 'All set! We look forward to speaking soon. Thank you for your time and have a wonderful day ahead!',
        allowInterrupt: false,
        nextNodes: []
      }
    ]
  });

  const handlePublishWorkflow = () => {
    setIsPublishing(true);
    setTimeout(() => {
      setIsPublishing(false);
      setPublishSuccess(true);
      setAgent((prev) => ({
        ...prev,
        publishedVersion: prev.publishedVersion + 1,
        updatedAt: 'Just now'
      }));
      setTimeout(() => setPublishSuccess(false), 4000);
    }, 1200);
  };

  return (
    <div className="agents-page">
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 className="page-header-title">{agent.name}</h1>
            <span className="badge badge-success">
              <CheckCircle size={12} /> Published (v{agent.publishedVersion})
            </span>
          </div>
          <p className="page-header-desc">
            Production visual workflow with <strong>allow_interrupt=true</strong> on all speaking turns and multi-lingual persona (English, Hindi, Hinglish, Gujarati, Punjabi).
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            id="publish-agent-btn"
            className="btn-primary" 
            onClick={handlePublishWorkflow}
            disabled={isPublishing}
          >
            <Sparkles size={16} />
            {isPublishing ? 'Publishing Live Graph...' : 'Publish to Production'}
          </button>
        </div>
      </div>

      {publishSuccess && (
        <div className="card" style={{ padding: '12px 16px', marginBottom: 'var(--space-6)', backgroundColor: 'var(--color-success-soft)', borderColor: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <CheckCircle size={18} color="var(--color-success)" />
          <span style={{ fontSize: 13, color: 'var(--color-success)', fontWeight: 600 }}>
            Workflow published successfully! Active for all inbound VoBiz phone calls and live browser sessions.
          </span>
        </div>
      )}

      {/* Production Pipeline Specs */}
      <div className="card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontSize: '1.15rem', margin: 0 }}>BYOK Production Pipeline Specification</h3>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className="badge badge-accent">English (en-IN)</span>
            <span className="badge badge-accent">Hindi (hi-IN)</span>
            <span className="badge badge-accent">Hinglish</span>
            <span className="badge badge-accent">Gujarati (gu-IN)</span>
            <span className="badge badge-accent">Punjabi (pa-IN)</span>
          </div>
        </div>
        <div className="grid-4">
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-ink-muted)', marginBottom: 4 }}>Speech-to-Text (STT)</div>
            <div style={{ fontWeight: 600 }}>Deepgram Nova-3</div>
            <div style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>Multilingual (en, hi, gu, pa, Hinglish)</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-ink-muted)', marginBottom: 4 }}>LLM Brain (Production)</div>
            <div style={{ fontWeight: 600 }}>Groq Qwen 3.8 27B</div>
            <div style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>Llama 3.3 / Gemini as fallback</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-ink-muted)', marginBottom: 4 }}>Text-to-Speech (TTS)</div>
            <div style={{ fontWeight: 600 }}>Rumik Silk Mulberry</div>
            <div style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>24 kHz Multilingual Indic WAV</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-ink-muted)', marginBottom: 4 }}>Interruption Policy</div>
            <div style={{ fontWeight: 600, color: 'var(--color-success)' }}>Barge-In Enabled</div>
            <div style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>allow_interrupt=true</div>
          </div>
        </div>
      </div>

      {/* Visual Workflow Nodes */}
      <div className="card" style={{ padding: 'var(--space-6)' }}>
        <h3 style={{ marginBottom: 16, fontSize: '1.25rem' }}>Visual Conversational Flow Graph</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {agent.nodes.map((node, index) => (
            <div 
              key={node.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '16px 20px',
                backgroundColor: 'var(--color-surface-muted)',
                borderRadius: 'var(--radius-card)',
                border: '1px solid var(--color-border)'
              }}
            >
              <div 
                style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: '50%', 
                  backgroundColor: 'var(--color-accent-soft)', 
                  color: 'var(--color-accent)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 14
                }}
              >
                {index + 1}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <strong style={{ fontSize: 15 }}>{node.name}</strong>
                  <span className="badge badge-neutral" style={{ fontSize: 11 }}>
                    {node.type}
                  </span>
                  {node.allowInterrupt ? (
                    <span className="badge badge-success" style={{ fontSize: 11 }}>
                      allow_interrupt=true
                    </span>
                  ) : (
                    <span className="badge badge-neutral" style={{ fontSize: 11 }}>
                      final node (no interrupt)
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-ink)', fontStyle: 'italic' }}>
                  "{node.prompt}"
                </div>
              </div>

              {index < agent.nodes.length - 1 && (
                <ArrowRight size={18} color="var(--color-ink-muted)" style={{ opacity: 0.6 }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
