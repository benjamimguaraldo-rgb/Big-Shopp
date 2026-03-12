const API = "https://big-shopp.onrender.com";

async function carregarProdutos() {
    try {
        const resposta = await fetch(API + "/produtos");
        const produtos = await resposta.json();

        const container = document.querySelector(".container-produtos");
        container.innerHTML = "";

        produtos.forEach(p => {
            // Escapa os dados para não quebrar o HTML
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
                        <button onclick="comprar(${p.id})">
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

function adicionarAoCarrinho(produto) {
    let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
    
    // Verifica se produto já existe
    const existe = carrinho.find(item => item.id === produto.id);
    
    if (existe) {
        existe.quantidade = (existe.quantidade || 1) + 1;
    } else {
        produto.quantidade = 1;
        carrinho.push(produto);
    }
    
    localStorage.setItem('carrinho', JSON.stringify(carrinho));
    alert(`✅ ${produto.nome} adicionado!`);
}

function comprar(id) {
    window.location.href = "carrinho.html";
}

carregarProdutos();