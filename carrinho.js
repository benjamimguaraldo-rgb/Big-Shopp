// ====================== CARRINHO DE COMPRAS ======================

// Função para adicionar produto ao carrinho (chamada na página de produtos)
function adicionarAoCarrinho(id, nome, preco, imagem) {
    // Pega carrinho atual ou cria um novo
    let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
    
    // Verifica se produto já existe no carrinho
    const produtoExistente = carrinho.find(item => item.id === id);
    
    if (produtoExistente) {
        // Se já existe, aumenta quantidade
        produtoExistente.quantidade = (produtoExistente.quantidade || 1) + 1;
    } else {
        // Se não existe, adiciona novo
        carrinho.push({
            id: id,
            nome: nome,
            preco: preco,
            imagem: imagem,
            quantidade: 1
        });
    }
    
    // Salva no localStorage
    localStorage.setItem('carrinho', JSON.stringify(carrinho));
    
    // Feedback visual
    alert('✅ Produto adicionado ao carrinho!');
    
    // Opcional: atualiza contador no header se tiver
    atualizarContadorCarrinho();
}

// Função para carregar carrinho (usada na página do carrinho)
function carregarCarrinho() {
    const listaElemento = document.getElementById('lista-carrinho');
    const totalElemento = document.getElementById('valor-total');
    
    if (!listaElemento) return; // Se não tiver elemento, sai
    
    let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
    
    if (carrinho.length === 0) {
        listaElemento.innerHTML = '<p class="carrinho-vazio">Seu carrinho está vazio 🛒</p>';
        if (totalElemento) totalElemento.innerText = '0.00';
        return;
    }
    
    listaElemento.innerHTML = "";
    let somaTotal = 0;

    carrinho.forEach((item, index) => {
        const quantidade = item.quantidade || 1;
        const subtotal = item.preco * quantidade;
        somaTotal += subtotal;
        
        listaElemento.innerHTML += `
            <div class="item-carrinho">
                <img src="${item.imagem}" width="50" height="50" style="object-fit: cover;">
                <div class="item-info">
                    <p><strong>${item.nome}</strong></p>
                    <p>R$ ${item.preco.toFixed(2)}</p>
                </div>
                <div class="item-quantidade">
                    <button onclick="alterarQuantidade(${index}, -1)">-</button>
                    <span>${quantidade}</span>
                    <button onclick="alterarQuantidade(${index}, 1)">+</button>
                </div>
                <div class="item-subtotal">
                    R$ ${subtotal.toFixed(2)}
                </div>
                <button onclick="removerItem(${index})" class="btn-remover">❌</button>
            </div>
        `;
    });

    if (totalElemento) {
        totalElemento.innerText = somaTotal.toFixed(2);
    }
    
    // Salva total no localStorage (pra usar no checkout)
    localStorage.setItem('totalCarrinho', somaTotal.toFixed(2));
}

// Função para alterar quantidade
function alterarQuantidade(index, delta) {
    let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
    
    if (carrinho[index]) {
        carrinho[index].quantidade = (carrinho[index].quantidade || 1) + delta;
        
        // Remove se quantidade for 0
        if (carrinho[index].quantidade <= 0) {
            carrinho.splice(index, 1);
        }
        
        localStorage.setItem('carrinho', JSON.stringify(carrinho));
        carregarCarrinho(); // Atualiza tela
        atualizarContadorCarrinho();
    }
}

// Função para remover item
function removerItem(index) {
    if (confirm('Remover produto do carrinho?')) {
        let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
        carrinho.splice(index, 1);
        localStorage.setItem('carrinho', JSON.stringify(carrinho));
        carregarCarrinho();
        atualizarContadorCarrinho();
    }
}

// Função para limpar carrinho
function limparCarrinho() {
    if (confirm('Limpar todo o carrinho?')) {
        localStorage.removeItem('carrinho');
        carregarCarrinho();
        atualizarContadorCarrinho();
    }
}

// Função para atualizar contador no header (se existir)
function atualizarContadorCarrinho() {
    const contador = document.getElementById('contador-carrinho');
    if (contador) {
        const carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
        const totalItens = carrinho.reduce((acc, item) => acc + (item.quantidade || 1), 0);
        contador.innerText = totalItens;
    }
}

// Função para finalizar compra (redireciona)
function finalizarCompra() {
    const carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
    
    if (carrinho.length === 0) {
        alert('Seu carrinho está vazio!');
        return;
    }
    
    // Verifica se usuário está logado
    const usuario = JSON.parse(localStorage.getItem('usuarioLogado') || sessionStorage.getItem('usuario'));
    
    if (!usuario) {
        alert('Faça login para continuar!');
        window.location.href = 'login.html';
        return;
    }
    
    // Redireciona pro checkout
    window.location.href = 'checkout.html';
}

// Inicializa na página do carrinho
document.addEventListener('DOMContentLoaded', function() {
    carregarCarrinho();
    atualizarContadorCarrinho();
});