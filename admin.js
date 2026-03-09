const API = "http://127.0.0.1:5000";

// Função para buscar produtos e listar na tabela
async function carregarProdutosAdmin() {
    const res = await fetch(`${API}/produtos`);
    const produtos = await res.json();
    const tabela = document.getElementById("tabela-produtos");
    tabela.innerHTML = "";

    produtos.forEach(p => {
        tabela.innerHTML += `
            <tr>
                <td><img src="${p.imagem}" alt="foto"></td>
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

carregarProdutosAdmin();