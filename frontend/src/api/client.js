import { token } from './auth';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://192.168.10.227:8080' ;

function authHeaders() {
    const t = token.get();
    if (!t) throw new Error('NO_TOKEN');
    return { Authorization: `Bearer ${t}` };
}

export async function signIn({ email, password }) {
    const res = await fetch(`${BASE_URL}/api/auth/sign-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw await res.json().catch(() => new Error('AUTH_FAILED'));
    return res.json();
}

export async function getPages() {
    const res = await fetch(`${BASE_URL}/api/pages`, {
        headers: { ...authHeaders() },
    });
    if (!res.ok) throw await res.json().catch(() => new Error('PAGES_FAILED'));
    return res.json();
}

export async function getPage(pageId) {
    const res = await fetch(`${BASE_URL}/api/pages/${pageId}`, {
        headers: { ...authHeaders() },
    });
    if (!res.ok) throw await res.json().catch(() => new Error('PAGE_FAILED'));
    return res.json();
}

export async function getColumns({ pageId, side }) {
    const sideParam = String(side).toUpperCase();
    const res = await fetch(`${BASE_URL}/api/pages/${pageId}/columns?side=${sideParam}`, {
        headers: { ...authHeaders() },
    });
    if (!res.ok) throw await res.json().catch(() => new Error('COLUMNS_FAILED'));
    return res.json();
}

export async function addPage(name) {
    const res = await fetch(`${BASE_URL}/api/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ name }),
    });
    if (!res.ok) throw await res.json().catch(() => new Error('ADD_PAGE_FAILED'));
    return res.json();
}

export async function renamePage({ pageId, name }) {
    const res = await fetch(`${BASE_URL}/api/pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ name }),
    });
    if (!res.ok) throw await res.json().catch(() => new Error('RENAME_PAGE_FAILED'));
    return res.json();
}

export async function deletePage(pageId) {
    const res = await fetch(`${BASE_URL}/api/pages/${pageId}`, {
        method: 'DELETE',
        headers: { ...authHeaders() },
    });
    if (!res.ok) throw await res.json().catch(() => new Error('DELETE_PAGE_FAILED'));
    return res.json();
}

export async function togglePageArchive(pageId) {
    const res = await fetch(`${BASE_URL}/api/pages/${pageId}/toggle-archive`, {
        method: 'PATCH',
        headers: { ...authHeaders() },
    });
    if (!res.ok) throw await res.json().catch(() => new Error('TOGGLE_ARCHIVE_FAILED'));
    return res.json();
}

export async function duplicatePage(pageId) {
    const res = await fetch(`${BASE_URL}/api/pages/${pageId}/duplicate`, {
        method: 'POST',
        headers: { ...authHeaders() },
    });
    if (!res.ok) throw await res.json().catch(() => new Error('DUPLICATE_PAGE_FAILED'));
    return res.json();
}

/* ---------- GRID API ---------- */

// Получить грид страницы
export async function getGrid(pageId) {
    const res = await fetch(`${BASE_URL}/api/pages/${pageId}/grid`, {
        headers: { ...authHeaders() },
    });
    if (!res.ok) throw await res.json().catch(() => new Error('GRID_FAILED'));
    return res.json();
}

// Обновить ячейку (PATCH), тело: { dataType, value }
export async function updateCell({ pageId, rowId, side, columnKey, dataType, value }) {
    const sidePath = String(side).toUpperCase(); // LEFT | RIGHT
    const res = await fetch(
        `${BASE_URL}/api/pages/${pageId}/rows/${rowId}/cells/${sidePath}/${encodeURIComponent(columnKey)}`,
        {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ dataType, value }),
        }
    );
    if (!res.ok) throw await res.json().catch(() => new Error('CELL_UPDATE_FAILED'));
    return res.json();
}

export async function getSelectorOptions(pageId, columnId) {
    const res = await fetch(`${BASE_URL}/api/pages/${pageId}/selectors/${columnId}/options`, {
        headers: { ...authHeaders() },
    });
    if (!res.ok) throw await res.json().catch(() => new Error('SELECTOR_OPTS_FAILED'));
    return res.json();
}

export async function addSelectorOption({ pageId, columnId, label, value }) {
    const res = await fetch(`${BASE_URL}/api/pages/${pageId}/selectors/${columnId}/options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ label, value }),
    });
    if (!res.ok) throw await res.json().catch(() => new Error('SELECTOR_ADD_FAILED'));
    return res.json();
}

export async function updateSelectorOption({ pageId, optionId, label, value }) {
    const res = await fetch(`${BASE_URL}/api/pages/${pageId}/selectors/options/${optionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ label, value }),
    });
    if (!res.ok) throw await res.json().catch(() => new Error('SELECTOR_UPDATE_FAILED'));
    return res.json();
}

export async function deleteSelectorOption({ pageId, optionId }) {
    const res = await fetch(`${BASE_URL}/api/pages/${pageId}/selectors/options/${optionId}`, {
        method: 'DELETE',
        headers: { ...authHeaders() },
    });
    if (!res.ok) throw await res.json().catch(() => new Error('SELECTOR_DELETE_FAILED'));
    return res.json();
}

export async function updateSelectorOptionsOrder({ pageId, columnId, optionIds }) {
    const res = await fetch(`${BASE_URL}/api/pages/${pageId}/selectors/${columnId}/options/order`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ optionIds }),
    });
    if (!res.ok) throw await res.json().catch(() => new Error('SELECTOR_ORDER_FAILED'));
    return res.json();
}

export async function addColumn({ pageId, side, columnType, name, position, options }) {
    const sideParam = String(side).toUpperCase();
    const typeParam = String(columnType).toUpperCase();
    const res = await fetch(
        `${BASE_URL}/api/pages/${pageId}/columns?side=${sideParam}&columnType=${typeParam}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({
                name,
                position,
                type: typeParam,
                ...(options ? { options } : {}),
            }),
        }
    );
    if (!res.ok) throw await res.json().catch(() => new Error('ADD_COLUMN_FAILED'));
    return res.json();
}

