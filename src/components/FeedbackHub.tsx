import { useState, useEffect } from 'react';
import { db } from '../services/db';
import { EventProject, TLFeedback, UserRole } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { CheckCircle2, AlertCircle, UserCheck, ShieldCheck, Star, Users, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface FeedbackHubProps {
  userRole: UserRole;
}

export function FeedbackHub({ userRole }: FeedbackHubProps) {
  const [projects, setProjects] = useState<EventProject[]>([]);
  const isExecutive = ['EPM Executive', 'EPM Senior Executive'].includes(userRole);
  const isManagement = ['EPM Manager', 'EPM HOD'].includes(userRole);
  const isTeamLead = userRole === 'EPM Team Lead';
  const [selectedProject, setSelectedProject] = useState<EventProject | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('tl-feedback');
  
  const [feedbackData, setFeedbackData] = useState({
    tlRemark: '',
    tlRating: 5,
    memberReflection: '',
    memberRating: 5,
    managerRemark: '',
    managerRating: 5
  });

  useEffect(() => {
    setProjects(db.getProjects().filter(p => p.status === 'completed' || p.status === 'approved'));
  }, []);

  const openFeedback = (p: EventProject) => {
    setSelectedProject(p);
    setFeedbackData({
      tlRemark: p.tlFeedback?.tlRemark || '',
      tlRating: p.tlFeedback?.tlRating || 5,
      memberReflection: p.tlFeedback?.memberReflection || '',
      memberRating: p.tlFeedback?.memberRating || 5,
      managerRemark: p.tlFeedback?.managerRemark || '',
      managerRating: p.tlFeedback?.managerRating || 5
    });
    setShowReviewModal(true);
  };

  const saveFeedback = () => {
    if (!selectedProject) return;

    const updatedFeedback: TLFeedback = {
      id: selectedProject.tlFeedback?.id || Math.random().toString(36).substr(2, 9),
      eventId: selectedProject.id,
      ...feedbackData,
      status: 'reviewed'
    };

    const updatedProject = { ...selectedProject, tlFeedback: updatedFeedback };
    db.saveProject(updatedProject);
    setProjects(projects.map(p => p.id === selectedProject.id ? updatedProject : p));
    setShowReviewModal(false);
    toast.success('Feedback recorded successfully!');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black tracking-tighter">Feedback Hub</h2>
          <p className="text-muted-foreground">Strategic performance evaluation and excellence tracking.</p>
        </div>
        <Badge variant="outline" className="h-8 px-4 font-bold border-black/10">
          Role: {userRole}
        </Badge>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md bg-white border border-black/5 shadow-sm mb-6">
          <TabsTrigger value="tl-feedback" className="gap-2 font-bold uppercase text-[10px] tracking-widest">
            <Users size={14} /> Team Lead Feedback
          </TabsTrigger>
          <TabsTrigger value="manager-feedback" className="gap-2 font-bold uppercase text-[10px] tracking-widest">
            <ShieldCheck size={14} /> Manager Overall
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tl-feedback">
          <Card className="border-none shadow-xl shadow-black/5 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="text-sm font-bold">Project Team Performance</CardTitle>
              <CardDescription>TL reviews per individual event project.</CardDescription>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Event</TableHead>
                  <TableHead>EPM</TableHead>
                  <TableHead>TL Status</TableHead>
                  <TableHead>TL Review</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-bold">{p.title}</TableCell>
                    <TableCell>
                       <div className="flex flex-col">
                          <span className="text-xs font-bold">{p.epmName}</span>
                          <span className="text-[10px] opacity-40 uppercase tracking-tighter">{p.type}</span>
                       </div>
                    </TableCell>
                    <TableCell>
                      {p.tlFeedback?.status === 'reviewed' ? (
                        <Badge variant="success" className="gap-1"><CheckCircle2 size={12} /> Reviewed</Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 opacity-50"><AlertCircle size={12} /> Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                       {p.tlFeedback?.tlRemark ? (
                          <p className="text-[10px] italic opacity-60 line-clamp-1 max-w-[200px]">"{p.tlFeedback.tlRemark}"</p>
                       ) : (
                          <span className="text-[10px] opacity-20">No remark yet</span>
                       )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        variant={!isExecutive ? 'default' : 'outline'} 
                        onClick={() => openFeedback(p)}
                      >
                        {isTeamLead ? 'Grade Team' : 'View Audit'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="manager-feedback">
          <Card className="border-none shadow-xl shadow-black/5 overflow-hidden">
            <CardHeader className="bg-indigo-50/30 border-b">
              <CardTitle className="text-sm font-bold text-indigo-900">Manager Strategic Oversight</CardTitle>
              <CardDescription>Executive level feedback across all operations.</CardDescription>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Event Project</TableHead>
                  <TableHead>EPM</TableHead>
                  <TableHead>Manager Verdict</TableHead>
                  <TableHead>Strategic Note</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-bold">{p.title}</TableCell>
                    <TableCell className="text-xs font-medium">{p.epmName}</TableCell>
                    <TableCell>
                      {p.tlFeedback?.managerRemark ? (
                        <div className="flex items-center gap-1 text-indigo-600 font-black text-xs">
                          <Star size={12} className="fill-indigo-600" /> {p.tlFeedback.managerRating} / 5
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-[9px] opacity-30 italic">Unreviewed by Manager</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                       <p className="text-[10px] font-medium opacity-70 line-clamp-1 max-w-[300px]">
                          {p.tlFeedback?.managerRemark || "Pending executive summary..."}
                       </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        variant={isManagement ? 'default' : 'outline'} 
                        onClick={() => openFeedback(p)}
                        className={isManagement ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                      >
                        {isManagement ? 'Final Verdict' : 'View Summary'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">{selectedProject?.title}</DialogTitle>
            <DialogDescription className="font-medium">
               Multi-layer performance review for EPM: <span className="text-black">{selectedProject?.epmName}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4">
             {/* EPM Column */}
            <div className={`space-y-4 p-5 rounded-2xl border ${isExecutive ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 opacity-60'}`}>
              <div className="flex items-center gap-3 mb-2">
                 <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <UserCheck size={18} />
                 </div>
                 <h4 className="font-black text-xs uppercase tracking-wider text-blue-900">EPM Self-Reflection</h4>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase opacity-40">Self-Rating</label>
                <Select 
                  disabled={!isExecutive}
                  value={feedbackData.memberRating.toString()} 
                  onValueChange={v => setFeedbackData({...feedbackData, memberRating: parseInt(v)})}
                >
                  <SelectTrigger className="border-white/50 bg-white/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5].map(n => <SelectItem key={n} value={n.toString()}>{n} Stars</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase opacity-40">Personal Perspective</label>
                <Textarea 
                  disabled={!isExecutive}
                  placeholder="How do you think it went?..." 
                  className="min-h-[150px] border-white/50 bg-white/50 text-xs"
                  value={feedbackData.memberReflection}
                  onChange={e => setFeedbackData({...feedbackData, memberReflection: e.target.value})}
                />
              </div>
            </div>

            {/* TL Column */}
            <div className={`space-y-4 p-5 rounded-2xl border ${isTeamLead ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50 opacity-60'}`}>
              <div className="flex items-center gap-3 mb-2">
                 <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                    <ShieldCheck size={18} />
                 </div>
                 <h4 className="font-black text-xs uppercase tracking-wider text-amber-900">TL Team Review</h4>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase opacity-40">Operational Score</label>
                <Select 
                  disabled={!isTeamLead}
                  value={feedbackData.tlRating.toString()} 
                  onValueChange={v => setFeedbackData({...feedbackData, tlRating: parseInt(v)})}
                >
                  <SelectTrigger className="border-white/50 bg-white/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5].map(n => <SelectItem key={n} value={n.toString()}>{n} Stars</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase opacity-40">Operations Feedback</label>
                <Textarea 
                  disabled={!isTeamLead}
                  placeholder="Review the team's execution..." 
                  className="min-h-[150px] border-white/50 bg-white/50 text-xs"
                  value={feedbackData.tlRemark}
                  onChange={e => setFeedbackData({...feedbackData, tlRemark: e.target.value})}
                />
              </div>
            </div>

            {/* Manager Column */}
            <div className={`space-y-4 p-5 rounded-2xl border ${isManagement ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50 opacity-60'}`}>
              <div className="flex items-center gap-3 mb-2">
                 <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <Star size={18} />
                 </div>
                 <h4 className="font-black text-xs uppercase tracking-wider text-indigo-900">Manager Verdict</h4>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase opacity-40">Overall Excellence</label>
                <Select 
                  disabled={!isManagement}
                  value={feedbackData.managerRating.toString()} 
                  onValueChange={v => setFeedbackData({...feedbackData, managerRating: parseInt(v)})}
                >
                  <SelectTrigger className="border-white/50 bg-white/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5].map(n => <SelectItem key={n} value={n.toString()}>{n} Stars</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase opacity-40">Strategic Guidance</label>
                <Textarea 
                  disabled={!isManagement}
                  placeholder="Managerial oversight notes..." 
                  className="min-h-[150px] border-white/50 bg-white/50 text-xs"
                  value={feedbackData.managerRemark}
                  onChange={e => setFeedbackData({...feedbackData, managerRemark: e.target.value})}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="bg-slate-50 p-4 -m-6 mt-4 rounded-b-lg">
            <Button variant="ghost" onClick={() => setShowReviewModal(false)}>Cancel Review</Button>
            <Button 
                onClick={saveFeedback} 
                className={isManagement ? "bg-indigo-600 hover:bg-indigo-700" : (isTeamLead ? "bg-amber-600 hover:bg-amber-700" : "")}
            >
              Confirm Feedback Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
