import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUBSPECIALTIES } from "@/lib/constants";

export default function SearchConsole({
  initialLocation = "",
  initialSubspecialty = "",
  onSearch,
  compact = false,
}) {
  const [location, setLocation] = useState(initialLocation);
  const [subspecialty, setSubspecialty] = useState(initialSubspecialty);

  useEffect(() => {
    setLocation(initialLocation || "");
  }, [initialLocation]);

  useEffect(() => {
    setSubspecialty(initialSubspecialty || "");
  }, [initialSubspecialty]);

  const canSearch = useMemo(() => location.trim().length >= 3, [location]);

  return (
    <div
      data-testid="search-console"
      className={[
        "w-full rounded-2xl border border-slate-200 bg-white shadow-sm",
        compact ? "p-4" : "p-5 sm:p-6",
      ].join(" ")}
    >
      <div
        data-testid="search-console-grid"
        className="grid gap-3 md:grid-cols-[1.4fr_1fr_auto]"
      >
        <div className="space-y-1.5">
          <div
            data-testid="search-location-label"
            className="text-xs font-semibold text-slate-700"
          >
            Location (City / Area / Pincode)
          </div>
          <Input
            data-testid="search-location-input"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., 400001 or Andheri West"
            className="h-11 rounded-xl border-slate-200 bg-slate-50/60 focus-visible:ring-sky-500"
          />
        </div>

        <div className="space-y-1.5">
          <div
            data-testid="search-subspecialty-label"
            className="text-xs font-semibold text-slate-700"
          >
            Subspecialty (optional)
          </div>
          <Select
            value={subspecialty}
            onValueChange={(v) => setSubspecialty(v === "__any__" ? "" : v)}
          >
            <SelectTrigger
              data-testid="search-subspecialty-trigger"
              className="h-11 rounded-xl border-slate-200 bg-slate-50/60"
            >
              <SelectValue placeholder="Any subspecialty" />
            </SelectTrigger>
            <SelectContent data-testid="search-subspecialty-content">
              <SelectItem
                data-testid="search-subspecialty-any"
                value="__any__"
              >
                Any
              </SelectItem>
              {SUBSPECIALTIES.map((s) => (
                <SelectItem
                  data-testid={`search-subspecialty-option-${s.toLowerCase()}`}
                  key={s}
                  value={s}
                >
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end">
          <Button
            data-testid="search-submit-button"
            disabled={!canSearch}
            onClick={() => onSearch({ location: location.trim(), subspecialty })}
            className="h-11 w-full rounded-xl bg-sky-700 px-6 text-white hover:bg-sky-800 disabled:opacity-50 md:w-auto"
          >
            Search
          </Button>
        </div>
      </div>

      <div
        data-testid="search-console-helper"
        className="mt-3 text-xs text-slate-500"
      >
        Tip: Use a 6-digit pincode for the most accurate nearby results.
      </div>
    </div>
  );
}
