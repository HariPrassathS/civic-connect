"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateTaskStatus, logWork, sendMessage, uploadTaskMedia } from "./actions";
import { Send, Clock, CheckCircle2, XCircle, AlertCircle, ShieldAlert, IndianRupee } from "lucide-react";
import { GeotagCamera } from "@/components/complaints/geotag-camera";

/**
 * AI-driven analysis: determines whether a complaint involves government-funded
 * infrastructure work that requires mandatory fund declaration.
 * 
 * Categories that require funds:
 *   - Roads & Potholes (road construction, repair, resurfacing)
 *   - Building & Construction (structural repair, demolition, new construction)
 *   - Streetlights (new installation only — replacement is operational)
 *   - Water Supply (pipeline installation, bore well, overhead tank construction)
 *   - Electricity (transformer installation, new line laying)
 * 
 * Categories that do NOT require funds:
 *   - Sanitation & Garbage (operational — daily collection, cleaning)
 *   - Environment & Pollution (monitoring, enforcement — no construction)
 *   - Traffic & Transport (signal adjustment, signage — minimal cost)
 *   - Parks & Public Spaces (maintenance — unless major renovation)
 *   - Tax & Revenue (administrative — no physical work)
 *   - Other / General Complaint / Suggestion
 */
function analyzeIfFundsRequired(
  categoryName: string,
  title: string,
  description: string
): { required: boolean; reason: string } {
  const combined = `${categoryName} ${title} ${description}`.toLowerCase();

  // --- INFRASTRUCTURE CATEGORIES (funds mandatory) ---
  const infrastructureCategories = [
    "roads & potholes", "pothole", "road damage", "road flooding",
    "building & construction", "illegal construction", "dangerous structure",
  ];

  // Keywords that strongly indicate infrastructure/construction work
  const infrastructureKeywords = [
    "road", "pothole", "bridge", "flyover", "construction", "building",
    "dam", "canal", "pipeline installation", "bore well", "overhead tank",
    "transformer installation", "new line", "resurfacing", "tar", "asphalt",
    "concrete", "cement", "renovation", "reconstruction", "demolition",
    "footpath", "sidewalk", "drainage construction", "culvert", "subway",
  ];

  // --- NON-INFRASTRUCTURE CATEGORIES (funds NOT needed) ---
  const operationalCategories = [
    "sanitation & garbage", "garbage not collected", "open dumping", "drain blockage",
    "environment & pollution", "air pollution", "noise pollution",
    "traffic & transport", "traffic signal", "illegal parking",
    "parks & public spaces", "park maintenance", "encroachment",
    "tax & revenue", "road tax", "house & property tax", "income & commercial tax",
    "general revenue query",
    "other", "general complaint", "suggestion",
    "electricity theft", "voltage fluctuation", "power outage",
    "water leak", "water contamination", "no water supply",
    "light not working", "new light request",
  ];

  // Check if explicitly operational (no funds)
  for (const op of operationalCategories) {
    if (combined.includes(op)) {
      return {
        required: false,
        reason: `"${categoryName}" is an operational/service issue — no government project funds needed.`
      };
    }
  }

  // Check if explicitly infrastructure (funds required)
  for (const infra of infrastructureCategories) {
    if (combined.includes(infra)) {
      return {
        required: true,
        reason: `"${categoryName}" involves infrastructure construction/repair — government fund declaration is mandatory.`
      };
    }
  }

  // Check keywords in title + description for hidden infrastructure work
  for (const kw of infrastructureKeywords) {
    if (combined.includes(kw)) {
      return {
        required: true,
        reason: `Detected infrastructure keyword "${kw}" — government fund declaration required.`
      };
    }
  }

  // Default: not required
  return {
    required: false,
    reason: "No infrastructure or construction work detected — fund declaration not required."
  };
}

