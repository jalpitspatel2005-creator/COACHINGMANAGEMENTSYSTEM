// Theme Toggle Logic
document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtn = document.createElement('button');
    themeToggleBtn.className = 'theme-toggle';
    themeToggleBtn.id = 'themeToggle';
    themeToggleBtn.innerHTML = '🌙';
    themeToggleBtn.title = 'Toggle Dark/Light Mode';
    document.body.appendChild(themeToggleBtn);

    const currentTheme = localStorage.getItem('theme') || 'light';
    
    // Apply initial theme
    if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggleBtn.innerHTML = '☀️';
    }

    themeToggleBtn.addEventListener('click', () => {
        let theme = document.documentElement.getAttribute('data-theme');
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
            themeToggleBtn.innerHTML = '🌙';
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            themeToggleBtn.innerHTML = '☀️';
        }
    });
});
