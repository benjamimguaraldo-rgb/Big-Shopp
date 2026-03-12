const API = "https://big-shopp.onrender.com";

async function carregarProdutos() {
    try {
        const resposta = await fetch(API + "/produtos");
        const produtos = await resposta.json();

        const container = document.querySelector(".container-produtos");
        container.innerHTML = "";

        produtos.forEach(p => {
            const produtoJSON = JSON.stringify(p).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
            
            const card = document.createElement("div");
            card.className = "produto-card";
            
            card.innerHTML = `
                <div class="produto-imagem">
                    <img src="${p.imagem}" alt="${p.nome}">
                </div>
                <div class="produto-info">
                    <h2>${p.nome}</h2>
                    <p>${p.descricao}</p>
                    <div class="produto-preco">R$ ${p.preco.toFixed(2)}</div>
                    <div class="produto-botoes">
                        <button onclick='adicionarAoCarrinho(${produtoJSON})'>
                            Adicionar
                        </button>
                        <button onclick='comprarAgora(${produtoJSON})'>
                            Comprar
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error("Erro ao carregar produtos:", error);
    }
}

// Compra direta (adiciona e vai pro carrinho)
function comprarAgora(produto) {
    adicionarAoCarrinho(produto);
    setTimeout(() => {
        window.location.href = "carrinho.html";
    }, 500);
}

carregarProdutos();