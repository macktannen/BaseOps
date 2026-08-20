import { useState, useRef, useEffect, CSSProperties } from 'react';
import { ChevronDown } from 'lucide-react';

interface DropdownOption {
  value: string | number;
  label: string;
}

interface MobileDropdownMenuProps {
  value: string | number;
  options: DropdownOption[];
  onChange: (value: string | number) => void;
  placeholder?: string;
  style?: CSSProperties;
  disabled?: boolean;
}

const MobileDropdownMenu = ({ value, options, onChange, placeholder = 'Select...', style, disabled = false }: MobileDropdownMenuProps) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0, maxMenuHeight: 240 });
  const selectedLabel = options.find(o => String(o.value) === String(value))?.label || String(value || '');

  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      setMenuPos({ top: rect.bottom + 4, left: rect.left, width: rect.width, maxMenuHeight: Math.min(spaceBelow, 240) });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: Event) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) && triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px',
          width: '100%', boxSizing: 'border-box',
          padding: '5px 8px', height: '30px',
          border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--white)', color: selectedLabel ? 'var(--text-main)' : 'var(--text-muted)',
          fontSize: '0.78rem', fontFamily: 'inherit', cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none', opacity: disabled ? 0.6 : 1,
          ...style,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown size={14} style={{ flexShrink: 0, color: 'var(--text-muted)', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>

      {open && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: menuPos.top,
            left: Math.max(8, Math.min(menuPos.left, window.innerWidth - menuPos.width - 8)),
            width: Math.min(menuPos.width, window.innerWidth - 16),
            zIndex: 10000,
            backgroundColor: 'var(--white)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
            maxHeight: menuPos.maxMenuHeight,
            overflowY: 'auto',
            animation: 'dropdownFadeIn 0.15s ease-out',
          }}
        >
          {options.map(opt => {
            const isSelected = String(opt.value) === String(value);
            return (
              <div
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  padding: '7px 10px', cursor: 'pointer', fontSize: '0.8rem',
                  backgroundColor: isSelected ? 'var(--primary-light)' : 'transparent',
                  color: isSelected ? 'var(--white)' : 'var(--text-main)',
                  fontWeight: isSelected ? 600 : 400,
                  borderBottom: '1px solid #f1f5f9',
                  transition: 'background-color 0.1s',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = '#f7fafc'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                {opt.label}
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes dropdownFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
};

export default MobileDropdownMenu;
