import React from "react";

interface DateMaskInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  name?: string;
}

export function DateMaskInput({
  value,
  onChange,
  placeholder = "DD/MM/YYYY",
  disabled = false,
  className = "",
  name = "",
}: DateMaskInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value.replace(/\D/g, ""); // Remove caracteres não numéricos

    // Limitar a 8 dígitos
    if (input.length > 8) {
      input = input.slice(0, 8);
    }

    // Adicionar barras automaticamente
    let formatted = "";
    if (input.length >= 1) {
      formatted = input.slice(0, 2); // DD
    }
    if (input.length >= 3) {
      formatted += "/" + input.slice(2, 4); // MM
    }
    if (input.length >= 5) {
      formatted += "/" + input.slice(4, 8); // YYYY
    }

    onChange(formatted);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Permitir backspace, delete, tab, escape, enter
    if (
      [
        "Backspace",
        "Delete",
        "Tab",
        "Escape",
        "Enter",
        "ArrowLeft",
        "ArrowRight",
      ].includes(e.key)
    ) {
      return;
    }

    // Bloquear caracteres não numéricos
    if (!/[0-9]/.test(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <input
      type="text"
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={10}
      className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        value ? 'border-slate-300' : 'border-red-300 bg-red-50'
      } ${
        disabled ? "bg-slate-50 cursor-not-allowed" : "bg-white"
      } ${className}`}
      name={name}
    />
  );
}
