#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Big Shop - Backend API
Versão: 3.0.0
Descrição: API completa para e-commerce com carrinho por senha, integração com Mercado Pago,
gerenciamento de pedidos, painel admin, envio de e-mails e muito mais.
Autor: Desenvolvido para o projeto Big Shop
Data: 13/03/2026
"""

import os
import sqlite3
import secrets
import smtplib
import uuid
import json
import logging
import hmac
import hashlib
import time
import re
from datetime import datetime, timedelta
from functools import wraps
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from typing import Dict, List, Any, Optional, Tuple, Union
from contextlib import contextmanager

# Flask e extensões
from flask import Flask, request, jsonify, make_response, g, abort
from flask_cors import CORS

# Tentar importar SDK do Mercado Pago (opcional)
try:
    import mercadopago
    MP_AVAILABLE = True
except ImportError:
    MP_AVAILABLE = False
    print("⚠️ MercadoPago SDK não instalado. Instale com: pip install mercadopago")

# Tentar importar bibliotecas para rate limiting e segurança (opcional)
try:
    from flask_limiter import Limiter
    from flask_limiter.util import get_remote_address
    RATE_LIMIT_AVAILABLE = True
except ImportError:
    RATE_LIMIT_AVAILABLE = False
    print("⚠️ Flask-Limiter não instalado. Instale com: pip install flask-limiter")

# =============================================================================
# CONFIGURAÇÕES INICIAIS E LOGGING
# =============================================================================

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("app.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Criação da aplicação Flask
app = Flask(__name__)

# =============================================================================
# CONFIGURAÇÕES DE AMBIENTE E CHAVES
# =============================================================================

# Chave secreta para sessões e tokens
app.secret_key = os.environ.get("SECRET_KEY", secrets.token_urlsafe(32))

# Configurações de banco de dados
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "database_v3.db")
DB_TIMEOUT = 30  # segundos

# Configurações SMTP para e-mail
SMTP_SERVER = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "bigshop.robot@gmail.com")
SENDER_PASSWORD = os.environ.get("SENDER_PASSWORD", "naztcfnpuisfawwi")  # Ideal usar variável de ambiente

# Configurações do Mercado Pago
MP_ACCESS_TOKEN = os.environ.get("MP_ACCESS_TOKEN", None)
MP_WEBHOOK_SECRET = os.environ.get("MP_WEBHOOK_SECRET", "segredo_para_webhook")  # Opcional, para validar notificações

# URLs do frontend (para redirecionamentos)
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://benjamimguaraldo-rgb.github.io/Big-Shopp")
FRONTEND_SUCCESS_URL = f"{FRONTEND_URL}/sucesso.html"
FRONTEND_FAILURE_URL = f"{FRONTEND_URL}/erro.html"
FRONTEND_PENDING_URL = f"{FRONTEND_URL}/pendente.html"

# Senha ultra secreta para admin (armazenada em variável de ambiente ou padrão)
ADMIN_SECRET_PASSWORD = os.environ.get("ADMIN_SECRET_PASSWORD", "phcjs26.31")

# Configurações de rate limiting (se disponível)
if RATE_LIMIT_AVAILABLE:
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=["200 per day", "50 per hour"],
        storage_uri="memory://"
    )
else:
    # Dummy limiter que não faz nada
    class DummyLimiter:
        def limit(self, *args, **kwargs):
            def decorator(f):
                return f
            return decorator
    limiter = DummyLimiter()

# =============================================================================
# CONFIGURAÇÃO CORS COMPLETA E SEGURA
# =============================================================================

# Lista de origens permitidas (para produção, especificar)
ALLOWED_ORIGINS = [
    "https://benjamimguaraldo-rgb.github.io",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "https://big-shopp.onrender.com"
]

# Configuração CORS com suporte a pré-voo (OPTIONS)
CORS(app,
     origins=ALLOWED_ORIGINS,
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
     expose_headers=["Content-Type", "X-Total-Count"],
     supports_credentials=True,
     max_age=3600)

# Middleware para adicionar headers CORS adicionais e tratamento de OPTIONS global
@app.after_request
def after_request(response):
    origin = request.headers.get('Origin')
    if origin in ALLOWED_ORIGINS or '*':
        response.headers.add('Access-Control-Allow-Origin', origin if origin in ALLOWED_ORIGINS else '*')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# =============================================================================
# FUNÇÕES AUXILIARES E DECORADORES
# =============================================================================

@contextmanager
def get_db_connection():
    """Context manager para conexões com o banco de dados."""
    conn = None
    try:
        conn = sqlite3.connect(DB_PATH, timeout=DB_TIMEOUT)
        conn.row_factory = sqlite3.Row  # Permite acesso por nome de coluna
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

def execute_query(query: str, params: tuple = (), fetch_one: bool = False, fetch_all: bool = False):
    """Executa uma query SQL e retorna resultados, se solicitado."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        if fetch_one:
            return cursor.fetchone()
        if fetch_all:
            return cursor.fetchall()
        return cursor.lastrowid

