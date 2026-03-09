import os
import sqlite3
import secrets
import smtplib
import uuid
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Flask, request, jsonify, session
from flask_cors import CORS

app = Flask(__name__)
# Importante: supports_credentials=True permite que o login funcione entre portas diferentes
CORS(app, supports_credentials=True, resources={r"/*": {"origins": ["http://127.0.0.1:5500", "http://localhost:5500"]}})
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
    # Tabela de Usuários
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
    # Tabela de Produtos
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            descricao TEXT,
            preco REAL NOT NULL,
            imagem TEXT
        )
    ''')
    conn.commit()
    conn.close()
    print(f"✅ Banco de dados e tabelas prontos!")

# ====================== ENVIO DE E-MAIL ======================
def enviar_email(destinatario, link, token):
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 0 15px rgba(0,0,0,0.1);">
                <div style="background: #28a745; color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0;">Big Shop</h1>
                    <p style="margin: 5px 0 0 0; opacity: 0.9;">Ativação de Conta</p>
                </div>
                <div style="padding: 30px 25px; color: #333;">
                    <h2>Olá,</h2>
                    <p>Seu cadastro foi realizado com sucesso!</p>
                    <p>Clique no botão abaixo para ativar sua conta agora:</p>
                    <a href="{link}" style="display: inline-block; padding: 14px 28px; background-color: #28a745; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0;">
                        ✅ ATIVAR MINHA CONTA
                    </a>
                    <p><strong>Token de ativação:</strong> {token}</p>
                </div>
            </div>
        </body>
    </html>
    """
    try:
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = destinatario
        msg['Subject'] = "Ative sua conta na Big Shop"
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

# ====================== ROTAS DE USUÁRIO ======================
@app.route('/cadastrar_usuario', methods=['POST'])
def cadastrar():
    dados = request.get_json()
    token = str(uuid.uuid4())
    for campo in ['nome', 'email', 'cpf', 'endereco']:
        if not dados.get(campo):
            return jsonify({"sucesso": False, "mensagem": f"Falta o campo {campo}"}), 400
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("INSERT INTO usuarios (nome, email, cpf, endereco, token) VALUES (?, ?, ?, ?, ?)",
                       (dados['nome'], dados['email'], dados['cpf'], dados['endereco'], token))
        conn.commit()
        conn.close()
        link = f"http://127.0.0.1:5000/confirmar_email?token={token}"
        enviar_email(dados['email'], link, token)
        return jsonify({"sucesso": True, "mensagem": "✅ Cadastro realizado! Verifique seu e-mail."}), 201
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
        return f"<h1>✅ Sucesso!</h1><p>Conta de {usuario[0]} ativada.</p>"
    conn.close()
    return "Token inválido.", 404

@app.route('/login', methods=['POST'])
def login():
    dados = request.get_json()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, nome, confirmado FROM usuarios WHERE email=? AND token=?", (dados.get('email'), dados.get('token')))
    usuario = cursor.fetchone()
    conn.close()
    if usuario:
        if usuario[2] == 0: return jsonify({"sucesso": False, "mensagem": "Ative sua conta!"}), 403
        session['user_id'] = usuario[0]
        return jsonify({"sucesso": True, "nome": usuario[1]})
    return jsonify({"sucesso": False, "mensagem": "Dados incorretos"}), 401

# ====================== ROTAS DE PRODUTOS ======================
@app.route('/produtos', methods=['GET'])
def listar_produtos():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, nome, descricao, preco, imagem FROM produtos")
    dados = cursor.fetchall()
    conn.close()
    return jsonify([{"id": p[0], "nome": p[1], "descricao": p[2], "preco": p[3], "imagem": p[4]} for p in dados])

@app.route('/criar_produto', methods=['POST'])
def criar_produto():
    dados = request.get_json()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO produtos (nome, descricao, preco, imagem) VALUES (?, ?, ?, ?)",
                   (dados['nome'], dados['descricao'], dados['preco'], dados['imagem']))
    conn.commit()
    conn.close()
    return jsonify({"sucesso": True})

@app.route('/deletar_produto/<int:id>', methods=['DELETE'])
def deletar_produto(id):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM produtos WHERE id=?", (id,))
    conn.commit()
    conn.close()
    return jsonify({"sucesso": True})

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)