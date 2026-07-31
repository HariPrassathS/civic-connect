"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Search } from "lucide-react";
import { updateUserRole, updateUserDepartment, updateUserWard } from "./actions";
import { toast } from "sonner";

const ROLES = [
  "citizen",
  "field_worker",
  "area_officer",
  "department_head",
  "commissioner",
  "district_collector",
  "chief_secretary",
  "chief_minister",
  "admin",
];

interface User {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  department_id: string | null;
  ward_id: string | null;
  created_at: string;
}

interface UserTableProps {
  users: User[];
  departments: { id: string; name: string }[];
  wards: { id: string; name: string }[];
}

export function UserTable({ users, departments, wards }: UserTableProps) {
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = users.filter(
    (u) =>
      (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase()) ||
      (u.phone || "").includes(search)
  );

  function handleRoleChange(userId: string, newRole: string) {
    startTransition(async () => {
      const result = await updateUserRole(userId, newRole);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Role updated");
      }
    });
  }

  function handleDeptChange(userId: string, deptId: string) {
    startTransition(async () => {
      const result = await updateUserDepartment(
        userId,
        deptId === "none" ? null : deptId
      );
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Department updated");
      }
    });
  }

  function handleWardChange(userId: string, wardId: string) {
    startTransition(async () => {
      const result = await updateUserWard(
        userId,
        wardId === "none" ? null : wardId
      );
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Ward updated");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <CardTitle>{filtered.length} Users</CardTitle>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, role, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 pr-4 font-medium">Name</th>
                <th className="pb-3 pr-4 font-medium">Role</th>
                <th className="hidden pb-3 pr-4 font-medium md:table-cell">Department</th>
                <th className="hidden pb-3 pr-4 font-medium lg:table-cell">Ward</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} className="border-b last:border-0">
                  <td className="py-3 pr-4">
                    <div>
                      <p className="font-medium">{user.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{user.phone || "No phone"}</p>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <Select
                      defaultValue={user.role}
                      onValueChange={(v) => v && handleRoleChange(user.id, v)}
                      disabled={isPending}
                    >
                      <SelectTrigger className="h-8 w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="hidden py-3 pr-4 md:table-cell">
                    <Select
                      defaultValue={user.department_id || "none"}
                      onValueChange={(v) => v && handleDeptChange(user.id, v)}
                      disabled={isPending}
                    >
                      <SelectTrigger className="h-8 w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="hidden py-3 pr-4 lg:table-cell">
                    <Select
                      defaultValue={user.ward_id || "none"}
                      onValueChange={(v) => v && handleWardChange(user.id, v)}
                      disabled={isPending}
                    >
                      <SelectTrigger className="h-8 w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {wards.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground">
                    No users match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
