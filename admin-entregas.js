// ====================== ADMIN-ENTREGAS.JS ======================

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
    carregarPedidos();
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
        exibirPedidos(todosPedidos);
    } catch (error) {
        console.error("❌ Erro:", error);
    }
}

function exibirPedidos(pedidos) {
    const container = document.getElementById('pedidos-container');
    if (!container) return;
    
    if (!pedidos || pedidos.length === 0) {
        container.innerHTML = '<div class="sem-pedidos">Nenhum pedido encontrado</div>';
        return;
    }
    
    container.innerHTML = pedidos.map(p => `
        <div class="pedido-card status-${p.status}">
            <div class="pedido-header">
                <span class="pedido-id">#${p.id}</span>
                <span class="pedido-data">${new Date(p.data).toLocaleString()}</span>
            </div>
            <div class="pedido-cliente">
                <h3>${p.cliente}</h3>
                <p>📧 ${p.email}</p>
            </div>
            <div class="pedido-total">💰 R$ ${p.total.toFixed(2)}</div>
            <select class="status-select" id="status-${p.id}">
                <option value="pagamento_pendente" ${p.status === 'pagamento_pendente' ? 'selected' : ''}>⏳ Pendente</option>
                <option value="pago" ${p.status === 'pago' ? 'selected' : ''}>💰 Pago</option>
                <option value="enviado" ${p.status === 'enviado' ? 'selected' : ''}>🚚 Enviado</option>
                <option value="entregue" ${p.status === 'entregue' ? 'selected' : ''}>✅ Entregue</option>
                <option value="cancelado" ${p.status === 'cancelado' ? 'selected' : ''}>❌ Cancelado</option>
            </select>
            <button class="btn-atualizar" onclick="atualizarStatus(${p.id})">Atualizar</button>
        </div>
    `).join('');
}

// ====================== ATUALIZAR STATUS (VERSÃO URGENTE) ======================

async function atualizarStatus(compraId) {
    console.log("🔄 Atualizando status do pedido", compraId);
    
    const select = document.getElementById(`status-${compraId}`);
    if (!select) {
        alert('❌ Erro: elemento não encontrado');
        return;
    }
    
    const novoStatus = select.value;
    
    if (!confirm(`Alterar status do pedido #${compraId} para ${novoStatus}?`)) {
        // Volta o select para o valor anterior
        select.value = select.getAttribute('data-valor-original') || select.value;
        return;
    }
    
    // Guarda o valor original
    select.setAttribute('data-valor-original', select.value);
    
    try {
        console.log("📦 Enviando:", { compra_id: compraId, status: novoStatus });
        
        const response = await fetch(`${API}/admin/atualizar_status`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                compra_id: compraId, 
                status: novoStatus 
            })
        });
        
        console.log("📨 Status da resposta:", response.status);
        
        const data = await response.json();
        console.log("📨 Resposta:", data);
        
        if (response.ok) {
            alert('✅ Status atualizado com sucesso!');
        } else {
            alert(`❌ Erro: ${data.erro || 'Erro desconhecido'}`);
            // Reverte o select
            select.value = select.getAttribute('data-valor-original');
        }
    } catch (error) {
        console.error('❌ Erro no fetch:', error);
        alert('❌ Erro ao conectar com o servidor');
        // Reverte o select
        select.value = select.getAttribute('data-valor-original');
    }
}

// Atalho Enter
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && document.getElementById('telaBloqueio')?.style.display === 'flex') {
        verificarSenha();
    }
});