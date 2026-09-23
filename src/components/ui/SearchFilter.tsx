"use client";

import { Input } from "./Input";
import { Button } from "./Button";

interface SearchFilterProps {
  search: string;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  placeholder?: string;
  filters?: React.ReactNode;
}

export function SearchFilter({
  search,
  onSearchChange,
  onSearch,
  placeholder = "Search...",
  filters,
}: SearchFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
      <div className="flex gap-2 flex-1 max-w-md">
        <Input
          placeholder={placeholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
        />
        <Button variant="outline" onClick={onSearch}>
          Search
        </Button>
      </div>
      {filters && <div className="flex flex-wrap gap-2">{filters}</div>}
    </div>
  );
}
