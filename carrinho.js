function carregarCarrinho() {
    const listaElemento = document.getElementById('lista-carrinho');
    const totalElemento = document.getElementById('valor-total');
    let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
    
    listaElemento.innerHTML = "";
    let somaTotal = 0;

    carrinho.forEach((item, index) => {
        somaTotal += item.preco;
        listaElemento.innerHTML += `
            <div class="item-carrinho">
                <img src="${item.imagem}" width="50">
                <p>${item.nome} - R$ ${item.preco.toFixed(2)}</p>
                <button onclick="removerItem(${index})">❌</button>
            </div>
        `;
    });

    totalElemento.innerText = somaTotal.toFixed(2);
}

function removerItem(index) {
    let carrinho = JSON.parse(localStorage.getItem('carrinho'));
    carrinho.splice(index, 1); // Remove o item da lista
    localStorage.setItem('carrinho', JSON.stringify(carrinho));
    carregarCarrinho(); // Atualiza a tela
}

carregarCarrinho();