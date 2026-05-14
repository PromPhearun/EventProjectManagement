import { useState, useEffect } from 'react';
import { EventProject, ApprovalTemplate } from '../types';
import { db } from '../services/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Share2, FileText, CheckCircle2, User, Shield, Clock, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ApprovalTemplateTabProps {
  project: EventProject;
  onUpdate: (project: EventProject) => void;
}

export function ApprovalTemplateTab({ project, onUpdate }: ApprovalTemplateTabProps) {
  const [template, setTemplate] = useState<ApprovalTemplate>(
    project.approvalTemplate || {
      id: Math.random().toString(36).substr(2, 9),
      tripLeadName: '',
      tripLeadSection: '',
      epmSection: '',
      budgetStatus: 'draft',
      itineraryStatus: 'draft',
      sharedWith: [],
      lastUpdated: new Date().toISOString()
    }
  );

  const [isShorten, setIsShorten] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const updatedTemplate = {
      ...template,
      lastUpdated: new Date().toISOString()
    };
    
    const updatedProject = {
      ...project,
      approvalTemplate: updatedTemplate
    };

    db.saveProject(updatedProject);
    onUpdate(updatedProject);
    setIsSaving(false);
    toast.success('Approval Template saved successfully!');
  };

  const getShareLink = () => {
    const baseUrl = window.location.origin;
    const fullLink = `${baseUrl}?tab=tl-feedback&eventId=${project.id}`;
    const shortLink = `https://deriv.events/s/${project.id.substring(0,6)}`;
    
    const finalLink = isShorten ? shortLink : fullLink;
    navigator.clipboard.writeText(finalLink);
    toast.info(`${isShorten ? 'Shortened' : 'Full'} share link copied to clipboard!`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="text-blue-600" /> Approval Template
          </h2>
          <p className="text-muted-foreground text-sm italic">
            Co-filled by Trip Lead and EPM. Last updated: {new Date(template.lastUpdated).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-50 border px-3 py-1.5 rounded-lg">
             <input 
              type="checkbox" 
              id="shorten" 
              checked={isShorten} 
              onChange={e => setIsShorten(e.target.checked)}
              className="w-3 h-3 accent-black"
             />
             <label htmlFor="shorten" className="text-[10px] font-black uppercase opacity-60 cursor-pointer">Short Link</label>
          </div>
          <Button variant="outline" size="sm" onClick={getShareLink} className="gap-2 font-black uppercase text-[10px]">
            <Share2 size={14} /> Get Shared Link
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-l-4 border-l-blue-600">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User size={18} /> Trip Lead Section
                  </CardTitle>
                  <CardDescription>Event objectives, on-ground goals, and logistical priorities.</CardDescription>
                </div>
                <Badge variant={template.tripLeadSection ? "default" : "outline"}>
                  {template.tripLeadSection ? "Completed" : "Pending"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <label className="text-[10px] font-bold uppercase opacity-50 font-mono">Trip Lead Name</label>
                   <Input 
                    placeholder="e.g., Jane Cooper" 
                    value={template.tripLeadName}
                    onChange={(e) => setTemplate({...template, tripLeadName: e.target.value})}
                   />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase opacity-50 font-mono">Trip Lead Strategy & Goal</label>
                <Textarea 
                  placeholder="Describe the main focus for this event..." 
                  className="min-h-[150px]"
                  value={template.tripLeadSection}
                  onChange={(e) => setTemplate({...template, tripLeadSection: e.target.value})}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-600">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield size={18} /> EPM Section
                  </CardTitle>
                  <CardDescription>Budget verification, supplier contracts, and risk assessment.</CardDescription>
                </div>
                <Badge variant={template.epmSection ? "default" : "outline"} className="bg-green-100 text-green-800 hover:bg-green-50">
                   {template.epmSection ? "Completed" : "Pending"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase opacity-50 font-mono">EPM Technical Review</label>
                <Textarea 
                  placeholder="Compliance review, supplier performance history, and budget alignment..." 
                  className="min-h-[150px]"
                  value={template.epmSection}
                  onChange={(e) => setTemplate({...template, epmSection: e.target.value})}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-50 border-none shadow-none">
            <CardHeader>
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
               <Button className="w-full justify-start gap-2" variant="outline" onClick={() => window.open(`https://app.clickup.com/t/${project.clickUpId || 'mock'}`, '_blank')}>
                    <ExternalLink size={14} /> Open ClickUp Task
               </Button>
               <Button 
                className="w-full justify-start gap-2" 
                variant="default"
                onClick={handleSave}
                disabled={isSaving}
               >
                 {isSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                 Save All Changes
               </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Status Tracker</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="opacity-60 flex items-center gap-1"><Clock size={12} /> Budget Status</span>
                <Badge variant="outline">{template.budgetStatus}</Badge>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="opacity-60 flex items-center gap-1"><Clock size={12} /> Itinerary Status</span>
                <Badge variant="outline">{template.itineraryStatus}</Badge>
              </div>
              <div className="pt-4 border-t">
                <p className="text-[10px] uppercase font-bold opacity-40 mb-2">Reviewers</p>
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-[10px] text-white">JD</div>
                  <div className="w-8 h-8 rounded-full bg-green-500 border-2 border-white flex items-center justify-center text-[10px] text-white">TL</div>
                  <div className="w-8 h-8 rounded-full bg-slate-300 border-2 border-white flex items-center justify-center text-[10px] text-slate-600">+1</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
