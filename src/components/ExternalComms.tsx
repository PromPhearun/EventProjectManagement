import { useState, useEffect } from 'react';
import { EventProject, CommunicationLog, Contact } from '../types';
import { db } from '../services/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Mail, Send, History, Sparkles, Loader2, Building, PlaneTakeoff, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { GoogleGenAI } from "@google/genai";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface ExternalCommsProps {
  project: EventProject;
  onUpdate: (project: EventProject) => void;
}

export function ExternalComms({ project, onUpdate }: ExternalCommsProps) {
  const [isDrafting, setIsDrafting] = useState(false);
  const [recipientType, setRecipientType] = useState<'Supplier' | 'Hotel' | 'Travel Desk'>('Supplier');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isConnectedToGoogle, setIsConnectedToGoogle] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', email: '' });

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  useEffect(() => {
    checkGoogleStatus();
    loadContacts();
  }, []);

  const checkGoogleStatus = async () => {
    try {
      const res = await fetch('/api/auth/google/status');
      if (res.ok) {
        const data = await res.json();
        setIsConnectedToGoogle(data.connected);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadContacts = () => {
    setContacts(db.getContacts());
  };

  const handleConnectGoogle = async () => {
    try {
      const res = await fetch('/api/auth/google/url');
      const { url } = await res.json();
      const authWindow = window.open(url, 'google_oauth', 'width=600,height=700');
      
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
          setIsConnectedToGoogle(true);
          toast.success('Gmail successfully connected!');
          window.removeEventListener('message', handleMessage);
        }
      };
      window.addEventListener('message', handleMessage);
    } catch (err) {
      toast.error('Failed to initiate Google connection');
    }
  };

  const handleAddContact = () => {
    if (!newContact.name || !newContact.email) {
      toast.error('Name and email are required');
      return;
    }
    const contact: Contact = {
      id: Math.random().toString(36).substr(2, 9),
      name: newContact.name,
      email: newContact.email,
      category: recipientType
    };
    db.saveContact(contact);
    loadContacts();
    setRecipientEmail(contact.email);
    setShowAddContact(false);
    setNewContact({ name: '', email: '' });
    toast.success('Contact added and selected');
  };

  const generateDraft = async () => {
    setIsGenerating(true);
    try {
      const prompt = `
        Draft a professional business email from an Event Project Manager (EPM) at Deriv.
        
        Recipient Type: ${recipientType}
        Project Title: ${project.title}
        Project Location: ${project.city}, ${project.country}
        Event Type: ${project.type}
        Start Date: ${project.startDate}
        Guest Count: ${project.guestCount}
        
        Context: 
        ${recipientType === 'Supplier' ? 'We need a quotation for generic event services (AV, catering, or local logistics).' : ''}
        ${recipientType === 'Hotel' ? 'We need a quotation for accommodation and meeting room facilities for the guests.' : ''}
        ${recipientType === 'Travel Desk' ? 'The event has been approved. Please start purchasing flight tickets for the guest list mentioned in our system.' : ''}
        
        Tone: Professional, concise, corporate.
        Make sure to include placeholders for specific details if needed like [Insert Supplier Name].
        Return ONLY the subject line and then the body, separated by "---SUBJECT_BODY_SEP---".
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const text = response.text || '';
      const [genSubject, genBody] = text.split('---SUBJECT_BODY_SEP---');
      
      setSubject(genSubject?.trim() || `Inquiry regarding ${project.title}`);
      setBody(genBody?.trim() || text);
      toast.success('Professional draft generated!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate draft. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!recipientEmail || !subject || !body) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!isConnectedToGoogle) {
      toast.error('Please connect your Gmail account first');
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: recipientEmail, subject, body })
      });

      if (!res.ok) throw new Error('Failed to send email via API');

      const newLog: CommunicationLog = {
        id: Math.random().toString(36).substr(2, 9),
        recipient: recipientType,
        recipientEmail,
        subject,
        body,
        timestamp: new Date().toISOString(),
        status: 'sent',
        senderEpm: project.epmName
      };

      const updatedProject: EventProject = {
        ...project,
        communications: [...(project.communications || []), newLog]
      };

      onUpdate(updatedProject);
      setIsDrafting(false);
      setRecipientEmail('');
      setSubject('');
      setBody('');
      toast.success(`Real email sent via Gmail to ${recipientType}`);
    } catch (err) {
      toast.error('Gmail delivery failed. Check credentials.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {!isConnectedToGoogle && (
        <Card className="bg-amber-50 border-amber-200 border-2 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-amber-500" />
            <div>
              <p className="font-black uppercase text-xs text-amber-900 tracking-tight">Gmail Connectivity Required</p>
              <p className="text-[10px] text-amber-700 font-medium">Connect your corporate Gmail to send real outbound communications.</p>
            </div>
          </div>
          <Button 
            onClick={handleConnectGoogle}
            className="bg-amber-500 hover:bg-amber-600 text-white font-black uppercase text-[10px] px-6 rounded-xl shadow-lg shadow-amber-500/20"
          >
            Connect Gmail
          </Button>
        </Card>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Mail className="text-amber-500" /> Communication Center
          </h3>
          <p className="text-xs text-muted-foreground italic font-medium">Automated outreach via Gmail for real-time quotations and flight purchase.</p>
        </div>
        <Button 
          onClick={() => setIsDrafting(!isDrafting)}
          className={`rounded-xl font-black uppercase text-xs gap-2 ${isDrafting ? 'bg-slate-100 text-slate-800 border-2' : 'bg-black text-white hover:bg-slate-800 shadow-lg'}`}
        >
          {isDrafting ? 'Cancel Draft' : <><Send size={14} /> New Outreach</>}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Comms List */}
        <div className={`space-y-4 ${isDrafting ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
          <div className="bg-slate-50 p-4 rounded-2xl border flex items-center gap-2 mb-4">
            <History size={14} className="opacity-40" />
            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Previous Communications</span>
          </div>

          <div className="space-y-4">
            {(project.communications || []).length === 0 && (
              <div className="bg-white border-2 border-dashed rounded-3xl p-12 text-center">
                <Mail size={40} className="mx-auto text-slate-200 mb-4" />
                <h4 className="font-black uppercase text-slate-400">No outbound comms yet</h4>
                <p className="text-xs italic text-slate-300">Start communication with suppliers to move the needle.</p>
              </div>
            )}
            {project.communications?.map(log => (
              <Card key={log.id} className="rounded-2xl border-2 shadow-sm hover:shadow-md transition-all overflow-hidden">
                <div className="bg-slate-50 border-b px-4 py-3 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="bg-white p-1.5 rounded-lg border shadow-sm">
                      {log.recipient === 'Supplier' && <Building size={14} className="text-blue-500" />}
                      {log.recipient === 'Hotel' && <Building size={14} className="text-amber-500" />}
                      {log.recipient === 'Travel Desk' && <PlaneTakeoff size={14} className="text-emerald-500" />}
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest">{log.recipient}</span>
                      <p className="text-[9px] text-muted-foreground font-bold">{log.recipientEmail}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end text-emerald-600">
                      <CheckCircle2 size={12} />
                      <span className="text-[9px] font-black uppercase">Sent via Gmail</span>
                    </div>
                    <span className="text-[9px] font-mono opacity-40">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h5 className="font-bold text-sm mb-2 uppercase tracking-tight">{log.subject}</h5>
                  <p className="text-xs text-slate-600 italic line-clamp-3 whitespace-pre-wrap">{log.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Draft Editor */}
        {isDrafting && (
          <div className="lg:col-span-5 relative">
            <Card className="rounded-3xl border-2 border-black/10 shadow-xl sticky top-4 overflow-hidden">
              <CardHeader className="bg-black text-white p-4">
                <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center justify-between">
                  Outbound Draft
                  <Mail size={14} />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4 bg-white">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase opacity-40">Target Channel</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Supplier', 'Hotel', 'Travel Desk'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => {
                          setRecipientType(type);
                          setRecipientEmail('');
                        }}
                        className={`py-2 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${recipientType === type ? 'bg-black text-white border-black' : 'hover:bg-slate-50 opacity-50'}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[9px] font-black uppercase opacity-40">Select Recipient</label>
                    <button 
                      onClick={() => setShowAddContact(!showAddContact)}
                      className="text-[8px] font-black uppercase text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Plus size={10} /> Add New
                    </button>
                  </div>
                  
                  {showAddContact ? (
                    <div className="space-y-2 p-3 bg-slate-50 rounded-xl border-2">
                      <Input 
                        placeholder="Contact Name" 
                        value={newContact.name}
                        onChange={e => setNewContact({...newContact, name: e.target.value})}
                        className="h-8 text-[10px] font-bold"
                      />
                      <Input 
                        placeholder="email@example.com" 
                        value={newContact.email}
                        onChange={e => setNewContact({...newContact, email: e.target.value})}
                        className="h-8 text-[10px] font-bold"
                      />
                      <div className="flex gap-2">
                         <Button size="sm" onClick={handleAddContact} className="flex-1 text-[9px] font-black h-7">Add & Select</Button>
                         <Button size="sm" variant="ghost" onClick={() => setShowAddContact(false)} className="text-[9px] font-black h-7">Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <Select 
                      value={recipientEmail}
                      onValueChange={setRecipientEmail}
                    >
                      <SelectTrigger className="rounded-xl border-2 font-black text-[10px] tracking-tight">
                        <SelectValue placeholder={`Choose ${recipientType}...`} />
                      </SelectTrigger>
                      <SelectContent>
                        {contacts.filter(c => c.category === recipientType).map(contact => (
                          <SelectItem key={contact.id} value={contact.email} className="text-[10px] font-bold">
                            {contact.name} ({contact.email})
                          </SelectItem>
                        ))}
                        {contacts.filter(c => c.category === recipientType).length === 0 && (
                          <div className="p-2 text-[10px] italic opacity-40">No contacts saved for this category</div>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-1 pt-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[9px] font-black uppercase opacity-40">Email Content</label>
                    <Button 
                      onClick={generateDraft}
                      disabled={isGenerating}
                      className="h-6 text-[8px] rounded-lg bg-amber-500 hover:bg-amber-600 text-white gap-1 px-2 font-black uppercase italic"
                    >
                      {isGenerating ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                      Draft with AI
                    </Button>
                  </div>
                  <Input 
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Subject Line"
                    className="rounded-xl border-2 font-bold text-xs mb-2"
                  />
                  <Textarea 
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    rows={8}
                    className="rounded-xl border-2 font-medium text-xs italic"
                    placeholder="Refine carefully before clicking send..."
                  />
                </div>

                <Button 
                  onClick={handleSend}
                  disabled={isSending || !isConnectedToGoogle}
                  className="w-full rounded-2xl bg-black text-white hover:bg-slate-800 font-extrabold text-xs uppercase py-6 shadow-lg shadow-black/10 gap-2 mt-2 disabled:opacity-50"
                >
                  {isSending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />} 
                  {isSending ? 'Transmitting...' : 'Send via Gmail'}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
