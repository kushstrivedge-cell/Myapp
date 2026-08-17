import { Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suggestions?: string[];
};

export default function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  suggestions = [],
}: Props) {
  const [focused, setFocused] = useState(false);
  const matches = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return [];
    return [...new Set(suggestions.map(item => item.trim()).filter(Boolean))]
      .filter(item => item.toLowerCase().includes(query))
      .sort(
        (a, b) =>
          Number(!a.toLowerCase().startsWith(query)) -
          Number(!b.toLowerCase().startsWith(query)),
      )
      .slice(0, 7);
  }, [suggestions, value]);
  return (
    <div className="autocomplete">
      <div className="search-shell">
        <Search aria-hidden="true" size={16} />
        <input
          aria-autocomplete="list"
          aria-expanded={focused && matches.length > 0}
          className="search"
          type="search"
          value={value}
          placeholder={placeholder}
          onChange={event => onChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        />
        {value && (
          <button
            type="button"
            aria-label="Clear search"
            onMouseDown={event => event.preventDefault()}
            onClick={() => onChange('')}
          >
            <X size={15} />
          </button>
        )}
      </div>
      {focused && matches.length > 0 && (
        <div className="autocomplete-menu" role="listbox">
          {matches.map(item => (
            <button
              key={item}
              type="button"
              role="option"
              onMouseDown={event => event.preventDefault()}
              onClick={() => {
                onChange(item);
                setFocused(false);
              }}
            >
              <Search size={14} />
              <span>{item}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
