import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { contratosApi } from "../services/contratosApi";
import { List, Edit, ArrowLeft, Loader2 } from "lucide-react";

const maskCNPJ = (value: string) => value.replace(/\D/g, "").replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2").substring(0, 18);
const maskCPF = (value: string) => value.replace(/\D/g, "").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1-$2").substring(0, 14);
const maskCEP = (value: string) => value.replace(/\D/g, "").replace(/(\d{5})(\d)/, "$1-$2").substring(0, 9);
const maskCRC = (value: string) => {
  let v = value.toUpperCase().replace(/[^A-Z0-9]/g, ""); 
  let uf = v.substring(0, 2).replace(/[^A-Z]/g, ""); 
  let numbers = v.substring(uf.length, uf.length + 6).replace(/[^0-9]/g, ""); 
  let letter = v.substring(uf.length + numbers.length, uf.length + numbers.length + 1).replace(/[^OP]/g, ""); 
  let digit = v.substring(uf.length + numbers.length + letter.length, uf.length + numbers.length + letter.length + 1).replace(/[^0-9]/g, ""); 
  let res = uf;
  if (v.length > 2) res += " " + numbers;
  if (numbers.length === 6 && v.length > 8) res += "/" + letter;
  if (letter.length === 1 && v.length > 9) res += "-" + digit;
  return res;
};

