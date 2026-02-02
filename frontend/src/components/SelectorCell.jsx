import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import styles from '../styles/Modal.module.css';
import grid from '../styles/Grid.module.css';
import s from "../styles/Grid.module.css";

export default function SelectorCell({
                                         value,
                                         options,
                                         placeholder = 'Выберите значение',
                                         onChange,
                                         noWrap = false,
                                         colType
                                     }) {
    const cellRef = useRef(null);
    const popRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({top: 0, bottom: null, left: 0, width: 0, maxHeight: 240});
    const [placement, setPlacement] = useState('bottom');

    const opts = options || [];
    const selected = opts.find(opt => opt.value === value) || null;

    useEffect(() => {
        if (!open) return;
        const handleDown = (e) => {
            if (!cellRef.current || !popRef.current) return;
            if (cellRef.current.contains(e.target) || popRef.current.contains(e.target)) return;
            setOpen(false);
        };
        const handleReflow = () => layoutPopover();
        document.addEventListener('mousedown', handleDown);
        window.addEventListener('scroll', handleReflow, true);
        window.addEventListener('resize', handleReflow);
        return () => {
            document.removeEventListener('mousedown', handleDown);
            window.removeEventListener('scroll', handleReflow, true);
            window.removeEventListener('resize', handleReflow);
        };
    }, [open]);

    useEffect(() => {
        if (open) {
            requestAnimationFrame(() => {
                layoutPopover();
                requestAnimationFrame(layoutPopover);
            });
        }
    }, [open, opts.length]);

    function layoutPopover() {
        const el = cellRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const margin = 8;
        const spaceBelow = window.innerHeight - rect.bottom - margin;
        const spaceAbove = rect.top - margin;
        const shouldOpenTop = spaceBelow < 200 && spaceAbove > spaceBelow;
        const minWidth = Math.max(160, Math.round(rect.width));
        const maxHeight = shouldOpenTop
            ? Math.max(0, spaceAbove - 4)
            : Math.max(120, spaceBelow - 4);
        const top = shouldOpenTop ? Math.max(margin, Math.round(rect.top - 4)) : Math.round(rect.bottom + 4);
        setPlacement(shouldOpenTop ? 'top' : 'bottom');
        setPos({top, bottom: null, left: Math.round(rect.left), width: minWidth, maxHeight});
    }

    function handlePick(opt) {
        onChange?.(opt.value);
        setOpen(false);
    }

    if (!opts.length) {
        return <td className={`${styles.selectorCellTd} ${noWrap ? styles.selectorCellTdNoWrap : ''}`} ref={cellRef}/>;
    }

    if (opts.length === 1) {
        return (
            <td className={`${styles.selectorCellTd} ${noWrap ? styles.selectorCellTdNoWrap : ''}`} ref={cellRef}>
                {opts[0].label}
            </td>
        );
    }

    return (
        <>
            <td
                className={`${styles.selectorCellTd} ${noWrap ? styles.selectorCellTdNoWrap : ''}`}
                ref={cellRef}
                onClick={() => setOpen(prev => !prev)}
            >
                <div className={s.mergeCellReadonly}>

                    {colType === "NUMBER" || !selected ? (
                        <span
                            className={selected ? styles.selectorCellValue : styles.selectorCellPlaceholder}
                        >
                         {selected ? selected.label : placeholder}
                    </span>
                    ) : (
                        selected ? selected.label : placeholder
                    )}
                </div>
            </td>
            {open && createPortal(
                <div
                    ref={popRef}
                    className={`${grid.popover} ${placement === 'top' ? grid.popoverTop : ''}`}
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
                    <div className={grid.popoverList}>
                        {opts.map(opt => (
                            <button
                                key={opt.value}
                                className={grid.selectorItem}
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
