const API = "https://big-shopp.onrender.com";

// ====================== CARREGAR PRODUTOS ======================

function carregarProdutos() {
    console.log("📦 Carregando produtos fixos...");
    
    const container = document.querySelector(".container-produtos");
    if (!container) {
        console.error("❌ Container não encontrado!");
        return;
    }
    
    container.innerHTML = "";

    PRODUTOS.forEach(p => {
        const produtoJSON = JSON.stringify(p).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
        
        const card = document.createElement("div");
        card.className = "produto-card";
        
        card.innerHTML = `
            <div class="produto-imagem">
                <img src="${p.imagem}" alt="${p.nome}" onerror="this.src='https://via.placeholder.com/300x280'">
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
                        💳 COMPRAR
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// ====================== FUNÇÕES DO CARRINHO (ADICIONADAS AQUI) ======================

// Função para adicionar ao carrinho
async function adicionarAoCarrinho(produto) {
    console.log("🛒 Adicionando ao carrinho:", produto);
    
    let senha = localStorage.getItem('senha_carrinho');
    
    if (!senha) {
        alert('🔐 Você precisa criar uma senha primeiro!');
        window.location.href = 'carrinho.html';
        return;
    }
    
    try {
        // Carrega carrinho atual do servidor
        const response = await fetch(`${API}/carrinho/carregar/${senha}`);
        const data = await response.json();
        let carrinho = data.produtos || [];
        
        // Verifica se produto já existe
        const existe = carrinho.find(item => item.id === produto.id);
        
        if (existe) {
            existe.quantidade = (existe.quantidade || 1) + 1;
        } else {
            produto.quantidade = 1;
            carrinho.push(produto);
        }
        
        // Salva no servidor
        await fetch(`${API}/carrinho/salvar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                senha: senha,
                produtos: carrinho
            })
        });
        
        alert(`✅ ${produto.nome} adicionado ao carrinho!`);
        
    } catch (error) {
        console.error("❌ Erro:", error);
        alert('Erro ao adicionar produto');
    }
}

// Função para comprar agora (adiciona e redireciona)
function comprarAgora(produto) {
    console.log("🛒 Comprar agora:", produto);
    
    // Primeiro adiciona ao carrinho
    adicionarAoCarrinho(produto);
    
    // Depois redireciona (com um pequeno delay pra garantir que salvou)
    setTimeout(() => {
        window.location.href = 'carrinho.html';
    }, 500);
}

// ====================== INICIALIZAÇÃO ======================

// Carrega produtos quando a página abrir
document.addEventListener('DOMContentLoaded', carregarProdutos);