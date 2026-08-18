import { Icon } from "./Icon";

export function AssetCard({ asset, isMenuOpen, isHovered, onOpen, onCopy, onMenu, onAction, t }) {
  return (
    <article
      className={`asset-card ${isHovered ? "is-hovered" : ""}`}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex="0"
    >
      <div className="asset-media">
        <img alt={asset.alt || asset.name} loading="lazy" src={asset.image} />
      </div>
      <div className="asset-meta">
        <div className="asset-copy">
          <h3 title={asset.name}>{asset.name}</h3>
          <p>
            {asset.type} <span aria-hidden="true">·</span> {asset.size}
          </p>
        </div>
        <div className="asset-actions" data-menu-root="true">
          <button
            aria-label={t("copyLinkFor", { name: asset.name })}
            className="button button-secondary button-compact"
            onClick={(event) => {
              event.stopPropagation();
              onCopy(asset);
            }}
            type="button"
          >
            <Icon name="link" size={16} />
            <span>{t("copy")}</span>
          </button>
          <button
            aria-expanded={isMenuOpen}
            aria-label={t("moreActionsFor", { name: asset.name })}
            className="icon-button icon-button-compact"
            onClick={(event) => {
              event.stopPropagation();
              onMenu();
            }}
            type="button"
          >
            <Icon name="more" size={18} strokeWidth={1.5} />
          </button>
          {isMenuOpen ? (
            <div className="asset-menu" role="menu">
              <button onClick={(event) => { event.stopPropagation(); onAction("url"); }} role="menuitem" type="button">
                <Icon name="link" size={16} />
                {t("copyUrl")}
              </button>
              <button onClick={(event) => { event.stopPropagation(); onAction("html"); }} role="menuitem" type="button">
                <Icon name="copy" size={16} />
                {t("copyHtml")}
              </button>
              <button onClick={(event) => { event.stopPropagation(); onAction("markdown"); }} role="menuitem" type="button">
                <Icon name="copy" size={16} />
                {t("copyMarkdown")}
              </button>
              <div className="menu-divider" />
              <button onClick={(event) => { event.stopPropagation(); onAction("rotate"); }} role="menuitem" type="button">
                <Icon name="refresh" size={16} />
                {t("rotateUrl")}
              </button>
              <button className="menu-danger" onClick={(event) => { event.stopPropagation(); onAction("delete"); }} role="menuitem" type="button">
                <Icon name="trash" size={16} />
                {t("delete")}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
