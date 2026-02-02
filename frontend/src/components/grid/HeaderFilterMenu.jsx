import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import s from '../../styles/Grid.module.css';
import m from '../../styles/Modal.module.css';
import AddColumnPanel from './AddColumnPanel';
import {
    addSelectorOption,
    deleteSelectorOption,
    getSelectorOptions,
    updateSelectorOptionsOrder,
    updateSelectorOption,
} from '../../api/client';

const EMPTY_TOKEN = '__EMPTY__';

export default function HeaderFilterMenu({
                                             menu,
                                             pageId,
                                             currentFilter,
                                             onApply,
                                             onSortChange,
                                             onRenameColumn,
                                             onAddColumn,
                                             onDeleteColumn,
                                             onReload,
                                             onClose,
                                             canManage = true,
                                         }) {
    const ref = useRef(null);
    const isAddOnly = menu?.mode === 'ADD_COLUMN';
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(() => new Set());
    const [showFilterPopup, setShowFilterPopup] = useState(false);
    const hideTimerRef = useRef(null);
    const selectorHideTimerRef = useRef(null);
    const [openLeft, setOpenLeft] = useState(false); // подпопап влево/вправо
    const subRef = useRef(null);
    const selectorSubRef = useRef(null);
    const [showSelectorPopup, setShowSelectorPopup] = useState(false);
    const [openLeftSelector, setOpenLeftSelector] = useState(false);
    const [selectorOptions, setSelectorOptions] = useState([]);
    const selectorOptionsRef = useRef([]);
    const [selectorLoading, setSelectorLoading] = useState(false);
    const [selectorError, setSelectorError] = useState('');
    const [newSelectorLabel, setNewSelectorLabel] = useState('');
    const [selectorLoadedFor, setSelectorLoadedFor] = useState(null);
    const selectorUpdateTimers = useRef({});
    const [showAddPopup, setShowAddPopup] = useState(false);
    const addHideTimerRef = useRef(null);
    const addSubRef = useRef(null);
    const [openLeftAdd, setOpenLeftAdd] = useState(false);
    const [addPosition, setAddPosition] = useState(null);
    const [addName, setAddName] = useState('');
    const [addType, setAddType] = useState('TEXT');
    const [addOptions, setAddOptions] = useState([]);
    const [adding, setAdding] = useState(false);
    const addHoldRef = useRef(false);
    const [addError, setAddError] = useState('');
    const [addSide, setAddSide] = useState('LEFT');
    const allowSideSelect = !!menu?.allowSideSelect;
    const columnTypeOptions = [
        { value: 'TEXT', label: 'Текст' },
        { value: 'NUMBER', label: 'Число' },
        { value: 'DATE', label: 'Дата' },
        { value: 'SELECTOR', label: 'Селектор' },
        { value: 'FILE', label: 'Файл' },
    ];
    const sideOptions = [
        { value: 'LEFT', label: 'Левая часть' },
        { value: 'RIGHT', label: 'Правая часть' },
    ];

    useEffect(() => {
        if (!menu) return;

        if (menu.mode === 'ADD_COLUMN') {
            setSelected(new Set());
            setSearch('');
            setShowFilterPopup(false);
            setShowAddPopup(false);
            const allowLeft = menu.allowedSides?.left ?? true;
            // const allowRight = menu.allowedSides?.right ?? true;
            const initialSide = menu.side
                ? (menu.side === 'RIGHT' ? 'RIGHT' : 'LEFT')
                : (allowLeft ? 'LEFT' : 'RIGHT');
            const leftPos = menu.sideMeta?.leftAddPosition ?? 1;
            const rightPos = menu.sideMeta?.rightAddPosition ?? 1;
            const initialPos = initialSide === 'RIGHT' ? rightPos : leftPos;
            setAddSide(initialSide);
            setAddPosition(initialPos);
            setAddName('');
            setAddType('TEXT');
            setAddOptions([]);
            setAddError('');
            return;
        }

        const allTokensLocal = menu.allTokens || menu.options.map(o => o.token);
        const initial = new Set(
            currentFilter && Array.isArray(currentFilter.values) && currentFilter.values.length
                ? currentFilter.values
                : allTokensLocal
        );
        setSelected(initial);
        setSearch('');
        setShowFilterPopup(false);
        setShowAddPopup(false);
        setShowSelectorPopup(false);
        setAddPosition(null);
        setAddName('');
        setAddType('TEXT');
        setAddOptions([]);
        setAddError('');
        setSelectorOptions([]);
        setSelectorError('');
        setNewSelectorLabel('');
        setSelectorLoadedFor(null);
    }, [menu, currentFilter]);

    useEffect(() => {
        return () => {
            const timers = selectorUpdateTimers.current || {};
            Object.values(timers).forEach((t) => clearTimeout(t));
            selectorUpdateTimers.current = {};
        };
    }, []);

    useEffect(() => {
        if (!menu) return;
        const el = ref.current;
        if (!el) return;
        const margin = 8;

        function layout() {
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const rect = el.getBoundingClientRect();

            const anchorBottom = menu.anchorRect ? menu.anchorRect.bottom : null;
            let left = menu.anchorRect ? menu.anchorRect.left : menu.x;
            let top = menu.anchorRect ? menu.anchorRect.bottom + margin : menu.y;

            if (left + rect.width + margin > vw) {
                left = Math.max(margin, vw - rect.width - margin);
            }
            left = Math.max(margin, left);
            const minTop = anchorBottom !== null ? anchorBottom + margin : margin;
            top = Math.max(minTop, top);

            el.style.left = `${left}px`;
            el.style.top = `${top}px`;
            const maxHeight = Math.max(120, vh - top - margin);
            el.style.maxHeight = `${maxHeight}px`;

            // прикидываем, хватит ли справа места для подпопапа
            const rect2 = el.getBoundingClientRect();
            const approxSubWidth = 320;
            const needOpenLeft = rect2.right + approxSubWidth + margin > vw;
            setOpenLeft(needOpenLeft);
        }

        requestAnimationFrame(() => {
            layout();
            requestAnimationFrame(layout);
        });

        const onDocDown = (e) => {
            if (!ref.current) return;
            const target = e.target;
            if (target && target.closest && target.closest('[data-selector-popover="true"]')) return;
            if (!ref.current.contains(target)) onClose();
        };
        document.addEventListener('mousedown', onDocDown);

        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);

        // не закрываем при скролле внутри панели
        const onScroll = (e) => {
            if (ref.current && ref.current.contains(e.target)) {
                return;
            }
            onClose();
        };
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', onScroll);

        return () => {
            document.removeEventListener('mousedown', onDocDown);
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('resize', onScroll);
        };
    }, [menu, onClose]);

    useEffect(() => {
        if (!menu || !showFilterPopup) return;
        const panel = ref.current;
        const sub = subRef.current;
        if (!panel || !sub) return;
        const margin = 8;

        const updateSubPlacement = () => {
            const vw = window.innerWidth;
            const panelRect = panel.getBoundingClientRect();
            const subWidth = sub.offsetWidth || sub.getBoundingClientRect().width;
            const spaceRight = vw - panelRect.right - margin;
            const spaceLeft = panelRect.left - margin;
            let nextOpenLeft = false;
            if (subWidth <= spaceRight) nextOpenLeft = false;
            else if (subWidth <= spaceLeft) nextOpenLeft = true;
            else nextOpenLeft = spaceLeft > spaceRight;

            setOpenLeft(nextOpenLeft);
        };

        requestAnimationFrame(() => {
            updateSubPlacement();
            requestAnimationFrame(updateSubPlacement);
        });

        window.addEventListener('resize', updateSubPlacement);
        return () => {
            window.removeEventListener('resize', updateSubPlacement);
        };
    }, [menu, showFilterPopup]);

    useEffect(() => {
        if (!menu || !showSelectorPopup) return;
        const panel = ref.current;
        const sub = selectorSubRef.current;
        if (!panel || !sub) return;
        const margin = 8;

        const updateSubPlacement = () => {
            const vw = window.innerWidth;
            const panelRect = panel.getBoundingClientRect();
            const subWidth = sub.offsetWidth || sub.getBoundingClientRect().width;
            const spaceRight = vw - panelRect.right - margin;
            const spaceLeft = panelRect.left - margin;
            let nextOpenLeft = false;
            if (subWidth <= spaceRight) nextOpenLeft = false;
            else if (subWidth <= spaceLeft) nextOpenLeft = true;
            else nextOpenLeft = spaceLeft > spaceRight;
            setOpenLeftSelector(nextOpenLeft);
        };

        requestAnimationFrame(() => {
            updateSubPlacement();
            requestAnimationFrame(updateSubPlacement);
        });

        window.addEventListener('resize', updateSubPlacement);
        return () => {
            window.removeEventListener('resize', updateSubPlacement);
        };
    }, [menu, showSelectorPopup]);

    useEffect(() => {
        selectorOptionsRef.current = selectorOptions;
    }, [selectorOptions]);

    useEffect(() => {
        if (!menu || !showAddPopup) return;
        const panel = ref.current;
        const sub = addSubRef.current;
        if (!panel || !sub) return;
        const margin = 8;

        const updateSubPlacement = () => {
            const vw = window.innerWidth;
            const panelRect = panel.getBoundingClientRect();
            const subWidth = sub.offsetWidth || sub.getBoundingClientRect().width;
            const spaceRight = vw - panelRect.right - margin;
            const spaceLeft = panelRect.left - margin;

            let nextOpenLeft = false;
            if (subWidth <= spaceRight) nextOpenLeft = false;
            else if (subWidth <= spaceLeft) nextOpenLeft = true;
            else nextOpenLeft = spaceLeft > spaceRight;

            setOpenLeftAdd(nextOpenLeft);
        };

        requestAnimationFrame(() => {
            updateSubPlacement();
            requestAnimationFrame(updateSubPlacement);
        });

        window.addEventListener('resize', updateSubPlacement);
        return () => {
            window.removeEventListener('resize', updateSubPlacement);
        };
    }, [menu, showAddPopup]);

    useEffect(() => {
        if (!isAddOnly || !menu) return;
        const leftPos = menu.sideMeta?.leftAddPosition ?? 1;
        const rightPos = menu.sideMeta?.rightAddPosition ?? 1;
        const nextPos = addSide === 'RIGHT' ? rightPos : leftPos;
        setAddPosition(nextPos);
    }, [isAddOnly, menu, addSide]);

    const allTokens = useMemo(
        () => (menu && !isAddOnly ? (menu.allTokens || menu.options.map(o => o.token)) : []),
        [menu, isAddOnly]
    );

    const filteredOptions = useMemo(() => {
        if (!menu || isAddOnly) return [];
        const term = search.trim().toLowerCase();
        if (!term) return menu.options;
        return menu.options.filter(o =>
            (o.label || '').toLowerCase().includes(term)
        );
    }, [menu, search, isAddOnly]);

    if (!menu) return null;

    const isSelector = !isAddOnly && menu?.column
        ? String(menu.column.type).toUpperCase() === 'SELECTOR'
        : false;
    const isFile = !isAddOnly && menu?.column
        ? String(menu.column.type).toUpperCase() === 'FILE'
        : false;

    function toggleToken(token) {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(token)) next.delete(token);
            else next.add(token);
            return next;
        });
    }

    function handleToggleAll() {
        const allSelected = selected.size === allTokens.length;
        setSelected(new Set(allSelected ? [] : allTokens));
    }

    function handleApplyClick() {
        const selArr = Array.from(selected);
        onApply(selArr, allTokens);
        onClose();
    }

    // Сброс — считаем, что выбраны все значения ⇒ фильтр очищается
    function handleResetClick() {
        onApply(allTokens, allTokens);
        onClose();
    }

    function handleSort(dir) {
        if (!onSortChange) return;
        onSortChange(menu.side, menu.column.key, dir);
        onClose();
    }

    function cancelHideTimer() {
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
        }
    }

    function scheduleHide() {
        cancelHideTimer();
        hideTimerRef.current = setTimeout(() => {
            setShowFilterPopup(false);
        }, 150);
    }

    function cancelSelectorHideTimer() {
        if (selectorHideTimerRef.current) {
            clearTimeout(selectorHideTimerRef.current);
            selectorHideTimerRef.current = null;
        }
    }

    function scheduleSelectorHide() {
        cancelSelectorHideTimer();
        selectorHideTimerRef.current = setTimeout(() => {
            setShowSelectorPopup(false);
        }, 150);
    }

    function cancelAddHideTimer() {
        if (addHideTimerRef.current) {
            clearTimeout(addHideTimerRef.current);
            addHideTimerRef.current = null;
        }
    }

    function scheduleAddHide() {
        cancelAddHideTimer();
        if (addHoldRef.current) return;
        addHideTimerRef.current = setTimeout(() => {
            setShowAddPopup(false);
        }, 150);
    }

    async function openSelectorEditor() {
        if (!pageId || !menu?.column?.id) return;
        setShowSelectorPopup(true);
        if (selectorLoadedFor === menu.column.id) return;
        setSelectorError('');
        setSelectorLoading(true);
        try {
            const list = await getSelectorOptions(pageId, menu.column.id);
            const mapped = (list || []).map(opt => ({
                id: opt.id,
                label: opt.label || '',
                originalLabel: opt.label || '',
                saving: false,
            }));
            setSelectorOptions(mapped);
            setSelectorLoadedFor(menu.column.id);
        } catch (e) {
            console.error('Load selector options failed', e);
            setSelectorError('Не удалось загрузить опции.');
            setSelectorOptions([]);
        } finally {
            setSelectorLoading(false);
        }
    }



    async function handleAddSelectorOption() {
        if (!pageId || !menu?.column?.id) return;
        const label = newSelectorLabel.trim();
        if (!label) return;
        setSelectorLoading(true);
        try {
            const created = await addSelectorOption({
                pageId,
                columnId: menu.column.id,
                label,
            });
            setSelectorOptions(prev => [
                ...prev,
                {
                    id: created.id,
                    label: created.label || label,
                    originalLabel: created.label || label,
                    saving: false,
                }
            ]);
            setNewSelectorLabel('');
        } catch (e) {
            console.error('Add selector option failed', e);
            setSelectorError('Не удалось добавить опцию.');
        } finally {
            setSelectorLoading(false);
        }
    }

    function scheduleSelectorOptionUpdate(id, labelRaw) {
        const label = labelRaw.trim();
        setSelectorOptions(prev => prev.map(o => (
            o.id === id ? { ...o, label: labelRaw, saving: true } : o
        )));
        const timers = selectorUpdateTimers.current;
        if (timers[id]) {
            clearTimeout(timers[id]);
        }
        timers[id] = setTimeout(async () => {
            if (!pageId) return;
            try {
                await updateSelectorOption({
                    pageId,
                    optionId: id,
                    label,
                });
                setSelectorOptions(prev => prev.map(o => (
                    o.id === id ? { ...o, originalLabel: label, saving: false } : o
                )));
                await onReload?.();
            } catch (e) {
                console.error('Auto update selector option failed', e);
                setSelectorError('Не удалось сохранить опцию.');
                setSelectorOptions(prev => prev.map(o => o.id === id ? { ...o, saving: false } : o));
            }
        }, 400);
    }

    async function handleDeleteSelectorOption(opt) {
        if (!pageId || !opt?.id) return;
        setSelectorOptions(prev => prev.map(o => o.id === opt.id ? { ...o, saving: true } : o));
        try {
            await deleteSelectorOption({ pageId, optionId: opt.id });
            setSelectorOptions(prev => prev.filter(o => o.id !== opt.id));
            await onReload?.();
        } catch (e) {
            console.error('Delete selector option failed', e);
            setSelectorError('Не удалось удалить опцию.');
            setSelectorOptions(prev => prev.map(o => o.id === opt.id ? { ...o, saving: false } : o));
        }
    }

    async function moveSelectorOption(id, dir) {
        if (!pageId || !menu?.column?.id) return;
        const current = selectorOptionsRef.current || [];
        const idx = current.findIndex(opt => opt.id === id);
        if (idx === -1) return;
        const nextIdx = idx + dir;
        if (nextIdx < 0 || nextIdx >= current.length) return;
        const next = [...current];
        const [item] = next.splice(idx, 1);
        next.splice(nextIdx, 0, item);
        const nextOrder = next.map(opt => opt.id);
        setSelectorOptions(next);
        try {
            await updateSelectorOptionsOrder({
                pageId,
                columnId: menu.column.id,
                optionIds: nextOrder,
            });
        } catch (e) {
            console.error('Update selector order failed', e);
            setSelectorError('Не удалось сохранить порядок.');
        }
    }

    function handleStartAdd(position) {
        cancelAddHideTimer();
        setAddPosition(position);
        setShowAddPopup(true);
    }

    function nextOptionId() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function handleAddOption() {
        setAddOptions(prev => [...prev, { id: nextOptionId(), label: '' }]);
    }

    function handleOptionChange(id, value) {
        setAddOptions(prev => prev.map(opt => (opt.id === id ? { ...opt, label: value } : opt)));
    }

    function handleOptionRemove(id) {
        setAddOptions(prev => prev.filter(opt => opt.id !== id));
    }

    function hasDuplicateOptions(options) {
        const seen = new Set();
        for (const opt of options) {
            const key = opt.label.trim().toLowerCase();
            if (!key) continue;
            if (seen.has(key)) return true;
            seen.add(key);
        }
        return false;
    }

    async function handleAddColumnClick() {
        if (!onAddColumn || adding) return;
        const name = addName.trim();
        if (!name) return;
        if (addPosition == null) return;

        const type = String(addType || 'TEXT').toUpperCase();
        const cleanedOptions = addOptions
            .map(opt => ({ ...opt, label: opt.label.trim() }))
            .filter(opt => opt.label);
        if (type === 'SELECTOR' && hasDuplicateOptions(cleanedOptions)) {
            setAddError('Опции селектора должны быть уникальными.');
            return;
        }
        setAddError('');
        const payloadOptions =
            type === 'SELECTOR' && cleanedOptions.length
                ? cleanedOptions.map((opt, idx) => ({ label: opt.label, sortOrder: idx + 1 }))
                : undefined;

        setAdding(true);
        try {
            await onAddColumn({
                side: isAddOnly ? addSide : menu.side,
                position: addPosition,
                name,
                type,
                options: payloadOptions,
            });
            setShowAddPopup(false);
            setAddName('');
            setAddType('TEXT');
            setAddOptions([]);
            setAddError('');
            onClose();
        } catch (e) {
            console.error('Add column failed', e);
        } finally {
            setAdding(false);
        }
    }

    return createPortal(
        <div ref={ref} className={`${s.filterPanel} ${m['anim-slide-up-in']}`}>
            {!isAddOnly && canManage && (
                <div className={s.filterColumnActions}>
                    <button
                        type="button"
                        className={s.ctxItem}
                        onClick={() => {
                            onRenameColumn?.(menu.side, menu.column);
                            onClose();
                        }}
                    >
                        Переименовать
                    </button>
                    <button
                        type="button"
                        className={s.ctxItem}
                        onMouseEnter={() => {
                            const pos = Number(menu.column.position || 1);
                            handleStartAdd(pos);
                        }}
                        onMouseLeave={scheduleAddHide}
                    >
                        Добавить столбец слева
                    </button>
                    <button
                        type="button"
                        className={s.ctxItem}
                        onMouseEnter={() => {
                            const pos = Number(menu.column.position || 1) + 1;
                            handleStartAdd(pos);
                        }}
                        onMouseLeave={scheduleAddHide}
                    >
                        Добавить столбец справа
                    </button>
                    {isSelector && (
                        <button
                            type="button"
                            className={s.ctxItem}
                            onMouseEnter={() => {
                                cancelSelectorHideTimer();
                                openSelectorEditor();
                            }}
                            onMouseLeave={scheduleSelectorHide}
                        >
                            Изменить опции селектора
                        </button>
                    )}
                    <button
                        type="button"
                        className={s.ctxItemDanger}
                        onClick={() => onDeleteColumn?.(menu.side, menu.column)}
                    >
                        Удалить столбец
                    </button>

                    <div className={s.filterDivider} />

                    <button
                        type="button"
                        className={s.ctxItem}
                        onMouseEnter={() => {
                            cancelHideTimer();
                            setShowFilterPopup(true);
                        }}
                        onMouseLeave={scheduleHide}
                        style={{ justifyContent: 'space-between', paddingRight: '12px' }}
                    >
                        Добавить фильтр
                        <span
                            className={s.iconMore}
                            aria-hidden="true"
                        />
                    </button>
                </div>
            )}

            {!isAddOnly && !canManage && (
                <div className={s.filterColumnActions}>
                    <button
                        type="button"
                        className={s.ctxItem}
                        onMouseEnter={() => {
                            cancelHideTimer();
                            setShowFilterPopup(true);
                        }}
                        onMouseLeave={scheduleHide}
                        style={{ justifyContent: 'space-between', paddingRight: '12px' }}
                    >
                        Добавить фильтр
                        <span
                            className={s.iconMore}
                            aria-hidden="true"
                        />
                    </button>
                </div>
            )}

            {isAddOnly && (
                <AddColumnPanel
                    name={addName}
                    onNameChange={setAddName}
                    side={addSide}
                    showSideSelector={allowSideSelect}
                    sideOptions={sideOptions.filter(opt => {
                        if (opt.value === 'LEFT') return menu.allowedSides?.left ?? true;
                        if (opt.value === 'RIGHT') return menu.allowedSides?.right ?? true;
                        return true;
                    })}
                    onSideChange={setAddSide}
                    type={addType}
                    typeOptions={columnTypeOptions}
                    onTypeChange={setAddType}
                    onTypeOpenChange={(open) => {
                        addHoldRef.current = open;
                        if (open) cancelAddHideTimer();
                    }}
                    options={addOptions}
                    onOptionAdd={handleAddOption}
                    onOptionChange={handleOptionChange}
                    onOptionRemove={handleOptionRemove}
                    error={addError}
                    onSubmit={handleAddColumnClick}
                    submitDisabled={
                        adding ||
                        !addName.trim() ||
                        (String(addType).toUpperCase() === 'SELECTOR' &&
                            hasDuplicateOptions(
                                addOptions
                                    .map(opt => ({ ...opt, label: opt.label.trim() }))
                                    .filter(opt => opt.label)
                            ))
                    }
                />
            )}

            {showAddPopup && !isAddOnly && (
                <div
                    ref={addSubRef}
                    className={`${s.filterSubPanel} ${openLeftAdd ? s.filterSubPanelLeft : s.filterSubPanelRight} ${m['anim-slide-up-in']}`}
                    onMouseEnter={cancelAddHideTimer}
                    onMouseLeave={scheduleAddHide}
                >
                    <AddColumnPanel
                        name={addName}
                        onNameChange={setAddName}
                        type={addType}
                        typeOptions={columnTypeOptions}
                        onTypeChange={setAddType}
                        onTypeOpenChange={(open) => {
                            addHoldRef.current = open;
                            if (open) cancelAddHideTimer();
                        }}
                        options={addOptions}
                        onOptionAdd={handleAddOption}
                        onOptionChange={handleOptionChange}
                        onOptionRemove={handleOptionRemove}
                        error={addError}
                        onSubmit={handleAddColumnClick}
                        submitDisabled={
                            adding ||
                            !addName.trim() ||
                            (String(addType).toUpperCase() === 'SELECTOR' &&
                                hasDuplicateOptions(
                                    addOptions
                                        .map(opt => ({ ...opt, label: opt.label.trim() }))
                                        .filter(opt => opt.label)
                                ))
                        }
                    />
                </div>
            )}

            {showSelectorPopup && !isAddOnly && (
                <div
                    ref={selectorSubRef}
                    className={`${s.filterSubPanel} ${openLeftSelector ? s.filterSubPanelLeft : s.filterSubPanelRight} ${m['anim-slide-up-in']}`}
                    onMouseEnter={cancelSelectorHideTimer}
                    onMouseLeave={scheduleSelectorHide}
                >
                    {selectorError && (
                        <div className={s.addColumnError}>{selectorError}</div>
                    )}
                    {selectorLoading && (
                        <div className={s.ctxHint}>Загрузка...</div>
                    )}
                    {!selectorLoading && (
                        <div className={s.selectorOptions}>
                            <div className={s.selectorOptionRow}>
                                <input
                                    className={s.selectorField}
                                    placeholder="Название"
                                    value={newSelectorLabel}
                                    onChange={(e) => setNewSelectorLabel(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className={s.selectorOptionBtn}
                                    onClick={handleAddSelectorOption}
                                    disabled={!newSelectorLabel.trim()}
                                >
                                    +
                                </button>
                            </div>
                            {selectorOptions.map(opt => {
                                return (
                                    <div key={opt.id} className={s.selectorOptionRow}>
                                        <div className={s.selectorOrderGroup}>
                                            <button
                                                type="button"
                                                className={s.selectorOptionBtn}
                                                onClick={() => moveSelectorOption(opt.id, -1)}
                                                disabled={opt.saving}
                                                aria-label="Переместить вверх"
                                            >
                                                ↑
                                            </button>
                                            <button
                                                type="button"
                                                className={s.selectorOptionBtn}
                                                onClick={() => moveSelectorOption(opt.id, 1)}
                                                disabled={opt.saving}
                                                aria-label="Переместить вниз"
                                            >
                                                ↓
                                            </button>
                                        </div>
                                        <input
                                            className={s.selectorField}
                                            value={opt.label}
                                            onChange={(e) => scheduleSelectorOptionUpdate(opt.id, e.target.value)}
                                            placeholder="Название"
                                        />
                                        <button
                                            type="button"
                                            className={s.selectorOptionDanger}
                                            onClick={() => handleDeleteSelectorOption(opt)}
                                            disabled={opt.saving}
                                            aria-label="Удалить опцию"
                                        >
                                            ×
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {showFilterPopup && !isAddOnly && (
                <div
                    ref={subRef}
                    className={`${s.filterSubPanel} ${openLeft ? s.filterSubPanelLeft : s.filterSubPanelRight} ${m['anim-slide-up-in']}`}
                    onMouseEnter={cancelHideTimer}
                    onMouseLeave={scheduleHide}
                >
                    {/* сортировка только если не FILE */}
                    {!isFile && canManage && (
                        <div className={s.filterSortBlock}>
                            <button
                                type="button"
                                className={s.ctxItem}
                                onClick={() => handleSort('ASC')}
                            >
                                Сортировать по возрастанию
                            </button>
                            <button
                                type="button"
                                className={s.ctxItem}
                                onClick={() => handleSort('DESC')}
                            >
                                Сортировать по убыванию
                            </button>
                        </div>
                    )}

                    <div className={s.filterSearch}>
                        <input
                            className={s.filterSearchInput}
                            placeholder="Поиск значения"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    <div className={s.filterValuesBox}>
                        <div className={s.filterAllRow}>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={selected.size === allTokens.length}
                                    onChange={handleToggleAll}
                                />
                                <span>Все</span>
                            </label>
                            <span className={s.filterCount}>
                                {menu.options.reduce((sum, o) => sum + o.count, 0)}
                            </span>
                        </div>

                        <div className={s.filterValuesList}>
                            {filteredOptions.map(opt => (
                                <label key={opt.token} className={s.filterValueRow}>
                                    <span className={s.filterValueLeft}>
                                        <input
                                            type="checkbox"
                                            checked={selected.has(opt.token)}
                                            onChange={() => toggleToken(opt.token)}
                                        />
                                        <span>{opt.token === EMPTY_TOKEN ? '(Пустые)' : opt.label}</span>
                                    </span>
                                    <span className={s.filterCount}>{opt.count}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className={s.filterFooter}>
                        <button
                            type="button"
                            className={`${s.ctxItem} ${s.filterBtnCancel}`}
                            onClick={handleResetClick}
                            style={{ paddingRight: '12px' }}
                        >
                            Сбросить
                        </button>
                        <button
                            type="button"
                            className={`${s.ctxItem} ${s.filterBtnCancel}`}
                            onClick={() => {
                                setShowFilterPopup(false);
                            }}
                            style={{ paddingRight: '12px' }}
                        >
                            Отменить
                        </button>
                        <button
                            type="button"
                            className={`${s.ctxItem} ${s.filterBtnApply}`}
                            onClick={handleApplyClick}
                            style={{ paddingRight: '12px' }}
                        >
                            Применить
                        </button>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
}