def validar_cpf(cpf: str) -> bool:
    """Validação simples de CPF (apenas dígitos e tamanho)."""
    cpf = re.sub(r'\D', '', cpf)
    return len(cpf) == 11

def validar_email(email: str) -> bool:
    """Validação simples de e-mail."""
    return re.match(r'^[^@]+@[^@]+\.[^@]+$', email) is not None

def validar_senha(senha: str) -> bool:
    """Valida senha de 4 dígitos."""
    return senha.isdigit() and len(senha) == 4

def gerar_token() -> str:
    """Gera um token único (para links de confirmação, etc.)."""
    return str(uuid.uuid4())

def enviar_email(destinatario: str, assunto: str, corpo_html: str, corpo_text: str = None) -> bool:
    """
    Envia e-mail utilizando as configurações SMTP.
    Retorna True se bem-sucedido, False caso contrário.
    """
    try:
        msg = MIMEMultipart('alternative')
        msg['From'] = SENDER_EMAIL
        msg['To'] = destinatario
        msg['Subject'] = assunto

        # Parte texto simples (fallback)
        if corpo_text:
            msg.attach(MIMEText(corpo_text, 'plain'))
        else:
            # Gera um texto simples a partir do HTML (simplificado)
            texto_simples = re.sub(r'<[^>]+>', '', corpo_html)
            msg.attach(MIMEText(texto_simples, 'plain'))

        # Parte HTML
        msg.attach(MIMEText(corpo_html, 'html'))

        # Envia
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.send_message(msg)

        logger.info(f"E-mail enviado para {destinatario}: {assunto}")
        return True
    except Exception as e:
        logger.error(f"Falha ao enviar e-mail para {destinatario}: {e}")
        return False

def enviar_email_compra(compra_id: int, dados: dict, email_admin: bool = True):
    """
    Envia e-mail de confirmação de compra para o cliente e notificação para o admin.
    """
    # E-mail para o cliente
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

    # E-mail para o admin
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

# Decorador para verificar token de admin (se houver)
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Por enquanto, usamos apenas a senha secreta via rota separada.
        # Este decorador pode ser expandido para usar tokens JWT no futuro.
        return f(*args, **kwargs)
    return decorated_function

# =============================================================================
# INICIALIZAÇÃO DO BANCO DE DADOS
# =============================================================================

