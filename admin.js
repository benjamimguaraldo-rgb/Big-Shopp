const API = "https://big-shopp.onrender.com";
let todosPedidos = [];

// ====================== SISTEMA DE BLOQUEIO ======================
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('admin')) {
        ativarBloqueio();
    }
});

function ativarBloqueio() {
    const tela = document.getElementById('telaBloqueio');
    if (tela) {
        tela.style.display = 'flex';
        document.body.classList.add('travado');
        setTimeout(() => document.getElementById('senhaInput')?.focus(), 100);
    }
}

function desativarBloqueio() {
    document.getElementById('telaBloqueio').style.display = 'none';
    document.body.classList.remove('travado');
    carregarPedidos(); // Carrega pedidos após liberar
}

async function verificarSenha() {
    const senha = document.getElementById('senhaInput').value;
    
    if (!senha) {
        mostrarErro('Digite a senha!');
        return;
    }
    
    try {
        const response = await fetch(`${API}/verificar_senha`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ senha: senha })
        });
        
        const data = await response.json();
        
        if (data.sucesso) {
            desativarBloqueio();
        } else {
            mostrarErro('🔒 Senha incorreta!');
            document.getElementById('senhaInput').value = '';
            document.getElementById('senhaInput').focus();
        }
    } catch (error) {
        mostrarErro('Erro ao verificar senha');
    }
}

function mostrarErro(msg) {
    const erroEl = document.getElementById('mensagemErro');
    if (erroEl) {
        erroEl.textContent = msg;
        setTimeout(() => erroEl.textContent = '', 3000);
    }
}

// ====================== CARREGAR PEDIDOS ======================

async function carregarPedidos() {
    try {
        const response = await fetch(`${API}/admin/compras`);
        todosPedidos = await response.json();
        
        console.log("📦 Pedidos carregados:", todosPedidos);
        exibirPedidos(todosPedidos);
        
    } catch (error) {
        console.error("❌ Erro:", error);
        document.getElementById('pedidos-container').innerHTML = `
            <div style="color: white; text-align: center; padding: 40px;">
                ❌ Erro ao carregar pedidos
            </div>
        `;
    }
}

function exibirPedidos(pedidos) {
    const container = document.getElementById('pedidos-container');
    
    if (!pedidos || pedidos.length === 0) {
        container.innerHTML = `
            <div style="color: white; text-align: center; padding: 40px;">
                📭 Nenhum pedido encontrado
            </div>
        `;
        return;
    }
    
    container.innerHTML = pedidos.map(p => `
        <div class="pedido-card status-${p.status}" data-status="${p.status}">
            <div class="pedido-header">
                <span class="pedido-id">#${p.id}</span>
                <span class="pedido-data">${new Date(p.data).toLocaleString()}</span>
            </div>
            
            <div class="pedido-cliente">
                <h3>${p.cliente}</h3>
                <p>📧 ${p.email}</p>
            </div>
            
            <div class="pedido-total">
                💰 R$ ${p.total.toFixed(2)}
            </div>
            
            <select class="status-select" id="status-${p.id}" data-compra-id="${p.id}">
                <option value="pagamento_pendente" ${p.status === 'pagamento_pendente' ? 'selected' : ''}>⏳ Pagamento Pendente</option>
                <option value="pago" ${p.status === 'pago' ? 'selected' : ''}>💰 Pago</option>
                <option value="enviado" ${p.status === 'enviado' ? 'selected' : ''}>🚚 Enviado</option>
                <option value="entregue" ${p.status === 'entregue' ? 'selected' : ''}>✅ Entregue</option>
                <option value="cancelado" ${p.status === 'cancelado' ? 'selected' : ''}>❌ Cancelado</option>
            </select>
            
            <button class="btn-atualizar" onclick="atualizarStatus(${p.id})">
                🔄 Atualizar Status
            </button>
            
            ${p.status === 'pagamento_pendente' ? `
                <button class="btn-simular-pagamento" onclick="simularPagamento(${p.id})">
                    💳 Simular Pagamento (Admin)
                </button>
            ` : ''}
            
            <button class="btn-ver-detalhes" onclick="verDetalhes(${p.id})">
                📋 Ver Detalhes
            </button>
        </div>
    `).join('');
}

// ====================== ATUALIZAR STATUS ======================

async function atualizarStatus(compraId) {
    const select = document.getElementById(`status-${compraId}`);
    const novoStatus = select.value;
    
    if (!confirm(`Alterar status do pedido #${compraId} para ${novoStatus}?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API}/admin/atualizar_status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                compra_id: compraId,
                status: novoStatus
            })
        });
        
        const data = await response.json();
        
        if (data.sucesso) {
            alert(`✅ Status atualizado!`);
            carregarPedidos(); // Recarrega lista
        } else {
            alert(`❌ Erro: ${data.erro}`);
        }
    } catch (error) {
        console.error("❌ Erro:", error);
        alert("Erro ao atualizar status");
    }
}

// ====================== SIMULAR PAGAMENTO ======================

async function simularPagamento(compraId) {
    if (!confirm(`✅ Simular pagamento do pedido #${compraId}?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API}/simular_pagamento/${compraId}`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.sucesso) {
            alert(`💰 Pagamento simulado com sucesso!`);
            carregarPedidos(); // Recarrega lista
        } else {
            alert(`❌ Erro: ${data.erro}`);
        }
    } catch (error) {
        console.error("❌ Erro:", error);
        alert("Erro ao simular pagamento");
    }
}

// ====================== VER DETALHES ======================

async function verDetalhes(compraId) {
    try {
        const response = await fetch(`${API}/admin/detalhes_compra/${compraId}`);
        const compra = await response.json();
        
        // Formata endereço
        const endereco = compra.endereco;
        const enderecoStr = `${endereco.rua}, ${endereco.numero}${endereco.complemento ? ' - ' + endereco.complemento : ''}<br>
                            ${endereco.bairro} - ${endereco.cidade}<br>
                            CEP: ${endereco.cep}`;
        
        // Formata produtos
        const produtosStr = compra.produtos.map(p => 
            `${p.nome} - ${p.quantidade}x R$ ${p.preco.toFixed(2)}`
        ).join('\n');
        
        alert(`
📦 PEDIDO #${compra.id}
━━━━━━━━━━━━━━━━━━
👤 Cliente: ${compra.cliente}
📧 Email: ${compra.email}
📱 CPF: ${compra.cpf}
💰 Total: R$ ${compra.total.toFixed(2)}
📊 Status: ${compra.status}
📅 Data: ${new Date(compra.data).toLocaleString()}

📍 ENDEREÇO:
${enderecoStr}

🛒 PRODUTOS:
${produtosStr}
        `);
        
    } catch (error) {
        console.error("❌ Erro:", error);
        alert("Erro ao carregar detalhes");
    }
}

// ====================== FILTRAR PEDIDOS ======================

function filtrarPedidos(status) {
    // Atualiza botões ativos
    document.querySelectorAll('.filtro-btn').forEach(btn => {
        btn.classList.remove('ativo');
    });
    event.target.classList.add('ativo');
    
    if (status === 'todos') {
        exibirPedidos(todosPedidos);
    } else {
        const filtrados = todosPedidos.filter(p => p.status === status);
        exibirPedidos(filtrados);
    }
}

// ====================== ATALHO ENTER ======================

document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && 
        document.getElementById('telaBloqueio')?.style.display === 'flex') {
        verificarSenha();
    }
});