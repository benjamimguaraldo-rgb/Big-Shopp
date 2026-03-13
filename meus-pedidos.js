const API = "https://big-shopp.onrender.com";
let todosPedidos = [];
let emailCliente = null;
let senhaCliente = null;

// ====================== IDENTIFICAÇÃO ======================

document.addEventListener('DOMContentLoaded', function() {
    // Verifica se já tem email ou senha salvos
    const emailSalvo = localStorage.getItem('email_pedidos');
    const senhaSalva = localStorage.getItem('senha_carrinho');
    
    if (emailSalvo) {
        emailCliente = emailSalvo;
        esconderTelaIdentificacao();
        carregarPedidosPorEmail(emailSalvo);
    } else if (senhaSalva) {
        senhaCliente = senhaSalva;
        esconderTelaIdentificacao();
        carregarPedidosPorSenha(senhaSalva);
    } else {
        mostrarTelaIdentificacao();
    }
});

function mostrarTelaIdentificacao() {
    document.getElementById('tela-identificacao').style.display = 'flex';
    document.getElementById('conteudo-pedidos').style.display = 'none';
}

function esconderTelaIdentificacao() {
    document.getElementById('tela-identificacao').style.display = 'none';
    document.getElementById('conteudo-pedidos').style.display = 'block';
}

function trocarIdentificacao() {
    localStorage.removeItem('email_pedidos');
    // Não remove a senha do carrinho, só do pedidos
    emailCliente = null;
    senhaCliente = null;
    mostrarTelaIdentificacao();
    document.getElementById('email-input').value = '';
    document.getElementById('senha-input').value = '';
}

async function identificarCliente() {
    const email = document.getElementById('email-input').value;
    const senha = document.getElementById('senha-input').value;
    const erroEl = document.getElementById('identificacao-erro');
    
    if (!email && !senha) {
        erroEl.textContent = '❌ Digite email ou senha';
        return;
    }
    
    if (email) {
        // Valida email básico
        if (!email.includes('@') || !email.includes('.')) {
            erroEl.textContent = '❌ Email inválido';
            return;
        }
        
        localStorage.setItem('email_pedidos', email);
        emailCliente = email;
        esconderTelaIdentificacao();
        await carregarPedidosPorEmail(email);
        
    } else if (senha) {
        if (senha.length < 4) {
            erroEl.textContent = '❌ Senha deve ter 4 dígitos';
            return;
        }
        
        senhaCliente = senha;
        esconderTelaIdentificacao();
        await carregarPedidosPorSenha(senha);
    }
}

// ====================== CARREGAR PEDIDOS ======================

async function carregarPedidosPorEmail(email) {
    mostrarCarregando();
    
    try {
        // Primeiro tenta buscar por email na tabela de compras
        const response = await fetch(`${API}/compras/email/${encodeURIComponent(email)}`);
        
        if (response.ok) {
            const pedidos = await response.json();
            todosPedidos = pedidos;
            exibirPedidos(pedidos);
        } else {
            // Se não encontrar, busca por senha associada? 
            // Ou mostra vazio
            todosPedidos = [];
            exibirPedidos([]);
        }
    } catch (error) {
        console.error("❌ Erro:", error);
        mostrarErro('Erro ao carregar pedidos');
    }
}

async function carregarPedidosPorSenha(senha) {
    mostrarCarregando();
    
    try {
        // Busca compras associadas à senha (se você tiver essa relação)
        // Por enquanto, vamos simular que a senha é usada no carrinho, não nos pedidos
        // Então redireciona pro email
        
        // Como fallback, tenta carregar do carrinho? Não, pedidos são diferentes
        
        // Solução: Mostra mensagem pra usar email
        const erroEl = document.getElementById('identificacao-erro');
        erroEl.textContent = '❌ Use seu email para ver pedidos. Senha é apenas para o carrinho.';
        mostrarTelaIdentificacao();
        
    } catch (error) {
        console.error("❌ Erro:", error);
        mostrarErro('Erro ao carregar pedidos');
    }
}

// ====================== EXIBIR PEDIDOS ======================

