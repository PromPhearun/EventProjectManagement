import { useState, useEffect } from 'react';
import { EventProject, Supplier, EventType, CountryBudget } from '../types';
import { db } from '../services/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { generateEventDraft } from '../services/gemini';
import { Loader2, Sparkles, Wand2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface EventCreatorProps {
  onCreate: (project: EventProject) => void;
  suppliers: Supplier[];
}

const EVENT_TYPES: EventType[] = [
  'Seminar', 'Van Project', 'Van (Fly) Project', 'Giveaway', 'Merchandise',
  'Partner Led-Sponsorship', 'Conference', 'Appreciation Event', 'Expo (Delegate)', 'Expo'
];

export function EventCreator({ onCreate, suppliers }: EventCreatorProps) {
  const [loading, setLoading] = useState(false);
  const [countryBudgets, setCountryBudgets] = useState<CountryBudget[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    country: '',
    city: '',
    startDate: '',
    endDate: '',
    guestCount: 50,
    type: 'Conference' as EventType,
    criteria: ''
  });

  useEffect(() => {
    setCountryBudgets(db.getCountryBudgets());
  }, []);

  const selectedCountryBudget = countryBudgets.find(b => b.country.toLowerCase() === formData.country.toLowerCase());

  const handleGenerate = async () => {
    if (!formData.title || !formData.country || !formData.city) {
      toast.error('Please fill in at least Title, Country, and City.');
      return;
    }

    if (selectedCountryBudget && selectedCountryBudget.tripsCount >= selectedCountryBudget.maxTrips) {
      toast.error(`Trip limit reached for ${formData.country}. Max ${selectedCountryBudget.maxTrips} trips allowed.`);
      return;
    }

    setLoading(true);
    try {
      const draft = await generateEventDraft({
        ...formData,
        existingSuppliers: suppliers.filter(s => s.country === formData.country || s.city === formData.city),
        budgetLimit: selectedCountryBudget?.remainingBudget
      });

      const newProject: EventProject = {
        id: Math.random().toString(36).substr(2, 9),
        ...formData,
        status: 'drafted',
        budget: draft.budget,
        itinerary: draft.itinerary,
        clickUpId: 'CU-' + Math.floor(Math.random() * 10000),
        epmName: db.getCurrentUser().name
      };

      onCreate(newProject);
      
      // Log activity
      db.logActivity({
        id: Math.random().toString(36).substr(2, 9),
        epmName: db.getCurrentUser().name,
        action: 'Created Event Draft',
        timestamp: new Date().toISOString(),
        details: `Drafted "${formData.title}" in ${formData.city}, ${formData.country}.`
      });

      toast.success('Event draft generated successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate draft. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {selectedCountryBudget && (
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="pt-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <AlertTriangle size={18} />
              <div className="text-sm">
                <span className="font-bold">{formData.country}</span> Pre-approved Budget: 
                <span className="ml-1 font-mono">${selectedCountryBudget.remainingBudget.toLocaleString()}</span> remaining.
              </div>
            </div>
            <div className="text-[10px] uppercase font-bold opacity-60 text-foreground">
              Trips: {selectedCountryBudget.tripsCount}/{selectedCountryBudget.maxTrips}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-2 border-border bg-card">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Sparkles className="text-amber-500" /> New Marketing Event
          </CardTitle>
          <CardDescription>
            Input your requirements and let AI draft the budget, itinerary, and suggest partners.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold uppercase opacity-50">Event Title</label>
              <Input 
                placeholder="e.g. Q4 Marketing Workshop" 
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase opacity-50">Country</label>
              <Input 
                placeholder="e.g. Singapore" 
                value={formData.country}
                onChange={e => setFormData({...formData, country: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase opacity-50">City</label>
              <Input 
                placeholder="e.g. Marina Bay" 
                value={formData.city}
                onChange={e => setFormData({...formData, city: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase opacity-50">Start Date</label>
              <Input 
                type="date" 
                value={formData.startDate}
                onChange={e => setFormData({...formData, startDate: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase opacity-50">End Date</label>
              <Input 
                type="date" 
                value={formData.endDate}
                onChange={e => setFormData({...formData, endDate: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase opacity-50">Expected Guests</label>
              <Input 
                type="number" 
                value={formData.guestCount}
                onChange={e => setFormData({...formData, guestCount: parseInt(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase opacity-50">Event Type</label>
              <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v as EventType})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase opacity-50">Specific Requirements & Criteria</label>
            <Textarea 
              placeholder="e.g. We need a hotel with at least 5 meeting rooms, accessible for wheel chairs, and near the airport. Prefer suppliers we worked with before in Singapore." 
              className="min-h-[120px]"
              value={formData.criteria}
              onChange={e => setFormData({...formData, criteria: e.target.value})}
            />
          </div>

          <Button 
            className="w-full h-12 text-lg font-bold gap-2" 
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" /> : <Wand2 size={20} />}
            {loading ? 'AI Blueprinting...' : 'Generate AI Proposal'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
