import express from "express";
import path from "path";
import { google } from "googleapis";
import cookieSession from "cookie-session";
import dotenv from "dotenv";
dotenv.config();

const app = express();
export default app; // Export for Vercel
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Gemini AI Proxy Routes
app.post("/api/ai/generate-outreach-draft", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not defined");
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
    
    const { params, project } = req.body;
    
    const prompt = `
      Draft a professional business email from an Event Project Manager (EPM) at Deriv.
      
      Recipient Type: ${params.recipientType}
      Project Title: ${project.title}
      Project Location: ${project.city}, ${project.country}
      Event Type: ${project.type}
      Start Date: ${project.startDate}
      Guest Count: ${project.guestCount}
      
      Context: 
      ${params.recipientType === 'Supplier' ? 'We need a quotation for generic event services (AV, catering, or local logistics).' : ''}
      ${params.recipientType === 'Hotel' ? 'We need a quotation for accommodation and meeting room facilities for the guests.' : ''}
      ${params.recipientType === 'Travel Desk' ? 'The event has been approved. Please start purchasing flight tickets for the guest list mentioned in our system.' : ''}
      
      Tone: Professional, concise, corporate.
      Make sure to include placeholders for specific details if needed like [Insert Supplier Name].
      Return ONLY the subject line and then the body, separated by "---SUBJECT_BODY_SEP---".
    `;

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });
    res.json({ text: result.text });
  } catch (error) {
    console.error("AI Outreach Error:", error);
    res.status(500).json({ error: "Failed to generate outreach draft" });
  }
});

app.post("/api/ai/generate-event-draft", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not defined");
    const { GoogleGenAI, Type } = await import("@google/genai");
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
    const { params } = req.body;
    
    const budgetContext = params.budgetLimit 
      ? `IMPORTANT: The event budget MUST be under USD ${params.budgetLimit.toLocaleString()}. This is the pre-approved country limit.`
      : "";

    const supplierContext = params.existingSuppliers.length > 0
      ? `Available Suppliers: ${JSON.stringify(params.existingSuppliers.map((s: any) => ({
          name: s.name,
          type: s.type,
          rating: s.rating,
          criteria: s.criteria
        })))}`
      : "No existing supplier data available. Recommend reputable ones.";

    const prompt = `
      You are an AI assistant for an Event Project Manager at Deriv.
      Create a detailed event draft for:
      - Destination: ${params.city}, ${params.country}
      - Guests: ${params.guestCount}
      - Event Type: ${params.type}
      - Specific Criteria: ${params.criteria}
      
      ${budgetContext}
      
      ${supplierContext}
      
      Tasks:
      1. Create a logical Budget (in USD) with categories specific to a ${params.type}.
      2. Create a high-level 3-day Itinerary specifically formatted for a ${params.type}.
      3. Suggest at least 3 Suppliers/Hotels that fit the criteria and event type.
      4. For new countries, suggest the best Travel Agencies and Visa Assistance services.
      
      Return the response in JSON format.
    `;

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            budget: {
              type: Type.OBJECT,
              properties: {
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      category: { type: Type.STRING },
                      description: { type: Type.STRING },
                      estimatedCost: { type: Type.NUMBER }
                    },
                    required: ["category", "description", "estimatedCost"]
                  }
                },
                total: { type: Type.NUMBER },
                currency: { type: Type.STRING }
              },
              required: ["items", "total", "currency"]
            },
            itinerary: {
              type: Type.OBJECT,
              properties: {
                days: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      dayNumber: { type: Type.NUMBER },
                      activities: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            time: { type: Type.STRING },
                            description: { type: Type.STRING },
                            location: { type: Type.STRING }
                          },
                          required: ["time", "description", "location"]
                        }
                      }
                    },
                    required: ["dayNumber", "activities"]
                  }
                }
              },
              required: ["days"]
            },
            suggestedSuppliers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  type: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  estimatedRating: { type: Type.NUMBER }
                },
                required: ["name", "type", "reason"]
              }
            }
          },
          required: ["budget", "itinerary", "suggestedSuppliers"]
        }
      }
    });

    res.json(JSON.parse(result.text));
  } catch (error) {
    console.error("AI Draft Error:", error);
    res.status(500).json({ error: "Failed to generate draft" });
  }
});

