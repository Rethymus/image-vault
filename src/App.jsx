import { useEffect, useMemo, useRef, useState } from "react";
import { AssetCard } from "./components/AssetCard";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { DetailSheet } from "./components/DetailSheet";
import { DemoUploadPage } from "./components/DemoUploadPage";
import { Icon } from "./components/Icon";
import { PhoneUploadSheet } from "./components/PhoneUploadSheet";
import { Preferences } from "./components/Preferences";
import { UploadSheet } from "./components/UploadSheet";
import { createLocalAsset, createToken, formatBytes, seededAssets } from "./data/assets";
import {
  apiMode,
  deleteRemoteAsset,
  createRemoteUploadSession,
  listRemoteAssets,
  revokeRemoteUploadSession,
  rotateRemoteAsset,
  uploadRemoteAsset,
} from "./lib/api";
import { prepareImage } from "./lib/imageProcessing";
import { createTranslator, getInitialLanguage, getInitialTheme, resolveSystemTheme } from "./lib/i18n";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const publicImageOrigin = import.meta.env.VITE_PUBLIC_IMAGE_ORIGIN || "https://img.example.com";
const demoUploadParams = typeof window === "undefined" ? null : new URLSearchParams(window.location.search);
const demoUploadMode = Boolean(demoUploadParams?.has("demoUpload"));
const demoUploadExpiresAt = Number(demoUploadParams?.get("expires")) || Date.now() + (10 * 60 * 1000);

function getDemoHomeUrl() {
  if (typeof window === "undefined") return "/";
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  return url.toString();
}

function createDemoUploadSession(language) {
  const expiresAt = Date.now() + (10 * 60 * 1000);
  const url = new URL(getDemoHomeUrl());
  url.searchParams.set("demoUpload", createToken());
  url.searchParams.set("expires", String(expiresAt));
  url.searchParams.set("lang", language);
  return {
    demo: true,
    expiresAt,
    maxFiles: 3,
    token: url.searchParams.get("demoUpload"),
    uploadUrl: url.toString(),
  };
}

function makeQueueItem(file) {
  return {
    id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
    file,
    name: file.name,
    sizeLabel: formatBytes(file.size),
    previewUrl: URL.createObjectURL(file),
    status: "queued",
    progress: 0,
  };
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Local HTTP previews and restrictive browser permissions can reject the modern API.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
  return Promise.resolve();
}

function assetSnippet(asset, format) {
  if (format === "html") return `<img src="${asset.url}" alt="${asset.alt || asset.name}" />`;
  if (format === "markdown") return `![${asset.alt || asset.name}](${asset.url})`;
  return asset.url;
}

function humanError(error, t) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("File type")) return t("onlySupportedFiles");
  if (message.includes("large")) return t("fileTooLarge");
  return message || t("somethingWentWrong");
}

