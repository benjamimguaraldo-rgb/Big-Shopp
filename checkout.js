

// Carrega o carrinho e mostra no resumo
function carregarResumo() {
    const carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
    const container = document.getElementById('itens-carrinho');
    const totalElemento = document.getElementById('total-valor');
    
    if (carrinho.length === 0) {
        window.location.href = 'carrinho.html';
        return;
    }
    
    let total = 0;
    container.innerHTML = '';
    
    carrinho.forEach(item => {
        const quantidade = item.quantidade || 1;
        const subtotal = item.preco * quantidade;
        total += subtotal;
        
        container.innerHTML += `
            <div class="item-resumo">
                <img src="${item.imagem}" alt="${item.nome}">
                <div class="item-resumo-info">
                    <p>${item.nome}</p>
                    <small>${quantidade}x R$ ${item.preco.toFixed(2)}</small>
                </div>
                <div class="item-resumo-preco">
                    R$ ${subtotal.toFixed(2)}
                </div>
            </div>
        `;
    });
    
    totalElemento.textContent = `R$ ${total.toFixed(2)}`;
}

// Busca CEP automaticamente
document.getElementById('cep')?.addEventListener('blur', async function() {
    const cep = this.value.replace(/\D/g, '');
    
    if (cep.length === 8) {
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const dados = await response.json();
            
            if (!dados.erro) {
                document.getElementById('rua').value = dados.logradouro;
                document.getElementById('bairro').value = dados.bairro;
                document.getElementById('cidade').value = dados.localidade;
            }
        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
        }
    }
});

// Finalizar compra
async function finalizarCompra() {
    // Pega dados do formulário
    const dados = {
        nome: document.getElementById('nome')?.value,
        email: document.getElementById('email')?.value,
        cpf: document.getElementById('cpf')?.value,
        telefone: document.getElementById('telefone')?.value || '',
        endereco: {
            cep: document.getElementById('cep')?.value,
            rua: document.getElementById('rua')?.value,
            numero: document.getElementById('numero')?.value,
            complemento: document.getElementById('complemento')?.value || '',
            bairro: document.getElementById('bairro')?.value,
            cidade: document.getElementById('cidade')?.value
        },
        produtos: JSON.parse(localStorage.getItem('carrinho')) || [],
        total: parseFloat(document.getElementById('total-valor')?.textContent.replace('R$ ', '').replace(',', '.'))
    };
    
    // Valida campos obrigatórios
    if (!dados.nome || !dados.email || !dados.cpf || !dados.endereco.cep) {
        alert('Preencha todos os campos obrigatórios!');
        return;
    }
    
    if (dados.produtos.length === 0) {
        alert('Carrinho vazio!');
        return;
    }
    
    try {
        const response = await fetch(`${API}/finalizar_compra_facil`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuario_id: null, // Sem login
                nome: dados.nome,
                email: dados.email,
                cpf: dados.cpf,
                endereco: dados.endereco,
                produtos: dados.produtos,
                total: dados.total
            })
        });
        
        const resultado = await response.json();
        
        if (resultado.sucesso) {
            // Limpa carrinho
            localStorage.removeItem('carrinho');
            
            alert('✅ Compra registrada! Você receberá um email.');
            window.location.href = 'meus-pedidos.html';
        } else {
            alert('❌ Erro: ' + resultado.mensagem);
        }
        
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao finalizar compra');
    }
}

// Carrega resumo ao abrir página
document.addEventListener('DOMContentLoaded', carregarResumo);