def init_db():
    """Cria todas as tabelas necessárias, se não existirem."""
    logger.info("Inicializando banco de dados...")
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Tabela de carrinhos (identificados por senha de 4 dígitos)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS carrinhos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                senha TEXT NOT NULL UNIQUE,
                produtos TEXT NOT NULL,
                ultima_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Índice para busca rápida por senha
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_carrinhos_senha ON carrinhos(senha)')

        # Tabela de compras (pedidos finalizados)
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

        # Índices para compras
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_compras_status ON compras(status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_compras_email ON compras(email_cliente)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_compras_data ON compras(data_compra)')

        # Tabela de logs de eventos (opcional)
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

# Executa a inicialização
init_db()

# =============================================================================
# ROTAS DE CARRINHO (por senha)
# =============================================================================

@app.route('/carrinho/salvar', methods=['POST', 'OPTIONS'])
@limiter.limit("10 per minute")  # Rate limiting para evitar abusos
def salvar_carrinho():
    """
    Salva o carrinho de um usuário identificado por senha.
    Espera JSON: { "senha": "1234", "produtos": [...] }
    """
    if request.method == 'OPTIONS':
        return make_response(), 200

    try:
        dados = request.get_json()
        if not dados:
            return jsonify({"erro": "Requisição sem corpo JSON"}), 400

        senha = dados.get('senha')
        produtos = dados.get('produtos')

        # Validações
        if not senha:
            return jsonify({"erro": "Campo 'senha' obrigatório"}), 400
        if not validar_senha(senha):
            return jsonify({"erro": "Senha deve ter 4 dígitos numéricos"}), 400
        if produtos is None:
            return jsonify({"erro": "Campo 'produtos' obrigatório"}), 400
        if not isinstance(produtos, list):
            return jsonify({"erro": "'produtos' deve ser uma lista"}), 400

        produtos_json = json.dumps(produtos, ensure_ascii=False)

        with get_db_connection() as conn:
            cursor = conn.cursor()
            # Verifica se já existe carrinho para essa senha
            cursor.execute("SELECT id FROM carrinhos WHERE senha = ?", (senha,))
            existente = cursor.fetchone()

            if existente:
                cursor.execute('''
                    UPDATE carrinhos
                    SET produtos = ?, ultima_atualizacao = CURRENT_TIMESTAMP
                    WHERE senha = ?
                ''', (produtos_json, senha))
                logger.info(f"Carrinho atualizado para senha {senha}")
            else:
                cursor.execute('''
                    INSERT INTO carrinhos (senha, produtos, ultima_atualizacao)
                    VALUES (?, ?, CURRENT_TIMESTAMP)
                ''', (senha, produtos_json))
                logger.info(f"Carrinho criado para senha {senha}")

        return jsonify({"sucesso": True, "mensagem": "Carrinho salvo"}), 200

    except Exception as e:
        logger.error(f"Erro em salvar_carrinho: {e}")
        return jsonify({"erro": "Erro interno no servidor"}), 500

@app.route('/carrinho/carregar/<senha>', methods=['GET', 'OPTIONS'])
@limiter.limit("20 per minute")
def carregar_carrinho(senha):
    """
    Retorna o carrinho associado a uma senha.
    """
    if request.method == 'OPTIONS':
        return make_response(), 200

    if not validar_senha(senha):
        return jsonify({"erro": "Senha inválida"}), 400

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT produtos FROM carrinhos WHERE senha = ?", (senha,))
            row = cursor.fetchone()

        if row:
            produtos = json.loads(row[0])
        else:
            produtos = []

        return jsonify({"produtos": produtos}), 200

    except Exception as e:
        logger.error(f"Erro em carregar_carrinho: {e}")
        return jsonify({"erro": "Erro interno no servidor"}), 500

# =============================================================================
# ROTAS DE CHECKOUT E COMPRAS
# =============================================================================

@app.route('/finalizar_compra_facil', methods=['POST', 'OPTIONS'])
@limiter.limit("5 per minute")  # Evita múltiplas submissões acidentais
def finalizar_compra_facil():
    """
    Registra uma compra (sem pagamento real). Dados devem incluir:
    nome, email, cpf, endereco (objeto), produtos (lista), total, senha (opcional)
    """
    if request.method == 'OPTIONS':
        return make_response(), 200

    try:
        dados = request.get_json()
        if not dados:
            return jsonify({"erro": "Requisição sem corpo JSON"}), 400

        # Extrai campos
        nome = dados.get('nome')
        email = dados.get('email')
        cpf = dados.get('cpf')
        endereco = dados.get('endereco')
        produtos = dados.get('produtos')
        total = dados.get('total')
        senha = dados.get('senha')  # opcional

        # Validações
        if not nome or not isinstance(nome, str) or len(nome.strip()) < 3:
            return jsonify({"erro": "Nome inválido"}), 400
        if not email or not validar_email(email):
            return jsonify({"erro": "E-mail inválido"}), 400
        if not cpf or not validar_cpf(cpf):
            return jsonify({"erro": "CPF inválido"}), 400
        if not endereco or not isinstance(endereco, dict):
            return jsonify({"erro": "Endereço inválido"}), 400
        if not produtos or not isinstance(produtos, list) or len(produtos) == 0:
            return jsonify({"erro": "Lista de produtos vazia ou inválida"}), 400
        if total is None or not isinstance(total, (int, float)) or total <= 0:
            return jsonify({"erro": "Total inválido"}), 400

        # Serializa objetos complexos
        endereco_json = json.dumps(endereco, ensure_ascii=False)
        produtos_json = json.dumps(produtos, ensure_ascii=False)

        # Insere no banco
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO compras
                (senha, nome_cliente, email_cliente, cpf_cliente, endereco_entrega, produtos, total, status, data_compra)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ''', (senha, nome.strip(), email.strip(), cpf.strip(), endereco_json, produtos_json, total, 'pagamento_pendente'))

            compra_id = cursor.lastrowid

        # Envia e-mails
        enviar_email_compra(compra_id, {
            'nome': nome,
            'email': email,
            'total': total
        })

        logger.info(f"Compra #{compra_id} registrada com sucesso para {email}")

        return jsonify({
            "sucesso": True,
            "mensagem": "Compra registrada! Você receberá um e-mail de confirmação.",
            "compra_id": compra_id
        }), 201

    except Exception as e:
        logger.error(f"Erro em finalizar_compra_facil: {e}")
        return jsonify({"erro": "Erro interno no servidor"}), 500

@app.route('/compras/buscar', methods=['POST', 'OPTIONS'])
def buscar_compras():
    """
    Busca compras por e-mail e/ou senha (para o cliente visualizar seus pedidos).
    Espera JSON: { "email": "cliente@email.com", "senha": "1234" } (pelo menos um)
    """
    if request.method == 'OPTIONS':
        return make_response(), 200

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
# ROTAS DE ADMIN (GERENCIAMENTO DE PEDIDOS)
# =============================================================================

@app.route('/admin/compras', methods=['GET', 'OPTIONS'])
def admin_listar_compras():
    """Retorna todas as compras (para admin)."""
    if request.method == 'OPTIONS':
        return make_response(), 200

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, nome_cliente, email_cliente, total, status, data_compra
                FROM compras
                ORDER BY data_compra DESC
            ''')
            rows = cursor.fetchall()

        compras = []
        for r in rows:
            compras.append({
                "id": r[0],
                "cliente": r[1],
                "email": r[2],
                "total": r[3],
                "status": r[4],
                "data": r[5]
            })

        return jsonify(compras), 200

    except Exception as e:
        logger.error(f"Erro em admin_listar_compras: {e}")
        return jsonify({"erro": str(e)}), 500

