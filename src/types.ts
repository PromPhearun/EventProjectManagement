/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Supplier {
  id: string;
  name: string;
  type: 'hotel' | 'agency' | 'visa' | 'vendor' | 'other';
  country: string;
  city: string;
  rating: number; // 0-5
  reviews: Review[];
  contactEmail?: string;
  website?: string;
  criteria: string[]; // e.g. ["luxury", "budget-friendly", "large-groups"]
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  comment: string;
  rating: number;
  date: string;
}

export interface Budget {
  id: string;
  items: BudgetItem[];
  total: number;
  currency: string;
}

export interface BudgetItem {
  id: string;
  category: string;
  description: string;
  estimatedCost: number;
  actualCost?: number;
}

export interface Itinerary {
  id: string;
  days: DayPlan[];
}

export interface DayPlan {
  dayNumber: number;
  activities: Activity[];
}

export interface Activity {
  id: string;
  time: string;
  description: string;
  location: string;
  supplierId?: string;
}

export type EventType = 
  | 'Seminar'
  | 'Van Project'
  | 'Van (Fly) Project'
  | 'Giveaway'
  | 'Merchandise'
  | 'Partner Led-Sponsorship'
  | 'Conference'
  | 'Appreciation Event'
  | 'Expo (Delegate)'
  | 'Expo';

export interface CountryBudget {
  country: string;
  annualBudget: number;
  remainingBudget: number;
  maxTrips: number;
  tripsCount: number;
}

export interface BrainstormIdea {
  id: string;
  title: string;
  content: string;
  author: string;
  date: string;
  type: 'new-event' | 'improvement' | 'research';
  researchData?: ResearchData;
}

export interface ResearchData {
  summary: string;
  flights: any[];
  aiInsights: {
    gemini: string;
    claude: string;
    chatgpt: string;
  };
  marketTrends: string[];
  visaInfo?: {
    requirements: string;
    processingTime: string;
    cost: string;
  };
  sources: string[];
}

export interface TeamFeedback {
  id: string;
  targetId: string; // supplierId or eventId (for self-rating)
  type: 'supplier' | 'self';
  rating: number;
  comment: string;
  author: string;
  date: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
}

export interface TLFeedback {
  id: string;
  eventId: string;
  tlRemark: string;
  tlRating: number;
  memberReflection: string;
  memberRating: number;
  managerRemark?: string;
  managerRating?: number;
  status: 'pending' | 'reviewed';
}

export interface ApprovalTemplate {
  id: string;
  tripLeadName: string;
  tripLeadSection: string;
  epmSection: string;
  budgetStatus: 'draft' | 'under_review' | 'finalized';
  itineraryStatus: 'draft' | 'under_review' | 'finalized';
  sharedWith: string[]; // List of user emails or roles
  lastUpdated: string;
}

export interface Invoice {
  id: string;
  vendorName: string;
  amount: number;
  currency: string;
  date: string;
  fileName: string;
  status: 'pending' | 'submitted' | 'approved' | 'sage_uploaded';
  budgetItemId?: string;
  sageIntacctId?: string;
}

export interface Reconciliation {
  id: string;
  finalBudgetTotal: number;
  variance: number;
  invoices: Invoice[];
  isFinalized: boolean;
}

export interface KnowledgeItem {
  id: string;
  category: 'Q&A' | 'Company Update';
  title: string;
  content: string;
  author: string;
  date: string;
  tags?: string[];
}

export interface CommunicationLog {
  id: string;
  recipient: 'Supplier' | 'Hotel' | 'Travel Desk';
  recipientEmail: string;
  subject: string;
  body: string;
  timestamp: string;
  status: 'draft' | 'sent';
  senderEpm: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  category: 'Supplier' | 'Hotel' | 'Travel Desk';
  notes?: string;
}

export interface EventProject {
  id: string;
  title: string;
  country: string;
  city: string;
  startDate: string;
  endDate: string;
  guestCount: number;
  type: EventType;
  status: 'pending' | 'drafted' | 'under_review' | 'approved' | 'in_progress' | 'on_hold' | 'reconciling' | 'completed';
  budget?: Budget;
  itinerary?: Itinerary;
  criteria: string; 
  clickUpId?: string;
  tlFeedback?: TLFeedback;
  approvalTemplate?: ApprovalTemplate;
  reconciliation?: Reconciliation;
  epmName: string;
  communications?: CommunicationLog[];
}

export type UserRole = 'EPM Executive' | 'EPM Senior Executive' | 'EPM Team Lead' | 'EPM Manager' | 'EPM HOD';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  avatar?: string;
  status: 'active' | 'on_leave' | 'resigned';
  settings?: UserSettings;
}

export interface UserSettings {
  primaryCountry?: string;
  theme?: 'modern' | 'glass' | 'corporate';
  notificationsEnabled: boolean;
}

export interface HandoverRecord {
  id: string;
  fromEpm: string;
  toEpm: string;
  projectId: string;
  projectTitle: string;
  reason: 'On Leave' | 'Resign' | 'Return Handover';
  briefing: string;
  shortBriefing?: string;
  visualData?: {
    taskCategories: { name: string; value: number }[];
    upcomingMilestones: { name: string; status: 'completed' | 'pending' | 'at_risk'; date: string }[];
  };
  absenceUpdate?: string; // Briefing provided by the person who covered the leave
  date: string;
  status: 'pending' | 'accepted' | 'completed';
  isAutomatedReturn?: boolean;
}

export interface ActivityLog {
  id: string;
  epmName: string;
  action: string;
  timestamp: string;
  details: string;
}

export interface PerformanceStats {
  period: string; // "Daily" | "Weekly" | ...
  completionRate: number;
  budgetAccuracy: number;
  eventsCount: number;
  trends: { date: string; value: number }[];
}

export interface AutomatedIngestLog {
  id: string;
  epmName: string;
  timestamp: string;
  channel: 'email' | 'slack' | 'whatsapp';
  summary: string;
}
