// Простая обёртка над sessionStorage.
// Для продакшна лучше httpOnly cookies на бэке.

const TOKEN_KEY = 'accessToken';
const USER_KEY  = 'user';
const PAGES_KEY = 'pages';

export const token = {
    get: () => sessionStorage.getItem(TOKEN_KEY),
    set: (t) => sessionStorage.setItem(TOKEN_KEY, t),
    clear: () => sessionStorage.removeItem(TOKEN_KEY),
};


export const currentUser = {
    get: () => {
        const raw = sessionStorage.getItem(USER_KEY);
        try { return raw ? JSON.parse(raw) : null; } catch { return null; }
    },
    set: (user) => sessionStorage.setItem(USER_KEY, JSON.stringify(user)),
    clear: () => sessionStorage.removeItem(USER_KEY),
};

export const cachedPages = {
    get: () => {
        const raw = sessionStorage.getItem(PAGES_KEY);
        try { return raw ? JSON.parse(raw) : []; } catch { return []; }
    },
    set: (pages) => sessionStorage.setItem(PAGES_KEY, JSON.stringify(pages || [])),
    clear: () => sessionStorage.removeItem(PAGES_KEY),
};

export function clearAllAuth() {
    token.clear();
    currentUser.clear();
    cachedPages.clear();
}
