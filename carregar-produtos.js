// ====================== CARREGAR-PRODUTOS.JS ======================
// (assumindo que config.js já carrega a API)

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
        
        // 👉 CRIA OS BOTÕES COM FUNÇÕES GLOBAIS
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
                        💳 COMPRAR AGORA
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// ====================== FUNÇÃO ADICIONAR AO CARRINHO (COM PEDIDO DE SENHA) ======================

window.adicionarAoCarrinho = async function(produto) {
    console.log("🛒 Adicionando ao carrinho:", produto);
    
    // 👉 VERIFICA SE JÁ TEM SENHA
    let senha = localStorage.getItem('senha_carrinho');
    
    // 👉 SE NÃO TIVER, PEDE AGORA!
    if (!senha) {
        senha = prompt("🔐 DIGITE SUA SENHA DE 4 DÍGITOS (CRIE UMA AGORA):", "0000");
        
        if (!senha || senha.length < 4) {
            alert('❌ Senha inválida! Use 4 dígitos.');
            return;
        }
        
        localStorage.setItem('senha_carrinho', senha);
        alert('✅ Senha criada com sucesso!');
    }
    
    try {
        // Carrega carrinho atual
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
        alert('Erro ao adicionar produto. Verifique o servidor.');
    }
};

// ====================== FUNÇÃO COMPRAR AGORA ======================

window.comprarAgora = async function(produto) {
    console.log("🛒 Comprar agora:", produto);
    
    // 👉 VERIFICA SENHA
    let senha = localStorage.getItem('senha_carrinho');
    
    if (!senha) {
        senha = prompt("🔐 DIGITE SUA SENHA DE 4 DÍGITOS (CRIE UMA AGORA):", "0000");
        
        if (!senha || senha.length < 4) {
            alert('❌ Senha inválida! Use 4 dígitos.');
            return;
        }
        
        localStorage.setItem('senha_carrinho', senha);
        alert('✅ Senha criada com sucesso!');
    }
    
    // Cria carrinho temporário
    const carrinhoTemp = [{
        id: produto.id,
        nome: produto.nome,
        preco: produto.preco,
        imagem: produto.imagem,
        quantidade: 1
    }];
    
    // Salva no sessionStorage
    sessionStorage.setItem('checkout_produtos', JSON.stringify(carrinhoTemp));
    sessionStorage.setItem('checkout_senha', senha);
    
    // Vai pro checkout
    window.location.href = 'checkout.html';
};

// ====================== INICIALIZAÇÃO ======================

// Carrega produtos quando a página abrir
document.addEventListener('DOMContentLoaded', carregarProdutos);