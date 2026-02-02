import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from '../styles/Modal.module.css';

export default function ToastHost() {
    const [toast, setToast] = useState(null);
    const timerRef = useRef(null);

    useEffect(() => {
        function handleToast(event) {
            const detail = event?.detail || {};
            if (!detail.message) return;
            setToast({ message: detail.message, type: detail.type || 'success' });
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => setToast(null), 2200);
        }
        window.addEventListener('app:toast', handleToast);
        return () => {
            window.removeEventListener('app:toast', handleToast);
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    if (!toast) return null;

    return createPortal(
        <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : styles.toastSuccess}`}>
            {toast.message}
        </div>,
        document.body
    );
}

