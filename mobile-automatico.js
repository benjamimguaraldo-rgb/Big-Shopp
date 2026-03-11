/**
 * mobile.js – Detecta mobile e aplica classe
 * Sem viewport, o navegador já renderiza em largura desktop.
 * A classe 'modo-mobile' só aumenta os elementos.
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
            console.log('📱 Modo mobile ativado – tudo maior!');
        } else {
            body.classList.remove('modo-mobile');
            console.log('💻 Modo desktop ativado');
        }
    }

    updateMobileClass();
    document.addEventListener('DOMContentLoaded', updateMobileClass);

    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(updateMobileClass, 150);
    });
})();