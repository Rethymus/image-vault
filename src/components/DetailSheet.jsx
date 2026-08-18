import { Icon } from "./Icon";

export function DetailSheet({ asset, onClose, onCopy, onRotate, onDelete, t }) {
  if (!asset) return null;

  return (
    <div className="overlay" role="presentation">
      <button aria-label={t("closeAssetDetails")} className="overlay-dismiss" onClick={onClose} type="button" />
      <section aria-labelledby="detail-title" className="sheet detail-sheet" role="dialog" aria-modal="true">
        <div className="sheet-header">
          <div>
            <p className="sheet-kicker">{t("assetDetails")}</p>
            <h2 id="detail-title">{asset.name}</h2>
          </div>
          <button aria-label={t("close")} className="icon-button" onClick={onClose} type="button">
            <Icon name="close" size={21} />
          </button>
        </div>
        <div className="detail-body">
          <div className="detail-preview">
            <img alt={asset.alt || asset.name} src={asset.image} />
          </div>
          <div className="detail-summary">
            <div>
              <span>{t("publicUrl")}</span>
              <code>{asset.url}</code>
            </div>
            <div className="detail-stats">
              <span>{asset.type}</span>
              <span>{asset.size}</span>
              <span>{asset.dimensions}</span>
            </div>
          </div>
          <div className="detail-actions">
            <button className="button button-primary" onClick={() => onCopy(asset, "url")} type="button">
              <Icon name="link" size={17} />
              {t("copyUrl")}
            </button>
            <button className="button button-secondary" onClick={() => onCopy(asset, "html")} type="button">
              <Icon name="copy" size={17} />
              {t("copyHtml")}
            </button>
            <button className="button button-secondary" onClick={() => onCopy(asset, "markdown")} type="button">
              <Icon name="copy" size={17} />
              {t("copyMarkdown")}
            </button>
          </div>
        </div>
        <div className="sheet-footer detail-footer">
          <button className="button button-secondary" onClick={() => onRotate(asset)} type="button">
            <Icon name="refresh" size={17} />
            {t("rotateUrl")}
          </button>
          <button className="button button-danger" onClick={() => onDelete(asset)} type="button">
            <Icon name="trash" size={17} />
            {t("delete")}
          </button>
        </div>
      </section>
    </div>
  );
}