app.post("/api/ai/conduct-research", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not defined");
    const { GoogleGenAI, Type } = await import("@google/genai");
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
    const { topic } = req.body;
    
    const prompt = `
      Conduct deep market research for an event project manager on the topic: "${topic}".
      
      You must provide 3 distinct perspectives for a "Full Picture":
      1. Gemini Insight: Balanced, data-driven analysis of the concept.
      2. Claude-style Deep Strategy: Focus on the architectural and long-term strategic value.
      3. ChatGPT-style creative execution: Focus on innovative attendee experiences and viral potential.
      
      Additionally, search for:
      - Current market trends for this type of event in 2026.
      - Potential high-quality vendors or venues worldwide.
      - Visa requirements for travelers (e.g. from common regions like EU, Asia, GCC to this destination).
      
      Return the response in JSON format.
    `;

    const result = await ai.models.generateContent({ 
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            aiInsights: {
              type: Type.OBJECT,
              properties: {
                gemini: { type: Type.STRING },
                claude: { type: Type.STRING },
                chatgpt: { type: Type.STRING }
              },
              required: ["gemini", "claude", "chatgpt"]
            },
            marketTrends: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            visaInfo: {
              type: Type.OBJECT,
              properties: {
                requirements: { type: Type.STRING },
                processingTime: { type: Type.STRING },
                cost: { type: Type.STRING }
              },
              required: ["requirements", "processingTime", "cost"]
            },
            suggestedVenues: {
               type: Type.ARRAY,
               items: { type: Type.STRING }
            },
            sources: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["summary", "aiInsights", "marketTrends", "sources", "visaInfo"]
        }
      }
    });

    res.json(JSON.parse(result.text));
  } catch (error) {
    console.error("AI Research Error:", error);
    res.status(500).json({ error: "Failed to conduct research" });
  }
});

app.post("/api/ai/parse-invoice", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not defined");
    const { GoogleGenAI, Type } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });
    const { base64File, mimeType } = req.body;
    
    const prompt = `
      Analyze this invoice image or document.
      Extract the following details:
      1. Vendor Name
      2. Items provided (description and cost)
      3. Total Amount
      4. Currency
      
      Return the response in JSON format.
    `;

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        { inlineData: { mimeType, data: base64File } },
        { text: prompt }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            vendorName: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  cost: { type: Type.NUMBER }
                },
                required: ["description", "cost"]
              }
            },
            totalAmount: { type: Type.NUMBER },
            currency: { type: Type.STRING }
          },
          required: ["vendorName", "items", "totalAmount", "currency"]
        }
      }
    });

    res.json(JSON.parse(result.text));
  } catch (error) {
    console.error("AI Invoice Error:", error);
    res.status(500).json({ error: "Failed to parse invoice" });
  }
});

app.post("/api/ai/generate-manager-summary", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not defined");
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });
    const { activities } = req.body;
    
    const prompt = `
      Analyze the following team activities from yesterday:
      ${JSON.stringify(activities)}
      
      Create a concise daily summary for a Manager.
      Tag each point with the EPM's name.
      Highlight key achievements, gaps, and pending invoices.
    `;

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });

    res.json({ text: result.text });
  } catch (error) {
    console.error("AI Manager Summary Error:", error);
    res.status(500).json({ error: "Failed to generate manager summary" });
  }
});

app.post("/api/ai/analyze-performance", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not defined");
    const { GoogleGenAI, Type } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });
    const { projects, period } = req.body;
    
    const prompt = `
      Analyze the event project data for the period: ${period}.
      Projects: ${JSON.stringify(projects)}
      
      Generate a performance report including:
      1. Overall completion rate.
      2. Budget accuracy (Estimated vs Actual).
      3. Identified gaps in execution.
      4. Strategic recommendations for the next period.
      
      Return in JSON for dashboard charts.
    `;

    const result = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            completionRate: { type: Type.NUMBER },
            budgetAccuracy: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
            trends: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING },
                  value: { type: Type.NUMBER }
                }
              }
            }
          }
        }
      }
    });

    res.json(JSON.parse(result.text));
  } catch (error) {
    console.error("AI Performance Error:", error);
    res.status(500).json({ error: "Failed to analyze performance" });
  }
});

