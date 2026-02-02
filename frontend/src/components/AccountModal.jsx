import React, { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from '../styles/Modal.module.css';
import s from '../styles/Grid.module.css';
import SelectorDropdown from './grid/SelectorDropdown.jsx';
import plusSvg from '../assets/icons/plus.svg';
import copyIcon from '../assets/icons/copy-icon.svg';
import {
    createPageShare,
    getColumns,
    getPages,
    getUserAccess,
    registerUser,
    updateUserAccess,
} from '../api/client';


const AccountModal = React.forwardRef(function AccountModal(
    {user, onLogout, onClose, toggleSelector, showArchivedPages, onShowArchivedPagesChange},
    ref
) {

    const boxRef = useRef(null);
    const [closing, setClosing] = useState(false);
    const [theme, setTheme] = useState(() => {
        const stored = localStorage.getItem('app-theme');
        return stored === 'DARK' ? 'DARK' : 'LIGHT';
    });
    const themeOptions = [
        { value: 'LIGHT', label: 'Светлый' },
        { value: 'DARK', label: 'Темный' },
    ];
    const archiveOptions = [
        { value: 'HIDE', label: 'Скрывать архив' },
        { value: 'SHOW', label: 'Показать архив' },
    ];
    const isAdmin = String(user?.role || '').toUpperCase() === 'ADMIN';
    const displayName = user?.name || user?.email || 'Пользователь';
    const subLine = user?.email ? user.email : '';
    const avatarLetter = String(displayName || '').trim().charAt(0).toUpperCase() || 'U';
    const [adminPanel, setAdminPanel] = useState(null);
    const [panelTop, setPanelTop] = useState(0);
    const [panelMaxHeight, setPanelMaxHeight] = useState(0);
    const panelHideRef = useRef(null);
    const linksBtnRef = useRef(null);
    const [pagesMeta, setPagesMeta] = useState(null);
    const [pagesLoading, setPagesLoading] = useState(false);
    const [pagesList, setPagesList] = useState(null);
    const [pagesListLoading, setPagesListLoading] = useState(false);
    const [shareBusyId, setShareBusyId] = useState(null);
    const [shareLinks, setShareLinks] = useState({});
    const [toast, setToast] = useState(null);
    const toastTimerRef = useRef(null);
    const [registerName, setRegisterName] = useState('');
    const [registerEmail, setRegisterEmail] = useState('');
    const [registerAccess, setRegisterAccess] = useState({});
    const [registerBusy, setRegisterBusy] = useState(false);
    const [registerOpenPages, setRegisterOpenPages] = useState({});
    const [usersAccess, setUsersAccess] = useState([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [openUserId, setOpenUserId] = useState(null);
    const [userAccessEdits, setUserAccessEdits] = useState({});
    const [userOpenPages, setUserOpenPages] = useState({});
    const [saveBusyUserId, setSaveBusyUserId] = useState(null);

    useEffect(() => {
        const next = theme === 'DARK' ? 'DARK' : 'LIGHT';
        document.documentElement.dataset.theme = next;
        localStorage.setItem('app-theme', next);
    }, [theme]);

    const accessOptionsAll = useMemo(
        () => [
            { value: 'NO', label: 'Нет' },
            { value: 'READ', label: 'Чтение' },
            { value: 'WRITE', label: 'Запись' },
        ],
        []
    );
    const pageAccessOptions = useMemo(
        () => [
            { value: 'NO', label: 'Нет' },
            { value: 'READ', label: 'Чтение' },
            { value: 'WRITE', label: 'Запись' },
            { value: 'MANAGE', label: 'Управление' },
        ],
        []
    );

    function allowedColumnOptions(pageAccess) {
        if (pageAccess === 'NO') return accessOptionsAll.filter(opt => opt.value === 'NO');
        if (pageAccess === 'READ') return accessOptionsAll.filter(opt => opt.value !== 'WRITE');
        return accessOptionsAll;
    }

    async function loadPagesMeta() {
        if (pagesLoading || pagesMeta) return;
        setPagesLoading(true);
        try {
            const pages = await getPages();
            const meta = await Promise.all(
                (pages || []).map(async (page) => {
                    const [leftCols, rightCols] = await Promise.all([
                        getColumns({ pageId: page.id, side: 'LEFT' }),
                        getColumns({ pageId: page.id, side: 'RIGHT' }),
                    ]);
                    return {
                        pageId: page.id,
                        name: page.name,
                        leftCols: leftCols || [],
                        rightCols: rightCols || [],
                    };
                })
            );
            setPagesMeta(meta);
        } catch (e) {
            console.error('Load pages meta failed', e);
            setPagesMeta([]);
        } finally {
            setPagesLoading(false);
        }
    }

    function initAccessState(meta) {
        const next = {};
        (meta || []).forEach((page) => {
            const columns = {};
            [...page.leftCols, ...page.rightCols].forEach(col => {
                columns[col.id] = 'NO';
            });
            next[page.pageId] = { pageAccess: 'NO', columns };
        });
        return next;
    }

    useEffect(() => {
        if (!isAdmin) return;
        if (adminPanel === 'register' || adminPanel === 'access') {
            loadPagesMeta();
        }
    }, [adminPanel, isAdmin]);

    useEffect(() => {
        if (!isAdmin) return;
        if (adminPanel !== 'links') return;
        if (pagesListLoading || pagesList) return;
        setPagesListLoading(true);
        getPages()
            .then((list) => setPagesList(list || []))
            .catch((e) => {
                console.error('Load pages list failed', e);
                setPagesList([]);
            })
            .finally(() => setPagesListLoading(false));
    }, [adminPanel, isAdmin, pagesListLoading, pagesList]);

    useEffect(() => {
        if (pagesMeta && Object.keys(registerAccess).length === 0) {
            setRegisterAccess(initAccessState(pagesMeta));
        }
    }, [pagesMeta, registerAccess]);

    useEffect(() => {
        if (adminPanel !== 'access') return;
        if (usersLoading || usersAccess.length) return;
        setUsersLoading(true);
        getUserAccess()
            .then((list) => setUsersAccess(list || []))
            .catch((e) => {
                console.error('Load user access failed', e);
                setUsersAccess([]);
            })
            .finally(() => setUsersLoading(false));
    }, [adminPanel, usersLoading, usersAccess.length]);

    function closeWithAnim() {
        if (closing) return;
        setClosing(true);
        setTimeout(onClose, 150);
    }

    function cancelHidePanel() {
        if (panelHideRef.current) {
            clearTimeout(panelHideRef.current);
            panelHideRef.current = null;
        }
    }

    function scheduleHidePanel() {
        cancelHidePanel();
        panelHideRef.current = setTimeout(() => setAdminPanel(null), 160);
    }

    function showPanel(name) {
        cancelHidePanel();
        const modalRect = boxRef.current?.getBoundingClientRect();
        const btnRect = linksBtnRef.current?.getBoundingClientRect();
        const top = modalRect && btnRect
            ? Math.max(8, btnRect.top - modalRect.top - 6)
            : 8;
        setPanelTop(top);
        setAdminPanel(name);
    }

    useEffect(() => {
        if (!adminPanel) return;
        function updatePanelHeight() {
            const modalRect = boxRef.current?.getBoundingClientRect();
            if (!modalRect) return;
            const margin = 20;
            const available = window.innerHeight - (modalRect.top + panelTop) - margin;
            setPanelMaxHeight(Math.max(200, available));
        }
        updatePanelHeight();
        window.addEventListener('resize', updatePanelHeight);
        return () => window.removeEventListener('resize', updatePanelHeight);
    }, [adminPanel, panelTop]);

    function updatePageAccess(state, pageId, nextAccess) {
        const next = { ...state };
        const page = next[pageId] || { pageAccess: 'NO', columns: {} };
        const columns = { ...(page.columns || {}) };
        if (nextAccess === 'NO') {
            Object.keys(columns).forEach((colId) => {
                columns[colId] = 'NO';
            });
        } else if (nextAccess === 'READ') {
            Object.keys(columns).forEach((colId) => {
                if (columns[colId] === 'WRITE') columns[colId] = 'READ';
            });
        }
        next[pageId] = { pageAccess: nextAccess, columns };
        return next;
    }

    function updateColumnAccess(state, pageId, columnId, nextAccess) {
        const next = { ...state };
        const page = next[pageId] || { pageAccess: 'NO', columns: {} };
        const columns = { ...(page.columns || {}) };
        columns[columnId] = nextAccess;
        next[pageId] = { ...page, columns };
        return next;
    }

    function buildAccessPayload(state) {
        return Object.entries(state || {}).map(([pageId, pageState]) => ({
            pageAccess: { pageId, access: pageState.pageAccess },
            columnAccess: Object.entries(pageState.columns || {}).map(([columnId, access]) => ({
                columnId,
                access,
            })),
        }));
    }

    async function handleRegisterSubmit() {
        if (!registerName.trim() || !registerEmail.trim()) return;
        setRegisterBusy(true);
        try {
            await registerUser({
                name: registerName.trim(),
                email: registerEmail.trim(),
                access: buildAccessPayload(registerAccess),
            });
            setRegisterName('');
            setRegisterEmail('');
            setRegisterAccess(initAccessState(pagesMeta || []));
        } catch (e) {
            console.error('Register user failed', e);
        } finally {
            setRegisterBusy(false);
        }
    }

    function normalizeAccessFromApi(accessList) {
        const base = initAccessState(pagesMeta || []);
        (accessList || []).forEach((entry) => {
            const pageId = entry?.pageAccess?.pageId;
            const pageAccess = entry?.pageAccess?.access;
            if (pageId && base[pageId]) {
                base[pageId].pageAccess = pageAccess || 'NO';
            }
            (entry?.columnAccess || []).forEach((col) => {
                if (!pageId || !base[pageId]) return;
                base[pageId].columns[col.columnId] = col.access || 'NO';
            });
        });
        return base;
    }

    function ensureUserAccessState(userId, accessList) {
        setUserAccessEdits(prev => {
            if (prev[userId]) return prev;
            return { ...prev, [userId]: normalizeAccessFromApi(accessList) };
        });
    }

    async function handleSaveUserAccess(userId) {
        const state = userAccessEdits[userId];
        if (!state) return;
        setSaveBusyUserId(userId);
        try {
            await updateUserAccess({ userId, access: buildAccessPayload(state) });
        } catch (e) {
            console.error('Update access failed', e);
        } finally {
            setSaveBusyUserId(null);
        }
    }

    async function handleGenerateShare(pageId) {
        if (!pageId || shareBusyId) return;
        setShareBusyId(pageId);
        try {
            const res = await createPageShare(pageId);
            const urlPart = String(res?.url || (res?.token ? `/share/${res.token}` : '') || '');
            const fullUrl = urlPart.startsWith('http')
                ? urlPart
                : `${window.location.origin}${urlPart}`;
            if (!urlPart) throw new Error('EMPTY_SHARE_URL');
            setShareLinks(prev => ({ ...prev, [pageId]: fullUrl }));
        } catch (e) {
            console.error('Create share link failed', e);
            showToast('Ошибка при создании ссылки', 'error');
        } finally {
            setShareBusyId(null);
        }
    }

    async function handleCopyShare(pageId) {
        const link = shareLinks[pageId];
        if (!link) return;
        const copied = await copyTextToClipboard(link);
        if (copied) {
            showToast('Ссылка скопирована', 'success');
        } else {
            showToast('Не удалось скопировать ссылку', 'error');
        }
    }

    function showToast(message, type = 'success') {
        setToast({ message, type });
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setToast(null), 2200);
    }

    async function copyTextToClipboard(text) {
        if (!text) return false;
        if (navigator.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (err) {
                // fallback
            }
        }
        const input = document.createElement('input');
        input.value = text;
        input.readOnly = true;
        input.style.position = 'fixed';
        input.style.left = '-9999px';
        document.body.appendChild(input);
        input.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(input);
        return !!ok;
    }

    function isPageOpen(stateMap, key) {
        return stateMap[key] !== false;
    }

    function togglePage(stateMapSetter, key) {
        stateMapSetter(prev => ({ ...prev, [key]: !isPageOpen(prev, key) }));
    }

    function renderAccessPages(state, setState, openMap, setOpenMap) {
        if (pagesLoading) {
            return <div className={styles.accountPanelHint}>Загрузка страниц...</div>;
        }
        if (!pagesMeta || pagesMeta.length === 0) {
            return <div className={styles.accountPanelHint}>Нет доступных страниц</div>;
        }

        return (
            <div className={styles.accessPages}>
                {pagesMeta.map((page) => {
                    const pageState = state[page.pageId] || { pageAccess: 'NO', columns: {} };
                    const isOpen = isPageOpen(openMap, page.pageId);
                    const columnOptions = allowedColumnOptions(pageState.pageAccess);
                    const isPageLocked = pageState.pageAccess === 'NO';
                    return (
                        <div key={page.pageId} className={styles.accessPage}>
                            <div className={styles.accessPageHeader}>
                                <button
                                    type="button"
                                    className={styles.accessToggle}
                                    onClick={() => togglePage(setOpenMap, page.pageId)}
                                >
                                    {isOpen ? '–' : '+'}
                                </button>
                                <div className={styles.accessPageTitle}>{page.name}</div>
                                <SelectorDropdown
                                    value={pageState.pageAccess}
                                    options={pageAccessOptions}
                                    onChange={(value) => {
                                        setState(prev => updatePageAccess(prev, page.pageId, value));
                                    }}
                                />
                            </div>
                            {isOpen && (
                                <div className={styles.accessColumns}>
                                    <div className={styles.accessSide}>
                                        <div className={styles.accessSideTitle}>Левая часть</div>
                                        {page.leftCols.map(col => (
                                            <div key={col.id} className={styles.accessRow}>
                                                <div className={styles.accessLabel}>{col.name}</div>
                                                <SelectorDropdown
                                                    value={pageState.columns[col.id] || 'NO'}
                                                    options={columnOptions}
                                                    onChange={(value) => {
                                                        setState(prev => updateColumnAccess(prev, page.pageId, col.id, value));
                                                    }}
                                                    disabled={isPageLocked}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <div className={styles.accessSide}>
                                        <div className={styles.accessSideTitle}>Правая часть</div>
                                        {page.rightCols.map(col => (
                                            <div key={col.id} className={styles.accessRow}>
                                                <div className={styles.accessLabel}>{col.name}</div>
                                                <SelectorDropdown
                                                    value={pageState.columns[col.id] || 'NO'}
                                                    options={columnOptions}
                                                    onChange={(value) => {
                                                        setState(prev => updateColumnAccess(prev, page.pageId, col.id, value));
                                                    }}
                                                    disabled={isPageLocked}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }

    useImperativeHandle(ref, () => ({
        startClose: closeWithAnim,
    }), [closing]);

    useEffect(() => {
        function handleOutside(e) {
            if (toggleSelector && e.target.closest(toggleSelector)) return;
            const target = e.target;
            if (target && target.closest && target.closest('[data-selector-popover="true"]')) return;
            if (target && target.closest && target.closest('[data-admin-panel="true"]')) return;
            if (boxRef.current && !boxRef.current.contains(e.target)) closeWithAnim();
        }

        document.addEventListener('click', handleOutside);
        return () => document.removeEventListener('click', handleOutside);
    }, [toggleSelector]);

    return (
        <div
            ref={boxRef}
            className={`${styles.float} ${styles.topRight} ${closing ? styles['anim-slide-down-out'] : styles['anim-slide-down-in']}`}
            style={{ padding: '10px' }}
        >
            <div className={styles.accountHeader}>
                <div className={styles.accountHeaderRow}>
                    <div className={styles.accountBrand}>
                    </div>
                    <button
                        type="button"
                        className={styles.accountClose}
                        onClick={closeWithAnim}
                        aria-label="Закрыть"
                    >
                        <img className={styles.accountCloseIcon} src={plusSvg} alt="" aria-hidden="true" />
                    </button>
                </div>
                <div className={styles.accountAvatar}>{avatarLetter}</div>
                <div className={styles.accountName}>{displayName}</div>
                {subLine && <div className={styles.accountSub}>{subLine}</div>}
            </div>

            {toast && createPortal(
                <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : styles.toastSuccess}`}>
                    {toast.message}
                </div>,
                document.body
            )}

            {adminPanel && (
                <div
                    className={styles.accountPanel}
                    style={{
                        top: panelTop,
                        maxHeight: panelMaxHeight || undefined,
                        '--panel-max-h': panelMaxHeight ? `${panelMaxHeight}px` : undefined,
                    }}
                    onMouseEnter={cancelHidePanel}
                    onMouseLeave={scheduleHidePanel}
                    data-admin-panel="true"
                >
                    {adminPanel === 'links' && (
                        <div className={styles.accountPanelBody}>
                            <div className={styles.accountPanelTitle}>Ссылки для просмотра</div>
                            {pagesListLoading && (
                                <div className={styles.accountPanelHint}>Загрузка страниц...</div>
                            )}
                            {!pagesListLoading && (!pagesList || pagesList.length === 0) && (
                                <div className={styles.accountPanelHint}>Нет страниц</div>
                            )}
                            {!pagesListLoading && pagesList && pagesList.length > 0 && (
                                <div className={styles.shareList}>
                                    {pagesList.map((page) => (
                                        <div key={page.id} className={styles.shareRow}>
                                            <div className={styles.shareName}>{page.name}</div>
                                            <div className={styles.shareActions}>
                                                {shareLinks[page.id] ? (
                                                    <>
                                                        <div className={styles.shareLink}>{shareLinks[page.id]}</div>
                                                        <button
                                                            type="button"
                                                            className={styles.shareIconBtn}
                                                            onClick={() => handleCopyShare(page.id)}
                                                            disabled={shareBusyId === page.id}
                                                            aria-label="Скопировать ссылку"
                                                        >
                                                            <img src={copyIcon} alt="" aria-hidden="true" className={styles.copyIcon}/>
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className={styles.shareBtn}
                                                        onClick={() => handleGenerateShare(page.id)}
                                                        disabled={shareBusyId === page.id}
                                                    >
                                                        Получить ссылку
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {adminPanel === 'register' && (
                        <div className={styles.accountPanelBody}>
                            <div className={styles.accountPanelTitle}>Регистрация аккаунта</div>
                            <div className={styles.accountForm}>
                                <div className={styles.accountField}>
                                    <div className={styles.accountFieldLabel}>Имя</div>
                                    <input
                                        className={styles.input}
                                        value={registerName}
                                        onChange={(e) => setRegisterName(e.target.value)}
                                        placeholder="Имя пользователя"
                                    />
                                </div>
                                <div className={styles.accountField}>
                                    <div className={styles.accountFieldLabel}>Почта</div>
                                    <input
                                        className={styles.input}
                                        value={registerEmail}
                                        onChange={(e) => setRegisterEmail(e.target.value)}
                                        placeholder="email@example.com"
                                    />
                                </div>
                                <button
                                    type="button"
                                    className={styles.accountPrimaryBtn}
                                    onClick={handleRegisterSubmit}
                                    disabled={registerBusy || !registerName.trim() || !registerEmail.trim()}
                                >
                                    Создать аккаунт
                                </button>
                            </div>
                            <div className={styles.accountPanelSection}>Доступы</div>
                            {renderAccessPages(registerAccess, setRegisterAccess, registerOpenPages, setRegisterOpenPages)}
                        </div>
                    )}
                    {adminPanel === 'access' && (
                        <div className={styles.accountPanelBody}>
                            <div className={styles.accountPanelTitle}>Настройка доступов</div>
                            {usersLoading && (
                                <div className={styles.accountPanelHint}>Загрузка пользователей...</div>
                            )}
                            {!usersLoading && usersAccess.length === 0 && (
                                <div className={styles.accountPanelHint}>Пользователи не найдены</div>
                            )}
                            <div className={styles.accessUsers}>
                                {usersAccess.map((item) => {
                                    const userItem = item.user || {};
                                    const isOpen = openUserId === userItem.id;
                                    const currentUserState =
                                        userAccessEdits[userItem.id] || normalizeAccessFromApi(item.access);
                                    const setUserState = (updater) => {
                                        setUserAccessEdits(prev => {
                                            const base = prev[userItem.id] || normalizeAccessFromApi(item.access);
                                            const next = typeof updater === 'function' ? updater(base) : updater;
                                            return { ...prev, [userItem.id]: next };
                                        });
                                    };
                                    return (
                                        <div key={userItem.id} className={styles.accessUserCard}>
                                            <button
                                                type="button"
                                                className={styles.accessUserHeader}
                                                onClick={() => {
                                                    const nextOpen = isOpen ? null : userItem.id;
                                                    setOpenUserId(nextOpen);
                                                    if (!isOpen) {
                                                        ensureUserAccessState(userItem.id, item.access);
                                                    }
                                                }}
                                            >
                                                <span>{userItem.name || userItem.login || userItem.email}</span>
                                                <span className={styles.accessUserRole}>
                                                    {String(userItem.role || '').toUpperCase()}
                                                </span>
                                            </button>
                                            {isOpen && (
                                                <div className={styles.accessUserBody}>
                                                    {renderAccessPages(
                                                        currentUserState,
                                                        setUserState,
                                                        userOpenPages,
                                                        setUserOpenPages
                                                    )}
                                                    <button
                                                        type="button"
                                                        className={styles.accountPrimaryBtn}
                                                        onClick={() => handleSaveUserAccess(userItem.id)}
                                                        disabled={saveBusyUserId === userItem.id}
                                                    >
                                                        Сохранить
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className={s.filterColumnActions}>
                {isAdmin && (
                    <>
                        <button
                            ref={linksBtnRef}
                            type="button"
                            className={s.ctxItem}
                            onMouseEnter={() => showPanel('links')}
                            onMouseLeave={scheduleHidePanel}
                        >
                            Ссылки для просмотра
                        </button>
                        <button
                            type="button"
                            className={s.ctxItem}
                            onMouseEnter={() => showPanel('register')}
                            onMouseLeave={scheduleHidePanel}
                        >
                            Зарегистрировать аккаунт
                        </button>
                        <button
                            type="button"
                            className={s.ctxItem}
                            onMouseEnter={() => showPanel('access')}
                            onMouseLeave={scheduleHidePanel}
                        >
                            Настроить доступы
                        </button>
                        <div className={s.filterDivider} />
                    </>
                )}

                <SelectorDropdown
                    value={theme}
                    options={themeOptions}
                    onChange={setTheme}
                    placeholder="Смена темы"
                />
                <SelectorDropdown
                    value={showArchivedPages ? 'SHOW' : 'HIDE'}
                    options={archiveOptions}
                    onChange={(value) => onShowArchivedPagesChange?.(value === 'SHOW')}
                    placeholder="Архив"
                />
                <div className={s.filterDivider} />

                <button type="button" className={s.ctxItem} onClick={onLogout}>
                    Выйти из аккаунта
                </button>
            </div>
        </div>
    );
});

export default AccountModal;
