import os
import sqlite3
import secrets
import smtplib
import uuid
import json  # ✅ ADICIONA ISSO
from datetime import datetime  # ✅ ADICIONA ISSO
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Flask, request, jsonify, session
from flask_cors import CORS

app = Flask(__name__)

# CONFIGURAÇÃO DE URLS OFICIAIS
# O CORS agora permite que o seu site no GitHub acesse o Python no Render
# Configuração CORS mais permissiva
CORS(app, origins=["https://benjamimguaraldo-rgb.github.io"], supports_credentials=True)
app.secret_key = secrets.token_urlsafe(16)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "database_v3.db")

# ====================== CONFIGURAÇÕES SMTP ======================
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = "bigshop.robot@gmail.com"
SENDER_PASSWORD = "naztcfnpuisfawwi"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Tabela de usuários
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            cpf TEXT NOT NULL,
            endereco TEXT,
            confirmado INTEGER DEFAULT 0,
            token TEXT
        )
    ''')
    
    # Tabela de produtos
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            descricao TEXT,
            preco REAL NOT NULL,
            imagem TEXT
        )
    ''')
    
    # ✅ TABELA DE CARRINHOS (ADICIONADA AQUI)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS carrinhos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            senha TEXT NOT NULL,
            produtos TEXT NOT NULL,
            ultima_atualizacao TIMESTAMP
        )
    ''')
    
    # ✅ TABELA DE COMPRAS (se não tiver, adiciona também)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS compras (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER,
            nome_cliente TEXT NOT NULL,
            email_cliente TEXT NOT NULL,
            cpf_cliente TEXT NOT NULL,
            endereco_entrega TEXT NOT NULL,
            produtos TEXT NOT NULL,
            total REAL NOT NULL,
            status TEXT DEFAULT 'pagamento_pendente',
            data_compra TIMESTAMP,
            FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        )
    ''')
    
    conn.commit()
    conn.close()

