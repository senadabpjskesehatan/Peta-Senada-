import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, SlidersHorizontal, Check, CheckCheck, RotateCcw } from 'lucide-react';
import { parseFilterValueList } from '../utils/monthHelper';

export interface SearchableOptionGroup {
  groupName: string;
  items: string[];
}

interface SearchableFilterSelectProps {
  key?: React.Key;
  label: string;
  icon: React.ReactNode;
  value: string | string[];
  onChange: (val: any) => void;
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

  // Selected items array (empty array means 'Semua')
  const selectedList = useMemo(() => {
    return parseFilterValueList(value);
  }, [value]);

  const isAllSelected = selectedList.length === 0;

  const isItemSelected = (item: string) => {
    if (isAllSelected) return false;
    return selectedList.some((s) => s.toLowerCase() === item.toLowerCase());
  };

  const handleToggleItem = (item: string) => {
    let next: string[];
    if (isAllSelected) {
      next = [item];
    } else {
      const exists = selectedList.some((s) => s.toLowerCase() === item.toLowerCase());
      if (exists) {
        next = selectedList.filter((s) => s.toLowerCase() !== item.toLowerCase());
      } else {
        next = [...selectedList, item];
      }
    }

    if (next.length === 0) {
      onChange('Semua');
    } else {
      onChange(next);
    }
  };

  const handleSelectSemua = () => {
    onChange('Semua');
  };

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

  const handleSelectAllVisible = () => {
    const visibleItems = groupedOptions && groupedOptions.length > 0
      ? filteredGroupedOptions.flatMap((g) => g.items)
      : filteredFlatOptions;

    if (visibleItems.length === 0) return;
    const set = new Set([...selectedList, ...visibleItems]);
    onChange(Array.from(set));
  };

  const handleToggleGroup = (groupItems: string[]) => {
    const allInGroupSelected = groupItems.every((item) => isItemSelected(item));
    if (allInGroupSelected) {
      const groupLower = new Set(groupItems.map((i) => i.toLowerCase()));
      const next = selectedList.filter((s) => !groupLower.has(s.toLowerCase()));
      onChange(next.length === 0 ? 'Semua' : next);
    } else {
      const set = new Set([...selectedList, ...groupItems]);
      onChange(Array.from(set));
    }
  };

