/**
 * mobile.js – Detecção mobile + Draggable Header HORIZONTAL
 */
(function() {
    'use strict';

    function isMobileDevice() {
        const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
        return mobileUA.test(navigator.userAgent) || window.innerWidth <= 768;
    }

    function updateMobileClass() {
        const body = document.body;
        if (isMobileDevice()) {
            body.classList.add('modo-mobile');
            body.classList.remove('modo-desktop');
            console.log('📱 Modo mobile ativado');
            setTimeout(initHorizontalDrag, 100);
        } else {
            body.classList.remove('modo-mobile');
            body.classList.add('modo-desktop');
            document.body.style.marginTop = '';
            document.body.style.paddingLeft = ''; // Reseta padding horizontal
            const oldBar = document.querySelector('.horizontal-drag-bar');
            if (oldBar) oldBar.remove();
            console.log('💻 Modo desktop ativado');
        }
    }

    // DRAGBAR HORIZONTAL
    function initHorizontalDrag() {
        // Remove barra antiga
        const oldBar = document.querySelector('.horizontal-drag-bar');
        if (oldBar) oldBar.remove();

        const header = document.querySelector('.headerprincipal');
        if (!header) return;

        // CRIA A DRAGBAR HORIZONTAL
        const dragBar = document.createElement('div');
        dragBar.className = 'horizontal-drag-bar';
        
        // Adiciona no final do header (lado direito)
        header.appendChild(dragBar);

        let startX = 0;
        let startPadding = 0;
        let isDragging = false;

        // Touch events
        dragBar.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startPadding = parseInt(getComputedStyle(document.body).paddingLeft) || 0;
            isDragging = true;
            dragBar.classList.add('dragging');
            e.preventDefault();
        });

        dragBar.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            
            const currentX = e.touches[0].clientX;
            const diff = currentX - startX;
            let newPadding = startPadding + diff;
            
            // Limites: mínimo 0, máximo 100px
            newPadding = Math.max(0, Math.min(100, newPadding));
            
            document.body.style.paddingLeft = newPadding + 'px';
            e.preventDefault();
        });

        dragBar.addEventListener('touchend', () => {
            isDragging = false;
            dragBar.classList.remove('dragging');
        });

        // Mouse events (para teste)
        dragBar.addEventListener('mousedown', (e) => {
            startX = e.clientX;
            startPadding = parseInt(getComputedStyle(document.body).paddingLeft) || 0;
            isDragging = true;
            dragBar.classList.add('dragging');
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const currentX = e.clientX;
            const diff = currentX - startX;
            let newPadding = startPadding + diff;
            
            newPadding = Math.max(0, Math.min(100, newPadding));
            
            document.body.style.paddingLeft = newPadding + 'px';
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            dragBar.classList.remove('dragging');
        });

        console.log('➡️ Dragbar HORIZONTAL adicionada');
    }

    updateMobileClass();
    document.addEventListener('DOMContentLoaded', updateMobileClass);

    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(updateMobileClass, 150);
    });
})();