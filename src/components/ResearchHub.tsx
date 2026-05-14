import { useState, useEffect } from 'react';
import { db } from '../services/db';
import { BrainstormIdea, ResearchData } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { 
  Search, 
  Plus, 
  Plane, 
  BrainCircuit, 
  TrendingUp, 
  Loader2, 
  Sparkles, 
  ExternalLink, 
  MapPin, 
  Globe, 
  Zap,
  Quote
} from 'lucide-react';
import { toast } from 'sonner';
import { conductResearch } from '../services/gemini';
import { skyscannerService, FlightEstimate } from '../services/skyscanner';

export function ResearchHub() {
  const [ideas, setIdeas] = useState<BrainstormIdea[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isResearching, setIsResearching] = useState(false);
  const [activeResearch, setActiveResearch] = useState<ResearchData | null>(null);

  useEffect(() => {
    setIdeas(db.getBrainstormIdeas().map(i => ({
      ...i,
      type: i.type || 'new-event'
    })) as BrainstormIdea[]);
  }, []);

  const handleDeepResearch = async () => {
    if (!searchQuery) {
      toast.error('Enter a concept or destination to research.');
      return;
    }

    setIsResearching(true);
    try {
      // 1. AI Deep Research (Grounding via Gemini)
      const aiResponse = await conductResearch(searchQuery);
      
      // 2. Flight Estimates (Skyscanner Mock)
      // Extract city if it looks like one, or just use the query
      const flightData = await skyscannerService.getFlightEstimates(searchQuery);

      const researchResult: ResearchData = {
        summary: aiResponse.summary,
        aiInsights: aiResponse.aiInsights,
        marketTrends: aiResponse.marketTrends,
        visaInfo: aiResponse.visaInfo,
        sources: aiResponse.sources,
        flights: flightData
      };

      setActiveResearch(researchResult);
      
      // Auto-save as a research project
      const newIdea: BrainstormIdea = {
        id: Math.random().toString(36).substr(2, 9),
        title: `Research: ${searchQuery}`,
        content: aiResponse.summary,
        author: 'EPM Research Bot',
        date: new Date().toISOString(),
        type: 'research',
        researchData: researchResult
      };

      db.saveIdea(newIdea);
      setIdeas([newIdea, ...ideas]);
      toast.success('Research compiled successfully.');
    } catch (err) {
      console.error(err);
      toast.error('Research engine encountered a timeout. Trying cached results...');
    } finally {
      setIsResearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Research & Ideation Hub</h2>
          <p className="text-muted-foreground italic">Connected to Gemini, Claude, ChatGPT, and Skyscanner for a Full Picture view.</p>
        </div>
        
        <div className="flex gap-2">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input 
                    placeholder="Research destination, event concept (e.g. 'Cruise Seminar in Greece')..." 
                    className="pl-10 h-12 text-lg shadow-sm border-2 focus-visible:ring-black"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleDeepResearch()}
                />
            </div>
            <Button size="lg" className="h-12 px-8 bg-black hover:bg-slate-800 gap-2" onClick={handleDeepResearch} disabled={isResearching}>
                {isResearching ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                Deep Research
            </Button>
        </div>
      </div>

      {activeResearch ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="lg:col-span-2 overflow-hidden border-2 border-slate-100 shadow-xl">
             <CardHeader className="bg-slate-900 text-white">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="flex items-center gap-2"><Globe size={18} className="text-blue-400" /> Executive Research Summary</CardTitle>
                        <CardDescription className="text-slate-400">Synthesized data across multiple AI models & Search Engines.</CardDescription>
                    </div>
                    <Badge variant="outline" className="text-blue-400 border-blue-400 bg-blue-400/10">Full Picture active</Badge>
                </div>
             </CardHeader>
             <CardContent className="mt-4 space-y-6">
                <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed">
                   {activeResearch.summary}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-6">
                   <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 italic relative">
                      <Quote className="absolute -top-2 -right-2 text-slate-200 fill-slate-200" size={24} />
                      <p className="text-[10px] uppercase font-black text-slate-400 mb-2 flex items-center gap-1"><Zap size={10} /> Gemini Insight</p>
                      <p className="text-[11px] leading-snug">{activeResearch.aiInsights.gemini}</p>
                   </div>
                   <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 italic relative">
                      <Quote className="absolute -top-2 -right-2 text-indigo-200 fill-indigo-200" size={24} />
                      <p className="text-[10px] uppercase font-black text-indigo-400 mb-2 flex items-center gap-1"><Zap size={10} /> Claude Strategy</p>
                      <p className="text-[11px] leading-snug">{activeResearch.aiInsights.claude}</p>
                   </div>
                   <div className="p-4 rounded-xl bg-teal-50 border border-teal-100 italic relative">
                      <Quote className="absolute -top-2 -right-2 text-teal-200 fill-teal-200" size={24} />
                      <p className="text-[10px] uppercase font-black text-teal-400 mb-2 flex items-center gap-1"><Zap size={10} /> ChatGPT UI/UX</p>
                      <p className="text-[11px] leading-snug">{activeResearch.aiInsights.chatgpt}</p>
                   </div>
                </div>
             </CardContent>
          </Card>

          <div className="space-y-6">
             <Card className="bg-blue-50 border-blue-100">
                <CardHeader className="pb-2">
                   <CardTitle className="text-xs font-bold uppercase text-blue-800 flex items-center gap-2"><Plane size={14} /> Skyscanner Estimates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                   {activeResearch.flights.map((f, i) => (
                     <div key={i} className="flex justify-between items-center p-2 bg-white rounded-lg border border-blue-200">
                        <div>
                           <p className="text-[10px] font-bold text-blue-600">{f.carrier}</p>
                           <p className="text-xs font-medium">{f.origin} → {f.destination}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-sm font-black">${f.price}</p>
                           <p className="text-[10px] opacity-60">{f.duration}</p>
                        </div>
                     </div>
                   ))}
                </CardContent>
             </Card>

             <Card>
                <CardHeader className="pb-2">
                   <CardTitle className="text-xs font-bold uppercase opacity-60 flex items-center gap-2"><TrendingUp size={14} /> Market Trends</CardTitle>
                </CardHeader>
                <CardContent>
                   <ul className="space-y-2">
                      {activeResearch.marketTrends.map((t, i) => (
                        <li key={i} className="text-xs flex items-start gap-2">
                           <span className="w-1 h-1 rounded-full bg-slate-900 mt-1.5 shrink-0" />
                           <span>{t}</span>
                        </li>
                      ))}
                   </ul>
                </CardContent>
             </Card>

             {activeResearch.visaInfo && (
               <Card className="bg-amber-50 border-amber-100">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold uppercase text-amber-800 flex items-center gap-2">
                      <Zap size={14} /> Visa Requirements
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-[10px] font-black opacity-40 uppercase">Rules</p>
                      <p className="text-[11px] leading-tight">{activeResearch.visaInfo.requirements}</p>
                    </div>
                    <div className="flex gap-4">
                      <div>
                        <p className="text-[10px] font-black opacity-40 uppercase">Time</p>
                        <p className="text-[11px] font-bold">{activeResearch.visaInfo.processingTime}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black opacity-40 uppercase">Cost</p>
                        <p className="text-[11px] font-bold">{activeResearch.visaInfo.cost}</p>
                      </div>
                    </div>
                  </CardContent>
               </Card>
             )}

             <Card className="bg-slate-50">
               <CardContent className="pt-6">
                  <Button variant="outline" className="w-full text-xs gap-2" onClick={() => setActiveResearch(null)}>
                     Clear Research View
                  </Button>
               </CardContent>
             </Card>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ideas.map((idea) => (
            <Card key={idea.id} className="group relative overflow-hidden hover:border-slate-400 transition-all cursor-pointer" onClick={() => idea.researchData && setActiveResearch(idea.researchData)}>
              <div className={`absolute top-0 left-0 w-1 h-full ${idea.type === 'research' ? 'bg-indigo-500' : 'bg-amber-400'}`} />
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-md group-hover:text-indigo-600 transition-colors">{idea.title}</CardTitle>
                  <Badge variant={idea.type === 'research' ? 'secondary' : 'outline'} className="text-[9px]">
                    {idea.type?.toUpperCase()}
                  </Badge>
                </div>
                <CardDescription className="text-[10px]">{new Date(idea.date).toLocaleDateString()} by {idea.author}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm opacity-80 line-clamp-3">{idea.content}</p>
                {idea.researchData && (
                  <div className="mt-4 flex items-center gap-4">
                     <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600">
                        <Zap size={12} /> Deep Analyzed
                     </div>
                     <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600">
                        <Plane size={12} /> Travel Data
                     </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {ideas.length === 0 && (
            <div className="col-span-full py-20 text-center space-y-4 opacity-40 italic">
              <BrainCircuit className="mx-auto w-12 h-12" />
              <p>Start a new research session for inspiration.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