# ====================== ENVIO DE E-MAIL (LINK DE LOGIN) ======================
def enviar_email(destinatario, link, token):
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 20px; box-shadow: 0 0 15px rgba(0,0,0,0.1);">
                <h1 style="color: #28a745; text-align: center;">Big Shop</h1>
                <p>Olá! Você solicitou acesso à sua conta.</p>
                <p>Clique no botão abaixo para <b>confirmar seu login</b>:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{link}" style="background-color: #28a745; color: white; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                        CONFIRMAR LOGIN
                    </a>
                </div>
                <p style="font-size: 12px; color: #777;">Se você não solicitou isso, ignore este e-mail.</p>
            </div>
        </body>
    </html>
    """
    try:
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = destinatario
        msg['Subject'] = "Confirmação de Login - Big Shop"
        msg.attach(MIMEText(html_content, 'html'))
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"❌ Erro e-mail: {e}")
        return False

# ====================== ROTAS ======================

@app.route('/cadastrar_usuario', methods=['POST'])
def cadastrar():
    dados = request.get_json()
    token = str(uuid.uuid4())
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("INSERT INTO usuarios (nome, email, cpf, endereco, token) VALUES (?, ?, ?, ?, ?)",
                       (dados['nome'], dados['email'], dados['cpf'], dados['endereco'], token))
        conn.commit()
        conn.close()
        
        # Link para confirmar o login via Render
        link = f"https://big-shopp.onrender.com/confirmar_email?token={token}"
        enviar_email(dados['email'], link, token)
        
        return jsonify({"sucesso": True, "mensagem": "✅ Link de confirmação enviado ao e-mail!"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"sucesso": False, "mensagem": "E-mail já existe!"}), 400

@app.route("/confirmar_email", methods=["GET"])
def confirmar_email():
    token = request.args.get("token")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT nome FROM usuarios WHERE token=?", (token,))
    usuario = cursor.fetchone()
    if usuario:
        cursor.execute("UPDATE usuarios SET confirmado=1 WHERE token=?", (token,))
        conn.commit()
        conn.close()
        # Após confirmar, redireciona o usuário de volta para a página de produtos do GitHub
        return f"""
        <html>
            <script>
                alert('Login confirmado para {usuario[0]}! Redirecionando...');
                window.location.href = "https://benjamimguaraldo-rgb.github.io/Big-Shopp/home.html";
            </script>
            <body><h1>Confirmado!</h1></body>
        </html>
        """
    conn.close()
    return "Token inválido ou expirado.", 404

# ... (restante das rotas de produtos igual ao anterior)

@app.route('/produtos', methods=['GET'])
def listar_produtos():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, nome, descricao, preco, imagem FROM produtos")
    dados = cursor.fetchall()
    conn.close()
    return jsonify([{"id": p[0], "nome": p[1], "descricao": p[2], "preco": p[3], "imagem": p[4]} for p in dados])

@app.route('/carrinho/salvar', methods=['POST'])
def salvar_carrinho():
    """
    Salva o carrinho de um usuário identificado por senha
    """
    try:
        dados = request.get_json()
        senha = dados.get('senha')
        produtos = dados.get('produtos')
        
        if not senha or not produtos:
            return jsonify({"erro": "Senha e produtos são obrigatórios"}), 400
        
        produtos_json = json.dumps(produtos)
        data_atual = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Verifica se já existe carrinho pra essa senha
        cursor.execute("SELECT id FROM carrinhos WHERE senha = ?", (senha,))
        existente = cursor.fetchone()
        
        if existente:
            # Atualiza existente
            cursor.execute('''
                UPDATE carrinhos 
                SET produtos = ?, ultima_atualizacao = ?
                WHERE senha = ?
            ''', (produtos_json, data_atual, senha))
        else:
            # Cria novo
            cursor.execute('''
                INSERT INTO carrinhos (senha, produtos, ultima_atualizacao)
                VALUES (?, ?, ?)
            ''', (senha, produtos_json, data_atual))
        
        conn.commit()
        conn.close()
        
        return jsonify({"sucesso": True, "mensagem": "Carrinho salvo!"}), 200
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        return jsonify({"erro": str(e)}), 500


@app.route('/carrinho/carregar/<senha>', methods=['GET'])
def carregar_carrinho(senha):
    """
    Carrega o carrinho de uma senha específica
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT produtos FROM carrinhos WHERE senha = ?", (senha,))
        resultado = cursor.fetchone()
        conn.close()
        
        if resultado:
            produtos = json.loads(resultado[0])
            return jsonify({
                "sucesso": True,
                "produtos": produtos
            }), 200
        else:
            return jsonify({
                "sucesso": True,
                "produtos": []
            }), 200
            
    except Exception as e:
        print(f"❌ Erro: {e}")
        return jsonify({"erro": str(e)}), 500


@app.route('/carrinho/adicionar', methods=['POST'])
def adicionar_ao_carrinho():
    """
    Adiciona um produto ao carrinho de uma senha
    """
    try:
        dados = request.get_json()
        senha = dados.get('senha')
        produto = dados.get('produto')
        
        if not senha or not produto:
            return jsonify({"erro": "Senha e produto são obrigatórios"}), 400
        
        # Carrega carrinho atual
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT produtos FROM carrinhos WHERE senha = ?", (senha,))
        resultado = cursor.fetchone()
        
        if resultado:
            produtos = json.loads(resultado[0])
        else:
            produtos = []
        
        # Adiciona novo produto
        produto['quantidade'] = 1
        produtos.append(produto)
        
        # Salva de volta
        produtos_json = json.dumps(produtos)
        data_atual = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        if resultado:
            cursor.execute('''
                UPDATE carrinhos 
                SET produtos = ?, ultima_atualizacao = ?
                WHERE senha = ?
            ''', (produtos_json, data_atual, senha))
        else:
            cursor.execute('''
                INSERT INTO carrinhos (senha, produtos, ultima_atualizacao)
                VALUES (?, ?, ?)
            ''', (senha, produtos_json, data_atual))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            "sucesso": True,
            "mensagem": "Produto adicionado!",
            "total": len(produtos)
        }), 200
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        return jsonify({"erro": str(e)}), 500
    
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


