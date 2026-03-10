const API = "https://big-shopp.onrender.com";

async function carregarProdutos() {
    const resposta = await fetch(API + "/produtos");
    const produtos = await resposta.json();

    const container = document.querySelector(".container-produtos");
    container.innerHTML = "";

    produtos.forEach(p => {
        const card = document.createElement("div");
        card.className = "produto-card";

        // Usamos aspas simples ' ao redor do JSON.stringify para não quebrar o HTML
        card.innerHTML = `
            <div class="produto-imagem">
                <img src="${p.imagem}">
            </div>
            <div class="produto-info">
                <h2>${p.nome}</h2>
                <p>${p.descricao}</p>
                <div class="produto-preco">R$ ${p.preco.toFixed(2)}</div>
                <div class="produto-botoes">
                    <button onclick='adicionarAoCarrinho(${JSON.stringify(p)})'>
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
}

function adicionarAoCarrinho(produto) {
    let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
    carrinho.push(produto);
    localStorage.setItem('carrinho', JSON.stringify(carrinho));
    
    // Opcional: Feedback visual mais moderno que o alert
    console.log("Carrinho atual:", carrinho);
    alert(`${produto.nome} adicionado ao carrinho!`);
}

function comprar(id) {
    // Se quiser que o botão comprar já leve pro carrinho:
    // adicionarAoCarrinho(produtoDaVez);
    window.location.href = "carrinho.html"; 
}

carregarProdutos();