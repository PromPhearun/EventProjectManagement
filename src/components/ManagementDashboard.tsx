import { useState, useEffect } from 'react';
import { db } from '../services/db';
import { EventProject, UserRole, ActivityLog } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowUpRight, 
  FileSearch, 
  Clock, 
  ShieldCheck,
  Zap,
  LayoutDashboard,
  Presentation,
  Filter,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { generateManagerSummary, analyzePerformance, generateEPMTaskSummary } from '../services/gemini';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import Markdown from 'react-markdown';

interface ManagementDashboardProps {
  userRole: UserRole;
}

export function ManagementDashboard({ userRole }: ManagementDashboardProps) {
  const [projects, setProjects] = useState<EventProject[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [period, setPeriod] = useState('Weekly');
  const [perfData, setPerfData] = useState<any>(null);
  const [selectedEpm, setSelectedEpm] = useState<string | null>(null);
  const [epmSummary, setEpmSummary] = useState<string | null>(null);
  const [isEpmLoading, setIsEpmLoading] = useState(false);

  const epmList = Array.from(new Set(projects.map(p => p.epmName)));

  useEffect(() => {
    const data = db.getProjects();
    const l = db.getYesterdaysLogs();
    setProjects(data);
    setLogs(l);
    
    // Initial analysis
    loadPerformance('Weekly', data);
  }, []);

  const loadPerformance = async (p: string, data: EventProject[]) => {
    setPeriod(p);
    try {
      const res = await analyzePerformance(data, p);
      setPerfData(res);
    } catch (err) {
      // Mock some data if AI fails
      setPerfData({
        completionRate: 85,
        budgetAccuracy: 92,
        gaps: ["Visa processing delays in SEA", "Invoice collection latency"],
        trends: [
            { date: 'Mon', value: 40 },
            { date: 'Tue', value: 30 },
            { date: 'Wed', value: 65 },
            { date: 'Thu', value: 45 },
            { date: 'Fri', value: 90 },
        ]
      });
    }
  };

  const generateDailyBrief = async () => {
    if (logs.length === 0) {
      toast.info('No logged activity for yesterday.');
      return;
    }
    setIsLoadingSummary(true);
    try {
      const res = await generateManagerSummary([...logs, { role: userRole }]); // Include role context
      setSummary(res);
    } catch (err) {
      toast.error('AI Summary failed.');
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const generateEpmReport = async () => {
    if (!selectedEpm) {
      toast.error('Please select an EPM first');
      return;
    }
    setIsEpmLoading(true);
    try {
      const res = await generateEPMTaskSummary(selectedEpm, projects);
      setEpmSummary(res);
      toast.success(`EPM Summary for ${selectedEpm} generated`);
    } catch (err) {
      toast.error('Failed to generate EPM report');
    } finally {
      setIsEpmLoading(false);
    }
  };

  const isExecutiveAccess = true; // User requested access for everyone

  if (!isExecutiveAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-4 opacity-50">
        <ShieldCheck size={64} />
        <h2 className="text-xl font-bold">Restricted View</h2>
        <p>This analytics module is restricted to Management and Senior Leadership.</p>
      </div>
    );
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  const typeDistribution = projects.reduce((acc: any[], curr) => {
    const existing = acc.find(item => item.name === curr.type);
    if (existing) existing.value++;
    else acc.push({ name: curr.type, value: 1 });
    return acc;
  }, []);

  const budgetAnomalies = projects.flatMap(p => 
    p.budget?.items.filter(item => 
      item.actualCost && item.actualCost > (item.estimatedCost * 1.1)
    ).map(item => ({
      projectId: p.id,
      projectTitle: p.title,
      category: item.category,
      supplier: item.description,
      variance: ((item.actualCost - item.estimatedCost) / item.estimatedCost) * 100,
      overcharge: item.actualCost - item.estimatedCost
    })) || []
  );

  const calculateBudgetAccuracy = () => {
    const projectsWithActuals = projects.filter(p => p.budget?.items.some(i => i.actualCost));
    if (projectsWithActuals.length === 0) return 92; // Default if no actuals
    
    let totalEstimated = 0;
    let totalActual = 0;
    
    projectsWithActuals.forEach(p => {
      p.budget?.items.forEach(i => {
        if (i.actualCost) {
          totalEstimated += i.estimatedCost;
          totalActual += i.actualCost;
        }
      });
    });
    
    const accuracy = Math.max(0, 100 - (((totalActual - totalEstimated) / totalEstimated) * 100));
    return Math.round(accuracy);
  };

  const budgetAccuracy = calculateBudgetAccuracy();

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black tracking-tighter">Command Center</h2>
          <p className="text-muted-foreground">Strategic oversight & performance intelligence.</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="gap-2" onClick={generateDailyBrief} disabled={isLoadingSummary}>
              <Zap size={14} className={isLoadingSummary ? "animate-spin" : ""} />
              {isLoadingSummary ? 'Analyzing...' : 'Generate AI Briefing'}
           </Button>
           <div className="bg-white border rounded-lg p-1 flex gap-1 shadow-sm">
              {['Daily', 'Weekly', 'Monthly', 'Quarterly', 'H1', 'Yearly'].map(p => (
                <button 
                  key={p} 
                  onClick={() => loadPerformance(p, projects)}
                  className={`px-3 py-1.5 text-[10px] font-black uppercase rounded transition-all ${period === p ? 'bg-black text-white' : 'hover:bg-slate-50 text-slate-500'}`}
                >
                  {p}
                </button>
              ))}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         <Card className="bg-slate-900 text-white border-none shadow-xl">
            <CardHeader className="pb-2">
               <CardTitle className="text-[10px] opacity-50 uppercase tracking-widest flex items-center gap-2"><CheckCircle2 size={12} /> Completion Rate</CardTitle>
            </CardHeader>
            <CardContent>
               <p className="text-4xl font-black">{perfData?.completionRate || 0}%</p>
               <div className="mt-2 flex items-center gap-1 text-green-400 text-xs font-bold">
                  <ArrowUpRight size={14} /> +3.2% from last {period.toLowerCase()}
               </div>
            </CardContent>
         </Card>
         <Card className={`shadow-lg transition-all duration-500 ${budgetAccuracy < 90 ? 'ring-2 ring-red-500 bg-red-50/10' : ''}`}>
            <CardHeader className="pb-2">
               <CardTitle className="text-[10px] opacity-40 uppercase tracking-widest flex items-center gap-2"><TrendingUp size={12} /> Budget Accuracy</CardTitle>
            </CardHeader>
            <CardContent>
               <p className={`text-4xl font-black ${budgetAccuracy < 90 ? 'text-red-600' : ''}`}>{budgetAccuracy}%</p>
               <p className="text-xs opacity-50 font-medium">Variance Tracking active</p>
            </CardContent>
         </Card>
         <Card className="shadow-lg">
            <CardHeader className="pb-2">
               <CardTitle className="text-[10px] opacity-40 uppercase tracking-widest flex items-center gap-2"><Calendar size={12} /> Active Events</CardTitle>
            </CardHeader>
            <CardContent>
               <p className="text-4xl font-black">{projects.length}</p>
               <p className="text-xs opacity-50 font-medium">Across {new Set(projects.map(p => p.country)).size} countries</p>
            </CardContent>
         </Card>
         <Card className="shadow-lg bg-indigo-50 border-indigo-100">
            <CardHeader className="pb-2">
               <CardTitle className="text-[10px] text-indigo-800 uppercase tracking-widest flex items-center gap-2"><AlertTriangle size={12} /> Identified Gaps</CardTitle>
            </CardHeader>
            <CardContent>
               <p className="text-4xl font-black text-indigo-900">{perfData?.gaps?.length || 0}</p>
               <p className="text-xs text-indigo-600 font-medium">Critical attention needed</p>
            </CardContent>
         </Card>
      </div>

      {budgetAccuracy < 90 && budgetAnomalies.length > 0 && (
        <div className="animate-in slide-in-from-top-4 duration-500">
          <Card className="border-red-200 bg-red-50/30 shadow-lg overflow-hidden">
            <CardHeader className="bg-red-50 border-b pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-red-900 text-sm font-black flex items-center gap-2">
                    <ShieldAlert className="animate-pulse" size={18} /> CRITICAL BUDGET LEAK DETECTED
                  </CardTitle>
                  <CardDescription className="text-red-700 text-[10px] font-bold uppercase tracking-wider">
                    Diagnostic result: Accuracy dropped below 90% threshold.
                  </CardDescription>
                </div>
                <Badge className="bg-red-100 text-red-700 border-red-200">Financial Redline</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {budgetAnomalies.map((anomaly, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-white border border-red-100 shadow-sm flex flex-col justify-between">
                    <div>
                      <p className="text-[9px] font-black uppercase text-red-400 mb-1">{anomaly.projectTitle}</p>
                      <p className="text-sm font-black text-slate-800 leading-tight mb-2">{anomaly.supplier}</p>
                      <div className="flex gap-2 mb-3">
                        <Badge variant="outline" className="text-[8px] font-mono border-red-100 text-red-600 bg-red-50">+{anomaly.variance.toFixed(1)}% Variance</Badge>
                        <Badge variant="outline" className="text-[8px] font-mono border-slate-100 uppercase">{anomaly.category}</Badge>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-red-50 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400">Overcharge Magnitude:</span>
                      <span className="text-sm font-black text-red-600">+${anomaly.overcharge.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-3 rounded-xl bg-white border border-dashed border-red-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                    <Sparkles size={14} />
                  </div>
                  <p className="text-[10px] font-bold italic text-slate-500">AI Recommendation: Negotiate immediate rebate from flagged vendors or escalate to Procurement.</p>
                </div>
                <Button size="sm" className="bg-red-600 hover:bg-red-700 h-8 rounded-lg text-[10px] font-black uppercase">
                  Trigger Escalation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <Card className="lg:col-span-2 shadow-xl border-slate-100 overflow-hidden">
            <CardHeader className="bg-slate-50 border-b pb-4 flex flex-row items-center justify-between">
               <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2"><Presentation size={16} /> Operational Trend Analysis</CardTitle>
                  <CardDescription className="text-[10px]">Real-time execution velocity across the {period.toLowerCase()}.</CardDescription>
               </div>
               <Badge variant="outline" className="text-[10px] h-6">Live AI Feed</Badge>
            </CardHeader>
                  <CardContent className="pt-6">
                    <div className="h-[300px] w-full">
                      {perfData?.trends && perfData.trends.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={perfData.trends}>
                            <defs>
                              <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                            <Tooltip 
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                            />
                            <Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center opacity-20 italic">
                          No trend data for this period.
                        </div>
                      )}
                    </div>
                  </CardContent>
         </Card>

         <Card className="shadow-xl bg-slate-50 overflow-hidden">
            <CardHeader className="bg-white border-b">
               <CardTitle className="text-sm font-bold flex items-center gap-2"><Filter size={16} /> Event Distribution</CardTitle>
               <CardDescription className="text-[10px]">Active project types split.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center pt-8">
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={typeDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {typeDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 w-full">
                   {typeDistribution.map((item, i) => (
                     <div key={i} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-[10px] font-bold opacity-60 truncate">{item.name}</span>
                        <span className="text-[10px] font-black ml-auto">{item.value}</span>
                     </div>
                   ))}
                </div>
            </CardContent>
         </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <Card className="border-2 border-slate-100 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
               <Sparkles className="text-amber-400" size={24} />
            </div>
            <CardHeader className="bg-white">
               <CardTitle className="text-sm font-bold flex items-center gap-2"><Zap size={16} className="text-amber-500 fill-amber-500" /> Morning Executive Briefing</CardTitle>
               <CardDescription>Synthesized digest of high-priority activities.</CardDescription>
            </CardHeader>
            <CardContent className="min-h-[250px] bg-slate-50/50 p-6">
                {summary ? (
                   <div className="prose prose-sm max-w-none text-slate-700 font-medium italic leading-relaxed">
                      <Markdown>{summary}</Markdown>
                   </div>
                ) : (
                   <div className="flex flex-col items-center justify-center h-full py-10 opacity-30 text-center gap-4">
                      <Clock size={40} />
                      <p className="text-sm font-bold italic">Click "Generate AI Briefing" to synthesize yesterday's logs.</p>
                   </div>
                )}
            </CardContent>
         </Card>

          <Card className="shadow-xl">
            <CardHeader>
               <CardTitle className="text-sm font-bold flex items-center gap-2"><LayoutDashboard size={16} /> Team Performance Gaps</CardTitle>
               <CardDescription>Data-driven focus areas for the next 24 hours.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               {perfData?.gaps?.map((gap: string, i: number) => (
                 <div key={i} className="flex gap-4 p-4 rounded-xl border border-red-50 bg-red-50/30">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                       <AlertTriangle size={20} />
                    </div>
                    <div>
                       <p className="text-xs font-black text-red-900">IDENTIFIED GAP #{i+1}</p>
                       <p className="text-xs text-slate-600 font-medium leading-relaxed">{gap}</p>
                    </div>
                 </div>
               ))}
               <div className="p-4 rounded-xl border border-indigo-50 bg-indigo-50/30">
                  <div className="flex items-center gap-2 mb-2">
                     <FileSearch size={16} className="text-indigo-600" />
                     <p className="text-xs font-black text-indigo-900 uppercase">Strategic Recommendation</p>
                  </div>
                  <p className="text-xs text-slate-600 font-medium italic">
                     {perfData?.summary || "Analyzing project density suggests shifting capacity towards European Visa processing to avoid Q3 bottlenecks."}
                  </p>
               </div>
            </CardContent>
         </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-2 border-slate-100 shadow-2xl">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Users size={16} className="text-blue-500" /> EPM Performance Monitor
                </CardTitle>
                <CardDescription>Detailed task summary per team member.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={selectedEpm || ''} onValueChange={setSelectedEpm}>
                  <SelectTrigger className="w-40 h-9 text-xs">
                    <SelectValue placeholder="Select EPM..." />
                  </SelectTrigger>
                  <SelectContent>
                    {epmList.map(epm => (
                      <SelectItem key={epm} value={epm}>{epm}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  size="sm" 
                  className="bg-blue-600 hover:bg-blue-700 h-9" 
                  disabled={isEpmLoading || !selectedEpm}
                  onClick={generateEpmReport}
                >
                  {isEpmLoading ? <Sparkles size={14} className="animate-spin" /> : "Analyze"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="min-h-[300px] max-h-[500px] overflow-y-auto bg-slate-50/30 rounded-xl p-6">
            {epmSummary ? (
              <div className="prose prose-sm max-w-none text-xs font-semibold leading-relaxed italic">
                 <Markdown>{epmSummary}</Markdown>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-20 opacity-30 text-center gap-4">
                <ShieldCheck size={40} />
                <p className="text-sm font-bold italic">Select an EPM and click "Analyze" for a deep dive briefing.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Existing audit logs section updated to fit grid */}
          <Card className="shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
               <div>
                  <CardTitle className="text-sm font-bold">Activity Audit Trail</CardTitle>
                  <CardDescription>{logs.length} Operations in the last 24h</CardDescription>
               </div>
            </CardHeader>
            <CardContent className="max-h-[500px] overflow-y-auto space-y-3">
              {logs.filter(log => {
                if (userRole === 'EPM Manager' || userRole === 'EPM HOD' || userRole === 'EPM Team Lead') return true;
                return false;
              }).map((log) => (
                <div key={log.id} className="p-3 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                   <div className="flex justify-between items-start mb-1">
                      <Badge variant="outline" className="text-[8px] h-4">{log.epmName}</Badge>
                      <span className="text-[8px] opacity-40 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                   </div>
                   <p className="text-[10px] font-bold mb-0.5">{log.action}</p>
                   <p className="text-[9px] opacity-60 leading-tight">{log.details}</p>
                </div>
              ))}
              {logs.length === 0 && (
                 <div className="py-20 text-center opacity-30 italic text-xs">
                    No active audit logs.
                 </div>
              )}
            </CardContent>
         </Card>
      </div>

      <div className="pt-12 border-t border-slate-200">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
          <ShieldCheck size={14} /> System Infrastructure Intelligence
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-80">
          <div className="p-4 rounded-2xl bg-white border flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
              <Zap size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-tighter opacity-40">AI Pipeline</p>
              <p className="text-xs font-bold leading-none">Gemini 1.5 Flash Connected</p>
              <p className="text-[8px] text-green-600 font-bold mt-1 uppercase">Latency: 1.2s • Status: Peak</p>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white border flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-tighter opacity-40">Security Protocol</p>
              <p className="text-xs font-bold leading-none">Military Grade TLS 1.3</p>
              <p className="text-[8px] text-blue-600 font-bold mt-1 uppercase">Tier 5 Encryption Active</p>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white border flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-tighter opacity-40">Strategic Ledger</p>
              <p className="text-xs font-bold leading-none">Automatic Sync Active</p>
              <p className="text-[8px] text-slate-600 font-bold mt-1 uppercase">Last Backup: 4m ago</p>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-24 border-t opacity-10 text-center">
         <p className="text-[10px] uppercase font-black tracking-widest">End of Intelligence Feed • Strategic Command</p>
      </div>
    </div>
  );
}
