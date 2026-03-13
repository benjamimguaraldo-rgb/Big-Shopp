// ====================== CARRINHO-NOVO.JS ======================
// (assumindo que config.js já carrega a API antes)
// ======================= rosno =================================

let senhaAtual = null;
let produtosCarrinho = [];

// ====================== SISTEMA DE SENHA ======================

document.addEventListener('DOMContentLoaded', function() {
    const senhaSalva = localStorage.getItem('senha_carrinho');
    
    if (senhaSalva) {
        senhaAtual = senhaSalva;
        esconderTelaSenha(); // Tenta esconder, mas com segurança
        carregarCarrinhoServidor(senhaSalva);
    } else {
        mostrarTelaSenha(); // Tenta mostrar, mas com segurança
    }
});

function mostrarTelaSenha() {
    const tela = document.getElementById('tela-senha');
    const conteudo = document.getElementById('conteudo-carrinho');
    
    if (tela) tela.style.display = 'flex';
    if (conteudo) conteudo.style.display = 'none';
}

function esconderTelaSenha() {
    const tela = document.getElementById('tela-senha');
    const conteudo = document.getElementById('conteudo-carrinho');
    
    if (tela) tela.style.display = 'none';
    if (conteudo) conteudo.style.display = 'block';
}

async function verificarSenhaCarrinho() {
    const senhaInput = document.getElementById('senha-input');
    const erroEl = document.getElementById('senha-erro');
    
    if (!senhaInput || !erroEl) return;
    
    const senha = senhaInput.value;
    
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
    if (confirm('Trocar de usuário? Isso vai remover a senha atual.')) {
        localStorage.removeItem('senha_carrinho');
        senhaAtual = null;
        produtosCarrinho = [];
        mostrarTelaSenha();
        const input = document.getElementById('senha-input');
        if (input) input.value = '';
    }
}

// ====================== CARRINHO NO SERVIDOR ======================

async function carregarCarrinhoServidor(senha) {
    try {
        const response = await fetch(`${API}/carrinho/carregar/${senha}`);
        const data = await response.json();
        produtosCarrinho = data.produtos || [];
        exibirCarrinho();
    } catch (error) {
        console.error("❌ Erro ao carregar:", error);
        produtosCarrinho = [];
        exibirCarrinho();
    }
}

async function salvarCarrinhoServidor() {
    if (!senhaAtual) return;
    
    try {
        await fetch(`${API}/carrinho/salvar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                senha: senhaAtual,
                produtos: produtosCarrinho
            })
        });
    } catch (error) {
        console.error("❌ Erro ao salvar:", error);
    }
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
        
        const div = document.createElement('div');
        div.className = 'item-carrinho';
        div.innerHTML = `
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
        `;
        lista.appendChild(div);
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
    if (!confirm('Remover este item do carrinho?')) return;
    produtosCarrinho.splice(index, 1);
    await salvarCarrinhoServidor();
    exibirCarrinho();
}

async function limparCarrinho() {
    if (!confirm('Limpar todo o carrinho?')) return;
    produtosCarrinho = [];
    await salvarCarrinhoServidor();
    exibirCarrinho();
}

// ====================== FINALIZAR COMPRA ======================

function finalizarCompra() {
    if (!produtosCarrinho || produtosCarrinho.length === 0) {
        alert('Seu carrinho está vazio!');
        return;
    }
    
    sessionStorage.setItem('checkout_produtos', JSON.stringify(produtosCarrinho));
    sessionStorage.setItem('checkout_senha', senhaAtual);
    window.location.href = 'checkout.html';
}