# ====================== ROTAS DE ADMINISTRAÇÃO ======================

@app.route('/criar_produto', methods=['POST'])
def criar_produto():
    dados = request.get_json()
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("INSERT INTO produtos (nome, descricao, preco, imagem) VALUES (?, ?, ?, ?)",
                       (dados['nome'], dados['descricao'], dados['preco'], dados['imagem']))
        conn.commit()
        conn.close()
        return jsonify({"sucesso": True}), 201
    except Exception as e:
        return jsonify({"sucesso": False, "erro": str(e)}), 400

@app.route('/deletar_produto/<int:id>', methods=['DELETE'])
def deletar_produto(id):
    """
    Remove um produto do banco de dados pelo ID.
    Retorna 200 se removido, 404 se não encontrado.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        # Verifica se o produto existe
        cursor.execute("SELECT id FROM produtos WHERE id = ?", (id,))
        produto = cursor.fetchone()
        
        if not produto:
            conn.close()
            return jsonify({"sucesso": False, "mensagem": "Produto não encontrado."}), 404
        
        cursor.execute("DELETE FROM produtos WHERE id = ?", (id,))
        conn.commit()
        conn.close()
        return jsonify({"sucesso": True, "mensagem": "Produto removido!"}), 200
    except Exception as e:
        return jsonify({"sucesso": False, "erro": str(e)}), 500
    
    # Adicione isso no seu backend (junto com as outras rotas)

# ====================== SENHA SECRETA ======================
# A senha fica aqui, escondida no Python (ninguém vê)
SENHA_ULTRA_SECRETA = "phcjs26.31"  # Troque por algo mais seguro

@app.route('/verificar_senha', methods=['POST'])
def verificar_senha():
    try:
        dados = request.get_json()
        senha_recebida = dados.get('senha', '')
        
        if senha_recebida == SENHA_ULTRA_SECRETA:
            return jsonify({"sucesso": True, "mensagem": "Acesso liberado!"}), 200
        else:
            return jsonify({"sucesso": False, "mensagem": "Senha incorreta"}), 401
    except Exception as e:
        print(f"❌ Erro: {e}")
        return jsonify({"sucesso": False, "erro": str(e)}), 500

# Opcional: rota pra trocar senha (só você pode chamar)
@app.route('/alterar_senha', methods=['POST'])
def alterar_senha():
    """
    Altera a senha ultra secreta (protegida por senha atual)
    """
    global SENHA_ULTRA_SECRETA
    dados = request.get_json()
    senha_atual = dados.get('senha_atual', '')
    nova_senha = dados.get('nova_senha', '')
    
    if senha_atual == SENHA_ULTRA_SECRETA:
        SENHA_ULTRA_SECRETA = nova_senha
        return jsonify({"sucesso": True, "mensagem": "Senha alterada!"}), 200
    else:
        return jsonify({"sucesso": False, "mensagem": "Senha atual incorreta"}), 401
    

# ====================== SISTEMA DE COMPRAS FÁCIL ======================

# Email pra receber notificações (já trocado pro seu)
EMAIL_NOTIFICACAO = "ensinoproluiz@gmail.com"

@app.route('/finalizar_compra_facil', methods=['POST'])
def finalizar_compra_facil():
    """
    Recebe os dados da compra, salva no banco e envia email
    """
    try:
        dados = request.get_json()
        print("📦 Dados recebidos:", dados)
        
        # Extrai dados
        usuario_id = dados.get('usuario_id')
        nome = dados.get('nome')
        email = dados.get('email')
        cpf = dados.get('cpf')
        endereco = dados.get('endereco')
        produtos = dados.get('produtos')
        total = dados.get('total')
        
        # Converte pra JSON
        produtos_json = json.dumps(produtos, ensure_ascii=False)
        endereco_json = json.dumps(endereco, ensure_ascii=False)
        
        # Data atual
        data_atual = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # 1️⃣ SALVA NO BANCO DE DADOS
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO compras 
            (usuario_id, nome_cliente, email_cliente, cpf_cliente, endereco_entrega, produtos, total, status, data_compra)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            usuario_id, 
            nome, 
            email, 
            cpf, 
            endereco_json, 
            produtos_json, 
            total, 
            'pagamento_pendente',
            data_atual
        ))
        
        compra_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        # 2️⃣ ENVIA EMAIL DE NOTIFICAÇÃO
        enviar_email_compra(dados, compra_id)
        
        return jsonify({
            "sucesso": True,
            "mensagem": "Compra registrada! Você receberá um email de confirmação.",
            "compra_id": compra_id
        }), 201
        
    except Exception as e:
        print(f"❌ Erro ao finalizar compra: {e}")
        return jsonify({"sucesso": False, "erro": str(e)}), 500


def enviar_email_compra(dados, compra_id):
    """
    Envia email com os detalhes da compra
    """
    try:
        # Monta lista de produtos
        produtos_html = ""
        for p in dados['produtos']:
            subtotal = float(p.get('quantidade', 1)) * float(p['preco'])
            produtos_html += f"""
            <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 10px;">{p['nome']}</td>
                <td style="padding: 10px;">{p.get('quantidade', 1)}</td>
                <td style="padding: 10px;">R$ {float(p['preco']):.2f}</td>
                <td style="padding: 10px;">R$ {subtotal:.2f}</td>
            </tr>
            """
        
        # Endereço formatado
        end = dados['endereco']
        endereco_formatado = f"{end.get('rua', '')}, {end.get('numero', '')} - {end.get('bairro', '')}<br>{end.get('cidade', '')} - CEP: {end.get('cep', '')}"
        
        # Template do email
        html = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
                h1 {{ color: #3d566e; text-align: center; }}
                .pedido-info {{ background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }}
                table {{ width: 100%; border-collapse: collapse; }}
                th {{ background: #3d566e; color: white; padding: 10px; text-align: left; }}
                .total {{ font-size: 1.2em; font-weight: bold; text-align: right; margin-top: 20px; padding-top: 10px; border-top: 2px solid #3d566e; }}
                .status {{ background: #fff3cd; color: #856404; padding: 10px; border-radius: 5px; text-align: center; }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🛍️ Big Shop - Nova Compra</h1>
                
                <div class="pedido-info">
                    <h3>📦 Pedido #{compra_id}</h3>
                    <p><strong>Data:</strong> {datetime.now().strftime("%d/%m/%Y %H:%M")}</p>
                </div>
                
                <h3>👤 Cliente</h3>
                <p>
                    <strong>Nome:</strong> {dados['nome']}<br>
                    <strong>Email:</strong> {dados['email']}<br>
                    <strong>CPF:</strong> {dados['cpf']}
                </p>
                
                <h3>📍 Endereço de Entrega</h3>
                <p>{endereco_formatado}</p>
                
                <h3>🛒 Produtos</h3>
                <table>
                    <tr>
                        <th>Produto</th>
                        <th>Qtd</th>
                        <th>Preço</th>
                        <th>Subtotal</th>
                    </tr>
                    {produtos_html}
                </table>
                
                <div class="total">
                    TOTAL: R$ {dados['total']:.2f}
                </div>
                
                <div class="status">
                    ⏳ Status: PAGAMENTO PENDENTE
                </div>
                
                <p style="text-align: center; margin-top: 30px;">
                    <a href="https://benjamimguaraldo-rgb.github.io/Big-Shopp/meus-pedidos.html" 
                       style="background: #3d566e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                        Ver Meus Pedidos
                    </a>
                </p>
            </div>
        </body>
        </html>
        """
        
        # Envia email
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = EMAIL_NOTIFICACAO
        msg['Subject'] = f"🛍️ Nova compra - Big Shop #{compra_id}"
        msg.attach(MIMEText(html, 'html'))
        
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        print(f"✅ Email enviado pra {EMAIL_NOTIFICACAO}")
        
    except Exception as e:
        print(f"❌ Erro ao enviar email: {e}")


