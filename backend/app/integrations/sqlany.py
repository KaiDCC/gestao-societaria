import logging

import pyodbc
from flask import current_app


class DatabaseConnection:
    def __init__(self):
        self.host = current_app.config["DOMINIO_HOST"]
        self.port = current_app.config["DOMINIO_PORT"]
        self.dbname = current_app.config["DOMINIO_DB"]
        self.user = current_app.config["DOMINIO_USER"]
        self.password = current_app.config["DOMINIO_PASSWORD"]
        self.engine = current_app.config["DOMINIO_ENGINE"]
        self.driver = current_app.config["DOMINIO_ODBC_DRIVER"]


        self.conn_str = (
            f"DRIVER={self.driver};"
            f"UID={self.user};"
            f"PWD={self.password};"
            f"ENG={self.engine};"
            f"DBN={self.dbname};"
            f"LINKS=TCPIP(host={self.host}:{self.port});"
        )

        self.conn = None

    def connect(self):
        try:
            safe_conn_str = self.conn_str.replace(self.password, "********")
            logging.info(f"Tentando conectar ao Domínio via ODBC: {safe_conn_str}")

            self.conn = pyodbc.connect(self.conn_str)

            logging.info("Conexão bem-sucedida!")

        except pyodbc.Error as e:
            logging.error(f"Erro ao conectar ao banco de dados Domínio via ODBC: {e}")
            self.conn = None

    def close(self):
        if self.conn is not None:
            self.conn.close()
            logging.info("Conexão fechada.")

    def execute_query(self, query, params=None):
        if self.conn is None:
            logging.error("Conexão ao banco não estabelecida.")
            return None

        cursor = self.conn.cursor()

        try:
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)

            return cursor.fetchall()

        except pyodbc.Error as e:
            logging.error(f"Erro ao executar a consulta no Domínio: {e}")
            return None

        finally:
            cursor.close()
