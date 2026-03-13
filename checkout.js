// ====================== CHECKOUT.JS ======================
const API = "https://big-shopp.onrender.com";

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
    const container = document.getElementById('lista-produtos');
    const totalEl = document.getElementById('total-compra');
    
    if (!container) {
        console.error("❌ Elemento 'lista-produtos' não encontrado no HTML!");
        return;
    }
    
    let total = 0;
    container.innerHTML = '';
    
    produtos.forEach(item => {
        const qtd = item.quantidade || 1;
        const subtotal = item.preco * qtd;
        total += subtotal;
        
        container.innerHTML += `
            <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 15px; padding: 10px; border-bottom: 1px solid #ddd;">
                <img src="${item.imagem}" alt="${item.nome}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">
                <div style="flex: 1;">
                    <h4 style="margin: 0;">${item.nome}</h4>
                    <p style="margin: 5px 0;">Quantidade: ${qtd}</p>
                </div>
                <div style="font-weight: bold; color: #28a745;">
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