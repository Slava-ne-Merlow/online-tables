import React from 'react';
import s from '../../styles/Grid.module.css';
import SelectorDropdown from './SelectorDropdown';

export default function AddColumnPanel({
    name,
    onNameChange,
    side,
    showSideSelector,
    sideOptions,
    onSideChange,
    type,
    typeOptions,
    onTypeChange,
    onTypeOpenChange,
    options,
    onOptionAdd,
    onOptionChange,
    onOptionRemove,
    error,
    onSubmit,
    submitDisabled,
}) {
    const isSelector = String(type || '').toUpperCase() === 'SELECTOR';

    return (
        <div className={s.addColumnField}>
            <input
                className={s.selectorField}
                value={name}
                onChange={e => onNameChange(e.target.value)}
                placeholder="Название"
            />
            {showSideSelector && sideOptions && onSideChange && (
                <SelectorDropdown
                    value={side}
                    options={sideOptions}
                    onChange={onSideChange}
                />
            )}
            <SelectorDropdown
                value={type}
                options={typeOptions}
                onChange={onTypeChange}
                onOpenChange={onTypeOpenChange}
            />
            {isSelector && (
                <div className={s.addColumnOptions}>
                    {options.length !== 0 && (
                        <div className={s.addColumnOptionsList}>
                            {options.map(opt => (
                                <div key={opt.id} className={s.addColumnOptionRow}>
                                    <input
                                        className={s.selectorField}
                                        value={opt.label}
                                        onChange={e => onOptionChange(opt.id, e.target.value)}
                                        placeholder="Название опции"
                                    />
                                    <button
                                        type="button"
                                        className={s.btnDanger}
                                        style={{ width: '100%', height: '100%' }}
                                        onClick={() => onOptionRemove(opt.id)}
                                        aria-label="Удалить опцию"
                                    >
                                        x
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    <button
                        type="button"
                        className={s.ctxItem}
                        onClick={onOptionAdd}
                    >
                        Добавить опцию
                    </button>
                    {error && (
                        <div className={s.addColumnError}>{error}</div>
                    )}
                </div>
            )}
            <button
                type="button"
                className={s.addColumnSubmit}
                onClick={onSubmit}
                disabled={submitDisabled}
            >
                Добавить
            </button>
        </div>
    );
}
