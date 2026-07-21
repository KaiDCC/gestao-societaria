import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { contratosApi } from "../services/contratosApi";
import { Building2, Search, Loader2 } from "lucide-react";

const maskCNPJ = (value: string) => value.replace(/\D/g, "").replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2").substring(0, 18);
const maskCPF = (value: string) => value.replace(/\D/g, "").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1-$2").substring(0, 14);
const maskCEP = (value: string) => value.replace(/\D/g, "").replace(/(\d{5})(\d)/, "$1-$2").substring(0, 9);

const maskCRC = (value: string) => {
  let v = value.toUpperCase().replace(/[^A-Z0-9]/g, ""); 
  
  let uf = v.substring(0, 2).replace(/[^A-Z]/g, ""); // 2 primeiros maiusculo
  let numbers = v.substring(uf.length, uf.length + 6).replace(/[^0-9]/g, ""); // 6 numeros
  let letter = v.substring(uf.length + numbers.length, uf.length + numbers.length + 1).replace(/[^OP]/g, ""); // P ou O
  let digit = v.substring(uf.length + numbers.length + letter.length, uf.length + numbers.length + letter.length + 1).replace(/[^0-9]/g, ""); // 1 numero

  let res = uf;
  if (v.length > 2) res += " " + numbers;
  if (numbers.length === 6 && v.length > 8) res += "/" + letter;
  if (letter.length === 1 && v.length > 9) res += "-" + digit;
  
  return res;
};

const UFS_VALIDAS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