export function ModalListarAssessorias() {
  const [open, setOpen] = useState(false);
  const [assessorias, setAssessorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<any>(null);

  const carregarAssessorias = async () => {
    setLoading(true);
    try {
      const res = await contratosApi.listarAssessorias();
      if (res.success) {
        setAssessorias(res.empresas);
      }
    } catch (e) {
      toast.error("Erro ao carregar as assessorias.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      carregarAssessorias();
      setEditingId(null); 
    }
  }, [open]);

  const handleEditClick = (empresa: any) => {
    setFormData({ ...empresa });
    setEditingId(empresa.id);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, field: string, maskFn?: (v: string) => string) => {
    let value = e.target.value;
    if (maskFn) value = maskFn(value);
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSubmitEdit = async () => {
    const camposObrigatorios = [
      'razao_social', 'cnpj', 'cidade', 'uf', 'logradouro', 'numero', 
      'bairro', 'cep', 'email', 'crc_empresa', 'representante_nome', 
      'representante_cpf', 'representante_crc'
    ];
    
    for (const campo of camposObrigatorios) {
      if (!formData[campo] || String(formData[campo]).trim() === "") {
        return toast.error("Preencha todos os campos obrigatórios (*).");
      }
    }

    if (formData.cnpj.replace(/\D/g, "").length !== 14) return toast.error("O CNPJ deve conter 14 dígitos.");
    if (formData.representante_cpf.replace(/\D/g, "").length !== 11) return toast.error("O CPF deve conter 11 dígitos.");
    if (!formData.email.includes("@")) return toast.error("Por favor, insira um e-mail válido.");

    try {
      await contratosApi.atualizarAssessoria(editingId!, formData);
      toast.success("Assessoria atualizada com sucesso!");
      setEditingId(null); 
      carregarAssessorias(); 
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Erro ao atualizar assessoria.");
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-9 gap-2 text-xs font-bold bg-white text-primary">
          <List size={14} /> Gerenciar Assessorias
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl bg-white text-primary">
        <DialogHeader>
          <DialogTitle>
            {editingId ? "Editar Assessoria" : "Assessorias Cadastradas"}
          </DialogTitle>
        </DialogHeader>
        
        {/* LISTA */}
        {!editingId && (
          <div className="py-4 max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center p-4"><Loader2 className="animate-spin text-primary/50" /></div>
            ) : assessorias.length === 0 ? (
              <p className="text-center text-sm text-primary/50">Nenhuma assessoria cadastrada.</p>
            ) : (
              <div className="border rounded-md">
                <table className="w-full text-sm text-left">
                  <thead className="bg-primary/10 text-primary font-semibold border-b">
                    <tr>
                      <th className="p-2">Razão Social</th>
                      <th className="p-2">CNPJ</th>
                      <th className="p-2">Cidade/UF</th>
                      <th className="p-2 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessorias.map(emp => (
                      <tr key={emp.id} className="border-b hover:bg-primary/5">
                        <td className="p-2 font-medium">{emp.razao_social}</td>
                        <td className="p-2">{emp.cnpj}</td>
                        <td className="p-2">{emp.cidade}/{emp.uf}</td>
                        <td className="p-2 text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleEditClick(emp)}>
                            <Edit size={14} className="text-primary"/>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* EDIÇÃO */}
        {editingId && formData && (
          <div className="py-4 max-h-[60vh] overflow-y-auto px-1">
             <div className="grid grid-cols-2 gap-4">

               <div className="col-span-2 font-bold text-sm text-primary/60 border-b pb-1">Dados da Empresa</div>
               <div className="space-y-1"><Label>CNPJ *</Label><Input value={formData.cnpj} onChange={e => handleChange(e, 'cnpj', maskCNPJ)} /></div>
               <div className="space-y-1"><Label>Razão Social *</Label><Input value={formData.razao_social} onChange={e => handleChange(e, 'razao_social')} className="uppercase"/></div>
               <div className="space-y-1"><Label>E-mail *</Label><Input type="email" value={formData.email} onChange={e => handleChange(e, 'email')} className="lowercase"/></div>
               <div className="space-y-1"><Label>CRC da Empresa *</Label><Input value={formData.crc_empresa} onChange={e => handleChange(e, 'crc_empresa', maskCRC)} className="uppercase"/></div>
               
               <div className="col-span-2 font-bold text-sm text-primary/60 border-b pb-1 mt-2">Endereço</div>
               <div className="space-y-1"><Label>CEP *</Label><Input value={formData.cep} onChange={e => handleChange(e, 'cep', maskCEP)} /></div>
               <div className="space-y-1"><Label>Logradouro *</Label><Input value={formData.logradouro} onChange={e => handleChange(e, 'logradouro')} className="capitalize" /></div>
               <div className="space-y-1"><Label>Número *</Label><Input value={formData.numero} onChange={e => handleChange(e, 'numero')} /></div>
               <div className="space-y-1"><Label>Bairro *</Label><Input value={formData.bairro} onChange={e => handleChange(e, 'bairro')} className="capitalize" /></div>
               <div className="space-y-1"><Label>Cidade *</Label><Input value={formData.cidade} onChange={e => handleChange(e, 'cidade')} className="capitalize" /></div>
               <div className="space-y-1"><Label>UF *</Label><Input maxLength={2} value={formData.uf} onChange={e => handleChange(e, 'uf')} className="uppercase" /></div>

               <div className="col-span-2 font-bold text-sm text-primary/60 border-b pb-1 mt-2">Representante Legal</div>
               <div className="space-y-1"><Label>Nome *</Label><Input value={formData.representante_nome} onChange={e => handleChange(e, 'representante_nome')} className="uppercase"/></div>
               <div className="space-y-1"><Label>CPF *</Label><Input value={formData.representante_cpf} onChange={e => handleChange(e, 'representante_cpf', maskCPF)} /></div>
               <div className="space-y-1"><Label>CRC *</Label><Input value={formData.representante_crc} onChange={e => handleChange(e, 'representante_crc', maskCRC)} className="uppercase"/></div>
             </div>
             
             <div className="flex justify-between pt-4 mt-4 border-t">
                <Button variant="outline" onClick={() => setEditingId(null)} className="gap-2">
                  <ArrowLeft size={14} /> Voltar
                </Button>
                <Button className="bg-brand text-white hover:bg-brand-hover" onClick={handleSubmitEdit}>
                  Salvar Alterações
                </Button>
             </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}