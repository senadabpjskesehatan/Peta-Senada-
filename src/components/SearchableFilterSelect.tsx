import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';

export interface SearchableOptionGroup {
  groupName: string;
  items: string[];
}

interface SearchableFilterSelectProps {
  key?: React.Key;
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (val: string) => void;
  options?: string[];
  groupedOptions?: SearchableOptionGroup[];
  allLabel: string;
  colorScheme?: 'indigo' | 'emerald' | 'blue';
  id?: string;
  searchPlaceholder?: string;
}

export default function SearchableFilterSelect({
  label,
  icon,
  value,
  onChange,
  options,
  groupedOptions,
  allLabel,
  colorScheme = 'indigo',
  id,
  searchPlaceholder = 'Cari...',
}: SearchableFilterSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalOptionsCount = useMemo(() => {
    if (groupedOptions && groupedOptions.length > 0) {
      return groupedOptions.reduce((acc, g) => acc + g.items.length, 0);
    }
    return options ? options.length : 0;
  }, [options, groupedOptions]);

  const filteredFlatOptions = useMemo(() => {
    if (!options) return [];
    if (!search.trim()) return options;
    const q = search.toLowerCase().trim();
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, search]);

  const filteredGroupedOptions = useMemo(() => {
    if (!groupedOptions) return [];
    if (!search.trim()) return groupedOptions;
    const q = search.toLowerCase().trim();

    return groupedOptions
      .map((g) => {
        const groupMatches = g.groupName.toLowerCase().includes(q);
        const matchingItems = g.items.filter((item) =>
          item.toLowerCase().includes(q) || groupMatches
        );
        return {
          groupName: g.groupName,
          items: matchingItems,
        };
      })
      .filter((g) => g.items.length > 0);
  }, [groupedOptions, search]);

  const colorStyles = {
    indigo: {
      ring: 'focus:ring-indigo-500',
      activeBg: 'bg-indigo-50 text-indigo-900 font-extrabold',
      hoverBg: 'hover:bg-indigo-50/70',
      badge: 'bg-indigo-100 text-indigo-800',
    },
    emerald: {
      ring: 'focus:ring-emerald-500',
      activeBg: 'bg-emerald-50 text-emerald-900 font-extrabold',
      hoverBg: 'hover:bg-emerald-50/70',
      badge: 'bg-emerald-100 text-emerald-800',
    },
    blue: {
      ring: 'focus:ring-blue-500',
      activeBg: 'bg-blue-50 text-blue-900 font-extrabold',
      hoverBg: 'hover:bg-blue-50/70',
      badge: 'bg-blue-100 text-blue-800',
    },
  }[colorScheme];

  return (
    <div className="space-y-1 relative" ref={containerRef}>
      <label className="block text-[11px] font-bold text-slate-700 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          {icon}
          <span>{label}</span>
        </span>
        <span className="text-[10px] font-semibold text-slate-500">
          {totalOptionsCount} opsi
        </span>
      </label>

      <button
        type="button"
        id={id}
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch('');
        }}
        className={`w-full bg-slate-50 hover:bg-slate-100/90 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 ${colorStyles.ring} focus:bg-white transition-all cursor-pointer shadow-3xs flex items-center justify-between text-left`}
      >
        <span className="truncate pr-2">
          {value === 'Semua' ? (
            <span className="text-slate-700 font-semibold">{allLabel}</span>
          ) : (
            <span className="text-slate-900 font-extrabold">{value}</span>
          )}
        </span>
        <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-2 animate-fadeIn min-w-[260px] max-w-sm">
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar text-xs">
            {(!search || allLabel.toLowerCase().includes(search.toLowerCase())) && (
              <button
                type="button"
                onClick={() => {
                  onChange('Semua');
                  setIsOpen(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                  value === 'Semua' ? colorStyles.activeBg : `text-slate-700 ${colorStyles.hoverBg}`
                }`}
              >
                <span>{allLabel}</span>
                {value === 'Semua' && <span className="text-[10px] font-bold">✓ Aktif</span>}
              </button>
            )}

            {groupedOptions && groupedOptions.length > 0 ? (
              filteredGroupedOptions.map((g) => (
                <div key={g.groupName} className="space-y-0.5 pt-1">
                  <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 rounded">
                    {g.groupName}
                  </div>
                  {g.items.map((item) => {
                    const isSelected = value === item;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          onChange(item);
                          setIsOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? colorStyles.activeBg : `text-slate-700 ${colorStyles.hoverBg}`
                        }`}
                      >
                        <span className="truncate">{item}</span>
                        {isSelected && <span className="text-[10px] font-bold">✓ Aktif</span>}
                      </button>
                    );
                  })}
                </div>
              ))
            ) : (
              filteredFlatOptions.map((item) => {
                const isSelected = value === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      onChange(item);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected ? colorStyles.activeBg : `text-slate-700 ${colorStyles.hoverBg}`
                    }`}
                  >
                    <span className="truncate">{item}</span>
                    {isSelected && <span className="text-[10px] font-bold">✓ Aktif</span>}
                  </button>
                );
              })
            )}

            {filteredFlatOptions.length === 0 && (!groupedOptions || filteredGroupedOptions.length === 0) && (
              <div className="py-4 text-center text-slate-400 text-xs italic">
                Tidak ada opsi yang cocok dengan "{search}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
