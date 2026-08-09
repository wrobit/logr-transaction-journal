"use client";

import { useTranslations } from "next-intl";

const policySections = [
  "controller",
  "data",
  "purpose",
  "security",
  "processors",
  "cookies",
  "rights",
  "retention",
  "contact",
] as const;

const policyItemKeys = ["first", "second", "third"] as const;

export function PrivacyPolicyView() {
  const t = useTranslations("privacyPolicy");

  return (
    <div className="space-y-8 text-foreground">
      <div className="space-y-3">
        <p className="text-xs font-medium uppercase text-primary">{t("eyebrow")}</p>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold md:text-2xl">{t("title")}</h1>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{t("intro")}</p>
        </div>
        <p className="text-xs text-muted-foreground">{t("effectiveDate")}</p>
      </div>

      <div className="grid gap-4">
        {policySections.map((sectionKey) => (
          <section
            key={sectionKey}
            className="rounded-sm border border-border bg-muted/30 p-4"
          >
            <div className="space-y-3">
              <h2 className="text-sm font-semibold">{t(`sections.${sectionKey}.title`)}</h2>
              <div className="space-y-2 text-sm leading-6 text-muted-foreground">
                <p>{t(`sections.${sectionKey}.body`)}</p>
                <ul className="grid gap-2 pl-4">
                  {policyItemKeys.map((itemKey) => (
                    <li key={itemKey} className="list-disc">
                      {t(`sections.${sectionKey}.items.${itemKey}`)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
