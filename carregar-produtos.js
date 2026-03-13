// ====================== CONFIGURAÇÃO ======================
const API = "https://big-shopp.onrender.com";

// ====================== FUNÇÕES DE SENHA ======================

function getSenha() {
    let senha = localStorage.getItem('senha_carrinho');
    
    if (!senha) {
        senha = prompt("🔐 DIGITE SUA SENHA DE 4 DÍGITOS (CRIE UMA AGORA):", "0000");
        
        // Validação
        if (!senha || senha.length !== 4 || isNaN(senha)) {
            alert('❌ Senha inválida! Use 4 dígitos numéricos.');
            return null;
        }
        
        localStorage.setItem('senha_carrinho', senha);
        alert('✅ Senha criada com sucesso!');
    }
    
    return senha;
}

// ====================== FUNÇÃO ADICIONAR AO CARRINHO ======================

async function adicionarAoCarrinho(produto) {
    console.log("🛒 Adicionando ao carrinho:", produto);
    
    // 👉 PEDE A SENHA
    const senha = getSenha();
    if (!senha) return;
    
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
        alert('Erro ao adicionar produto. Verifique o servidor.');
    }
}

// ====================== FUNÇÃO COMPRAR AGORA ======================

function comprarAgora(produto) {
    console.log("🛒 Comprar agora:", produto);
    
    // 👉 PEDE A SENHA
    const senha = getSenha();
    if (!senha) return;
    
    // Cria um carrinho temporário só com este produto
    const carrinhoTemp = [{
        id: produto.id,
        nome: produto.nome,
        preco: produto.preco,
        imagem: produto.imagem,
        quantidade: 1
    }];
    
    // Salva no sessionStorage para o checkout
    sessionStorage.setItem('checkout_produtos', JSON.stringify(carrinhoTemp));
    sessionStorage.setItem('checkout_senha', senha);
    
    // Vai direto pro checkout
    window.location.href = 'checkout.html';
}

// ====================== CARREGAR PRODUTOS ======================

function carregarProdutos() {
    console.log("📦 Carregando produtos fixos...");
    
    const container = document.querySelector(".container-produtos");
    if (!container) return;
    
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
                        💳 COMPRAR AGORA
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// ====================== INICIALIZAÇÃO ======================

document.addEventListener('DOMContentLoaded', carregarProdutos);