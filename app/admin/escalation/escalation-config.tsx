"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import { updateSLASetting } from "./actions";
import { toast } from "sonner";

interface LevelConfig {
  level: number;
  role: string;
  label: string;
  slaHours: number | null;
  settingKey: string;
  description: string;
}

interface EscalationConfigProps {
  levels: LevelConfig[];
}

export function EscalationConfig({ levels }: EscalationConfigProps) {
  const [isPending, startTransition] = useTransition();
  const [localLevels, setLocalLevels] = useState(levels);

  function handleHoursChange(index: number, value: string) {
    setLocalLevels((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        slaHours: value === "" ? null : parseInt(value, 10),
      };
      return copy;
    });
  }

  function toggleAutoSLA(index: number) {
    setLocalLevels((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        slaHours: copy[index].slaHours === null ? 24 : null,
      };
      return copy;
    });
  }

  function handleSave(index: number) {
    const level = localLevels[index];
    startTransition(async () => {
      const result = await updateSLASetting(level.settingKey, level.slaHours);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Level ${level.level} updated`);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>SLA Configuration</CardTitle>
        <CardDescription>
          Set the SLA deadline (in hours) for each escalation level. Disable
          auto-SLA for levels that require manual handling.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {localLevels.map((level, i) => (
            <div
              key={level.level}
              className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={level.slaHours !== null ? "default" : "secondary"}
                  >
                    L{level.level}
                  </Badge>
                  <span className="font-medium">{level.label}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Role: {level.role.replace(/_/g, " ")}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id={`auto-${level.level}`}
                    checked={level.slaHours !== null}
                    onCheckedChange={() => toggleAutoSLA(i)}
                  />
                  <Label htmlFor={`auto-${level.level}`} className="text-xs">
                    Auto-SLA
                  </Label>
                </div>

                {level.slaHours !== null ? (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={1}
                      className="h-8 w-20"
                      value={level.slaHours ?? ""}
                      onChange={(e) => handleHoursChange(i, e.target.value)}
                    />
                    <span className="text-xs text-muted-foreground">hrs</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Manual</span>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSave(i)}
                  disabled={isPending}
                >
                  <Save className="mr-1 h-3 w-3" /> Save
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