app.post("/api/ai/generate-handover-briefing", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not defined");
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });
    const { project } = req.body;
    
    const prompt = `
      You are an expert EPM (Event Project Manager). 
      A colleague is taking over one of your projects as part of a handover.
      
      Project Context:
      - Name: ${project.title}
      - Progress: ${project.status}
      - Destination: ${project.city}, ${project.country}
      - Guest Count: ${project.guestCount}
      
      Project Details:
      - Budget Summary: ${JSON.stringify(project.budget)}
      - Itinerary Details: ${JSON.stringify(project.itinerary)}
      
      Tasks:
      1. full: Provide a detailed, professional, and strategic briefing summarizing the current status, 3 critical next steps, and potential risks.
      2. short: Provide a ultra-concise "Bullet Point" version for a quick mobile read (max 3 bullets).
      3. visualData: Provide structured data for charts/tables:
         - taskCategories: Breakdown of project health (e.g., Logistic, Finance, Guest Ops) with numeric values for a pie chart. (Provide at least 3 categories)
         - upcomingMilestones: 3 most important upcoming dates with their status ('completed', 'pending', or 'at_risk').

      Return the response ONLY in JSON format following this structure:
      {
         "full": "string",
         "short": "string",
         "visualData": {
            "taskCategories": [{"name": "string", "value": "number"}],
            "upcomingMilestones": [{"name": "string", "status": "pending|completed|at_risk", "date": "string"}]
         }
      }
    `;

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });

    res.json(JSON.parse(result.text));
  } catch (error) {
    console.error("AI Handover Error:", error);
    res.status(500).json({ error: "Failed to generate handover briefing" });
  }
});

app.post("/api/ai/generate-supplier-ai-insight", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not defined");
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });
    const { supplier } = req.body;
    
    const prompt = `
      Analyze this supplier for an EPM:
      - Name: ${supplier.name}
      - Type: ${supplier.type}
      - Rating: ${supplier.rating}
      - Criteria: ${supplier.criteria?.join(', ') || 'N/A'}
      - Reviews: ${JSON.stringify(supplier.reviews || [])}
      
      Provide a concise summary of their reputation, strengths, and any common complaints found in reviews. 
      State if they are recommended for high-priority events.
    `;

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });

    res.json({ text: result.text });
  } catch (error) {
    console.error("AI Supplier Insight Error:", error);
    res.status(500).json({ error: "Failed to generate supplier insight" });
  }
});

app.post("/api/ai/get-knowledge-answer", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not defined");
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });
    const { query, knowledge, userRole } = req.body;
    
    const prompt = `
      You are the Global EPM Advisor at Deriv.
      User Role: ${userRole}
      Knowledge Base Context (SOPs & Updates): ${JSON.stringify(knowledge)}
      
      User Question: "${query}"
      
      Provide a helpful answer based ONLY on the provided knowledge base. 
      If you don't find the answer in the context, say you don't know but suggest who might know based on the roles.
      Tailor the tone to the user's hierarchy level (${userRole}).
    `;

    const result = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    res.json({ text: result.text });
  } catch (error) {
    console.error("AI Knowledge Error:", error);
    res.status(500).json({ error: "Failed to get knowledge answer" });
  }
});

app.post("/api/ai/generate-daily-epm-digest", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not defined");
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });
    const { projects, userRole, userName } = req.body;
    
    const prompt = `
      Hello, you are an AI assistant for ${userName}, who is a ${userRole} at Deriv.
      
      Analyze their active projects:
      ${JSON.stringify(projects.filter((p: any) => p.epmName === userName))}
      
      Provide a "Daily Progress Summary":
      1. Overview of work done.
      2. What is missing or overdue (check budget/itinerary status).
      3. High-priority focus areas for the next 24 hours.
      4. A motivational tip based on their level (${userRole}).
      
      Be concise but strategic.
    `;

    const result = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt
    });

    res.json({ text: result.text });
  } catch (error) {
    console.error("AI Digest Error:", error);
    res.status(500).json({ error: "Failed to generate daily digest" });
  }
});

app.post("/api/ai/detect-budget-variance", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not defined");
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });
    const { project } = req.body;
    
    const prompt = `
      Analyze the budget for the event: "${project.title}" (${project.type}).
      Total Budget: ${project.budget.total} ${project.budget.currency}
      Items: ${JSON.stringify(project.budget.items)}
      
      Tasks:
      1. Identify any line items that seem unusually high or low for a ${project.type} event with ${project.guestCount} guests.
      2. Check for missing essential categories (e.g., AV for conferences, Insurance for international travel).
      3. Flag any potential double-billing or overlapping services.
      
      If everything looks normal, return "Budget appears optimized within parameters."
      Otherwise, provide specific warnings.
    `;

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });

    res.json({ text: result.text });
  } catch (error) {
    console.error("AI Budget Variance Error:", error);
    res.status(500).json({ error: "Failed to detect budget variance" });
  }
});

