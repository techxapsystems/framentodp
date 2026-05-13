import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface OperacaoComboboxProps {
  value: string;
  onChange: (value: string) => void;
  operacoes: string[] | { id: string; nome: string }[];
  placeholder?: string;
}

export function OperacaoCombobox({
  value,
  onChange,
  operacoes,
  placeholder = "Selecione ou digite uma operação...",
}: OperacaoComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(value);

  // Converter operações para array de strings
  const operacoesList = operacoes.map((op) =>
    typeof op === "string" ? op : op.nome
  );

  // Atualizar searchValue quando value mudar externamente
  useEffect(() => {
    setSearchValue(value);
  }, [value]);

  // Filtrar operações baseado no texto digitado
  const filteredOperacoes = operacoesList.filter((op) =>
    op.toLowerCase().includes(searchValue.toLowerCase())
  );

  const handleSelect = (operacao: string) => {
    onChange(operacao);
    setSearchValue(operacao);
    setOpen(false);
  };

  const handleInputChange = (text: string) => {
    setSearchValue(text);
    onChange(text);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className={cn("truncate", !searchValue && "text-muted-foreground")}>
            {searchValue || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            value={searchValue}
            onValueChange={handleInputChange}
          />
          <CommandList>
            {filteredOperacoes.length === 0 && searchValue && (
              <CommandEmpty>
                <div className="py-2 px-4">
                  <p className="text-sm text-slate-600">
                    Nenhuma operação encontrada. Você pode digitar um valor customizado.
                  </p>
                </div>
              </CommandEmpty>
            )}
            {filteredOperacoes.length > 0 && (
              <CommandGroup>
                {filteredOperacoes.map((operacao) => (
                  <CommandItem
                    key={operacao}
                    value={operacao}
                    onSelect={() => handleSelect(operacao)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === operacao ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {operacao}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
