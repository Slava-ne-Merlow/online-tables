import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import s from '../../../styles/Grid.module.css';
import { getSelectorOptions } from '../../../api/client';

export default function SelectorTd({ cell, col, editable, onCommit, tdProps, pageId }) {
    const tdRef = useRef(null);
    const popRef = useRef(null);
    const resizeObsRef = useRef(null);

    const [open, setOpen] = useState(false);
    const [opts, setOpts] = useState(null);

    const [pos, setPos] = useState({ top: 0, left: 0, width: 0, maxHeight: 240 });
    const [placement, setPlacement] = useState('bottom'); // 'bottom' | 'top'

    const lastPickedLabelRef = useRef(null);
    const columnId = col?.id;

    const initialLabel = cell?.value?.label || '';


    useEffect(() => {
        if (tdRef.current && tdRef.current.textContent !== initialLabel) {
            tdRef.current.textContent = initialLabel;
        }
    }, [initialLabel]);

    async function ensureOptions() {
        try {
            const list = await getSelectorOptions(pageId, columnId);
            setOpts(list || []);
        } catch {
            setOpts([]);
        }
    }

    function layoutPopover() {
        const el = tdRef.current;
        const pop = popRef.current;
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const margin = 8;

        const minWidth = Math.max(160, Math.round(rect.width));
        let left = Math.round(Math.min(Math.max(margin, rect.left), vw - margin - minWidth));

        let popH = 240;
        if (pop) {
            const prev = { vis: pop.style.visibility, disp: pop.style.display, mh: pop.style.maxHeight };
            pop.style.visibility = 'hidden';
            pop.style.display = 'block';
            pop.style.maxHeight = '';
            popH = pop.offsetHeight || popH;
            pop.style.visibility = prev.vis;
            pop.style.display = prev.disp;
            pop.style.maxHeight = prev.mh;
        }

        const bottomY = Math.round(rect.bottom + 4);
        const spaceBottom = vh - bottomY - margin;
        const spaceTop = Math.max(0, Math.round(rect.top) - margin);

        let place = 'bottom';
        let top = bottomY;
        let available = spaceBottom;

        if (popH > spaceBottom && spaceTop > spaceBottom) {
            place = 'top';
            available = spaceTop;
            top = Math.round(rect.top - 4);
        }

        const maxHeight = Math.max(120, Math.min(popH, available));
        setPos({ top, left, width: minWidth, maxHeight: Math.round(maxHeight) });
        setPlacement(place);
    }

    function scheduleLayout() {
        setTimeout(() => {
            requestAnimationFrame(() => {
                layoutPopover();
                requestAnimationFrame(layoutPopover);
            });
        }, 0);
    }

    function onFocus() {
        if (!editable) return;
        setOpen(true);
        ensureOptions();
        scheduleLayout();
    }

    function onBlur() {
        const finalText = lastPickedLabelRef.current != null ? lastPickedLabelRef.current : initialLabel;
        if (tdRef.current) tdRef.current.textContent = finalText;
        lastPickedLabelRef.current = null;
        setTimeout(() => setOpen(false), 0);
    }

    function pick(optionOrNull) {
        setOpen(false);
        const isClear = !optionOrNull;
        const nextLabel = isClear ? '' : (optionOrNull.label || '');
        lastPickedLabelRef.current = nextLabel;
        if (tdRef.current) tdRef.current.textContent = nextLabel;

        onCommit({
            dataType: 'SELECTOR',
            value: isClear ? null : optionOrNull.id,
            optionMeta: optionOrNull || null,
        });
    }

    useEffect(() => {
        if (!open) return;
        const h = () => layoutPopover();
        window.addEventListener('scroll', h, true);
        window.addEventListener('resize', h);
        return () => {
            window.removeEventListener('scroll', h, true);
            window.removeEventListener('resize', h);
        };
    }, [open]);

    useEffect(() => {
        if (open) scheduleLayout();
    }, [open, opts]);

    useEffect(() => {
        if (!open || !popRef.current) return;
        const ro = new ResizeObserver(() => layoutPopover());
        ro.observe(popRef.current);
        resizeObsRef.current = ro;
        return () => {
            resizeObsRef.current?.disconnect();
            resizeObsRef.current = null;
        };
    }, [open]);

    return (
        <>
            <td
                {...tdProps}
                className={`${s.td} ${editable ? s.tdEditable : s.tdReadonly}`}
                contentEditable={!!editable}
                suppressContentEditableWarning
                ref={tdRef}
                onFocus={onFocus}
                onBlur={onBlur}
            />
            {open && createPortal(
                <div
                    ref={popRef}
                    className={`${s.popover} ${placement === 'top' ? s.popoverTop : ''}`}
                    style={{ top: pos.top, left: pos.left, minWidth: pos.width, maxHeight: pos.maxHeight }}
                    onMouseDown={(e)=>e.preventDefault()}
                >
                    <div className={s.popoverList} style={{ maxHeight: pos.maxHeight }}>
                        {/* пустая опция — без текста, кликабельная зона */}
                        <button
                            className={`${s.popoverItem} ${s.popoverItemEmpty}`}
                            aria-label="Пусто"
                            onClick={() => pick(null)}
                        />
                        {(opts || []).map(o => (
                            <button
                                key={o.id}
                                className={s.popoverItem}
                                onClick={() => pick(o)}
                            >
                                {o.label}
                            </button>
                        ))}
                        {(!opts) && (
                            <div className={s.popoverEmpty}>Нет доступных значений</div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
