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
import { Loader2, Download, RefreshCw } from "lucide-react";

import { DatePickerFree } from "@/components/shared/date-picker-free";

const Req = () => <span className="text-red-500 ml-1" title="Campo obrigatório">*</span>;

export function AdesaoForm() {
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
  
  const [vigencia, setVigencia] = useState<Date | undefined>();
  const [tributacao, setTributacao] = useState("");
  const [apuracao, setApuracao] = useState("");
  const [periodicidade, setPeriodicidade] = useState("");
  const [honorario, setHonorario] = useState("");

  const handleCodigoBuscaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ''); 
    setCodigoBusca(val);
  };

  const handleHonorarioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9.,]/g, '').replace('.', ',');
    const parts = val.split(',');
    if (parts.length > 2) val = parts[0] + ',' + parts.slice(1).join('');
    setHonorario(val);
  };

  const handleHonorarioBlur = () => {
    if (!honorario) return;
    let val = honorario;
    if (!val.includes(',')) val += ',00';
    else {
      const [inteiro, decimal] = val.split(',');
      if (!decimal) val = inteiro + ',00';
      else if (decimal.length === 1) val = inteiro + ',' + decimal + '0';
      else if (decimal.length > 2) val = inteiro + ',' + decimal.substring(0, 2);
    }
    setHonorario(val);
  };

  const isFormValid = !!(
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
    vigencia &&
    honorario.trim() &&
    tributacao &&
    apuracao &&
    periodicidade
  );

  const handleGerarContrato = async () => {
    if (!isFormValid) {
      return toast.error("Preencha todos os campos obrigatórios.");
    }

    setIsSubmitting(true);
    try {
      const vigenciaStr = format(vigencia, "yyyy-MM-dd");
      const honorarioNumerico = Number(honorario.replace(',', '.'));

      const payload = {
        tipo_contrato: "adesao" as const,
        codigo_empresa: codigoBusca,
        empresa_contratada: empresaContratada,
        dados_formulario: {
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
          vigencia: vigenciaStr,
          regime_tributacao: tributacao, 
          regime_apuracao: apuracao,
          periodicidade_demonstrativos: periodicidade, 
          honorario_mensal: honorarioNumerico,
        }
      };

      const response = await contratosApi.criarContrato(payload);
      if (response.success) {
        setContratoCriadoId(response.contrato.id);
        toast.success("Contrato gerado no banco! Agora você pode baixar o arquivo.");
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
        
        const fileName = urlRelativa.split('/').pop() || `contrato.${formato}`;
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
        <CardTitle className="text-lg text-primary font-bold">Novo Contrato de Adesão</CardTitle>
        <CardDescription className="text-primary/60">Configure os detalhes do documento abaixo.</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-8 pt-4">

        {/* EMPRESA CONTRATADA */}
        <div className="space-y-1 max-w-md pb-4 border-b border-primary/10">
          <Label>Empresa Contratada (Assessoria) <Req /></Label>
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
        
        {/* BUSCA */}
        <div className="space-y-4">
          <div className="flex items-end gap-3 max-w-sm">
            <div className="flex-1">
              <Label>Cód. Empresa (CONTRATANTE)<Req /></Label>
              <Input 
                value={codigoBusca}
                onChange={handleCodigoBuscaChange}
                placeholder="Ex: 123" 
                disabled={!!contratoCriadoId}
                onKeyDown={(e) => e.key === 'Enter' && buscarEmpresa(codigoBusca)}
              />
            </div>
            <Button 
              className="bg-brand text-white hover:bg-brand-hover h-9 px-6 rounded-md font-bold transition-all"
              onClick={() => buscarEmpresa(codigoBusca)}
              disabled={loadingEmpresa || !!contratoCriadoId || !codigoBusca.trim()}
            >
              {loadingEmpresa ? <Loader2 className="h-4 w-4 animate-spin" /> : "BUSCAR"}
            </Button>
          </div>

          {/* DADOS DA EMPRESA */}
          <div className="space-y-4 p-5 bg-primary/5 border border-primary/20 rounded-lg shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Razão Social<Req /></Label>
                <Input value={razaoSocial} readOnly={!!contratoCriadoId} onChange={(e) => setRazaoSocial(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>CNPJ<Req /></Label>
                <Input value={cnpj} readOnly={!!contratoCriadoId} onChange={(e) => setCnpj(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Sócio Administrador<Req /></Label>
                <Input value={socio} readOnly={!!contratoCriadoId} onChange={(e) => setSocio(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>CPF Sócio<Req /></Label>
                <Input value={cpfSocio} readOnly={!!contratoCriadoId} onChange={(e) => setCpfSocio(e.target.value)} />
              </div>
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

        {/* INFORMAÇÕES DO CONTRATO */}
        <div className="space-y-6">
          <h3 className="text-sm font-bold text-primary border-l-4 border-brand pl-2">Informações do Contrato</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <Label>Vigência<Req /></Label>
              <DatePickerFree disabled={!!contratoCriadoId} selectedDate={vigencia} onDateChange={setVigencia} /> 
            </div>

            <div className="space-y-1">
              <Label>Honorário Mensal<Req /></Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-bold text-primary/40 z-10 pointer-events-none">R$</span>
                <Input 
                  className="pl-12 !important font-bold text-primary"
                  value={honorario} 
                  disabled={!!contratoCriadoId}
                  onChange={handleHonorarioChange}
                  onBlur={handleHonorarioBlur} 
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <Label>Regime de Tributação<Req /></Label>
              <Select value={tributacao} onValueChange={setTributacao} disabled={!!contratoCriadoId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent className="rounded-md border-primary/20 shadow-xl">
                  <SelectItem value="SIMPLES NACIONAL">Simples Nacional</SelectItem>
                  <SelectItem value="PRESUMIDO">Lucro Presumido</SelectItem>
                  <SelectItem value="REAL">Lucro Real</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Regime de Apuração<Req /></Label>
              <Select value={apuracao} onValueChange={setApuracao} disabled={!!contratoCriadoId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent className="rounded-md border-primary/20 shadow-xl">
                  <SelectItem value="COMPETÊNCIA">Competência</SelectItem>
                  <SelectItem value="CAIXA">Caixa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Periodicidade Cláusula 1.1.4<Req /></Label>
              <Select value={periodicidade} onValueChange={setPeriodicidade} disabled={!!contratoCriadoId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent className="rounded-md border-primary/20 shadow-xl">
                  <SelectItem value="ANUAL">Anual</SelectItem>
                  <SelectItem value="TRIMESTRAL">Trimestral</SelectItem>
                  <SelectItem value="MENSAL">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* AÇÕES DE GERAÇÃO E DOWNLOAD */}
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
            <div className="flex items-center gap-3 bg-primary/20 p-2 rounded-lg border border-primary/20 animate-in fade-in zoom-in duration-300">
              <span className="text-sm font-bold text-primary/60 px-2">Contrato Pronto:</span>
              <Button 
                variant="outline"
                className="bg-white border-primary/30 hover:bg-primary/10 h-9 gap-2 font-bold"
                onClick={() => handleDownload('docx')}
                disabled={isDownloading}
              >
                {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} className="text-blue-600" />} DOCX
              </Button>
              {/*<Button 
                variant="outline"
                className="bg-white border-primary/30 hover:bg-primary/10 h-9 gap-2 font-bold"
                onClick={() => handleDownload('pdf')}
                disabled={isDownloading}
              >
                {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} className="text-red-600" />} PDF
              </Button> */}
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
