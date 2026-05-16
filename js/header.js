/* ============================================
   Portfolio - Global Header Component
   Version: 1.2
   
   Edit this file to update the header across
   all pages. The script auto-detects the 
   current page and adjusts links accordingly.
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {
    const placeholder = document.getElementById('header-placeholder');
    if (!placeholder) return;

    // Detect if we are on the index/home page
    const path = window.location.pathname;
    const isHome = path.endsWith('/') || path.endsWith('/index.html') || path.endsWith('index.html');

    // Build link prefixes: on index use anchors directly, on subpages prefix with base path
    const prefix = isHome ? '' : '/';

    const headerHTML = `
        <header class="fixed top-0 left-0 right-0 z-50 w-full border-b border-border-light bg-background-light/80 backdrop-blur-md dark:border-gray-800 dark:bg-background-dark/80">
            <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                <div class="flex items-center gap-2">
                    <a href="/" class="flex items-center gap-2 group">
                        <div class="flex size-8 items-center justify-center rounded-lg bg-primary text-white group-hover:bg-primary-dark transition-colors">
                            <span class="material-symbols-outlined text-[20px]">code</span>
                        </div>
                        <span class="text-lg font-bold tracking-tight text-text-main dark:text-white">Louei</span>
                    </a>
                </div>
                <nav class="hidden md:flex items-center gap-8">
                    <a class="text-sm font-medium text-text-muted hover:text-primary transition-colors dark:text-gray-400 dark:hover:text-primary"
                        href="${prefix}#services">Services</a>
                    <a class="text-sm font-medium text-text-muted hover:text-primary transition-colors dark:text-gray-400 dark:hover:text-primary"
                        href="/projects">Projects</a>
                    <a class="text-sm font-medium text-text-muted hover:text-primary transition-colors dark:text-gray-400 dark:hover:text-primary"
                        href="${prefix}#philosophy">Philosophy</a>
                    <a class="text-sm font-medium text-text-muted hover:text-primary transition-colors dark:text-gray-400 dark:hover:text-primary"
                        href="${prefix}#experience">Experience</a>
                    <a class="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-all hover:bg-primary-dark"
                        href="${prefix}#contact">Contact Me</a>
                </nav>
                <div class="md:hidden">
                    <button id="mobile-menu-btn" class="text-text-main p-2">
                        <span class="material-symbols-outlined">menu</span>
                    </button>
                </div>
            </div>
            <!-- Mobile Menu -->
            <div id="mobile-menu"
                class="hidden md:hidden absolute top-16 left-0 w-full bg-background-light/95 backdrop-blur-md border-b border-border-light dark:bg-background-dark/95 dark:border-gray-800 p-4 flex flex-col gap-4 shadow-lg">
                <a class="text-sm font-medium text-text-muted hover:text-primary transition-colors dark:text-gray-400 dark:hover:text-primary"
                    href="${prefix}#services">Services</a>
                <a class="text-sm font-medium text-text-muted hover:text-primary transition-colors dark:text-gray-400 dark:hover:text-primary"
                    href="/projects">Projects</a>
                <a class="text-sm font-medium text-text-muted hover:text-primary transition-colors dark:text-gray-400 dark:hover:text-primary"
                    href="${prefix}#philosophy">Philosophy</a>
                <a class="text-sm font-medium text-text-muted hover:text-primary transition-colors dark:text-gray-400 dark:hover:text-primary"
                    href="${prefix}#experience">Experience</a>
                <a class="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-all hover:bg-primary-dark text-center"
                    href="${prefix}#contact">Contact Me</a>
            </div>
        </header>
    `;

    placeholder.innerHTML = headerHTML;

    // Mobile Menu Toggle — must be attached here, after the header HTML is injected
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function () {
            mobileMenu.classList.toggle('hidden');
        });

        // Close mobile menu when a link is clicked
        mobileMenu.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () {
                mobileMenu.classList.add('hidden');
            });
        });
    }
});
