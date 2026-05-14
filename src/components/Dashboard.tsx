import { useState } from "react";
import { User, EventProject } from "../types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { Calendar, MapPin, Users as UsersIcon, ChevronRight, Briefcase, RefreshCcw, User as UserIcon, Globe, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { generateDailyEPMDigest } from "../services/gemini";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import Markdown from "react-markdown";

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

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      toast.success('Synced 3 new tasks from ClickUp Workspace: "Deriv Event Queue"');
    }, 2000);
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
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'approved': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'under_review': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'on_hold': return 'bg-red-100 text-red-700 border-red-200';
      case 'reconciling': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
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
          <div className="bg-white border rounded-lg p-1 flex gap-1 shadow-sm">
             <button 
              onClick={() => setShowAll(false)}
              className={`px-4 py-1.5 text-[10px] font-black uppercase rounded transition-all ${!showAll ? 'bg-black text-white' : 'hover:bg-slate-50 text-slate-500'}`}
             >
               Personal
             </button>
             <button 
              onClick={() => setShowAll(true)}
              className={`px-4 py-1.5 text-[10px] font-black uppercase rounded transition-all ${showAll ? 'bg-black text-white' : 'hover:bg-slate-50 text-slate-500'}`}
             >
               Team View
             </button>
          </div>
          <Button variant="outline" size="sm" className="gap-2 h-9 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100" onClick={handleGenerateDigest} disabled={generatingDigest}>
            <Sparkles size={14} className={generatingDigest ? "animate-pulse" : ""} />
            AI Daily Digest
          </Button>
          <Button variant="outline" size="sm" className="gap-2 h-9" onClick={handleSync} disabled={syncing}>
            <RefreshCcw size={14} className={syncing ? "animate-spin" : ""} />
            Sync ClickUp
          </Button>
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 bg-white border border-dashed rounded-3xl">
          <div className="p-6 bg-slate-50 border rounded-full">
            <Briefcase className="w-10 h-10 opacity-20" />
          </div>
          <div>
            <h3 className="text-xl font-black">{showAll ? 'No active events found' : 'No events assigned to you'}</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              {showAll ? 'The organization currenty has no active event projects.' : 'Switch to Team View to review colleague work or create a new event draft.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card 
              key={project.id} 
              className={`cursor-pointer group overflow-hidden border-2 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${project.epmName === currentUser.name ? 'border-amber-100 bg-amber-50/5 hover:border-amber-400' : 'hover:border-slate-400 bg-white'}`}
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
                  <div className={`p-4 rounded-2xl flex flex-col gap-1 ${project.epmName === currentUser.name ? 'bg-amber-100/50' : 'bg-slate-50'}`}>
                    <span className="text-[9px] uppercase font-black opacity-30">Current Allocation</span>
                    <div className="text-xl font-black font-mono tracking-tighter">
                      {project.budget.total.toLocaleString()} <span className="text-xs opacity-50">{project.budget.currency}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDigestOpen} onOpenChange={setIsDigestOpen}>
        <DialogContent className="max-w-2xl rounded-3xl border-2 overflow-hidden p-0">
          <DialogHeader className="p-6 bg-amber-50 border-b">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="text-amber-500 fill-amber-500" size={20} />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Intelligent EPM Briefing</span>
            </div>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight italic">Daily Operational Digest</DialogTitle>
            <DialogDescription className="italic">AI-tailored summary of your progress, gaps, and focus areas based on your ${currentUser.role} level.</DialogDescription>
          </DialogHeader>
          <CardContent className="p-6 max-h-[60vh] overflow-y-auto">
             <div className="prose prose-slate max-w-none text-sm font-medium leading-relaxed italic">
                <Markdown>{digest || ''}</Markdown>
             </div>
          </CardContent>
          <div className="p-4 bg-slate-50 border-t text-center">
             <p className="text-[10px] uppercase font-black opacity-30 tracking-widest">Powered by Gemini 3.1 Pro & Strategic Analytics</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
