

// ====================== PEGAR SENHA ======================

function getSenhaUsuario() {
    let senha = localStorage.getItem('senha_carrinho');
    
    if (!senha) {
        senha = prompt("🔐 DIGITE SUA SENHA DE 4 DÍGITOS PARA VER O CARRINHO:", "0000");
        if (senha && senha.length >= 4) {
            localStorage.setItem('senha_carrinho', senha);
            return senha;
        } else {
            alert("❌ Senha inválida!");
            return null;
        }
    }
    return senha;
}

// ====================== CARREGAR CARRINHO ======================

function carregarCarrinho() {
    console.log("🔄 Carregando carrinho...");
    
    // PASSO 1: PEDIR SENHA
    const senha = getSenhaUsuario();
    if (!senha) {
        window.location.href = "produtos.html";
        return;
    }
    
    console.log("🔐 Senha:", senha);
    
    const listaElemento = document.getElementById('lista-carrinho');
    const totalElemento = document.getElementById('valor-total');
    
    if (!listaElemento) return;
    
    // PASSO 2: CARREGAR CARRINHO DESTA SENHA
    let carrinho = JSON.parse(localStorage.getItem(`carrinho_${senha}`)) || [];
    console.log("📦 Carrinho:", carrinho);
    
    if (carrinho.length === 0) {
        listaElemento.innerHTML = `
            <div class="carrinho-vazio">
                🛒 Carrinho vazio<br>
                <a href="produtos.html">Continuar comprando</a>
            </div>
        `;
        if (totalElemento) totalElemento.innerText = "0.00";
        return;
    }
    
    listaElemento.innerHTML = "";
    let somaTotal = 0;

    carrinho.forEach((item, index) => {
        const quantidade = item.quantidade || 1;
        const subtotal = item.preco * quantidade;
        somaTotal += subtotal;
        
        const div = document.createElement('div');
        div.className = 'item-carrinho';
        div.innerHTML = `
            <img src="${item.imagem}" alt="${item.nome}">
            <div class="item-info">
                <h3>${item.nome}</h3>
                <p class="item-preco">R$ ${item.preco.toFixed(2)}</p>
            </div>
            <div class="item-quantidade">
                <button onclick="alterarQuantidade(${index}, -1)">−</button>
                <span>${quantidade}</span>
                <button onclick="alterarQuantidade(${index}, 1)">+</button>
            </div>
            <div class="item-subtotal">R$ ${subtotal.toFixed(2)}</div>
            <button class="btn-remover" onclick="removerItem(${index})">🗑️</button>
        `;
        listaElemento.appendChild(div);
    });

    if (totalElemento) {
        totalElemento.innerText = somaTotal.toFixed(2);
    }
}

// ====================== ALTERAR QUANTIDADE ======================

function alterarQuantidade(index, delta) {
    const senha = localStorage.getItem('senha_carrinho');
    if (!senha) return;
    
    let carrinho = JSON.parse(localStorage.getItem(`carrinho_${senha}`)) || [];
    
    if (carrinho[index]) {
        carrinho[index].quantidade = (carrinho[index].quantidade || 1) + delta;
        
        if (carrinho[index].quantidade <= 0) {
            carrinho.splice(index, 1);
        }
        
        localStorage.setItem(`carrinho_${senha}`, JSON.stringify(carrinho));
        carregarCarrinho();
    }
}

// ====================== REMOVER ITEM ======================

function removerItem(index) {
    const senha = localStorage.getItem('senha_carrinho');
    if (!senha) return;
    
    if (confirm("Remover este item do carrinho?")) {
        let carrinho = JSON.parse(localStorage.getItem(`carrinho_${senha}`)) || [];
        carrinho.splice(index, 1);
        localStorage.setItem(`carrinho_${senha}`, JSON.stringify(carrinho));
        carregarCarrinho();
    }
}

// ====================== FINALIZAR COMPRA ======================

function finalizarCompra() {
    const senha = localStorage.getItem('senha_carrinho');
    if (!senha) {
        alert("🔐 Identifique-se primeiro!");
        return;
    }
    
    const carrinho = JSON.parse(localStorage.getItem(`carrinho_${senha}`)) || [];
    if (carrinho.length === 0) {
        alert("Carrinho vazio!");
        return;
    }
    
    window.location.href = "checkout.html";
}

// ====================== TROCAR SENHA ======================

function trocarSenha() {
    localStorage.removeItem('senha_carrinho');
    alert("👋 Senha removida! Recarregando...");
    window.location.reload();
}

// ====================== INICIAR ======================

document.addEventListener('DOMContentLoaded', carregarCarrinho);