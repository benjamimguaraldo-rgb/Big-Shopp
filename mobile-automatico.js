/**
 * mobile.js – Detecção e ajustes para modo mobile
 * - Adiciona classe 'modo-mobile' ao <body> quando necessário
 * - Remove a classe em desktop
 * - Reage a redimensionamento da janela
 */
(function() {
    'use strict';

    // 1. Função que detecta se é um dispositivo móvel
    function isMobileDevice() {
        // User agents mobile comuns
        const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
        // Retorna true se for mobile OU largura da tela <= 768px
        return mobileUA.test(navigator.userAgent) || window.innerWidth <= 768;
    }

    // 2. Atualiza a classe no <body> conforme o resultado
    function updateMobileClass() {
        const body = document.body;
        if (isMobileDevice()) {
            body.classList.add('modo-mobile');
            body.classList.remove('modo-desktop');
            console.log('📱 Modo mobile ativado (largura: ' + window.innerWidth + 'px)');
        } else {
            body.classList.remove('modo-mobile');
            body.classList.add('modo-desktop');
            console.log('💻 Modo desktop ativado (largura: ' + window.innerWidth + 'px)');
        }
    }

    // 3. Executa imediatamente (caso o DOM já esteja carregado)
    updateMobileClass();

    // 4. Executa quando o DOM estiver pronto
    document.addEventListener('DOMContentLoaded', updateMobileClass);

    // 5. Executa com debounce no redimensionamento da janela
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(updateMobileClass, 150);
    });
})();