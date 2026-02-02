import { useCallback, useEffect, useState } from 'react';
import { getSharedGrid } from '../api/client';
import DataGrid from '../components/grid/DataGrid';

export default function SharedPageView({ token }) {
    const [legend, setLegend] = useState(null);
    const [rows, setRows] = useState(null);

    const reload = useCallback(async () => {
        if (!token) {
            setLegend(null);
            setRows(null);
            return;
        }
        const grid = await getSharedGrid(token);
        setLegend(grid.legend);
        setRows(grid.rows);
    }, [token]);

    useEffect(() => {
        let alive = true;
        (async () => {
            if (!token) {
                setLegend(null);
                setRows(null);
                return;
            }
            try {
                const grid = await getSharedGrid(token);
                if (!alive) return;
                setLegend(grid.legend);
                setRows(grid.rows);
            } catch {
                if (alive) {
                    setLegend(null);
                    setRows(null);
                }
            }
        })();
        return () => { alive = false; };
    }, [token]);

    if (!token || !legend || !rows) return null;

    return (
        <DataGrid
            pageId={null}
            legend={legend}
            rows={rows}
            onLocalPatch={() => {}}
            onReload={reload}
            readOnly
            pageAccess="READ"
            allowReadFilters
        />
    );
}
