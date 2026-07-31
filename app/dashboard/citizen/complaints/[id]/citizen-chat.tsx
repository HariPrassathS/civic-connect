"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendCitizenMessage } from "./actions";
import { Send } from "lucide-react";

export function CitizenChat({
  complaintId,
  messages = [],
}: {
  complaintId: string;
  messages: any[];
}) {
  const [loading, setLoading] = useState(false);
  const [messageText, setMessageText] = useState("");

  const handleSendMsg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    setLoading(true);
    await sendCitizenMessage(complaintId, messageText);
    setMessageText("");
    setLoading(false);
  };

  return (
    <div className="rounded-xl border border-border bg-card/50 p-4 flex flex-col h-[400px]">
      <h2 className="mb-4 text-sm font-medium">Messages with Authorities</h2>
      
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
        {messages.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground mt-10">
            No messages yet. You can ask for updates here.
          </div>
        ) : (
          messages.map((msg: any) => {
            const isCitizen = msg.sender?.role === "citizen";
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isCitizen ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                    isCitizen
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
          placeholder="Type a message..."
          className="flex-1 bg-background rounded-full px-4"
          disabled={loading}
        />
        <Button type="submit" size="icon" disabled={loading} className="rounded-full shrink-0 bg-blue-600 hover:bg-blue-700">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
