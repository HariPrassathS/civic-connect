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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import {
  createDepartment,
  updateDepartment,
  createWard,
  updateWard,
} from "./actions";
import { toast } from "sonner";

interface DepartmentManagerProps {
  departments: { id: string; name: string; city: string | null; created_at: string }[];
  wards: { id: string; name: string; area_officer_id: string | null; created_at: string }[];
  officers: { id: string; full_name: string | null; role: string }[];
}

export function DepartmentManager({
  departments,
  wards,
  officers,
}: DepartmentManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [wardDialogOpen, setWardDialogOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptCity, setNewDeptCity] = useState("");
  const [newWardName, setNewWardName] = useState("");
  const [newWardOfficer, setNewWardOfficer] = useState<string>("none");

  function handleCreateDept() {
    if (!newDeptName.trim()) return;
    startTransition(async () => {
      const result = await createDepartment(newDeptName, newDeptCity);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Department created");
        setDeptDialogOpen(false);
        setNewDeptName("");
        setNewDeptCity("");
      }
    });
  }

  function handleCreateWard() {
    if (!newWardName.trim()) return;
    startTransition(async () => {
      const result = await createWard(
        newWardName,
        newWardOfficer === "none" ? null : newWardOfficer
      );
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Ward created");
        setWardDialogOpen(false);
        setNewWardName("");
        setNewWardOfficer("none");
      }
    });
  }

  function handleWardOfficerChange(wardId: string, officerId: string) {
    startTransition(async () => {
      const ward = wards.find((w) => w.id === wardId);
      if (!ward) return;
      const result = await updateWard(
        wardId,
        ward.name,
        officerId === "none" ? null : officerId
      );
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Ward officer updated");
      }
    });
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Departments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Departments</CardTitle>
              <CardDescription>{departments.length} departments</CardDescription>
            </div>
            <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
              <DialogTrigger render={<Button size="sm" />}>
                <Plus className="mr-1 h-4 w-4" /> Add
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Department</DialogTitle>
                  <DialogDescription>
                    Add a new department to the system.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>Department Name</Label>
                    <Input
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                      placeholder="e.g., Water Supply"
                    />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input
                      value={newDeptCity}
                      onChange={(e) => setNewDeptCity(e.target.value)}
                      placeholder="e.g., Chennai"
                    />
                  </div>
                  <Button onClick={handleCreateDept} disabled={isPending} className="w-full">
                    Create Department
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{dept.name}</p>
                  <p className="text-xs text-muted-foreground">{dept.city || "No city"}</p>
                </div>
                <Badge variant="secondary">Dept</Badge>
              </div>
            ))}
            {departments.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">
                No departments yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Wards */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Wards</CardTitle>
              <CardDescription>{wards.length} wards</CardDescription>
            </div>
            <Dialog open={wardDialogOpen} onOpenChange={setWardDialogOpen}>
              <DialogTrigger render={<Button size="sm" />}>
                <Plus className="mr-1 h-4 w-4" /> Add
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Ward</DialogTitle>
                  <DialogDescription>
                    Add a new ward and optionally assign an area officer.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>Ward Name</Label>
                    <Input
                      value={newWardName}
                      onChange={(e) => setNewWardName(e.target.value)}
                      placeholder="e.g., Ward D - North"
                    />
                  </div>
                  <div>
                    <Label>Area Officer</Label>
                    <Select
                      value={newWardOfficer}
                      onValueChange={(v) => setNewWardOfficer(v ?? "none")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {officers
                          .filter((o) => o.role === "area_officer")
                          .map((o) => (
                            <SelectItem key={o.id} value={o.id}>
                              {o.full_name || o.id.slice(0, 8)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleCreateWard} disabled={isPending} className="w-full">
                    Create Ward
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {wards.map((ward) => {
              const officer = officers.find(
                (o) => o.id === ward.area_officer_id
              );
              return (
                <div
                  key={ward.id}
                  className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{ward.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Officer: {officer?.full_name || "Unassigned"}
                    </p>
                  </div>
                  <Select
                    defaultValue={ward.area_officer_id || "none"}
                    onValueChange={(v) => handleWardOfficerChange(ward.id, v ?? "none")}
                    disabled={isPending}
                  >
                    <SelectTrigger className="h-8 w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {officers
                        .filter((o) => o.role === "area_officer")
                        .map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.full_name || o.id.slice(0, 8)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
            {wards.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">
                No wards yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
