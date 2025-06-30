import React, { useState, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

// Palette de couleurs étendue avec plus de choix
const colors = [
  // Rouges
  '#ef4444', // red-500
  '#dc2626', // red-600
  '#b91c1c', // red-700
  
  // Oranges
  '#f97316', // orange-500
  '#ea580c', // orange-600
  '#c2410c', // orange-700
  
  // Ambre
  '#f59e0b', // amber-500
  '#d97706', // amber-600
  '#b45309', // amber-700
  
  // Jaunes
  '#eab308', // yellow-500
  '#ca8a04', // yellow-600
  '#a16207', // yellow-700
  
  // Verts
  '#84cc16', // lime-500
  '#65a30d', // lime-600
  '#4d7c0f', // lime-700
  
  // Émeraudes
  '#10b981', // emerald-500
  '#059669', // emerald-600
  '#047857', // emerald-700
  
  // Cyans
  '#06b6d4', // cyan-500
  '#0891b2', // cyan-600
  '#0e7490', // cyan-700
  
  // Bleus
  '#3b82f6', // blue-500
  '#2563eb', // blue-600
  '#1d4ed8', // blue-700
  
  // Indigos
  '#6366f1', // indigo-500
  '#4f46e5', // indigo-600
  '#4338ca', // indigo-700
  
  // Violets
  '#8b5cf6', // violet-500
  '#7c3aed', // violet-600
  '#6d28d9', // violet-700
  
  // Fuchsias
  '#d946ef', // fuchsia-500
  '#c026d3', // fuchsia-600
  '#a21caf', // fuchsia-700
  
  // Roses
  '#ec4899', // pink-500
  '#db2777', // pink-600
  '#be185d', // pink-700
  
  // Gris
  '#6b7280', // gray-500
  '#4b5563', // gray-600
  '#374151', // gray-700
  
  // Ardoises
  '#64748b', // slate-500
  '#475569', // slate-600
  '#334155', // slate-700
  
  // Noir et blanc
  '#000000', // black
  '#ffffff', // white
];

const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={pickerRef}>
      <button
        type="button"
        className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 shadow-sm"
        style={{ backgroundColor: color }}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Choisir une couleur"
      />

      {isOpen && (
        <div className="fixed z-[9999] mt-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 grid grid-cols-6 gap-2 max-w-[300px]" style={{ top: pickerRef.current?.getBoundingClientRect().bottom, left: pickerRef.current?.getBoundingClientRect().left }}>
          {colors.map((c) => (
            <button
              key={c}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:scale-110 transition-transform relative"
              style={{ backgroundColor: c }}
              onClick={() => {
                onChange(c);
                setIsOpen(false);
              }}
              aria-label={`Couleur ${c}`}
            >
              {color === c && <Check className="text-white" size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ColorPicker;