@app.route('/compras/usuario/<int:usuario_id>', methods=['GET'])
def listar_compras_usuario(usuario_id):
    """
    Retorna todas as compras de um usuário (pra página Meus Pedidos)
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, nome_cliente, produtos, total, status, data_compra
            FROM compras
            WHERE usuario_id = ?
            ORDER BY data_compra DESC
        ''', (usuario_id,))
        
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
                "data": c[5]
            })
        
        return jsonify(resultado), 200
        
    except Exception as e:
        print(f"❌ Erro ao listar compras: {e}")
        return jsonify({"sucesso": False, "erro": str(e)}), 500
    
# ====================== SISTEMA DE PAGAMENTO SIMULADO ======================

@app.route('/simular_pagamento/<int:compra_id>', methods=['POST'])
def simular_pagamento(compra_id):
    """
    Simula a aprovação de um pagamento (sem Mercado Pago)
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Verifica se a compra existe
        cursor.execute("SELECT id, email_cliente FROM compras WHERE id = ?", (compra_id,))
        compra = cursor.fetchone()
        
        if not compra:
            return jsonify({"erro": "Compra não encontrada"}), 404
        
        # Atualiza status para "pago"
        cursor.execute('''
            UPDATE compras 
            SET status = 'pago' 
            WHERE id = ?
        ''', (compra_id,))
        
        conn.commit()
        conn.close()
        
        # Envia email de confirmação (opcional)
        # enviar_email_pagamento_simulado(compra_id)
        
        return jsonify({
            "sucesso": True, 
            "mensagem": "✅ Pagamento simulado aprovado!"
        }), 200
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        return jsonify({"erro": str(e)}), 500


