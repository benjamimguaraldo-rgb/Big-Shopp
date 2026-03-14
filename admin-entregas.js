// admin-entregas.js
// Gerenciamento de pedidos - Painel Administrativo

// Variáveis globais minimizadas
let todosPedidos = [];

// Config deve estar definido em outro arquivo (ex: config.js)
// const API = "https://seuservidor.com/api";

document.addEventListener('DOMContentLoaded', inicializarSistema);

function inicializarSistema() {
    if (!window.location.pathname.includes('admin')) return;

    const telaBloqueio = document.getElementById('telaBloqueio');
    if (!telaBloqueio) {
        console.warn("Tela de bloqueio não encontrada");
        return;
    }

    mostrarTelaBloqueio();
    configurarEventos();
}

function mostrarTelaBloqueio() {
    const tela = document.getElementById('telaBloqueio');
    if (!tela) return;

    tela.style.display = 'flex';
    document.body.classList.add('travado');

    // Foco no input com pequeno delay para garantir renderização
    setTimeout(() => {
        document.getElementById('senhaInput')?.focus();
    }, 150);
}

function esconderTelaBloqueio() {
    const tela = document.getElementById('telaBloqueio');
    if (tela) tela.style.display = 'none';

    document.body.classList.remove('travado');
}

async function verificarSenha() {
    const input = document.getElementById('senhaInput');
    if (!input) return;

    const senha = input.value.trim();
    if (!senha) {
        mostrarErroTemporario('Digite a senha');
        return;
    }

    try {
        const response = await fetch(`${API}/verificar_senha`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ senha }),
            credentials: 'same-origin' // importante se usar cookies/sessão
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.sucesso) {
            esconderTelaBloqueio();
            await carregarPedidos();
        } else {
            mostrarErroTemporario('Senha incorreta');
            input.value = '';
            input.focus();
        }
    } catch (err) {
        console.error('Erro ao verificar senha:', err);
        mostrarErroTemporario('Erro ao conectar com o servidor');
    }
}

function mostrarErroTemporario(mensagem) {
    const el = document.getElementById('mensagemErro');
    if (!el) return;

    el.textContent = mensagem;
    el.classList.add('visivel');

    setTimeout(() => {
        el.textContent = '';
        el.classList.remove('visivel');
    }, 3200);
}

// ────────────────────────────────────────────────
//                PEDIDOS
// ────────────────────────────────────────────────

async function carregarPedidos() {
    const container = document.getElementById('pedidos-container');
    if (!container) return;

    try {
        container.innerHTML = '<div class="carregando">Carregando pedidos...</div>';

        const res = await fetch(`${API}/admin/compras`, {
            credentials: 'same-origin'
        });

        if (!res.ok) {
            throw new Error(`Status ${res.status}`);
        }

        todosPedidos = await res.json();
        renderizarPedidos(todosPedidos);

    } catch (err) {
        console.error('Erro ao carregar pedidos:', err);
        container.innerHTML = '<div class="erro">❌ Falha ao carregar os pedidos</div>';
    }
}

function renderizarPedidos(pedidos) {
    const container = document.getElementById('pedidos-container');
    if (!container) return;

    if (!pedidos?.length) {
        container.innerHTML = '<div class="sem-pedidos">📭 Nenhum pedido encontrado</div>';
        return;
    }

    container.innerHTML = pedidos
        .map(criarHTMLPedido)
        .join('');
}

function criarHTMLPedido(p) {
    const dataFormatada = new Date(p.data).toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short'
    });

    return `
        <div class="pedido-card status-${p.status}">
            <div class="pedido-header">
                <span class="pedido-id">#${p.id}</span>
                <span class="pedido-data">${dataFormatada}</span>
            </div>
            <div class="pedido-cliente">
                <h3>${escapeHTML(p.cliente)}</h3>
                <p>📧 ${escapeHTML(p.email)}</p>
            </div>
            <div class="pedido-total">R$ ${Number(p.total).toFixed(2)}</div>

            <select class="status-select" 
                    id="status-${p.id}" 
                    data-id="${p.id}"
                    data-original="${p.status}">
                <option value="pagamento_pendente" ${p.status === 'pagamento_pendente' ? 'selected' : ''}>⏳ Pendente</option>
                <option value="pago"               ${p.status === 'pago'               ? 'selected' : ''}>💰 Pago</option>
                <option value="enviado"            ${p.status === 'enviado'            ? 'selected' : ''}>🚚 Enviado</option>
                <option value="entregue"           ${p.status === 'entregue'           ? 'selected' : ''}>✅ Entregue</option>
                <option value="cancelado"          ${p.status === 'cancelado'          ? 'selected' : ''}>❌ Cancelado</option>
            </select>

            <button class="btn-atualizar" 
                    type="button"
                    data-id="${p.id}">
                Atualizar
            </button>
        </div>
    `;
}

// Proteção básica contra XSS (se os dados vierem do banco sem sanitização)
function escapeHTML(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function atualizarStatus(btn) {
    const id = Number(btn.dataset.id);
    if (!id) return;

    const select = document.getElementById(`status-${id}`);
    if (!select) return;

    const novoStatus = select.value;
    const original = select.dataset.original;

    if (novoStatus === original) return;

    if (!confirm(`Confirmar mudança de status para "${novoStatus}"?`)) {
        select.value = original;
        return;
    }

    try {
        const res = await fetch(`${API}/admin/atualizar_status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
                compra_id: id,
                status: novoStatus
            })
        });

        const data = await res.json();

        if (res.ok && data.sucesso) {
            // Sucesso
            select.dataset.original = novoStatus;
            const card = select.closest('.pedido-card');
            card.className = card.className.replace(/status-\w+/, `status-${novoStatus}`);
            alert('Status atualizado com sucesso');
        } else {
            throw new Error(data.erro || 'Falha na atualização');
        }
    } catch (err) {
        console.error(err);
        alert('Não foi possível atualizar o status');
        select.value = original;
    }
}

// ────────────────────────────────────────────────
//                   FILTRO
// ────────────────────────────────────────────────

function filtrarPedidos(status, event) {
    if (!todosPedidos?.length) return;

    const pedidosFiltrados = status === 'todos'
        ? todosPedidos
        : todosPedidos.filter(p => p.status === status);

    renderizarPedidos(pedidosFiltrados);

    // Estilo visual dos botões
    document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('ativo'));
    if (event?.currentTarget) {
        event.currentTarget.classList.add('ativo');
    }
}

// ────────────────────────────────────────────────
//               EVENTOS GLOBAIS
// ────────────────────────────────────────────────

function configurarEventos() {
    // Delegação de eventos (melhor performance e funciona com elementos dinâmicos)
    document.addEventListener('click', e => {
        const btn = e.target.closest('.btn-atualizar');
        if (btn) {
            atualizarStatus(btn);
        }
    });

    // Enter na tela de senha
    document.addEventListener('keypress', e => {
        if (e.key === 'Enter' && document.getElementById('telaBloqueio')?.style.display === 'flex') {
            verificarSenha();
        }
    });
}

// Expor funções necessárias no escopo global (se ainda forem chamadas via onclick inline)
window.filtrarPedidos = filtrarPedidos;