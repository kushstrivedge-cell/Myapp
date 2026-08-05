import React, {createContext, ReactNode, useContext, useState} from 'react';

type SearchContextValue = {
  history: string[];
  addSearch: (query: string) => void;
  removeSearch: (query: string) => void;
  clearHistory: () => void;
};

const SearchContext = createContext<SearchContextValue | undefined>(undefined);

export function SearchProvider({children}: {children: ReactNode}) {
  const [history, setHistory] = useState<string[]>([]);

  const addSearch = (query: string) => {
    const cleanQuery = query.trim();
    if (!cleanQuery) return;
    setHistory(current => [
      cleanQuery,
      ...current.filter(item => item.toLowerCase() !== cleanQuery.toLowerCase()),
    ].slice(0, 8));
  };

  return (
    <SearchContext.Provider
      value={{
        history,
        addSearch,
        removeSearch: query => setHistory(current => current.filter(item => item !== query)),
        clearHistory: () => setHistory([]),
      }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearchHistory() {
  const context = useContext(SearchContext);
  if (!context) throw new Error('useSearchHistory must be used inside SearchProvider');
  return context;
}
