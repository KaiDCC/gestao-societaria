import { api } from "@/lib/api";
import { useState, useEffect } from "react";
import { useEmpresaContrato } from "../hooks";
import { contratosApi } from "../services/contratosApi";
import { toast } from "sonner";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Download, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, X, Info } from "lucide-react";

import { DatePickerFree } from "@/components/shared/date-picker-free";

const Req = () => <span className="text-red-500 ml-1" title="Campo obrigatório">*</span>;

const MESES = [
  { valor: '01', rotulo: 'Jan' }, { valor: '02', rotulo: 'Fev' }, { valor: '03', rotulo: 'Mar' },
  { valor: '04', rotulo: 'Abr' }, { valor: '05', rotulo: 'Mai' }, { valor: '06', rotulo: 'Jun' },
  { valor: '07', rotulo: 'Jul' }, { valor: '08', rotulo: 'Ago' }, { valor: '09', rotulo: 'Set' },
  { valor: '10', rotulo: 'Out' }, { valor: '11', rotulo: 'Nov' }, { valor: '12', rotulo: 'Dez' },
];

function MesesSelector({ selected, onChange, disabled }: { selected: string[], onChange: (val: string[]) => void, disabled?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());

  const toggleMonth = (mes: string) => {
    const item = `${mes}/${year}`;
    if (selected.includes(item)) {
      onChange(selected.filter(m => m !== item));
    } else {
      const newSelected = [...selected, item];
      // Ordena cronologicamente: MM/YYYY
      newSelected.sort((a, b) => {
        const [mA, yA] = a.split('/');
        const [mB, yB] = b.split('/');
        if (yA !== yB) return Number(yA) - Number(yB);
        return Number(mA) - Number(mB);
      });
      onChange(newSelected);
    }
  };

  const removeMonth = (item: string) => {
    onChange(selected.filter(m => m !== item));
  };

  return (
    <div className={`min-h-9 border border-primary/20 rounded-md shadow-sm flex flex-wrap items-center p-1 bg-white focus-within:border-brand focus-within:ring-1 focus-within:ring-primary/20 transition-all ${disabled ? 'opacity-50 pointer-events-none bg-primary/10' : ''}`}>
      {selected.map(m => (
        <span key={m} className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 m-0.5 rounded border border-primary/20 flex items-center gap-1 cursor-pointer hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors" onClick={() => removeMonth(m)}>
          {m}
          <X size={12} className="text-primary/40" />
        </span>
      ))}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button type="button" className="text-primary/40 text-[13px] font-bold px-2 py-1 bg-transparent flex-1 text-left outline-none min-w-[140px]">
            {selected.length === 0 ? "Ex: Selecionar meses..." : "Adicionar mais..."}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 rounded-xl shadow-xl border-primary/20" align="start">
          <div className="flex items-center justify-between mb-3">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-primary/50 hover:text-primary" onClick={() => setYear(y => y - 1)}>
              <ChevronLeft size={16} />
            </Button>
            <span className="font-bold text-primary text-sm">{year}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-primary/50 hover:text-primary" onClick={() => setYear(y => y + 1)}>
              <ChevronRight size={16} />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {MESES.map(m => {
              const item = `${m.valor}/${year}`;
              const isSelected = selected.includes(item);
              return (
                <Button
                  key={m.valor}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  className={`h-8 text-xs font-bold transition-all ${isSelected ? 'bg-brand text-primary hover:bg-brand-hover border-brand' : 'bg-white text-primary/60 hover:bg-primary/10 hover:text-primary'}`}
                  onClick={() => toggleMonth(m.valor)}
                >
                  {m.rotulo}
                </Button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function DistratoForm() {
  const [empresaContratada, setEmpresaContratada] = useState("");
  const [codigoBusca, setCodigoBusca] = useState("");
  const { empresa, loading: loadingEmpresa, buscarEmpresa } = useEmpresaContrato();

  const [razaoSocial, setRazaoSocial] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [socio, setSocio] = useState("");
  const [cpfSocio, setCpfSocio] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [uf, setUf] = useState("");
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [cep, setCep] = useState("");
  const [tipoEndereco, setTipoEndereco] = useState("");
  const [complemento, setComplemento] = useState("");

  const [assessorias, setAssessorias] = useState<any[]>([]);

  useEffect(() => {
    contratosApi.listarAssessorias().then(res => {
      if(res.success) setAssessorias(res.empresas);
    }).catch(() => {
      toast.error("Erro ao carregar a lista de assessorias.");
    });
  }, []);

  const [contratoCriadoId, setContratoCriadoId] = useState<number | null>(null);

  useEffect(() => {
    if (empresa) {
      setRazaoSocial(empresa.razao_social || "");
      setCnpj(empresa.cnpj || "");
      setSocio(empresa.socio_administrador || "");
      setCpfSocio(empresa.cpf_socio || "");
      setMunicipio(empresa.municipio || "");
      setUf(empresa.uf || "");
      setRua(empresa.rua || "");
      setNumero(empresa.numero || "");
      setBairro(empresa.bairro || "");
      setCep(empresa.cep || "");
      setTipoEndereco(empresa.tipo_endereco || "");
      setComplemento(empresa.complemento || "");
    }
  }, [empresa]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const [isInverso, setIsInverso] = useState(false);
  const [isInadimplencia, setIsInadimplencia] = useState(false);
  const [encerramentoObrigacoes, setEncerramentoObrigacoes] = useState<Date | undefined>();
  const [dataAssinatura, setDataAssinatura] = useState<Date | undefined>(new Date());
  const [valorInadimplencia, setValorInadimplencia] = useState("");
  
  // Agora o estado é um array de strings!
  const [mesesPendentes, setMesesPendentes] = useState<string[]>([]);

  const handleCodigoBuscaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCodigoBusca(e.target.value.replace(/\D/g, ''));
  };

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9.,]/g, '').replace('.', ',');
    const parts = val.split(',');
    if (parts.length > 2) val = parts[0] + ',' + parts.slice(1).join('');
    setValorInadimplencia(val);
  };

  const handleValorBlur = () => {
    if (!valorInadimplencia) return;
    let val = valorInadimplencia;
    if (!val.includes(',')) val += ',00';
    else {
      const [inteiro, decimal] = val.split(',');
      if (!decimal) val = inteiro + ',00';
      else if (decimal.length === 1) val = inteiro + ',' + decimal + '0';
      else if (decimal.length > 2) val = inteiro + ',' + decimal.substring(0, 2);
    }
    setValorInadimplencia(val);
  };

  const isBaseValid = !!(
    empresaContratada &&
    codigoBusca.trim() &&
    razaoSocial.trim() &&
    cnpj.trim() &&
    socio.trim() &&
    cpfSocio.trim() &&
    municipio.trim() &&
    uf.trim() &&
    rua.trim() &&
    numero.trim() &&
    bairro.trim() &&
    cep.trim() &&
    encerramentoObrigacoes &&
    dataAssinatura
  );

  // Validação agora checa se o array tem pelo menos 1 item
  const isInadimplenciaValid = isInadimplencia ? !!(valorInadimplencia.trim() && mesesPendentes.length > 0) : true;
  const isFormValid = isBaseValid && isInadimplenciaValid;

  const handleGerarContrato = async () => {
    if (!isFormValid) {
      return toast.error("Preencha todos os campos obrigatórios.");
    }

    setIsSubmitting(true);
    try {
      const encerramentoStr = format(encerramentoObrigacoes!, "yyyy-MM-dd");
      const assinaturaStr = format(dataAssinatura!, "yyyy-MM-dd");
      
      const payload: any = {
        tipo_contrato: isInadimplencia ? "distrato_inadimplencia" : "distrato",
        codigo_empresa: codigoBusca,
        empresa_contratada: empresaContratada,
        dados_formulario: {
          distratante_inverso: isInverso,
          razao_social: razaoSocial,
          cnpj, 
          socio_administrador: socio, 
          cpf_socio: cpfSocio,
          municipio, 
          uf, 
          rua, 
          numero, 
          bairro, 
          cep,
          tipo_endereco: tipoEndereco,
          complemento: complemento,
          encerramento_obrigacoes: encerramentoStr,
          data_assinatura: assinaturaStr,
        }
      };

      if (isInadimplencia) {
        payload.dados_formulario.valor_inadimplencia = Number(valorInadimplencia.replace(',', '.'));
        payload.dados_formulario.meses_pendentes = mesesPendentes; // Enviando o array pro back
      }

      const response = await contratosApi.criarContrato(payload);
      if (response.success) {
        setContratoCriadoId(response.contrato.id);
        toast.success("Distrato gerado no banco! Agora você pode baixar o arquivo.");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erro ao gerar contrato.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async (formato: 'docx' | 'pdf') => {
    if (!contratoCriadoId) return;
    
    setIsDownloading(true);
    try {
      const response = formato === 'docx' 
        ? await contratosApi.gerarDocx(contratoCriadoId) 
        : await contratosApi.gerarPdf(contratoCriadoId);
      
      if (response.success) {
        const urlRelativa = formato === 'docx' ? response.arquivo_docx_url : response.arquivo_pdf_url;
        
        const fileResponse = await api.get(urlRelativa, { responseType: 'blob' });
        
        const urlBlob = window.URL.createObjectURL(new Blob([fileResponse.data]));
        const link = document.createElement('a');
        link.href = urlBlob;
        
        const fileName = urlRelativa.split('/').pop() || `distrato.${formato}`;
        link.setAttribute('download', fileName); 
        
        document.body.appendChild(link);
        link.click();
        
        link.remove();
        window.URL.revokeObjectURL(urlBlob);
        
        toast.success("Download iniciado. Limpando formulário...");
        
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      toast.error("Falha ao baixar arquivo.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card className="border-none shadow-lg bg-white rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-primary font-bold">Novo Contrato de Distrato</CardTitle>
        <CardDescription className="text-primary/50">Configure os detalhes do encerramento de prestação de serviços.</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-8 pt-4">

        {/* EMPRESA CONTRATADA */}
        <div className="flex flex-wrap items-end gap-6 pb-4 border-b border-primary/10">
          <div className="space-y-1 w-full max-w-md">
            <Label>Empresa (Assessoria) <Req /></Label>
            <Select value={empresaContratada} onValueChange={setEmpresaContratada} disabled={!!contratoCriadoId || assessorias.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={assessorias.length === 0 ? "Carregando..." : "Selecione a Assessoria..."} />
              </SelectTrigger>
              <SelectContent className="rounded-md border-primary/20 shadow-xl bg-white">
                {assessorias.map((assessoria) => (
                  <SelectItem key={assessoria.slug} value={assessoria.slug}>
                    {assessoria.razao_social}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className={`flex items-center gap-2.5 text-[14px] font-bold text-primary}`}>
            <div className="relative inline-flex items-center">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={isInverso} 
                onChange={(e) => {
                  setIsInverso(e.target.checked);
                  if (e.target.checked) setIsInadimplencia(false);
                }}
                disabled={!!contratoCriadoId}
              />
              <div className="w-9 h-5 bg-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-primary/30 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-sm"></div>
            </div>
            <span className="flex items-center gap-1.5 text-primary">
              Distrato de PS
              <span title="Quando ligado, deixa a empresa assessoria como Distratante e o cliente como Distratado.">
                <Info 
                  size={16} 
                  className="text-primary/40 hover:text-primary transition-colors" 
                />
              </span>
            </span>
          </label>
        </div>
        
        {/* BUSCA */}
        <div className="space-y-4">
          <div className="flex items-end gap-3 max-w-sm">
            <div className="flex-1">
              <Label>Cód. Empresa (Cliente)<Req /></Label>
              <Input 
                value={codigoBusca}
                onChange={handleCodigoBuscaChange}
                placeholder="Ex: 123" 
                disabled={!!contratoCriadoId}
                onKeyDown={(e) => e.key === 'Enter' && buscarEmpresa(codigoBusca)}
              />
            </div>
            <Button 
              className="bg-primary text-white hover:bg-foreground h-9 px-6 rounded-md font-bold transition-all"
              onClick={() => buscarEmpresa(codigoBusca)}
              disabled={loadingEmpresa || !!contratoCriadoId || !codigoBusca.trim()}
            >
              {loadingEmpresa ? <Loader2 className="h-4 w-4 animate-spin" /> : "BUSCAR"}
            </Button>
          </div>

          {/* DADOS DA EMPRESA */}
          <div className="space-y-4 p-5 bg-primary/5 border border-primary/20 rounded-lg shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1"><Label>Razão Social<Req /></Label><Input value={razaoSocial} readOnly={!!contratoCriadoId} onChange={(e) => setRazaoSocial(e.target.value)} /></div>
              <div className="space-y-1"><Label>CNPJ<Req /></Label><Input value={cnpj} readOnly={!!contratoCriadoId} onChange={(e) => setCnpj(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1"><Label>Sócio Administrador<Req /></Label><Input value={socio} readOnly={!!contratoCriadoId} onChange={(e) => setSocio(e.target.value)} /></div>
              <div className="space-y-1"><Label>CPF Sócio<Req /></Label><Input value={cpfSocio} readOnly={!!contratoCriadoId} onChange={(e) => setCpfSocio(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1"><Label>Município<Req /></Label><Input value={municipio} readOnly={!!contratoCriadoId} onChange={(e) => setMunicipio(e.target.value)} /></div>
              <div className="space-y-1"><Label>UF<Req /></Label><Input value={uf} readOnly={!!contratoCriadoId} onChange={(e) => setUf(e.target.value)} /></div>
              <div className="space-y-1"><Label>Bairro<Req /></Label><Input value={bairro} readOnly={!!contratoCriadoId} onChange={(e) => setBairro(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1"><Label>CEP<Req /></Label><Input value={cep} readOnly={!!contratoCriadoId} onChange={(e) => setCep(e.target.value)} /></div>
              <div className="space-y-1"><Label>Tipo Endereço</Label><Input value={tipoEndereco} readOnly={!!contratoCriadoId} onChange={(e) => setTipoEndereco(e.target.value)} placeholder="Ex: Rua" /></div>
              <div className="space-y-1 md:col-span-2"><Label>Logradouro<Req /></Label><Input value={rua} readOnly={!!contratoCriadoId} onChange={(e) => setRua(e.target.value)} /></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1"><Label>Número<Req /></Label><Input value={numero} readOnly={!!contratoCriadoId} onChange={(e) => setNumero(e.target.value)} /></div>
              <div className="space-y-1 md:col-span-2"><Label>Complemento</Label><Input value={complemento} readOnly={!!contratoCriadoId} onChange={(e) => setComplemento(e.target.value)} placeholder="Ex: Sala 1, Bloco B" /></div>
            </div>
          </div>
        </div>

        {/* INFORMAÇÕES DO DISTRATO */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-l-4 border-brand pl-2">
            <h3 className="text-sm font-bold text-primary">Informações do Distrato</h3>
            
            <label 
              title={isInverso ? "Opção inativa quando 'Distrato de PS' está ativado." : ""}
              className={`flex items-center gap-1.5 text-[13px] whitespace-nowrap font-bold select-none px-2.5 py-1 rounded-md border-2 transition-all duration-300 ${
                isInadimplencia 
                  ? 'bg-brand/15 text-primary border-brand' 
                  : 'bg-white text-primary border-primary/40'
              } ${
                (!!contratoCriadoId || isInverso) 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'cursor-pointer hover:bg-primary/10'
              }`}
            >
              <input 
                type="checkbox" 
                className="w-3.5 h-3.5 m-0 p-0 accent-primary rounded cursor-pointer outline-none focus:ring-0 focus:ring-offset-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 shadow-none disabled:cursor-not-allowed" 
                checked={isInadimplencia} 
                onChange={(e) => setIsInadimplencia(e.target.checked)}
                disabled={!!contratoCriadoId || isInverso}
              />
              Distrato por Inadimplência
            </label>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <Label>Encerramento das Obrigações<Req /></Label>
              <DatePickerFree disabled={!!contratoCriadoId} selectedDate={encerramentoObrigacoes} onDateChange={setEncerramentoObrigacoes} /> 
            </div>
            
            <div className="space-y-1">
              <Label>Data de Assinatura<Req /></Label>
              <DatePickerFree disabled={!!contratoCriadoId} selectedDate={dataAssinatura} onDateChange={setDataAssinatura} /> 
            </div>
          </div>

          {isInadimplencia && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in zoom-in duration-300">
              <div className="space-y-1">
                <Label>Valor da Inadimplência<Req /></Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-bold text-primary/40 z-10 pointer-events-none">R$</span>
                  <Input 
                    className="pl-12 !important font-bold text-primary border-primary/30 focus:border-brand focus:ring-primary/20"
                    value={valorInadimplencia} 
                    disabled={!!contratoCriadoId}
                    onChange={handleValorChange}
                    onBlur={handleValorBlur} 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Meses Pendentes<Req /></Label>

                <MesesSelector 
                  selected={mesesPendentes} 
                  onChange={setMesesPendentes} 
                  disabled={!!contratoCriadoId} 
                />
              </div>
            </div>
          )}
          
          {isInadimplencia && (
             <div className="flex items-center gap-2 text-sm text-primary bg-brand/10 p-3 rounded-md border border-brand/30 animate-in fade-in">
               <AlertCircle size={16} className="text-brand" />
               <span>Atenção: O distrato será gerado com cláusulas adicionais de confissão de dívida.</span>
             </div>
          )}
        </div>

        {/* AÇÕES */}
        <div className="pt-6 flex justify-end gap-3">
          {!contratoCriadoId ? (
            <div title={!isFormValid ? "Preencha todos os campos obrigatórios (*)" : ""}>
              <Button 
                className="bg-brand text-white hover:bg-brand-hover font-bold px-10 h-9 rounded-md shadow-md active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleGerarContrato}
                disabled={!isFormValid || isSubmitting}
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "GERAR CONTRATO"}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-primary/10 p-2 rounded-lg border border-primary/20 animate-in fade-in zoom-in duration-300">
              <span className="text-sm font-bold text-primary/60 px-2">Distrato Pronto:</span>
              <Button 
                variant="outline"
                className="bg-white border-primary/30 hover:bg-primary/5 h-9 gap-2 font-bold"
                onClick={() => handleDownload('docx')}
                disabled={isDownloading}
              >
                {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} className="text-blue-600" />} DOCX
              </Button>
             {/*} <Button 
                variant="outline"
                className="bg-white border-primary/30 hover:bg-primary/5 h-9 gap-2 font-bold"
                onClick={() => handleDownload('pdf')}
                disabled={isDownloading}
              >
                {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} className="text-red-600" />} PDF
              </Button>*/}
              <Button 
                variant="ghost" 
                className="h-9 gap-2 text-primary/50 font-bold" 
                onClick={() => window.location.reload()}
              >
                <RefreshCw size={16} /> Novo
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
