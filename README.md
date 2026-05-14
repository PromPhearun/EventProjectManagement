# Prom EPM-Automation

Prom EPM-Automation is an elite enterprise-grade **Event Project Management (EPM) Command & Intelligence System**. Designed for high-velocity teams, it streamlines the entire lifecycle of marketing events through deep AI integration, multi-tier role synchronization, and automated strategic oversight.

## 🚀 Key Features

### 1. Multi-Tier Strategic Dashboards
*   **Active Command**: Tailored perspectives for **EPM Executives**, **Managers**, and **HODs**.
*   **Role-Based Synchronization**: Real-time visibility into project density and team capacity across the organization.

### 2. AI Intelligence Hub (Gemini Powered)
*   **Executive Briefings**: Automated "Morning Briefings" that synthesize project logs into actionable strategic summaries.
*   **Performance Gap Analysis**: Data-driven detection of bottlenecks and strategic focus areas for the next 24-48 hours.
*   **Draft Augmentation**: Generate comprehensive event concepts, itineraries, and budget structures in seconds.

### 3. Financial & Operational Guardrails
*   **Smart Invoice Parsing**: Upload invoices to automatically extract line items and costs.
*   **Variance Detection**: AI-powered auditing of estimated vs. actual costs to identify spending leakage.
*   **Budget Alignment**: Automated check against pre-approved country budgets.

### 4. Optimized Execution Tools
*   **Dynamic Itinerary Management**: Centralized planning with real-time editing and location mapping.
*   **Supplier Directory**: A verified network of vendors with AI-synthesized performance reviews and strategic suggestions.
*   **External Comms Center**: Integrated Gmail workflow with AI draft generation for stakeholder outreach.

### 5. Collaboration & Knowledge Management
*   **Real-time Team Chat**: Direct communication channels synchronized across roles.
*   **Strategic Handover Briefs**: Automated generation of transition documents for seamless project rotation.
*   **Knowledge Advisor**: AI-driven repository for EPM best practices and historical data.

## 🛠 Tech Stack

*   **Frontend**: React 18+, TypeScript, Tailwind CSS, shadcn/ui, motion/react.
*   **AI**: Google Gemini 1.5 Flash & 3.1 Pro via `@google/genai`.
*   **Backend**: Node.js Express monolith (Vercel compatible).
*   **Auth**: Google OAuth 2.0.

## ⚙️ Configuration

To run this application, ensure the following environment variables are set:

| Variable | Description |
| :--- | :--- |
| `GEMINI_API_KEY` | Your Google AI Studio API Key. |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID (for Gmail integration). |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret. |
| `SESSION_SECRET` | Secret key for encrypted session management. |
| `APP_URL` | The public URL of your application (required for OAuth callbacks). |

## 📦 Deployment

This application is architected for **Vercel** and **Cloud Run**.

1.  **Vercel Build**: `npm run build` will bundle the frontend and compile the backend server to `dist/server.cjs`.
2.  **Vercel Config**: `vercel.json` is pre-configured to handle API routes and SPA rewrites.

---
*Built for excellence by Prom & The EPM Command Team.*
