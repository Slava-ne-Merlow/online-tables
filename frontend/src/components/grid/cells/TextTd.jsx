import { useEffect, useRef } from 'react';
import s from '../../../styles/Grid.module.css';

export default function TextTd({ cell, editable, onCommit, tdProps }) {
    const ref = useRef(null);
    const initial = cell?.value ?? '';

    useEffect(() => {
        if (ref.current && ref.current.textContent !== initial) {
            ref.current.textContent = initial;
        }
    }, [initial]);

    function onBlur() {
        if (!editable) return;
        const next = ref.current?.textContent || '';
        if (next === initial) return;
        onCommit({ dataType: 'TEXT', value: next });
    }

    return (
        <td
            {...tdProps}
            className={`${s.td} ${editable ? s.tdEditable : s.tdReadonly}`}
            contentEditable={!!editable}
            suppressContentEditableWarning
            ref={ref}
            onBlur={onBlur}
        />
    );
}
