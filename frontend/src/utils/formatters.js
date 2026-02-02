// DATE: UI <-> API
export function formatDateDisplay(iso) {
    if (!iso) return '';
    // ожидаем YYYY-MM-DD -> DD.MM.YYYY
    const [y, m, d] = String(iso).split('-');
    if (!y || !m || !d) return '';
    return `${d.padStart(2,'0')}.${m.padStart(2,'0')}.${y}`;
}
export function parseDateToISO(ui) {
    // DD.MM.YYYY -> YYYY-MM-DD
    const digits = String(ui).replace(/[^\d]/g, '');
    if (digits.length < 8) return null;
    const d = digits.slice(0,2);
    const m = digits.slice(2,4);
    const y = digits.slice(4,8);
    return `${y}-${m}-${d}`;
}
export function maskDateInput(prev, next) {
    // вставляем точки после 2 и 4
    const digits = next.replace(/[^\d]/g, '').slice(0,8);
    let out = '';
    for (let i=0;i<digits.length;i++){
        out += digits[i];
        if (i===1 || i===3) out += '.';
    }
    return out;
}

// NUMBER: UI <-> API (два знака после запятой, группировки пробелами)
export function formatNumberDisplay(input) {
    if (input === null || input === undefined || input === '') return '';
    const num = typeof input === 'number' ? input : Number(input);
    if (!isFinite(num)) return '';
    const [int, frac=''] = num.toFixed(2).split('.');
    const intSpaced = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    // убираем лишние нули в дробной, но максимум 2 знака
    const fracTrim = frac.replace(/0+$/,'');
    return fracTrim ? `${intSpaced},${fracTrim}` : intSpaced;
}

// парсим UI "12 345,67" -> строка "12345.67" для BigDecimal на бэке
export function parseNumberToDecimalString(ui) {
    if (!ui) return null;
    const s = String(ui).replace(/\s+/g,'').replace(',', '.');
    if (!/^[-+]?\d*\.?\d{0,2}$/.test(s)) return null;
    if (s === '' || s === '.' || s === '-' || s === '+') return null;
    const n = Number(s);
    if (!isFinite(n)) return null;
    return n.toFixed(Math.min(2, (s.split('.')[1]||'').length));
}