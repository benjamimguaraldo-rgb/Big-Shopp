

// ====================== GERENCIAMENTO DE SENHA ======================

// Pega a senha do localStorage ou pergunta
function getSenhaUsuario() {
    let senha = localStorage.getItem('senha_carrinho');
    
    if (!senha) {
        senha = prompt("🔐 Digite sua senha de 4 dígitos:", "0000");
        if (senha && senha.length >= 4) {
            localStorage.setItem('senha_carrinho', senha);
        } else {
            alert("Senha inválida! Use pelo menos 4 dígitos.");
            return null;
        }
    }
    
    return senha;
}

// Limpa a senha (pra trocar de usuário)
function logoutCarrinho() {
    localStorage.removeItem('senha_carrinho');
    localStorage.removeItem('carrinho_local'); // Remove carrinho local
    alert("👋 Senha removida!");
    window.location.reload();
}

// ====================== FUNÇÕES DO CARRINHO ======================

// Adicionar produto (com senha)
async function adicionarAoCarrinho(produto) {
    const senha = getSenhaUsuario();
    if (!senha) return;
    
    console.log("🔐 Adicionando com senha:", senha);
    console.log("📦 Produto:", produto);
    
    try {
        const response = await fetch(`${API}/carrinho/adicionar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                senha: senha,
                produto: produto
            })
        });
        
        const data = await response.json();
        
        if (data.sucesso) {
            alert(`✅ Produto adicionado! (Total: ${data.total} itens)`);
            atualizarBadgeCarrinho();
        } else {
            alert("❌ Erro: " + (data.erro || "Erro desconhecido"));
        }
    } catch (error) {
        console.error("❌ Erro:", error);
        alert("Erro ao conectar com servidor");
    }
}

// Carregar carrinho do servidor (pra página do carrinho)
async function carregarCarrinhoServidor() {
    const senha = localStorage.getItem('senha_carrinho');
    
    if (!senha) {
        // Se não tem senha, pergunta
        const novaSenha = prompt("🔐 Digite sua senha para ver o carrinho:");
        if (novaSenha) {
            localStorage.setItem('senha_carrinho', novaSenha);
            return carregarCarrinhoServidor();
        } else {
            window.location.href = 'produtos.html';
            return;
        }
    }
    
    console.log("🔐 Carregando carrinho da senha:", senha);
    
    try {
        const response = await fetch(`${API}/carrinho/carregar/${senha}`);
        const data = await response.json();
        
        if (data.sucesso) {
            console.log("📦 Produtos carregados:", data.produtos);
            mostrarCarrinho(data.produtos);
            // Salva uma cópia local (opcional)
            localStorage.setItem('carrinho_local', JSON.stringify(data.produtos));
        } else {
            console.error("❌ Erro:", data.erro);
            alert("Erro ao carregar carrinho");
        }
    } catch (error) {
        console.error("❌ Erro:", error);
        alert("Erro ao conectar com servidor");
    }
}

// Mostrar carrinho na tela
function mostrarCarrinho(produtos) {
    const listaElemento = document.getElementById('lista-carrinho');
    const totalElemento = document.getElementById('valor-total');
    
    if (!listaElemento) return;
    
    if (!produtos || produtos.length === 0) {
        listaElemento.innerHTML = '<div class="carrinho-vazio">🛒 Carrinho vazio</div>';
        if (totalElemento) totalElemento.innerText = "0.00";
        return;
    }
    
    listaElemento.innerHTML = "";
    let somaTotal = 0;
    
    produtos.forEach((item, index) => {
        const quantidade = item.quantidade || 1;
        const subtotal = item.preco * quantidade;
        somaTotal += subtotal;
        
        listaElemento.innerHTML += `
            <div class="item-carrinho">
                <img src="${item.imagem}" style="width:50px;height:50px;object-fit:cover;">
                <div class="item-info">
                    <p><strong>${item.nome}</strong></p>
                    <p>R$ ${item.preco.toFixed(2)}</p>
                </div>
                <div class="item-quantidade">
                    <button onclick="alterarQuantidade(${index}, -1)">-</button>
                    <span>${quantidade}</span>
                    <button onclick="alterarQuantidade(${index}, 1)">+</button>
                </div>
                <div class="item-subtotal">R$ ${subtotal.toFixed(2)}</div>
                <button class="btn-remover" onclick="removerItem(${index})">🗑️</button>
            </div>
        `;
    });
    
    if (totalElemento) {
        totalElemento.innerText = somaTotal.toFixed(2);
    }
}

// Alterar quantidade (precisa atualizar no servidor)
async function alterarQuantidade(index, delta) {
    const senha = localStorage.getItem('senha_carrinho');
    if (!senha) return;
    
    let produtos = JSON.parse(localStorage.getItem('carrinho_local')) || [];
    
    if (produtos[index]) {
        produtos[index].quantidade = (produtos[index].quantidade || 1) + delta;
        
        if (produtos[index].quantidade <= 0) {
            produtos.splice(index, 1);
        }
        
        // Atualiza no servidor
        try {
            await fetch(`${API}/carrinho/salvar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    senha: senha,
                    produtos: produtos
                })
            });
            
            localStorage.setItem('carrinho_local', JSON.stringify(produtos));
            carregarCarrinhoServidor(); // Recarrega
        } catch (error) {
            console.error("❌ Erro:", error);
        }
    }
}

// Remover item
async function removerItem(index) {
    if (!confirm("Remover item?")) return;
    
    const senha = localStorage.getItem('senha_carrinho');
    if (!senha) return;
    
    let produtos = JSON.parse(localStorage.getItem('carrinho_local')) || [];
    produtos.splice(index, 1);
    
    try {
        await fetch(`${API}/carrinho/salvar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                senha: senha,
                produtos: produtos
            })
        });
        
        localStorage.setItem('carrinho_local', JSON.stringify(produtos));
        carregarCarrinhoServidor();
    } catch (error) {
        console.error("❌ Erro:", error);
    }
}

// Finalizar compra
function finalizarCompra() {
    const senha = localStorage.getItem('senha_carrinho');
    if (!senha) {
        alert("🔐 Identifique-se primeiro!");
        return;
    }
    
    window.location.href = 'checkout.html';
}

// Badge no header (opcional)
function atualizarBadgeCarrinho() {
    const badge = document.getElementById('badge-carrinho');
    if (badge) {
        const produtos = JSON.parse(localStorage.getItem('carrinho_local')) || [];
        badge.textContent = produtos.length;
    }
}