export function ModalAssessoria({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loadingCNPJ, setLoadingCNPJ] = useState(false);
  
  const [formData, setFormData] = useState({
    razao_social: "", cnpj: "", cidade: "", uf: "",
    logradouro: "", numero: "", bairro: "", cep: "",
    email: "", crc_empresa: "", 
    representante_nome: "", representante_cpf: "", representante_crc: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof typeof formData, maskFn?: (v: string) => string) => {
    let value = e.target.value;
    if (maskFn) value = maskFn(value);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const buscarDadosCNPJ = async () => {
    const cnpjNumeros = formData.cnpj.replace(/\D/g, "");
    if (cnpjNumeros.length !== 14) {
      toast.error("Digite um CNPJ completo para buscar.");
      return;
    }

    setLoadingCNPJ(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjNumeros}`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      
      setFormData(prev => ({
        ...prev,
        razao_social: data.razao_social || data.nome_fantasia || "",
        cep: maskCEP(data.cep ? String(data.cep) : ""),
        logradouro: data.logradouro || "",
        numero: data.numero || "",
        bairro: data.bairro || "",
        cidade: data.municipio || "",
        uf: data.uf || ""
      }));
      toast.success("Dados da empresa preenchidos! Você pode editá-los se precisar.");
    } catch (e) {
      toast.error("Erro ao buscar CNPJ. Verifique o número e tente novamente.");
    } finally {
      setLoadingCNPJ(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.razao_social || !formData.cnpj || !formData.cidade || !formData.uf || !formData.logradouro || !formData.numero || !formData.bairro || !formData.cep || !formData.email || !formData.crc_empresa || !formData.representante_nome || !formData.representante_cpf || !formData.representante_crc) {
      return toast.error("Preencha todos os campos obrigatórios (*).");
    }

    if (formData.cnpj.replace(/\D/g, "").length !== 14) return toast.error("O CNPJ deve conter 14 dígitos.");
    if (formData.representante_cpf.replace(/\D/g, "").length !== 11) return toast.error("O CPF deve conter 11 dígitos.");
    if (!formData.email.includes("@")) return toast.error("Por favor, insira um e-mail válido.");
    if (!UFS_VALIDAS.includes(formData.uf.toUpperCase())) return toast.error("UF da empresa inválida.");
    
    if (formData.crc_empresa.length < 2 || !UFS_VALIDAS.includes(formData.crc_empresa.substring(0, 2).toUpperCase())) return toast.error("A UF informada no CRC da Empresa não é válida.");
    if (formData.representante_crc.length < 2 || !UFS_VALIDAS.includes(formData.representante_crc.substring(0, 2).toUpperCase())) return toast.error("A UF informada no CRC do Representante não é válida.");

    try {
      await contratosApi.criarAssessoria(formData);
      toast.success("Assessoria cadastrada com sucesso!");
      setOpen(false);
      setFormData({
        razao_social: "", cnpj: "", cidade: "", uf: "", logradouro: "", numero: "", 
        bairro: "", cep: "", email: "", crc_empresa: "", 
        representante_nome: "", representante_cpf: "", representante_crc: ""
      });
      onCreated();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Erro ao cadastrar assessoria.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-9 gap-2 text-xs text-brand font-bold bg-white">
          <Building2 size={14} /> Nova Assessoria
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-white text-primary">
        <DialogHeader>
          <DialogTitle>Cadastrar Nova Empresa Contratada</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4 max-h-[70vh] overflow-y-auto px-1">
          
          <div className="col-span-2 font-bold text-sm text-primary/60 border-b pb-1 mt-2">Dados da Empresa</div>
          
          <div className="space-y-1">
            <Label>CNPJ *</Label>
            <div className="flex gap-2">
              <Input value={formData.cnpj} onChange={e => handleChange(e, 'cnpj', maskCNPJ)} placeholder="00.000.000/0000-00" />
              <Button variant="outline" onClick={buscarDadosCNPJ} disabled={loadingCNPJ} className="px-3">
                {loadingCNPJ ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <div className="space-y-1"><Label>Razão Social *</Label><Input value={formData.razao_social} onChange={e => handleChange(e, 'razao_social')} className="uppercase"/></div>
          <div className="space-y-1"><Label>E-mail *</Label><Input type="email" value={formData.email} onChange={e => handleChange(e, 'email')} className="lowercase"/></div>
          <div className="space-y-1"><Label>CRC da Empresa *</Label><Input value={formData.crc_empresa} onChange={e => handleChange(e, 'crc_empresa', maskCRC)} placeholder="UF 000000/O-0" className="uppercase"/></div>
          
          <div className="col-span-2 font-bold text-sm text-primary/60 border-b pb-1 mt-2">Endereço</div>
          
          <div className="space-y-1"><Label>CEP *</Label><Input value={formData.cep} onChange={e => handleChange(e, 'cep', maskCEP)} placeholder="00000-000" /></div>
          <div className="space-y-1"><Label>Logradouro *</Label><Input value={formData.logradouro} onChange={e => handleChange(e, 'logradouro')} className="capitalize" /></div>
          <div className="space-y-1"><Label>Número *</Label><Input value={formData.numero} onChange={e => handleChange(e, 'numero')} placeholder="S/N ou Número" /></div>
          <div className="space-y-1"><Label>Bairro *</Label><Input value={formData.bairro} onChange={e => handleChange(e, 'bairro')} className="capitalize" /></div>
          <div className="space-y-1"><Label>Cidade *</Label><Input value={formData.cidade} onChange={e => handleChange(e, 'cidade')} className="capitalize" /></div>
          <div className="space-y-1"><Label>UF *</Label><Input maxLength={2} value={formData.uf} onChange={e => handleChange(e, 'uf')} className="uppercase" /></div>

          <div className="col-span-2 font-bold text-sm text-primary/60 border-b pb-1 mt-2">Representante Legal</div>
          
          <div className="space-y-1"><Label>Nome do Representante *</Label><Input value={formData.representante_nome} onChange={e => handleChange(e, 'representante_nome')} className="uppercase"/></div>
          <div className="space-y-1"><Label>CPF *</Label><Input value={formData.representante_cpf} onChange={e => handleChange(e, 'representante_cpf', maskCPF)} placeholder="000.000.000-00" /></div>
          <div className="space-y-1"><Label>CRC do Representante *</Label><Input value={formData.representante_crc} onChange={e => handleChange(e, 'representante_crc', maskCRC)} placeholder="UF 000000/O-0" className="uppercase"/></div>
          
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button 
            className="bg-brand text-white hover:bg-brand-hover" 
            onClick={handleSubmit}
          >
            Salvar Empresa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}