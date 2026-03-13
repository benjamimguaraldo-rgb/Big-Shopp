// CARREGAR PRODUTOS AO ABRIR A PÁGINA

document.addEventListener('DOMContentLoaded', function() {
    console.log("📄 Página de checkout carregada");
    
    // 👉 PEGA PRODUTOS DO SESSIONSTORAGE
    const produtos = JSON.parse(sessionStorage.getItem('checkout_produtos'));
    
    console.log("📦 Produtos encontrados:", produtos);
    
    if (!produtos || produtos.length === 0) {
        alert('❌ Nenhum produto para finalizar!');
        window.location.href = 'produtos.html';
        return;
    }
    
    // 👉 MOSTRA OS PRODUTOS NA TELA
    const container = document.getElementById('itens-carrinho'); // ID CORRETO
    const totalEl = document.getElementById('total-valor'); // ID CORRETO
    
    if (!container) {
        console.error("❌ Elemento 'itens-carrinho' não encontrado no HTML!");
        return;
    }
    
    let total = 0;
    container.innerHTML = '';
    
    produtos.forEach(item => {
        const qtd = item.quantidade || 1;
        const subtotal = item.preco * qtd;
        total += subtotal;
        
        // Adaptei o estilo para combinar com as classes que você já tem no CSS
        container.innerHTML += `
            <div class="item-resumo">
                <img src="${item.imagem}" alt="${item.nome}">
                <div class="item-resumo-info">
                    <p><strong>${item.nome}</strong></p>
                    <small>${qtd}x R$ ${item.preco.toFixed(2)}</small>
                </div>
                <div class="item-resumo-preco">
                    R$ ${subtotal.toFixed(2)}
                </div>
            </div>
        `;
    });
    
    if (totalEl) {
        totalEl.textContent = `R$ ${total.toFixed(2)}`;
    }
});

// FUNÇÃO PARA FINALIZAR COMPRA
async function finalizarCompra() {
    console.log("🛒 Finalizando compra...");
    
    // PEGA DADOS DO FORMULÁRIO
    const nome = document.getElementById('nome')?.value;
    const email = document.getElementById('email')?.value;
    const cpf = document.getElementById('cpf')?.value;
    const rua = document.getElementById('rua')?.value;
    const numero = document.getElementById('numero')?.value;
    const bairro = document.getElementById('bairro')?.value;
    const cidade = document.getElementById('cidade')?.value;
    const cep = document.getElementById('cep')?.value;
    const complemento = document.getElementById('complemento')?.value || '';
    
    // VALIDAÇÕES
    if (!nome || !email || !cpf || !rua || !numero || !bairro || !cidade || !cep) {
        alert('❌ Preencha todos os campos obrigatórios!');
        return;
    }
    
    // PEGA PRODUTOS E SENHA
    const produtos = JSON.parse(sessionStorage.getItem('checkout_produtos'));
    const senha = localStorage.getItem('senha_carrinho');
    
    if (!produtos || produtos.length === 0) {
        alert('❌ Nenhum produto no carrinho!');
        return;
    }
    
    // CALCULA TOTAL
    let total = 0;
    produtos.forEach(item => {
        total += item.preco * (item.quantidade || 1);
    });
    
    // MONTA DADOS PARA ENVIAR
    const dados = {
        nome: nome,
        email: email,
        cpf: cpf,
        endereco: {
            rua: rua,
            numero: numero,
            complemento: complemento,
            bairro: bairro,
            cidade: cidade,
            cep: cep
        },
        produtos: produtos,
        total: total,
        senha: senha
    };
    
    console.log("📦 Dados a enviar:", dados);
    
    try {
        const response = await fetch(`${API}/finalizar_compra_facil`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        
        const data = await response.json();
        console.log("📨 Resposta:", data);
        
        if (response.ok) {
            alert('✅ Compra finalizada com sucesso!');
            sessionStorage.removeItem('checkout_produtos');
            sessionStorage.removeItem('checkout_senha');
            window.location.href = 'meus-pedidos.html';
        } else {
            alert(`❌ Erro: ${data.erro || 'Erro desconhecido'}`);
        }
    } catch (error) {
        console.error('❌ Erro:', error);
        alert('❌ Erro ao conectar com o servidor');
    }
}

// BUSCAR CEP AUTOMÁTICO (OPCIONAL)
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