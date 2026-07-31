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
import { Plus, ChevronRight, Trash2 } from "lucide-react";
import { createCategory, deleteCategory } from "./actions";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
}

interface CategoryManagerProps {
  categories: Category[];
}

export function CategoryManager({ categories }: CategoryManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newParent, setNewParent] = useState<string>("none");

  const parentCategories = categories.filter((c) => !c.parent_id);
  const getSubcategories = (parentId: string) =>
    categories.filter((c) => c.parent_id === parentId);

  function handleCreate() {
    if (!newName.trim()) return;
    startTransition(async () => {
      const result = await createCategory(
        newName,
        newParent === "none" ? null : newParent
      );
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Category created");
        setDialogOpen(false);
        setNewName("");
        setNewParent("none");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteCategory(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Category deleted");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Categories</CardTitle>
            <CardDescription>
              {parentCategories.length} parent categories, {categories.length - parentCategories.length} subcategories
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button size="sm" />}>
              <Plus className="mr-1 h-4 w-4" /> Add Category
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Category</DialogTitle>
                <DialogDescription>
                  Add a new category or subcategory.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Category Name</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., Drainage"
                  />
                </div>
                <div>
                  <Label>Parent Category (optional)</Label>
                  <Select value={newParent} onValueChange={(v) => setNewParent(v ?? "none")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (top-level)</SelectItem>
                      {parentCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreate} disabled={isPending} className="w-full">
                  Create
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {parentCategories.map((parent) => {
            const subs = getSubcategories(parent.id);
            return (
              <div key={parent.id} className="rounded-lg border">
                <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{subs.length} sub</Badge>
                    <span className="font-medium">{parent.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(parent.id)}
                    disabled={isPending}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {subs.length > 0 && (
                  <div className="divide-y">
                    {subs.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between px-4 py-2.5 pl-8"
                      >
                        <div className="flex items-center gap-2 text-sm">
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          {sub.name}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(sub.id)}
                          disabled={isPending}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {parentCategories.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No categories yet. Create one to get started.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