export async function updateColumn({ pageId, columnId, name }) {
    const res = await fetch(`${BASE_URL}/api/pages/${pageId}/columns/${columnId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ name }),
    });
    if (!res.ok) throw await res.json().catch(() => new Error('UPDATE_COLUMN_FAILED'));
    return res.json();
}

export async function deleteColumn(pageId, columnId) {
    const res = await fetch(`${BASE_URL}/api/pages/${pageId}/columns/${columnId}`, {
        method: 'DELETE',
        headers: { ...authHeaders() },
    });
    if (!res.ok) throw await res.json().catch(() => new Error('DELETE_COLUMN_FAILED'));
    return res.json();
}

export async function uploadFile(file) {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${BASE_URL}/files`, {
        method: 'POST',
        headers: { ...authHeaders() },
        body: form,
    });
    if (!res.ok) throw await res.json().catch(() => new Error('FILE_UPLOAD_FAILED'));
    return res.json();
}

export function fileDownloadUrl(fileId) {
    return `${BASE_URL}/files/${fileId}`;
}

export async function clearFileCell({ pageId, rowId, side, columnKey }) {
    return await updateCell({
        pageId,
        rowId,
        side,
        columnKey,
        dataType: 'FILE',
        value: null,
    });
}

// ---------- ROWS ----------
export async function addRow(pageId) {
    const res = await fetch(`${BASE_URL}/api/pages/${pageId}/rows`, {
        method: 'POST',
        headers: { ...authHeaders() },
    });
    if (!res.ok) throw await res.json().catch(() => new Error('ADD_ROW_FAILED'));
    return res.json(); // LeftRow
}

export async function addRightRow(pageId, leftRowId) {
    const res = await fetch(`${BASE_URL}/api/pages/${pageId}/rows/${leftRowId}/right`, {
        method: 'POST',
        headers: { ...authHeaders() },
    });
    if (!res.ok) throw await res.json().catch(() => new Error('ADD_RIGHT_FAILED'));
    return res.json(); // RightRow
}

export async function deleteRightRow(pageId, rightRowId) {
    const res = await fetch(`${BASE_URL}/api/pages/${pageId}/right/${rightRowId}`, {
        method: 'DELETE',
        headers: { ...authHeaders() },
    });
    if (!res.ok) throw await res.json().catch(() => new Error('DEL_RIGHT_FAILED'));
    return res.json(); // { rightDeleted, leftDeleted }
}

export async function deleteLeftRow(pageId, leftRowId) {
    const res = await fetch(`${BASE_URL}/api/pages/${pageId}/left/${leftRowId}`, {
        method: 'DELETE',
        headers: { ...authHeaders() },
    });
    if (!res.ok) throw await res.json().catch(() => new Error('DEL_LEFT_FAILED'));
    return res.json(); // { leftDeleted, rightsDeletedCount }
}

export async function exportPage(pageId) {
    const res = await fetch(`${BASE_URL}/api/pages/${pageId}/export`, {
        headers: { ...authHeaders() },
    });
    if (!res.ok) throw await res.json().catch(() => new Error('EXPORT_PAGE_FAILED'));
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="([^"]+)"/i);
    const filename = match ? match[1] : 'page.xlsx';
    return { blob, filename };
}

export async function mergeLeftRows({ pageId, leftRowIds, values }) {
    const res = await fetch(`${BASE_URL}/api/pages/${pageId}/merge-left-rows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ leftRowIds, values }),
    });
    if (!res.ok) throw await res.json().catch(() => new Error('MERGE_LEFT_ROWS_FAILED'));
    return res.json();
}

export async function createPageShare(pageId) {
    const res = await fetch(`${BASE_URL}/api/pages/${pageId}/share`, {
        method: 'POST',
        headers: { ...authHeaders() },
    });
    if (!res.ok) throw await res.json().catch(() => new Error('SHARE_CREATE_FAILED'));
    return res.json();
}

export async function getSharedGrid(token) {
    const res = await fetch(`${BASE_URL}/api/share/${encodeURIComponent(token)}/grid`);
    if (!res.ok) throw await res.json().catch(() => new Error('SHARE_GRID_FAILED'));
    return res.json();
}
// ---------- ACCESS ----------
export async function getAccessMe() {
    const res = await fetch(`${BASE_URL}/api/access/me`, {
        headers: { ...authHeaders() },
    });
    if (!res.ok) throw await res.json().catch(() => new Error('ACCESS_ME_FAILED'));
    return res.json();
}

export async function getUserAccess() {
    const res = await fetch(`${BASE_URL}/api/access/users`, {
        headers: { ...authHeaders() },
    });
    if (!res.ok) throw await res.json().catch(() => new Error('ACCESS_USERS_FAILED'));
    return res.json();
}

export async function updateUserAccess({ userId, access }) {
    const res = await fetch(`${BASE_URL}/api/access/users`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ userId, access }),
    });
    if (!res.ok) throw await res.json().catch(() => new Error('UPDATE_ACCESS_FAILED'));
    return res.json();
}

export async function registerUser({ name, email, access }) {
    const res = await fetch(`${BASE_URL}/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ name, email, access }),
    });
    if (!res.ok) throw await res.json().catch(() => new Error('REGISTER_USER_FAILED'));
    return res.json();
}
