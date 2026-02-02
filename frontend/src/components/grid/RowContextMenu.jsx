import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import s from '../../styles/Grid.module.css';
import m from '../../styles/Modal.module.css';

/**
 * Контекстное меню по ПКМ по строкам (ячейкам).
 * menu: { x, y, side, leftRowId, rightRowId, rightsCount } | null
 */
export default function RowContextMenu({
                                           menu,
                                           canWriteLeft,
                                           canWriteRight,
                                           onAddRow,
                                           onAddRight,
                                           onDeleteLeft,
                                           onDeleteRight,
                                           onClose,
                                       }) {
    const menuRef = useRef(null);

    useEffect(() => {
        if (!menu) return;

        const el = menuRef.current;
        if (!el) return;
        const margin = 8;

        function layout() {
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const rect = el.getBoundingClientRect();

            let left = menu.x;
            let top = menu.y;

            if (left + rect.width + margin > vw) {
                left = Math.max(margin, vw - rect.width - margin);
            }
            if (top + rect.height + margin > vh) {
                top = Math.max(margin, vh - rect.height - margin);
            }
            left = Math.max(margin, left);
            top = Math.max(margin, top);

            el.style.left = `${left}px`;
            el.style.top = `${top}px`;
            el.style.maxHeight = `${vh - margin * 2}px`;
        }

        requestAnimationFrame(() => {
            layout();
            requestAnimationFrame(layout);
        });

        const onDocDown = (e) => {
            if (!menuRef.current) return;
            if (!menuRef.current.contains(e.target)) onClose();
        };
        document.addEventListener('mousedown', onDocDown);

        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);

        const onScroll = () => onClose();
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', onScroll);

        return () => {
            document.removeEventListener('mousedown', onDocDown);
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('resize', onScroll);
        };
    }, [menu, onClose]);

    if (!menu) return null;

    return createPortal(
        <div ref={menuRef} className={`${s.ctxMenu} ${m['anim-slide-up-in']}`}>
            <div className={m.list}>
                {canWriteLeft && (
                    <button className={s.ctxItem} onClick={onAddRow}>
                        <span className={s.iconPlus} aria-hidden="true" />
                        Добавить строку (левая + правая)
                    </button>
                )}

                {canWriteRight && (
                    <button className={s.ctxItem} onClick={() => onAddRight(menu.leftRowId)}>
                        <span className={s.iconPlus} aria-hidden="true" />
                        Добавить правую строку
                    </button>
                )}

                {menu.side === 'RIGHT' && menu.rightsCount > 1 && canWriteRight && (
                    <button
                        className={s.ctxItemDanger}
                        onClick={() => onDeleteRight(menu.rightRowId)}
                    >
                        <span className={s.iconDelete} aria-hidden="true" />
                        Удалить только правую строку
                    </button>
                )}

                {canWriteLeft && (
                    <button
                        className={s.ctxItemDanger}
                        onClick={() => onDeleteLeft(menu.leftRowId)}
                    >
                        <span className={s.iconDelete} aria-hidden="true" />
                        Удалить левую + все правые
                    </button>
                )}
            </div>

            {(!canWriteLeft && !canWriteRight) && (
                <div className={s.ctxHint}>Нет доступных действий</div>
            )}
        </div>,
        document.body
    );
}