function exibirPedidos(pedidos) {
    const container = document.getElementById('pedidos-lista');
    
    if (!pedidos || pedidos.length === 0) {
        container.innerHTML = `
            <div class="sem-pedidos">
                <p>📭 Você ainda não tem pedidos</p>
                <a href="produtos.html" class="btn-continuar">Começar a Comprar</a>
            </div>
        `;
        return;
    }
    
    container.innerHTML = pedidos.map(p => {
        const data = new Date(p.data).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const produtos = p.produtos.map(prod => `
            <div class="produto-pedido">
                <div class="produto-info-pedido">
                    <img src="${prod.imagem}" alt="${prod.nome}" onerror="this.src='https://via.placeholder.com/50'">
                    <div>
                        <div class="produto-nome-pedido">${prod.nome}</div>
                        <div class="produto-qtd-pedido">Quantidade: ${prod.quantidade || 1}</div>
                    </div>
                </div>
                <div class="produto-preco-pedido">R$ ${(prod.preco * (prod.quantidade || 1)).toFixed(2)}</div>
            </div>
        `).join('');
        
        const endereco = p.endereco_entrega ? JSON.parse(p.endereco_entrega) : null;
        
        return `
            <div class="pedido-card status-${p.status}">
                <div class="pedido-header">
                    <div>
                        <span class="pedido-id">Pedido #${p.id}</span>
                        <span class="pedido-data">${data}</span>
                    </div>
                    <span class="pedido-status status-${p.status}">
                        ${traduzirStatus(p.status)}
                    </span>
                </div>
                
                <div class="pedido-produtos">
                    ${produtos}
                </div>
                
                ${endereco ? `
                <div class="pedido-endereco">
                    <strong>📍 Endereço de Entrega:</strong>
                    ${endereco.rua}, ${endereco.numero}${endereco.complemento ? ' - ' + endereco.complemento : ''}<br>
                    ${endereco.bairro} - ${endereco.cidade}<br>
                    CEP: ${endereco.cep}
                </div>
                ` : ''}
                
                <div class="pedido-total">
                    <span>Total:</span>
                    <span>R$ ${p.total.toFixed(2)}</span>
                </div>
                
                <div class="acoes-pedido">
                    <button class="btn-detalhes-pedido" onclick="verDetalhesPedido(${p.id})">
                        📋 Ver Detalhes
                    </button>
                    <button class="btn-ajuda" onclick="ajudaPedido(${p.id})">
                        ❓ Ajuda
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function traduzirStatus(status) {
    const traducoes = {
        'pagamento_pendente': '⏳ Pagamento Pendente',
        'pago': '💰 Pago',
        'enviado': '🚚 Enviado',
        'entregue': '✅ Entregue',
        'cancelado': '❌ Cancelado'
    };
    return traducoes[status] || status;
}

// ====================== FILTROS ======================

function filtrarPedidos(filtro) {
    // Atualiza botões ativos
    document.querySelectorAll('.filtro-btn').forEach(btn => {
        btn.classList.remove('ativo');
    });
    event.target.classList.add('ativo');
    
    if (filtro === 'todos') {
        exibirPedidos(todosPedidos);
    } else {
        const filtrados = todosPedidos.filter(p => p.status === filtro);
        exibirPedidos(filtrados);
    }
}

// ====================== DETALHES ======================

function verDetalhesPedido(pedidoId) {
    const pedido = todosPedidos.find(p => p.id === pedidoId);
    
    if (!pedido) return;
    
    const produtos = pedido.produtos.map(p => 
        `${p.nome} - ${p.quantidade || 1}x R$ ${p.preco.toFixed(2)}`
    ).join('\n');
    
    const endereco = pedido.endereco_entrega ? JSON.parse(pedido.endereco_entrega) : null;
    const enderecoStr = endereco ? 
        `${endereco.rua}, ${endereco.numero}\n${endereco.bairro} - ${endereco.cidade}\nCEP: ${endereco.cep}` : 
        'Não informado';
    
    alert(`
📦 PEDIDO #${pedido.id}
━━━━━━━━━━━━━━━━━━
📊 Status: ${traduzirStatus(pedido.status)}
📅 Data: ${new Date(pedido.data).toLocaleString()}

🛒 PRODUTOS:
${produtos}

💰 Total: R$ ${pedido.total.toFixed(2)}

📍 ENDEREÇO:
${enderecoStr}
    `);
}

function ajudaPedido(pedidoId) {
    alert(`
❓ Precisa de ajuda com o pedido #${pedidoId}?

📞 Entre em contato:
• WhatsApp: 11 92220-7487
• Email: bigshop.robot@gmail.com

Ou aguarde que entraremos em contato!
    `);
}

// ====================== UTILITÁRIOS ======================

function mostrarCarregando() {
    document.getElementById('pedidos-lista').innerHTML = `
        <div class="carregando">
            <div class="loader"></div>
            <p>Carregando seus pedidos...</p>
        </div>
    `;
}

function mostrarErro(msg) {
    document.getElementById('pedidos-lista').innerHTML = `
        <div class="sem-pedidos">
            <p>❌ ${msg}</p>
            <button onclick="trocarIdentificacao()" class="btn-trocar">Tentar Novamente</button>
        </div>
    `;
}

// ====================== ROTA NO BACKEND (ADICIONAR NO PYTHON) ======================
// Adicione esta rota no seu app.py:

/*
@app.route('/compras/email/<path:email>', methods=['GET'])
def listar_compras_por_email(email):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, nome_cliente, produtos, total, status, data_compra, endereco_entrega
            FROM compras
            WHERE email_cliente = ?
            ORDER BY data_compra DESC
        ''', (email,))
        
        compras = cursor.fetchall()
        conn.close()
        
        resultado = []
        for c in compras:
            resultado.append({
                "id": c[0],
                "cliente": c[1],
                "produtos": json.loads(c[2]),
                "total": c[3],
                "status": c[4],
                "data": c[5],
                "endereco_entrega": c[6]
            })
        
        return jsonify(resultado), 200
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        return jsonify({"erro": str(e)}), 500
*/