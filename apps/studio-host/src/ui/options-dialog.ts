import { OptionsDialog as UpstreamOptionsDialog } from '@upstream/ui/options-dialog';

const THEME_STORAGE_KEY = 'fuck-hancom-theme';

interface ThemeOption {
  value: string;
  label: string;
  preview: string;
}

const themes: ThemeOption[] = [
  { value: 'light', label: '밝게', preview: '#f0f0f0' },
  { value: 'dark', label: '어둡게', preview: '#1e1e1e' },
  { value: 'sepia', label: '세피아', preview: '#f4ecd8' },
  { value: 'high-contrast', label: '고대비', preview: '#fff' },
];

function getSavedTheme(): string {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) || 'light';
  } catch {
    return 'light';
  }
}

function saveTheme(value: string): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, value);
  } catch { /* ignore */ }
}

function applyTheme(value: string): void {
  if (value === 'light') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', value);
  }
}

export function initTheme(): void {
  applyTheme(getSavedTheme());
}

export class OptionsDialog extends UpstreamOptionsDialog {
  protected override createBody(): HTMLElement {
    const body = super.createBody();

    const currentTheme = getSavedTheme();

    // 테마 탭 버튼
    const tabs = body.querySelector('.dialog-tabs') as HTMLElement;
    const themeTab = document.createElement('button');
    themeTab.className = 'dialog-tab';
    themeTab.textContent = '테마';
    themeTab.dataset.tab = 'theme';
    tabs.appendChild(themeTab);

    // 테마 탭 패널
    const themePanel = document.createElement('div');
    themePanel.className = 'dialog-tab-panel opt-tab-panel';
    themePanel.dataset.tab = 'theme';

    const section = document.createElement('div');
    section.className = 'dialog-section';

    const title = document.createElement('div');
    title.className = 'dialog-section-title';
    title.textContent = '색상 테마';
    section.appendChild(title);

    const desc = document.createElement('p');
    desc.className = 'opt-desc';
    desc.textContent = '에디터와 UI의 색상 테마를 선택합니다.';
    section.appendChild(desc);

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;';

    for (const theme of themes) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'opt-theme-card';
      card.dataset.theme = theme.value;
      if (theme.value === currentTheme) {
        card.classList.add('active');
      }

      const swatch = document.createElement('span');
      swatch.className = 'opt-theme-swatch';
      swatch.style.backgroundColor = theme.preview;

      const label = document.createElement('span');
      label.className = 'opt-theme-label';
      label.textContent = theme.label;

      card.appendChild(swatch);
      card.appendChild(label);

      card.addEventListener('click', () => {
        grid.querySelectorAll('.opt-theme-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        applyTheme(theme.value);
        saveTheme(theme.value);
      });

      grid.appendChild(card);
    }

    section.appendChild(grid);
    themePanel.appendChild(section);
    body.appendChild(themePanel);

    return body;
  }
}