export default function App() {
  const [assets, setAssets] = useState(() => apiMode === "worker" ? [] : seededAssets);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [queue, setQueue] = useState([]);
  const [cleanMetadata, setCleanMetadata] = useState(true);
  const [optimize, setOptimize] = useState(true);
  const [menuId, setMenuId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const [language, setLanguage] = useState(() => {
    const requestedLanguage = demoUploadParams?.get("lang");
    return requestedLanguage === "zh" || requestedLanguage === "en" ? requestedLanguage : getInitialLanguage();
  });
  const [theme, setTheme] = useState(getInitialTheme);
  const [systemTheme, setSystemTheme] = useState(resolveSystemTheme);
  const [phoneUploadOpen, setPhoneUploadOpen] = useState(false);
  const [phoneUploadSession, setPhoneUploadSession] = useState(null);
  const [phoneSessionCreating, setPhoneSessionCreating] = useState(false);
  const fileInputRef = useRef(null);
  const retainedPreviewUrls = useRef(new Set());
  const phoneSessionRequestRef = useRef(0);

  const isRemote = apiMode === "worker";
  const isDemo = !isRemote;
  const t = useMemo(() => createTranslator(language), [language]);
  const translatorRef = useRef(t);
  const resolvedTheme = theme === "system" ? systemTheme : theme;
  const assetCount = assets.length;
  const visibleAssets = assets;

  useEffect(() => {
    translatorRef.current = t;
  }, [t]);

  useEffect(() => {
    window.localStorage.setItem("vault-language", language);
    document.documentElement.lang = language;
    document.title = language === "zh" ? "Vault · 私有图片管理" : "Vault · Private image manager";
  }, [language]);

  useEffect(() => {
    window.localStorage.setItem("vault-theme", theme);
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute("content", resolvedTheme === "dark" ? "#000000" : "#f5f5f7");
  }, [resolvedTheme, theme]);

  useEffect(() => {
    if (theme !== "system" || !window.matchMedia) return undefined;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = (event) => setSystemTheme(event.matches ? "dark" : "light");
    setSystemTheme(mediaQuery.matches ? "dark" : "light");
    mediaQuery.addEventListener?.("change", updateSystemTheme);
    return () => mediaQuery.removeEventListener?.("change", updateSystemTheme);
  }, [theme]);

  useEffect(() => {
    if (!isRemote) return undefined;
    let cancelled = false;

    listRemoteAssets()
      .then((remoteAssets) => {
        if (!cancelled) {
          setAssets(remoteAssets);
        }
      })
      .catch((error) => showToast(humanError(error, translatorRef.current), "error"));

    return () => {
      cancelled = true;
    };
  }, [isRemote]);

  useEffect(() => {
    if (!isRemote || !phoneUploadOpen || !phoneUploadSession) return undefined;
    let cancelled = false;

    const refreshAfterPhoneUpload = () => {
      listRemoteAssets()
        .then((remoteAssets) => {
          if (!cancelled) {
            setAssets(remoteAssets);
          }
        })
        .catch(() => undefined);
    };

    const interval = window.setInterval(refreshAfterPhoneUpload, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isRemote, phoneUploadOpen, phoneUploadSession]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!menuId) return undefined;
    const closeMenu = (event) => {
      if (!event.target.closest("[data-menu-root]")) setMenuId(null);
    };
    document.addEventListener("pointerdown", closeMenu);
    return () => document.removeEventListener("pointerdown", closeMenu);
  }, [menuId]);

  function showToast(message, tone = "success") {
    setToast({ message, tone });
  }

  function openUpload(files = []) {
    setUploadOpen(true);
    if (files.length) addFiles(files);
  }

  async function createPhoneUploadSession(replace = false) {
    if (phoneSessionCreating) return;
    const requestId = phoneSessionRequestRef.current + 1;
    phoneSessionRequestRef.current = requestId;
    const previousToken = replace ? phoneUploadSession?.token : null;
    setPhoneSessionCreating(true);

    if (!isRemote) {
      window.setTimeout(() => {
        if (requestId !== phoneSessionRequestRef.current) return;
        setPhoneUploadSession(createDemoUploadSession(language));
        setPhoneSessionCreating(false);
      }, 260);
      return;
    }

    try {
      if (previousToken) await revokeRemoteUploadSession(previousToken);
      const nextSession = await createRemoteUploadSession();
      if (requestId !== phoneSessionRequestRef.current) {
        await revokeRemoteUploadSession(nextSession.token).catch(() => undefined);
        return;
      }
      setPhoneUploadSession(nextSession);
    } catch {
      if (requestId === phoneSessionRequestRef.current) showToast(t("qrSessionFailed"), "error");
    } finally {
      if (requestId === phoneSessionRequestRef.current) setPhoneSessionCreating(false);
    }
  }

  function openPhoneUpload() {
    setPhoneUploadOpen(true);
    if (!phoneUploadSession && !phoneSessionCreating) void createPhoneUploadSession();
  }

  async function stopPhoneUpload() {
    phoneSessionRequestRef.current += 1;
    const token = phoneUploadSession?.token;
    setPhoneUploadOpen(false);
    setPhoneUploadSession(null);
    setPhoneSessionCreating(false);
    if (isRemote && token) await revokeRemoteUploadSession(token).catch(() => undefined);
  }

  async function copyTemporaryUploadLink(value) {
    try {
      await copyText(value);
      showToast(t("linkCopied"));
    } catch {
      showToast(t("copyFailed"), "error");
    }
  }

  function validateFile(file) {
    if (!ALLOWED_TYPES.has(file.type)) throw new Error("File type not supported");
    if (file.size > MAX_FILE_SIZE) throw new Error("File is too large");
  }

  function addFiles(files) {
    const accepted = [];
    for (const file of files) {
      try {
        validateFile(file);
        accepted.push(makeQueueItem(file));
      } catch (error) {
        showToast(`${file.name}: ${humanError(error, t)}`, "error");
      }
    }
    if (accepted.length) setQueue((current) => [...current, ...accepted]);
  }

  function removeQueueItem(id) {
    setQueue((current) => {
      const item = current.find((candidate) => candidate.id === id);
      if (item?.previewUrl && !retainedPreviewUrls.current.has(item.previewUrl)) URL.revokeObjectURL(item.previewUrl);
      return current.filter((candidate) => candidate.id !== id);
    });
  }

  function closeUpload() {
    if (queue.some((item) => item.status === "uploading")) return;
    queue.forEach((item) => {
      if (item.previewUrl && !retainedPreviewUrls.current.has(item.previewUrl)) URL.revokeObjectURL(item.previewUrl);
    });
    setQueue([]);
    setUploadOpen(false);
  }

  async function uploadOne(item) {
    setQueue((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, status: "uploading", progress: 12 } : candidate));

    try {
      let asset;
      const uploadFile = await prepareImage(item.file, { cleanMetadata, optimize });
      if (isRemote) {
        asset = await uploadRemoteAsset(uploadFile, { cleanMetadata, optimize, originalName: item.name });
      } else {
        await new Promise((resolve) => window.setTimeout(resolve, 280));
        setQueue((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, progress: 68 } : candidate));
        await new Promise((resolve) => window.setTimeout(resolve, 280));
        retainedPreviewUrls.current.add(item.previewUrl);
        asset = createLocalAsset(uploadFile, item.previewUrl, isDemo ? null : publicImageOrigin, item.name);
      }

      setQueue((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, status: "ready", progress: 100 } : candidate));
      setAssets((current) => [asset, ...current]);
      return asset;
    } catch (error) {
      setQueue((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, status: "error", error: humanError(error, t) } : candidate));
      showToast(`${item.name}: ${humanError(error, t)}`, "error");
      return null;
    }
  }

  async function uploadQueue() {
    const readyItems = queue.filter((item) => item.status === "queued" || item.status === "ready");
    for (const item of readyItems) await uploadOne(item);
    showToast(isRemote ? t("imagesReady") : t("imagesAddedDemo"));
    window.setTimeout(closeUpload, 480);
  }

  async function handleCopy(asset, format = "url") {
    try {
      await copyText(assetSnippet(asset, format));
      showToast(format === "url" ? t("urlCopied") : t("formatCopied", { format: format === "html" ? "HTML" : "Markdown" }));
    } catch {
      showToast(t("copyFailed"), "error");
    }
  }

  async function handleRotate(asset) {
    try {
      const updated = isRemote
        ? await rotateRemoteAsset(asset.id)
        : { ...asset, url: asset.local ? asset.image : asset.url };
      setAssets((current) => current.map((candidate) => candidate.id === asset.id ? { ...candidate, ...updated } : candidate));
      setSelectedAsset((current) => current?.id === asset.id ? { ...current, ...updated } : current);
      setMenuId(null);
      showToast(t("newUrlReady"));
    } catch (error) {
      showToast(humanError(error, t), "error");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      if (isRemote) await deleteRemoteAsset(deleteTarget.id);
      if (deleteTarget.local && deleteTarget.image?.startsWith("blob:")) {
        retainedPreviewUrls.current.delete(deleteTarget.image);
        URL.revokeObjectURL(deleteTarget.image);
      }
      setAssets((current) => current.filter((asset) => asset.id !== deleteTarget.id));
      setSelectedAsset(null);
      setDeleteTarget(null);
      setMenuId(null);
      showToast(t("imageDeleted"));
    } catch (error) {
      showToast(humanError(error, t), "error");
    }
  }

  function handleCardAction(asset, action) {
    setMenuId(null);
    if (action === "delete") return setDeleteTarget(asset);
    if (action === "rotate") return handleRotate(asset);
    return handleCopy(asset, action);
  }

  if (demoUploadMode) {
    return (
      <DemoUploadPage
        expiresAt={demoUploadExpiresAt}
        homeUrl={getDemoHomeUrl()}
        language={language}
        onLanguageChange={setLanguage}
        onThemeChange={setTheme}
        t={t}
        theme={theme}
      />
    );
  }

  return (
    <div className={`app-shell ${uploadOpen || selectedAsset || deleteTarget || phoneUploadOpen ? "has-overlay" : ""}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
      event.preventDefault();
      openUpload([...event.dataTransfer.files]);
    }}>
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="#top" aria-label={t("brandHome")}>Vault</a>
          <div className="topbar-actions">
            <Preferences language={language} onLanguageChange={setLanguage} onThemeChange={setTheme} t={t} theme={theme} />
            {isRemote || isDemo ? (
              <button aria-label={t("phoneUpload")} className="button button-secondary topbar-phone-upload" onClick={openPhoneUpload} type="button">
                <Icon name="qr" size={17} strokeWidth={1.7} />
                <span>{t("phoneUpload")}</span>
              </button>
            ) : null}
            <button aria-label={t("addImages")} className="button button-primary topbar-upload" onClick={() => openUpload()} type="button">
              <Icon name="upload" size={17} strokeWidth={1.7} />
              <span>{t("addImages")}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="main-content" id="top">
        <section className="page-intro" aria-labelledby="page-title">
          <div>
            <h1 id="page-title">{t("images")}</h1>
            <p>{t("assetCount", { count: assetCount, countLabel: assetCount === 1 ? t("assetSingular") : t("assetPlural") })}</p>
          </div>
          {isRemote ? <span className="connection-status"><span className="status-dot" /> {t("connected")}</span> : (
            <span className="connection-status demo-connection-status"><span className="status-dot" /> {t("demoModeLabel")}</span>
          )}
        </section>

        {isDemo ? (
          <aside className="demo-banner" role="note">
            <span className="demo-banner-icon"><Icon name="spark" size={17} /></span>
            <div>
              <strong>{t("demoModeLabel")}</strong>
              <span>{t("demoModeDescription")}</span>
            </div>
          </aside>
        ) : null}

        <section
          aria-label={t("uploadImages")}
          className="dropzone"
          onClick={() => fileInputRef.current?.click()}
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
            event.stopPropagation();
            event.currentTarget.classList.remove("is-dragging");
            openUpload([...event.dataTransfer.files]);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openUpload();
            }
          }}
          role="button"
          tabIndex="0"
        >
          <span className="dropzone-icon"><Icon name="upload" size={35} strokeWidth={1.45} /></span>
          <strong>{t("dropImages")}</strong>
          <span>or <button className="inline-link" onClick={(event) => { event.stopPropagation(); openUpload(); }} type="button">{t("chooseFilesFromDevice")}</button></span>
        </section>
        <input
          ref={fileInputRef}
          accept="image/jpeg,image/png,image/webp"
          hidden
          multiple
          onChange={(event) => {
            openUpload([...event.target.files]);
            event.target.value = "";
          }}
          type="file"
        />

        <section className="recent-section" aria-labelledby="recent-title">
          <div className="section-heading">
            <h2 id="recent-title">{t("allAssets")}</h2>
          </div>
          {visibleAssets.length ? (
            <div className="asset-grid">
              {visibleAssets.map((asset) => (
                <div key={asset.id} onMouseEnter={() => setHoveredId(asset.id)} onMouseLeave={() => setHoveredId(null)}>
                  <AssetCard
                    asset={asset}
                    isHovered={hoveredId === asset.id}
                    isMenuOpen={menuId === asset.id}
                    onAction={(action) => handleCardAction(asset, action)}
                    onCopy={(currentAsset) => handleCopy(currentAsset)}
                    onMenu={() => setMenuId((current) => current === asset.id ? null : asset.id)}
                    onOpen={() => setSelectedAsset(asset)}
                    t={t}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Icon name="image" size={24} />
              <strong>{t("emptyTitle")}</strong>
              <span>{t("emptyDescription")}</span>
              <button className="button button-primary" onClick={() => openUpload()} type="button">{t("addImages")}</button>
            </div>
          )}
        </section>
      </main>

      <footer className="app-footer">
        <span>{isDemo ? t("demoFooter") : t("privateManagerFooter")}</span>
        <span>{isDemo ? t("demoPersistenceFooter") : t("bearerFooter")}</span>
      </footer>

      <UploadSheet
        cleanMetadata={cleanMetadata}
        isOpen={uploadOpen}
        onChooseFiles={addFiles}
        onClose={closeUpload}
        onDrop={addFiles}
        onRemove={removeQueueItem}
        onToggleCleanMetadata={() => setCleanMetadata((current) => !current)}
        onToggleOptimize={() => setOptimize((current) => !current)}
        onUpload={uploadQueue}
        optimize={optimize}
        queue={queue}
        t={t}
      />
      <PhoneUploadSheet
        isCreating={phoneSessionCreating}
        isDemo={isDemo}
        isOpen={phoneUploadOpen}
        onClose={stopPhoneUpload}
        onCopyLink={copyTemporaryUploadLink}
        onRegenerate={() => void createPhoneUploadSession(true)}
        session={phoneUploadSession}
        t={t}
      />
      <DetailSheet
        asset={selectedAsset}
        onClose={() => setSelectedAsset(null)}
        onCopy={handleCopy}
        onDelete={(asset) => setDeleteTarget(asset)}
        onRotate={handleRotate}
        t={t}
      />
      <ConfirmDialog asset={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} t={t} />
      {toast ? <div className={`toast toast-${toast.tone}`} role="status"><span className="toast-mark"><Icon name={toast.tone === "error" ? "close" : "check"} size={15} /></span>{toast.message}</div> : null}
    </div>
  );
}
