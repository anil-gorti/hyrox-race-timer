import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Activity, getStoredActivities, DEFAULT_ACTIVITIES } from "@/lib/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Trash2, Plus, DownloadCloud, ChevronLeft, Save } from "lucide-react";
import Papa from "papaparse";
import { useToast } from "@/hooks/use-toast";

export default function Admin() {
    const [activities, setActivities] = useState<Activity[]>(getStoredActivities());
    const [sheetUrl, setSheetUrl] = useState("");
    const [isSyncing, setIsSyncing] = useState(false);
    const { toast } = useToast();

    const handleSaveEvents = () => {
        localStorage.setItem("HYFIT_EVENTS", JSON.stringify(activities));
        toast({
            title: "Events Saved",
            description: "The race sequence has been updated locally.",
        });
    };

    const handleReset = () => {
        if (confirm("Reset to default Hyrox sequence?")) {
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
            id: newId, name: "New Activity", type: "exercise", metric: "Distance", value: "100m", elapsedMs: 0, status: "pending"
        }]);
    };

    // Replace update activity logic with a helper to update a property by index
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
        <div className="min-h-screen bg-black text-white p-6 font-sans pb-20">
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" onClick={() => window.location.href = "/"} className="text-gray-400 hover:text-white">
                    <ChevronLeft className="w-6 h-6" /> Back
                </Button>
                <h1 className="text-3xl font-extrabold tracking-tighter">Admin Settings</h1>
            </div>

            <div className="space-y-8 max-w-2xl mx-auto">

                {/* Supabase Athletes Sync */}
                <Card className="bg-[#111] border-[#333]">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                            <DownloadCloud className="text-[#CCFF00]" /> Sync Athletes from Google Sheets
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-gray-400 text-sm">
                            Publish your Google Sheet to the web as a CSV (File {'>'} Share {'>'} Publish to Web {'>'} Comma-separated values).
                            Ensure columns are named <strong>Bib</strong>, <strong>Name</strong>, and optionally <strong>Phone</strong>.
                        </p>
                        <Input
                            value={sheetUrl}
                            onChange={e => setSheetUrl(e.target.value)}
                            placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
                            className="bg-[#222] border-[#444] text-white py-6"
                        />
                        <Button
                            onClick={handleSyncAthletes}
                            disabled={isSyncing || !sheetUrl}
                            className="w-full bg-[#CCFF00] hover:bg-[#aacc00] text-black font-bold h-12"
                        >
                            {isSyncing ? "Syncing to Supabase..." : "Sync Database"}
                        </Button>
                    </CardContent>
                </Card>

                {/* Activity Sequence Builder */}
                <Card className="bg-[#111] border-[#333]">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-xl font-bold text-white">Event Sequence</CardTitle>
                        <Button variant="outline" size="sm" onClick={handleReset} className="border-red-500 text-red-500 hover:bg-red-500/20">
                            Reset Default
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 mb-6">
                            {activities.map((act, index) => (
                                <div key={act.id} className="flex items-center gap-2 bg-[#1A1A1A] p-3 rounded-lg border border-[#333]">
                                    {/* Reorder Buttons */}
                                    <div className="flex flex-col gap-1 pr-2 border-r border-[#333]">
                                        <button onClick={() => moveUp(index)} disabled={index === 0} className="text-gray-500 hover:text-white disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                                        <button onClick={() => moveDown(index)} disabled={index === activities.length - 1} className="text-gray-500 hover:text-white disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
                                    </div>

                                    <div className="flex-1 grid grid-cols-12 gap-2 pl-2">
                                        <Input value={act.name} onChange={e => updateActivity(index, "name", e.target.value)} className="col-span-5 h-9 bg-black border-[#444] text-sm" placeholder="Activity Name" />

                                        <select
                                            value={act.type}
                                            onChange={e => updateActivity(index, "type", e.target.value)}
                                            className="col-span-3 h-9 bg-black border border-[#444] text-white text-sm rounded-md px-2 appearance-none outline-none"
                                        >
                                            <option value="run">Run / Cardio</option>
                                            <option value="exercise">Exercise / Station</option>
                                        </select>

                                        <Input value={act.value} onChange={e => updateActivity(index, "value", e.target.value)} className="col-span-4 h-9 bg-black border-[#444] text-sm" placeholder="Value (e.g. 100m, 50)" />
                                    </div>

                                    <button onClick={() => removeRow(index)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg ml-1">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <Button variant="outline" onClick={addRow} className="w-full border-dashed border-[#444] text-gray-400 hover:text-white hover:border-[#888] mb-6">
                            <Plus className="w-4 h-4 mr-2" /> Add Next Step
                        </Button>

                        <Button onClick={handleSaveEvents} className="w-full bg-[#CCFF00] hover:bg-[#aacc00] text-black font-extrabold h-14 text-lg">
                            <Save className="w-5 h-5 mr-2" /> Save Active Sequence
                        </Button>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
