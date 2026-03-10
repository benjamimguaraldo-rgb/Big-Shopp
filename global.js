document.addEventListener("DOMContentLoaded", function() {
    // Detecta se o dispositivo é mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
        document.body.classList.add('modo-mobile');
        console.log("📱 Modo Mobile Ativado");
    } else {
        console.log("💻 Modo Desktop Ativado");
    }
});