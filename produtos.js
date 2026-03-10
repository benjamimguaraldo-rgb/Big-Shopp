const API = "https://big-shopp.onrender.com"

async function carregarProdutos(){

    const resposta = await fetch(API + "/produtos")
    const produtos = await resposta.json()

    const container = document.querySelector(".container-produtos")
    container.innerHTML = ""

    produtos.forEach(p => {

        const card = document.createElement("div")
        card.className = "produto-card"

        card.innerHTML = `
            <div class="produto-imagem">
                <img src="${p.imagem}">
            </div>

            <div class="produto-info">
                <h2>${p.nome}</h2>
                <p>${p.descricao}</p>
                <div class="produto-preco">R$ ${p.preco}</div>

                <div class="produto-botoes">
                    <button onclick="addCarrinho(${p.id})">
                        Adicionar
                    </button>

                    <button onclick="comprar(${p.id})">
                        Comprar
                    </button>
                </div>
            </div>
        `

        container.appendChild(card)

    })

}

function addCarrinho(id){

    fetch(API + "/adicionar_carrinho",{
        method:"POST",
        headers:{
            "Content-Type":"application/json"
        },
        body: JSON.stringify({produto_id:id})
    })

}

function comprar(id){
    window.location.href = API + "/comprar?produto=" + id
}

carregarProdutos()