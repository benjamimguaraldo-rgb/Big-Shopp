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
    const tela = document.getElementById('telaBloqueio');
    if (!tela) {
        console.error("❌ Tela de bloqueio não encontrada!");
        return;
    }
    
    tela.style.display = 'flex';
    document.body.classList.add('travado');
    
    setTimeout(() => {
        document.getElementById('senhaInput')?.focus();
    }, 100);
}

function desativarBloqueio() {
    document.getElementById('telaBloqueio').style.display = 'none';
    document.body.classList.remove('travado');
}

async function verificarSenha() {
    console.log("🚨 Verificando senha...");
    
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
            console.log("✅ Senha correta!");
            desativarBloqueio();
            carregarProdutosAdmin(); // Carrega produtos após liberar
        } else {
            mostrarErro('🔒 Senha incorreta!');
            document.getElementById('senhaInput').value = '';
            document.getElementById('senhaInput').focus();
        }
    } catch (error) {
        console.error("❌ Erro:", error);
        mostrarErro('Erro ao verificar senha');
    }
}

function mostrarErro(msg) {
    const erroEl = document.getElementById('mensagemErro');
    if (erroEl) {
        erroEl.textContent = msg;
        setTimeout(() => {
            erroEl.textContent = '';
        }, 3000);
    }
}

// Enter no input
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && 
        document.getElementById('telaBloqueio')?.style.display === 'flex') {
        verificarSenha();
    }
});

// ====================== FUNÇÕES DOS PRODUTOS ======================

// Carregar produtos
async function carregarProdutosAdmin() {
    try {
        console.log("📦 Carregando produtos...");
        const res = await fetch(`${API}/produtos`);
        
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const produtos = await res.json();
        console.log("✅ Produtos carregados:", produtos);
        
        const tabela = document.getElementById("tabela-produtos");
        if (!tabela) return;
        
        if (produtos.length === 0) {
            tabela.innerHTML = `<tr><td colspan="4" style="text-align: center;">Nenhum produto cadastrado</td></tr>`;
            return;
        }
        
        tabela.innerHTML = produtos.map(p => `
            <tr>
                <td><img src="${p.imagem}" alt="${p.nome}" style="max-width: 50px; max-height: 50px; object-fit: cover;"></td>
                <td>${p.nome}</td>
                <td>R$ ${p.preco.toFixed(2)}</td>
                <td>
                    <button class="btn-delete" onclick="deletarProduto(${p.id})">Excluir</button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error("❌ Erro ao carregar produtos:", error);
        alert("Erro ao carregar produtos. Verifique o console.");
    }
}

// Salvar produto (CORRIGIDO)
async function salvarProduto() {
    // Pega valores dos inputs
    const nome = document.getElementById("nome")?.value;
    const descricao = document.getElementById("descricao")?.value;
    const preco = document.getElementById("preco")?.value;
    const imagem = document.getElementById("imagem")?.value;
    
    // Validação
    if (!nome || !descricao || !preco || !imagem) {
        alert("❌ Preencha todos os campos!");
        return;
    }
    
    const produto = {
        nome: nome,
        descricao: descricao,
        preco: parseFloat(preco),
        imagem: imagem
    };
    
    console.log("📤 Enviando produto:", produto);
    
    try {
        const res = await fetch(`${API}/criar_produto`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json"
            },
            body: JSON.stringify(produto)
        });
        
        const data = await res.json();
        console.log("📥 Resposta:", data);
        
        if (res.ok) {
            alert("✅ Produto salvo com sucesso!");
            
            // Limpa os campos
            document.getElementById("nome").value = "";
            document.getElementById("descricao").value = "";
            document.getElementById("preco").value = "";
            document.getElementById("imagem").value = "";
            
            // Recarrega a lista sem dar reload na página
            carregarProdutosAdmin();
        } else {
            alert("❌ Erro ao salvar: " + (data.erro || "Erro desconhecido"));
        }
    } catch (error) {
        console.error("❌ Erro na requisição:", error);
        alert("Erro ao conectar com o servidor");
    }
}

// Deletar produto (CORRIGIDO)
async function deletarProduto(id) {
    if (!confirm("⚠️ Tem certeza que deseja excluir este produto?")) {
        return;
    }
    
    console.log(`🗑️ Deletando produto ID: ${id}`);
    
    try {
        const res = await fetch(`${API}/deletar_produto/${id}`, { 
            method: "DELETE",
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await res.json();
        console.log("📥 Resposta delete:", data);
        
        if (res.ok) {
            alert("✅ Produto excluído!");
            carregarProdutosAdmin(); // Recarrega a lista
        } else {
            alert("❌ Erro: " + (data.mensagem || data.erro || "Erro ao excluir"));
        }
    } catch (error) {
        console.error("❌ Erro no delete:", error);
        alert("Erro ao conectar com o servidor");
    }
}

// Função de teste pra verificar se API está online
async function testarAPI() {
    try {
        const res = await fetch(`${API}/produtos`);
        const data = await res.json();
        console.log("✅ API OK:", data);
    } catch (error) {
        console.error("❌ API OFFLINE:", error);
    }
}

// Testa API quando carrega
testarAPI();