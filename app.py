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

# CONFIGURAÇÃO DE URLS OFICIAIS
# O CORS agora permite que o seu site no GitHub acesse o Python no Render
CORS(app, supports_credentials=True, resources={r"/*": {
    "origins": ["https://benjamimguaraldo-rgb.github.io"]
}})

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
                window.location.href = "https://benjamimguaraldo-rgb.github.io/Big-Shopp/produtos.html";
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

@app.route('/deletar_produto/<int:id>', methods=['DELETE', 'OPTIONS'])
def deletar_produto(id):
    # O método OPTIONS é importante para o CORS (navegador) liberar o DELETE
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200
        
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM produtos WHERE id = ?", (id,))
        conn.commit()
        conn.close()
        return jsonify({"sucesso": True, "mensagem": "Produto removido!"}), 200
    except Exception as e:
        return jsonify({"sucesso": False, "erro": str(e)}), 500

if __name__ == '__main__':
    init_db()
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)