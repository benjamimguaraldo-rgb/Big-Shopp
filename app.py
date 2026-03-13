#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Big Shop - Backend API
Versão: 3.1.0
Descrição: API completa para e-commerce com carrinho por senha, integração com Mercado Pago,
gerenciamento de pedidos, painel admin, envio de e-mails e muito mais.
"""

# ====================== IMPORTS PADRÃO ======================
import os
import re
import json
import uuid
import secrets
import logging
import sqlite3
import smtplib
from datetime import datetime
from contextlib import contextmanager

# ====================== EMAIL ======================
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# ====================== FLASK ======================
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS

# ====================== MERCADO PAGO (OPCIONAL) ======================
try:
    import mercadopago
    MP_AVAILABLE = True
except ImportError:
    MP_AVAILABLE = False
    print("⚠️ MercadoPago SDK não instalado. Ignorando integração.")

# =============================================================================
# CONFIGURAÇÕES INICIAIS E LOGGING
# =============================================================================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.FileHandler("app.log"), logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# =============================================================================
# CONFIGURAÇÕES DE AMBIENTE E CHAVES
# =============================================================================

app.secret_key = os.environ.get("SECRET_KEY", secrets.token_urlsafe(32))

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "database_v3.db")
DB_TIMEOUT = 30

# Configurações SMTP
SMTP_SERVER = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "bigshop.robot@gmail.com")
SENDER_PASSWORD = os.environ.get("SENDER_PASSWORD", "naztcfnpuisfawwi")  # Use variável de ambiente

# Mercado Pago
MP_ACCESS_TOKEN = os.environ.get("MP_ACCESS_TOKEN", None)

# URLs do frontend
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://benjamimguaraldo-rgb.github.io/Big-Shopp")
FRONTEND_SUCCESS_URL = f"{FRONTEND_URL}/sucesso.html"
FRONTEND_FAILURE_URL = f"{FRONTEND_URL}/erro.html"
FRONTEND_PENDING_URL = f"{FRONTEND_URL}/pendente.html"

# Senha admin
ADMIN_SECRET_PASSWORD = os.environ.get("ADMIN_SECRET_PASSWORD", "phcjs26.31")

# =============================================================================
# CONFIGURAÇÃO CORS (ÚNICA E CORRETA)
# =============================================================================

ALLOWED_ORIGINS = [
    "https://benjamimguaraldo-rgb.github.io",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "https://big-shopp.onrender.com"
]

CORS(app,
     origins=ALLOWED_ORIGINS,
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"],
     expose_headers=["Content-Type"],
     supports_credentials=True,
     max_age=3600)

# =============================================================================
# FUNÇÕES AUXILIARES
# =============================================================================

@contextmanager
def get_db_connection():
    conn = None
    try:
        conn = sqlite3.connect(DB_PATH, timeout=DB_TIMEOUT)
        conn.row_factory = sqlite3.Row
        yield conn
        conn.commit()
    except sqlite3.Error as e:
        logger.error(f"Erro no banco de dados: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            conn.close()

def validar_cpf(cpf):
    cpf = re.sub(r'\D', '', cpf)
    return len(cpf) == 11

def validar_email(email):
    return re.match(r'^[^@]+@[^@]+\.[^@]+$', email) is not None

def validar_senha(senha):
    return senha.isdigit() and len(senha) == 4

def enviar_email(destinatario, assunto, corpo_html, corpo_text=None):
    try:
        msg = MIMEMultipart('alternative')
        msg['From'] = SENDER_EMAIL
        msg['To'] = destinatario
        msg['Subject'] = assunto

        if corpo_text:
            msg.attach(MIMEText(corpo_text, 'plain'))
        else:
            texto_simples = re.sub(r'<[^>]+>', '', corpo_html)
            msg.attach(MIMEText(texto_simples, 'plain'))

        msg.attach(MIMEText(corpo_html, 'html'))

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.send_message(msg)

        logger.info(f"E-mail enviado para {destinatario}: {assunto}")
        return True
    except Exception as e:
        logger.error(f"Falha ao enviar e-mail: {e}")
        return False

def enviar_email_compra(compra_id, dados, email_admin=True):
    cliente_html = f"""
    <html>
    <head><style>body{{font-family:Arial}} .total{{color:#28a745; font-size:24px}}</style></head>
    <body>
        <h1>🛍️ Obrigado por comprar na Big Shop!</h1>
        <p>Olá <strong>{dados['nome']}</strong>, seu pedido #{compra_id} foi recebido.</p>
        <p>Total: <span class="total">R$ {dados['total']:.2f}</span></p>
        <p>Acompanhe seu pedido em: <a href="{FRONTEND_URL}/meus-pedidos.html">Meus Pedidos</a></p>
    </body>
    </html>
    """
    enviar_email(dados['email'], f"Pedido #{compra_id} confirmado - Big Shop", cliente_html)

    if email_admin:
        admin_html = f"""
        <html>
        <body>
            <h1>🆕 Nova compra #{compra_id}</h1>
            <p><strong>Cliente:</strong> {dados['nome']} ({dados['email']})</p>
            <p><strong>Total:</strong> R$ {dados['total']:.2f}</p>
            <p><a href="{FRONTEND_URL}/admin-entregas.html">Gerenciar pedidos</a></p>
        </body>
        </html>
        """
        enviar_email(SENDER_EMAIL, f"🆕 Nova compra #{compra_id}", admin_html)

# =============================================================================
# INICIALIZAÇÃO DO BANCO DE DADOS
# =============================================================================

def init_db():
    logger.info("Inicializando banco de dados...")
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS carrinhos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                senha TEXT NOT NULL UNIQUE,
                produtos TEXT NOT NULL,
                ultima_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_carrinhos_senha ON carrinhos(senha)')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS compras (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                senha TEXT,
                nome_cliente TEXT NOT NULL,
                email_cliente TEXT NOT NULL,
                cpf_cliente TEXT NOT NULL,
                endereco_entrega TEXT NOT NULL,
                produtos TEXT NOT NULL,
                total REAL NOT NULL,
                status TEXT DEFAULT 'pagamento_pendente',
                pagamento_id TEXT,
                pagamento_detalhes TEXT,
                data_compra TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ultima_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                observacoes TEXT
            )
        ''')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_compras_status ON compras(status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_compras_email ON compras(email_cliente)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_compras_data ON compras(data_compra)')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tipo TEXT,
                mensagem TEXT,
                detalhes TEXT,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()
    logger.info("Banco de dados inicializado com sucesso.")

init_db()

# =============================================================================
# ROTAS DE CARRINHO
# =============================================================================

@app.route('/carrinho/salvar', methods=['POST'])
def salvar_carrinho():
    try:
        dados = request.get_json()
        if not dados:
            return jsonify({"erro": "Requisição sem corpo JSON"}), 400

        senha = dados.get('senha')
        produtos = dados.get('produtos')

        if not senha:
            return jsonify({"erro": "Campo 'senha' obrigatório"}), 400
        if not validar_senha(senha):
            return jsonify({"erro": "Senha deve ter 4 dígitos numéricos"}), 400
        if produtos is None or not isinstance(produtos, list):
            return jsonify({"erro": "'produtos' deve ser uma lista"}), 400

        produtos_json = json.dumps(produtos, ensure_ascii=False)

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM carrinhos WHERE senha = ?", (senha,))
            existente = cursor.fetchone()

            if existente:
                cursor.execute('''
                    UPDATE carrinhos SET produtos = ?, ultima_atualizacao = CURRENT_TIMESTAMP WHERE senha = ?
                ''', (produtos_json, senha))
                logger.info(f"Carrinho atualizado para senha {senha}")
            else:
                cursor.execute('''
                    INSERT INTO carrinhos (senha, produtos, ultima_atualizacao) VALUES (?, ?, CURRENT_TIMESTAMP)
                ''', (senha, produtos_json))
                logger.info(f"Carrinho criado para senha {senha}")

        return jsonify({"sucesso": True, "mensagem": "Carrinho salvo"}), 200
    except Exception as e:
        logger.error(f"Erro em salvar_carrinho: {e}")
        return jsonify({"erro": "Erro interno no servidor"}), 500

@app.route('/carrinho/carregar/<senha>', methods=['GET'])
def carregar_carrinho(senha):
    if not validar_senha(senha):
        return jsonify({"erro": "Senha inválida"}), 400
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT produtos FROM carrinhos WHERE senha = ?", (senha,))
            row = cursor.fetchone()
        produtos = json.loads(row[0]) if row else []
        return jsonify({"produtos": produtos}), 200
    except Exception as e:
        logger.error(f"Erro em carregar_carrinho: {e}")
        return jsonify({"erro": "Erro interno no servidor"}), 500

# =============================================================================
# ROTAS DE CHECKOUT
# =============================================================================

@app.route('/finalizar_compra_facil', methods=['POST'])
def finalizar_compra_facil():
    try:
        dados = request.get_json()
        print("📦 Dados recebidos:", dados)
        if not dados:
            return jsonify({"erro": "Requisição sem corpo JSON"}), 400

        nome = dados.get('nome')
        email = dados.get('email')
        cpf = dados.get('cpf')
        endereco = dados.get('endereco')
        produtos = dados.get('produtos')
        total = dados.get('total')
        senha = dados.get('senha')

        if not nome or not email or not cpf or not endereco or not produtos or total is None:
            return jsonify({"erro": "Campos obrigatórios faltando"}), 400

        try:
            endereco_json = json.dumps(endereco)
            produtos_json = json.dumps(produtos)
        except Exception as e:
            print(f"❌ Erro ao converter JSON: {e}")
            return jsonify({"erro": "Dados em formato inválido"}), 400

        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO compras
                (senha, nome_cliente, email_cliente, cpf_cliente, endereco_entrega, produtos, total, status, data_compra)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ''', (senha, nome, email, cpf, endereco_json, produtos_json, total, 'pagamento_pendente'))
            compra_id = cursor.lastrowid
            conn.commit()
            conn.close()
            print(f"✅ Compra #{compra_id} registrada com sucesso!")
            enviar_email_compra(compra_id, {'nome': nome, 'email': email, 'total': total})
            return jsonify({"sucesso": True, "mensagem": "Compra registrada!", "compra_id": compra_id}), 201
        except Exception as e:
            print(f"❌ Erro no banco de dados: {e}")
            return jsonify({"erro": "Erro ao salvar no banco"}), 500
    except Exception as e:
        print(f"❌ Erro geral: {e}")
        return jsonify({"erro": "Erro interno no servidor"}), 500

@app.route('/compras/buscar', methods=['POST'])
def buscar_compras():
    try:
        dados = request.get_json()
        email = dados.get('email')
        senha = dados.get('senha')
        if not email and not senha:
            return jsonify({"erro": "Forneça e-mail ou senha"}), 400

        query = "SELECT id, nome_cliente, produtos, total, status, data_compra FROM compras WHERE 1=1"
        params = []
        if email:
            query += " AND email_cliente = ?"
            params.append(email)
        if senha:
            query += " AND senha = ?"
            params.append(senha)
        query += " ORDER BY data_compra DESC"

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            rows = cursor.fetchall()

        compras = []
        for r in rows:
            compras.append({
                "id": r[0],
                "cliente": r[1],
                "produtos": json.loads(r[2]),
                "total": r[3],
                "status": r[4],
                "data": r[5]
            })
        return jsonify(compras), 200
    except Exception as e:
        logger.error(f"Erro em buscar_compras: {e}")
        return jsonify({"erro": "Erro interno"}), 500

# =============================================================================
# ROTAS DE ADMIN
# =============================================================================

@app.route('/admin/compras', methods=['GET'])
def admin_listar_compras():
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, nome_cliente, email_cliente, total, status, data_compra
                FROM compras ORDER BY data_compra DESC
            ''')
            rows = cursor.fetchall()
        compras = [{
            "id": r[0],
            "cliente": r[1],
            "email": r[2],
            "total": r[3],
            "status": r[4],
            "data": r[5]
        } for r in rows]
        return jsonify(compras), 200
    except Exception as e:
        logger.error(f"Erro em admin_listar_compras: {e}")
        return jsonify({"erro": str(e)}), 500

@app.route('/admin/compras/<int:compra_id>', methods=['GET'])
def admin_detalhes_compra(compra_id):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, nome_cliente, email_cliente, cpf_cliente, endereco_entrega,
                       produtos, total, status, data_compra, pagamento_id, observacoes
                FROM compras WHERE id = ?
            ''', (compra_id,))
            row = cursor.fetchone()
        if not row:
            return jsonify({"erro": "Compra não encontrada"}), 404
        compra = {
            "id": row[0],
            "cliente": row[1],
            "email": row[2],
            "cpf": row[3],
            "endereco": json.loads(row[4]),
            "produtos": json.loads(row[5]),
            "total": row[6],
            "status": row[7],
            "data": row[8],
            "pagamento_id": row[9],
            "observacoes": row[10]
        }
        return jsonify(compra), 200
    except Exception as e:
        logger.error(f"Erro em admin_detalhes_compra: {e}")
        return jsonify({"erro": str(e)}), 500

@app.route('/admin/atualizar_status', methods=['POST'])
def admin_atualizar_status():
    try:
        dados = request.get_json()
        compra_id = dados.get('compra_id')
        novo_status = dados.get('status')
        if not compra_id or not novo_status:
            return jsonify({"erro": "compra_id e status obrigatórios"}), 400
        status_validos = ['pagamento_pendente', 'pago', 'enviado', 'entregue', 'cancelado']
        if novo_status not in status_validos:
            return jsonify({"erro": "Status inválido"}), 400
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE compras SET status = ?, ultima_atualizacao = CURRENT_TIMESTAMP WHERE id = ?
            ''', (novo_status, compra_id))
            if cursor.rowcount == 0:
                return jsonify({"erro": "Compra não encontrada"}), 404
        logger.info(f"Status da compra #{compra_id} alterado para {novo_status}")
        return jsonify({"sucesso": True}), 200
    except Exception as e:
        logger.error(f"Erro em admin_atualizar_status: {e}")
        return jsonify({"erro": str(e)}), 500

@app.route('/admin/adicionar_observacao', methods=['POST'])
def admin_adicionar_observacao():
    try:
        dados = request.get_json()
        compra_id = dados.get('compra_id')
        observacao = dados.get('observacao')
        if not compra_id or not observacao:
            return jsonify({"erro": "compra_id e observacao obrigatórios"}), 400
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE compras SET observacoes = IFNULL(observacoes, '') || ? || CHAR(10) || datetime('now') || ': ' || ?
                WHERE id = ?
            ''', ('\n', observacao, compra_id))
        return jsonify({"sucesso": True}), 200
    except Exception as e:
        logger.error(f"Erro em admin_adicionar_observacao: {e}")
        return jsonify({"erro": str(e)}), 500

# =============================================================================
# AUTENTICAÇÃO ADMIN
# =============================================================================

@app.route('/verificar_senha', methods=['POST'])
def verificar_senha():
    try:
        dados = request.get_json()
        senha = dados.get('senha', '')
        if senha == ADMIN_SECRET_PASSWORD:
            return jsonify({"sucesso": True}), 200
        else:
            return jsonify({"sucesso": False}), 401
    except Exception as e:
        logger.error(f"Erro em verificar_senha: {e}")
        return jsonify({"erro": str(e)}), 500

# =============================================================================
# ROTAS MERCADO PAGO (OPCIONAL)
# =============================================================================

sdk = None
if MP_ACCESS_TOKEN and MP_AVAILABLE:
    try:
        sdk = mercadopago.SDK(MP_ACCESS_TOKEN)
        logger.info("✅ SDK do Mercado Pago inicializado.")
    except Exception as e:
        logger.error(f"❌ Falha ao inicializar SDK do MP: {e}")

@app.route('/criar_preferencia', methods=['POST'])
def criar_preferencia():
    if not sdk:
        return jsonify({"erro": "Mercado Pago não configurado"}), 503
    try:
        dados = request.get_json()
        items = dados.get('items', [])
        compra_id = dados.get('compra_id')
        comprador = dados.get('comprador', {})
        if not items:
            return jsonify({"erro": "Lista de itens vazia"}), 400

        itens_mp = [{
            "title": item.get('nome', 'Produto'),
            "quantity": int(item.get('quantidade', 1)),
            "unit_price": float(item.get('preco', 0)),
            "currency_id": "BRL"
        } for item in items]

        payer = {}
        if comprador.get('nome'):
            payer['name'] = comprador['nome']
        if comprador.get('email'):
            payer['email'] = comprador['email']
        if comprador.get('cpf'):
            payer['identification'] = {"type": "CPF", "number": comprador['cpf']}
        if comprador.get('telefone'):
            payer['phone'] = {"area_code": "55", "number": comprador['telefone']}

        back_urls = {
            "success": FRONTEND_SUCCESS_URL,
            "failure": FRONTEND_FAILURE_URL,
            "pending": FRONTEND_PENDING_URL
        }

        preference_data = {
            "items": itens_mp,
            "payer": payer,
            "back_urls": back_urls,
            "auto_return": "approved",
            "external_reference": str(compra_id) if compra_id else None,
            "notification_url": f"https://{request.host}/webhook_mercadopago",
            "statement_descriptor": "BIG SHOP",
            "payment_methods": {"installments": 6}
        }

        preference = sdk.preference().create(preference_data)['response']
        logger.info(f"Preferência criada: {preference['id']}")
        return jsonify({
            "sucesso": True,
            "preference_id": preference['id'],
            "init_point": preference['init_point']
        }), 200
    except Exception as e:
        logger.error(f"Erro ao criar preferência: {e}")
        return jsonify({"erro": "Falha ao criar preferência"}), 500

@app.route('/webhook_mercadopago', methods=['POST'])
def webhook_mercadopago():
    try:
        dados = request.get_json()
        logger.info(f"Webhook MP recebido: {dados}")
        if dados.get('type') == 'payment':
            payment_id = dados['data']['id']
            payment = sdk.payment().get(payment_id)['response']
            if payment['status'] == 'approved' and payment.get('external_reference'):
                compra_id = payment['external_reference']
                with get_db_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute('''
                        UPDATE compras SET status = 'pago', pagamento_id = ?, pagamento_detalhes = ? WHERE id = ?
                    ''', (payment_id, json.dumps(payment), compra_id))
                    if cursor.rowcount > 0:
                        logger.info(f"Compra #{compra_id} marcada como paga via webhook")
        return jsonify({"status": "ok"}), 200
    except Exception as e:
        logger.error(f"Erro no webhook: {e}")
        return jsonify({"erro": str(e)}), 500

# =============================================================================
# ROTAS DE UTILIDADE
# =============================================================================

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "database": os.path.exists(DB_PATH)
    }), 200

@app.route('/stats', methods=['GET'])
def stats():
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            total_compras = cursor.execute("SELECT COUNT(*) FROM compras").fetchone()[0]
            total_carrinhos = cursor.execute("SELECT COUNT(*) FROM carrinhos").fetchone()[0]
            pendentes = cursor.execute("SELECT COUNT(*) FROM compras WHERE status='pagamento_pendente'").fetchone()[0]
            pagas = cursor.execute("SELECT COUNT(*) FROM compras WHERE status='pago'").fetchone()[0]
        return jsonify({
            "total_compras": total_compras,
            "total_carrinhos": total_carrinhos,
            "pedidos_pendentes": pendentes,
            "pedidos_pagos": pagas
        }), 200
    except Exception as e:
        logger.error(f"Erro em stats: {e}")
        return jsonify({"erro": str(e)}), 500

@app.route('/logs', methods=['GET'])
def ver_logs():
    try:
        with open('app.log', 'r') as f:
            lines = f.readlines()[-100:]
        return ''.join(lines), 200, {'Content-Type': 'text/plain'}
    except Exception as e:
        return str(e), 500

@app.route('/')
def home():
    return jsonify({
        "nome": "Big Shop API",
        "versao": "3.1.0",
        "status": "online",
        "endpoints": [
            "/health", "/stats", "/carrinho/salvar", "/carrinho/carregar/<senha>",
            "/finalizar_compra_facil", "/compras/buscar", "/admin/compras",
            "/admin/compras/<id>", "/admin/atualizar_status", "/admin/adicionar_observacao",
            "/verificar_senha", "/criar_preferencia", "/webhook_mercadopago", "/logs"
        ],
        "frontend": FRONTEND_URL
    }), 200

# =============================================================================
# TRATAMENTO DE ERROS GLOBAIS
# =============================================================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({"erro": "Recurso não encontrado"}), 404

@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({"erro": "Método não permitido"}), 405

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Erro interno: {error}")
    return jsonify({"erro": "Erro interno do servidor"}), 500

# =============================================================================
# PONTO DE ENTRADA
# =============================================================================

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_ENV") == "development"
    logger.info(f"Iniciando servidor na porta {port} (debug={debug})")
    app.run(host='0.0.0.0', port=port, debug=debug)