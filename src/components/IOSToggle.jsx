import React from 'react';

export default function IOSToggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer group">
      <span className="text-md text-[var(--ink-brown)] font-medium select-none">
        {label}
      </span>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only"
        />
        <div className={`
          relative w-12 h-7 rounded-full transition-all duration-300 ease-in-out
          ${checked ? 'bg-[var(--accent-gold)]' : 'bg-gray-300'}
          group-hover:shadow-md
        `}>
          <div className={`
            absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm
            transform transition-transform duration-300 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}
            group-active:scale-95
          `} />
        </div>
      </div>
    </label>
  );
}