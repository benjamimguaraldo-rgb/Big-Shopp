
// ====================== CARREGAR RESUMO DO PEDIDO ======================

document.addEventListener('DOMContentLoaded', function() {
    console.log("📄 Checkout carregado");
    
    // 👉 VERIFICA O QUE TEM NO SESSIONSTORAGE
    const produtos = JSON.parse(sessionStorage.getItem('checkout_produtos'));
    
    console.log("📦 Produtos no sessionStorage:", produtos);
    
    if (!produtos || produtos.length === 0) {
        alert('❌ Nenhum produto para finalizar!');
        window.location.href = 'produtos.html';
        return;
    }
    
    carregarResumo(produtos);
});

function carregarResumo(produtos) {
    const container = document.getElementById('lista-produtos');
    const totalEl = document.getElementById('total-compra');
    
    if (!container) return;
    
    let total = 0;
    container.innerHTML = '';
    
    produtos.forEach(item => {
        const qtd = item.quantidade || 1;
        const subtotal = item.preco * qtd;
        total += subtotal;
        
        container.innerHTML += `
            <div class="item-resumo">
                <img src="${item.imagem}" alt="${item.nome}" style="width:60px;height:60px;object-fit:cover;">
                <div>
                    <h4>${item.nome}</h4>
                    <p>${qtd}x R$ ${item.preco.toFixed(2)}</p>
                </div>
                <span>R$ ${subtotal.toFixed(2)}</span>
            </div>
        `;
    });
    
    if (totalEl) {
        totalEl.textContent = `R$ ${total.toFixed(2)}`;
    }
}

// ====================== FINALIZAR COMPRA ======================

async function finalizarCompra() {
    console.log("🛒 Finalizando compra...");
    
    // PEGA OS DADOS DO FORMULÁRIO
    const nome = document.getElementById('nome')?.value;
    const email = document.getElementById('email')?.value;
    const cpf = document.getElementById('cpf')?.value;
    const rua = document.getElementById('rua')?.value;
    const numero = document.getElementById('numero')?.value;
    const bairro = document.getElementById('bairro')?.value;
    const cidade = document.getElementById('cidade')?.value;
    const cep = document.getElementById('cep')?.value;
    
    // VALIDAÇÕES
    if (!nome || !email || !cpf || !rua || !numero || !bairro || !cidade || !cep) {
        alert('❌ Preencha todos os campos obrigatórios!');
        return;
    }
    
    // PEGA PRODUTOS E SENHA
    const produtos = JSON.parse(sessionStorage.getItem('checkout_produtos')) || [];
    const senha = sessionStorage.getItem('checkout_senha') || localStorage.getItem('senha_carrinho');
    
    if (produtos.length === 0) {
        alert('❌ Nenhum produto para finalizar!');
        window.location.href = 'produtos.html';
        return;
    }
    
    // CALCULA TOTAL
    let total = 0;
    produtos.forEach(item => {
        total += item.preco * (item.quantidade || 1);
    });
    
    // MONTA OBJETO DO ENDEREÇO
    const endereco = {
        rua: rua,
        numero: numero,
        bairro: bairro,
        cidade: cidade,
        cep: cep
    };
    
    // MONTA DADOS PARA ENVIAR
    const dadosParaEnviar = {
        nome: nome,
        email: email,
        cpf: cpf,
        endereco: endereco,
        produtos: produtos,
        total: total,
        senha: senha
    };
    
    console.log("📦 Dados sendo enviados:", dadosParaEnviar);
    
    try {
        // 👉 FETCH COM AWAIT (CORRETO!)
        const response = await fetch(`${API}/finalizar_compra_facil`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dadosParaEnviar)
        });
        
        // 👉 PEGA RESPOSTA COMO JSON
        const data = await response.json();
        
        console.log("📨 Resposta do servidor:", data);
        console.log("📨 Status:", response.status);
        
        if (response.ok) {
            alert('✅ Compra finalizada com sucesso!');
            
            // LIMPA DADOS DA SESSÃO
            sessionStorage.removeItem('checkout_produtos');
            sessionStorage.removeItem('checkout_senha');
            
            // REDIRECIONA
            window.location.href = 'meus-pedidos.html';
        } else {
            alert(`❌ Erro: ${data.erro || 'Erro desconhecido'}`);
        }
        
    } catch (error) {
        console.error('❌ Erro no fetch:', error);
        alert('❌ Erro ao conectar com o servidor. Tente novamente.');
    }
}

// ====================== BUSCAR CEP (OPCIONAL) ======================

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