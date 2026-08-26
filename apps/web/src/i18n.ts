import { computed, ref } from "vue";

import "../i18n.js";

const locale = ref(window.KB_I18N.getLocale());

export function useI18n() {
  return {
    locale: computed(() => locale.value),
    t: (key: string, variables?: Readonly<Record<string, string | number>>) => {
      void locale.value;
      return window.KB_I18N.t(key, variables);
    },
    setLocale(next: string) {
      window.KB_I18N.setLocale(next);
      locale.value = window.KB_I18N.getLocale();
    },
  };
}
