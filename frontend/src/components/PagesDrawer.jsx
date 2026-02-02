import React, {useEffect, useImperativeHandle, useRef, useState} from 'react';
import styles from '../styles/Modal.module.css';


const PagesDrawer = React.forwardRef(function PagesDrawer(
    {pages, activePageId, onSelect, onClose, toggleSelector},
    ref
) {
    const boxRef = useRef(null);
    const [closing, setClosing] = useState(false);

    function closeWithAnim() {
        if (closing) return;
        setClosing(true);
        setTimeout(() => onClose?.(), 150);
    }

    useImperativeHandle(ref, () => ({startClose: closeWithAnim}), [closing]);

    useEffect(() => {
        function handleOutside(e) {
            if (toggleSelector && e.target.closest(toggleSelector)) return;
            if (boxRef.current && !boxRef.current.contains(e.target)) closeWithAnim();
        }

        document.addEventListener('click', handleOutside);
        return () => document.removeEventListener('click', handleOutside);
    }, [toggleSelector]);

    return (
        <div
            ref={boxRef}
            className={`${styles.float} ${styles.bottomLeft} ${closing ? styles['anim-slide-up-out'] : styles['anim-slide-up-in']}`}
            style={{maxHeight: '506px'}}
        >
            <div className={styles.list}>
                {(pages || []).map(p => {
                    const selected = String(activePageId) === String(p.id);
                    return (
                        <button
                            key={p.id}
                            className={`${styles.item} ${selected ? styles.itemSelected : ''}`}
                            aria-current={selected ? 'page' : undefined}
                            onClick={() => {
                                onSelect(p);
                                closeWithAnim();
                            }}>
                            <span
                                  className={`${styles.check} ${selected ? styles.checkSelected : styles.checkIdle}`}
                                  aria-hidden="true"
                              />
                            <span className={styles.itemLabel}>{p.name}</span>
                        </button>
                    );
                })}
                {(!pages || pages.length === 0) && <div>Нет доступных страниц</div>}
            </div>
        </div>
    );
});

export default PagesDrawer;