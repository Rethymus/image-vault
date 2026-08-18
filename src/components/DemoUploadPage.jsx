import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./Icon";
import { Preferences } from "./Preferences";
import { formatBytes } from "../data/assets";

const MAX_FILES = 3;
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function formatRemaining(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function DemoUploadPage({
  expiresAt,
  homeUrl,
  language,
  onLanguageChange,
  onThemeChange,
  theme,
  t,
}) {
  const inputRef = useRef(null);
  const filesRef = useRef([]);
  const [files, setFiles] = useState([]);
  const [remaining, setRemaining] = useState(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
  const [status, setStatus] = useState("ready");
  const [error, setError] = useState("");

  const isExpired = remaining <= 0;
  const imageCountLabel = files.length === 1 ? t("demoImageSingular") : t("demoImagePlural");
  const imageVerb = files.length === 1 ? t("demoImageVerbSingular") : t("demoImageVerbPlural");
  const fileCountLabel = useMemo(() => t("demoFileCount", { count: files.length }), [files.length, t]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRemaining(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [expiresAt]);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => () => {
    filesRef.current.forEach((file) => URL.revokeObjectURL(file.previewUrl));
  }, []);

  function acceptFiles(fileList) {
    if (isExpired) return;
    setError("");
    setStatus("ready");
    const nextFiles = [];

    for (const file of fileList) {
      if (files.length + nextFiles.length >= MAX_FILES) break;
      if (!ALLOWED_TYPES.has(file.type)) {
        setError(t("onlySupportedFiles"));
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(t("fileTooLarge"));
        continue;
      }
      nextFiles.push({
        id: `${file.name}-${file.lastModified}-${Math.random()}`,
        file,
        name: file.name,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (nextFiles.length) setFiles((current) => [...current, ...nextFiles]);
  }

  function removeFile(id) {
    setFiles((current) => {
      const target = current.find((file) => file.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((file) => file.id !== id);
    });
    setStatus("ready");
  }

  function completeDemoUpload() {
    if (!files.length || isExpired) return;
    setStatus("complete");
  }

  return (
    <div className="demo-mobile-shell">
      <header className="demo-mobile-topbar">
        <a className="brand" href={homeUrl}>Vault</a>
        <Preferences
          language={language}
          onLanguageChange={onLanguageChange}
          onThemeChange={onThemeChange}
          t={t}
          theme={theme}
        />
      </header>

      <main className="demo-mobile-main">
        <a className="demo-mobile-back" href={homeUrl}>← {t("backToDemo")}</a>
        <p className="demo-mobile-kicker">{t("demoUploadKicker")}</p>
        <h1>{t("demoUploadTitle")}</h1>
        <p className="demo-mobile-description">{t("demoUploadDescription")}</p>

        <div className="demo-mobile-channel" role="status">
          <span className="status-dot" />
          <span>{isExpired ? t("demoChannelExpired") : t("demoChannelActive", { time: formatRemaining(remaining) })}</span>
        </div>

        {status === "complete" ? (
          <section className="demo-upload-success" aria-live="polite">
            <span className="demo-upload-success-icon"><Icon name="check" size={26} strokeWidth={2.3} /></span>
            <h2>{t("demoUploadComplete")}</h2>
            <p>{t("demoUploadCompleteDescription", { count: files.length, countLabel: imageCountLabel, verb: imageVerb })}</p>
            <span className="demo-upload-success-note">{t("demoUploadNoPersistence")}</span>
            <button className="button button-secondary" onClick={() => setStatus("ready")} type="button">
              {t("demoUploadAgain")}
            </button>
          </section>
        ) : (
          <>
            <button
              className={`demo-mobile-dropzone ${isExpired ? "is-disabled" : ""}`}
              disabled={isExpired}
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                acceptFiles([...event.dataTransfer.files]);
              }}
              type="button"
            >
              <span className="demo-mobile-upload-icon"><Icon name="upload" size={31} strokeWidth={1.55} /></span>
              <strong>{t("demoChooseFiles")}</strong>
              <span>{t("demoDropFiles")}</span>
            </button>
            <input
              ref={inputRef}
              accept="image/jpeg,image/png,image/webp"
              hidden
              multiple
              onChange={(event) => {
                acceptFiles([...event.target.files]);
                event.target.value = "";
              }}
              type="file"
            />

            <div className="demo-upload-meta">
              <span>{fileCountLabel}</span>
              <span>{t("demoUploadLimit")}</span>
            </div>

            {files.length ? (
              <div className="demo-mobile-file-list" aria-live="polite">
                {files.map((file) => (
                  <div className="demo-mobile-file" key={file.id}>
                    <img alt="" src={file.previewUrl} />
                    <div>
                      <strong title={file.name}>{file.name}</strong>
                      <span>{formatBytes(file.file.size)}</span>
                    </div>
                    <button aria-label={t("removeFile", { name: file.name })} className="icon-button icon-button-compact" onClick={() => removeFile(file.id)} type="button">
                      <Icon name="close" size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {error ? <p className="demo-mobile-error" role="alert">{error}</p> : null}

            <button className="button button-primary demo-mobile-submit" disabled={!files.length || isExpired} onClick={completeDemoUpload} type="button">
              <Icon name="upload" size={17} />
              {t("demoUploadFiles", { count: files.length || 1, countLabel: imageCountLabel })}
            </button>
          </>
        )}

        <aside className="demo-mobile-notice">
          <Icon name="spark" size={17} />
          <p>{t("demoUploadNoPersistence")}</p>
        </aside>
      </main>
    </div>
  );
}
