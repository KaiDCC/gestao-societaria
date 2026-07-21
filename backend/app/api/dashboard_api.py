import logging
from datetime import datetime, timedelta

from flask import Blueprint, jsonify
from flask_login import login_required
from sqlalchemy import func

from app import db
from app.models import Empresa, Certificado, CertificadoEcpf, Alvara, Responsavel

dashboard_api = Blueprint(
    "dashboard_api",
    __name__,
    url_prefix="/api/dashboard"
)


@dashboard_api.route("/resumo", methods=["GET"])
@login_required
def resumo_dashboard_api():
    try:
        hoje = datetime.now().date()

        # apenas empresas ativas
        empresas_ativas = Empresa.query.filter_by(stat_emp='A').count()
        empresas_ativas_lista = Empresa.query.filter_by(stat_emp='A').all()

        # certificados e alvaras vencidos
        certs_query = Certificado.query.join(Empresa).filter(Empresa.stat_emp == 'A', Certificado.validade < hoje)
        ecpfs_query = CertificadoEcpf.query.outerjoin(Empresa).filter(
            db.or_(Empresa.stat_emp == 'A', CertificadoEcpf.empresa_id == None), CertificadoEcpf.validade < hoje)
        alvaras_query = Alvara.query.join(Empresa).filter(Empresa.stat_emp == 'A', Alvara.validade < hoje)

        certificados_vencidos_count = certs_query.count() + ecpfs_query.count()
        alvaras_vencidos_count = alvaras_query.count()

        lista_certs_vencidos = [
            {"tipo": "e-CNPJ", "nome": c.razao_social, "documento": c.cnpj, "validade": c.validade.strftime("%d/%m/%Y")}
            for c in certs_query.all()]

        lista_certs_vencidos += [
            {"tipo": "e-CPF", "nome": e.nome_pessoa, "documento": e.cpf, "validade": e.validade.strftime("%d/%m/%Y")}
            for e in ecpfs_query.all()]

        lista_alvaras_vencidos = [
            {
                "tipo": a.tipo,
                "nome": a.empresa.nome_emp,
                "documento": a.empresa.cnpj,
                "responsavel": a.responsavel_rel.nome if a.responsavel_rel else a.responsavel,
                "validade": a.validade.strftime("%d/%m/%Y")
            } for a in alvaras_query.all()]

        # alvaras e certificados proximos a vencer
        data_limite_15_dias = hoje + timedelta(days=15)
        urgentes = []

        for c in Certificado.query.join(Empresa).filter(
                Empresa.stat_emp == 'A',
                Certificado.validade >= hoje,
                Certificado.validade <= data_limite_15_dias
        ).all():
            urgentes.append({"tipo": "e-CNPJ", "nome": c.razao_social, "documento": c.cnpj, "validade": c.validade})

        for e in CertificadoEcpf.query.outerjoin(Empresa).filter(
                db.or_(Empresa.stat_emp == 'A', CertificadoEcpf.empresa_id == None),
                CertificadoEcpf.validade >= hoje,
                CertificadoEcpf.validade <= data_limite_15_dias
        ).all():
            urgentes.append({"tipo": "e-CPF", "nome": e.nome_pessoa, "documento": e.cpf, "validade": e.validade})

        for a in Alvara.query.join(Empresa).filter(
                Empresa.stat_emp == 'A',
                Alvara.validade >= hoje,
                Alvara.validade <= data_limite_15_dias
        ).all():
            urgentes.append(
                {"tipo": a.tipo, "nome": a.empresa.nome_emp, "documento": a.empresa.cnpj, "validade": a.validade})

        urgentes = sorted(urgentes, key=lambda x: x["validade"])
        for item in urgentes:
            item["validade"] = item["validade"].strftime("%d/%m/%Y")

        # Gráfico vencimentos de 6 meses
        projecao = []
        for i in range(6):
            mes_base = hoje.replace(day=1)
            m = (mes_base.month + i - 1) % 12 + 1
            y = mes_base.year + (mes_base.month + i - 1) // 12
            projecao.append({"mes_label": f"{m:02d}/{y}", "mes": m, "ano": y, "certificados": 0, "alvaras": 0})

        data_limite_projecao = hoje + timedelta(days=200)

        for c in Certificado.query.join(Empresa).filter(Empresa.stat_emp == 'A',
                                                        Certificado.validade.between(hoje, data_limite_projecao)).all():
            for p in projecao:
                if c.validade.month == p["mes"] and c.validade.year == p["ano"]: p["certificados"] += 1

        for e in CertificadoEcpf.query.outerjoin(Empresa).filter(
                db.or_(Empresa.stat_emp == 'A', CertificadoEcpf.empresa_id == None),
                CertificadoEcpf.validade.between(hoje, data_limite_projecao)).all():
            for p in projecao:
                if e.validade.month == p["mes"] and e.validade.year == p["ano"]: p["certificados"] += 1

        for a in Alvara.query.join(Empresa).filter(Empresa.stat_emp == 'A',
                                                   Alvara.validade.between(hoje, data_limite_projecao)).all():
            for p in projecao:
                if a.validade.month == p["mes"] and a.validade.year == p["ano"]: p["alvaras"] += 1

        # total alvárs por tipo e total por responsável
        alvaras_tipo = db.session.query(Alvara.tipo, func.count(Alvara.id)).join(Empresa).filter(
            Empresa.stat_emp == 'A').group_by(Alvara.tipo).order_by(func.count(Alvara.id).desc()).all()
        alvaras_responsavel = db.session.query(
            func.coalesce(Responsavel.nome, Alvara.responsavel), 
            func.count(Alvara.id)
        ).join(Empresa, Alvara.empresa_id == Empresa.id) \
         .outerjoin(Responsavel, Alvara.responsavel_id == Responsavel.id) \
         .filter(Empresa.stat_emp == 'A') \
         .group_by(func.coalesce(Responsavel.nome, Alvara.responsavel)) \
         .order_by(func.count(Alvara.id).desc()).all()

        # empresas sem alvara e sem e-CNPJ (OBS: Não considerei e-CPF porque ia ficar muito ambiguo por ser vinculado a cpf e o mesmo certificado ser de mais de uma empresa e no banco fica como "todos")

        # pega id das empresas que tem alvaras
        tuplas_alvara = db.session.query(Alvara.empresa_id).distinct().all()
        ids_com_alvara = {t[0] for t in tuplas_alvara if t[0] is not None}

        # pega id das empresas que tem e-cnpj
        tuplas_ecnpj = db.session.query(Certificado.empresa_id).distinct().all()
        ids_com_ecnpj = {t[0] for t in tuplas_ecnpj if t[0] is not None}

        lista_sem_alvara = []
        lista_sem_certificado = []

        # compara com as empresas ativas e vê o que sobra
        for emp in empresas_ativas_lista:
            if emp.id not in ids_com_alvara:
                lista_sem_alvara.append({"nome": emp.nome_emp, "documento": emp.cnpj, "codigo": emp.codigo_empresa})

            if emp.id not in ids_com_ecnpj:
                lista_sem_certificado.append(
                    {"nome": emp.nome_emp, "documento": emp.cnpj, "codigo": emp.codigo_empresa})

        return jsonify({
            "success": True,
            "cards": {
                "empresas_ativas": empresas_ativas,
                "certificados_vencidos": certificados_vencidos_count,
                "alvaras_vencidos": alvaras_vencidos_count,
                "sem_alvara": len(lista_sem_alvara),
                "sem_certificado": len(lista_sem_certificado)
            },
            "urgentes": urgentes,
            "projecao": projecao,
            "listas_vencidos": {
                "certificados": lista_certs_vencidos,
                "alvaras": lista_alvaras_vencidos
            },
            "listas_ausentes": {
                "certificados": lista_sem_certificado,
                "alvaras": lista_sem_alvara
            },
            "alvaras_metricas": {
                "por_tipo": [{"nome": t[0], "quantidade": t[1]} for t in alvaras_tipo],
                "por_responsavel": [{"nome": r[0], "quantidade": r[1]} for r in alvaras_responsavel]
            }
        })

    except Exception as e:
        logging.error(f"Erro ao carregar dashboard via API: {e}")
        return jsonify({
            "success": False,
            "message": f"Erro interno ao carregar dashboard: {e}"
        }), 500