import { useEffect, useState } from 'react';
import css from '../styles/Header.module.css';
import { token } from '../api/auth';
import addRowSvg from '../assets/icons/add-row.svg';
import addColumnSvg from '../assets/icons/add-column.svg';
import mergeRowsSvg from '../assets/icons/merge-rows.svg';
import downloadSvg from '../assets/icons/download.svg';

export default function Header({ user, onLoginClick, onProfileClick }) {
    const isAuthed = !!token.get();
    const displayName = user?.name || user?.login || '';
    const avatarLetter = String(displayName || '').trim().charAt(0).toUpperCase();
    const [gridState, setGridState] = useState({
        canAddRow: false,
        canAddColumnLeft: true,
        canAddColumnRight: true,
        canUndo: false,
        canRedo: false,
        accessLevel: 'MANAGE',
        mergeMode: false,
        mergeSelectedCount: 0,
        canMerge: false,
    });

    useEffect(() => {
        function handleGridState(event) {
            if (!event?.detail) return;
            setGridState(prev => ({ ...prev, ...event.detail }));
        }

        window.addEventListener('grid:state', handleGridState);
        return () => window.removeEventListener('grid:state', handleGridState);
    }, []);

    function dispatchGridAction(type, extra = {}) {
        window.dispatchEvent(new CustomEvent('grid:action', { detail: { type, ...extra } }));
    }

    function handleAddColumnClick(event) {
        const rect = event.currentTarget.getBoundingClientRect();
        dispatchGridAction('add-column', {
            anchorRect: {
                left: rect.left,
                right: rect.right,
                top: rect.top,
                bottom: rect.bottom,
                width: rect.width,
                height: rect.height,
            },
        });
    }

    return (
        <header className={css.header}>
            <div className={css.main}>
                {(() => {
                    const accessLevel = String(gridState.accessLevel || 'MANAGE').toUpperCase();
                    const showEditActions = accessLevel !== 'READ';
                    const showAddColumn = accessLevel === 'MANAGE';
                    return (
                <div className={css.actionsRow}>
                    {showEditActions && (
                        <button
                            type="button"
                            className={css.iconBtn}
                            onClick={() => dispatchGridAction('undo')}
                            title="Откат работает только для заполнения ячейки"
                            aria-label="Отменить заполнение"
                            disabled={!gridState.canUndo}
                        >
                            <svg viewBox="0 0 20 20" aria-hidden="true">
                                <path d="M7.5 4.5 3 9l4.5 4.5M4 9h7a5 5 0 1 1 0 10" />
                            </svg>
                        </button>
                    )}
                    {showEditActions && (
                        <button
                            type="button"
                            className={css.iconBtn}
                            onClick={() => dispatchGridAction('redo')}
                            title="Откат работает только для заполнения ячейки"
                            aria-label="Повторить заполнение"
                            disabled={!gridState.canRedo}
                        >
                            <svg viewBox="0 0 20 20" aria-hidden="true">
                                <path d="m12.5 4.5 4.5 4.5-4.5 4.5M16 9H9a5 5 0 1 0 0 10" />
                            </svg>
                        </button>
                    )}
                    {showEditActions && (
                        <button
                            type="button"
                            className={css.iconBtn}
                            onClick={() => dispatchGridAction('add-row')}
                            title="Добавить строку"
                            aria-label="Добавить строку"
                            disabled={!gridState.canAddRow}
                        >
                            <img className={css.actionIcon} src={addRowSvg} alt="" aria-hidden="true" />
                        </button>
                    )}
                    {showEditActions && showAddColumn && (
                        <button
                            type="button"
                            className={css.iconBtn}
                            onClick={handleAddColumnClick}
                            title="Добавить столбец"
                            aria-label="Добавить столбец"
                            disabled={!gridState.canAddColumnLeft && !gridState.canAddColumnRight}
                        >
                            <img className={css.actionIcon} src={addColumnSvg} alt="" aria-hidden="true" />
                        </button>
                    )}
                    {showEditActions && (
                        <button
                            type="button"
                            className={css.iconBtn}
                            onClick={() => dispatchGridAction('merge-rows')}
                            title="Объединить строки"
                            aria-label="Объединить строки"
                        >
                            <img className={css.actionIcon} src={mergeRowsSvg} alt="" aria-hidden="true" />
                        </button>
                    )}
                    <button
                        type="button"
                        className={css.iconBtn}
                        onClick={() => dispatchGridAction('export')}
                        title="Экспорт страницы в Excel"
                        aria-label="Экспорт страницы в Excel"
                    >
                        <img className={css.actionIcon} src={downloadSvg} alt="" aria-hidden="true" />
                    </button>
                    {gridState.mergeMode && (
                        <div className={css.mergeHeaderBox}>
                            <span className={css.mergeHeaderText}>
                                Выбрано: {gridState.mergeSelectedCount}
                            </span>
                            <button
                                type="button"
                                className={css.mergeHeaderBtn}
                                onClick={() => dispatchGridAction('merge-open')}
                                disabled={!gridState.canMerge}
                            >
                                Объединить
                            </button>
                            <button
                                type="button"
                                className={css.mergeHeaderBtnGhost}
                                onClick={() => dispatchGridAction('merge-cancel')}
                            >
                                Отмена
                            </button>
                        </div>
                    )}
                </div>
                    );
                })()}
            </div>
            <div className={css.account}>
                {isAuthed ? (
                    <>
                        <div className={css.accountRow}>
                            <span className={css.user}>{user?.name || user?.login}</span>
                        </div>
                        <div className={css.accountRow}>
                            <button id="btn-account" className={css.userBtn} onClick={onProfileClick}>
                                <span className={css.avatar} aria-hidden>
                                    <span className={css.avatarLetter}>{avatarLetter || 'U'}</span>
                                </span>
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className={css.accountRow} />
                        <div className={css.accountRow}>
                            <button className={css.btn} onClick={onLoginClick}>Войти</button>
                        </div>
                    </>
                )}
            </div>
        </header>
    );
}
