import { EventProject, Supplier, CountryBudget, BrainstormIdea, TeamFeedback, ChatMessage, ActivityLog, User, HandoverRecord, UserRole, KnowledgeItem, AutomatedIngestLog, Contact } from "../types";

const PROJECTS_KEY = 'deriv_event_projects';
const SUPPLIERS_KEY = 'deriv_suppliers';
const COUNTRY_BUDGETS_KEY = 'deriv_country_budgets';
const BRAINSTORM_KEY = 'deriv_brainstorming';
const FEEDBACK_KEY = 'deriv_feedback';
const CHAT_KEY = 'deriv_chat';
const LOGS_KEY = 'deriv_activity_logs';
const USERS_KEY = 'deriv_users';
const HANDOVER_KEY = 'deriv_handovers';
const CURRENT_USER_KEY = 'deriv_current_user';
const KNOWLEDGE_KEY = 'deriv_knowledge';
const CONTACTS_KEY = 'deriv_contacts';

// Seed data
const initialContacts: Contact[] = [
  { id: 'c1', name: 'Global AV Solutions', email: 'support@globalav.com', category: 'Supplier', notes: 'Primary AV vendor for Europe' },
  { id: 'c2', name: 'Grand Hyatt Dubai', email: 'events.dubai@hyatt.com', category: 'Hotel', notes: 'Preferred partner for MEA' },
  { id: 'c3', name: 'Internal Travel Desk', email: 'travel.desk@deriv.com', category: 'Travel Desk', notes: 'Internal flights and visas' },
  { id: 'c4', name: 'Skyline Logistics', email: 'quotes@skylinelogistics.net', category: 'Supplier' },
  { id: 'c5', name: 'Hilton Kuala Lumpur', email: 'kl.sales@hilton.com', category: 'Hotel' }
];

// Seed data
const initialKnowledgeItems: KnowledgeItem[] = [
  {
    id: 'k1',
    category: 'Q&A',
    title: 'VVIP Flight Booking Policy (SOP)',
    content: 'All VVIP flight bookings must be done through the internal Travel Desk. Economy class is default for short-haul, Business for long-haul (>6h). Executive approval required for First Class.',
    author: 'Sarah Connor',
    date: '2026-03-20',
    tags: ['Technical', 'SOP']
  },
  {
    id: 'k2',
    category: 'Company Update',
    title: 'Regional Budget Limits 2026',
    content: 'Malaysia: USD 250k, Singapore: USD 400k, Dubai: USD 500k. Any project exceeding these requires HOD sign-off before vendor contracting.',
    author: 'Jean Damour',
    date: '2026-04-10',
    tags: ['Policy', 'Finance', 'SOP']
  },
  {
    id: 'k3',
    category: 'Q&A',
    title: 'Hotel Damage Deposit Protocol (SOP)',
    content: 'EPMs must ensure the hotel waives individual guest deposits where possible. If not possible, Deriv will provide a master guarantee letter for all rooms.',
    author: 'John Doe',
    date: '2026-04-12',
    tags: ['Guidelines', 'SOP']
  }
];

