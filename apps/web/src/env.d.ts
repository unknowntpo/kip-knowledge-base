/// <reference types="vite/client" />

interface Window {
  KB_I18N: {
    apply(root?: ParentNode): void;
    getLocale(): "zh-Hant" | "en";
    setLocale(locale: string): void;
    supportedLocales: readonly string[];
    t(key: string, variables?: Readonly<Record<string, string | number>>): string;
  };
}
