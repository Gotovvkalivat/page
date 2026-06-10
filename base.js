document.addEventListener('DOMContentLoaded', () => {
    if (typeof openMegaModal === 'function') {
        openMegaModal();
        setTimeout(() => {
            const shadow = document.getElementById('ops-modal-host').shadowRoot;
            const megaLayout = shadow.querySelector('.layout-mega');
            if (megaLayout) megaLayout.classList.add('fullscreen');
            const closeBtn = shadow.getElementById('mega-modal-close');
            if (closeBtn) closeBtn.style.display = 'none';
        }, 300);
    }
});