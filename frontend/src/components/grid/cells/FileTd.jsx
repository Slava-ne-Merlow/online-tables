import React, { useState } from 'react';
import s from '../../../styles/Grid.module.css';
import { uploadFile, fileDownloadUrl } from '../../../api/client';


export default function FileTd({ cell, editable, onCommit, tdProps }) {
    const fileId = cell?.value || null;
    const [loading, setLoading] = useState(false);

    async function handleUpload(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        setLoading(true);
        try {
            const stored = await uploadFile(file);
            if (stored?.id) {
                onCommit({ dataType: 'FILE', value: stored.id });
            }
        } catch (err) {
            console.error('Ошибка загрузки файла', err);
            alert('Ошибка загрузки файла');
        } finally {
            setLoading(false);
            e.target.value = '';
        }
    }

    function handleClear() {
        if (!fileId) return;
        onCommit({ dataType: 'FILE', value: null });
    }

    return (
        <td {...tdProps} className={`${s.td} ${editable ? s.tdEditable : s.tdReadonly}`}>
            {!editable && fileId && (

                <a className={`${s.btn} ${s.btnBorder}`} href={fileDownloadUrl(fileId)} target="_blank" rel="noreferrer">
                            <span
                                className={s.iconDownload}
                                aria-hidden="true"
                            />
        </a>
            )}

            {editable && (
                fileId ? (
                    <div className={s.fileActions}>
                        <a className={`${s.btn} ${s.btnBorder}`} href={fileDownloadUrl(fileId)} target="_blank" rel="noreferrer">
                            <span
                                className={s.iconDownload}
                                aria-hidden="true"
                            />
                        </a>
                        <button className={s.btnDanger} onClick={handleClear} disabled={loading}>
                            <span
                                className={s.iconDelete}
                                aria-hidden="true"
                            />
                        </button>
                    </div>
                ) : (
                    <label className={s.btn}>
                        {loading ? 'Загрузка…' : (
                            <span
                                className={s.iconUpload}
                                aria-hidden="true"
                            />
                        )}
                        <input type="file" style={{ display: 'none' }} onChange={handleUpload} disabled={loading} />
                    </label>
                )
            )}
        </td>
    );
}