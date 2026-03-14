
let senhaAtual = null;
let produtosCarrinho = [];

// ====================== CARREGAR CARRINHO ======================

// ====================== VERIFICAÇÃO DE SENHA NO CARRINHO ======================

document.addEventListener('DOMContentLoaded', function() {
    console.log("📄 Página do carrinho carregada");
    
    const senhaSalva = localStorage.getItem('senha_carrinho');
    
    if (!senhaSalva) {
        // 👉 MOSTRA A TELA DE CRIAÇÃO DE SENHA
        mostrarTelaCriarSenha();
    } else {
        senhaAtual = senhaSalva;
        carregarCarrinhoServidor(senhaSalva);
    }
});

function mostrarTelaCriarSenha() {
    // Esconde o conteúdo do carrinho
    document.getElementById('conteudo-carrinho').style.display = 'none';
    
    // Cria a tela de criação de senha (se não existir)
    if (!document.getElementById('tela-criar-senha')) {
        const body = document.body;
        const div = document.createElement('div');
        div.id = 'tela-criar-senha';
        div.className = 'tela-senha';
        div.innerHTML = `
            <div class="senha-card">
                <h2>🔐 Criar Senha</h2>
                <p>Digite uma senha de 4 dígitos para acessar seu carrinho:</p>
                <input type="password" id="nova-senha-input" class="senha-input" maxlength="4" placeholder="0000">
                <button onclick="criarSenhaCarrinho()" class="btn-senha">Criar Senha</button>
                <p id="senha-erro" class="senha-erro"></p>
            </div>
        `;
        body.appendChild(div);
    } else {
        document.getElementById('tela-criar-senha').style.display = 'flex';
    }
}

// Função para criar nova senha
async function criarSenhaCarrinho() {
    const senha = document.getElementById('nova-senha-input').value;
    const erroEl = document.getElementById('senha-erro');
    
    if (!senha || senha.length !== 4 || isNaN(senha)) {
        erroEl.textContent = '❌ Digite uma senha válida de 4 dígitos';
        return;
    }
    
    // Salva no localStorage
    localStorage.setItem('senha_carrinho', senha);
    senhaAtual = senha;
    
    // Esconde tela de criação
    document.getElementById('tela-criar-senha').style.display = 'none';
    
    // Carrega carrinho (vazio)
    await carregarCarrinhoServidor(senha);
    
    // Mostra conteúdo do carrinho
    document.getElementById('conteudo-carrinho').style.display = 'block';
}

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

// ====================== VERIFICAR SENHA NO CARRINHO ======================

async function verificarSenhaCarrinho() {
    console.log("🔐 Verificando senha no carrinho...");
    
    const senhaInput = document.getElementById('senha-input');
    const erroEl = document.getElementById('senha-erro');
    
    if (!senhaInput || !erroEl) {
        console.error("❌ Elementos de senha não encontrados");
        return;
    }
    
    const senha = senhaInput.value;
    
    if (!senha || senha.length !== 4 || isNaN(senha)) {
        erroEl.textContent = '❌ Digite uma senha válida de 4 dígitos';
        return;
    }
    
    // Salva no localStorage
    localStorage.setItem('senha_carrinho', senha);
    
    // Carrega o carrinho do servidor
    await carregarCarrinhoServidor(senha);
    
    // Esconde tela de senha e mostra carrinho
    const telaSenha = document.getElementById('tela-senha');
    const conteudoCarrinho = document.getElementById('conteudo-carrinho');
    
    if (telaSenha) telaSenha.style.display = 'none';
    if (conteudoCarrinho) conteudoCarrinho.style.display = 'block';
}

// ====================== LIMPAR CARRINHO ======================

async function limparCarrinho() {
    console.log("🗑️ Limpando carrinho...");
    
    if (!confirm('Tem certeza que deseja limpar todo o carrinho?')) {
        return;
    }
    
    if (!senhaAtual) {
        alert('❌ Nenhuma senha encontrada!');
        return;
    }
    
    try {
        // Limpa o array de produtos
        produtosCarrinho = [];
        
        // Salva no servidor (carrinho vazio)
        await fetch(`${API}/carrinho/salvar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                senha: senhaAtual,
                produtos: []
            })
        });
        
        // Atualiza a tela
        exibirCarrinho();
        
        alert('✅ Carrinho limpo com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao limpar carrinho:', error);
        alert('Erro ao limpar carrinho');
    }
}

// Torna a função global
window.limparCarrinho = limparCarrinho;

// Torna a função global
window.verificarSenhaCarrinho = verificarSenhaCarrinho;