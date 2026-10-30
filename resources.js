const themeToggle = document.querySelector('#themeToggle');
function applyTheme(theme) { document.documentElement.dataset.theme = theme; const dark = theme === 'dark'; themeToggle.querySelector('.theme-label').textContent = dark ? 'Light' : 'Dark'; themeToggle.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`); themeToggle.title = themeToggle.getAttribute('aria-label'); }
applyTheme(localStorage.getItem('streetcheck-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
themeToggle.addEventListener('click', () => { const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; localStorage.setItem('streetcheck-theme', next); applyTheme(next); });
