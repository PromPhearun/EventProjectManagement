import { useState, useEffect, useCallback } from "react";
import { User, EventProject } from "../types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { Calendar, MapPin, Users as UsersIcon, ChevronRight, Briefcase, RefreshCcw, User as UserIcon, Globe, Sparkles, Activity, Clock } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { generateDailyEPMDigest } from "../services/gemini";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import Markdown from "react-markdown";
import { ClickUpUpdate } from "../services/clickupService";

interface DashboardProps {
  projects: EventProject[];
  currentUser: User;
  onSelectProject: (id: string) => void;
}

export function Dashboard({ projects, currentUser, onSelectProject }: DashboardProps) {
  const [syncing, setSyncing] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [generatingDigest, setGeneratingDigest] = useState(false);
  const [digest, setDigest] = useState<string | null>(null);
  const [isDigestOpen, setIsDigestOpen] = useState(false);
  const [clickUpUpdates, setClickUpUpdates] = useState<ClickUpUpdate[]>([]);
  const [activeView, setActiveView] = useState<'projects' | 'tasks'>('projects');

  const fetchClickUpData = useCallback(async () => {
    try {
      const response = await fetch('/api/clickup/updates');
      if (response.ok) {
        const data = await response.json();
        setClickUpUpdates(data);
        return data;
      }
    } catch (error) {
      console.error("Failed to fetch ClickUp updates:", error);
    }
    return null;
  }, []);

  useEffect(() => {
    fetchClickUpData();
    const interval = setInterval(fetchClickUpData, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [fetchClickUpData]);

  const handleSync = async () => {
    setSyncing(true);
    const data = await fetchClickUpData();
    setSyncing(false);
    if (data && data.length > 0) {
      toast.success(`Synced ${data.length} tasks from ClickUp Workspace: "Deriv Event Queue"`);
    } else {
      toast.info('No new tasks found in ClickUp Workspace.');
    }
  };

  const handleGenerateDigest = async () => {
    setGeneratingDigest(true);
    try {
      const result = await generateDailyEPMDigest(projects, currentUser.role, currentUser.name);
      setDigest(result);
      setIsDigestOpen(true);
    } catch (error) {
      toast.error("Failed to generate AI Digest");
    } finally {
      setGeneratingDigest(false);
    }
  };

  const filteredProjects = showAll 
    ? projects 
    : projects.filter(p => p.epmName === currentUser.name);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50';
      case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50';
      case 'approved': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50';
      case 'under_review': return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50';
      case 'on_hold': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50';
      case 'reconciling': return 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800/50';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter uppercase">{showAll ? 'Global Pipeline' : `${currentUser.name.split(' ')[0]}'s Dashboard`}</h2>
          <p className="text-muted-foreground text-sm italic">
            {showAll ? 'Viewing all active projects in the organization.' : `Showing projects assigned to ${currentUser.name}.`}
          </p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <div className="bg-background border border-border rounded-lg p-1 flex gap-1 shadow-sm">
             <button 
              onClick={() => setActiveView('projects')}
              className={`px-4 py-1.5 text-[10px] font-black uppercase rounded transition-all ${activeView === 'projects' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-muted-foreground'}`}
             >
               Internal Projects
             </button>
             <button 
              onClick={() => setActiveView('tasks')}
              className={`px-4 py-1.5 text-[10px] font-black uppercase rounded transition-all ${activeView === 'tasks' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-muted-foreground'}`}
             >
               ClickUp Tasks {clickUpUpdates.length > 0 && <Badge className="ml-1 px-1 h-3 min-w-[12px] bg-amber-500 text-[8px]">{clickUpUpdates.length}</Badge>}
             </button>
          </div>
          
          <div className="bg-background border border-border rounded-lg p-1 flex gap-1 shadow-sm">
             <button 
              onClick={() => setShowAll(false)}
              className={`px-4 py-1.5 text-[10px] font-black uppercase rounded transition-all ${!showAll ? 'bg-muted text-foreground' : 'hover:bg-accent text-muted-foreground'}`}
             >
               Personal
             </button>
             <button 
              onClick={() => setShowAll(true)}
              className={`px-4 py-1.5 text-[10px] font-black uppercase rounded transition-all ${showAll ? 'bg-muted text-foreground' : 'hover:bg-accent text-muted-foreground'}`}
             >
               Team View
             </button>
          </div>
          <Button variant="outline" size="sm" className="gap-2 h-9 border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/30 font-black uppercase text-[10px]" onClick={handleGenerateDigest} disabled={generatingDigest}>
            <Sparkles size={14} className={generatingDigest ? "animate-pulse" : ""} />
            AI Daily Digest
          </Button>
          <Button variant="outline" size="sm" className="gap-2 h-9 border-border text-foreground font-black uppercase text-[10px]" onClick={handleSync} disabled={syncing}>
            <RefreshCcw size={14} className={syncing ? "animate-spin" : ""} />
            Sync ClickUp
          </Button>
        </div>
      </div>

      {activeView === 'tasks' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <Activity className="text-[#7B68EE]" size={20} />
              External ClickUp Task Queue
            </h3>
            <Badge variant="outline" className="bg-[#7B68EE]/10 text-[#7B68EE] border-[#7B68EE]/30 animate-pulse">Live Synchronization Active</Badge>
          </div>

          {clickUpUpdates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 bg-background border border-dashed border-[#7B68EE]/20 rounded-3xl">
              <div className="p-6 bg-[#7B68EE]/5 border border-[#7B68EE]/10 rounded-full">
                <Activity size={32} className="opacity-20 text-[#7B68EE]" />
              </div>
              <div>
                <h3 className="text-lg font-black text-foreground uppercase tracking-tight">No ClickUp Tasks Found</h3>
                <p className="text-muted-foreground text-xs max-w-sm mx-auto italic">
                  We're polling the Deriv Global ClickUp workspace but haven't received any automated task updates yet.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clickUpUpdates.map((update) => (
                <Card key={update.id} className="border-2 border-[#7B68EE]/20 hover:border-[#7B68EE]/50 bg-background transition-all hover:shadow-lg rounded-3xl overflow-hidden group">
                   <div className="p-4 flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#7B68EE] opacity-70 mb-1">ClickUp Task ID: {update.taskId}</span>
                          <h4 className="text-lg font-black text-foreground group-hover:text-[#7B68EE] transition-colors">{update.taskName}</h4>
                        </div>
                        <Badge className="bg-[#7B68EE] text-white hover:bg-[#7B68EE] uppercase text-[8px] font-bold">
                          {update.event.replace(/([A-Z])/g, ' $1').toLowerCase()}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground border-t border-[#7B68EE]/10 pt-3">
                         <div className="flex items-center gap-1.5">
                            <UserIcon size={12} className="text-[#7B68EE]" />
                            <span>Assignee: <span className="text-foreground">{update.assignees || 'Unassigned'}</span></span>
                         </div>
                         <div className="flex items-center gap-1.5">
                            <Clock size={12} className="text-[#7B68EE]" />
                            <span>Received: <span className="text-foreground italic">{new Date(update.timestamp).toLocaleTimeString()}</span></span>
                         </div>
                      </div>
                   </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 bg-background border border-dashed border-border rounded-3xl">
              <div className="p-6 bg-muted border border-border rounded-full">
                <Briefcase className="w-10 h-10 opacity-20 text-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-black text-foreground">{showAll ? 'No active events found' : 'No events assigned to you'}</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  {showAll ? 'The organization currently has no active event projects.' : 'Switch to Team View to review colleague work or create a new event draft.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <Card 
                  key={project.id} 
                  className={`cursor-pointer group overflow-hidden border-2 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${project.epmName === currentUser.name ? 'border-amber-500/20 bg-amber-500/5 hover:border-amber-400' : 'hover:border-primary border-border bg-card'}`}
                  onClick={() => onSelectProject(project.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline" className={`capitalize h-5 text-[9px] font-black tracking-tight ${getStatusColor(project.status)}`}>
                        {project.status.replace('_', ' ')}
                      </Badge>
                      {project.clickUpId && (
                        <Badge variant="outline" className="bg-[#7B68EE]/5 text-[#7B68EE] border-[#7B68EE]/20 font-mono text-[9px] h-5">
                          {project.clickUpId}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-xl font-black tracking-tight group-hover:text-amber-600 transition-colors flex items-center gap-2">
                      {project.title} <ChevronRight size={16} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 text-xs">
                      <MapPin size={12} /> {project.city}, {project.country}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0 text-sm">
                    <div className="grid grid-cols-2 gap-4 border-t pt-4">
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase font-black opacity-30">Execution Window</span>
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <Calendar size={12} className="opacity-40" /> {new Date(project.startDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase font-black opacity-30">Owner</span>
                        <div className="flex items-center gap-1.5 font-bold text-xs truncate">
                          <UserIcon size={12} className={project.epmName === currentUser.name ? 'text-amber-600' : 'opacity-40'} /> 
                          <span className={project.epmName === currentUser.name ? 'text-amber-600' : ''}>{project.epmName === currentUser.name ? 'ME' : project.epmName}</span>
                        </div>
                      </div>
                    </div>
                    {project.budget && (
                      <div className={`p-4 rounded-2xl flex flex-col gap-1 ${project.epmName === currentUser.name ? 'bg-amber-500/10' : 'bg-muted/50'}`}>
                        <span className="text-[9px] uppercase font-black opacity-30 text-foreground">Current Allocation</span>
                        <div className="text-xl font-black font-mono tracking-tighter text-foreground">
                          {project.budget.total.toLocaleString()} <span className="text-xs opacity-50">{project.budget.currency}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={isDigestOpen} onOpenChange={setIsDigestOpen}>
        <DialogContent className="max-w-2xl rounded-3xl border-2 border-border overflow-hidden p-0 bg-background">
          <DialogHeader className="p-6 bg-amber-500/10 border-b border-border">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="text-amber-500 fill-amber-500" size={20} />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Intelligent EPM Briefing</span>
            </div>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight italic text-foreground">Daily Operational Digest</DialogTitle>
            <DialogDescription className="italic text-muted-foreground">AI-tailored summary of your progress, gaps, and focus areas based on your {currentUser.role} level.</DialogDescription>
          </DialogHeader>
          <CardContent className="p-6 max-h-[60vh] overflow-y-auto bg-background">
             <div className="prose prose-slate dark:prose-invert max-w-none text-sm font-medium leading-relaxed italic text-foreground">
                <Markdown>{digest || ''}</Markdown>
             </div>
          </CardContent>
          <div className="p-4 bg-muted/30 border-t border-border text-center">
             <p className="text-[10px] uppercase font-black opacity-30 tracking-widest text-foreground">Powered by Gemini 3.1 Pro & Strategic Analytics</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
