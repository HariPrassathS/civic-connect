"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Label } from "@/components/ui/label";
import type { Category } from "@/types/database";

interface CategoryPickerProps {
  onSelect: (categoryId: string | null) => void;
  selectedId?: string | null;
}

export function CategoryPicker({ onSelect, selectedId }: CategoryPickerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [parentId, setParentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const parents = categories.filter((c) => c.parent_id === null);
  const subcategories = categories.filter((c) => c.parent_id === parentId);

  useEffect(() => {
    async function fetchCategories() {
      const supabase = createClient();
      const { data } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      if (data) setCategories(data);
      setLoading(false);
    }
    fetchCategories();
  }, []);

  // If selectedId is provided, find its parent
  useEffect(() => {
    if (selectedId && categories.length > 0) {
      const cat = categories.find((c) => c.id === selectedId);
      if (cat?.parent_id) {
        setParentId(cat.parent_id);
      } else if (cat) {
        setParentId(cat.id);
      }
    }
  }, [selectedId, categories]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-10 animate-pulse rounded-lg bg-muted" />
        <div className="h-10 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <select
          id="category"
          value={parentId ?? ""}
          onChange={(e) => {
            const val = e.target.value || null;
            setParentId(val);
            // If parent has no subcategories, select it directly
            const subs = categories.filter((c) => c.parent_id === val);
            if (subs.length === 0) {
              onSelect(val);
            } else {
              onSelect(null);
            }
          }}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Select a category...</option>
          {parents.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {parentId && subcategories.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="subcategory">Subcategory</Label>
          <select
            id="subcategory"
            value={selectedId ?? ""}
            onChange={(e) => onSelect(e.target.value || null)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Select a subcategory...</option>
            {subcategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
