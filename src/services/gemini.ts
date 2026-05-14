import { GoogleGenAI, Type } from "@google/genai";
import { EventProject, Budget, Itinerary, Supplier } from "../types";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please set it in your environment variables.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export async function generateEventDraft(params: {
  country: string;
  city: string;
  guestCount: number;
  type: string;
  criteria: string;
  existingSuppliers: Supplier[];
  budgetLimit?: number;
}) {
  const ai = getAI();
  const model = "gemini-3-flash-preview";
  
  const budgetContext = params.budgetLimit 
    ? `IMPORTANT: The event budget MUST be under USD ${params.budgetLimit.toLocaleString()}. This is the pre-approved country limit.`
    : "";

  const supplierContext = params.existingSuppliers.length > 0
    ? `Available Suppliers: ${JSON.stringify(params.existingSuppliers.map(s => ({
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

  const response = await ai.models.generateContent({
    model,
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

  return JSON.parse(response.text);
}

export async function parseInvoice(base64File: string, mimeType: string) {
  const ai = getAI();
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Analyze this invoice image or document.
    Extract the following details:
    1. Vendor Name
    2. Items provided (description and cost)
    3. Total Amount
    4. Currency
    
    Return the response in JSON format.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        inlineData: {
          mimeType,
          data: base64File
        }
      },
      {
        text: prompt
      }
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

  return JSON.parse(response.text);
}

export async function conductResearch(topic: string) {
  const ai = getAI();
  const model = "gemini-3.1-pro-preview"; // Use Pro for deep research
  
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

  const response = await ai.models.generateContent({
    model,
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

  return JSON.parse(response.text);
}

export async function generateManagerSummary(activities: any[]) {
  const ai = getAI();
  const model = "gemini-3-flash-preview";
  const prompt = `
    Analyze the following team activities from yesterday:
    ${JSON.stringify(activities)}
    
    Create a concise daily summary for a Manager.
    Tag each point with the EPM's name.
    Highlight key achievements, gaps, and pending invoices.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt
  });

  return response.text;
}

export async function analyzePerformance(projects: any[], period: string) {
  const ai = getAI();
  const model = "gemini-3.1-pro-preview";
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

  const response = await ai.models.generateContent({
    model,
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

  return JSON.parse(response.text);
}

export async function generateHandoverBriefing(project: EventProject) {
  const ai = getAI();
  const model = "gemini-3-flash-preview"; 
  
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

  const response = await ai.models.generateContent({
    model,
    contents: prompt
  });

  try {
    const text = response.text;
    const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const parsed = JSON.parse(jsonStr);
    return parsed;
  } catch (e) {
    return {
      full: response.text,
      short: "Handover in progress. Detailed briefing available in full view.",
      visualData: {
        taskCategories: [{ name: 'Logistics', value: 40 }, { name: 'Finance', value: 30 }, { name: 'Ops', value: 30 }],
        upcomingMilestones: [{ name: 'Venue Final Deposit', status: 'pending', date: 'Next Week' }]
      }
    };
  }
}

export async function generateSupplierAIInsight(supplier: Supplier) {
  const ai = getAI();
  const model = "gemini-3-flash-preview";
  const prompt = `
    Analyze this supplier for an EPM:
    - Name: ${supplier.name}
    - Type: ${supplier.type}
    - Rating: ${supplier.rating}
    - Criteria: ${supplier.criteria.join(', ')}
    - Reviews: ${JSON.stringify(supplier.reviews)}
    
    Provide a concise summary of their reputation, strengths, and any common complaints found in reviews. 
    State if they are recommended for high-priority events.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt
  });

  return response.text;
}

export async function getKnowledgeAnswer(query: string, knowledge: any[], userRole: string) {
  const ai = getAI();
  const model = "gemini-3.1-pro-preview";
  const prompt = `
    You are the Global EPM Advisor at Deriv.
    User Role: ${userRole}
    Knowledge Base Context (SOPs & Updates): ${JSON.stringify(knowledge)}
    
    User Question: "${query}"
    
    Provide a helpful answer based ONLY on the provided knowledge base. 
    If you don't find the answer in the context, say you don't know but suggest who might know based on the roles.
    Tailor the tone to the user's hierarchy level (${userRole}).
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }] // Add search grounding for general context if SOP is silent
    }
  });

  return response.text;
}

export async function generateDailyEPMDigest(projects: EventProject[], userRole: string, userName: string) {
  const ai = getAI();
  const model = "gemini-3.1-pro-preview";
  const prompt = `
    Hello, you are an AI assistant for ${userName}, who is a ${userRole} at Deriv.
    
    Analyze their active projects:
    ${JSON.stringify(projects.filter(p => p.epmName === userName))}
    
    Provide a "Daily Progress Summary":
    1. Overview of work done.
    2. What is missing or overdue (check budget/itinerary status).
    3. High-priority focus areas for the next 24 hours.
    4. A motivational tip based on their level (${userRole}).
    
    Be concise but strategic.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt
  });

  return response.text;
}

export async function detectBudgetVariance(project: EventProject) {
  const ai = getAI();
  const model = "gemini-3-flash-preview";
  if (!project.budget) return null;

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

  const response = await ai.models.generateContent({
    model,
    contents: prompt
  });

  return response.text;
}

export async function generateEPMTaskSummary(epmName: string, projects: EventProject[]) {
  const ai = getAI();
  const model = "gemini-3.1-pro-preview";
  const epmProjects = projects.filter(p => p.epmName === epmName);
  
  const prompt = `
    Analyze the workload and task status for EPM: ${epmName}.
    Projects Assigned: ${JSON.stringify(epmProjects)}
    
    Provide a concise summary of:
    1. Current project load and distribution.
    2. Critical deadlines or overdue tasks across all their projects.
    3. Performance assessment based on project statuses.
    4. Capacity check (are they overloaded?).
    
    Format as a structured summary for management review.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt
  });

  return response.text;
}
