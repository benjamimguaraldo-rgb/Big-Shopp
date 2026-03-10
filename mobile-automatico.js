document.addEventListener("DOMContentLoaded", function() {
    // Função para detectar mobile (user agent + largura da tela)
    function isMobileDevice() {
        const userAgentMatch = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const widthMatch = window.innerWidth <= 768;
        return userAgentMatch || widthMatch;
    }

    // Função que aplica transformações no DOM quando em mobile
    function applyMobileTransformations() {
        if (!document.body.classList.contains('modo-mobile')) return;

        // 1. Seleciona elementos que tenham pelo menos 2 filhos diretos (qualquer tipo)
        const elementosComFilhos = document.querySelectorAll('body *');
        
        elementosComFilhos.forEach(el => {
            // Verifica se o elemento tem pelo menos 2 filhos diretos (incluindo texto? vamos considerar elementos HTML)
            // Para evitar textos isolados, contamos apenas children (nós de elemento)
            const filhos = Array.from(el.children).filter(child => child.nodeType === 1); // apenas elementos
            if (filhos.length >= 2) {
                el.classList.add('container-mobile-auto');
            } else {
                // Remove a classe se não tiver mais 2 filhos (para casos de redimensionamento/dinâmico)
                el.classList.remove('container-mobile-auto');
            }
        });

        // 2. Força redimensionamento de imagens e textos já cobertos pelo CSS
    }

    // Função principal que ativa/desativa modo mobile
    function toggleMobileMode() {
        const isMobile = isMobileDevice();
        
        if (isMobile) {
            document.body.classList.add('modo-mobile');
            console.log("📱 Modo Mobile Ativado");
            applyMobileTransformations();
        } else {
            document.body.classList.remove('modo-mobile');
            // Remove classes automáticas
            document.querySelectorAll('.container-mobile-auto').forEach(el => {
                el.classList.remove('container-mobile-auto');
            });
            console.log("💻 Modo Desktop Ativado");
        }
    }

    // Executa no carregamento
    toggleMobileMode();

    // Observa mudanças no DOM (para elementos adicionados dinamicamente)
    const observer = new MutationObserver(() => {
        if (document.body.classList.contains('modo-mobile')) {
            applyMobileTransformations();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Reage ao redimensionamento da tela
    window.addEventListener('resize', () => {
        toggleMobileMode();
    });
});