# ====================== ADMIN DE ENTREGAS ======================

@app.route('/admin/compras', methods=['GET'])
def listar_todas_compras():
    """
    Lista todas as compras (para o admin)
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, nome_cliente, email_cliente, total, status, data_compra
            FROM compras
            ORDER BY data_compra DESC
        ''')
        
        compras = cursor.fetchall()
        conn.close()
        
        resultado = []
        for c in compras:
            resultado.append({
                "id": c[0],
                "cliente": c[1],
                "email": c[2],
                "total": c[3],
                "status": c[4],
                "data": c[5]
            })
        
        return jsonify(resultado), 200
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        return jsonify({"erro": str(e)}), 500


@app.route('/admin/atualizar_status', methods=['POST'])
def atualizar_status_entrega():
    """
    Atualiza o status de entrega de um pedido
    Status possíveis: pagamento_pendente, pago, enviado, entregue, cancelado
    """
    try:
        dados = request.get_json()
        compra_id = dados.get('compra_id')
        novo_status = dados.get('status')
        
        status_validos = ['pagamento_pendente', 'pago', 'enviado', 'entregue', 'cancelado']
        
        if novo_status not in status_validos:
            return jsonify({"erro": "Status inválido"}), 400
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE compras 
            SET status = ? 
            WHERE id = ?
        ''', (novo_status, compra_id))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            "sucesso": True,
            "mensagem": f"Status atualizado para {novo_status}"
        }), 200
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        return jsonify({"erro": str(e)}), 500


@app.route('/admin/detalhes_compra/<int:compra_id>', methods=['GET'])
def detalhes_compra(compra_id):
    """
    Retorna detalhes completos de uma compra
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, nome_cliente, email_cliente, cpf_cliente, 
                   endereco_entrega, produtos, total, status, data_compra
            FROM compras
            WHERE id = ?
        ''', (compra_id,))
        
        compra = cursor.fetchone()
        conn.close()
        
        if not compra:
            return jsonify({"erro": "Compra não encontrada"}), 404
        
        resultado = {
            "id": compra[0],
            "cliente": compra[1],
            "email": compra[2],
            "cpf": compra[3],
            "endereco": json.loads(compra[4]),
            "produtos": json.loads(compra[5]),
            "total": compra[6],
            "status": compra[7],
            "data": compra[8]
        }
        
        return jsonify(resultado), 200
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        return jsonify({"erro": str(e)}), 500

if __name__ == '__main__':
    init_db()
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)