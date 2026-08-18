import { Icon } from "./Icon";

const themeOptions = [
  { value: "system", labelKey: "system", icon: "spark" },
  { value: "light", labelKey: "light", icon: "sun" },
  { value: "dark", labelKey: "dark", icon: "moon" },
];

export function Preferences({ language, onLanguageChange, theme, onThemeChange, t }) {
  return (
    <div className="preference-controls">
      <div className="segmented-control language-control" aria-label={t("language")} role="group">
        <button
          aria-pressed={language === "zh"}
          className={language === "zh" ? "is-selected" : ""}
          onClick={() => onLanguageChange("zh")}
          title={t("switchToChinese")}
          type="button"
        >
          中
        </button>
        <button
          aria-pressed={language === "en"}
          className={language === "en" ? "is-selected" : ""}
          onClick={() => onLanguageChange("en")}
          title={t("switchToEnglish")}
          type="button"
        >
          EN
        </button>
      </div>

      <div className="segmented-control theme-control" aria-label={t("appearance")} role="group">
        {themeOptions.map((option) => (
          <button
            aria-label={t(option.labelKey)}
            aria-pressed={theme === option.value}
            className={theme === option.value ? "is-selected" : ""}
            data-theme-option={option.value}
            key={option.value}
            onClick={() => onThemeChange(option.value)}
            title={t(option.labelKey)}
            type="button"
          >
            <Icon name={option.icon} size={14} strokeWidth={1.8} />
            <span>{t(option.labelKey)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