app.post("/api/ai/generate-epm-task-summary", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not defined");
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });
    const { epmName, projects } = req.body;
    
    const prompt = `
      Analyze the workload and task status for EPM: ${epmName}.
      Projects Assigned: ${JSON.stringify(projects.filter((p: any) => p.epmName === epmName))}
      
      Provide a concise summary of:
      1. Current project load and distribution.
      2. Critical deadlines or overdue tasks across all their projects.
      3. Performance assessment based on project statuses.
      4. Capacity check (are they overloaded?).
      
      Format as a structured summary for management review.
    `;

    const result = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt
    });

    res.json({ text: result.text });
  } catch (error) {
    console.error("AI Task Summary Error:", error);
    res.status(500).json({ error: "Failed to generate task summary" });
  }
});

// ClickUp In-Memory Store
const clickupUpdates: any[] = [
  {
    id: "seed-1",
    taskId: "8672abc12",
    taskName: "Update Guest List",
    event: "taskStatusUpdated",
    assignees: "Jean Damour",
    creator: "Sarah Connor",
    history: [],
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() // 15 mins ago
  },
  {
    id: "seed-2",
    taskId: "8672xyz45",
    taskName: "AV Quotation Review",
    event: "taskCreated",
    assignees: "Sarah Connor",
    creator: "John Doe",
    history: [],
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() // 5 mins ago
  }
];
const MAX_UPDATES = 20;

// ClickUp Webhook Endpoint
app.post("/api/webhook", async (req, res) => {
  console.log("--- ClickUp Webhook Received ---");
  
  const payload = req.body;
  
  // Robust payload extraction to match ClickUp's actual structure
  const taskData = payload.payload || payload;
  const taskObject = taskData.task || taskData;
  
  console.log(`[${new Date().toISOString()}] ClickUp Webhook Received:`, {
    event: payload.event,
    taskId: taskObject.id || payload.task_id,
    taskName: taskObject.name || payload.task_name
  });
  
  const taskId = taskObject.id || payload.task_id || "UNKNOWN ID";
  const taskName = taskObject.name || payload.task_name || (payload.event ? `Task ${payload.event.replace(/([A-Z])/g, ' $1')}` : "Unknown ClickUp Task");
  
  const event = payload.event || "taskUpdated";
  
  const extractUsername = (u: any) => u?.username || u?.user?.username || u?.display_name || "Unknown";
  
  let assignees = 'No Assignee';
  const rawAssignees = taskObject.assignees || payload.assignees;
  
  if (Array.isArray(rawAssignees)) {
    if (rawAssignees.length > 0) {
      assignees = rawAssignees.map(extractUsername).join(', ');
    }
  } else if (rawAssignees) {
    assignees = extractUsername(rawAssignees);
  }
    
  const creatorUser = taskObject.creator || payload.creator || payload.user;
  const creator = creatorUser ? extractUsername(creatorUser) : 'System';

  const update = {
    id: Math.random().toString(36).substring(7),
    taskId,
    taskName,
    event,
    assignees,
    creator,
    history: payload.history_items || [],
    fullPayload: payload,
    timestamp: new Date().toISOString()
  };

  // Add to local store for the frontend feed
  clickupUpdates.unshift(update);
  if (clickupUpdates.length > MAX_UPDATES) {
    clickupUpdates.pop();
  }

  res.status(200).json({ status: "received" });
});

