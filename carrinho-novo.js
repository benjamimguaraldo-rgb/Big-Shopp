
let senhaAtual = null;
let produtosCarrinho = [];

// ====================== CARREGAR CARRINHO ======================

document.addEventListener('DOMContentLoaded', function() {
    const senhaSalva = localStorage.getItem('senha_carrinho');
    
    if (!senhaSalva) {
        alert('🔐 Você precisa criar uma senha primeiro!');
        window.location.href = 'produtos.html';
        return;
    }
    
    senhaAtual = senhaSalva;
    carregarCarrinhoServidor(senhaSalva);
});

async function carregarCarrinhoServidor(senha) {
    try {
        const response = await fetch(`${API}/carrinho/carregar/${senha}`);
        const data = await response.json();
        produtosCarrinho = data.produtos || [];
        exibirCarrinho();
    } catch (error) {
        console.error("❌ Erro:", error);
        produtosCarrinho = [];
        exibirCarrinho();
    }
}

async function salvarCarrinhoServidor() {
    if (!senhaAtual) return;
    
    await fetch(`${API}/carrinho/salvar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            senha: senhaAtual,
            produtos: produtosCarrinho
        })
    });
}

// ====================== EXIBIR CARRINHO ======================

function exibirCarrinho() {
    const lista = document.getElementById('lista-carrinho');
    const totalEl = document.getElementById('valor-total');
    
    if (!lista) return;
    
    if (!produtosCarrinho || produtosCarrinho.length === 0) {
        lista.innerHTML = `
            <div class="carrinho-vazio">
                <p>🛒 Seu carrinho está vazio</p>
                <a href="produtos.html" class="btn-continuar">Continuar Comprando</a>
            </div>
        `;
        if (totalEl) totalEl.textContent = 'R$ 0,00';
        return;
    }
    
    lista.innerHTML = '';
    let total = 0;
    
    produtosCarrinho.forEach((item, index) => {
        const qtd = item.quantidade || 1;
        const subtotal = item.preco * qtd;
        total += subtotal;
        
        lista.innerHTML += `
            <div class="item-carrinho">
                <img src="${item.imagem}" alt="${item.nome}">
                <div class="item-info">
                    <h3>${item.nome}</h3>
                    <div class="item-preco">R$ ${item.preco.toFixed(2)}</div>
                </div>
                <div class="item-quantidade">
                    <button onclick="alterarQuantidade(${index}, -1)">−</button>
                    <span>${qtd}</span>
                    <button onclick="alterarQuantidade(${index}, 1)">+</button>
                </div>
                <div class="item-subtotal">R$ ${subtotal.toFixed(2)}</div>
                <button class="btn-remover" onclick="removerItem(${index})">🗑️</button>
            </div>
        `;
    });
    
    if (totalEl) totalEl.textContent = `R$ ${total.toFixed(2)}`;
}

// ====================== FUNÇÕES DE MANIPULAÇÃO ======================

async function alterarQuantidade(index, delta) {
    if (!produtosCarrinho[index]) return;
    
    const novaQtd = (produtosCarrinho[index].quantidade || 1) + delta;
    
    if (novaQtd <= 0) {
        await removerItem(index);
        return;
    }
    
    produtosCarrinho[index].quantidade = novaQtd;
    await salvarCarrinhoServidor();
    exibirCarrinho();
}

async function removerItem(index) {
    if (!confirm('Remover este item?')) return;
    produtosCarrinho.splice(index, 1);
    await salvarCarrinhoServidor();
    exibirCarrinho();
}

function finalizarCompra() {
    if (!produtosCarrinho || produtosCarrinho.length === 0) {
        alert('Carrinho vazio!');
        return;
    }
    
    sessionStorage.setItem('checkout_produtos', JSON.stringify(produtosCarrinho));
    sessionStorage.setItem('checkout_senha', senhaAtual);
    window.location.href = 'checkout.html';
}

function trocarSenha() {
    if (confirm('Trocar de usuário?')) {
        localStorage.removeItem('senha_carrinho');
        window.location.href = 'produtos.html';
    }
}