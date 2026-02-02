import { useEffect, useRef } from 'react';
import s from '../../../styles/Grid.module.css';

export default function TextTd({ cell, editable, onCommit, tdProps }) {
    const ref = useRef(null);
    const initial = (cell?.value ?? '').slice(0, 100);

    useEffect(() => {
        if (ref.current && ref.current.textContent !== initial) {
            ref.current.textContent = initial;
        }
    }, [initial]);

    function onBlur() {
        if (!editable) return;
        const next = (ref.current?.textContent || '').slice(0, 100);
        if (next === initial) return;
        onCommit({ dataType: 'TEXT', value: next });
    }

    function onInput() {
        const el = ref.current;
        if (!el) return;
        if (el.textContent.length > 100) {
            el.textContent = el.textContent.slice(0, 100);
            placeCaretAtEnd(el);
        }
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
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}