import logging
from datetime import datetime

from app import db
from app.integrations.sqlany import DatabaseConnection
from app.models import Empresa


def criar_conexao_dominio():
    db_conn = DatabaseConnection()
    db_conn.connect()

    return db_conn


def sync_empresas_from_external_db():
    db_conn = criar_conexao_dominio()

    if not db_conn.conn:
        logging.error("Não foi possível conectar ao banco de dados externo para sincronização de empresas.")
        return

    query_sync = """
SELECT
apel_emp,
nome_emp,
cgce_emp,
LEFT(cgce_emp, 8) AS cnpj_base,
ijuc_emp,
dcad_emp,
stat_emp,
cida_emp,
esta_emp,
iest_emp,
imun_emp,
njud_emp,
codi_emp
FROM bethadba.geempre
WHERE codi_emp < 4000
"""

    empresas = db_conn.execute_query(query_sync)
    db_conn.close()

    if not empresas:
        logging.info("Nenhuma empresa encontrada para sincronização.")
        return

    for e in empresas:
        (
            apel_emp,
            nome_emp,
            cnpj,
            cnpj_base,
            ijuc_emp,
            dcad_emp,
            stat_emp,
            cida_emp,
            esta_emp,
            iest_emp,
            imun_emp,
            njud_emp,
            codi_emp
        ) = e

        if dcad_emp:
            try:
                if isinstance(dcad_emp, str):
                    dcad_emp = datetime.strptime(dcad_emp, "%Y-%m-%d").date()
            except ValueError as ve:
                logging.error(f"Erro ao converter data: {ve}")
                dcad_emp = None

        empresa_local = Empresa.query.filter_by(
            codigo_empresa=str(codi_emp)
        ).first()

        if empresa_local:
            atualizou = False

            campos = {
                "apel_emp": apel_emp,
                "nome_emp": nome_emp,
                "cnpj": cnpj,
                "cnpj_base": cnpj_base,
                "ijuc_emp": ijuc_emp,
                "dcad_emp": dcad_emp,
                "stat_emp": stat_emp,
                "cida_emp": cida_emp,
                "esta_emp": esta_emp,
                "iest_emp": iest_emp,
                "imun_emp": imun_emp,
                "njud_emp": njud_emp
            }

            for campo, valor in campos.items():
                if getattr(empresa_local, campo) != valor:
                    setattr(empresa_local, campo, valor)
                    atualizou = True

            if atualizou:
                logging.info(f"Empresa {codi_emp} atualizada.")

        else:
            nova_empresa = Empresa(
                codigo_empresa=str(codi_emp),
                apel_emp=apel_emp,
                nome_emp=nome_emp,
                cnpj=cnpj,
                cnpj_base=cnpj_base,
                ijuc_emp=ijuc_emp,
                dcad_emp=dcad_emp,
                stat_emp=stat_emp,
                cida_emp=cida_emp,
                esta_emp=esta_emp,
                iest_emp=iest_emp,
                imun_emp=imun_emp,
                njud_emp=njud_emp
            )

            db.session.add(nova_empresa)
            logging.info(f"Empresa {codi_emp} adicionada.")

    try:
        db.session.commit()
        logging.info("Sincronização de empresas concluída com sucesso.")

    except Exception as e:
        db.session.rollback()
        logging.error(f"Erro ao sincronizar empresas: {e}")


def buscar_dados_empresa(codigo_empresa):
    empresa = Empresa.query.filter_by(
        codigo_empresa=codigo_empresa
    ).first()

    if empresa:
        return empresa.to_dict()

    return None


def buscar_codi_emp_por_cpf(cpf):
    db_conn = criar_conexao_dominio()

    if not db_conn.conn:
        logging.error("Não foi possível conectar ao banco de dados externo para buscar CPF.")
        return []

    cpf_digits = "".join(filter(str.isdigit, cpf))

    query_socio = """
SELECT i_socio, inscricao
FROM bethadba.gesocios
WHERE inscricao = ?
"""

    socio_result = db_conn.execute_query(query_socio, (cpf_digits,))

    if not socio_result:
        db_conn.close()
        return []

    i_socio = socio_result[0][0]

    query_quadros = """
SELECT codi_emp
FROM bethadba.gequadrosocietario_socios
WHERE i_socio = ?
"""

    quadros_result = db_conn.execute_query(query_quadros, (i_socio,))
    db_conn.close()

    if not quadros_result:
        return []

    codi_emps = [
        str(row[0])
        for row in quadros_result
    ]

    return list(set(codi_emps))
