const casButton = document.getElementById('casbutton');

casButton.addEventListener('click', async () => {
    const nome = document.getElementById('nome').value.trim();
    const email = document.getElementById('email').value.trim();
    const cpf = document.getElementById('cpf').value.trim();
    const endereco = document.getElementById('endereco').value.trim();

    if (!nome || !email || !cpf || !endereco) {
        alert("Preencha todos os campos!");
        return;
    }

    try {
        const resposta = await fetch('http://127.0.0.1:5000/cadastrar_usuario', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, cpf, endereco })
        });

        const dados = await resposta.json();
        console.log("Resposta do servidor:", dados);

        if (dados.sucesso) {
            alert(dados.mensagem);
            // limpa formulário
            document.getElementById('nome').value = '';
            document.getElementById('email').value = '';
            document.getElementById('cpf').value = '';
            document.getElementById('endereco').value = '';
        } else {
            alert("Erro: " + dados.mensagem);
        }
    } catch (err) {
        console.error(err);
        alert("Não conseguiu conectar ao servidor.\nVerifique se o Python está rodando na porta 5000.");
    }
});