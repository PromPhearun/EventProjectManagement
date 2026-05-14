import { useState } from 'react';
import { db } from '../services/db';
import { User, UserRole } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Calendar, ShieldAlert, Lock, Mail, ArrowRight, Loader2, UserCheck, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [onboardingUser, setOnboardingUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('EPM Executive');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter all fields');
      return;
    }

    setIsLoading(true);
    
    // Artificial delay for "strategic" feel
    setTimeout(() => {
      const user = db.login(email, password);
      if (user) {
        // If Jit provisioned or first time, trigger onboarding check
        if (user.id.startsWith('jit_')) {
          setOnboardingUser(user);
          setIsLoading(false);
        } else {
          toast.success(`Welcome back, ${user.name}`);
          onLogin(user);
        }
      } else {
        toast.error('Invalid credentials', {
          description: 'Try: jean.damour@regentmarkets.com / password: deriv2026'
        });
        setIsLoading(false);
      }
    }, 1500);
  };

  const handleOnboardingComplete = () => {
    if (!onboardingUser) return;
    
    const updatedUser = { ...onboardingUser, role: selectedRole };
    db.saveUser(updatedUser);
    db.setCurrentUser(updatedUser);
    toast.success("Strategic Profile Active", {
      description: `Access levels set to ${selectedRole}`
    });
    onLogin(updatedUser);
  };

  if (onboardingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 font-sans border-t-8 border-amber-500">
        <div className="max-w-md w-full animate-in fade-in zoom-in duration-500">
          <Card className="border-2 border-border shadow-2xl overflow-hidden rounded-3xl bg-card">
            <CardHeader className="bg-muted/30 border-b border-border pb-8">
              <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20">
                <UserCheck className="text-white" size={24} />
              </div>
              <CardTitle className="text-2xl font-black tracking-tight text-foreground">Hierarchy Synchronization</CardTitle>
              <CardDescription className="font-medium italic text-muted-foreground">
                First-time connection detected for <span className="text-foreground font-bold font-sans not-italic">{onboardingUser.name}</span>. 
                Please verify your strategic position level.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
              <div className="space-y-6">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase opacity-40 ml-1 text-foreground">Current Command Level</label>
                  <div className="grid gap-2">
                    {([
                      'EPM Executive',
                      'EPM Senior Executive',
                      'EPM Team Lead',
                      'EPM Manager',
                      'EPM HOD'
                    ] as UserRole[]).map((role) => (
                      <button
                        key={role}
                        onClick={() => setSelectedRole(role)}
                        className={`p-4 rounded-2xl border-2 text-left transition-all relative flex items-center gap-4 ${
                          selectedRole === role 
                            ? 'border-primary bg-primary text-primary-foreground shadow-xl' 
                            : 'border-border hover:border-accent bg-muted/20 text-foreground'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${selectedRole === role ? 'bg-primary-foreground/10' : 'bg-muted'}`}>
                          <Briefcase size={16} />
                        </div>
                        <span className="font-bold text-sm tracking-tight">{role}</span>
                        {selectedRole === role && (
                          <div className="ml-auto w-2 h-2 rounded-full bg-amber-500" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                
                <Button 
                  onClick={handleOnboardingComplete}
                  className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-white text-sm font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-amber-500/20"
                >
                  Confirm Level & Enter Dashboard <ArrowRight size={18} className="ml-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 font-sans border-t-8 border-primary">
      <div className="max-w-md w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center mb-10">
          <div className="inline-flex w-16 h-16 bg-primary rounded-2xl items-center justify-center shadow-2xl mb-6 ring-8 ring-primary/5">
            <Calendar className="text-primary-foreground w-8 h-8" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter uppercase leading-none text-foreground">
            DERIV <span className="text-amber-500">EVENTS</span>
          </h1>
          <p className="text-[10px] font-black tracking-[0.3em] uppercase opacity-30 mt-2 text-foreground">
            Global Enterprise Command System
          </p>
        </div>

        <Card className="border-2 border-border shadow-2xl overflow-hidden rounded-3xl bg-card">
          <CardHeader className="bg-muted/30 border-b border-border pb-8">
            <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2 text-foreground">
              <Lock size={18} className="text-amber-500" /> System Authentication
            </CardTitle>
            <CardDescription className="font-medium italic text-muted-foreground">
              Authorized access only. Enter your EPM credentials to proceed into the command grid.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-8 space-y-4 bg-card">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase opacity-40 ml-1 text-foreground">Email Intelligence</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
                  <Input 
                    type="email" 
                    placeholder="jean.damour@regentmarkets.com" 
                    className="pl-10 h-11 rounded-xl border-2 border-border focus:border-primary transition-all font-bold bg-background text-foreground"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase opacity-40 ml-1 text-foreground">Secure Passkey</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
                  <Input 
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-10 h-11 rounded-xl border-2 border-border focus:border-primary transition-all bg-background text-foreground"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-primary text-primary-foreground hover:opacity-90 text-sm font-black uppercase tracking-widest rounded-xl mt-4 shadow-lg active:scale-95 transition-all"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={18} />
                    Decrypting Access...
                  </>
                ) : (
                  <>
                    Initialize Connection <ArrowRight size={18} className="ml-2 opacity-50" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="bg-muted/30 border-t border-border py-4 justify-center">
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <ShieldAlert size={12} /> Military-Grade Strategic Encryption Active
            </p>
          </CardFooter>
        </Card>
        
        <div className="mt-8 text-center space-y-4">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-50">
            System Node: DXB-CENTRAL-01 • Version 2.8.5-STRATEGIC
          </p>
          <p className="text-xs font-bold text-muted-foreground italic opacity-70">
            Part of the Global Talent & Culture Infrastructure Group
          </p>
          <div className="mt-4 flex justify-center gap-8 opacity-20">
             <div className="w-12 h-1 bg-foreground rounded-full" />
             <div className="w-12 h-1 bg-foreground rounded-full" />
             <div className="w-12 h-1 bg-foreground rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
