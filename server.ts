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

app.post("/api/itinerary/fetch-external", async (req, res) => {
  try {
    console.log("[itinerary-integration] Ingest request received for external itinerary fetch.");
    const targetUrl = "https://qa39.k8s.deriv.dev/svetinerary";
    
    let htmlContent = "";
    let fetchSuccess = false;
    let fallbackCause = "";
    
    try {
      const resp = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/html, */*'
        }
      });
      if (resp.ok) {
        htmlContent = await resp.text();
        fetchSuccess = true;
      } else {
        fallbackCause = `Server returned status code ${resp.status}`;
      }
    } catch (fetchErr: any) {
      console.error("[itinerary-integration] External fetch error:", fetchErr);
      fallbackCause = fetchErr?.message || "Connection refused";
    }

    // Default detailed Sveti Stefan Itinerary that mirrors what should be on the page
    const fallbackItineraryDays = [
      {
        dayNumber: 1,
        activities: [
          { id: "sv-1-1", time: "09:00", description: "VVIP Arrivals and Airport Transfers", location: "Podgorica Airport (TGD)" },
          { id: "sv-1-2", time: "12:00", description: "Private Butler Handover and Beachside Check-in", location: "Aman Sveti Stefan Resort" },
          { id: "sv-1-3", time: "15:00", description: "Welcome Cocktails & Strategic Alignment Keynote by Jean Damour", location: "The Ocean Terrace" },
          { id: "sv-1-4", time: "19:00", description: "Montenegrin Seafood Fusion Gala Dinner", location: "Signature beach Grill" }
        ]
      },
      {
        dayNumber: 2,
        activities: [
          { id: "sv-2-1", time: "08:30", description: "Sunrise Yoga & Coastal Wellness Session", location: "Aman Spa Cliff" },
          { id: "sv-2-2", time: "10:00", description: "EPM Innovation Council: High-Frequency Scalability", location: "Grand Villa Milocer Salon" },
          { id: "sv-2-3", time: "13:00", description: "Mediterranean Al Fresco Luncheon with Executive Committee", location: "Olive Restaurant Courtyard" },
          { id: "sv-2-4", time: "15:30", description: "Bespoke Yacht Excursion across Bay of Kotor & Our Lady of the Rocks", location: "Sveti Stefan Private Dock" },
          { id: "sv-2-5", time: "20:00", description: "Starlight Dinner & Fireside Team Reflection", location: "Piazza Courtyard" }
        ]
      },
      {
        dayNumber: 3,
        activities: [
          { id: "sv-3-1", time: "09:00", description: "Interactive Global Partner Panel: Emerging Markets Growth", location: "Milocer Ballroom" },
          { id: "sv-3-2", time: "12:00", description: "Closing Remarks & Awards Celebration", location: "Signature Cliff Deck" },
          { id: "sv-3-3", time: "14:00", description: "VIP Departure Logistics and Helicopter Shuttles", location: "Aman Sveti Stefan Helipad" }
        ]
      }
    ];

    if (fetchSuccess && htmlContent.trim()) {
      // If we got the content, let's use the Gemini model to parse it into structured JSON matching DayPlan[]
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        try {
          const { GoogleGenAI, Type } = await import("@google/genai");
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
          });
          
          const parserPrompt = `
            You are an expert parsing agent. You are provided with raw content fetched from an external Sveti Stefan Partner retreat page ("https://qa39.k8s.deriv.dev/svetinerary").
            Your task is to parse this content and convert it into a fully structured, multi-day itinerary.
            
            Format your response strictly matching the schema of custom days with specific activities.
            Raw Content:
            """
            ${htmlContent.substring(0, 15000)}
            """
            
            Do not lose activities or times. Convert times into high-contrast 24-hour style if possible.
          `;

          const result = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: parserPrompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
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
              }
            }
          });

          const parsedData = JSON.parse(result.text);
          if (parsedData && Array.isArray(parsedData.days) && parsedData.days.length > 0) {
            // Map with stable IDs
            const mappedDays = parsedData.days.map((day: any, dIndex: number) => ({
              dayNumber: day.dayNumber || (dIndex + 1),
              activities: Array.isArray(day.activities) ? day.activities.map((act: any, aIndex: number) => ({
                id: `sv-imported-${dIndex + 1}-${aIndex}`,
                time: act.time || "09:00",
                description: act.description || "Activity Details",
                location: act.location || "Ocean Terrace"
              })) : []
            }));
            
            return res.json({
              status: "success",
              source: "external-pull",
              itinerary: {
                id: `imported-sv-${Date.now()}`,
                days: mappedDays
              }
            });
          }
        } catch (gemError) {
          console.error("[itinerary-integration] Gemini parser failed, recovering with structured fallback:", gemError);
        }
      }
    }

    // Default fallback when network failed or Gemini parsing experienced structural error
    return res.json({
      status: "fallback",
      source: "cached-ledger",
      cause: fallbackCause || "API Key or Parser Fallback",
      itinerary: {
        id: `fallback-sv-${Date.now()}`,
        days: fallbackItineraryDays
      }
    });

  } catch (error: any) {
    console.error("[itinerary-integration] Critical error in /api/itinerary/fetch-external:", error);
    res.status(500).json({ error: error.message || "Failed to import external itinerary" });
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
  console.log(`[CLICKUP] Webhook payload received:`, JSON.stringify(payload, null, 2));

  // Priority: 
  // 1. payload.task (for real events)
  // 2. payload.payload.task (for some versions)
  // 3. payload.task_id (for test/simple events)
  const taskObject = payload.task || payload.payload?.task || {};
  const taskId = taskObject.id || payload.task_id || payload.payload?.task_id || payload.id || "UNKNOWN ID";
  
  let taskName = taskObject.name || payload.task_name || payload.payload?.task_name;
  if (!taskName) {
    if (payload.event) {
      taskName = `Task ${payload.event.replace(/([A-Z])/g, ' $1')}`;
    } else {
      taskName = "Unknown ClickUp Task";
    }
  }
  
  let taskUrl = taskObject.url || payload.task_url || payload.payload?.task_url || (taskId !== "UNKNOWN ID" ? `https://app.clickup.com/t/${taskId}` : "");
  const event = payload.event || "taskUpdated";
  
  const extractUsername = (u: any) => u?.username || u?.user?.username || u?.display_name || "Unknown";
  
  let assignees = 'No Assignee';
  const rawAssignees = taskObject.assignees || payload.assignees || payload.payload?.assignees;
  
  if (Array.isArray(rawAssignees)) {
    if (rawAssignees.length > 0) {
      assignees = rawAssignees.map(extractUsername).join(', ');
    }
  } else if (rawAssignees) {
    assignees = extractUsername(rawAssignees);
  }
    
  const creatorUser = taskObject.creator || payload.creator || payload.user || payload.payload?.creator;
  const creator = creatorUser ? extractUsername(creatorUser) : 'System';

  // If we have an API key, we should try to fetch full task details for webhooks that lack them (like "Test Webhook")
  const apiKey = process.env.CLICKUP_API_KEY;
  if (apiKey && taskId !== "UNKNOWN ID" && (!taskObject.name || !taskObject.assignees || !taskObject.url)) {
    try {
      console.log(`[CLICKUP] Webhook received for ${taskId}, fetching full details...`);
      const response = await fetch(`https://api.clickup.com/api/v2/task/${taskId}`, {
        headers: { 'Authorization': apiKey }
      });
      if (response.ok) {
        const data = await response.json();
        taskName = data.name || taskName;
        assignees = data.assignees?.map((a: any) => a.username).join(', ') || assignees;
        taskUrl = data.url || taskUrl;
        console.log(`[CLICKUP] Successfully enriched webhook data for ${taskId}`);
      }
    } catch (e) {
      console.error("Failed to fetch task details for webhook", e);
    }
  }

  const update = {
    id: Math.random().toString(36).substring(7),
    taskId,
    taskName,
    taskUrl,
    event,
    assignees,
    creator,
    history: payload.history_items || payload.payload?.history_items || [],
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
      id: `sync-${task.id}`, // Stable ID for sync tasks
      taskId: task.id,
      taskName: task.name,
      taskUrl: task.url || `https://app.clickup.com/t/${task.id}`,
      event: "taskSynced",
      assignees: task.assignees?.map((a: any) => a.username).join(', ') || 'No Assignee',
      creator: task.creator?.username || 'System',
      history: [],
      timestamp: new Date().toISOString()
    }));

    // For manual sync, we remove existing entries for the same task and unshift the new ones
    // to the top, so they appear as "Live Pull" updates.
    newUpdates.forEach((u: any) => {
      const existingIndex = clickupUpdates.findIndex(item => item.taskId === u.taskId);
      if (existingIndex !== -1) {
        clickupUpdates.splice(existingIndex, 1);
      }
      clickupUpdates.unshift(u);
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
