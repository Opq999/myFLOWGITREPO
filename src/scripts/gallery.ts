import {
  controlFor,
  defaultValues,
  formatValue,
  serializeTheme,
  type TokenValues,
} from '../lib/gallery-tokens';

const STORAGE_KEY = 'myflow-gallery';

function readStorage(): TokenValues {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TokenValues) : {};
  } catch {
    return {};
  }
}

function writeStorage(values: TokenValues): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  } catch {
    /* storage blocked (e.g. private mode): keep in-memory only */
  }
}

function init(): void {
  const stage = document.getElementById('gallery-stage');
  if (!stage) return;
  const preview = document.getElementById('gallery-export');
  const inputs = Array.from(
    document.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-token-var]')
  );

  const values: TokenValues = { ...defaultValues(), ...readStorage() };

  const apply = (varName: string): void => {
    const control = controlFor(varName);
    if (!control) return;
    stage.style.setProperty(varName, formatValue(control, values[varName]));
  };
  const refreshExport = (): void => {
    if (preview) preview.textContent = serializeTheme(values);
  };

  for (const input of inputs) {
    const varName = input.dataset.tokenVar;
    if (!varName) continue;
    if (values[varName] !== undefined) input.value = String(values[varName]);
    input.addEventListener('input', () => {
      values[varName] = input.type === 'range' ? Number(input.value) : input.value;
      apply(varName);
      writeStorage(values);
      refreshExport();
    });
    apply(varName);
  }
  refreshExport();

  const copyBtn = document.getElementById('gallery-copy');
  copyBtn?.addEventListener('click', () => {
    navigator.clipboard.writeText(serializeTheme(values)).then(() => {
      const original = copyBtn.textContent;
      copyBtn.textContent = 'Copied ✓';
      setTimeout(() => {
        copyBtn.textContent = original;
      }, 2000);
    });
  });

  const resetBtn = document.getElementById('gallery-reset');
  resetBtn?.addEventListener('click', () => {
    const defaults = defaultValues();
    for (const key of Object.keys(values)) delete values[key];
    Object.assign(values, defaults);
    for (const input of inputs) {
      const varName = input.dataset.tokenVar;
      if (!varName) continue;
      input.value = String(values[varName]);
      stage.style.removeProperty(varName);
    }
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    refreshExport();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
