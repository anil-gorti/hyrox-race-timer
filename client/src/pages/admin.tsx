import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { isAdmin } from "@/lib/role";
import { getEventConfig, setEventConfig } from "@/lib/eventConfig";
import { saveEventConfig, type EventConfig } from "@/lib/eventService";
import { Activity, getStoredActivities, DEFAULT_ACTIVITIES } from "@/lib/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Trash2, Plus, DownloadCloud, ChevronLeft, Save, Type, Lock } from "lucide-react";
import Papa from "papaparse";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { WoneMark } from "@/components/WoneMark";

export default function Admin() {
    const [, setLocation] = useLocation();

    const [activities, setActivities] = useState<Activity[]>(getStoredActivities());

    useEffect(() => {
        if (!isAdmin()) setLocation("/");
    }, [setLocation]);

    if (!isAdmin()) {
        return null;
    }
    const [sheetUrl, setSheetUrl] = useState("");
    const [isSyncing, setIsSyncing] = useState(false);
    const [eventConfig, setEventConfigState] = useState<EventConfig>(getEventConfig());
    const [isSavingEvent, setIsSavingEvent] = useState(false);
    const { toast } = useToast();

    const handleSaveEventConfig = async () => {
        setIsSavingEvent(true);
        try {
            // Save locally first
            setEventConfig(eventConfig);
            // Then sync to Supabase
            const saved = await saveEventConfig(eventConfig);
            setEventConfigState(saved);
            toast({ title: "Event saved", description: "Event details synced to cloud." });
        } catch (err: any) {
            // Local save already happened, so just warn about cloud
            toast({ title: "Event saved locally", description: "Cloud sync failed. Changes saved locally." });
        }
        setIsSavingEvent(false);
    };

    const handleSaveEvents = () => {
        localStorage.setItem("HYFIT_EVENTS", JSON.stringify(activities));
        toast({
            title: "Events Saved",
            description: "The race sequence has been updated locally.",
        });
    };

    const handleReset = () => {
        if (confirm("Reset to default Hyfit Games 2.1 sequence?")) {
            setActivities(DEFAULT_ACTIVITIES);
            localStorage.setItem("HYFIT_EVENTS", JSON.stringify(DEFAULT_ACTIVITIES));
        }
    };

    const moveUp = (index: number) => {
        if (index === 0) return;
        const newArr = [...activities];
        [newArr[index - 1], newArr[index]] = [newArr[index], newArr[index - 1]];
        setActivities(newArr);
    };

    const moveDown = (index: number) => {
        if (index === activities.length - 1) return;
        const newArr = [...activities];
        [newArr[index + 1], newArr[index]] = [newArr[index], newArr[index + 1]];
        setActivities(newArr);
    };

    const removeRow = (index: number) => {
        const newArr = [...activities];
        newArr.splice(index, 1);
        setActivities(newArr);
    };

    const addRow = () => {
        const newId = activities.length > 0 ? Math.max(...activities.map(a => a.id)) + 1 : 1;
        setActivities([...activities, {
            id: newId, name: "New Activity", type: "exercise", metric: "Distance", value: "100m", hasCounter: false, counter: 0, elapsedMs: 0, status: "pending"
        }]);
    };

    const updateActivity = (index: number, key: keyof Activity, value: any) => {
        const newArr = [...activities];
        newArr[index] = { ...newArr[index], [key]: value };
        setActivities(newArr);
    };

    const handleSyncAthletes = async () => {
        if (!sheetUrl.includes("http")) {
            toast({ variant: "destructive", title: "Invalid URL", description: "Please enter a valid Google Sheets published CSV URL." });
            return;
        }

        setIsSyncing(true);
        try {
            const response = await fetch(sheetUrl);
            const csvText = await response.text();

            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: async (results) => {
                    const rows = results.data as any[];

                    const athletesToInsert = rows.map((row) => ({
                        bib: (row.Bib || row.bib || "").toString().trim(),
                        name: (row.Name || row.name || "").toString().trim(),
                        phone: (row.Phone || row.phone || "").toString().trim(),
                    })).filter(a => a.bib && a.name);

                    if (athletesToInsert.length === 0) {
                        toast({ variant: "destructive", title: "Sync failed", description: "No valid athletes found. Ensure CSV has 'Bib' and 'Name' headers." });
                        setIsSyncing(false);
                        return;
                    }

                    const { error } = await supabase.from('athletes').upsert(athletesToInsert, { onConflict: 'bib' });

                    if (error) {
                        console.error("Supabase Error:", error);
                        toast({ variant: "destructive", title: "Supabase Error", description: error.message });
                    } else {
                        toast({ title: "Sync Complete", description: `Successfully synced ${athletesToInsert.length} athletes to Supabase.` });
                    }
                    setIsSyncing(false);
                },
                error: (error: any) => {
                    toast({ variant: "destructive", title: "Parse Error", description: error.message });
                    setIsSyncing(false);
                }
            });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Fetch Error", description: error.message });
            setIsSyncing(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-4 sm:p-6 font-sans pb-20">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => window.location.href = "/"} className="text-gray-400 hover:text-white -ml-1">
                        <ChevronLeft className="w-5 h-5" /> Back
                    </Button>
                    <h1 className="text-xl font-bold tracking-tight">Admin</h1>
                </div>
                <WoneMark />
            </div>

            <div className="space-y-6 max-w-2xl mx-auto">

                <Card className="bg-[#111] border-[#333]">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                            <Type className="w-4 h-4 text-[#CCFF00]" /> Event setup
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div>
                            <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wider block mb-1">Event name</label>
                            <Input
                                value={eventConfig.eventName}
                                onChange={e => setEventConfigState(prev => ({ ...prev, eventName: e.target.value }))}
                                placeholder="e.g. Hyfit Games 2.1"
                                className="bg-[#1a1a1a] border-[#333] text-white focus:border-[#CCFF00] rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wider block mb-1">Event date</label>
                            <Input
                                type="date"
                                value={eventConfig.eventDate}
                                onChange={e => setEventConfigState(prev => ({ ...prev, eventDate: e.target.value }))}
                                className="bg-[#1a1a1a] border-[#333] text-white focus:border-[#CCFF00] rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wider block mb-1">Location</label>
                            <Input
                                value={eventConfig.location}
                                onChange={e => setEventConfigState(prev => ({ ...prev, location: e.target.value }))}
                                placeholder="e.g. HYFIT, HSR Layout"
                                className="bg-[#1a1a1a] border-[#333] text-white focus:border-[#CCFF00] rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                                <Lock className="w-3 h-3" /> Admin PIN
                            </label>
                            <Input
                                type="text"
                                value={eventConfig.adminPin || ""}
                                onChange={e => setEventConfigState(prev => ({ ...prev, adminPin: e.target.value }))}
                                placeholder="admin"
                                className="bg-[#1a1a1a] border-[#333] text-white focus:border-[#CCFF00] rounded-lg"
                            />
                        </div>
                        <Button onClick={handleSaveEventConfig} disabled={isSavingEvent} className="w-full bg-[#CCFF00] hover:bg-[#aacc00] text-black font-semibold text-sm h-10">
                            <Save className="w-4 h-4 mr-1.5" /> {isSavingEvent ? "Saving…" : "Save event"}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-[#111] border-[#333]">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                            <DownloadCloud className="w-4 h-4 text-[#CCFF00]" /> Sync athletes
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-gray-400 text-xs leading-relaxed">
                            Publish the sheet as CSV (File → Share → Publish to web). Use columns <strong>Bib</strong>, <strong>Name</strong>, and optionally <strong>Phone</strong>.
                        </p>
                        <Input
                            value={sheetUrl}
                            onChange={e => setSheetUrl(e.target.value)}
                            placeholder="https://docs.google.com/.../pub?output=csv"
                            className="bg-[#222] border-[#444] text-white text-sm py-3"
                        />
                        <Button
                            onClick={handleSyncAthletes}
                            disabled={isSyncing || !sheetUrl}
                            className="w-full bg-[#CCFF00] hover:bg-[#aacc00] text-black font-semibold text-sm h-10"
                        >
                            {isSyncing ? "Syncing…" : "Sync to database"}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-[#111] border-[#333]">
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <CardTitle className="text-base font-semibold text-white">Event sequence</CardTitle>
                        <Button variant="outline" size="sm" onClick={handleReset} className="border-red-500/60 text-red-400 hover:bg-red-500/10 text-xs h-8">
                            Reset default
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 mb-4">
                            {activities.map((act, index) => (
                                <div key={act.id} className="flex items-center gap-2 bg-[#1A1A1A] p-2.5 rounded-lg border border-[#333]">
                                    <div className="flex flex-col gap-0.5 pr-2 border-r border-[#333]">
                                        <button onClick={() => moveUp(index)} disabled={index === 0} className="text-gray-500 hover:text-white disabled:opacity-30 p-0.5"><ArrowUp className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => moveDown(index)} disabled={index === activities.length - 1} className="text-gray-500 hover:text-white disabled:opacity-30 p-0.5"><ArrowDown className="w-3.5 h-3.5" /></button>
                                    </div>

                                    <div className="flex-1 grid grid-cols-12 gap-2 pl-1">
                                        <Input value={act.name} onChange={e => updateActivity(index, "name", e.target.value)} className="col-span-5 h-8 bg-black border-[#444] text-sm" placeholder="Activity name" />
                                        <select
                                            value={act.type}
                                            onChange={e => updateActivity(index, "type", e.target.value)}
                                            className="col-span-3 h-8 bg-[#1a1a1a] border border-[#444] text-white text-xs rounded-lg px-2 appearance-none outline-none focus:border-[#CCFF00]"
                                        >
                                            <option value="run" className="bg-[#1a1a1a]">Run</option>
                                            <option value="exercise" className="bg-[#1a1a1a]">Station</option>
                                        </select>
                                        <Input value={act.value} onChange={e => updateActivity(index, "value", e.target.value)} className="col-span-4 h-8 bg-black border-[#444] text-sm" placeholder="e.g. 100m" />
                                    </div>

                                    <div className="flex items-center gap-1.5 ml-1">
                                        <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Count</span>
                                        <Checkbox checked={!!act.hasCounter} onCheckedChange={(v) => updateActivity(index, "hasCounter", v === true)} className="scale-90" />
                                    </div>

                                    <button onClick={() => removeRow(index)} className="p-1.5 text-red-400/80 hover:text-red-400 hover:bg-red-500/10 rounded-md">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <Button variant="outline" size="sm" onClick={addRow} className="w-full border-dashed border-[#444] text-gray-400 hover:text-white hover:border-[#666] text-sm h-9 mb-4">
                            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add step
                        </Button>

                        <Button onClick={handleSaveEvents} className="w-full bg-[#CCFF00] hover:bg-[#aacc00] text-black font-semibold text-sm h-11">
                            <Save className="w-4 h-4 mr-1.5" /> Save sequence
                        </Button>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
