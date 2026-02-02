import { useEffect, useState, useCallback } from 'react';
import { getGrid, getPage } from '../api/client';
import DataGrid from '../components/grid/DataGrid';

function applyPageAccess(legend, pageAccess) {
    if (!legend) return legend;
    const access = String(pageAccess || '').toUpperCase();
    if (access !== 'READ') return legend;
    const downgrade = (col) => {
        const colAccess = String(col?.access || '').toUpperCase();
        if (colAccess === 'NO') return col;
        return { ...col, access: 'READ' };
    };
    return {
        ...legend,
        left: (legend.left || []).map(downgrade),
        right: (legend.right || []).map(downgrade),
    };
}

export default function PageView({ page, onAccessChange, refreshToken }) {
    const pageId = page?.id;
    const [legend, setLegend] = useState(null);
    const [rows, setRows] = useState(null);
    const [pageAccess, setPageAccess] = useState(null);
    const [archived, setArchived] = useState(!!page?.isArchived);

    const reload = useCallback(async () => {
        if (!pageId) {
            setLegend(null);
            setRows(null);
            setPageAccess(null);
            onAccessChange?.(null);
            return;
        }
        const [grid, pageInfo] = await Promise.all([getGrid(pageId), getPage(pageId)]);
        const pageArchived = pageInfo?.isArchived || page?.isArchived;
        const accessRaw = pageInfo?.access || pageInfo?.pageAccess || pageInfo?.permission;
        const access = pageArchived ? 'READ' : accessRaw;
        setPageAccess(access);
        setArchived(!!pageArchived);
        onAccessChange?.({ accessRaw, effectiveAccess: access, isArchived: !!pageArchived });
        const nextLegend = applyPageAccess(grid.legend, access);
        setLegend(nextLegend);
        setRows(grid.rows);
    }, [pageId, onAccessChange, refreshToken]);

    useEffect(() => {
        let alive = true;
        (async () => {
            if (!pageId) {
                setLegend(null);
                setRows(null);
                setPageAccess(null);
                onAccessChange?.(null);
                return;
            }
            try {
                const [grid, pageInfo] = await Promise.all([getGrid(pageId), getPage(pageId)]);
                if (!alive) return;
                const pageArchived = pageInfo?.isArchived || page?.isArchived;
                const accessRaw = pageInfo?.access || pageInfo?.pageAccess || pageInfo?.permission;
                const access = pageArchived ? 'READ' : accessRaw;
                setPageAccess(access);
                setArchived(!!pageArchived);
                onAccessChange?.({ accessRaw, effectiveAccess: access, isArchived: !!pageArchived });
                setLegend(applyPageAccess(grid.legend, access));
                setRows(grid.rows);
            } catch {
                if (alive) {
                    setLegend(null);
                    setRows(null);
                    setPageAccess(null);
                    setArchived(!!page?.isArchived);
                    onAccessChange?.(null);
                }
            }
        })();
        return () => { alive = false; };
    }, [pageId, refreshToken]);

    function localPatch(rowId, side, columnKey, partialCell) {
        setRows(prev => {
            if (!prev) return prev;
            return prev.map(group => {
                if (side === 'LEFT' && group.leftRowId === rowId) {
                    const nl = { ...(group.dataLeft||{}) };
                    nl[columnKey] = { ...(nl[columnKey]||{}), ...partialCell };
                    return { ...group, dataLeft: nl };
                }
                if (side === 'RIGHT') {
                    const rights = (group.rights||[]).map(r => {
                        if (r.rightRowId === rowId) {
                            const nr = { ...(r.dataRight||{}) };
                            nr[columnKey] = { ...(nr[columnKey]||{}), ...partialCell };
                            return { ...r, dataRight: nr };
                        }
                        return r;
                    });
                    return { ...group, rights };
                }
                return group;
            });
        });
    }

    if (!pageId || !legend || !rows) return null;

    return (
        <DataGrid
            pageId={pageId}
            legend={legend}
            rows={rows}
            onLocalPatch={localPatch}
            onReload={reload}   // ← сюда
            pageAccess={pageAccess}
            readOnly={archived}
            allowReadFilters={archived}
        />
    );
}
