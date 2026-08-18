import { useRef } from "react";
import { Icon } from "./Icon";

function QueueRow({ item, onRemove, t }) {
  return (
    <div className="queue-row">
      <img alt="" className="queue-preview" src={item.previewUrl} />
      <div className="queue-copy">
        <strong title={item.name}>{item.name}</strong>
        <span>{item.sizeLabel}</span>
      </div>
      <div className="queue-status">
        {item.status === "uploading" ? (
          <div className="queue-progress" aria-label={t("uploaded", { progress: item.progress })}>
            <span style={{ width: `${item.progress}%` }} />
          </div>
        ) : null}
        <span className={`status-label status-${item.status}`}>
          {item.status === "uploading" ? `${item.progress}%` : item.status === "error" ? t("couldntUpload") : t("ready")}
        </span>
      </div>
      <button aria-label={t("removeFile", { name: item.name })} className="text-button queue-remove" onClick={() => onRemove(item.id)} type="button">
        {t("remove")}
      </button>
    </div>
  );
}

export function UploadSheet({
  isOpen,
  queue,
  cleanMetadata,
  optimize,
  onClose,
  onChooseFiles,
  onDrop,
  onRemove,
  onToggleCleanMetadata,
  onToggleOptimize,
  onUpload,
  t,
}) {
  const inputRef = useRef(null);

  if (!isOpen) return null;

  const hasReadyFiles = queue.some((item) => item.status === "queued" || item.status === "ready");
  const isUploading = queue.some((item) => item.status === "uploading");
  const readyCount = queue.filter((item) => item.status === "queued" || item.status === "ready").length;

  return (
    <div className="overlay" role="presentation">
      <button aria-label={t("closeUploadPanel")} className="overlay-dismiss" onClick={onClose} type="button" />
      <section aria-labelledby="upload-title" className="sheet upload-sheet" role="dialog" aria-modal="true">
        <div className="sheet-header">
          <div>
            <p className="sheet-kicker">{t("privateImageManager")}</p>
            <h2 id="upload-title">{t("addImages")}</h2>
          </div>
          <button aria-label={t("close")} className="icon-button" onClick={onClose} type="button">
            <Icon name="close" size={21} />
          </button>
        </div>

        <div
          className="sheet-body"
          onDragEnter={(event) => {
            event.preventDefault();
            event.currentTarget.classList.add("is-dragging");
          }}
          onDragLeave={(event) => {
            if (event.currentTarget === event.target) event.currentTarget.classList.remove("is-dragging");
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            event.currentTarget.classList.remove("is-dragging");
            onDrop([...event.dataTransfer.files]);
          }}
        >
          <button className="sheet-dropzone" onClick={() => inputRef.current?.click()} type="button">
            <span className="upload-icon-wrap"><Icon name="upload" size={30} strokeWidth={1.65} /></span>
            <strong>{t("chooseFiles")}</strong>
            <span>{t("dropImages")}</span>
          </button>
          <input
            ref={inputRef}
            accept="image/jpeg,image/png,image/webp"
            hidden
            multiple
            onChange={(event) => {
              onChooseFiles([...event.target.files]);
              event.target.value = "";
            }}
            type="file"
          />

          <div className="preference-list">
            <label className="preference-row">
              <input checked={cleanMetadata} onChange={onToggleCleanMetadata} type="checkbox" />
              <span className="custom-check"><Icon name="check" size={14} strokeWidth={2.3} /></span>
              <span>{t("cleanMetadata")}</span>
            </label>
            <label className="preference-row">
              <input checked={optimize} onChange={onToggleOptimize} type="checkbox" />
              <span className="custom-check"><Icon name="check" size={14} strokeWidth={2.3} /></span>
              <span>{t("optimizeForWeb")}</span>
            </label>
          </div>

          <div className="queue-list" aria-live="polite">
            {queue.length === 0 ? (
              <div className="queue-empty">
                <span>{t("filesAppearHere")}</span>
                <span>{t("supportedFiles")}</span>
              </div>
            ) : (
              queue.map((item) => <QueueRow item={item} key={item.id} onRemove={onRemove} t={t} />)
            )}
          </div>
        </div>

        <div className="sheet-footer">
          <button className="button button-secondary" onClick={onClose} type="button">
            {t("cancel")}
          </button>
          <button className="button button-primary" disabled={!hasReadyFiles || isUploading} onClick={onUpload} type="button">
            {isUploading ? t("uploading") : t("uploadCount", { count: readyCount })}
          </button>
        </div>
      </section>
    </div>
  );
}
