import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { 
  ArrowLeft, Calendar, MapPin, Clock, RefreshCcw, 
  Search, CheckCircle2, ChevronRight, SlidersHorizontal, BookOpen, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

// Type definitions
interface Activity {
  id: string;
  time: string;
  description: string;
  location: string;
}

interface DayPlan {
  dayNumber: number;
  activities: Activity[];
}

interface ItineraryData {
  id: string;
  days: DayPlan[];
}

interface EventProject {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  country: string;
  type: string;
  archived: boolean;
  status: 'Open' | 'Completed' | 'Archived';
}

const STATIC_EVENTS: EventProject[] = [
  { id: 'burundi-2026', name: 'Burundi Seminar 2026', startDate: '09 Jun 2026', endDate: '15 Jun 2026', country: 'Burundi', type: 'Seminar', archived: false, status: 'Open' },
  { id: 'namibia-2026', name: 'Namibia Van Project 2026', startDate: '13 Sep 2026', endDate: '25 Sep 2026', country: 'Namibia', type: 'Van Project', archived: false, status: 'Open' },
  { id: 'bangladesh-2026', name: 'Bangladesh Seminar 2026', startDate: '10 Jun 2026', endDate: '15 Jun 2026', country: 'Bangladesh', type: 'Seminar', archived: false, status: 'Open' },
  { id: 'vietnam-2026', name: 'Vietnam Seminar 2026', startDate: '26 Jun 2026', endDate: '30 Jun 2026', country: 'Vietnam', type: 'Seminar', archived: false, status: 'Open' },
  { id: 'dominican-2026', name: 'Dominican Republic Van Project 2026', startDate: '25 Jun 2026', endDate: '29 Jun 2026', country: 'Dominican Republic', type: 'Van Project', archived: false, status: 'Open' },
  { id: 'drc-2026', name: 'DRC Seminar 2026', startDate: '28 Jun 2026', endDate: '06 Jul 2026', country: 'DRC', type: 'Seminar', archived: false, status: 'Open' },
  { id: 'zimbabwe-2026', name: 'Zimbabwe Van Project 2026', startDate: '18 Jun 2026', endDate: '25 Jun 2026', country: 'Zimbabwe', type: 'Van Project', archived: false, status: 'Open' },
];

export default function SvItineraryTab() {
  const [selectedProject, setSelectedProject] = useState<EventProject | null>(null);
  const [view, setView] = useState<'list' | 'detail'>('list');
  
  // Filter States
  const [showArchived, setShowArchived] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Itinerary Fetch State
  const [itinerary, setItinerary] = useState<ItineraryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncSource, setSyncSource] = useState<'external-pull' | 'cached-ledger' | 'none'>('none');

  // Trigger sync automatically when a project is selected
  useEffect(() => {
    if (selectedProject) {
      fetchItineraryForProject(selectedProject);
    }
  }, [selectedProject]);

  const fetchItineraryForProject = async (project: EventProject) => {
    setLoading(true);
    try {
      const res = await fetch('/api/itinerary/fetch-external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: project.name, country: project.country, type: project.type })
      });
      const data = await res.json();
      if (data && data.itinerary) {
        setItinerary(data.itinerary);
        setSyncSource(data.source);
        toast.success(`Successfully loaded synced itinerary for ${project.name}!`);
      } else {
        toast.error('Could not load synced itinerary details');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network failure connecting to SV server');
    } finally {
      setLoading(false);
    }
  };

  // Get Unique Filter Values
  const countries = ['All', ...Array.from(new Set(STATIC_EVENTS.map(e => e.country)))];
  const types = ['All', ...Array.from(new Set(STATIC_EVENTS.map(e => e.type)))];

  // Filter Events
  const filteredEvents = STATIC_EVENTS.filter(event => {
    if (!showArchived && event.archived) return false;
    if (selectedCountry !== 'All' && event.country !== selectedCountry) return false;
    if (selectedType !== 'All' && event.type !== selectedType) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return event.name.toLowerCase().includes(query) || event.country.toLowerCase().includes(query);
    }
    return true;
  });

  const handleOpenProject = (project: EventProject) => {
    setSelectedProject(project);
    setView('detail');
  };

  const handleSelectTemplate = (templateName: string) => {
    const dummyProject: EventProject = {
      id: `template-${Date.now()}`,
      name: `New ${templateName} Blueprint`,
      startDate: '01 Oct 2026',
      endDate: '07 Oct 2026',
      country: 'Global Template',
      type: templateName,
      archived: false,
      status: 'Open'
    };
    setSelectedProject(dummyProject);
    setView('detail');
  };

  // Filter activities in Detail View if search is typed inside detailed view
  const [detailSearch, setDetailSearch] = useState('');
  const filteredDays = itinerary ? itinerary.days.map(day => {
    const matchingActivities = day.activities.filter(act => 
      act.description.toLowerCase().includes(detailSearch.toLowerCase()) ||
      act.location.toLowerCase().includes(detailSearch.toLowerCase()) ||
      act.time.toLowerCase().includes(detailSearch.toLowerCase())
    );
    return { ...day, activities: matchingActivities };
  }).filter(day => day.activities.length > 0) : [];

  if (view === 'detail' && selectedProject) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto py-2">
        {/* Detail View Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
          <div className="flex items-start gap-4">
            <Button 
              onClick={() => { setView('list'); setSelectedProject(null); setItinerary(null); }} 
              variant="outline" 
              size="icon"
              className="rounded-full border-2 hover:bg-muted"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 font-bold uppercase tracking-wider text-[10px] px-2.5">
                  {selectedProject.type}
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">{selectedProject.startDate} - {selectedProject.endDate}</span>
              </div>
              <h1 className="text-2xl font-black uppercase text-foreground tracking-tight mt-1">
                {selectedProject.name}
              </h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                {selectedProject.country} • Synced live from Svetinerary K8s Platform
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center">
            <Button 
              onClick={() => fetchItineraryForProject(selectedProject)} 
              disabled={loading}
              className="bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-wider text-xs px-5 py-5 rounded-xl shadow-lg shadow-amber-500/10 flex items-center gap-2"
            >
              <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
              Re-Sync Live
            </Button>
          </div>
        </div>

        {/* Sync Info Banner */}
        <Card className="border-2 border-green-500/30 bg-green-50/50 dark:bg-green-950/10 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase text-foreground">Svetinerary Live Synced</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                Real-time API ledger mapping completed with source. Sync source: <code className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">{syncSource}</code>.
              </p>
            </div>
          </div>
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-none px-3 py-1 font-bold text-[10px] tracking-wide uppercase">
            Active Integration
          </Badge>
        </Card>

        {/* Search Inside Itinerary */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder="Search activities, venues, or timings for this event..."
            value={detailSearch}
            onChange={(e) => setDetailSearch(e.target.value)}
            className="pl-10 h-11 rounded-xl border-2 border-border focus:border-amber-500 transition-all font-medium text-xs text-foreground bg-background"
          />
        </div>

        {/* Itinerary Contents */}
        {loading && !itinerary ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <RefreshCcw size={32} className="text-amber-500 animate-spin" />
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Synchronizing Svetinerary Ledger...</p>
          </div>
        ) : filteredDays.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-muted/10 border border-dashed border-border rounded-3xl">
            <div className="p-4 bg-muted border border-border rounded-full">
              <AlertCircle className="w-8 h-8 opacity-40 text-foreground" />
            </div>
            <div>
              <h4 className="font-black uppercase tracking-tight text-foreground text-sm">
                No Activities Found
              </h4>
              <p className="text-muted-foreground text-xs italic max-w-sm mt-1">
                Try adjusting your search criteria or hit 'Re-Sync Live' above to reload data.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredDays.map((day) => (
              <Card key={day.dayNumber} className="border-border bg-card rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all border-2">
                <CardHeader className="bg-muted/30 border-b border-border py-4 px-6 flex flex-row justify-between items-center">
                  <div>
                    <CardTitle className="text-base font-black uppercase text-foreground">
                      DAY {day.dayNumber}
                    </CardTitle>
                    <CardDescription className="text-[10px] uppercase font-black tracking-widest text-amber-500 mt-0.5">
                      {selectedProject.name} Agenda
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="font-mono text-[9px] uppercase font-bold tracking-wider border-border text-foreground px-2 py-0.5">
                    {day.activities.length} {day.activities.length === 1 ? 'Activity' : 'Activities'}
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableBody>
                      {day.activities.map((activity, aIdx) => (
                        <TableRow key={activity.id || `activity-${day.dayNumber}-${aIdx}`} className="border-border hover:bg-muted/10">
                          <TableCell className="w-32 border-r border-border p-4 align-top">
                            <div className="flex items-center gap-1.5 text-xs font-mono font-black text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-2 py-1 rounded-lg w-max">
                              <Clock size={12} />
                              {activity.time}
                            </div>
                          </TableCell>
                          <TableCell className="p-4 space-y-2">
                            <p className="font-bold text-foreground text-sm">
                              {activity.description}
                            </p>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                              <MapPin size={12} className="text-amber-500" />
                              <span>{activity.location}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Listing View / Svetinerary Main Dashboard
  return (
    <div className="space-y-8 max-w-6xl mx-auto py-2">
      {/* Svetinerary Header Card */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-foreground uppercase tracking-tight">Svetinerary</h1>
            <Badge variant="outline" className="bg-background border-2 text-[10px] font-mono py-0.5 font-bold">
              0.1.4-3-g139279c
            </Badge>
          </div>
          <Button variant="outline" className="rounded-xl font-bold text-xs uppercase tracking-wider border-2 hover:bg-muted">
            Sign In
          </Button>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
          Svetinerary is a personal event planner with a calendar-style preview. Easily create, edit, and manage activities, set timings, assign participants, and visualize your entire event schedule on an interactive timeline.
        </p>
      </div>

      {/* Templates Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-black uppercase text-foreground">Templates</h2>
          <p className="text-xs text-muted-foreground">Start quickly with ready-to-use event templates</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card 
            onClick={() => handleSelectTemplate('Appreciation Event')}
            className="border-2 border-border hover:border-amber-500 transition-all cursor-pointer rounded-2xl hover:shadow-md group bg-card"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black uppercase text-foreground flex justify-between items-center group-hover:text-amber-500 transition-colors">
                Appreciation Event
                <ChevronRight size={16} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Create a memorable thank-you experience for team members or partners with high-quality leisure, wellness, and alignment sessions.
              </p>
            </CardContent>
          </Card>

          <Card 
            onClick={() => handleSelectTemplate('Van Project')}
            className="border-2 border-border hover:border-amber-500 transition-all cursor-pointer rounded-2xl hover:shadow-md group bg-card"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black uppercase text-foreground flex justify-between items-center group-hover:text-amber-500 transition-colors">
                Van Project
                <ChevronRight size={16} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Organize site visits, medical/resource distributions, and local community support deployments in a robust mobile setup.
              </p>
            </CardContent>
          </Card>

          <Card 
            onClick={() => handleSelectTemplate('Seminar')}
            className="border-2 border-border hover:border-amber-500 transition-all cursor-pointer rounded-2xl hover:shadow-md group bg-card"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black uppercase text-foreground flex justify-between items-center group-hover:text-amber-500 transition-colors">
                Seminar
                <ChevronRight size={16} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Manage expert speakers, structured breakout sessions, panels, and professional networking over consecutive days.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Event History Section */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black uppercase text-foreground">Event History</h2>
            <p className="text-xs text-muted-foreground">Select a current or previous project to view and synchronize its timeline</p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="flex items-center space-x-2 border-2 border-border rounded-xl px-3 py-1.5 bg-background">
              <Checkbox 
                id="show-archived" 
                checked={showArchived}
                onCheckedChange={(checked) => setShowArchived(checked === true)}
              />
              <label 
                htmlFor="show-archived" 
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground cursor-pointer select-none"
              >
                Show archived
              </label>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-muted/30 border-2 border-border p-3 rounded-2xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by event name or country..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 rounded-xl border-2 border-border bg-background text-xs font-semibold focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground w-16">Country</span>
            <Select value={selectedCountry} onValueChange={(val) => setSelectedCountry(val || 'All')}>
              <SelectTrigger className="h-10 rounded-xl border-2 border-border bg-background text-xs font-semibold">
                <SelectValue placeholder="All Countries" />
              </SelectTrigger>
              <SelectContent>
                {countries.map(c => (
                  <SelectItem key={c} value={c} className="text-xs font-semibold">{c === 'All' ? 'All Countries' : c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground w-12">Type</span>
            <Select value={selectedType} onValueChange={(val) => setSelectedType(val || 'All')}>
              <SelectTrigger className="h-10 rounded-xl border-2 border-border bg-background text-xs font-semibold">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                {types.map(t => (
                  <SelectItem key={t} value={t} className="text-xs font-semibold">{t === 'All' ? 'All Types' : t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Event List */}
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border rounded-2xl bg-muted/10">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">No matching events in ledger</p>
            <p className="text-[11px] text-muted-foreground mt-1">Try relaxing filters or search keywords.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredEvents.map((event) => (
              <Card key={event.id} className="border-2 border-border hover:border-amber-500/50 transition-all rounded-2xl bg-card overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 rounded-xl hidden sm:block">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-sm uppercase tracking-tight flex items-center gap-2">
                        {event.name}
                        {event.archived && (
                          <Badge variant="outline" className="text-[8px] uppercase tracking-wider text-muted-foreground">Archived</Badge>
                        )}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-0.5 font-medium">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-amber-500" />
                          {event.country}
                        </span>
                        <span className="hidden sm:inline">•</span>
                        <span>{event.startDate} - {event.endDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-none pt-3 sm:pt-0">
                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 font-black uppercase text-[9px] px-2.5 tracking-wider border-none">
                      {event.type}
                    </Badge>
                    <Button 
                      onClick={() => handleOpenProject(event)}
                      className="bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-black uppercase tracking-wider px-5 rounded-xl h-9"
                    >
                      Open
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}