  const colorStyles = {
    indigo: {
      ring: 'focus:ring-indigo-500',
      activeBg: 'bg-indigo-50 text-indigo-900 font-extrabold',
      hoverBg: 'hover:bg-indigo-50/80',
      badge: 'bg-indigo-600 text-white',
      checkBg: 'bg-indigo-600 border-indigo-600',
      groupBadge: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200',
    },
    emerald: {
      ring: 'focus:ring-emerald-500',
      activeBg: 'bg-emerald-50 text-emerald-900 font-extrabold',
      hoverBg: 'hover:bg-emerald-50/80',
      badge: 'bg-emerald-600 text-white',
      checkBg: 'bg-emerald-600 border-emerald-600',
      groupBadge: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
    },
    blue: {
      ring: 'focus:ring-blue-500',
      activeBg: 'bg-blue-50 text-blue-900 font-extrabold',
      hoverBg: 'hover:bg-blue-50/80',
      badge: 'bg-blue-600 text-white',
      checkBg: 'bg-blue-600 border-blue-600',
      groupBadge: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
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
          {isAllSelected ? `${totalOptionsCount} opsi` : `${selectedList.length}/${totalOptionsCount} dipilih`}
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
        <div className="truncate pr-2 min-w-0 flex items-center gap-1.5">
          {isAllSelected ? (
            <span className="text-slate-700 font-semibold truncate">{allLabel}</span>
          ) : selectedList.length === 1 ? (
            <span className="text-slate-900 font-extrabold truncate">{selectedList[0]}</span>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md shrink-0 shadow-3xs ${colorStyles.badge}`}>
                {selectedList.length} Dipilih
              </span>
              <span className="text-slate-900 font-bold truncate text-[11px]">
                {selectedList.join(', ')}
              </span>
            </div>
          )}
        </div>
        <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-2.5 animate-fadeIn min-w-[280px] max-w-md">
          {/* SEARCH BAR */}
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

          {/* QUICK TOOLBAR: SELECT ALL / RESET */}
          <div className="flex items-center justify-between px-1 pb-2 border-b border-slate-100 text-[10px] font-semibold text-slate-500">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectSemua}
                className={`hover:text-slate-800 flex items-center gap-1 cursor-pointer transition-colors ${
                  isAllSelected ? 'text-indigo-600 font-bold' : ''
                }`}
              >
                <RotateCcw className="w-3 h-3" />
                <span>Pilih Semua (Semua)</span>
              </button>
              {search && (
                <button
                  type="button"
                  onClick={handleSelectAllVisible}
                  className="hover:text-indigo-600 flex items-center gap-1 cursor-pointer text-slate-600 font-bold"
                >
                  <CheckCheck className="w-3 h-3" />
                  <span>Ceklist Hasil Cari</span>
                </button>
              )}
            </div>
            <span className="font-mono text-[10px] text-slate-400">
              {selectedList.length}/{totalOptionsCount}
            </span>
          </div>

          {/* CHECKLIST LIST CONTAINER */}
          <div className="max-h-64 overflow-y-auto space-y-1 py-1.5 pr-1 custom-scrollbar text-xs">
            {/* OPTION: SEMUA */}
            {(!search || allLabel.toLowerCase().includes(search.toLowerCase())) && (
              <div
                onClick={handleSelectSemua}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${
                  isAllSelected ? colorStyles.activeBg : `text-slate-700 ${colorStyles.hoverBg}`
                }`}
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                      isAllSelected ? colorStyles.checkBg + ' text-white shadow-3xs' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isAllSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className="truncate">{allLabel}</span>
                </div>
                {isAllSelected && <span className="text-[10px] font-extrabold text-emerald-600">✓ Aktif</span>}
              </div>
            )}

            {/* GROUPED OPTIONS WITH CHECKBOXES */}
            {groupedOptions && groupedOptions.length > 0 ? (
              filteredGroupedOptions.map((g) => {
                const allGroupSelected = g.items.length > 0 && g.items.every((item) => isItemSelected(item));
                return (
                  <div key={g.groupName} className="space-y-0.5 pt-1">
                    <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 rounded flex items-center justify-between">
                      <span>{g.groupName}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleGroup(g.items);
                        }}
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition-colors cursor-pointer ${colorStyles.groupBadge}`}
                      >
                        {allGroupSelected ? 'Batal Group' : 'Ceklist Group'}
                      </button>
                    </div>
                    {g.items.map((item) => {
                      const isSelected = isItemSelected(item);
                      return (
                        <div
                          key={item}
                          onClick={() => handleToggleItem(item)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected ? colorStyles.activeBg : `text-slate-700 ${colorStyles.hoverBg}`
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate pr-2 min-w-0">
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                                isSelected ? colorStyles.checkBg + ' text-white shadow-3xs' : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="truncate">{item}</span>
                          </div>
                          {isSelected && <span className="text-[10px] font-extrabold text-emerald-600 shrink-0">✓</span>}
                        </div>
                      );
                    })}
                  </div>
                );
              })
            ) : (
              /* FLAT OPTIONS WITH CHECKBOXES */
              filteredFlatOptions.map((item) => {
                const isSelected = isItemSelected(item);
                return (
                  <div
                    key={item}
                    onClick={() => handleToggleItem(item)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected ? colorStyles.activeBg : `text-slate-700 ${colorStyles.hoverBg}`
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2 min-w-0">
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                          isSelected ? colorStyles.checkBg + ' text-white shadow-3xs' : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="truncate">{item}</span>
                    </div>
                    {isSelected && <span className="text-[10px] font-extrabold text-emerald-600 shrink-0">✓</span>}
                  </div>
                );
              })
            )}

            {filteredFlatOptions.length === 0 && (!groupedOptions || filteredGroupedOptions.length === 0) && (
              <div className="py-4 text-center text-slate-400 text-xs italic">
                Tidak ada opsi yang cocok dengan "{search}"
              </div>
            )}
          </div>

          {/* FOOTER BAR WITH DONE BUTTON */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 mt-1">
            <span className="text-[11px] text-slate-500 font-medium truncate">
              {isAllSelected ? 'Menampilkan semua data' : `${selectedList.length} filter aktif`}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer shrink-0"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Selesai</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
