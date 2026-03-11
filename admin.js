const API = "https://big-shopp.onrender.com";

// ====================== SISTEMA DE BLOQUEIO ======================
document.addEventListener('DOMContentLoaded', function() {
    // Se estiver na página admin, ativa bloqueio
    if (window.location.pathname.includes('admin') || 
        window.location.pathname.includes('painel') ||
        window.location.pathname.includes('administrador')) {
        ativarBloqueio();
    }
});

function ativarBloqueio() {
    // Mostra a tela de bloqueio
    document.getElementById('telaBloqueio').style.display = 'flex';
    document.body.classList.add('travado'); // Impede scroll
    
    // Foca no input automaticamente
    setTimeout(() => {
        document.getElementById('senhaInput').focus();
    }, 100);
}

function desativarBloqueio() {
    document.getElementById('telaBloqueio').style.display = 'none';
    document.body.classList.remove('travado');
}

async function verificarSenha() {
    console.log("🚨 FUNÇÃO verificarSenha FOI CHAMADA!");
    
    const senha = document.getElementById('senhaInput').value;
    console.log("📝 Senha digitada:", senha);
    
    if (!senha) {
        console.log("⚠️ Senha vazia!");
        mostrarErro('Digite a senha!');
        return;
    }
    
    console.log("📡 API URL:", API);
    console.log("📡 Chamando:", `${API}/verificar_senha`);
    
    try {
        console.log("⏳ Enviando requisição...");
        
        const response = await fetch(`${API}/verificar_senha`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ senha: senha })
        });
        
        console.log("📨 STATUS DA RESPOSTA:", response.status);
        console.log("📨 HEADERS:", response.headers);
        
        const data = await response.json();
        console.log("📦 DADOS RECEBIDOS:", data);
        
        if (data.sucesso) {
            console.log("✅ ACESSO LIBERADO!");
            desativarBloqueio();
            carregarProdutosAdmin();
        } else {
            console.log("❌ SENHA INCORRETA!");
            mostrarErro('🔒 Senha incorreta!');
            document.getElementById('senhaInput').value = '';
            document.getElementById('senhaInput').focus();
        }
    } catch (error) {
        console.log("💥 ERRO CATASTRÓFICO:");
        console.error(error);
        mostrarErro('Erro: ' + error.message);
    }
}

function mostrarErro(msg) {
    document.getElementById('mensagemErro').textContent = msg;
    setTimeout(() => {
        document.getElementById('mensagemErro').textContent = '';
    }, 3000);
}

// Apertar Enter no input
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && 
        document.getElementById('telaBloqueio') && 
        document.getElementById('telaBloqueio').style.display === 'flex') {
        verificarSenha();
    }
});

// ====================== FUNÇÕES DOS PRODUTOS ======================

// Função para buscar produtos e listar na tabela
async function carregarProdutosAdmin() {
    const res = await fetch(`${API}/produtos`);
    const produtos = await res.json();
    const tabela = document.getElementById("tabela-produtos");
    if (!tabela) return; // Se não existir a tabela, sai
    
    tabela.innerHTML = "";

    produtos.forEach(p => {
        tabela.innerHTML += `
            <tr>
                <td><img src="${p.imagem}" alt="foto" style="max-width: 50px;"></td>
                <td>${p.nome}</td>
                <td>R$ ${p.preco.toFixed(2)}</td>
                <td>
                    <button class="btn-delete" onclick="deletarProduto(${p.id})">Excluir</button>
                </td>
            </tr>
        `;
    });
}

// Função para enviar novo produto ao banco
async function salvarProduto() {
    const produto = {
        nome: document.getElementById("nome").value,
        descricao: document.getElementById("descricao").value,
        preco: parseFloat(document.getElementById("preco").value),
        imagem: document.getElementById("imagem").value
    };

    const res = await fetch(`${API}/criar_produto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(produto)
    });

    if (res.ok) {
        alert("✅ Produto salvo!");
        location.reload(); // Recarrega para mostrar na lista
    } else {
        alert("❌ Erro ao salvar.");
    }
}

// Função para deletar
async function deletarProduto(id) {
    if (confirm("Tem certeza que deseja excluir?")) {
        await fetch(`${API}/deletar_produto/${id}`, { method: "DELETE" });
        carregarProdutosAdmin();
    }
}

// NÃO chama carregarProdutosAdmin automaticamente aqui
// Agora ela só será chamada APÓS a senha correta