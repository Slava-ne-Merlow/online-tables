import { useState } from 'react';
import styles from '../styles/Modal.module.css';
import { signIn } from '../api/client';
import { token, currentUser } from '../api/auth';

export default function LoginModal({ onClose, onLoggedIn, force=false }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [closing, setClosing] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            const res = await signIn({ email, password });
            token.set(res.accessToken);
            currentUser.set(res.user);
            onLoggedIn(res.user);
            if (!force) handleClose();
        } catch (e) {
            setError(e?.message || 'Ошибка авторизации');
        } finally {
            setLoading(false);
        }
    }

    function handleClose() {
        if (force) return;
        setClosing(true);
        setTimeout(onClose, 150);
    }

    const backdropProps = force ? {} : { onClick: handleClose };

    return (
        <div
            className={`${styles.backdrop} ${closing ? styles['anim-fade-out'] : styles['anim-fade-in']}`}
            {...backdropProps}
        >
            <div
                className={`${styles.modal} ${closing ? styles['anim-pop-out'] : styles['anim-pop-in']}`}
                onClick={(e)=>e.stopPropagation()}
            >
                <div className={styles.title}>Войти</div>
                <form onSubmit={handleSubmit}>
                    <div className={styles.row}>
                        <input className={styles.input} placeholder="Почта"
                               value={email} onChange={e=>setEmail(e.target.value)} />
                        <input className={styles.input} type="password" placeholder="Пароль"
                               value={password} onChange={e=>setPassword(e.target.value)} />
                    </div>
                    {error && <div style={{color:'crimson', marginTop:8}}>{error}</div>}
                    <div className={styles.actions}>
                        {!force && (
                            <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={handleClose}>
                                Отмена
                            </button>
                        )}
                        <button type="submit" className={styles.btn} disabled={loading}>
                            {loading ? 'Входим…' : 'Войти'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}