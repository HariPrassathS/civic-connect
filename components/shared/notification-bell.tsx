"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createClient } from "@/lib/supabase/client";

export function NotificationBell() {
  const [supabase, setSupabase] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setSupabase(createClient());
  }, []);

  useEffect(() => {
    if (!supabase) return;
    fetchNotifications();
    
    // Subscribe to new notifications
    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload: any) => {
          setNotifications((prev) => [payload.new, ...prev]);
          setUnreadCount((count) => count + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const fetchNotifications = async () => {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((n: any) => !n.read).length);
    }
  };

  const markAsRead = async () => {
    if (unreadCount === 0 || !supabase) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
      
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n: any) => ({ ...n, read: true })));
  };

  return (
    <Popover open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (isOpen) markAsRead();
    }}>
      <PopoverTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative")}>
        <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="font-semibold">Notifications</h4>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications yet.
            </div>
          ) : (
            notifications.map((n: any) => (
              <div
                key={n.id}
                className={`flex flex-col gap-1 border-b px-4 py-3 text-sm transition-colors hover:bg-muted/50 ${
                  !n.read ? "bg-muted/30" : ""
                }`}
              >
                <span className="font-medium">{n.title}</span>
                <span className="text-muted-foreground">{n.body}</span>
                <span className="text-xs text-muted-foreground/70 mt-1">
                  {new Date(n.created_at).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
