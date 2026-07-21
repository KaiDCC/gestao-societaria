// src/features/apps/usuarios/index.tsx
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, UserPlus, ShieldAlert, Loader2, Users, ShieldCheck, Briefcase, Edit, Trash2 } from "lucide-react";

import { useUsuarios } from "./hooks";
import { AdicionarUsuarioModal } from "./components/AdicionarUsuarioModal";
import { EditarUsuarioModal } from "./components/EditarUsuarioModal";
import { ExcluirUsuarioModal } from "./components/ExcluirUsuarioModal";
import { TableColumnFilter } from "@/components/shared/TableColumnFilter";

export function UsuariosPage() {
  const { usuarios, isLoading, termoBusca, setTermoBusca, recarregar } = useUsuarios();

  const [isAdicionarModalOpen, setIsAdicionarModalOpen] = useState(false);
  const [usuarioParaEditar, setUsuarioParaEditar] = useState<any>(null);
  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState<any>(null);

  // Estados dos Filtros das Colunas
  const [nomeFiltros, setNomeFiltros] = useState<string[]>([]);
  const [situacaoFiltros, setSituacaoFiltros] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  // Opções únicas para os dropdowns de filtro
  const nomesUnicos = useMemo(() => {
    return Array.from(new Set(usuarios.map(u => u.nome))).sort();
  }, [usuarios]);
  
  const situacoesUnicas = ["Em Uso", "Não Utilizado"];

  // Filtragem e Ordenação Principal
  const usuariosFiltrados = useMemo(() => {
    let filtrados = [...usuarios];

    // 1. Busca Global (Input superior)
    if (termoBusca) {
      const t = termoBusca.toLowerCase();
      filtrados = filtrados.filter(u => 
        u.nome?.toLowerCase().includes(t) || 
        u.email?.toLowerCase().includes(t)
      );
    }

    // 2. Filtro de Coluna: Nome
    if (nomeFiltros.length > 0) {
      filtrados = filtrados.filter(u => nomeFiltros.includes(u.nome));
    }

    // 3. Filtro de Coluna: Situação
    if (situacaoFiltros.length > 0) {
      filtrados = filtrados.filter(u => {
        const sit = u.em_uso_alvara ? "Em Uso" : "Não Utilizado";
        return situacaoFiltros.includes(sit);
      });
    }

    // 4. Ordenação
    if (sortConfig) {
      filtrados.sort((a, b) => {
        if (sortConfig.key === 'nome') {
          return sortConfig.direction === 'asc' 
            ? String(a.nome).localeCompare(String(b.nome))
            : String(b.nome).localeCompare(String(a.nome));
        }
        if (sortConfig.key === 'situacao') {
          // Coloca os "Em Uso" juntos e "Não Utilizados" juntos
          const valA = a.em_uso_alvara ? 1 : 0;
          const valB = b.em_uso_alvara ? 1 : 0;
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }
        return 0;
      });
    }

    return filtrados;
  }, [usuarios, termoBusca, nomeFiltros, situacaoFiltros, sortConfig]);

  // Estatísticas para os Cards de Resumo
  const stats = useMemo(() => ({
    total: usuarios.length,
    admins: usuarios.filter(u => u.is_admin).length,
    emUso: usuarios.filter(u => u.em_uso_alvara).length
  }), [usuarios]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-primary">Gerenciar Usuários</h1>
        <p className="text-primary/40 text-xs font-medium">Controle de acessos e responsáveis por alvarás</p>
      </div>

      {/* CARDS DE RESUMO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm bg-white rounded-xl">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Users size={24} /></div>
            <div>
              <p className="text-[10px] font-bold text-primary/40 uppercase tracking-tight">Total de Usuários</p>
              <p className="text-2xl font-bold text-primary/80">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm bg-white rounded-xl">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><ShieldAlert size={24} /></div>
            <div>
              <p className="text-[10px] font-bold text-primary/40 uppercase tracking-tight">Administradores</p>
              <p className="text-2xl font-bold text-primary/80">{stats.admins}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-xl">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><Briefcase size={24} /></div>
            <div>
              <p className="text-[10px] font-bold text-primary/40 uppercase tracking-tight">Responsáveis em Uso</p>
              <p className="text-2xl font-bold text-primary/80">{stats.emUso}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* BARRA DE BUSCA E AÇÃO */}
      <div className="bg-white rounded-xl shadow-sm border border-primary/10 flex flex-col md:flex-row justify-between items-center gap-4 p-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/40 h-4 w-4" />
          <Input 
            placeholder="Buscar por nome ou email..." 
            className="pl-9 h-10 text-sm bg-primary/5 focus:border-brand border-primary/20" 
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
          />
        </div>
        
        <Button 
          className="bg-brand rounded-lg hover:bg-brand-hover text-white font-bold w-full md:w-auto" 
          onClick={() => setIsAdicionarModalOpen(true)}
        >
          <UserPlus size={16} className="mr-2" /> Adicionar Usuário
        </Button>
      </div>

      {/* TABELA DE USUÁRIOS */}
      <Card className="border-none shadow-sm bg-white rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20">
              <Loader2 className="h-8 w-8 animate-spin text-brand mb-4" />
              <span className="text-primary/50 font-medium text-sm">Carregando usuários...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="w-full text-left text-sm whitespace-nowrap">
                <TableHeader className="bg-primary/5">
                  <TableRow className="border-b border-primary/10">
                    
                    {/* COLUNA USUÁRIO COM FILTRO */}
                    <TableHead className="py-4 pl-4 align-middle">
                      <TableColumnFilter 
                        title="Usuário"
                        options={nomesUnicos}
                        selectedValues={nomeFiltros}
                        onFilterChange={setNomeFiltros}
                        onSort={(dir) => setSortConfig({ key: 'nome', direction: dir })}
                        currentSort={sortConfig?.key === 'nome' ? sortConfig.direction : null}
                      />
                    </TableHead>

                    <TableHead className="font-bold text-primary text-[13px] uppercase tracking-tight align-middle">Permissões</TableHead>
                    
                    {/* COLUNA SITUAÇÃO COM FILTRO */}
                    <TableHead className="align-middle">
                      <TableColumnFilter 
                        title="Situação nos Alvarás"
                        options={situacoesUnicas}
                        selectedValues={situacaoFiltros}
                        onFilterChange={setSituacaoFiltros}
                        onSort={(dir) => setSortConfig({ key: 'situacao', direction: dir })}
                        currentSort={sortConfig?.key === 'situacao' ? sortConfig.direction : null}
                      />
                    </TableHead>

                    <TableHead className="font-bold text-primary text-[13px] uppercase tracking-tight text-right pr-4 align-middle">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuariosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-primary/50">
                        Nenhum resultado encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    usuariosFiltrados.map((u) => (
                      <TableRow key={u.id} className="hover:bg-primary/5 transition-colors border-b border-primary/5 last:border-0">
                        <TableCell className="pl-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-primary/80">{u.nome}</span>
                            <span className="text-xs text-primary/50">{u.email}</span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[250px]">
                            {u.is_admin ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight bg-purple-100 text-purple-800 border border-purple-200">Admin Total</span>
                            ) : (
                              <>
                                {u.can_add && <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight bg-blue-50 text-blue-700 border border-blue-200">Add</span>}
                                {u.can_edit && <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight bg-emerald-50 text-emerald-700 border border-emerald-200">Edit</span>}
                                {u.can_delete && <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight bg-red-50 text-red-700 border border-red-200">Excluir</span>}
                                {u.can_export && <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight bg-stone-100 text-stone-700 border border-stone-200">Export</span>}
                              </>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {u.em_uso_alvara ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 w-fit">
                                <ShieldCheck size={12} /> Responsável em Uso
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-primary/40 bg-primary/10 px-2 py-0.5 rounded border border-primary/20 w-fit">
                                Não Utilizado
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-right pr-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              size="sm" variant="outline" 
                              className="h-8 w-8 p-0 border-primary/20 text-primary/70 hover:border-brand hover:bg-brand/10"
                              onClick={() => setUsuarioParaEditar(u)}
                            >
                              <Edit size={14} />
                            </Button>
                            <Button 
                              size="sm" variant="outline" 
                              className="h-8 w-8 p-0 border-primary/20 text-red-600 hover:bg-red-50 hover:border-red-200"
                              onClick={() => setUsuarioParaExcluir(u)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* COMPONENTES MODAIS */}
      <AdicionarUsuarioModal 
        isOpen={isAdicionarModalOpen} 
        onClose={() => setIsAdicionarModalOpen(false)} 
        onSuccess={recarregar} 
      />
      
      <EditarUsuarioModal 
        isOpen={!!usuarioParaEditar} 
        onClose={() => setUsuarioParaEditar(null)} 
        onSuccess={recarregar} 
        usuarioOriginal={usuarioParaEditar} 
      />

      <ExcluirUsuarioModal 
        isOpen={!!usuarioParaExcluir} 
        onClose={() => setUsuarioParaExcluir(null)} 
        onSuccess={recarregar} 
        usuario={usuarioParaExcluir} 
      />
    </div>
  );
}
