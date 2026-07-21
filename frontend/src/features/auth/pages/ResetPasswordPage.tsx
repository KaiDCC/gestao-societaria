import { useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export function ResetPasswordPage() {
  const searchParams: any = useSearch({ strict: false });
  const [token, setToken] = useState(searchParams.token || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Estados dos olhinhos para as senhas
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Captura o token da URL da barra do navegador (?token=...)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error("Token de recuperação ausente ou inválido.");
      return;
    }

    if (password.length < 6) {
      toast.error("A senha deve conter no mínimo 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas informadas não coincidem.");
      return;
    }

    setIsLoading(true);
    try {
      // Importa a chamada da API dinamicamente para evitar conflitos
      const { authApi } = await import("../services/authApi");
      const data = await authApi.resetPassword(token, password);

      if (data.sucesso) {
        setIsSuccess(true);
        toast.success("Sua senha foi alterada com sucesso!");
      } else {
        toast.error(data.erro || "Falha ao redefinir a senha.");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.erro || "Erro de comunicação com o servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#dddddd] p-4 font-poppins">
        <div className="w-full max-w-[450px] bg-white rounded-3xl p-8 text-center shadow-xl space-y-6 animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto border border-green-100">
            <CheckCircle className="text-green-500" size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-primary uppercase tracking-wider">Senha Atualizada</h2>
            <p className="text-xs text-slate-400">Sua nova senha foi gravada com sucesso. Você já pode fechar esta aba e realizar o login no sistema.</p>
          </div>
          <Button 
            onClick={() => window.location.href = "/"}
            className="w-full h-11 bg-brand hover:bg-brand-hover hover:text-primary text-white font-bold text-xs uppercase tracking-wider transition-all"
          >
            Ir para a Tela de Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#dddddd] p-4 font-poppins">
      <div className="w-full max-w-[850px] h-[550px] bg-white rounded-3xl shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden flex relative">
        
        {/* PAINEL ESQUERDO */}
        <div className="hidden md:flex flex-col justify-center items-center text-center w-1/2 bg-brandSurface p-12 relative z-10 border-r border-brand/10">
          <div className="mb-11 flex justify-center w-full">
            <img src="/logo.png" alt="logo sistema" className="h-[95px] w-auto  object-contain" />
          </div>
          <div className="space-y-4 w-full">
            <h1 className="text-4xl font-black text-brand leading-tight tracking-tight">Nova Senha</h1>
            <p className="text-slate-200 text-base leading-relaxed font-medium max-w-[90%] mx-auto">Crie uma nova credencial de acesso forte para proteger sua conta.</p>
          </div>
        </div>

        {/* PAINEL DIREITO */}
        <div className="flex-1 bg-white p-8 md:p-12 flex flex-col justify-center relative overflow-hidden">
          <div className="animate-in fade-in duration-500">
            <h2 className="text-2xl font-black text-brand text-center mb-6 uppercase tracking-widest">Redefinir Acesso</h2>
            
            <form className="space-y-4" onSubmit={handleResetPassword}>
              
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-primary uppercase">Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" size={16} />
                  <Input 
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres" 
                    className="pl-10 pr-10 h-11 border-slate-100 bg-slate-50 focus:border-brand text-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-v uppercase">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" size={16} />
                  <Input 
                    required
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha" 
                    className="pl-10 pr-10 h-11 border-slate-100 bg-slate-50 focus:border-brand text-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit"
                className="w-full h-11 bg-brand hover:bg-brandSurface hover:text-primary text-white font-bold text-xs uppercase tracking-wider mt-4"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="animate-spin mr-2" /> : "Atualizar Credenciais"}
              </Button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
