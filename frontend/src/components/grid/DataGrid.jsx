import React, {useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import s from '../../styles/Grid.module.css';
import m from '../../styles/Modal.module.css';
import TextTd from './cells/TextTd';
import NumberTd from './cells/NumberTd';
import DateTd from './cells/DateTd';
import SelectorTd from './cells/SelectorTd';
import FileTd from './cells/FileTd';
import {
    updateCell,
    addRow,
    addRightRow,
    deleteLeftRow,
    deleteRightRow,
    addColumn,
    updateColumn,
    deleteColumn,
    exportPage,
    mergeLeftRows,
} from '../../api/client';
import RowContextMenu from './RowContextMenu';
import HeaderFilterMenu from './HeaderFilterMenu';
import {formatDateDisplay, formatNumberDisplay} from '../../utils/formatters';
import SelectorCell from '../SelectorCell.jsx';

const EMPTY_TOKEN = '__EMPTY__';
const FILTER_COOKIE_PREFIX = 'gridFilters_';
const UNDO_LIMIT = 50;

function getFilterKey(side, colKey) {
    return `${String(side).toUpperCase()}:${colKey}`;
}

function MergeSelectorCell({value, options, onChange, colName}) {
    return (
        <SelectorCell
            value={value}
            options={options}
            placeholder="Выберите значение"
            onChange={onChange}
            noWrap
            colType={colName}
        />
    );
}

/** Токен для фильтра (и подписи в фильтре) */
function canonicalValueForCell(cell, column) {
    if (!cell || cell.dataType === 'EMPTY' || cell.value === '' || cell.value == null) {
        return EMPTY_TOKEN;
    }

    const colType = String(column?.type || cell.dataType || '').toUpperCase();

    if (colType === 'SELECTOR') {
        const v = cell.value || {};
        const label = v.label ?? v.value;
        return label != null && label !== '' ? String(label) : EMPTY_TOKEN;
    }

    if (colType === 'FILE') {
        // только два состояния: есть файл / пусто
        return 'WITH_FILE';
    }

    if (colType === 'DATE') {
        const raw = String(cell.value);
        // ожидаем LocalDate в формате yyyy-MM-dd
        const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (m) {
            const [, y, mo, d] = m;
            return `${d}.${mo}.${y}`;
        }
        return raw;
    }

    return String(cell.value);
}

/** Применение фильтров к rows */
function applyFiltersToRows(rows, filters, leftCols, rightCols) {
    if (!rows || !rows.length) return rows || [];
    if (!filters || Object.keys(filters).length === 0) return rows;

    const colMap = new Map();
    leftCols.forEach(c => colMap.set(getFilterKey('LEFT', c.key), {side: 'LEFT', col: c}));
    rightCols.forEach(c => colMap.set(getFilterKey('RIGHT', c.key), {side: 'RIGHT', col: c}));

    const active = Object.entries(filters).filter(([key, f]) => {
        return colMap.has(key) && f && Array.isArray(f.values) && f.values.length > 0;
    });
    if (active.length === 0) return rows;

    return rows.reduce((acc, group) => {
        const leftRowId = group.leftRowId;
        const rightsArr = group.rights?.length
            ? group.rights
            : [{rightRowId: leftRowId, dataRight: {}}];

        // LEFT
        for (const [key, f] of active) {
            const meta = colMap.get(key);
            if (!meta || meta.side !== 'LEFT') continue;
            const colKey = meta.col.key;
            const cell = group.dataLeft?.[colKey];
            const token = canonicalValueForCell(cell, meta.col);
            if (!f.values.includes(token)) return acc;
        }

        // RIGHT
        const hasRightFilters = active.some(([key]) => {
            const meta = colMap.get(key);
            return meta && meta.side === 'RIGHT';
        });

        let filteredRights = rightsArr;
        if (hasRightFilters) {
            filteredRights = rightsArr.filter(r => {
                for (const [key, f] of active) {
                    const meta = colMap.get(key);
                    if (!meta || meta.side !== 'RIGHT') continue;
                    const colKey = meta.col.key;
                    const cell = r.dataRight?.[colKey];
                    const token = canonicalValueForCell(cell, meta.col);
                    if (!f.values.includes(token)) return false;
                }
                return true;
            });
        }

        if (!filteredRights.length) return acc;
        acc.push({...group, rights: filteredRights});
        return acc;
    }, []);
}

/** Статистика значений для фильтра колонки */
function buildColumnValueStats(rows, side, column) {
    const key = column.key;
    const map = new Map();
    const isLeft = String(side).toUpperCase() === 'LEFT';
    const colType = String(column.type || '').toUpperCase();

    (rows || []).forEach(group => {
        if (isLeft) {
            const cell = group.dataLeft?.[key];
            const token = canonicalValueForCell(cell, column);
            map.set(token, (map.get(token) || 0) + 1);
        } else {
            const rightsArr = group.rights?.length
                ? group.rights
                : [{rightRowId: group.leftRowId, dataRight: {}}];
            rightsArr.forEach(r => {
                const cell = r.dataRight?.[key];
                const token = canonicalValueForCell(cell, column);
                map.set(token, (map.get(token) || 0) + 1);
            });
        }
    });

    let options = Array.from(map.entries()).map(([token, count]) => {
        let label = token;
        if (token === EMPTY_TOKEN) label = '(Пустые)';
        else if (colType === 'FILE' && token === 'WITH_FILE') label = 'С файлом';
        return {token, label, count, isEmpty: token === EMPTY_TOKEN};
    });

    options = options.sort((a, b) => {
        if (a.isEmpty && !b.isEmpty) return 1;
        if (!a.isEmpty && b.isEmpty) return -1;
        return a.label.localeCompare(b.label, 'ru');
    });

    return {
        options,
        allTokens: options.map(o => o.token),
    };
}

/** сырой value для сортировки */
function rawSortValue(cell, column) {
    if (!cell || cell.dataType === 'EMPTY' || cell.value === '' || cell.value == null) {
        return null;
    }
    const colType = String(column?.type || cell.dataType || '').toUpperCase();

    if (colType === 'NUMBER') {
        const n = Number(String(cell.value).replace(/\s/g, '').replace(',', '.'));
        return Number.isNaN(n) ? null : n;
    }
    if (colType === 'DATE') {
        const raw = String(cell.value);
        const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (m) {
            const [, y, mo, d] = m;
            return new Date(`${y}-${mo}-${d}T00:00:00Z`).getTime();
        }
        return raw;
    }
    if (colType === 'FILE') {
        // сортировку по файлам не делаем (кнопки не показываем)
        return null;
    }
    if (colType === 'SELECTOR') {
        const v = cell.value || {};
        const label = v.label ?? v.value;
        return label != null ? String(label) : null;
    }
    return String(cell.value);
}

/** сортировка групп rows */
function applySortToRows(rows, sort, leftCols, rightCols) {
    if (!rows || !rows.length) return rows || [];
    if (!sort) return rows;

    const {side, columnKey, direction} = sort;
    const sideUpper = String(side).toUpperCase();
    const cols = sideUpper === 'LEFT' ? leftCols : rightCols;
    const col = cols.find(c => c.key === columnKey);
    if (!col) return rows;
    if (String(col.type).toUpperCase() === 'FILE') return rows; // на всякий

    const factor = direction === 'DESC' ? -1 : 1;

    const clone = [...rows];

    clone.sort((a, b) => {
        let cellA;
        let cellB;

        if (sideUpper === 'LEFT') {
            cellA = a.dataLeft?.[columnKey];
            cellB = b.dataLeft?.[columnKey];
        } else {
            const ra = (a.rights?.length ? a.rights : [{dataRight: {}}])[0];
            const rb = (b.rights?.length ? b.rights : [{dataRight: {}}])[0];
            cellA = ra.dataRight?.[columnKey];
            cellB = rb.dataRight?.[columnKey];
        }

        const va = rawSortValue(cellA, col);
        const vb = rawSortValue(cellB, col);

        if (va == null && vb == null) return 0;
        if (va == null) return 1 * factor;  // пустые вниз
        if (vb == null) return -1 * factor;

        if (va < vb) return -1 * factor;
        if (va > vb) return 1 * factor;
        return 0;
    });

    return clone;
}

function loadFiltersForPage(pageId) {
    if (!pageId || typeof document === 'undefined') return {};
    try {
        const name = FILTER_COOKIE_PREFIX + pageId;
        const item = document.cookie
            .split('; ')
            .find(p => p.startsWith(name + '='));
        if (!item) return {};
        const raw = decodeURIComponent(item.split('=')[1] || '');
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

function saveFiltersForPage(pageId, filters) {
    if (!pageId || typeof document === 'undefined') return;
    try {
        const name = FILTER_COOKIE_PREFIX + pageId;
        const json = JSON.stringify(filters || {});
        const encoded = encodeURIComponent(json);
        const maxAge = 60 * 60 * 24 * 30;
        document.cookie = `${name}=${encoded}; path=/; max-age=${maxAge}`;
    } catch (e) {
        console.error('Failed to save filters cookie', e);
    }
}

function CellByType({type, ...rest}) {
    switch (String(type).toUpperCase()) {
        case 'TEXT':
            return <TextTd {...rest} />;
        case 'NUMBER':
            return <NumberTd {...rest} />;
        case 'DATE':
            return <DateTd {...rest} />;
        case 'SELECTOR':
            return <SelectorTd {...rest} />;
        case 'FILE':
            return <FileTd {...rest} />;
        default:
            return <TextTd {...rest} />;
    }
}

export default function DataGrid({
                                     pageId,
                                     legend,
                                     rows,
                                     onLocalPatch,
                                     onReload,
                                     readOnly = false,
                                     pageAccess,
                                     allowReadFilters = false,
                                 }) {
    const leftCols = useMemo(
        () => (legend?.left || []).filter(c => String(c.access).toUpperCase() !== 'NO'),
        [legend]
    );
    const rightCols = useMemo(
        () => (legend?.right || []).filter(c => String(c.access).toUpperCase() !== 'NO'),
        [legend]
    );

    const canWriteLeft = useMemo(
        () => leftCols.some(c => String(c.access).toUpperCase() === 'WRITE'),
        [leftCols]
    );
    const canWriteRight = useMemo(
        () => rightCols.some(c => String(c.access).toUpperCase() === 'WRITE'),
        [rightCols]
    );
    const hasAnyColumns = leftCols.length + rightCols.length > 0;
    const isReadOnly = readOnly || !pageId;
    const accessLevel = String(pageAccess || 'MANAGE').toUpperCase();
    const isManage = accessLevel === 'MANAGE';
    const isRead = accessLevel === 'READ';
    const canAddRow = !isReadOnly && !isRead && hasAnyColumns && canWriteLeft;
    const canAddColumnLeft = !isReadOnly && isManage && (leftCols.length === 0 ? true : canWriteLeft);
    const canAddColumnRight = !isReadOnly && isManage && (rightCols.length === 0 ? true : canWriteRight);
    const canOpenRowMenu = !isReadOnly && !isRead;
    const canOpenHeaderMenu = !isReadOnly || allowReadFilters;
    const [mergeMode, setMergeMode] = useState(false);
    const [mergeSelected, setMergeSelected] = useState(() => new Set());
    const [mergeConflicts, setMergeConflicts] = useState([]);
    const [mergeChoices, setMergeChoices] = useState({});
    const [showMergeModal, setShowMergeModal] = useState(false);

    const rowsRef = useRef(rows);
    const leftColsRef = useRef(leftCols);
    const rightColsRef = useRef(rightCols);

    useEffect(() => {
        rowsRef.current = rows;
    }, [rows]);

    useEffect(() => {
        leftColsRef.current = leftCols;
        rightColsRef.current = rightCols;
    }, [leftCols, rightCols]);

    useEffect(() => {
        undoStackRef.current = [];
        redoStackRef.current = [];
        setUndoCount(0);
        setRedoCount(0);
    }, [pageId]);

    useEffect(() => {
        setMergeMode(false);
        setMergeSelected(new Set());
        setMergeConflicts([]);
        setMergeChoices({});
        setShowMergeModal(false);
    }, [pageId]);

    useEffect(() => {
        if (!mergeMode) return;
        setMergeSelected(new Set());
        setMergeConflicts([]);
        setMergeChoices({});
        setShowMergeModal(false);
    }, [mergeMode]);

    useEffect(() => {
        if (isReadOnly || isRead) {
            setMergeMode(false);
        }
    }, [isReadOnly, isRead]);

    // ===== фильтры =====
    const [filters, setFilters] = useState({});
    // ===== сортировка =====
    const [sortBy, setSortBy] = useState(null); // { side, columnKey, direction }

    useEffect(() => {
        if (!pageId) return;
        const stored = loadFiltersForPage(pageId);
        const allowed = new Set();
        leftCols.forEach(c => allowed.add(getFilterKey('LEFT', c.key)));
        rightCols.forEach(c => allowed.add(getFilterKey('RIGHT', c.key)));

        const cleaned = {};
        Object.entries(stored || {}).forEach(([k, v]) => {
            if (!allowed.has(k)) return;
            if (!v || !Array.isArray(v.values)) return;
            cleaned[k] = v;
        });
        setFilters(cleaned);
    }, [pageId, leftCols, rightCols]);

    useEffect(() => {
        if (!pageId) return;
        saveFiltersForPage(pageId, filters);
    }, [pageId, filters]);

    const filteredRows = useMemo(
        () => applyFiltersToRows(rows || [], filters, leftCols, rightCols),
        [rows, filters, leftCols, rightCols]
    );

    const visibleRows = useMemo(
        () => applySortToRows(filteredRows, sortBy, leftCols, rightCols),
        [filteredRows, sortBy, leftCols, rightCols]
    );

    function handleApplyFilter(side, columnKey, selectedTokens, allTokens) {
        const key = getFilterKey(side, columnKey);
        setFilters(prev => {
            const next = {...prev};
            if (!selectedTokens || selectedTokens.length === 0) {
                next[key] = {values: []}; // всё отключено
            } else if (selectedTokens.length === allTokens.length) {
                delete next[key]; // нет фильтра
            } else {
                next[key] = {values: selectedTokens};
            }
            return next;
        });
    }

    function handleSortChange(side, columnKey, direction) {
        setSortBy({side, columnKey, direction});
    }

    // ===== блокировка коммитов при меню/подтверждении =====
    const suspendCommitsRef = useRef(false);
    const menuSuspendedRef = useRef(false);
    const confirmOpenRef = useRef(false);

    function blurAndSuspendCommits() {
        suspendCommitsRef.current = true;
        const ae = document.activeElement;
        if (ae && typeof ae.blur === 'function') ae.blur();
    }

    function resumeCommits() {
        suspendCommitsRef.current = false;
    }

    const undoStackRef = useRef([]);
    const redoStackRef = useRef([]);
    const [undoCount, setUndoCount] = useState(0);
    const [redoCount, setRedoCount] = useState(0);

    function findCellSnapshot(rowId, side, colKey, col) {
        const list = rowsRef.current || [];
        for (const group of list) {
            if (side === 'LEFT' && group.leftRowId === rowId) {
                const cell = group.dataLeft?.[colKey];
                return buildSnapshotFromCell(cell, col);
            }
            if (side === 'RIGHT') {
                const rights = group.rights || [];
                const hit = rights.find(r => r.rightRowId === rowId);
                if (hit) {
                    const cell = hit.dataRight?.[colKey];
                    return buildSnapshotFromCell(cell, col);
                }
            }
        }
        return null;
    }

    function buildSnapshotFromCell(cell, col) {
        const dataTypeRaw = cell?.dataType && cell.dataType !== 'EMPTY'
            ? cell.dataType
            : col?.type;
        const dataType = String(dataTypeRaw || 'TEXT').toUpperCase();
        if (!cell || cell.dataType === 'EMPTY') {
            return {dataType, localValue: null, serverValue: null};
        }
        if (dataType === 'SELECTOR') {
            const optionId = cell.value?.optionId ?? null;
            return {dataType, localValue: cell.value ?? null, serverValue: optionId};
        }
        return {dataType, localValue: cell.value ?? null, serverValue: cell.value ?? null};
    }

    function buildSnapshotFromCommit(dataTypeRaw, value, optionMeta) {
        const dataType = String(dataTypeRaw || 'TEXT').toUpperCase();
        if (dataType === 'SELECTOR') {
            const localValue = optionMeta
                ? {optionId: optionMeta.id, label: optionMeta.label, value: optionMeta.value}
                : null;
            return {dataType, localValue, serverValue: value ?? null};
        }
        return {dataType, localValue: value ?? null, serverValue: value ?? null};
    }

    function pushUndoEntry(entry) {
        const next = [...undoStackRef.current, entry];
        undoStackRef.current = next.length > UNDO_LIMIT ? next.slice(-UNDO_LIMIT) : next;
        redoStackRef.current = [];
        setUndoCount(undoStackRef.current.length);
        setRedoCount(0);
    }

    async function applySnapshot(rowId, side, colKey, snapshot) {
        if (!snapshot) return;
        onLocalPatch(rowId, side, colKey, {
            dataType: snapshot.dataType,
            value: snapshot.localValue,
        });
        try {
            await updateCell({
                pageId,
                rowId,
                side,
                columnKey: colKey,
                dataType: snapshot.dataType,
                value: snapshot.serverValue,
            });
        } catch (e) {
            console.error('Undo/redo update failed', e);
        }
    }

    async function undoLast() {
        const stack = undoStackRef.current;
        if (!stack.length) return;
        const entry = stack.pop();
        redoStackRef.current = [...redoStackRef.current, entry];
        setUndoCount(stack.length);
        setRedoCount(redoStackRef.current.length);
        await applySnapshot(entry.rowId, entry.side, entry.colKey, entry.prev);
    }

    async function redoLast() {
        const stack = redoStackRef.current;
        if (!stack.length) return;
        const entry = stack.pop();
        undoStackRef.current = [...undoStackRef.current, entry];
        setUndoCount(undoStackRef.current.length);
        setRedoCount(stack.length);
        await applySnapshot(entry.rowId, entry.side, entry.colKey, entry.next);
    }

    async function handleExport() {
        try {
            const {blob, filename} = await exportPage(pageId);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || 'page.xlsx';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Export failed', e);
        }
    }

    async function commit({rowId, side, col, dataType, value, optionMeta}) {
        if (suspendCommitsRef.current) return;

        const colKey = col.key;
        const prevSnapshot = findCellSnapshot(rowId, side, colKey, col);
        const nextSnapshot = buildSnapshotFromCommit(dataType, value, optionMeta);
        if (prevSnapshot) {
            pushUndoEntry({rowId, side, colKey, prev: prevSnapshot, next: nextSnapshot});
        }
        if (dataType === 'SELECTOR') {
            onLocalPatch(rowId, side, colKey, {
                dataType: 'SELECTOR',
                value: optionMeta
                    ? {optionId: optionMeta.id, label: optionMeta.label, value: optionMeta.value}
                    : null,
            });
        } else if (dataType === 'FILE') {
            onLocalPatch(rowId, side, colKey, {dataType: 'FILE', value: value ?? null});
        } else {
            onLocalPatch(rowId, side, colKey, {dataType, value});
        }

        try {
            await updateCell({
                pageId,
                rowId,
                side,
                columnKey: colKey,
                dataType,
                value,
            });
        } catch (e) {
            if (e?.status === 404 || e?.code === 404) {
                console.warn('updateCell ignored (row/cell not found)');
            } else {
                console.error('PATCH failed', e);
            }
        }
    }

    // ===== меню по строкам =====
    const wrapperRef = useRef(null);
    const [rowMenu, setRowMenu] = useState(null);

    function openRowMenu(ev, meta) {
        ev.preventDefault();
        blurAndSuspendCommits();
        menuSuspendedRef.current = true;
        setRowMenu({
            x: ev.clientX,
            y: ev.clientY,
            ...meta,
        });
    }

    function closeRowMenu() {
        setRowMenu(null);
        if (!confirmOpenRef.current) {
            menuSuspendedRef.current = false;
            setTimeout(() => {
                if (!confirmOpenRef.current) resumeCommits();
            }, 0);
        }
    }

    function handleContextMenu(ev) {
        if (mergeMode) return;
        if (!canOpenRowMenu) return;
        const td = ev.target.closest('td');
        if (!td) return;
        const side = td.getAttribute('data-side');
        const leftRowId = td.getAttribute('data-leftrow');
        const rightRowId = td.getAttribute('data-rightrow') || null;
        const rightsCount = Number(td.getAttribute('data-rights') || '1');
        if (!side || !leftRowId) return;
        openRowMenu(ev, {side, leftRowId, rightRowId, rightsCount});
    }

    // ===== меню заголовка =====
    const [colMenu, setColMenu] = useState(null);
    const [headerEdit, setHeaderEdit] = useState(null);
    const headerEditableRef = useRef(null);
    const headerEditValueRef = useRef('');
    const [colNameOverrides, setColNameOverrides] = useState({});

    useEffect(() => {
        setColNameOverrides({});
    }, [legend]);

    useEffect(() => {
        if (headerEdit && headerEditableRef.current) {
            const el = headerEditableRef.current;
            el.textContent = headerEdit.originalName || '';
            headerEditValueRef.current = headerEdit.originalName || '';
            el.focus();
            const range = document.createRange();
            range.selectNodeContents(el);
            const sel = window.getSelection();
            if (sel) {
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    }, [headerEdit]);

    function openHeaderMenu(ev) {
        if (mergeMode) return;
        if (!canOpenHeaderMenu) return;
        const th = ev.target.closest('th');
        if (!th) return;
        const side = th.getAttribute('data-side');
        const colKey = th.getAttribute('data-colkey');
        if (!side || !colKey) return;

        const cols = side === 'LEFT' ? leftCols : rightCols;
        const colIndex = cols.findIndex(c => c.key === colKey);
        const col = colIndex >= 0 ? cols[colIndex] : null;
        if (!col) return;

        ev.preventDefault();
        blurAndSuspendCommits();

        const rect = th.getBoundingClientRect();

        const stats = buildColumnValueStats(rows || [], side, col);

        setColMenu({
            x: rect.left,
            y: rect.bottom,
            anchorRect: {
                left: rect.left,
                right: rect.right,
                top: rect.top,
                bottom: rect.bottom,
                width: rect.width,
                height: rect.height,
            },
            side,
            column: col,
            columnIndex: colIndex,
            sideCount: cols.length,
            options: stats.options,
            allTokens: stats.allTokens,
        });
    }

    function closeHeaderMenu() {
        setColMenu(null);
        resumeCommits();
    }

    function openAddColumnMenu(side, anchorRect, allowedSides) {
        blurAndSuspendCommits();
        menuSuspendedRef.current = true;
        const leftList = leftColsRef.current || [];
        const rightList = rightColsRef.current || [];
        const leftLast = leftList.length ? leftList[leftList.length - 1] : null;
        const rightLast = rightList.length ? rightList[rightList.length - 1] : null;
        const leftAddPosition = (leftLast ? Number(leftLast.position || leftList.length) : 0) + 1 || 1;
        const rightAddPosition = (rightLast ? Number(rightLast.position || rightList.length) : 0) + 1 || 1;
        const allowLeft = allowedSides?.left ?? true;
        const allowRight = allowedSides?.right ?? true;
        const sideProvided = side === 'LEFT' || side === 'RIGHT';
        let initialSide = sideProvided ? side : (allowLeft ? 'LEFT' : 'RIGHT');
        if (initialSide === 'LEFT' && !allowLeft && allowRight) initialSide = 'RIGHT';
        if (initialSide === 'RIGHT' && !allowRight && allowLeft) initialSide = 'LEFT';
        const lastCol = initialSide === 'LEFT' ? leftLast : rightLast;
        const addPosition = initialSide === 'LEFT' ? leftAddPosition : rightAddPosition;
        setColMenu({
            x: anchorRect?.left ?? 0,
            y: anchorRect?.bottom ?? 0,
            anchorRect: anchorRect || null,
            side: initialSide,
            column: lastCol || null,
            options: [],
            allTokens: [],
            mode: 'ADD_COLUMN',
            addPosition,
            sideMeta: {
                leftAddPosition,
                rightAddPosition,
            },
            allowedSides: {left: allowLeft, right: allowRight},
            allowSideSelect: !sideProvided,
        });
    }

    function startRenameColumn(side, column) {
        if (isReadOnly) return;
        if (!column) return;
        const currentName = colNameOverrides[column.id] ?? column.name ?? '';
        setHeaderEdit({
            columnId: column.id,
            columnKey: column.key,
            side,
            originalName: currentName,
        });
        headerEditValueRef.current = currentName;
    }

    function cancelRename() {
        setHeaderEdit(null);
        headerEditValueRef.current = '';
    }

    async function commitRename(nextNameRaw) {
        if (!headerEdit) return;
        const nextName = String(nextNameRaw ?? '').trim();
        const originalName = headerEdit.originalName || '';
        const columnId = headerEdit.columnId;
        setHeaderEdit(null);
        headerEditValueRef.current = '';

        if (!nextName || nextName === originalName) return;

        setColNameOverrides(prev => ({...prev, [columnId]: nextName}));
        try {
            await updateColumn({pageId, columnId, name: nextName});
            await onReload?.();
        } catch (e) {
            setColNameOverrides(prev => {
                const next = {...prev};
                delete next[columnId];
                return next;
            });
            console.error('Update column failed', e);
        }
    }

    async function handleAddColumn({side, position, name, type, options}) {
        try {
            await addColumn({
                pageId,
                side,
                columnType: type,
                name,
                position,
                options,
            });
            await onReload?.();
        } catch (e) {
            console.error('Add column failed', e);
        }
    }

    function doDeleteColumn(side, column) {
        if (!column?.id) return;
        closeHeaderMenu();
        const label = column.name ? `«${column.name}»` : '';
        askConfirm(`Удалить столбец ${label}?`, async () => {
            await deleteColumn(pageId, column.id);
        });
    }

    // ===== confirm удаления строк =====
    const [confirm, setConfirm] = useState(null);

    function askConfirm(text, cb) {
        confirmOpenRef.current = true;
        setConfirm({
            text,
            onOk: async () => {
                try {
                    await cb();
                } finally {
                    setConfirm(null);
                    confirmOpenRef.current = false;
                    await onReload?.();
                    if (!rowMenu) resumeCommits();
                }
            },
            onCancel: () => {
                setConfirm(null);
                confirmOpenRef.current = false;
                if (!rowMenu && menuSuspendedRef.current) {
                    menuSuspendedRef.current = false;
                    setTimeout(resumeCommits, 0);
                }
            }
        });
    }

    // ===== скролл вниз после addRow =====
    const pendingScrollRef = useRef(false);

    useEffect(() => {
        if (!pendingScrollRef.current) return;
        const el = wrapperRef.current;
        if (el) {
            requestAnimationFrame(() => {
                el.scrollTop = el.scrollHeight;
                pendingScrollRef.current = false;
            });
        } else {
            pendingScrollRef.current = false;
        }
    }, [rows]);

    async function doAddRow() {
        closeRowMenu();
        pendingScrollRef.current = true;
        try {
            await addRow(pageId);
        } catch (e) {
            console.error(e);
        }
        await onReload?.();
        if (menuSuspendedRef.current && !confirmOpenRef.current) {
            menuSuspendedRef.current = false;
            setTimeout(resumeCommits, 0);
        }
    }

    async function doAddRight(leftRowId) {
        closeRowMenu();
        try {
            await addRightRow(pageId, leftRowId);
        } catch (e) {
            console.error(e);
        }
        await onReload?.();
        if (menuSuspendedRef.current && !confirmOpenRef.current) {
            menuSuspendedRef.current = false;
            setTimeout(resumeCommits, 0);
        }
    }

    async function doDeleteLeft(leftRowId) {
        closeRowMenu();
        askConfirm('Удалить левую строку и все связанные правые?', async () => {
            await deleteLeftRow(pageId, leftRowId);
        });
    }

    async function doDeleteRight(rightRowId) {
        closeRowMenu();
        askConfirm('Удалить выбранную правую строку?', async () => {
            await deleteRightRow(pageId, rightRowId);
        });
    }

    useEffect(() => {
        window.dispatchEvent(new CustomEvent('grid:state', {
            detail: {
                canAddRow,
                canAddColumnLeft,
                canAddColumnRight,
                canUndo: !isRead && undoCount > 0,
                canRedo: !isRead && redoCount > 0,
                accessLevel,
                mergeMode,
                mergeSelectedCount: mergeSelected.size,
                canMerge: canMergeNow(),
            }
        }));
    }, [
        canAddRow,
        canAddColumnLeft,
        canAddColumnRight,
        undoCount,
        redoCount,
        isRead,
        accessLevel,
        mergeMode,
        mergeSelected,
        mergeChoices,
        mergeConflicts.length,
    ]);

    useEffect(() => {
        function handleGridAction(event) {
            if (isReadOnly) return;
            const detail = event?.detail || {};
            if (detail.type === 'add-row') {
                if (!canAddRow) return;
                doAddRow();
                return;
            }
            if (detail.type === 'add-column') {
                if (!canAddColumnLeft && !canAddColumnRight) return;
                const side = detail.side === 'RIGHT' ? 'RIGHT' : (detail.side === 'LEFT' ? 'LEFT' : null);
                openAddColumnMenu(side, detail.anchorRect || null, {
                    left: canAddColumnLeft,
                    right: hasAnyColumns ? canAddColumnRight : false,
                });
                return;
            }
            if (detail.type === 'undo') {
                if (isRead || isReadOnly) return;
                undoLast();
                return;
            }
            if (detail.type === 'redo') {
                if (isRead || isReadOnly) return;
                redoLast();
                return;
            }
            if (detail.type === 'export') {
                handleExport();
                return;
            }
            if (detail.type === 'merge-rows') {
                setMergeMode(prev => !prev);
                return;
            }
            if (detail.type === 'merge-open') {
                if (mergeSelected.size >= 2) openMergeModal();
                return;
            }
            if (detail.type === 'merge-cancel') {
                setMergeMode(false);
                return;
            }
        }

        window.addEventListener('grid:action', handleGridAction);
        return () => window.removeEventListener('grid:action', handleGridAction);
    }, [
        doAddRow,
        openAddColumnMenu,
        undoLast,
        redoLast,
        canAddRow,
        canAddColumnLeft,
        canAddColumnRight,
        isRead,
        isReadOnly,
    ]);

    function toggleMergeSelect(leftRowId) {
        setMergeSelected(prev => {
            const next = new Set(prev);
            if (next.has(leftRowId)) {
                next.delete(leftRowId);
            } else {
                next.add(leftRowId);
            }
            return next;
        });
    }


    function getCandidateMeta(cell, col) {
        const dataType = (cell?.dataType && cell.dataType !== 'EMPTY') ? cell.dataType : col.type;
        const raw = cell?.value ?? null;
        if (raw == null || raw === '') {
            return {key: '__EMPTY__', label: '', value: null, dataType};
        }
        if (dataType === 'DATE') {
            return {key: String(raw), label: formatDateDisplay(raw), value: raw, dataType};
        }
        if (dataType === 'NUMBER') {
            return {key: String(raw), label: formatNumberDisplay(raw), value: raw, dataType};
        }
        if (dataType === 'SELECTOR') {
            const id = raw?.optionId || raw?.id || raw;
            const label = raw?.label || String(raw?.value || '');
            return {key: String(id), label, value: id, dataType};
        }
        if (dataType === 'FILE') {

            const id = raw?.id || raw?.fileId || raw?.uuid || raw?.filename || raw;
            const label = cell?.filename || raw?.name || String(id || '');
            return {key: String(id), label, value: id, dataType};
        }
        return {key: String(raw), label: String(raw), value: raw, dataType};
    }

    function buildMergeConflicts() {
        const selectedIds = Array.from(mergeSelected);
        if (selectedIds.length < 2) return [];
        const byId = new Map();
        (rows || []).forEach(group => {
            byId.set(String(group.leftRowId), group.dataLeft || {});
        });
        return leftCols.map(col => {
            const candidates = selectedIds.map(id => {
                const data = byId.get(String(id)) || {};
                return getCandidateMeta(data[col.key], col);
            });
            const unique = [];
            const seen = new Set();
            candidates.forEach(c => {
                if (c.key === '__EMPTY__') return;
                if (seen.has(c.key)) return;
                seen.add(c.key);
                unique.push(c);
            });
            return {
                key: col.key,
                name: col.name,
                dataType: unique[0]?.dataType || col.type,
                options: unique,
                hasConflict: unique.length > 1,
            };
        }).filter(c => c.hasConflict);
    }

    function openMergeModal() {
        const conflicts = buildMergeConflicts();
        setMergeConflicts(conflicts);
        const nextChoices = {};
        conflicts.forEach(c => {
            nextChoices[c.key] = null;
        });
        setMergeChoices(nextChoices);
        setShowMergeModal(true);
    }

    function canMergeNow() {
        if (mergeSelected.size < 2) return false;
        if (!mergeConflicts.length) return true;
        return mergeConflicts.every(c => mergeChoices[c.key] != null);
    }

    function getDefaultCandidateForCol(col) {
        const selectedIds = Array.from(mergeSelected);
        if (!selectedIds.length) return {display: '', value: null, dataType: col.type};
        const byId = new Map();
        (rows || []).forEach(group => {
            byId.set(String(group.leftRowId), group.dataLeft || {});
        });
        const data = byId.get(String(selectedIds[0])) || {};
        const meta = getCandidateMeta(data[col.key], col);
        return meta;
    }

    function resolveChoiceForCol(col) {
        const conflict = mergeConflicts.find(c => c.key === col.key);
        if (conflict) {
            const key = mergeChoices[col.key];
            const opt = conflict.options.find(o => o.key === key);
            return opt || null;
        }
        return getDefaultCandidateForCol(col);
    }

    async function handleMergeSubmit() {
        if (mergeSelected.size < 2) return;
        const leftRowIds = Array.from(mergeSelected);
        const values = leftCols.map(col => {
            const choice = resolveChoiceForCol(col);
            return {
                columnKey: col.key,
                dataType: choice?.dataType || col.type,
                value: choice?.value ?? null,
            };
        });
        try {
            await mergeLeftRows({pageId, leftRowIds, values});
            await onReload?.();
            setShowMergeModal(false);
            setMergeMode(false);
        } catch (e) {
            console.error('Merge rows failed', e);
        }
    }

    // ===== render =====
    return (
        <div
            ref={wrapperRef}
            className={s.wrapper}
            onContextMenu={isReadOnly ? undefined : handleContextMenu}
        >
            <table className={s.table}>
                <thead>
                <tr>
                    {leftCols.map((c, idx) => {
                        const key = getFilterKey('LEFT', c.key);
                        const hasFilter = !!(filters[key] && filters[key].values && filters[key].values.length);
                        const isEditing = headerEdit && headerEdit.columnId === c.id;
                        const displayName = colNameOverrides[c.id] ?? c.name;
                        const isLastLeft = idx === leftCols.length - 1;
                        return (
                            <th
                                key={`L-${c.key}`}
                                data-side="LEFT"
                                data-colkey={c.key}
                                onContextMenu={openHeaderMenu}
                                className={`${hasFilter ? s.thFiltered : ''} ${isLastLeft ? s.splitRight : ''}`.trim() || undefined}
                            >
                                {isEditing ? (
                                    <span
                                        ref={headerEditableRef}
                                        className={s.thInput}
                                        contentEditable
                                        suppressContentEditableWarning
                                        onInput={(e) => {
                                            headerEditValueRef.current = e.currentTarget.textContent || '';
                                        }}
                                        onBlur={(e) => commitRename(e.currentTarget.textContent)}
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
                                        {headerEdit?.originalName || ''}
                                    </span>
                                ) : (
                                    displayName
                                )}
                            </th>
                        );
                    })}
                    {rightCols.map(c => {
                        const key = getFilterKey('RIGHT', c.key);
                        const hasFilter = !!(filters[key] && filters[key].values && filters[key].values.length);
                        const isEditing = headerEdit && headerEdit.columnId === c.id;
                        const displayName = colNameOverrides[c.id] ?? c.name;
                        return (
                            <th
                                key={`R-${c.key}`}
                                data-side="RIGHT"
                                data-colkey={c.key}
                                onContextMenu={openHeaderMenu}
                                className={`${hasFilter ? s.thFiltered : ''}`.trim() || undefined}
                            >
                                {isEditing ? (
                                    <span
                                        ref={headerEditableRef}
                                        className={s.thInput}
                                        contentEditable
                                        suppressContentEditableWarning
                                        onInput={(e) => {
                                            headerEditValueRef.current = e.currentTarget.textContent || '';
                                        }}
                                        onBlur={(e) => commitRename(e.currentTarget.textContent)}
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
                                        {headerEdit?.originalName || ''}
                                    </span>
                                ) : (
                                    displayName
                                )}
                            </th>
                        );
                    })}
                </tr>
                </thead>
                <tbody>
                {(visibleRows || []).flatMap(group => {
                    const rights = group.rights?.length
                        ? group.rights
                        : [{rightRowId: group.leftRowId, dataRight: {}}];
                    const span = rights.length;

                    return rights.map((r, idx) => (
                        <tr
                            key={`${group.leftRowId}-${idx}`}
                            className={mergeMode && mergeSelected.has(group.leftRowId) ? s.mergeSelectedRow : undefined}
                            onClick={(e) => {
                                if (!mergeMode) return;
                                e.preventDefault();
                                toggleMergeSelect(group.leftRowId);
                            }}
                        >
                            {idx === 0 && leftCols.map((col, colIdx) => {
                                const cell = group.dataLeft?.[col.key];
                                const effType =
                                    (cell?.dataType && cell.dataType !== 'EMPTY') ? cell.dataType : col.type;
                                const editable = !mergeMode && !isReadOnly && !isRead && String(col.access).toUpperCase() === 'WRITE';
                                const isLastLeft = colIdx === leftCols.length - 1;
                                return (
                                    <CellByType
                                        key={`L-${group.leftRowId}-${col.key}`}
                                        type={effType}
                                        pageId={pageId}
                                        tdProps={{
                                            rowSpan: span,
                                            'data-side': 'LEFT',
                                            'data-rowid': group.leftRowId,
                                            'data-leftrow': group.leftRowId,
                                            'data-rights': span,
                                            className: isLastLeft ? s.splitRight : undefined,
                                        }}
                                        cell={cell}
                                        col={col}
                                        side="LEFT"
                                        rowId={group.leftRowId}
                                        editable={editable}
                                        onCommit={(payload) =>
                                            commit({rowId: group.leftRowId, side: 'LEFT', col, ...payload})
                                        }
                                    />
                                );
                            })}

                            {rightCols.map(col => {
                                const cell = r.dataRight?.[col.key];
                                const effType =
                                    (cell?.dataType && cell.dataType !== 'EMPTY') ? cell.dataType : col.type;
                                const editable = !mergeMode && !isReadOnly && !isRead && String(col.access).toUpperCase() === 'WRITE';
                                const rowId = r.rightRowId;
                                return (
                                    <CellByType
                                        key={`R-${rowId}-${col.key}`}
                                        type={effType}
                                        pageId={pageId}
                                        tdProps={{
                                            'data-side': 'RIGHT',
                                            'data-rowid': rowId,
                                            'data-rightrow': rowId,
                                            'data-leftrow': group.leftRowId,
                                            'data-rights': span,
                                        }}
                                        cell={cell}
                                        col={col}
                                        side="RIGHT"
                                        rowId={rowId}
                                        editable={editable}
                                        onCommit={(payload) =>
                                            commit({rowId, side: 'RIGHT', col, ...payload})
                                        }
                                    />
                                );
                            })}
                        </tr>
                    ));
                })}
                </tbody>
            </table>

            <RowContextMenu
                menu={rowMenu}
                canWriteLeft={canWriteLeft}
                canWriteRight={canWriteRight}
                onAddRow={doAddRow}
                onAddRight={doAddRight}
                onDeleteLeft={doDeleteLeft}
                onDeleteRight={doDeleteRight}
                onClose={closeRowMenu}
            />

            <HeaderFilterMenu
                menu={colMenu}
                pageId={pageId}
                onReload={onReload}
                canManage={isManage}
                currentFilter={
                    colMenu
                    && colMenu.column?.key
                        ? filters[getFilterKey(colMenu.side, colMenu.column.key)]
                        : undefined
                }
                onApply={(selectedTokens, allTokens) => {
                    if (!colMenu) return;
                    handleApplyFilter(colMenu.side, colMenu.column.key, selectedTokens, allTokens);
                }}
                onSortChange={(side, columnKey, dir) => handleSortChange(side, columnKey, dir)}
                onRenameColumn={(side, column) => startRenameColumn(side, column)}
                onAddColumn={(payload) => handleAddColumn(payload)}
                onDeleteColumn={(side, column) => doDeleteColumn(side, column)}
                onClose={closeHeaderMenu}
            />

            {confirm && createPortal(
                <div className={m.backdrop} onClick={() => confirm.onCancel?.()}>
                    <div className={m.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={m.title}>Подтверждение</div>
                        <div>{confirm.text}</div>
                        <div className={m.actions}>
                            <button
                                className={`${m.btn} ${m.btnGhost}`}
                                onClick={() => confirm.onCancel?.()}
                            >
                                Отмена
                            </button>
                            <button className={m.btn} onClick={confirm.onOk}>
                                Да, удалить
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {showMergeModal && createPortal(
                <div className={m.backdrop} onClick={() => setShowMergeModal(false)}>
                    <div className={m.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={m.title}>Объединение строк</div>
                        {mergeConflicts.length === 0 && (
                            <div className={s.mergeHint}>Конфликтов нет, можно объединять.</div>
                        )}
                        <div className={s.mergeMiniGrid}>
                            <table className={s.table}>
                                <thead>
                                <tr>
                                    {leftCols.map(col => {
                                        const conflict = mergeConflicts.find(c => c.key === col.key);
                                        const unresolved = conflict && !mergeChoices[col.key];
                                        return (
                                            <th
                                                key={col.key}
                                                className={unresolved ? s.mergeThConflict : undefined}
                                            >
                                                {col.name}
                                            </th>
                                        );
                                    })}
                                </tr>
                                </thead>
                                <tbody>
                                <tr>
                                    {leftCols.map( col => {
                                        const conflict = mergeConflicts.find(c => c.key === col.key);

                                        if (conflict) {
                                            const options = conflict.options.map(opt => ({
                                                value: opt.key,
                                                label: opt.label,
                                                meta: opt,
                                            }));
                                            return (
                                                <MergeSelectorCell
                                                    key={col.key}
                                                    value={mergeChoices[col.key] || ''}
                                                    options={options}
                                                    onChange={(val) => setMergeChoices(prev => ({
                                                        ...prev,
                                                        [col.key]: val
                                                    }))}
                                                    isNumber={String(col.type || '').toUpperCase() === 'NUMBER'}
                                                    colName={col.type}
                                                />
                                            );
                                        }
                                        const def = getDefaultCandidateForCol(col);
                                        return (
                                            <td key={col.key} className={s.mergeTd}>
                                                <div className={s.mergeCellReadonly}>
                                                    <span
                                                        className={`${s.mergeCellText} ${String(col.type || '').toUpperCase() === 'NUMBER' ? s.mergeCellTextNoWrap : ''}`}
                                                    >
                                                        {def.label || ''}
                                                    </span>
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                                </tbody>
                            </table>
                        </div>
                        <div className={m.actions}>
                            <button
                                className={`${m.btn} ${m.btnGhost}`}
                                onClick={() => setShowMergeModal(false)}
                            >
                                Отмена
                            </button>
                            <button
                                className={m.btn}
                                disabled={!canMergeNow()}
                                onClick={handleMergeSubmit}
                            >
                                Объединить
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
