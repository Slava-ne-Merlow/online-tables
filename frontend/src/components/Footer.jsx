import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import css from '../styles/Footer.module.css';
import m from '../styles/Modal.module.css';
import s from '../styles/Grid.module.css';
import burgerSvg from '../assets/icons/burger-menu.svg';
import plusSvg from '../assets/icons/plus.svg';
import RArrow from '../assets/icons/more.svg';


export default function Footer({
    pages,
    activePageId,
    onBurger,
    onSelect,
    onAddPage,
    onRenamePage,
    onDeletePage,
    onToggleArchive,
    canManagePages = true,
    canAddPage = true,
    canDeletePage = false,
    canManagePage,
}) {
    const footerRef = useRef(null);
    const scrollerRef = useRef(null);
    const menuRef = useRef(null);
    const editRef = useRef(null);
    const [showArrows, setShowArrows] = useState(false);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [ctxMenu, setCtxMenu] = useState(null);
    const [ctxMenuPos, setCtxMenuPos] = useState({ top: 0, left: 0 });
    const [confirm, setConfirm] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const editValueRef = useRef('');

    function updateScrollState() {
        const el = scrollerRef.current;
        if (!el) return;
        const hasOverflow = el.scrollWidth > el.clientWidth + 1;
        setShowArrows(hasOverflow);
        setCanScrollLeft(el.scrollLeft > 0);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    }

    useEffect(() => {
        updateScrollState();
    }, [pages]);

    useEffect(() => {
        const el = scrollerRef.current;
        if (!el) return;
        const onScroll = () => updateScrollState();
        window.addEventListener('resize', updateScrollState);
        el.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            window.removeEventListener('resize', updateScrollState);
            el.removeEventListener('scroll', onScroll);
        };
    }, []);

    useEffect(() => {
        if (!ctxMenu) return;
        const panel = menuRef.current;
        const footer = footerRef.current;
        if (panel && footer) {
            const margin = 8;
            const footerRect = footer.getBoundingClientRect();
            const layout = () => {
                const panelRect = panel.getBoundingClientRect();
                const top = Math.max(margin, footerRect.top - panelRect.height - margin);
                const anchorLeft = ctxMenu.anchorRect?.left;
                const rawLeft = anchorLeft != null ? anchorLeft : (ctxMenu.x - panelRect.width / 2);
                const left = Math.min(
                    window.innerWidth - margin - panelRect.width,
                    Math.max(margin, rawLeft)
                );
                setCtxMenuPos({ top, left });
            };
            requestAnimationFrame(() => {
                layout();
            });
        }
        const onDocDown = (e) => {
            if (!menuRef.current) return;
            if (!menuRef.current.contains(e.target)) setCtxMenu(null);
        };
        const onKey = (e) => { if (e.key === 'Escape') setCtxMenu(null); };
        const onResize = () => {
            if (!menuRef.current || !footerRef.current) return;
            const margin = 8;
            const footerRect = footerRef.current.getBoundingClientRect();
            const panelRect = menuRef.current.getBoundingClientRect();
            const top = Math.max(margin, footerRect.top - panelRect.height - margin);
            const anchorLeft = ctxMenu.anchorRect?.left;
            const rawLeft = anchorLeft != null ? anchorLeft : (ctxMenu.x - panelRect.width / 2);
            const left = Math.min(
                window.innerWidth - margin - panelRect.width,
                Math.max(margin, rawLeft)
            );
            setCtxMenuPos({ top, left });
        };
        window.addEventListener('keydown', onKey);
        window.addEventListener('resize', onResize);
        document.addEventListener('mousedown', onDocDown);
        return () => {
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('resize', onResize);
            document.removeEventListener('mousedown', onDocDown);
        };
    }, [ctxMenu]);

    useEffect(() => {
        if (editingId && editRef.current) {
            const el = editRef.current;
            el.focus();
            const range = document.createRange();
            range.selectNodeContents(el);
            const sel = window.getSelection();
            if (sel) {
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    }, [editingId]);

    function handleContextMenu(e, page) {
        const allowed = typeof canManagePage === 'function' ? canManagePage(page) : canManagePages;
        if (!allowed) return;
        e.preventDefault();
        const rect = e.currentTarget?.getBoundingClientRect?.();
        const footerRect = footerRef.current?.getBoundingClientRect?.();
        if (rect && footerRect) {
            const margin = 8;
            const top = Math.max(margin, footerRect.top - margin);
            const left = Math.min(
                window.innerWidth - margin - 180,
                Math.max(margin, rect.left)
            );
            setCtxMenuPos({ top, left });
        }
        setCtxMenu({ x: e.clientX, y: e.clientY, page, anchorRect: rect || null });
    }

    function openMenuFromButton(e, page, anchorEl) {
        e.preventDefault();
        e.stopPropagation();
        const allowed = typeof canManagePage === 'function' ? canManagePage(page) : canManagePages;
        if (!allowed) return;
        if (ctxMenu?.page?.id === page.id) {
            setCtxMenu(null);
            return;
        }
        const rect = anchorEl?.getBoundingClientRect?.() || e.currentTarget.getBoundingClientRect();
        const footerRect = footerRef.current?.getBoundingClientRect?.();
        if (footerRect) {
            const margin = 8;
            const top = Math.max(margin, footerRect.top - margin);
            const left = Math.min(
                window.innerWidth - margin - 180,
                Math.max(margin, rect.left)
            );
            setCtxMenuPos({ top, left });
        }
        setCtxMenu({
            x: rect.left + rect.width / 2,
            y: rect.top,
            page,
            anchorRect: rect,
        });
    }

    function startRename(page) {
        setCtxMenu(null);
        setEditingId(page.id);
        editValueRef.current = page.name || '';
    }

    function cancelRename() {
        setEditingId(null);
        editValueRef.current = '';
    }

    async function commitRename(page) {
        const nextName = editValueRef.current.trim();
        setEditingId(null);
        editValueRef.current = '';
        if (!nextName || nextName === (page.name || '')) return;
        await onRenamePage?.(page.id, nextName);
    }

    function askDelete(page) {
        setCtxMenu(null);
        setConfirm({
            text: `Удалить страницу «${page.name}»?`,
            page,
        });
    }

    function doDelete() {
        if (!confirm?.page) return;
        onDeletePage?.(confirm.page.id);
        setConfirm(null);
    }

    function scrollBy(dir) {
        const el = scrollerRef.current;
        if (!el) return;
        const amount = Math.max(160, Math.round(el.clientWidth * 0.6));
        el.scrollBy({ left: dir * amount, behavior: 'smooth' });
    }

    async function handleAddWithScroll() {
        await onAddPage?.();
        requestAnimationFrame(() => {
            const el = scrollerRef.current;
            if (el) el.scrollLeft = el.scrollWidth;
        });
    }

    return (
        <footer ref={footerRef} className={css.footer}>
            <div className={css.tubCardFirst}>
                <button id="btn-burger" className={css.burger} title="Страницы" onClick={onBurger}>
                    <img className={css.icon} src={burgerSvg} alt="Страницы"/>
                </button>
            </div>

            <div className={css.tabsWrap}>
                <div
                    ref={scrollerRef}
                    className={`${css.tabsScroller} ${showArrows && canAddPage ? css.tabsScrollerPadded : ''} ${ showArrows && !canAddPage ? css.tabsScrollerPaddedLess : ''}`.trim()}
                >
                    {(pages || []).map(p => (
                        <div
                            key={p.id}
                            className={`${css.tabCard} ${activePageId === p.id ? css.tabCardActive : ''}`}
                            onContextMenu={(e) => handleContextMenu(e, p)}
                            onClick={() => {
                                if (editingId) return;
                                onSelect(p);
                            }}
                        >
                            <button
                                className={`${css.tab} ${activePageId === p.id ? css.tabActive : ''} ${editingId === p.id ? css.tabEditing : ''}`}
                                onClick={() => {
                                    if (editingId) return;
                                    onSelect(p);
                                }}
                            >
                                {editingId === p.id ? (
                                    <span
                                        ref={editRef}
                                        className={css.tabEdit}
                                        contentEditable
                                        suppressContentEditableWarning
                                        onInput={(e) => {
                                            editValueRef.current = e.currentTarget.textContent || '';
                                        }}
                                        onBlur={() => commitRename(p)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                e.currentTarget.blur();
                                            }
                                            if (e.key === 'Escape') {
                                                e.preventDefault();
                                                cancelRename();
                                            }
                                        }}
                                    >
                                        {p.name}
                                    </span>
                                ) : (
                                    p.name
                                )}
                            </button>
                            {((typeof canManagePage === 'function' ? canManagePage(p) : canManagePages)) && (
                                <button
                                    type="button"
                                    className={`${css.tabMenuBtn} ${ctxMenu?.page?.id === p.id ? css.tabMenuBtnActive : ''}`}
                                    onMouseDown={(e) => openMenuFromButton(e, p, e.currentTarget.closest(`.${css.tabCard}`))}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }}
                                    aria-label="Меню страницы"
                                >
                                    <img className={`${css.iconThin} ${css.tabMenuIcon}`} src={RArrow} alt="" />
                                </button>
                            )}
                        </div>
                    ))}
                    {!showArrows && canAddPage && (
                        <div className={css.tabCard2}>
                            <button
                                type="button"
                                className={css.burger}
                                onClick={() => onAddPage?.()}
                                aria-label="Добавить страницу"
                            >
                                <img className={css.iconThin} src={plusSvg} alt="Страницы"/>


                            </button>
                        </div>
                    )}
                </div>
                {showArrows && (
                    <div className={css.footerControls}>
                        {canAddPage && (
                            <button
                                type="button"
                                className={css.burger}
                                onClick={handleAddWithScroll}
                                aria-label="Добавить страницу"
                            >
                                <img className={css.iconThin} src={plusSvg} alt="Страницы"/>
                            </button>
                        )}
                        <button
                            type="button"
                            className={css.burger}
                            onClick={() => scrollBy(-1)}
                            disabled={!canScrollLeft}
                            aria-label="Прокрутить влево"
                        >
                            <img className={`${css.iconThin} ${css.iconFlip}`} src={RArrow} alt="Страницы"/>

                        </button>
                        <button
                            type="button"
                            className={css.burger}
                            onClick={() => scrollBy(1)}
                            disabled={!canScrollRight}
                            aria-label="Прокрутить вправо"
                        >
                            <img className={css.iconThin} src={RArrow} alt="Страницы"/>

                        </button>
                    </div>
                )}
            </div>

            {ctxMenu && createPortal(
                <div
                    ref={menuRef}
                    className={`${css.ctxMenu} ${s.filterPanel} ${m['anim-slide-up-in']}`}
                    style={{ top: ctxMenuPos.top, left: ctxMenuPos.left }}
                    key={ctxMenu?.page?.id || 'menu'}
                    data-anchor={ctxMenu?.page?.id || 'menu'}
                >
                    <button className={s.ctxItem} onClick={() => startRename(ctxMenu.page)}>
                        Переименовать
                    </button>
                    <button
                        className={s.ctxItem}
                        onClick={() => {
                            onToggleArchive?.(ctxMenu.page);
                            setCtxMenu(null);
                        }}
                    >
                        {ctxMenu.page?.isArchived ? 'Разархивировать' : 'Архивировать'}
                    </button>
                    {canDeletePage && (
                        <button className={s.ctxItemDanger} onClick={() => askDelete(ctxMenu.page)}>
                            Удалить
                        </button>
                    )}
                </div>,
                document.body
            )}

            {confirm && createPortal(
                <div className={m.backdrop} onClick={() => setConfirm(null)}>
                    <div className={m.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={m.title}>Подтверждение</div>
                        <div>{confirm.text}</div>
                        <div className={m.actions}>
                            <button
                                className={`${m.btn} ${m.btnGhost}`}
                                onClick={() => setConfirm(null)}
                            >
                                Отмена
                            </button>
                            <button className={m.btn} onClick={doDelete}>
                                Да, удалить
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </footer>
    );
}
