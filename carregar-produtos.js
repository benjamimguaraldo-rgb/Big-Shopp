// ====================== CARREGAR PRODUTOS FIXOS ======================

function carregarProdutos() {
    console.log("📦 Carregando produtos fixos...");
    
    const container = document.querySelector(".container-produtos");
    if (!container) {
        console.error("❌ Container .container-produtos não encontrado!");
        return;
    }
    
    container.innerHTML = "";

    PRODUTOS.forEach(p => {
        const produtoJSON = JSON.stringify(p).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
        
        const card = document.createElement("div");
        card.className = "produto-card";
        
        card.innerHTML = `
            <div class="produto-imagem">
                <img src="${p.imagem}" alt="${p.nome}" onerror="this.src='https://via.placeholder.com/200'">
            </div>
            <div class="produto-info">
                <h2>${p.nome}</h2>
                <p>${p.descricao}</p>
                <div class="produto-preco">R$ ${p.preco.toFixed(2)}</div>
                <div class="produto-botoes">
                    <button class="btn-adicionar" onclick='adicionarAoCarrinho(${produtoJSON})'>
                        🛒 ADICIONAR
                    </button>
                    <button class="btn-comprar" onclick='comprarAgora(${produtoJSON})'>
                        💳 COMPRAR AGORA
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Carrega quando a página abrir
document.addEventListener('DOMContentLoaded', carregarProdutos);