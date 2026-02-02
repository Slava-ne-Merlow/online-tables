import { useEffect, useRef } from 'react';
import s from '../../../styles/Grid.module.css';
import { formatNumberDisplay, parseNumberToDecimalString } from '../../../utils/formatters';

export default function NumberTd({ cell, editable, onCommit, tdProps }) {
    const ref = useRef(null);
    const initialDisplay = formatNumberDisplay(cell?.value);

    useEffect(() => {
        if (ref.current && ref.current.textContent !== initialDisplay) {
            ref.current.textContent = initialDisplay;
        }
    }, [initialDisplay]);

    function onInput() {
        const el = ref.current;
        if (!el) return;

        let raw = el.textContent.replace(/[^\d,\s+\-]/g, '');
        raw = raw.replace(/\s+/g, '');

        // 2) Нормализуем знак: один ведущий +/-
        raw = raw.replace(/(?!^)[+\-]/g, '');
        const sign = raw.startsWith('-') ? '-' : (raw.startsWith('+') ? '+' : '');
        raw = raw.replace(/^[+\-]/, '');

        const parts = raw.split(',');
        let int = parts[0] || '';
        let frac = (parts[1] || '').slice(0, 2);
        const hasComma = parts.length > 1;

        int = int.replace(/^0+(?=\d)/, '');


        const intGrouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

        const pretty = sign + (hasComma ? `${intGrouped},${frac}` : intGrouped);

        // 7) Обновляем текст и каретку
        el.textContent = pretty;
        placeCaretAtEnd(el);
    }

    function onBlur() {
        if (!editable) return;
        const raw = (ref.current?.textContent || '').trim();
        if (raw === '') {
            if (ref.current) ref.current.textContent = initialDisplay;
            return;
        }
        const dec = parseNumberToDecimalString(raw);
        if (dec == null) {
            if (ref.current) ref.current.textContent = initialDisplay;
            return;
        }
        const desiredScale = getScaleFromInput(raw);
        const formatted = formatNumberDisplayWithScale(dec, desiredScale);
        const prevDec = parseNumberToDecimalString(initialDisplay.replace(/\s/g,''));
        if (dec !== prevDec) onCommit({ dataType: 'NUMBER', value: Number(dec) });
        if (ref.current) ref.current.textContent = formatted; // нормализуем в любом случае
    }

    return (
        <td
            {...tdProps}
            className={`${s.td} ${editable ? s.tdEditable : s.tdReadonly}`}
            style={{whiteSpace: 'nowrap'}}
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

function getScaleFromInput(raw) {
    const parts = String(raw).replace(/\s+/g, '').split(',');
    if (parts.length < 2) return 0;
    return Math.min(2, parts[1].length || 0);
}

function formatNumberDisplayWithScale(decString, scale) {
    if (decString === null || decString === undefined || decString === '') return '';
    const s = String(decString);
    const sign = s.startsWith('-') ? '-' : '';
    const [intRaw, fracRaw = ''] = s.replace('-', '').split('.');
    const intSpaced = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const frac = scale > 0 ? fracRaw.padEnd(scale, '0').slice(0, scale) : '';
    return sign + (scale > 0 ? `${intSpaced},${frac}` : intSpaced);
}
