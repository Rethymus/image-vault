import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Icon } from "./Icon";

function formatRemaining(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function PhoneUploadSheet({
  isDemo,
  isOpen,
  isCreating,
  session,
  onClose,
  onCopyLink,
  onCreate,
  onRegenerate,
  t,
}) {
  const canvasRef = useRef(null);
  const [remaining, setRemaining] = useState(0);
  const [qrError, setQrError] = useState(false);

  useEffect(() => {
    if (!isOpen || !session) {
      setRemaining(0);
      return undefined;
    }

    const updateRemaining = () => setRemaining(Math.max(0, Math.ceil((session.expiresAt - Date.now()) / 1000)));
    updateRemaining();
    const interval = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(interval);
  }, [isOpen, session]);

  useEffect(() => {
    if (!isOpen || !session || !canvasRef.current || remaining <= 0) return undefined;
    setQrError(false);
    QRCode.toCanvas(canvasRef.current, session.uploadUrl, {
      width: 248,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#1d1d1f", light: "#ffffff" },
    }).catch(() => setQrError(true));
    return undefined;
  }, [isOpen, remaining > 0, session]);

  if (!isOpen) return null;

  const isExpired = Boolean(session && remaining <= 0);

  return (
    <div className="overlay qr-overlay" role="presentation">
      <button aria-label={t("close")} className="overlay-dismiss" onClick={onClose} type="button" />
      <section aria-labelledby="phone-upload-title" className="sheet qr-sheet" role="dialog" aria-modal="true">
        <div className="sheet-header">
          <div>
            <p className="sheet-kicker">{t("phoneUpload")}</p>
            <h2 id="phone-upload-title">{t("phoneUpload")}</h2>
          </div>
          <button aria-label={t("close")} className="icon-button" onClick={onClose} type="button">
            <Icon name="close" size={21} />
          </button>
        </div>

        <div className="qr-body">
          <p className="qr-description">{t(isDemo ? "demoQrDescription" : "phoneUploadDescription")}</p>

          {isCreating ? (
            <div className="qr-loading" aria-live="polite">
              <span className="qr-loading-mark"><Icon name="spark" size={24} strokeWidth={1.5} /></span>
              <strong>{t("creatingSecureChannel")}</strong>
            </div>
          ) : session && !isExpired ? (
            <>
              <div className="qr-code-wrap">
                {qrError ? <span className="qr-error">{t("qrSessionFailed")}</span> : <canvas aria-label={t("scanWithPhone")} ref={canvasRef} />}
              </div>
              <div className="qr-copy">
                <strong>{t("scanWithPhone")}</strong>
                <span>{t("phoneSessionExpires", { time: formatRemaining(remaining), count: session.maxFiles })}</span>
              </div>
              <div className="qr-link-row">
                <code title={session.uploadUrl}>{session.uploadUrl}</code>
                <button className="button button-secondary button-compact" onClick={() => onCopyLink(session.uploadUrl)} type="button">
                  <Icon name="copy" size={15} />
                  <span>{t("copyLink")}</span>
                </button>
              </div>
              <p className="qr-note"><Icon name="spark" size={15} />{t(isDemo ? "demoQrNote" : "qrNote")}</p>
            </>
          ) : session ? (
            <div className="qr-expired" aria-live="polite">
              <span className="qr-expired-mark"><Icon name="refresh" size={22} /></span>
              <strong>{t("phoneSessionExpired")}</strong>
              <button className="button button-primary" onClick={onRegenerate} type="button">
                <Icon name="refresh" size={16} />
                {t("regenerate")}
              </button>
            </div>
          ) : (
            <div className="qr-empty" aria-live="polite">
              <span className="qr-expired-mark"><Icon name="qr" size={22} /></span>
              <strong>{t("phoneUploadDescription")}</strong>
              <button className="button button-primary" onClick={onRegenerate} type="button">
                <Icon name="qr" size={16} />
                {t("createQr")}
              </button>
            </div>
          )}
        </div>

        <div className="sheet-footer qr-footer">
          <button className="button button-secondary" onClick={onClose} type="button">{t("stopAndClose")}</button>
          {session && !isCreating ? <button className="button button-secondary" onClick={onRegenerate} type="button">{t("regenerate")}</button> : null}
        </div>
      </section>
    </div>
  );
}
