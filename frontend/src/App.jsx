import { useEffect, useRef, useState } from 'react';
import styles from './styles/App.module.css';

import Header from './components/Header';
import Footer from './components/Footer';
import LoginModal from './components/LoginModal';
import PagesDrawer from './components/PagesDrawer';
import AccountModal from './components/AccountModal';
import PageView from './pages/PageView';
import ToastHost from './components/ToastHost';
import SharedPageView from './pages/SharedPageView';

import { getPages, getPage, addPage, renamePage, deletePage, togglePageArchive, duplicatePage } from './api/client';
import { token, currentUser, cachedPages, clearAllAuth } from './api/auth';

const ACTIVE_PAGE_KEY = 'activePageId';
const SCROLL_KEY = 'scrollPositions'; // { [pageId]: number }

function loadScrollMap() {
    try { return JSON.parse(sessionStorage.getItem(SCROLL_KEY) || '{}'); }
    catch { return {}; }
}
function saveScrollMap(map) {
    sessionStorage.setItem(SCROLL_KEY, JSON.stringify(map || {}));
}

export default function App() {
    const shareToken = (() => {
        if (typeof window === 'undefined') return null;
        const match = window.location.pathname.match(/^\/share\/([^/]+)/);
        return match ? decodeURIComponent(match[1]) : null;
    })();
    const isSharedView = !!shareToken;
    // ---------- state ----------
    const [user, setUser] = useState(currentUser.get());
    const [pages, setPages] = useState(cachedPages.get());
    const [active, setActive] = useState(null);
    const [activePageAccess, setActivePageAccess] = useState(null);
    const [showArchivedPages, setShowArchivedPages] = useState(() => {
        const stored = localStorage.getItem('show-archived-pages');
        return stored === 'true';
    });
    const [pageAccessMapRaw, setPageAccessMapRaw] = useState({});
    const [pageRefreshTick, setPageRefreshTick] = useState(0);

    const [showLogin, setShowLogin]   = useState(false);
    const [showPages, setShowPages]   = useState(false);
    const [showAccount, setShowAccount] = useState(false);

    // ---------- refs ----------
    const contentRef = useRef(null);           // центральная прокручиваемая область
    const scrollMapRef = useRef(loadScrollMap());

    const pagesRef = useRef(null);             // ref к PagesDrawer (императивное закрытие)
    const accountRef = useRef(null);           // ref к AccountModal

    // ---------- helpers ----------
    function pickActive(list) {
        const savedId = sessionStorage.getItem(ACTIVE_PAGE_KEY);
        if (savedId) {
            const found = list.find(p => String(p.id) === String(savedId));
            if (found) return found;
        }
        return list[0] || null;
    }

    async function loadPagesFromApi() {
        try {
            const list = await getPages();
            setPages(list);
            cachedPages.set(list);
            setActive(prev => (prev && list.find(p => p.id === prev.id)) ? prev : pickActive(list));
        } catch {
            // нет токена или 401 — до логина просто игнорим
        }
    }

    // ---------- effects ----------
    useEffect(() => {
        const stored = localStorage.getItem('app-theme');
        const theme = stored === 'DARK' ? 'DARK' : 'LIGHT';
        document.documentElement.dataset.theme = theme;
    }, []);

    useEffect(() => {
        localStorage.setItem('show-archived-pages', showArchivedPages ? 'true' : 'false');
    }, [showArchivedPages]);

    // Начальная инициализация
    useEffect(() => {
        if (isSharedView) return;
        if (token.get()) {
            // восстановим из кэша
            const p = cachedPages.get();
            if (p?.length) {
                setPages(p);
                setActive(pickActive(p));
            }
            // обновим с сервера
            loadPagesFromApi()
        } else {
            setShowLogin(true); // форсим логин
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Сохраняем активную страницу
    useEffect(() => {
        if (active?.id != null) {
            sessionStorage.setItem(ACTIVE_PAGE_KEY, String(active.id));
        }
    }, [active?.id]);

    // Независимые скроллы для каждой страницы
    useEffect(() => {
        const el = contentRef.current;
        if (!el || !active?.id) return;

        // восстановить позицию
        const y = scrollMapRef.current[String(active.id)] ?? 0;
        el.scrollTo({ top: y, behavior: 'auto' });

        function onScroll() {
            scrollMapRef.current[String(active.id)] = el.scrollTop;
            saveScrollMap(scrollMapRef.current);
        }
        el.addEventListener('scroll', onScroll, { passive: true });
        return () => el.removeEventListener('scroll', onScroll);
    }, [active?.id]);

    useEffect(() => {
        setActivePageAccess(null);
    }, [active?.id]);

    useEffect(() => {
        let alive = true;
        const ids = (pages || []).map(p => p.id).filter(Boolean);
        const missing = ids.filter(id => pageAccessMapRaw[id] == null);
        if (!missing.length) return;
        (async () => {
            try {
                const results = await Promise.all(
                    missing.map(async (pageId) => {
                        try {
                            const info = await getPage(pageId);
                            const access = info?.access || info?.pageAccess || info?.permission || null;
                            return [pageId, access];
                        } catch {
                            return [pageId, null];
                        }
                    })
                );
                if (!alive) return;
                setPageAccessMapRaw(prev => {
                    const next = { ...prev };
                    results.forEach(([id, access]) => {
                        next[id] = access;
                    });
                    return next;
                });
            } catch {
                // ignore
            }
        })();
        return () => { alive = false; };
    }, [pages, pageAccessMapRaw]);

    // ---------- actions ----------
    function handleLogout() {
        clearAllAuth();
        setUser(null);
        setPages([]);
        setActive(null);
        setShowAccount(false);
        setShowLogin(true);
    }

    async function handleAddPage() {
        try {
            const baseName = 'New Page';
            const existing = (pages || []).filter(p =>
                String(p.name || '').toLowerCase().includes(baseName.toLowerCase())
            ).length;
            const name = existing ? `${baseName} ${existing + 1}` : baseName;
            const created = await addPage(name);
            setPages(prev => {
                const next = [...(prev || []), created];
                cachedPages.set(next);
                return next;
            });
            setActive(created);
        } catch (e) {
            console.error('Add page failed', e);
        }
    }

    async function handleRenamePage(pageId, name) {
        try {
            const updated = await renamePage({ pageId, name });
            setPages(prev => {
                const next = (prev || []).map(p => (p.id === pageId ? updated : p));
                cachedPages.set(next);
                return next;
            });
            setActive(prev => (prev && prev.id === pageId ? updated : prev));
        } catch (e) {
            console.error('Rename page failed', e);
        }
    }

    async function handleDeletePage(pageId) {
        try {
            await deletePage(pageId);
            setPages(prev => {
                const prevList = prev || [];
                const next = prevList.filter(p => p.id !== pageId);
                cachedPages.set(next);
                setActive(curr => {
                    if (!curr || curr.id !== pageId) return curr;
                    const idx = prevList.findIndex(p => p.id === pageId);
                    const left = idx > 0 ? prevList[idx - 1] : null;
                    const right = idx >= 0 && idx + 1 < prevList.length ? prevList[idx + 1] : null;
                    return left || right || null;
                });
                return next;
            });
        } catch (e) {
            console.error('Delete page failed', e);
        }
    }

    async function handleToggleArchive(page) {
        if (!page?.id) return;
        try {
            const updated = await togglePageArchive(page.id);
            setPages(prev => {
                const next = (prev || []).map(p => (p.id === page.id ? updated : p));
                cachedPages.set(next);
                return next;
            });
            if (active?.id === page.id) {
                setActive(updated);
                setPageRefreshTick(tick => tick + 1);
            }
        } catch (e) {
            console.error('Toggle archive failed', e);
        }
    }

    async function handleDuplicatePage(page) {
        if (!page?.id) return;
        try {
            const duplicated = await duplicatePage(page.id);
            setPages(prev => {
                const next = [...(prev || []), duplicated];
                cachedPages.set(next);
                return next;
            });
            setActive(duplicated);
        } catch (e) {
            console.error('Duplicate page failed', e);
        }
    }

    // Триггеры с анимацией исчезания:
    function onBurgerClick() {
        if (showPages && pagesRef.current?.startClose) {
            pagesRef.current.startClose();   // плавно закрыть
        } else {
            setShowPages(true);              // открыть
        }
    }

    function onProfileClick() {
        if (showAccount && accountRef.current?.startClose) {
            accountRef.current.startClose(); // плавно закрыть
        } else {
            setShowAccount(true);            // открыть
        }
    }

    // ---------- render ----------
    const isAdmin = String(user?.role || '').toUpperCase() === 'ADMIN';
    const accessLevel = String(activePageAccess || 'MANAGE').toUpperCase();
    const resolvePageAccess = (page) => {
        if (!page) return accessLevel;
        const mapAccess = pageAccessMapRaw[page.id];
        if (mapAccess) return String(mapAccess).toUpperCase();
        const raw = page.access || page.pageAccess || page.permission;
        if (raw) return String(raw).toUpperCase();
        return accessLevel;
    };
    const canManagePages = resolvePageAccess(active) === 'MANAGE';

    const visiblePages = showArchivedPages
        ? pages
        : (pages || []).filter(p => !p?.isArchived);

    return (
        isSharedView ? (
            <div className={styles.sharedRoot}>
                <main className={styles.sharedContent}>
                    <SharedPageView token={shareToken} />
                </main>
                <ToastHost />
            </div>
        ) : (
        <div className={styles.root}>
            <Header
                user={user}
                onLoginClick={() => setShowLogin(true)}
                onProfileClick={onProfileClick}
            />

            <main ref={contentRef} className={styles.contentArea}>
                <PageView
                    page={active}
                    refreshToken={pageRefreshTick}
                    onAccessChange={(meta) => {
                        if (!meta) return;
                        setActivePageAccess(meta.effectiveAccess || meta.accessRaw);
                        if (active?.id) {
                            setPageAccessMapRaw(prev => ({ ...prev, [active.id]: meta.accessRaw }));
                        }
                    }}
                />
            </main>

            <Footer
                pages={visiblePages}
                activePageId={active?.id}
                onBurger={onBurgerClick}
                onSelect={(p) => setActive(p)}
                onAddPage={handleAddPage}
                onRenamePage={handleRenamePage}
                onDeletePage={handleDeletePage}
                onToggleArchive={handleToggleArchive}
                onDuplicatePage={handleDuplicatePage}
                canManagePages={canManagePages}
                canAddPage={isAdmin}
                canDeletePage={isAdmin}
                canDuplicatePage={isAdmin}
                canManagePage={(page) => resolvePageAccess(page) === 'MANAGE'}
            />

            {showLogin && (
                <LoginModal
                    force={!token.get()}                // нельзя закрыть, если нет токена
                    onClose={() => setShowLogin(false)}
                    onLoggedIn={(u) => {
                        setUser(u);
                        setShowLogin(false);
                        loadPagesFromApi();               // подтянуть и закешировать страницы
                    }}
                />
            )}

            {showPages && (
                <PagesDrawer
                    ref={pagesRef}
                    pages={visiblePages}
                    activePageId={active?.id}
                    onSelect={(p)=>setActive(p)}
                    onClose={() => setShowPages(false)} // вызовется после animationend
                    toggleSelector="#btn-burger"
                />
            )}

            {showAccount && (
                <AccountModal
                    ref={accountRef}
                    user={user}
                    onLogout={handleLogout}
                    onClose={() => setShowAccount(false)} // вызовется после animationend
                    toggleSelector="#btn-account"
                    showArchivedPages={showArchivedPages}
                    onShowArchivedPagesChange={setShowArchivedPages}
                />
            )}
            <ToastHost />
        </div>
        )
    );
}