// Endpoint to fetch real tasks from ClickUp API directly
app.post("/api/clickup/sync", async (req, res) => {
  const apiKey = process.env.CLICKUP_API_KEY;
  const listId = process.env.CLICKUP_LIST_ID;

  if (!apiKey || !listId) {
    return res.status(400).json({ 
      error: "CLICKUP_API_KEY and CLICKUP_LIST_ID environment variables must be set for manual sync." 
    });
  }

  try {
    console.log(`[CLICKUP] Manual sync requested for list ${listId}`);
    const response = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task?archived=false`, {
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`ClickUp API Error: ${response.status} - ${errorText}`);
      return res.status(response.status).json({ error: `ClickUp API returned ${response.status}: ${errorText}` });
    }

    const data = await response.json();
    const tasks = data.tasks || [];

    // Map ClickUp tasks to our internal update format
    const newUpdates = tasks.map((task: any) => ({
      id: `sync-${task.id}-${Date.now()}`,
      taskId: task.id,
      taskName: task.name,
      event: "manualSync",
      assignees: task.assignees?.map((a: any) => a.username).join(', ') || 'No Assignee',
      creator: task.creator?.username || 'System',
      history: [],
      timestamp: new Date().toISOString()
    }));

    // For manual sync, we clear old updates or prepend them? 
    // Usually, real tasks are more important than old webhook events.
    // Let's prepend them and keep unique ones if possible, or just replace the top ones.
    
    // Simple approach: prepend and trim to MAX_UPDATES
    newUpdates.forEach((u: any) => {
      // Check if we already have a recent sync for this task to avoid duplicates in the UI
      const exists = clickupUpdates.some(existing => 
        existing.taskId === u.taskId && 
        (existing.event === 'manualSync' || existing.event === 'taskUpdated') &&
        (new Date().getTime() - new Date(existing.timestamp).getTime() < 60000) // within 1 minute
      );
      
      if (!exists) {
        clickupUpdates.unshift(u);
      }
    });

    if (clickupUpdates.length > MAX_UPDATES) {
      clickupUpdates.splice(MAX_UPDATES);
    }

    res.json({ 
      status: "success", 
      count: newUpdates.length,
      updates: clickupUpdates 
    });
  } catch (error) {
    console.error("ClickUp Sync Error:", error);
    res.status(500).json({ error: "Failed to connect to ClickUp API" });
  }
});

// Endpoint for frontend to fetch ClickUp updates
app.get("/api/clickup/updates", (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  const isConfigured = !!(process.env.CLICKUP_API_KEY && process.env.CLICKUP_LIST_ID);
  res.json({
    updates: clickupUpdates,
    isConfigured
  });
});

// Endpoint to help user configure webhook
app.get("/api/clickup/webhook-config", (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host;
  const url = `${protocol}://${host}/api/webhook`;
  res.json({ url });
});

app.use(cookieSession({
  name: 'session',
  keys: [process.env.SESSION_SECRET || 'epm-secret-key'],
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  secure: process.env.NODE_ENV === "production",
  sameSite: 'none'
}));

let oauth2ClientInstance: any = null;

function getOAuth2Client() {
  if (!oauth2ClientInstance) {
    oauth2ClientInstance = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/google/callback`
    );
  }
  return oauth2ClientInstance;
}

// Auth Routes
app.get("/api/auth/google/url", (req, res) => {
  const client = getOAuth2Client();
  const url = client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/userinfo.email"],
    prompt: "consent"
  });
  res.json({ url });
});

app.get("/api/auth/google/callback", async (req, res) => {
  const { code } = req.query;
  try {
    const client = getOAuth2Client();
    const { tokens } = await client.getToken(code as string);
    req.session!.tokens = tokens;
    
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Error getting tokens", error);
    res.status(500).send("Authentication failed");
  }
});

app.get("/api/auth/google/status", (req, res) => {
  res.json({ connected: !!req.session?.tokens });
});

app.post("/api/auth/google/logout", (req, res) => {
  req.session = null;
  res.json({ status: "ok" });
});

// Gmail Sending Route
app.post("/api/gmail/send", async (req, res) => {
  if (!req.session?.tokens) {
    return res.status(401).json({ error: "Not connected to Google" });
  }

  const { to, subject, body } = req.body;
  const client = getOAuth2Client();
  client.setCredentials(req.session.tokens);
  
  const gmail = google.gmail({ version: "v1", auth: client });
  
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
  const messageParts = [
    `To: ${to}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${utf8Subject}`,
    '',
    body,
  ];
  const message = messageParts.join('\n');
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  try {
    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
      },
    });
    res.json({ status: "sent" });
  } catch (error) {
    console.error("Gmail send error:", error);
    res.status(500).json({ error: (error as any).message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Only listen if not in a serverless environment (Vercel)
  if (process.env.VERCEL !== '1') {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();