export function TaskControls({
  complaintId,
  currentStatus,
  messages = [],
  workLogs = [],
  hasInitialImage = false,
  hasResolutionPhoto = false,
  categoryName = "",
  complaintTitle = "",
  complaintDescription = "",
}: {
  complaintId: string;
  currentStatus: string;
  messages: any[];
  workLogs: any[];
  hasInitialImage?: boolean;
  hasResolutionPhoto?: boolean;
  categoryName?: string;
  complaintTitle?: string;
  complaintDescription?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [hours, setHours] = useState("");
  const [logNote, setLogNote] = useState("");
  const [hasUploadedPhoto, setHasUploadedPhoto] = useState(false);
  const [fundsAllocated, setFundsAllocated] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // AI-driven fund relevance analysis
  const fundAnalysis = useMemo(
    () => analyzeIfFundsRequired(categoryName, complaintTitle, complaintDescription),
    [categoryName, complaintTitle, complaintDescription]
  );

  const handleStatus = async (newStatus: string, note: string) => {
    if (newStatus === "resolution_submitted") {
      if (hasInitialImage && !hasUploadedPhoto && !hasResolutionPhoto) {
        setErrorMsg("Citizen provided an initial photo. You MUST take a Geotagged Resolution Photo before submitting!");
        return;
      }
      // Only enforce fund validation if AI determined it's required
      if (fundAnalysis.required && (!fundsAllocated || isNaN(Number(fundsAllocated)))) {
        setErrorMsg("This is an infrastructure issue — you must declare the government funds allocated (₹) before submitting.");
        return;
      }
    }

    setErrorMsg("");
    setLoading(true);
    const result = await updateTaskStatus(
      complaintId,
      newStatus,
      note,
      fundAnalysis.required ? (Number(fundsAllocated) || 0) : 0
    );
    if (result.error) {
      setErrorMsg(result.error);
    }
    setLoading(false);
  };

  const handleSendMsg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    setLoading(true);
    await sendMessage(complaintId, messageText);
    setMessageText("");
    setLoading(false);
  };

  const handleLogWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hours || isNaN(Number(hours))) return;
    setLoading(true);
    await logWork(complaintId, Number(hours), logNote);
    setHours("");
    setLogNote("");
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("media", file);
    await uploadTaskMedia(complaintId, formData);
    setHasUploadedPhoto(true);
    setErrorMsg("");
    setLoading(false);
  };

  const handleGeotagCapture = async (file: File) => {
    setLoading(true);
    const formData = new FormData();
    formData.append("media", file);
    await uploadTaskMedia(complaintId, formData);
    setHasUploadedPhoto(true);
    setErrorMsg("");
    setLoading(false);
  };

  return (
    <div className="space-y-8">
      {/* ── 1. Status Actions ────────────────────────────── */}
      <section className="rounded-xl border border-border/50 bg-card/40 p-4 shadow-md backdrop-blur-xl">
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Actions
        </h3>
        
        {currentStatus === "assigned" && (
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => handleStatus("in_progress", "Task accepted by field worker")}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 h-12"
            >
              <CheckCircle2 className="mr-2 h-5 w-5" /> Accept Task
            </Button>
            <Button
              onClick={() => handleStatus("received", "Task rejected/returned by field worker")}
              disabled={loading}
              variant="outline"
              className="w-full text-red-500 hover:text-red-600 h-12 border-red-500/30 hover:bg-red-500/10"
            >
              <XCircle className="mr-2 h-5 w-5" /> Reject
            </Button>
            <Button
              onClick={() => handleStatus("assigned", "Requested more info from citizen")}
              disabled={loading}
              variant="outline"
              className="col-span-2 h-12"
            >
              <AlertCircle className="mr-2 h-5 w-5 text-yellow-500" /> Need More Info
            </Button>
          </div>
        )}

        {currentStatus === "in_progress" && (
          <div className="space-y-5">
            {errorMsg && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-500 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Fund Input — ONLY shown for infrastructure/construction issues */}
            {fundAnalysis.required ? (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                <label className="mb-1.5 block text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                  <IndianRupee className="inline h-3.5 w-3.5 mr-1" />
                  Government Funds Allocated (Mandatory)
                </label>
                <p className="mb-2 text-xs text-muted-foreground">
                  {fundAnalysis.reason}
                </p>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-medium text-muted-foreground">₹</span>
                  <Input
                    type="number"
                    placeholder="e.g. 250000"
                    value={fundsAllocated}
                    onChange={(e) => setFundsAllocated(e.target.value)}
                    className="pl-8 bg-background"
                    disabled={loading}
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-border/30 bg-muted/30 p-2.5 text-xs text-muted-foreground flex items-center gap-2">
                <IndianRupee className="h-3.5 w-3.5" />
                <span>{fundAnalysis.reason}</span>
              </div>
            )}

            {/* Resolution Photo Interface */}
            <div>
              <label className="mb-1.5 block text-sm font-medium flex justify-between items-center">
                <span>Upload Resolution Photo</span>
                {hasInitialImage ? (
                  <span className="text-xs font-bold text-red-500 uppercase">Mandatory (Citizen photo detected)</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Optional</span>
                )}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <GeotagCamera 
                  onCapture={handleGeotagCapture} 
                  buttonLabel="Take Geotag Photo"
                />
                
                <div className="relative">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={loading}
                    className="hidden"
                    id="gallery-upload"
                  />
                  <Button 
                    onClick={() => document.getElementById("gallery-upload")?.click()}
                    variant="outline" 
                    className="w-full h-9 text-xs border-dashed"
                    type="button"
                  >
                    Gallery Upload
                  </Button>
                </div>
              </div>
              {hasUploadedPhoto && (
                <p className="mt-2 text-xs text-emerald-500 font-medium">✅ Resolution photo captured and verified.</p>
              )}
            </div>
            
            <Button
              onClick={() => handleStatus("resolution_submitted", "Field worker submitted resolution with GPS validation.")}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base font-semibold"
            >
              <CheckCircle2 className="mr-2 h-5 w-5" /> Submit Verified Resolution
            </Button>
          </div>
        )}

        {currentStatus === "resolution_submitted" && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-center justify-center">
            Resolution submitted. Awaiting officer verification.
          </div>
        )}
      </section>

      {/* ── 2. Log Work ─────────────────────────────────── */}
      {(currentStatus === "in_progress" || currentStatus === "assigned") && (
        <section className="rounded-xl border border-border/50 bg-card/40 p-4 shadow-md backdrop-blur-xl">
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center">
            <Clock className="mr-2 h-4 w-4" /> Log Work
          </h3>
          <form onSubmit={handleLogWork} className="space-y-3">
            <div className="flex gap-3">
              <Input
                type="number"
                step="0.5"
                placeholder="Hours"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-24 bg-background"
                required
              />
              <Input
                placeholder="What did you do?"
                value={logNote}
                onChange={(e) => setLogNote(e.target.value)}
                className="flex-1 bg-background"
                required
              />
            </div>
            <Button type="submit" disabled={loading} size="sm" className="w-full">
              Save Work Log
            </Button>
          </form>

          {workLogs.length > 0 && (
            <div className="mt-4 space-y-2 border-t border-border/50 pt-4">
              {workLogs.map((log: any) => (
                <div key={log.id} className="text-sm flex justify-between bg-background/50 p-2 rounded-md border border-border/30">
                  <span className="text-muted-foreground">{log.note}</span>
                  <span className="font-medium text-foreground">{log.hours}h</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── 3. Citizen Messaging ────────────────────────── */}
      <section className="rounded-xl border border-border/50 bg-card/40 p-4 flex flex-col h-[400px] shadow-md backdrop-blur-xl">
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Citizen Chat
        </h3>
        
        <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
          {messages.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground mt-10">
              No messages yet. Send a message to the citizen.
            </div>
          ) : (
            messages.map((msg: any) => {
              const isWorker = msg.sender?.role === "field_worker";
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isWorker ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                      isWorker
                        ? "bg-blue-600 text-white rounded-tr-sm"
                        : "bg-muted text-foreground rounded-tl-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 px-1">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handleSendMsg} className="flex gap-2">
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Message citizen..."
            className="flex-1 bg-background rounded-full px-4"
            disabled={loading}
          />
          <Button type="submit" size="icon" disabled={loading} className="rounded-full shrink-0 bg-blue-600 hover:bg-blue-700">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </section>
    </div>
  );
}
