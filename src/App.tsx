import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { db } from './services/db';
import { EventProject, Supplier, UserRole, User } from './types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Dashboard } from './components/Dashboard';
import { EventCreator } from './components/EventCreator';
import { SupplierDirectory } from './components/SupplierDirectory';
import { EventDetails } from './components/EventDetails';
import { ResearchHub } from './components/ResearchHub';
import { ManagementDashboard } from './components/ManagementDashboard';
import { EvaluationTab } from './components/EvaluationTab';
import { TeamChat } from './components/TeamChat';
import { FeedbackHub } from './components/FeedbackHub';
import { HandoverHub } from './components/HandoverHub';
import { KnowledgeHub } from './components/KnowledgeHub';
import { LoginPage } from './components/LoginPage';
import { User as UserIcon, LogOut, Settings, Bell, Palette, Globe, Check, Moon, Sun, Monitor } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './components/ui/dialog';
import { Switch } from './components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Briefcase, Plus, Users, Calendar, Lightbulb, MessageSquare, ClipboardCheck, LayoutDashboard, Search, Command, Shield, ArrowRightLeft, UserCircle } from 'lucide-react';

export default function App() {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [projects, setProjects] = useState<EventProject[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(db.getCurrentUser());

  useEffect(() => {
    if (!currentUser) return;
    
    // Role Migration & Promotion: Ensure user is EPM Team Lead as requested
    if (currentUser.name === 'Jean Damour' && currentUser.role !== 'EPM Team Lead') {
      const updatedUser = { ...currentUser, role: 'EPM Team Lead' as const };
      db.setCurrentUser(updatedUser);
      setCurrentUser(updatedUser);
      db.saveUser(updatedUser);
      toast.success("Profile upgraded to EPM Team Lead");
    } else if (currentUser.role && !currentUser.role.startsWith('EPM')) {
      const updatedUser = { ...currentUser, role: `EPM ${currentUser.role}` as any };
      db.setCurrentUser(updatedUser);
      setCurrentUser(updatedUser);
      db.saveUser(updatedUser);
      toast.info("Role metadata updated to EPM hierarchy");
    }
    refreshData();
  }, [currentUser]);

  const refreshData = () => {
    setProjects(db.getProjects());
    setSuppliers(db.getSuppliers());
  };

  const handleCreateProject = (project: EventProject) => {
    db.saveProject(project);
    refreshData();
    setActiveTab('dashboard');
  };

  const handleUpdateProject = (project: EventProject) => {
    db.saveProject(project);
    refreshData();
  };

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempUser, setTempUser] = useState<User | null>(currentUser);

  // Synchronize tempUser for settings
  useEffect(() => {
    if (currentUser) {
      setTempUser(currentUser);
    }
  }, [currentUser]);

  const handleLogout = () => {
    toast.info("Logging out...");
    setTimeout(() => {
      db.logout();
      setCurrentUser(null);
    }, 1000);
  };

  const saveSettings = () => {
    if (!tempUser) return;
    db.setCurrentUser(tempUser);
    setCurrentUser(tempUser);
    setIsSettingsOpen(false);
    toast.success("Settings updated successfully");
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  if (!currentUser) {
    return (
      <>
        <LoginPage onLogin={(user) => setCurrentUser(user)} />
        <Toaster />
      </>
    );
  }

  return (
    <div className={`min-h-screen text-foreground font-sans selection:bg-amber-100 ${currentUser.settings?.theme === 'glass' ? 'bg-gradient-to-br from-background to-accent/20' : 'bg-background'}`}>
      <header className="border-b border-border bg-background sticky top-0 z-50 backdrop-blur-md bg-opacity-80">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-black/10">
              <Calendar className="text-primary-foreground w-5 h-5" />
            </div>
            <div>
              <h1 className="font-black text-lg tracking-tighter leading-none">DERIV <span className="text-amber-500">EVENTS</span></h1>
              <p className="text-[10px] font-bold opacity-30 tracking-widest uppercase text-foreground">Global EPM Command</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider opacity-60">
             <DropdownMenu>
                <DropdownMenuTrigger className="focus:outline-none">
                  <div className="flex items-center gap-3 group cursor-pointer">
                    <div className="flex flex-col items-end">
                      <span className="text-foreground font-black uppercase tracking-tight group-hover:text-amber-500 transition-colors uppercase">{currentUser.name}</span>
                    </div>
                    <div className="w-10 h-10 rounded-full border-2 border-border shadow-md overflow-hidden bg-muted ring-2 ring-transparent group-hover:ring-amber-400 transition-all flex items-center justify-center font-black text-muted-foreground">
                        {currentUser.avatar ? (
                          <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                        ) : (
                          (currentUser.name || "User").split(' ').map(n => n[0]).join('')
                        )}
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-2xl border-2">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-black uppercase tracking-tighter text-xs px-3 py-1.5">Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer gap-2 rounded-xl py-2 px-3" onClick={() => setIsSettingsOpen(true)}>
                      <Settings size={14} /> <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer gap-2 rounded-xl py-2 px-3">
                      <Bell size={14} /> <span>Notifications</span>
                      {currentUser.settings?.notificationsEnabled && <Badge className="ml-auto w-1.5 h-1.5 p-0 bg-amber-500 rounded-full" />}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer gap-2 text-red-600 focus:text-red-600 rounded-xl py-2 px-3" onClick={handleLogout}>
                      <LogOut size={14} /> <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
             </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row min-h-[calc(100vh-64px)]">
        {/* Navigation Sidebar */}
        {!selectedProjectId && (
          <aside className="w-full md:w-64 border-r border-border p-4 space-y-2 bg-background/50">
            <div className="px-2 mb-4">
              <span className="text-[9px] font-black tracking-widest opacity-30 uppercase text-foreground">Operations</span>
            </div>
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'create', label: 'Event Planner', icon: Plus },
              { id: 'suppliers', label: 'Supplier Hub', icon: Users },
              { id: 'handover', label: 'Handover Hub', icon: ArrowRightLeft },
              { id: 'knowledge', label: 'Knowledge Base', icon: Lightbulb },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === item.id ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-accent opacity-60 text-foreground'}`}
              >
                <item.icon size={18} /> {item.label}
              </button>
            ))}

            <div className="px-2 mt-8 mb-4">
              <span className="text-[9px] font-black tracking-widest opacity-30 uppercase text-foreground">Enterprise Command</span>
            </div>
            {[
              { id: 'management', label: 'Command Center', icon: Command, roles: ['EPM Manager', 'EPM Team Lead', 'EPM Executive', 'EPM HOD', 'EPM Senior Executive'] },
              { id: 'research', label: 'Research Hub', icon: Search, roles: ['EPM Senior Executive', 'EPM Executive', 'EPM Manager', 'EPM Team Lead', 'EPM HOD'] },
              { id: 'feedback', label: 'Feedback Desk', icon: ClipboardCheck, roles: ['EPM Senior Executive', 'EPM Executive', 'EPM Manager', 'EPM Team Lead', 'EPM HOD'] },
              { id: 'chat', label: 'Team Chat', icon: MessageSquare, roles: ['EPM Senior Executive', 'EPM Executive', 'EPM Manager', 'EPM Team Lead', 'EPM HOD'] },
              { id: 'feedback-hub', label: 'Strategic Feedback', icon: Users, roles: ['EPM Senior Executive', 'EPM Executive', 'EPM Manager', 'EPM Team Lead', 'EPM HOD'] },
            ].filter(item => item.roles.includes(currentUser.role as any)).map((item) => (
               <button
                 key={item.id}
                 onClick={() => setActiveTab(item.id)}
                 className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === item.id ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-accent opacity-60 text-foreground'}`}
               >
                 <item.icon size={18} /> {item.label}
               </button>
            ))}
          </aside>
        )}

        <main className="flex-1 p-6 overflow-y-auto">
          {selectedProjectId && selectedProject ? (
            <EventDetails 
              project={selectedProject} 
              onBack={() => { setSelectedProjectId(null); refreshData(); }}
              onUpdate={handleUpdateProject}
            />
          ) : (
             <div className="container mx-auto max-w-6xl">
                {activeTab === 'dashboard' && <Dashboard projects={projects} onSelectProject={setSelectedProjectId} currentUser={currentUser} />}
                {activeTab === 'create' && <EventCreator onCreate={handleCreateProject} suppliers={suppliers} />}
                {activeTab === 'suppliers' && <SupplierDirectory suppliers={suppliers} />}
                {activeTab === 'research' && <ResearchHub />}
                {activeTab === 'management' && <ManagementDashboard userRole={currentUser.role} />}
                {activeTab === 'feedback' && <EvaluationTab />}
                {activeTab === 'handover' && <HandoverHub />}
                {activeTab === 'chat' && <TeamChat />}
                {activeTab === 'feedback-hub' && <FeedbackHub userRole={currentUser.role} />}
                {activeTab === 'knowledge' && <KnowledgeHub />}
             </div>
          )}
        </main>
      </div>
      <Toaster />

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-2 rounded-3xl shadow-2xl bg-background border-border">
          <DialogHeader className="p-6 bg-muted/30 border-b">
            <div className="flex items-center gap-4 mb-4">
               <div className="w-16 h-16 rounded-full border-2 border-border shadow-lg overflow-hidden bg-muted flex items-center justify-center font-black text-muted-foreground text-xl">
                  {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                  ) : (
                    (currentUser.name || "User").split(' ').map(n => n[0]).join('')
                  )}
               </div>
               <div>
                  <h4 className="font-black text-lg uppercase tracking-tight text-foreground">{currentUser.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                     <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 border-none px-2 py-0.5 text-[9px] font-black uppercase tracking-widest whitespace-nowrap">
                       {currentUser.role}
                     </Badge>
                     <span className="text-[10px] text-muted-foreground font-bold leading-none">{currentUser.email}</span>
                  </div>
               </div>
            </div>
            <DialogTitle className="flex items-center gap-2 font-black uppercase tracking-tight pt-2 border-t text-foreground">
              <Settings size={20} className="text-amber-500" /> Dashboard Settings
            </DialogTitle>
            <DialogDescription className="italic text-muted-foreground">Customize your personal EPM workspace experience.</DialogDescription>
          </DialogHeader>
          
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              {tempUser && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="text-sm font-black uppercase flex items-center gap-2 text-foreground">
                        <Bell size={14} className="opacity-40" /> Notifications
                      </label>
                      <p className="text-[10px] text-muted-foreground italic">Receive alerts for handovers and status updates.</p>
                    </div>
                    <Switch 
                      checked={!!tempUser.settings?.notificationsEnabled} 
                      onCheckedChange={(checked) => setTempUser({
                        ...tempUser, 
                        settings: tempUser.settings ? { ...tempUser.settings, notificationsEnabled: checked } : { notificationsEnabled: checked }
                      })} 
                    />
                  </div>
                  
                  <DropdownMenuSeparator className="bg-border" />
                  
                  <div className="space-y-4">
                    <label className="text-sm font-black uppercase flex items-center gap-2 text-foreground">
                        <Palette size={14} className="opacity-40" /> Appearance Mode
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'light', label: 'Light', icon: Sun },
                          { id: 'dark', label: 'Dark', icon: Moon },
                          { id: 'system', label: 'System', icon: Monitor }
                        ].map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setTheme(t.id)}
                            className={`px-3 py-2.5 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${theme === t.id ? 'border-amber-500 bg-amber-500/5 text-amber-500' : 'border-border bg-muted/30 hover:border-accent opacity-60 text-foreground'}`}
                          >
                            <t.icon size={16} />
                            <span className="text-[9px] font-black uppercase">{t.label}</span>
                            {theme === t.id && <Check size={10} className="absolute top-1 right-1" />}
                          </button>
                        ))}
                      </div>
                  </div>

                  <DropdownMenuSeparator className="bg-border" />
                  
                  <div className="space-y-3">
                    <label className="text-sm font-black uppercase flex items-center gap-2 text-foreground">
                        <Palette size={14} className="opacity-40" /> Surface Style
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['modern', 'glass', 'corporate'] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() => setTempUser({
                              ...tempUser,
                              settings: tempUser.settings 
                                ? { ...tempUser.settings, theme: t } 
                                : { theme: t, notificationsEnabled: true }
                            })}
                            className={`px-3 py-2 rounded-xl border-2 text-[10px] font-black uppercase transition-all ${tempUser.settings?.theme === t ? 'border-amber-500 bg-amber-500/5 text-amber-500' : 'border-border bg-muted/30 hover:border-accent opacity-60 text-foreground'}`}
                          >
                            {t === tempUser.settings?.theme && <Check size={10} className="inline mr-1" />}
                            {t}
                          </button>
                        ))}
                      </div>
                  </div>

                  <DropdownMenuSeparator className="bg-border" />
                  
                  <div className="space-y-3">
                    <label className="text-sm font-black uppercase flex items-center gap-2 text-foreground">
                      <Shield size={14} className="opacity-40" /> Position Hierarchy
                    </label>
                    <div className="flex flex-col gap-1 border-2 border-border rounded-2xl p-3 bg-muted/20 relative">
                      {[
                        'EPM Executive', 
                        'EPM Senior Executive', 
                        'EPM Team Lead', 
                        'EPM Manager', 
                        'EPM HOD'
                      ].map((role) => (
                        <div key={role} className="flex items-center gap-2 relative z-10">
                            <div className={`w-1.5 h-1.5 rounded-full ${tempUser.role === role ? 'bg-amber-500 ring-2 ring-amber-500/20' : 'bg-muted'}`} />
                            <span className={`text-[10px] font-bold tracking-tight ${tempUser.role === role ? 'text-foreground font-black' : 'text-muted-foreground'}`}>
                              {role}
                            </span>
                            {tempUser.role === role && <Check size={10} className="text-amber-500 ml-auto" />}
                        </div>
                      ))}
                    </div>
                  </div>

                  <DropdownMenuSeparator className="bg-border" />

                  <div className="space-y-3">
                    <label className="text-sm font-black uppercase flex items-center gap-2 text-foreground">
                      <Globe size={14} className="opacity-40" /> Focus Region
                    </label>
                    <Select 
                      value={tempUser.settings?.primaryCountry} 
                      onValueChange={(val) => setTempUser({
                        ...tempUser,
                        settings: tempUser.settings 
                          ? { ...tempUser.settings, primaryCountry: val } 
                          : { primaryCountry: val, notificationsEnabled: true, theme: 'modern' }
                      })}
                    >
                      <SelectTrigger className="rounded-xl border-2 border-border font-bold text-xs uppercase h-10 bg-background text-foreground">
                        <SelectValue placeholder="All Regions" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border">
                        <SelectItem value="All">All Regions</SelectItem>
                        <SelectItem value="Malaysia">Malaysia</SelectItem>
                        <SelectItem value="Dubai">Dubai</SelectItem>
                        <SelectItem value="Cyprus">Cyprus</SelectItem>
                        <SelectItem value="Rwanda">Rwanda</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          </div>

          <DialogFooter className="p-4 bg-muted/30 border-t flex gap-2">
             <Button variant="outline" className="flex-1 rounded-xl text-xs font-black uppercase border-border text-foreground hover:bg-accent" onClick={() => setIsSettingsOpen(false)}>Cancel</Button>
             <Button className="flex-1 rounded-xl text-xs font-black uppercase bg-primary text-primary-foreground hover:opacity-90" onClick={saveSettings}>Apply Settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
