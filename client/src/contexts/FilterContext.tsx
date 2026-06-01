import { createContext, useContext, useState, ReactNode } from "react";

interface FilterState {
  dateFrom: Date;
  dateTo: Date;
  manager: string;
}

interface FilterContextType {
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  setDateFrom: (date: Date) => void;
  setDateTo: (date: Date) => void;
  setManager: (manager: string) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const today = new Date();
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: today,
    dateTo: today,
    manager: "",
  });

  const setDateFrom = (date: Date) => {
    setFilters((prev) => ({ ...prev, dateFrom: date }));
  };

  const setDateTo = (date: Date) => {
    setFilters((prev) => ({ ...prev, dateTo: date }));
  };

  const setManager = (manager: string) => {
    setFilters((prev) => ({ ...prev, manager }));
  };

  return (
    <FilterContext.Provider value={{ filters, setFilters, setDateFrom, setDateTo, setManager }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error("useFilters deve ser usado dentro de FilterProvider");
  }
  return context;
}