// Seed data
const initialUsers: User[] = [
  { id: '1', name: 'Jean Damour', email: 'jean.damour@regentmarkets.com', role: 'EPM Team Lead', status: 'active', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jean', settings: { notificationsEnabled: true, theme: 'modern' } },
  { id: '2', name: 'Sarah Connor', email: 'sarah.c@deriv.com', role: 'EPM Senior Executive', status: 'active', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', settings: { notificationsEnabled: true, theme: 'corporate' } },
  { id: '3', name: 'John Doe', email: 'john.doe@deriv.com', role: 'EPM Manager', status: 'active', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John', settings: { notificationsEnabled: false, theme: 'glass' } },
  { id: '4', name: 'James Smith', email: 'james.s@deriv.com', role: 'EPM Team Lead', status: 'active', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James', settings: { notificationsEnabled: true, theme: 'modern' } },
  { id: '5', name: 'Emily Blunt', email: 'emily.b@deriv.com', role: 'EPM HOD', status: 'active', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily', settings: { notificationsEnabled: true, theme: 'modern', primaryCountry: 'Malaysia' } },
];

// Seed data
const initialCountryBudgets: CountryBudget[] = [
  { country: 'United Arab Emirates', annualBudget: 500000, remainingBudget: 350000, maxTrips: 12, tripsCount: 4 },
  { country: 'Thailand', annualBudget: 300000, remainingBudget: 200000, maxTrips: 8, tripsCount: 3 },
  { country: 'Singapore', annualBudget: 400000, remainingBudget: 400000, maxTrips: 10, tripsCount: 0 },
  { country: 'Malaysia', annualBudget: 250000, remainingBudget: 150000, maxTrips: 6, tripsCount: 2 },
];

const initialSuppliers: Supplier[] = [
// ... existing
];

const initialProjects: EventProject[] = [
  {
    id: 'p1',
    title: 'VVIP Partner Retreat - Dubai',
    country: 'United Arab Emirates',
    city: 'Dubai',
    startDate: '2026-06-15',
    endDate: '2026-06-20',
    guestCount: 50,
    type: 'Appreciation Event',
    status: 'in_progress',
    epmName: 'Jean Damour',
    criteria: 'Ultra-luxury, high privacy, dedicated AV support.',
    budget: {
      id: 'b1',
      total: 150000,
      currency: 'USD',
      items: [
        { id: 'bi1', category: 'Venue', description: 'Burj Al Arab Ballroom', estimatedCost: 80000, actualCost: 88500 }, // Overcharge
        { id: 'bi2', category: 'Catering', description: 'Standard Menu', estimatedCost: 40000, actualCost: 42000 },
        { id: 'bi3', category: 'AV', description: 'Stage & Lighting', estimatedCost: 30000, actualCost: 30000 }
      ]
    },
    itinerary: {
      id: 'i1',
      days: [
        { dayNumber: 1, activities: [{ id: 'a1', time: '14:00', description: 'Arrival & Check-in', location: 'Hotel Lobby' }] }
      ]
    }
  },
  {
    id: 'p2',
    title: 'EPM Skill-Up Conference 2026',
    country: 'Malaysia',
    city: 'Kuala Lumpur',
    startDate: '2026-08-10',
    endDate: '2026-08-12',
    guestCount: 150,
    type: 'Conference',
    status: 'drafted',
    epmName: 'Sarah Connor',
    criteria: 'Interactive sessions, digital kiosks, hybrid capability.',
    budget: {
      id: 'b2',
      total: 200000,
      currency: 'USD',
      items: [
        { id: 'bi4', category: 'Agency', description: 'Global Events Agency Fee', estimatedCost: 50000, actualCost: 75000 }, // Massive 50% variance
        { id: 'bi5', category: 'Venue', description: 'Shangri-La KL', estimatedCost: 100000, actualCost: 110000 }
      ]
    }
  }
];

export const db = {
  getProjects: (): EventProject[] => {
    const data = localStorage.getItem(PROJECTS_KEY);
    if (!data) {
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(initialProjects));
      return initialProjects;
    }
    return JSON.parse(data);
  },
  
  saveProject: (project: EventProject) => {
    const projects = db.getProjects();
    const index = projects.findIndex(p => p.id === project.id);
    if (index >= 0) {
      projects[index] = project;
    } else {
      projects.push(project);
    }
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  },
  
  deleteProject: (id: string) => {
    const projects = db.getProjects().filter(p => p.id !== id);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  },
  
  getSuppliers: (): Supplier[] => {
    const data = localStorage.getItem(SUPPLIERS_KEY);
    return data ? JSON.parse(data) : [];
  },

  getCountryBudgets: (): CountryBudget[] => {
    const data = localStorage.getItem(COUNTRY_BUDGETS_KEY);
    if (!data) {
      localStorage.setItem(COUNTRY_BUDGETS_KEY, JSON.stringify(initialCountryBudgets));
      return initialCountryBudgets;
    }
    return JSON.parse(data);
  },

  getBrainstormIdeas: (): BrainstormIdea[] => {
    const data = localStorage.getItem(BRAINSTORM_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveIdea: (idea: BrainstormIdea) => {
    const ideas = db.getBrainstormIdeas();
    ideas.push(idea);
    localStorage.setItem(BRAINSTORM_KEY, JSON.stringify(ideas));
  },

  getFeedback: (): TeamFeedback[] => {
    const data = localStorage.getItem(FEEDBACK_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveFeedback: (f: TeamFeedback) => {
    const feedback = db.getFeedback();
    feedback.push(f);
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(feedback));
  },

  getChat: (): ChatMessage[] => {
    const data = localStorage.getItem(CHAT_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveMessage: (msg: ChatMessage) => {
    const chat = db.getChat();
    chat.push(msg);
    localStorage.setItem(CHAT_KEY, JSON.stringify(chat));
  },

  getActivityLogs: (): ActivityLog[] => {
    const data = localStorage.getItem(LOGS_KEY);
    return data ? JSON.parse(data) : [];
  },

  logActivity: (log: ActivityLog) => {
    const logs = db.getActivityLogs();
    logs.push(log);
    // Keep only last 1000 logs
    if (logs.length > 1000) logs.shift();
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  },

  getYesterdaysLogs: (): ActivityLog[] => {
    const logs = db.getActivityLogs();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    return logs.filter(l => {
      const d = new Date(l.timestamp);
      return d >= yesterday;
    });
  },

  // User Management
  getUsers: (): User[] => {
    const data = localStorage.getItem(USERS_KEY);
    if (!data) {
      localStorage.setItem(USERS_KEY, JSON.stringify(initialUsers));
      return initialUsers;
    }
    return JSON.parse(data);
  },

  saveUser: (user: User) => {
    const users = db.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index >= 0) {
      users[index] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(CURRENT_USER_KEY);
    return data ? JSON.parse(data) : null;
  },

  setCurrentUser: (user: User) => {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  },

  login: (email: string, pass: string): User | null => {
    const users = db.getUsers();
    let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    // Strategic JIT (Just-In-Time) Provisioning
    // Simulates syncing with the Global Talent Ledger for corporate emails
    if (!user && (email.includes('@regentmarkets.com') || email.includes('@deriv.com')) && pass === 'deriv2026') {
      const nameParts = email.split('@')[0].split('.');
      const formattedName = nameParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
      
      user = {
        id: `jit_${Math.random().toString(36).substr(2, 9)}`,
        name: formattedName,
        email: email,
        role: 'EPM Executive', // Default base level, elevated via Onboarding
        status: 'active',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${formattedName}`,
        settings: {
          notificationsEnabled: true,
          theme: 'modern'
        }
      };
      db.saveUser(user);
    }

    if (user && pass === 'deriv2026') {
      db.setCurrentUser(user);
      return user;
    }
    return null;
  },

  logout: () => {
    localStorage.removeItem(CURRENT_USER_KEY);
  },

  // Automated Intelligence Ledger
  // Challenge Solution: Ingesting data from email/chat metadata automatically
  // to remove the manual logging burden from EPMs.
  ingestAutomatedCommLog: (log: AutomatedIngestLog) => {
    const activityLog: ActivityLog = {
      id: `auto_${Math.random().toString(36).substr(2, 9)}`,
      epmName: log.epmName,
      action: 'Automated Comm Sync',
      timestamp: log.timestamp,
      details: `Project Intelligence Ingested: [${log.channel.toUpperCase()}] ${log.summary}`
    };
    db.logActivity(activityLog);
  },

  getHandovers: (): HandoverRecord[] => {
    const data = localStorage.getItem(HANDOVER_KEY);
    return data ? JSON.parse(data) : [];
  },

  createHandover: (handover: HandoverRecord) => {
    const handovers = db.getHandovers();
    handovers.push(handover);
    localStorage.setItem(HANDOVER_KEY, JSON.stringify(handovers));

    // Also update project assigned to epm pending?
    // In this simplified version, we just log it.
  },

  updateHandoverStatus: (id: string, status: HandoverRecord['status'], absenceUpdate?: string) => {
    const handovers = db.getHandovers();
    const index = handovers.findIndex(h => h.id === id);
    if (index >= 0) {
      handovers[index].status = status;
      if (absenceUpdate) {
        handovers[index].absenceUpdate = absenceUpdate;
      }
      localStorage.setItem(HANDOVER_KEY, JSON.stringify(handovers));

      // If accepted, actually transfer the project
      if (status === 'accepted') {
        const h = handovers[index];
        const projects = db.getProjects();
        const pIndex = projects.findIndex(p => p.id === h.projectId);
        if (pIndex >= 0) {
          projects[pIndex].epmName = h.toEpm;
          localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
          
          // If it was a return handover, we might want to update the original user status but typically that's manual
        }
      }
    }
  },
  
  // Knowledge Hub
  getKnowledgeItems: (): KnowledgeItem[] => {
    const data = localStorage.getItem(KNOWLEDGE_KEY);
    if (!data) {
      localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify(initialKnowledgeItems));
      return initialKnowledgeItems;
    }
    return JSON.parse(data);
  },

  saveKnowledgeItem: (item: KnowledgeItem) => {
    const items = db.getKnowledgeItems();
    const index = items.findIndex(i => i.id === item.id);
    if (index >= 0) {
      items[index] = item;
    } else {
      items.push(item);
    }
    localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify(items));
  },

  deleteKnowledgeItem: (id: string) => {
    const items = db.getKnowledgeItems().filter(i => i.id !== id);
    localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify(items));
  },
  
  // Contact Management
  getContacts: (): Contact[] => {
    const data = localStorage.getItem(CONTACTS_KEY);
    if (!data) {
      localStorage.setItem(CONTACTS_KEY, JSON.stringify(initialContacts));
      return initialContacts;
    }
    return JSON.parse(data);
  },

  saveContact: (contact: Contact) => {
    const contacts = db.getContacts();
    const index = contacts.findIndex(c => c.id === contact.id);
    if (index >= 0) {
      contacts[index] = contact;
    } else {
      contacts.push(contact);
    }
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
  },

  deleteContact: (id: string) => {
    const contacts = db.getContacts().filter(c => c.id !== id);
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
  }
};
