import { useState, useEffect } from 'react';
import { db } from '../services/db';
import { EventProject, User, HandoverRecord } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { ArrowRightLeft, UserPlus, LogOut, Coffee, Briefcase, CheckCircle2, Clock, AlertCircle, Sparkles, ShieldCheck, PieChart as ChartIcon, Table as TableIcon, Layout as GraphicsIcon, ChevronRight, ChevronDown } from 'lucide-react';
import { generateHandoverBriefing } from '../services/gemini';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ChartTooltip } from 'recharts';

export function HandoverHub() {
  const [currentUser, setCurrentUser] = useState<User>(db.getCurrentUser());
  const [users, setUsers] = useState<User[]>(db.getUsers());
  const [projects, setProjects] = useState<EventProject[]>([]);
  const [handovers, setHandovers] = useState<HandoverRecord[]>([]);
  const [showReturnDialog, setShowReturnDialog] = useState<string | null>(null);
  const [absenceUpdate, setAbsenceUpdate] = useState('');
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);
  
  const [formData, setFormData] = useState({
    projectId: '',
    toEpm: '',
    reason: 'On Leave' as 'On Leave' | 'Resign' | 'Return Handover',
    briefing: '',
    shortBriefing: '',
    visualData: undefined as any
  });
  const [isShortVersion, setIsShortVersion] = useState(false);
  const [expandedVisuals, setExpandedVisuals] = useState<string | null>(null);

  useEffect(() => {
    refresh();
  }, [currentUser]);

  const refresh = () => {
    const allProjects = db.getProjects();
    const myProjects = allProjects.filter(p => p.epmName === currentUser.name);
    setProjects(myProjects);
    setHandovers(db.getHandovers());
    setUsers(db.getUsers());
  };

  const switchUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      db.setCurrentUser(user);
      setCurrentUser(user);
      toast.success(`Logged in as ${user.name} (${user.role})`);
      window.location.reload(); 
    }
  };

  const handleHandover = (customReason?: 'Return Handover', customTo?: string, customProject?: string, customBriefing?: string) => {
    const reason = customReason || formData.reason;
    const toEpm = customTo || formData.toEpm;
    const projectId = customProject || formData.projectId;
    const briefing = customBriefing || formData.briefing;

    if (!projectId || !toEpm || !briefing) {
      toast.error('Please fill in all handover details.');
      return;
    }

    const allProj = db.getProjects();
    const project = allProj.find(p => p.id === projectId);

    const newRecord: HandoverRecord = {
      id: Math.random().toString(36).substr(2, 9),
      fromEpm: currentUser.name,
      toEpm: toEpm,
      projectId: projectId,
      projectTitle: project?.title || 'Unknown Project',
      reason: reason,
      briefing: briefing,
      shortBriefing: formData.shortBriefing,
      visualData: formData.visualData,
      date: new Date().toISOString(),
      status: 'pending',
      isAutomatedReturn: reason === 'Return Handover'
    };

    db.createHandover(newRecord);
    
    // Log Activity
    db.logActivity({
      id: Math.random().toString(36).substr(2, 9),
      epmName: currentUser.name,
      action: reason === 'Return Handover' ? 'Returned Task' : 'Initiated Handover',
      timestamp: new Date().toISOString(),
      details: `${reason === 'Return Handover' ? 'Handed back' : 'Handed over'} "${project?.title}" to ${toEpm} due to ${reason}.`
    });

    toast.success(`${reason === 'Return Handover' ? 'Return request' : 'Handover request'} sent to ${toEpm}`);
    setFormData({ 
      projectId: '', 
      toEpm: '', 
      reason: 'On Leave', 
      briefing: '',
      shortBriefing: '',
      visualData: undefined
    });
    refresh();
  };

  const respondToHandover = (id: string, status: 'accepted' | 'completed') => {
    db.updateHandoverStatus(id, status);
    
    if (status === 'accepted') {
      const h = handovers.find(x => x.id === id);
      toast.success(`Project "${h?.projectTitle}" has been added to your dashboard.`);
    }
    
    refresh();
  };

  const projectsImCovering = projects.filter(p => {
    // A project I am covering is one where I am the EPM but there's a handover record TO me with status 'accepted'
    // For simplicity, we search handovers where toEpm === currentUser.name and status === 'accepted' 
    // and the project's current epm is me.
    return handovers.some(h => h.toEpm === currentUser.name && h.status === 'accepted' && h.projectId === p.id && h.reason === 'On Leave');
  });

  const handleAutoBriefing = async () => {
    if (!formData.projectId) {
      toast.error("Select a project first!");
      return;
    }
    const project = projects.find(p => p.id === formData.projectId);
    if (!project) return;

    setIsGeneratingBriefing(true);
    try {
      const data = await generateHandoverBriefing(project);
      setFormData({ 
        ...formData, 
        briefing: data.full,
        shortBriefing: data.short,
        visualData: data.visualData
      });
      toast.success("AI Strategic Handover Intelligence Generated");
    } catch (error) {
      toast.error("Failed to generate AI briefing");
    } finally {
      setIsGeneratingBriefing(false);
    }
  };

  const handleReturnHandover = (projectId: string) => {
    const lastHandover = handovers.find(h => h.projectId === projectId && h.toEpm === currentUser.name && h.status === 'accepted');
    if (lastHandover) {
      handleHandover('Return Handover', lastHandover.fromEpm, projectId, absenceUpdate);
      setShowReturnDialog(null);
      setAbsenceUpdate('');
    }
  };

  const getUserAvatar = (name: string) => {
    const user = users.find(u => u.name === name);
    return user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${name}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter uppercase">EPM Continuity Center</h2>
          <p className="text-muted-foreground italic">Manage task relocation for leaves, resignations, and team support.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 border rounded-xl shadow-sm">
           <span className="text-[10px] uppercase font-black opacity-30 ml-2">Switch User:</span>
           <div className="flex gap-1 overflow-x-auto max-w-[400px]">
             {users.map(u => (
               <button 
                key={u.id}
                onClick={() => switchUser(u.id)}
                className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold transition-all relative ${currentUser.id === u.id ? 'ring-2 ring-amber-400' : 'hover:opacity-80'}`}
                title={`${u.name} (${u.role})`}
               >
                 {u.avatar ? (
                   <img src={u.avatar} alt={u.name} className="w-full h-full rounded-full object-cover" />
                 ) : (
                   <div className={`w-full h-full rounded-full flex items-center justify-center ${currentUser.id === u.id ? 'bg-black text-white' : 'bg-slate-100 text-slate-500'}`}>
                     {u.name.split(' ').map(n => n[0]).join('')}
                   </div>
                 )}
                 <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[7px] font-black uppercase opacity-100 whitespace-nowrap bg-white px-1 shadow-sm border rounded">
                   {u.role.substring(0, 3)}
                 </span>
               </button>
             ))}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-2 border-black/5 shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowRightLeft className="text-blue-600" size={18} /> Initiate Handover
              </CardTitle>
              <CardDescription>Handover your tasks for leave or transition.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase opacity-50">Project to Handover</label>
                <Select value={formData.projectId} onValueChange={id => setFormData({...formData, projectId: id})}>
                  <SelectTrigger><SelectValue placeholder="Select active project..." /></SelectTrigger>
                  <SelectContent>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                    {projects.length === 0 && <SelectItem value="none" disabled>No active projects</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase opacity-50">Assign To Colleague</label>
                <Select value={formData.toEpm} onValueChange={name => setFormData({...formData, toEpm: name})}>
                  <SelectTrigger><SelectValue placeholder="Select colleague..." /></SelectTrigger>
                  <SelectContent>
                    {users.filter(u => u.id !== currentUser.id && u.role.startsWith('EPM')).map(u => (
                      <SelectItem key={u.id} value={u.name}>{u.name} ({u.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase opacity-50">Reason for Handover</label>
                <div className="flex gap-2">
                   <Button 
                    variant={formData.reason === 'On Leave' ? 'default' : 'outline'}
                    className="flex-1 gap-2 text-xs"
                    onClick={() => setFormData({...formData, reason: 'On Leave'})}
                   >
                     <Coffee size={14} /> On Leave
                   </Button>
                   <Button 
                    variant={formData.reason === 'Resign' ? 'default' : 'outline'}
                    className="flex-1 gap-2 text-xs"
                    onClick={() => setFormData({...formData, reason: 'Resign'})}
                   >
                     <LogOut size={14} /> Resign
                   </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase opacity-50">Strategic Briefing</label>
                  <div className="flex gap-2">
                    {formData.shortBriefing && (
                      <button 
                         onClick={() => setIsShortVersion(!isShortVersion)}
                         className="text-[9px] font-black uppercase text-blue-600 hover:underline px-2"
                      >
                         {isShortVersion ? 'Show Full Detail' : 'Shorten Brief'}
                      </button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleAutoBriefing}
                      disabled={isGeneratingBriefing || !formData.projectId}
                      className="h-7 px-3 text-[10px] bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 gap-1.5 shadow-sm"
                    >
                      <Sparkles size={12} className={isGeneratingBriefing ? "animate-spin" : ""} />
                      {isGeneratingBriefing ? 'Generating...' : 'AI Strategic Brief'}
                    </Button>
                  </div>
                </div>
                <Textarea 
                  placeholder="The AI can draft this based on your project progress. Select project above..."
                  className={`min-h-[140px] text-sm bg-white/50 border-2 focus:border-blue-500 rounded-2xl transition-all ${isShortVersion ? 'min-h-[80px]' : ''}`}
                  value={isShortVersion ? formData.shortBriefing : formData.briefing}
                  onChange={e => {
                    if (isShortVersion) setFormData({...formData, shortBriefing: e.target.value});
                    else setFormData({...formData, briefing: e.target.value});
                  }}
                />
                <p className="text-[9px] opacity-40 italic text-center">
                   Tip: The AI Briefing analyzes budget, itinerary gaps, and upcoming deadlines.
                </p>
              </div>

              <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 font-black uppercase tracking-[0.1em] rounded-2xl shadow-lg active:scale-[0.98] transition-all" onClick={() => handleHandover()}>
                Initialize Handover Protocol
              </Button>
            </CardContent>
          </Card>

          {projectsImCovering.length > 0 && (
            <Card className="border-2 border-amber-200 bg-amber-50/30">
               <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-black uppercase tracking-tighter flex items-center gap-2">
                    <UserPlus size={16} className="text-amber-600" /> Tasks You are Covering
                  </CardTitle>
               </CardHeader>
               <CardContent className="space-y-3">
                  {projectsImCovering.map(p => (
                    <div key={p.id} className="p-3 bg-white border rounded-xl flex justify-between items-center shadow-sm">
                       <div>
                         <p className="font-bold text-xs">{p.title}</p>
                         <p className="text-[10px] opacity-40 uppercase font-black">Covering for Leave</p>
                       </div>
                       <Button size="sm" variant="outline" className="h-7 text-[10px] font-black uppercase text-amber-600 border-amber-200" onClick={() => setShowReturnDialog(p.id)}>
                         Give Back
                       </Button>
                    </div>
                  ))}
               </CardContent>
            </Card>
          )}

          {showReturnDialog && (
             <Card className="border-2 border-green-400 animate-in zoom-in-95 duration-200">
                <CardHeader>
                  <CardTitle className="text-sm font-black">Hand Back Update</CardTitle>
                  <CardDescription>Summarize what happened while the colleague was away.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-end">
                    <button 
                      onClick={async () => {
                        const project = db.getProjects().find(p => p.id === showReturnDialog);
                        if (!project) return;
                        setIsGeneratingBriefing(true);
                        try {
                          const result = await generateHandoverBriefing(project);
                          setAbsenceUpdate(result);
                        } catch (e) { toast.error("AI Error"); }
                        finally { setIsGeneratingBriefing(false); }
                      }}
                      className="text-[10px] font-black uppercase text-amber-600 flex items-center gap-1 hover:text-amber-700"
                    >
                      <Sparkles size={10} className={isGeneratingBriefing ? "animate-spin" : ""} /> AI Suggest Return Summary
                    </button>
                  </div>
                  <Textarea 
                    placeholder="Provide specific updates on what was completed, blockers solved..."
                    className="min-h-[100px] text-xs"
                    value={absenceUpdate}
                    onChange={e => setAbsenceUpdate(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 text-xs" onClick={() => setShowReturnDialog(null)}>Cancel</Button>
                    <Button className="flex-1 text-xs bg-green-600 hover:bg-green-700" onClick={() => handleReturnHandover(showReturnDialog)}>Confirm Return</Button>
                  </div>
                </CardContent>
             </Card>
          )}
        </div>

        <div className="lg:col-span-2 space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <UserPlus size={18} className="text-green-600" /> Inbox: New Requests
                </h3>
                <div className="space-y-4">
                  {handovers.filter(h => h.toEpm === currentUser.name && h.status === 'pending').map(h => (
                    <Card key={h.id} className={`border-l-4 shadow-md ${h.reason === 'Return Handover' ? 'border-l-blue-600 bg-blue-50/5' : 'border-l-green-600'}`}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="text-[10px] font-bold uppercase opacity-40">{h.reason === 'Return Handover' ? 'Task Returning to You' : 'New Cover Request'}</p>
                            <h4 className="text-xl font-bold">{h.projectTitle}</h4>
                            <p className="text-xs mt-1">From: <span className="font-bold">{h.fromEpm}</span> • Reason: <Badge variant="outline" className="ml-1 text-[9px] h-5">{h.reason}</Badge></p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="text-xs h-8 font-black uppercase" onClick={() => respondToHandover(h.id, 'accepted')}>Takeover</Button>
                          </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 italic text-sm text-slate-700 shadow-inner relative group">
                           <div className="absolute -top-3 -right-3">
                              <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-sm animate-bounce">
                                 <Sparkles size={14} />
                              </div>
                           </div>
                           <p className="font-black text-[10px] uppercase text-amber-600 mb-3 flex items-center gap-1.5 font-sans not-italic">
                              <ShieldCheck size={12} /> AI Intelligent Digest:
                           </p>
                           <div className="whitespace-pre-wrap leading-relaxed">
                              {h.shortBriefing && (
                                <div className="mb-4 flex gap-2">
                                  <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none rounded-sm px-1.5 h-4 text-[8px] font-black uppercase">vShort</Badge>
                                  <p className="text-[10px] leading-tight font-black opacity-80">{h.shortBriefing}</p>
                                </div>
                              )}
                              {h.briefing}
                           </div>

                           {h.visualData && (
                             <div className="mt-8 border-t border-amber-100 pt-6">
                                <button 
                                  onClick={() => setExpandedVisuals(expandedVisuals === h.id ? null : h.id)}
                                  className="w-full h-10 px-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl flex items-center justify-between text-amber-900 group transition-all"
                                >
                                   <div className="flex items-center gap-2">
                                      <ChartIcon size={14} className="group-hover:rotate-12 transition-transform" />
                                      <span className="text-[11px] font-black uppercase tracking-widest">Execute Visual Analytics</span>
                                   </div>
                                   {expandedVisuals === h.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </button>

                                {expandedVisuals === h.id && (
                                  <div className="mt-6 space-y-6 animate-in slide-in-from-top-2 duration-300">
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                                        <div className="h-[180px] w-full">
                                           <p className="text-[9px] font-black uppercase text-slate-400 mb-2">Task Distribution (Strategic Health)</p>
                                           <ResponsiveContainer width="100%" height="100%">
                                              <PieChart>
                                                 <Pie 
                                                   data={h.visualData.taskCategories} 
                                                   innerRadius={45} 
                                                   outerRadius={65} 
                                                   paddingAngle={5} 
                                                   dataKey="value"
                                                 >
                                                    {h.visualData.taskCategories.map((_, index) => (
                                                      <Cell key={`cell-${index}`} fill={['#f59e0b', '#10b981', '#3b82f6', '#ef4444'][index % 4]} />
                                                    ))}
                                                 </Pie>
                                                 <ChartTooltip />
                                              </PieChart>
                                           </ResponsiveContainer>
                                        </div>
                                        <div className="space-y-4">
                                           <div className="flex items-center gap-2 mb-2">
                                              <TableIcon size={12} className="text-amber-600" />
                                              <p className="text-[9px] font-black uppercase text-slate-400">Critical Milestones Table</p>
                                           </div>
                                           <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white">
                                              <table className="w-full text-left text-[10px]">
                                                 <thead>
                                                    <tr className="bg-slate-50 border-b">
                                                       <th className="p-2 font-black">Milestone</th>
                                                       <th className="p-2 font-black">Status</th>
                                                    </tr>
                                                 </thead>
                                                 <tbody className="divide-y divide-slate-50">
                                                    {h.visualData.upcomingMilestones.map((ms, i) => (
                                                      <tr key={i}>
                                                         <td className="p-2 font-bold opacity-70 truncate max-w-[100px]">{ms.name}</td>
                                                         <td className="p-2">
                                                            <Badge 
                                                               variant="outline" 
                                                               className={`text-[8px] h-4 border-none ${
                                                                  ms.status === 'completed' ? 'bg-green-50 text-green-700' :
                                                                  ms.status === 'at_risk' ? 'bg-red-50 text-red-700' :
                                                                  'bg-blue-50 text-blue-700'
                                                               }`}
                                                            >
                                                               {ms.status.replace('_', ' ')}
                                                            </Badge>
                                                         </td>
                                                      </tr>
                                                    ))}
                                                 </tbody>
                                              </table>
                                           </div>
                                        </div>
                                     </div>
                                     <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                           <GraphicsIcon size={18} />
                                        </div>
                                        <div>
                                           <p className="text-[9px] font-black uppercase text-indigo-400">System Recommendation</p>
                                           <p className="text-[10px] font-bold text-indigo-900 leading-tight">
                                              High operational velocity detected. Proceed with takeover immediately to maintain milestone alignment.
                                           </p>
                                        </div>
                                     </div>
                                  </div>
                                )}
                             </div>
                           )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {handovers.filter(h => h.toEpm === currentUser.name && h.status === 'pending').length === 0 && (
                    <div className="py-12 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-slate-400 gap-2 bg-slate-50">
                      <CheckCircle2 size={32} className="opacity-10" />
                      <p className="text-xs font-medium italic opacity-60 uppercase tracking-widest font-black">Inbox Clear</p>
                    </div>
                  )}
                </div>
             </div>

             <div className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2 border-l-4 border-l-amber-400 pl-3">
                  <Clock size={18} className="text-amber-600" /> Outgoing Tracking
                </h3>
                <div className="space-y-3">
                   {handovers.filter(h => h.fromEpm === currentUser.name && h.status === 'pending').map(h => (
                      <div key={h.id} className="p-4 bg-white border rounded-2xl flex justify-between items-center shadow-sm">
                         <div>
                            <p className="font-bold text-xs">{h.projectTitle}</p>
                            <p className="text-[10px] opacity-60">Pending approval by {h.toEpm}</p>
                         </div>
                         <Badge variant="secondary" className="text-[9px] animate-pulse">Awaiting</Badge>
                      </div>
                   ))}
                   {handovers.filter(h => h.fromEpm === currentUser.name && h.status === 'pending').length === 0 && (
                     <div className="py-10 text-center opacity-30 italic text-xs border rounded-2xl">No active outgoing requests.</div>
                   )}
                </div>
             </div>
           </div>

           <div>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Briefcase size={18} className="text-slate-600" /> Continuity Audit Log
              </h3>
              <div className="bg-white border rounded-3xl overflow-hidden shadow-2xl">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="px-6 py-4 text-[10px] uppercase font-black opacity-40">Timeline</th>
                          <th className="px-6 py-4 text-[10px] uppercase font-black opacity-40">Transition</th>
                          <th className="px-6 py-4 text-[10px] uppercase font-black opacity-40">Project</th>
                          <th className="px-6 py-4 text-[10px] uppercase font-black opacity-40">Type</th>
                          <th className="px-6 py-4 text-[10px] uppercase font-black opacity-40 text-right">Auth</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {handovers.slice().reverse().map(h => (
                          <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 text-xs opacity-60 font-mono">
                              {new Date(h.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 font-black text-[10px] uppercase">
                                <img src={getUserAvatar(h.fromEpm)} className="w-5 h-5 rounded-full border border-white shadow-sm" alt={h.fromEpm} referrerPolicy="no-referrer" />
                                {h.fromEpm} 
                                <ArrowRightLeft size={10} className="opacity-30" /> 
                                <img src={getUserAvatar(h.toEpm)} className="w-5 h-5 rounded-full border border-white shadow-sm" alt={h.toEpm} referrerPolicy="no-referrer" />
                                {h.toEpm}
                              </div>
                            </td>
                            <td className="px-6 py-4 font-bold text-xs truncate max-w-[150px]">
                              {h.projectTitle}
                            </td>
                            <td className="px-6 py-4">
                               <Badge variant={h.reason === 'On Leave' ? 'secondary' : (h.reason === 'Return Handover' ? 'outline' : 'destructive')} className="text-[9px] h-5 px-2 uppercase font-black">
                                 {h.reason}
                               </Badge>
                            </td>
                            <td className="px-6 py-4 text-right">
                               <div className="flex items-center justify-end gap-1">
                                 {h.status === 'pending' ? <Clock size={12} className="text-amber-500" /> : <CheckCircle2 size={12} className="text-green-500" />}
                                 <span className={`text-[9px] font-black uppercase ${h.status === 'pending' ? 'text-amber-600' : 'text-green-600'}`}>{h.status}</span>
                               </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                 </div>
                 {handovers.length === 0 && (
                   <div className="py-20 text-center opacity-30 italic text-sm">No transition records in audit log.</div>
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
