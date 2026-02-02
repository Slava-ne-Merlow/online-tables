import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import s from '../../styles/Grid.module.css';

export default function SelectorDropdown({
    value,
    options,
    onChange,
    placeholder = 'Выберите',
    disabled = false,
    className,
    onOpenChange,
    withBorder = true,
}) {
    const fieldRef = useRef(null);
    const popRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, bottom: null, left: 0, width: 0, maxHeight: 240 });
    const [placement, setPlacement] = useState('bottom');

    const selected = (options || []).find(opt => opt.value === value) || null;

    function layoutPopover() {
        const el = fieldRef.current;
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const minWidth = Math.max(160, Math.round(rect.width));
        const left = Math.round(rect.left);
        const margin = 8;
        const spaceBelow = window.innerHeight - rect.bottom - margin;
        const spaceAbove = rect.top - margin;
        const shouldOpenTop = spaceBelow < 200 && spaceAbove > spaceBelow;
        const maxHeight = shouldOpenTop
            ? Math.max(0, spaceAbove - 4)
            : Math.max(120, spaceBelow - 4);
        const top = shouldOpenTop
            ? Math.max(margin, Math.round(rect.top - 4))
            : Math.round(rect.bottom + 4);
        const bottom = null;
        setPlacement(shouldOpenTop ? 'top' : 'bottom');
        setPos({ top, bottom, left, width: minWidth, maxHeight });
    }

    useEffect(() => {
        if (!open) return;
        layoutPopover();

        const onDocDown = (e) => {
            if (!fieldRef.current || !popRef.current) return;
            if (fieldRef.current.contains(e.target) || popRef.current.contains(e.target)) return;
            setOpen(false);
        };
        const onReflow = () => layoutPopover();

        document.addEventListener('mousedown', onDocDown);
        window.addEventListener('scroll', onReflow, true);
        window.addEventListener('resize', onReflow);
        return () => {
            document.removeEventListener('mousedown', onDocDown);
            window.removeEventListener('scroll', onReflow, true);
            window.removeEventListener('resize', onReflow);
        };
    }, [open]);

    useEffect(() => {
        onOpenChange?.(open);
    }, [open, onOpenChange]);

    useEffect(() => {
        if (open) {
            requestAnimationFrame(() => {
                layoutPopover();
                requestAnimationFrame(layoutPopover);
            });
        }
    }, [open, options?.length]);

    function handlePick(opt) {
        onChange?.(opt.value);
        setOpen(false);
    }

    return (
        <>
            <div
                ref={fieldRef}
                className={`${s.selectorField} ${className || ''}`.trim()}
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-disabled={disabled}
                style={withBorder ? {} : { border: "none" }}
                onClick={() => {
                    if (disabled) return;
                    setOpen(prev => !prev);
                }}
                onKeyDown={(e) => {
                    if (disabled) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setOpen(prev => !prev);
                    }
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        setOpen(false);
                    }
                }}
            >
                <span className={selected ? s.selectorFieldValue : s.selectorFieldPlaceholder}>
                    {selected ? selected.label : placeholder}
                </span>
            </div>
            {open && createPortal(
                <div
                    ref={popRef}
                    className={`${s.popover} ${placement === 'top' ? s.popoverTop : ''}`}
                    data-selector-popover="true"
                    style={{
                        top: pos.top ?? 'auto',
                        bottom: pos.bottom ?? 'auto',
                        left: pos.left,
                        width: pos.width,
                        maxHeight: pos.maxHeight,
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                >
                    <div className={s.popoverList}>
                        {(options || []).map(opt => (
                            <button
                                key={opt.value}
                                className={s.selectorItem}
                                onClick={() => handlePick(opt)}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
