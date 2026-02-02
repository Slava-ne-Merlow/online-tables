import { useEffect, useRef } from 'react';
import s from '../../../styles/Grid.module.css';
import { formatDateDisplay, maskDateInput, parseDateToISO } from '../../../utils/formatters';

export default function DateTd({ cell, editable, onCommit, tdProps }) {
    const ref = useRef(null);
    const initialDisplay = formatDateDisplay(cell?.value);
    const initial = (cell?.value ?? '')

    useEffect(() => {
        if (ref.current && ref.current.textContent !== initialDisplay) {
            ref.current.textContent = initialDisplay;
        }
    }, [initialDisplay]);

    function onInput() {
        const el = ref.current;
        if (!el) return;
        el.textContent = maskDateInput(el.textContent, el.textContent);
        placeCaretAtEnd(el);
    }

    function onBlur() {
        if (!editable) return;
        const txt = (ref.current?.textContent || '').trim();
        if (txt === '') {
            // ПУСТО: отправляем null и оставляем ячейку пустой
            if (txt === initial) return;

            onCommit({ dataType: 'DATE', value: null });
            if (ref.current) ref.current.textContent = '';
            return;
        }
        const iso = parseDateToISO(txt);
        const prevIso = cell?.value || null;
        if (!iso || !isValidDateIso(iso)) {
            // невалидно — откат
            if (ref.current) ref.current.textContent = initialDisplay;
            showToast('Неверный формат даты', 'error');
            return;
        }
        if (iso !== prevIso) onCommit({ dataType: 'DATE', value: iso });
        if (ref.current) ref.current.textContent = formatDateDisplay(iso);
    }

    return (
        <td
            {...tdProps}
            className={`${s.td} ${editable ? s.tdEditable : s.tdReadonly}`}
            contentEditable={!!editable}
            suppressContentEditableWarning
            ref={ref}
            onInput={onInput}
            onBlur={onBlur}
        />
    );
}

function placeCaretAtEnd(el) {
    const r = document.createRange();
    r.selectNodeContents(el);
    r.collapse(false);
    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
}

function isValidDateIso(iso) {
    const parts = String(iso).split('-');
    if (parts.length !== 3) return false;
    const [y, m, d] = parts.map(n => Number(n));
    if (!y || !m || !d) return false;
    if (m < 1 || m > 12) return false;
    if (d < 1 || d > 31) return false;
    const dt = new Date(Date.UTC(y, m - 1, d));
    return (
        dt.getUTCFullYear() === y &&
        dt.getUTCMonth() === m - 1 &&
        dt.getUTCDate() === d
    );
}

function showToast(message, type = 'success') {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('app:toast', {
        detail: { message, type },
    }));
}
