import { useState, useEffect } from "react";
import { TableColumnFilter } from "@/components/shared/TableColumnFilter";
import { Building2, AlertTriangle, FileWarning, CalendarClock, Download, Users, Files, FileX, ShieldX } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LabelList } from "recharts";
import { useDashboard } from "./hooks";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import * as XLSX from 'xlsx';

type ModalType = 'vencidos_certificados' | 'vencidos_alvaras' | 'ausentes_certificados' | 'ausentes_alvaras';

export function Dashboard() {
  const { data, isLoading } = useDashboard();
  const [modalAberto, setModalAberto] = useState<ModalType | null>(null);

  // Novos estados para filtro e ordenação das tabelas
  const [filtros, setFiltros] = useState<Record<string, string[]>>({});
  const [ordenacao, setOrdenacao] = useState<{coluna: string, direcao: 'asc' | 'desc'} | null>(null);

  // Limpa os filtros e impõe a ordenação padrão ao abrir modais de vencidos
  useEffect(() => {
    setFiltros({});
    if (modalAberto?.startsWith('vencidos')) {
      setOrdenacao({ coluna: 'validade', direcao: 'desc' });
    } else {
      setOrdenacao(null);
    }
  }, [modalAberto]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const exportarLista = () => {
    if (!modalAberto) return;


    let nomePlanilha = "";
    let dadosFormatados: any[] = [];

    // Alterado aqui: puxa a lista que já passou pelos filtros e ordenações da tela
    const itens = getItensFiltradosEOrdenados();

    if (modalAberto.startsWith('vencidos')) {
      const tipo = modalAberto.split('_')[1] as 'certificados' | 'alvaras';
      
      nomePlanilha = `${tipo}_vencidos`;
      dadosFormatados = itens.map(item => ({
        "Empresa / Titular": item.nome,
        "CNPJ / CPF": item.documento,
        "Tipo": item.tipo,
        ...(tipo === 'alvaras' ? { "Responsável": item.responsavel || "-" } : {}),
        "Validade": item.validade
      }));
    } else {
      const tipo = modalAberto.split('_')[1] as 'certificados' | 'alvaras';
      
      nomePlanilha = `empresas_sem_${tipo}`;
      dadosFormatados = itens.map(item => ({
        "Código": item.codigo,
        "Empresa": item.nome,
        "CNPJ": item.documento
      }));
    }

    if (dadosFormatados.length === 0) return;

    const worksheet = XLSX.utils.json_to_sheet(dadosFormatados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dados");
    
    XLSX.writeFile(workbook, `${nomePlanilha}.xlsx`);
  };

  const getTitulosModal = () => {
    switch (modalAberto) {
      case 'vencidos_certificados': return 'Certificados Vencidos';
      case 'vencidos_alvaras': return 'Alvarás Vencidos';
      case 'ausentes_certificados': return 'Empresas Sem Certificados e-CNPJs';
      case 'ausentes_alvaras': return 'Empresas Sem Alvarás';
      default: return '';
    }
  };

  const getItensModal = (): any[] => {
    if (!modalAberto) return [];
    if (modalAberto.startsWith('vencidos')) {
      const tipo = modalAberto.split('_')[1] as 'certificados' | 'alvaras';
      return data?.listas_vencidos?.[tipo] || [];
    } else {
      const tipo = modalAberto.split('_')[1] as 'certificados' | 'alvaras';
      return data?.listas_ausentes?.[tipo] || [];
    }
  };

  // Helper para converter data BR em timestamp para ordenação correta
  const parseDataBR = (dataStr: string) => {
    if (!dataStr) return 0;
    const [dia, mes, ano] = dataStr.split('/');
    return new Date(`${ano}-${mes}-${dia}`).getTime();
  };

  // Coleta as opções únicas para abastecer os checkbox dos filtros
  const getOpcoesColuna = (coluna: string) => {
    const itens = getItensModal();
    const valoresUnicos = Array.from(new Set(itens.map((item: any) => String(item[coluna] || '-'))));
    
    return valoresUnicos.sort((a, b) => {
      if (coluna === 'validade') {
        // Ignora valores vazios/nulos na conversão
        if (a === '-' || b === '-') return a === '-' ? 1 : -1;
        // Ordena cronologicamente (mais recente para o mais antigo)
        return parseDataBR(b) - parseDataBR(a); 
      }
      // Ordenação alfabética correta para os demais filtros
      return a.localeCompare(b); 
    });
  };
  // Aplica filtros ativos e a ordenação selecionada (ou padrão)
  const getItensFiltradosEOrdenados = () => {
    let itens = getItensModal();

    Object.entries(filtros).forEach(([coluna, valoresSelecionados]) => {
      if (valoresSelecionados.length > 0) {
        // Tipagem explícita (item: any) no filter
        itens = itens.filter((item: any) => valoresSelecionados.includes(String(item[coluna] || '-')));
      }
    });

    if (ordenacao) {
      // Tipagem explícita (a: any, b: any) no sort
      itens = [...itens].sort((a: any, b: any) => {
        let valA = a[ordenacao.coluna] || '';
        let valB = b[ordenacao.coluna] || '';

        if (ordenacao.coluna === 'validade') {
          valA = parseDataBR(valA);
          valB = parseDataBR(valB);
        } else {
          valA = String(valA).toLowerCase();
          valB = String(valB).toLowerCase();
        }

        if (valA < valB) return ordenacao.direcao === 'asc' ? -1 : 1;
        if (valA > valB) return ordenacao.direcao === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return itens;
  };

  // Ordena os itens de urgência da data mais recente para a mais antiga (decrescente)
  const urgentesOrdenados = [...(data?.urgentes || [])].sort((a, b) => {
    return parseDataBR(a.validade) - parseDataBR(b.validade);
  });

  return (
    <div className="p-6 max-w-full mx-auto space-y-6">
      
      {/* HEADER */}
      <div>
        <h1 className="text-xl font-bold text-primary">Dashboard | Alvarás e Certificados</h1>
        <p className="text-primary/40 text-xs font-medium">Informações restritas apenas a empresas ativas na base.</p>
      </div>

      {/* CARDS DE ALERTA - AGORA SÃO 5 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* 1. EMPRESAS ATIVAS */}
        <div className="bg-white p-5 rounded-xl border border-primary/20 shadow-sm flex flex-col justify-center gap-2">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-blue-50 text-brand rounded-lg"><Building2 size={20} /></div>
             <p className="text-[11px] font-bold text-primary/40 uppercase leading-tight">Empresas<br/>Ativas</p>
          </div>
          <h3 className="text-2xl font-black text-primary/80">{data?.cards?.empresas_ativas || 0}</h3>
        </div>

        {/* 2. SEM CERTIFICADOS */}
        <div 
          onClick={() => setModalAberto('ausentes_certificados')}
          className="bg-white p-5 rounded-xl border border-primary/20 shadow-sm flex flex-col justify-center gap-2 relative overflow-hidden cursor-pointer hover:bg-primary/5 transition-colors group"
        >
          <div className="flex items-center gap-3">
             <div className="p-2 bg-primary/10 text-primary/50 rounded-lg group-hover:scale-110 transition-transform"><ShieldX size={20} /></div>
             <p className="text-[11px] font-bold text-primary/40 uppercase leading-tight">Empresas Sem<br/> e-CNPJ</p>
          </div>
          <h3 className="text-2xl font-black text-primary/80">{data?.cards?.sem_certificado || 0}</h3>
        </div>

        {/* 3. SEM ALVARÁS */}
        <div 
          onClick={() => setModalAberto('ausentes_alvaras')}
          className="bg-white p-5 rounded-xl border border-primary/20 shadow-sm flex flex-col justify-center gap-2 relative overflow-hidden cursor-pointer hover:bg-primary/5 transition-colors group"
        >
          <div className="flex items-center gap-3">
             <div className="p-2 bg-primary/10 text-primary/50 rounded-lg group-hover:scale-110 transition-transform"><FileX size={20} /></div>
             <p className="text-[11px] font-bold text-primary/40 uppercase leading-tight">Empresas Sem<br/>Alvarás</p>
          </div>
          <h3 className="text-2xl font-black text-primary/80">{data?.cards?.sem_alvara || 0}</h3>
        </div>

        {/* 4. CERTIFICADOS VENCIDOS */}
        <div 
          onClick={() => setModalAberto('vencidos_certificados')}
          className="bg-white p-5 rounded-xl border border-red-200 shadow-sm flex flex-col justify-center gap-2 relative overflow-hidden cursor-pointer hover:bg-red-50/50 transition-colors group"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
          <div className="flex items-center gap-3">
             <div className="p-2 bg-red-50 text-red-600 rounded-lg group-hover:scale-110 transition-transform"><AlertTriangle size={20} /></div>
             <p className="text-[11px] font-bold text-primary/40 uppercase leading-tight">Certificados<br/>Vencidos</p>
          </div>
          <h3 className="text-2xl font-black text-red-600">{data?.cards?.certificados_vencidos || 0}</h3>
        </div>

        {/* 5. ALVARÁS VENCIDOS */}
        <div 
          onClick={() => setModalAberto('vencidos_alvaras')}
          className="bg-white p-5 rounded-xl border border-red-200 shadow-sm flex flex-col justify-center gap-2 relative overflow-hidden cursor-pointer hover:bg-orange-50/50 transition-colors group"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
          <div className="flex items-center gap-3">
             <div className="p-2 bg-red-50 text-red-600 rounded-lg group-hover:scale-110 transition-transform"><FileWarning size={20} /></div>
             <p className="text-[11px] font-bold text-primary/40 uppercase leading-tight">Alvarás<br/>Vencidos</p>
          </div>
          <h3 className="text-2xl font-black text-red-600">{data?.cards?.alvaras_vencidos || 0}</h3>
        </div>

      </div>

      {/* ÁREA CENTRAL: GRÁFICO E LISTA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GRÁFICO: PROJEÇÃO 6 MESES */}
        <div className="bg-white p-5 rounded-xl border border-primary/20 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-bold text-primary/80 mb-4 flex items-center gap-2">
            <CalendarClock size={18} className="text-red-600" />
            Projeção de Vencimentos (Próximos 6 meses)
          </h3>
          <div className="h-72 w-full mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.projecao} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="mes_label" tick={{ fontSize: 12 }} stroke="#9fa5a8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9fa5a8" />
                <Tooltip cursor={{ fill: '#f5f5f4' }} />
                <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                <Bar dataKey="certificados" name="Certificados" fill="#2f3f46" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="certificados" position="top" style={{ fill: '#2f3f46', fontSize: 11, fontWeight: 'bold' }} />
                </Bar>
                <Bar dataKey="alvaras" name="Alvarás" fill="#06486a" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="alvaras" position="top" style={{ fill: '#06486a', fontSize: 11, fontWeight: 'bold' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* LISTA: URGÊNCIAS COM SCROLL */}
        <div className="bg-white p-5 rounded-xl border border-primary/20 shadow-sm flex flex-col h-full">
          <h3 className="text-sm font-bold text-primary/80 mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />
            Próximos a Vencer ( 15 Dias )
          </h3>
          <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar max-h-72">
            {urgentesOrdenados.length === 0 ? (
              <p className="text-xs text-primary/40 text-center py-4">Nenhuma urgência identificada.</p>
            ) : (
              urgentesOrdenados.map((item, i) => (
                <div key={i} className="flex flex-col p-3 bg-primary/5 rounded-lg border border-primary/10">
                  <div className="flex justify-between items-start mb-1">
                    <span 
                      className="text-[10px] font-bold bg-white border border-primary/20 px-2 py-0.5 rounded text-primary/60 cursor-default"
                      title={item.tipo}
                    >
                      {item.tipo && item.tipo.length > 22 ? `${item.tipo.substring(0, 22)}...` : item.tipo}
                    </span>
                    <span className="text-[11px] font-black text-red-600">{item.validade}</span>
                  </div>
                  <p className="text-xs font-bold text-primary/80 truncate" title={item.nome}>
                    {item.nome}
                  </p>
                  {item.documento && (
                    <p className="text-[10px] font-bold text-primary/40 truncate mt-0.5">
                      {item.documento}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* RODAPÉ: METRICAS DE ALVARÁS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Alvarás por Responsável */}
        <div className="bg-white p-5 rounded-xl border border-primary/20 shadow-sm">
          <h3 className="text-sm font-bold text-primary/80 mb-4 flex items-center gap-2">
            <Users size={18} className="text-brand" />
            Total de Alvarás por Responsável
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {data?.alvaras_metricas?.por_responsavel?.map((resp, i) => (
              <div key={i} className="bg-primary/5 p-3 rounded-lg border border-primary/10 flex flex-col justify-center items-center text-center">
                <span className="text-xs font-bold text-primary/50 uppercase truncate w-full">{resp.nome || 'Não definido'}</span>
                <span className="text-xl font-black text-primary/80">{resp.quantidade}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alvarás por Tipo */}
        <div className="bg-white p-5 rounded-xl border border-primary/20 shadow-sm">
          <h3 className="text-sm font-bold text-primary/80 mb-4 flex items-center gap-2">
            <Files size={18} className="text-brand" />
            Total por Tipos de Alvarás
          </h3>
          <div className="overflow-y-auto max-h-[220px] custom-scrollbar border border-primary/10 rounded-lg">
            {data?.alvaras_metricas?.por_tipo?.map((tipo, i) => (
              <div 
                key={i} 
                className="flex justify-between items-center px-4 py-2.5 hover:bg-primary/10 transition-colors border-b border-primary/20 last:border-0 odd:bg-white even:bg-primary/5"
              >
                <span className="text-[10px] font-bold text-primary/70 truncate mr-2 uppercase" title={tipo.nome}>
                  {tipo.nome}
                </span>
                <span className="text-xs font-black bg-white border border-primary/20 text-primary/80 px-2 py-0.5 rounded shadow-sm">
                  {tipo.quantidade}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* MODAL UNIVERSAL PARA AS LISTAGENS */}
      <Dialog open={!!modalAberto} onOpenChange={(open) => !open && setModalAberto(null)}>
        <DialogContent className="max-w-4xl bg-white border-none shadow-2xl rounded-xl">
          <DialogHeader className="flex flex-row items-center justify-between pr-8">
            <DialogTitle className="text-lg font-bold text-primary">
              {getTitulosModal()}
            </DialogTitle>
            <button 
              onClick={exportarLista}
              className="flex items-center gap-2 bg-[#166534] hover:bg-[#14532d] text-white px-3 py-1.5 rounded-md font-bold text-xs transition-colors"
            >
              <Download size={14} /> Exportar Excel
            </button>
          </DialogHeader>
          
          <div className="overflow-y-auto custom-scrollbar max-h-[60vh] min-h-[350px]">
          <table className="w-full text-left text-sm">
            <thead className="bg-primary/5 sticky top-0 shadow-sm z-10">
              <tr>
                {modalAberto?.startsWith('vencidos') ? (
                    <>
                      <th className="px-4 py-3">
                        <TableColumnFilter title="Empresa / Titular" options={getOpcoesColuna('nome')} selectedValues={filtros['nome'] || []} onFilterChange={(vals) => setFiltros(prev => ({...prev, nome: vals}))} onSort={(dir) => setOrdenacao({ coluna: 'nome', direcao: dir })} currentSort={ordenacao?.coluna === 'nome' ? ordenacao.direcao : null} />
                      </th>
                      <th className="px-4 py-3">
                        <TableColumnFilter title="CNPJ / CPF" options={getOpcoesColuna('documento')} selectedValues={filtros['documento'] || []} onFilterChange={(vals) => setFiltros(prev => ({...prev, documento: vals}))} onSort={(dir) => setOrdenacao({ coluna: 'documento', direcao: dir })} currentSort={ordenacao?.coluna === 'documento' ? ordenacao.direcao : null} />
                      </th>
                      <th className="px-4 py-3">
                        <TableColumnFilter title="Tipo" options={getOpcoesColuna('tipo')} selectedValues={filtros['tipo'] || []} onFilterChange={(vals) => setFiltros(prev => ({...prev, tipo: vals}))} onSort={(dir) => setOrdenacao({ coluna: 'tipo', direcao: dir })} currentSort={ordenacao?.coluna === 'tipo' ? ordenacao.direcao : null} />
                      </th>
                      {modalAberto === 'vencidos_alvaras' && (
                        <th className="px-4 py-3">
                          <TableColumnFilter title="Responsável" options={getOpcoesColuna('responsavel')} selectedValues={filtros['responsavel'] || []} onFilterChange={(vals) => setFiltros(prev => ({...prev, responsavel: vals}))} onSort={(dir) => setOrdenacao({ coluna: 'responsavel', direcao: dir })} currentSort={ordenacao?.coluna === 'responsavel' ? ordenacao.direcao : null} />
                        </th>
                      )}
                      <th className="px-4 py-3">
                        <TableColumnFilter title="Validade" options={getOpcoesColuna('validade')} selectedValues={filtros['validade'] || []} onFilterChange={(vals) => setFiltros(prev => ({...prev, validade: vals}))} onSort={(dir) => setOrdenacao({ coluna: 'validade', direcao: dir })} currentSort={ordenacao?.coluna === 'validade' ? ordenacao.direcao : null} />
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 w-24">
                        <TableColumnFilter title="Código" options={getOpcoesColuna('codigo')} selectedValues={filtros['codigo'] || []} onFilterChange={(vals) => setFiltros(prev => ({...prev, codigo: vals}))} onSort={(dir) => setOrdenacao({ coluna: 'codigo', direcao: dir })} currentSort={ordenacao?.coluna === 'codigo' ? ordenacao.direcao : null} />
                      </th>
                      <th className="px-4 py-3">
                        <TableColumnFilter title="Empresa" options={getOpcoesColuna('nome')} selectedValues={filtros['nome'] || []} onFilterChange={(vals) => setFiltros(prev => ({...prev, nome: vals}))} onSort={(dir) => setOrdenacao({ coluna: 'nome', direcao: dir })} currentSort={ordenacao?.coluna === 'nome' ? ordenacao.direcao : null} />
                      </th>
                      <th className="px-4 py-3">
                        <TableColumnFilter title="CNPJ" options={getOpcoesColuna('documento')} selectedValues={filtros['documento'] || []} onFilterChange={(vals) => setFiltros(prev => ({...prev, documento: vals}))} onSort={(dir) => setOrdenacao({ coluna: 'documento', direcao: dir })} currentSort={ordenacao?.coluna === 'documento' ? ordenacao.direcao : null} />
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10 bg-white">
                {modalAberto && getItensFiltradosEOrdenados().map((item: any, idx) => (
                  <tr key={idx} className={`transition-colors ${modalAberto.startsWith('vencidos') ? 'hover:bg-red-50/50' : 'hover:bg-primary/5'}`}>
                    {modalAberto.startsWith('vencidos') ? (
                      <>
                        <td className="px-4 py-3 font-bold text-xs text-primary/80">{item.nome}</td>
                        <td className="px-4 py-3 text-xs text-primary/60 whitespace-nowrap">{item.documento || '-'}</td>
                        <td className="px-4 py-3 text-xs text-primary/60">{item.tipo}</td>
                        {modalAberto === 'vencidos_alvaras' && <td className="px-4 py-3 text-xs text-primary/60">{item.responsavel}</td>}
                        <td className="px-4 py-3 font-bold text-xs text-red-600 whitespace-nowrap">{item.validade}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-bold text-xs text-primary/50">{item.codigo}</td>
                        <td className="px-4 py-3 font-bold text-xs text-primary/80">{item.nome}</td>
                        <td className="px-4 py-3 text-xs text-primary/60 whitespace-nowrap">{item.documento || '-'}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
