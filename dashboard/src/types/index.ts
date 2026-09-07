// ==============================================================================
// Replora Voice Studio — TypeScript Type Definitions
// ==============================================================================

export type Role = 'owner' | 'admin' | 'operator' | 'analyst' | 'viewer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  parentName?: string | null;
  createdAt: string;
  concurrencyLimit: number;
}

export interface Membership {
  id: string;
  organizationId: string;
  userId: string;
  role: Role;
  createdAt: string;
}

export interface VoBizConfig {
  authId: string;
  authToken: string;
  number: string;
  applicationId: string;
  answerUrl: string;
  method: 'POST';
  status: 'connected' | 'mock_connected' | 'degraded' | 'blocked' | 'empty';
  lastVerifiedAt?: string;
}

export interface VoiceLinkConfig {
  resellerUser: string;
  resellerPass: string;
  did: string;
  codec: 'PCMA' | 'PCMU';
  sampleRate: 8000;
  status: 'connected' | 'carrier_blocked' | 'empty';
  channels: number;
  lastVerifiedAt?: string;
}

export interface WorkflowNode {
  id: string;
  name: string;
  type: 'greeting' | 'intent' | 'qualify' | 'outcome' | 'transfer' | 'end';
  prompt: string;
  allowInterrupt: boolean;
  nextNodes: string[];
}

export interface AgentWorkflow {
  id: string;
  organizationId: string;
  name: string;
  role: string;
  language: string;
  isPublished: boolean;
  publishedVersion: number;
  sttProvider: 'deepgram';
  sttModel: 'nova-3-general';
  llmProvider: 'groq' | 'gemini';
  llmModel: string;
  ttsProvider: 'rumik';
  ttsVoice: 'mulberry';
  nodes: WorkflowNode[];
  createdAt: string;
  updatedAt: string;
}

export interface CampaignContact {
  phone_number: string;
  customer_name: string;
  purpose: string;
  language: string;
  timezone: string;
  notes?: string;
  status: 'pending' | 'canary_passed' | 'dialed' | 'answered' | 'qualified' | 'failed' | 'opted_out';
}

export interface Campaign {
  id: string;
  organizationId: string;
  name: string;
  status: 'draft' | 'canary_running' | 'active' | 'paused' | 'completed';
  agentId: string;
  concurrencyLimit: number;
  circuitBreakerThreshold: number; // e.g. 50%
  totalRows: number;
  dialedCount: number;
  successCount: number;
  contacts: CampaignContact[];
  createdAt: string;
}

export interface AuditLog {
  id: string;
  organizationId: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  details: string;
  ipAddress: string;
  timestamp: string;
}

export interface DiagnosticMetrics {
  connectTimeMs: number;
  firstPartialTranscriptMs: number;
  turnFinalizationMs: number;
  ttftMs: number; // Time to first token
  ttsFirstAudioMs: number;
  bargeInStopLatencyMs: number;
}

export type ConversationState = 
  | 'idle' 
  | 'requesting_permission' 
  | 'connecting' 
  | 'listening' 
  | 'thinking' 
  | 'speaking' 
  | 'reconnecting' 
  | 'error' 
  | 'ended';

export interface TranscriptTurn {
  id: string;
  sender: 'user' | 'agent' | 'system';
  text: string;
  isInterim?: boolean;
  timestamp: string;
  latencyMs?: number;
}
