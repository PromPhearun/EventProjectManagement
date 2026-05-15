import { EventProject, Supplier } from "../types";

// Gemini API is now proxied via /api/ai routes in server.ts

export async function generateEventDraft(params: {
  country: string;
  city: string;
  guestCount: number;
  type: string;
  criteria: string;
  existingSuppliers: Supplier[];
  budgetLimit?: number;
}) {
  const response = await fetch('/api/ai/generate-event-draft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ params })
  });
  
  if (!response.ok) {
    throw new Error("Failed to generate event draft via server proxy");
  }

  return response.json();
}

export async function parseInvoice(base64File: string, mimeType: string) {
  const response = await fetch('/api/ai/parse-invoice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64File, mimeType })
  });

  if (!response.ok) {
    throw new Error("Failed to parse invoice via server proxy");
  }

  return response.json();
}

export async function conductResearch(topic: string) {
  const response = await fetch('/api/ai/conduct-research', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic })
  });

  if (!response.ok) {
    throw new Error("Failed to conduct research via server proxy");
  }

  return response.json();
}

export async function generateManagerSummary(activities: any[]) {
  const response = await fetch('/api/ai/generate-manager-summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activities })
  });

  if (!response.ok) {
    throw new Error("Failed to generate manager summary via server proxy");
  }

  const data = await response.json();
  return data.text;
}

export async function analyzePerformance(projects: any[], period: string) {
  const response = await fetch('/api/ai/analyze-performance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projects, period })
  });

  if (!response.ok) {
    throw new Error("Failed to analyze performance via server proxy");
  }

  return response.json();
}

export async function generateHandoverBriefing(project: EventProject) {
  const response = await fetch('/api/ai/generate-handover-briefing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project })
  });

  if (!response.ok) {
     // Fallback if proxy fails
     return {
      full: "Handover briefing generation failed. Please try again.",
      short: "Handover briefing unavailable.",
      visualData: {
        taskCategories: [{ name: 'Logistics', value: 33 }, { name: 'Finance', value: 33 }, { name: 'Ops', value: 34 }],
        upcomingMilestones: []
      }
    };
  }

  return response.json();
}

export async function generateSupplierAIInsight(supplier: Supplier) {
  const response = await fetch('/api/ai/generate-supplier-ai-insight', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ supplier })
  });

  if (!response.ok) {
    throw new Error("Failed to generate supplier insight via server proxy");
  }

  const data = await response.json();
  return data.text;
}

export async function getKnowledgeAnswer(query: string, knowledge: any[], userRole: string) {
  const response = await fetch('/api/ai/get-knowledge-answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, knowledge, userRole })
  });

  if (!response.ok) {
    throw new Error("Failed to get knowledge answer via server proxy");
  }

  const data = await response.json();
  return data.text;
}

export async function generateDailyEPMDigest(projects: EventProject[], userRole: string, userName: string) {
  const response = await fetch('/api/ai/generate-daily-epm-digest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projects, userRole, userName })
  });

  if (!response.ok) {
    throw new Error("Failed to generate digest via server proxy");
  }

  const data = await response.json();
  return data.text;
}

export async function detectBudgetVariance(project: EventProject) {
  const response = await fetch('/api/ai/detect-budget-variance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project })
  });

  if (!response.ok) {
    throw new Error("Failed to detect budget variance via server proxy");
  }

  const data = await response.json();
  return data.text;
}

export async function generateEPMTaskSummary(epmName: string, projects: EventProject[]) {
  const response = await fetch('/api/ai/generate-epm-task-summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ epmName, projects })
  });

  if (!response.ok) {
    throw new Error("Failed to generate task summary via server proxy");
  }

  const data = await response.json();
  return data.text;
}
