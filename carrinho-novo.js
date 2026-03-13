
let senhaAtual = null;
let produtosCarrinho = [];

// ====================== SISTEMA DE SENHA ======================

document.addEventListener('DOMContentLoaded', function() {
    const senhaSalva = localStorage.getItem('senha_carrinho');
    
    if (senhaSalva) {
        senhaAtual = senhaSalva;
        esconderTelaSenha();
        carregarCarrinhoServidor(senhaSalva);
    } else {
        mostrarTelaSenha();
    }
});

function mostrarTelaSenha() {
    const tela = document.getElementById('tela-senha');
    if (tela) tela.style.display = 'flex';
    document.getElementById('conteudo-carrinho').style.display = 'none';
}

function esconderTelaSenha() {
    document.getElementById('tela-senha').style.display = 'none';
    document.getElementById('conteudo-carrinho').style.display = 'block';
}

async function verificarSenhaCarrinho() {
    const senha = document.getElementById('senha-input').value;
    const erroEl = document.getElementById('senha-erro');
    
    if (!senha || senha.length < 4) {
        erroEl.textContent = '❌ Digite uma senha de 4 dígitos';
        return;
    }
    
    localStorage.setItem('senha_carrinho', senha);
    senhaAtual = senha;
    await carregarCarrinhoServidor(senha);
    esconderTelaSenha();
}

function trocarSenha() {
    localStorage.removeItem('senha_carrinho');
    senhaAtual = null;
    mostrarTelaSenha();
    document.getElementById('senha-input').value = '';
}

// ====================== CARRINHO NO SERVIDOR ======================

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
        lista.innerHTML = '<div class="carrinho-vazio"><p>🛒 Carrinho vazio</p><a href="produtos.html" class="btn-continuar">Comprar</a></div>';
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
    if (!confirm('Remover item?')) return;
    produtosCarrinho.splice(index, 1);
    await salvarCarrinhoServidor();
    exibirCarrinho();
}

async function limparCarrinho() {
    if (!confirm('Limpar carrinho?')) return;
    produtosCarrinho = [];
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