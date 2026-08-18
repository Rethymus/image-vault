import { Icon } from "./Icon";

export function ConfirmDialog({ asset, onCancel, onConfirm, t }) {
  if (!asset) return null;

  return (
    <div className="modal-layer" role="presentation">
      <button aria-label={t("closeConfirmation")} className="modal-dismiss" onClick={onCancel} type="button" />
      <section aria-labelledby="delete-title" className="confirm-dialog" role="alertdialog" aria-modal="true">
        <div className="confirm-icon"><Icon name="trash" size={19} /></div>
        <h2 id="delete-title">{t("deleteThisImage")}</h2>
        <p>
          {t("deleteDescription", { name: asset.name })}
        </p>
        <div className="confirm-actions">
          <button className="button button-secondary" onClick={onCancel} type="button">{t("cancel")}</button>
          <button className="button button-danger" onClick={onConfirm} type="button">{t("deleteImage")}</button>
        </div>
      </section>
    </div>
  );
}