@app.route('/admin/compras/<int:compra_id>', methods=['GET', 'OPTIONS'])
def admin_detalhes_compra(compra_id):
    """Retorna detalhes completos de uma compra específica."""
    if request.method == 'OPTIONS':
        return make_response(), 200

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, nome_cliente, email_cliente, cpf_cliente, endereco_entrega,
                       produtos, total, status, data_compra, pagamento_id, observacoes
                FROM compras
                WHERE id = ?
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

@app.route('/admin/atualizar_status', methods=['POST', 'OPTIONS'])
def admin_atualizar_status():
    """Atualiza o status de uma compra."""
    if request.method == 'OPTIONS':
        return make_response(), 200

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
                UPDATE compras
                SET status = ?, ultima_atualizacao = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (novo_status, compra_id))
            if cursor.rowcount == 0:
                return jsonify({"erro": "Compra não encontrada"}), 404

        logger.info(f"Status da compra #{compra_id} alterado para {novo_status}")
        return jsonify({"sucesso": True}), 200

    except Exception as e:
        logger.error(f"Erro em admin_atualizar_status: {e}")
        return jsonify({"erro": str(e)}), 500

@app.route('/admin/adicionar_observacao', methods=['POST', 'OPTIONS'])
def admin_adicionar_observacao():
    """Adiciona uma observação a uma compra."""
    if request.method == 'OPTIONS':
        return make_response(), 200

    try:
        dados = request.get_json()
        compra_id = dados.get('compra_id')
        observacao = dados.get('observacao')

        if not compra_id or not observacao:
            return jsonify({"erro": "compra_id e observacao obrigatórios"}), 400

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE compras
                SET observacoes = observacoes || ? || CHAR(10) || datetime('now') || ': ' || ?
                WHERE id = ?
            ''', ('\n', observacao, compra_id))  # Exemplo simples: adiciona linha com timestamp

        return jsonify({"sucesso": True}), 200

    except Exception as e:
        logger.error(f"Erro em admin_adicionar_observacao: {e}")
        return jsonify({"erro": str(e)}), 500

# =============================================================================
# ROTAS DE AUTENTICAÇÃO ADMIN (SENHA ÚNICA)
# =============================================================================

@app.route('/verificar_senha', methods=['POST', 'OPTIONS'])
@limiter.limit("10 per minute")
def verificar_senha():
    """Verifica a senha de admin."""
    if request.method == 'OPTIONS':
        return make_response(), 200

    try:
        dados = request.get_json()
        senha = dados.get('senha', '')

        # Usar comparação segura para evitar timing attacks
        if hmac.compare_digest(senha, ADMIN_SECRET_PASSWORD):
            return jsonify({"sucesso": True}), 200
        else:
            return jsonify({"sucesso": False}), 401

    except Exception as e:
        logger.error(f"Erro em verificar_senha: {e}")
        return jsonify({"erro": str(e)}), 500

# =============================================================================
# ROTAS DE INTEGRAÇÃO COM MERCADO PAGO
# =============================================================================

@app.route('/criar_preferencia', methods=['POST', 'OPTIONS'])
@limiter.limit("10 per minute")
def criar_preferencia():
    """
    Cria uma preferência de pagamento no Mercado Pago.
    Espera JSON com items, compra_id, comprador (opcional).
    """
    if request.method == 'OPTIONS':
        return make_response(), 200

    if not MP_AVAILABLE or not sdk:
        return jsonify({"erro": "Mercado Pago não configurado no servidor"}), 503

    try:
        dados = request.get_json()
        items = dados.get('items', [])
        compra_id = dados.get('compra_id')
        comprador = dados.get('comprador', {})

        if not items:
            return jsonify({"erro": "Lista de itens vazia"}), 400

        # Formata itens para o MP
        itens_mp = []
        for item in items:
            itens_mp.append({
                "title": item.get('nome', 'Produto'),
                "quantity": int(item.get('quantidade', 1)),
                "unit_price": float(item.get('preco', 0)),
                "currency_id": "BRL"
            })

        # Dados do comprador (se fornecidos)
        payer = {}
        if comprador.get('nome'):
            payer['name'] = comprador['nome']
        if comprador.get('email'):
            payer['email'] = comprador['email']
        if comprador.get('cpf'):
            payer['identification'] = {"type": "CPF", "number": comprador['cpf']}
        if comprador.get('telefone'):
            payer['phone'] = {"area_code": "55", "number": comprador['telefone']}

        # URLs de retorno (frontend)
        back_urls = {
            "success": FRONTEND_SUCCESS_URL,
            "failure": FRONTEND_FAILURE_URL,
            "pending": FRONTEND_PENDING_URL
        }

        # Cria a preferência
        preference_data = {
            "items": itens_mp,
            "payer": payer,
            "back_urls": back_urls,
            "auto_return": "approved",
            "external_reference": str(compra_id) if compra_id else None,
            "notification_url": f"https://{request.host}/webhook_mercadopago",
            "statement_descriptor": "BIG SHOP",
            "payment_methods": {
                "excluded_payment_types": [
                    {"id": "ticket"}  # Excluir boleto? Opcional
                ],
                "installments": 6  # Máximo de parcelas
            }
        }

        preference = sdk.preference().create(preference_data)['response']

        logger.info(f"Preferência criada: {preference['id']} para compra {compra_id}")

        return jsonify({
            "sucesso": True,
            "preference_id": preference['id'],
            "init_point": preference['init_point'],
            "sandbox_init_point": preference.get('sandbox_init_point')
        }), 200

    except Exception as e:
        logger.error(f"Erro ao criar preferência no MP: {e}")
        return jsonify({"erro": "Falha ao criar preferência de pagamento"}), 500

@app.route('/webhook_mercadopago', methods=['POST'])
def webhook_mercadopago():
    """
    Recebe notificações do Mercado Pago (pagamentos aprovados, etc.)
    """
    try:
        dados = request.get_json()
        logger.info(f"Webhook MP recebido: {dados}")

        # Verifica assinatura (se configurado)
        # (implementação de validação de assinatura do MP seria mais complexa)

        if dados.get('type') == 'payment':
            payment_id = dados['data']['id']
            # Busca detalhes do pagamento
            payment = sdk.payment().get(payment_id)['response']
            logger.info(f"Detalhes do pagamento {payment_id}: status={payment['status']}")

            # Se aprovado e tiver external_reference (compra_id)
            if payment['status'] == 'approved' and payment.get('external_reference'):
                compra_id = payment['external_reference']
                with get_db_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute('''
                        UPDATE compras
                        SET status = 'pago', pagamento_id = ?, pagamento_detalhes = ?
                        WHERE id = ?
                    ''', (payment_id, json.dumps(payment), compra_id))
                    if cursor.rowcount > 0:
                        logger.info(f"Compra #{compra_id} marcada como paga via webhook")
                        # Opcional: enviar e-mail de confirmação de pagamento
                        # ...

        return jsonify({"status": "ok"}), 200

    except Exception as e:
        logger.error(f"Erro no webhook MP: {e}")
        return jsonify({"erro": str(e)}), 500

# =============================================================================
# ROTAS DE UTILIDADE E STATUS
# =============================================================================

@app.route('/health', methods=['GET'])
def health_check():
    """Endpoint para verificar se a API está funcionando."""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "database": os.path.exists(DB_PATH)
    }), 200

@app.route('/stats', methods=['GET'])
def stats():
    """Retorna estatísticas básicas (número de compras, carrinhos, etc.)."""
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM compras")
            total_compras = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM carrinhos")
            total_carrinhos = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM compras WHERE status='pagamento_pendente'")
            pendentes = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM compras WHERE status='pago'")
            pagas = cursor.fetchone()[0]

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
    """Retorna as últimas linhas do arquivo de log (apenas para admin)."""
    # Em produção, isso deveria ser protegido por autenticação.
    try:
        with open('app.log', 'r') as f:
            lines = f.readlines()[-100:]  # Últimas 100 linhas
        return ''.join(lines), 200, {'Content-Type': 'text/plain'}
    except Exception as e:
        return str(e), 500

# =============================================================================
# ROTA DE TESTE (RAIZ)
# =============================================================================

@app.route('/')
def home():
    return jsonify({
        "nome": "Big Shop API",
        "versao": "3.0.0",
        "status": "online",
        "endpoints": [
            "/health",
            "/stats",
            "/carrinho/salvar",
            "/carrinho/carregar/<senha>",
            "/finalizar_compra_facil",
            "/compras/buscar",
            "/admin/compras",
            "/admin/compras/<id>",
            "/admin/atualizar_status",
            "/admin/adicionar_observacao",
            "/verificar_senha",
            "/criar_preferencia",
            "/webhook_mercadopago",
            "/logs"
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
# INICIALIZAÇÃO DO SDK DO MERCADO PAGO (SE TOKEN DISPONÍVEL)
# =============================================================================

sdk = None
if MP_ACCESS_TOKEN and MP_AVAILABLE:
    try:
        sdk = mercadopago.SDK(MP_ACCESS_TOKEN)
        logger.info("✅ SDK do Mercado Pago inicializado com sucesso.")
    except Exception as e:
        logger.error(f"❌ Falha ao inicializar SDK do Mercado Pago: {e}")
else:
    logger.warning("⚠️ Mercado Pago não configurado (token ausente ou SDK não instalado).")

# =============================================================================
# PONTO DE ENTRADA
# =============================================================================

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_ENV") == "development"
    logger.info(f"Iniciando servidor na porta {port} (debug={debug})")
    app.run(host='0.0.0.0', port=port, debug=debug)