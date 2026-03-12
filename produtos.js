const API = "https://big-shopp.onrender.com";

// ====================== SISTEMA DE SENHA ======================

function getSenhaUsuario() {
    let senha = localStorage.getItem('senha_carrinho');
    
    if (!senha) {
        senha = prompt("🔐 DIGITE SUA SENHA DE 4 DÍGITOS:", "0000");
        if (senha && senha.length >= 4) {
            localStorage.setItem('senha_carrinho', senha);
            return senha;
        } else {
            alert("❌ Senha inválida! Use pelo menos 4 números.");
            return null;
        }
    }
    return senha;
}

// ====================== ADICIONAR AO CARRINHO ======================

async function adicionarAoCarrinho(produto) {
    console.log("🛒 Tentando adicionar:", produto);
    
    // PASSO 1: PEDIR SENHA
    const senha = getSenhaUsuario();
    if (!senha) return;
    
    console.log("🔐 Senha:", senha);
    
    // PASSO 2: PREPARAR PRODUTO
    const item = {
        id: produto.id,
        nome: produto.nome,
        preco: produto.preco,
        imagem: produto.imagem,
        quantidade: 1
    };
    
    // PASSO 3: SALVAR NO SERVIDOR (depois) 
    // Por enquanto, salva no localStorage
    let carrinho = JSON.parse(localStorage.getItem(`carrinho_${senha}`)) || [];
    
    const existe = carrinho.find(i => i.id === item.id);
    if (existe) {
        existe.quantidade += 1;
    } else {
        carrinho.push(item);
    }
    
    localStorage.setItem(`carrinho_${senha}`, JSON.stringify(carrinho));
    alert(`✅ ${produto.nome} adicionado ao carrinho!`);
}

// ====================== COMPRAR AGORA ======================

function comprarAgora(produto) {
    adicionarAoCarrinho(produto);
    setTimeout(() => {
        window.location.href = "carrinho.html";
    }, 500);
}

// ====================== CARREGAR PRODUTOS ======================

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
    } catch (error) {
        console.error("Erro ao carregar produtos:", error);
    }
}
carregarProdutos();