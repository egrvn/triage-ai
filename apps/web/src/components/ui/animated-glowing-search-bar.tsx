import { Filter, Search, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";

type AnimatedGlowingSearchBarProps = {
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function AnimatedGlowingSearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = "Искать incident, service, Logs...",
  className
}: AnimatedGlowingSearchBarProps) {
  const [internalValue, setInternalValue] = useState("");
  const currentValue = value ?? internalValue;

  const setValue = (nextValue: string) => {
    if (value === undefined) {
      setInternalValue(nextValue);
    }
    onChange?.(nextValue);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit?.(currentValue.trim());
  };

  return (
    <form className={cn("glow-search", className)} role="search" onSubmit={submit}>
      <Search className="glow-search__icon" size={18} aria-hidden="true" />
      <label className="sr-only" htmlFor="global-search">Поиск</label>
      <input
        id="global-search"
        aria-label="Поиск"
        value={currentValue}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onSubmit?.(currentValue.trim());
          }
        }}
        placeholder={placeholder}
      />
      {currentValue ? (
        <button
          className="glow-search__clear"
          type="button"
          aria-label="Очистить поиск"
          onClick={() => {
            setValue("");
            onSubmit?.("");
          }}
        >
          <X size={15} />
        </button>
      ) : null}
      <button className="glow-search__filter" type="submit" aria-label="Открыть фильтры">
        <Filter size={16} />
      </button>
    </form>
  );
}
