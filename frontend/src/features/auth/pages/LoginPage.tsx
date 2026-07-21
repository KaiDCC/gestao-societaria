import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Mail, Lock, User, Info, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { authApi } from "../services/authApi";

type AuthStep = "login" | "register" | "forgot";

export function LoginPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<AuthStep>("login");
  const [isLoading, setIsLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const data = await authApi.login({ email, password });
      
      if (data.sucesso) {
        localStorage.setItem("user", JSON.stringify(data.user || {}));
        
        toast.success("Bem-vindo(a)!");
        navigate({ to: "/" }); 
      } else {
        toast.error(data.msg || data.erro || "Credenciais inválidas.");
      }
    } catch (error: any) {
      toast.error("Erro ao conectar com o servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Removemos o setor daqui (será Geral por padrão no backend)
      const data = await authApi.register({ email, name, password, setor: "Geral" });
      if (data.sucesso || !data.erro) {
        toast.success("Usuário criado! Faça seu login para acessar.");
        setStep("login");
      } else {
        toast.error(data.erro || "Erro ao realizar cadastro.");
      }
    } catch (error: any) {
      toast.error("Erro ao conectar com o servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await authApi.forgotPassword(email);
      toast.success("Se o e-mail existir em nossa base, o link foi enviado.");
      setStep("login");
    } catch (error: any) {
      toast.error("Erro ao processar solicitação.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#dddddd] p-4 font-poppins">
      
      <div className="w-full max-w-[850px] h-[550px] bg-white rounded-3xl shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden flex relative">
        
        {/* PAINEL ESQUERDO */}
        <div className="hidden md:flex flex-col justify-center items-center text-center w-1/2 bg-brandSurface p-12 relative z-10 transition-all duration-500 border-r border-brand/10">
          
          <div className="mb-11 flex justify-center w-full">
            <img 
              src="/logo.png" 
              alt="logo sistema" 
              className="h-[95px] w-auto object-contain" 
            />
          </div>

          <div className="space-y-4 w-full">
            <h1 className="text-4xl font-black text-brand leading-tight tracking-tight">
              {step === "register" ? "Criar Novo Usuário" : "Sistema Societário"}
            </h1>
            <p className="text-slate-200 text-base leading-relaxed font-medium max-w-[90%] mx-auto">
              {step === "register" 
                ? "Preencha os campos abaixo para criar seu acesso seguro." 
                : "Sistema focado em  gestão de Alvarás, Certificados e Contratos."}
            </p>
          </div>
          
          {/* Brilhos decorativos sutis */}
          <div className="absolute -top-32 -left-32 w-80 h-80 bg-brand opacity-5 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-white opacity-5 blur-[100px] rounded-full pointer-events-none" />
        </div>

        {/* PAINEL DIREITO */}
        <div className="flex-1 bg-white p-8 md:p-12 flex flex-col relative overflow-hidden">
          
          <div className="flex-1 flex flex-col justify-center">
            
            {/* LOGIN */}
            {step === "login" && (
              <div className="animate-in fade-in slide-in-from-right duration-500">
                <h2 className="text-2xl font-black text-brand text-center mb-6 uppercase tracking-widest">Login</h2>
                <form className="space-y-4" onSubmit={handleLogin}>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-primary uppercase">E-mail Corporativo</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" size={16} />
                      <Input 
                        required
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu.email@gmail.com" 
                        // Visual clean
                        className="pl-10 h-11 border-slate-100 bg-slate-50 focus:border-brand focus:ring-primary/10 text-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-primary uppercase">Senha de Acesso</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" size={16} />
                      <Input 
                        required
                        type={showLoginPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="********" 
                        className="pl-10 pr-10 h-11 border-slate-100 bg-slate-50 focus:border-brand focus:ring-primary/10 text-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand transition-colors"
                      >
                        {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-start">
                    <button 
                      type="button"
                      onClick={() => setStep("forgot")}
                      className="text-[11px] text-primary/50 font-medium hover:text-brand transition-colors"
                    >
                      Esqueceu sua senha?
                    </button>
                  </div>

                  <Button 
                    type="submit"
                    className="w-full h-11 bg-brand hover:bg-brandSurface hover:text-brand text-white font-bold transition-all text-xs uppercase tracking-wider"
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="animate-spin mr-2" /> : "Acessar Plataforma"}
                  </Button>
                </form>

                <div className="mt-8 text-center text-[12px] text-primary/50">
                  Primeira vez aqui?{" "}
                  <button onClick={() => setStep("register")} className="text-brand font-black hover:underline">
                    Criar Novo Usuário
                  </button>
                </div>
              </div>
            )}

            {/* REGISTER */}
            {step === "register" && (
              <div className="animate-in fade-in slide-in-from-left duration-500">
                <button onClick={() => setStep("login")} className="flex items-center gap-2 text-primary/60 hover:text-primary text-[11px] font-bold mb-5 transition-colors">
                  <ArrowLeft size={16} /> VOLTAR PARA LOGIN
                </button>
                <h2 className="text-xl font-black text-brand mb-5 uppercase tracking-wider">Criar Novo Usuário</h2>
                
                <form className="space-y-3" onSubmit={handleRegister}>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-primary/50 uppercase">Nomes</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" size={16} />
                      <Input 
                        required 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        placeholder="Ex: Kailane" 
                        className="pl-10 h-10 border-slate-100 bg-slate-50 focus:border-brand text-primary" 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-primary/50 uppercase">E-mail (Login)</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" size={16} />
                      <Input 
                        required 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        placeholder="seu.email@gmail.com" 
                        className="pl-10 h-10 border-slate-100 bg-slate-50 focus:border-brand text-primary" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-primary/50 uppercase">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" size={16} />
                      <Input 
                        required 
                        // ALTERADO PARA MUDAR O TIPO DINAMICAMENTE
                        type={showRegisterPassword ? "text" : "password"}
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        placeholder="Digite sua senha" 
                        // Adicionado pr-10 para dar espaço ao ícone
                        className="pl-10 pr-10 h-10 border-slate-100 bg-slate-50 focus:border-brand text-primary" 
                      />
                      {/* BOTÃO DO OLHINHO ADICIONADO AQUI */}
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand transition-colors"
                      >
                        {showRegisterPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* AVISO DE PERMISSÕES */}
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-start gap-2 mt-4 mb-2">
                    <Info className="text-brand shrink-0 mt-0.5" size={14} />
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      <strong className="text-primary">Importante:</strong> Contas criadas por aqui possuem permissões padrão restritas (não administradores). Para alterar seu nível de acesso, contate um administrador do sistema.
                    </p>
                  </div>

                  <Button type="submit" disabled={isLoading} className="w-full h-11 bg-brand hover:bg-brandSurface hover:text-brand text-white font-bold text-xs uppercase tracking-wider">
                    {isLoading ? <Loader2 className="animate-spin mr-2" /> : "Criar Minha Conta"}
                  </Button>
                </form>
              </div>
            )}

            {/* FORGOT PASSWORD */}
            {step === "forgot" && (
              <div className="animate-in fade-in zoom-in duration-500 text-center">
                <button onClick={() => setStep("login")} className="flex items-center gap-2 text-primary/60 hover:text-primary text-[11px] font-bold mb-7 mx-auto transition-colors">
                  <ArrowLeft size={16} /> VOLTAR PARA LOGIN
                </button>
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-slate-100">
                  <Lock className="text-brand" size={30} />
                </div>
                <h2 className="text-xl font-black text-primary mb-2 uppercase tracking-wider">Recuperar Senha</h2>
                <p className="text-xs text-primary/80 mb-7 max-w-[280px] mx-auto">Informe seu e-mail cadastrado e enviaremos um link seguro para criar uma nova senha.</p>
                
                <form className="space-y-3 max-w-[300px] mx-auto " onSubmit={handleForgot}>
                  <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail cadastrado" className="h-11 border-slate-100 bg-slate-50 text-center focus:border-brand text-slate-800" />
                  <Button type="submit" disabled={isLoading} className="w-full h-11 bg-primary hover:bg-brand hover:text-primary hover:bg-brandSurface text-white font-bold text-xs uppercase tracking-wider">
                    {isLoading ? <Loader2 className="animate-spin mr-2" /> : "Enviar Link de Recuperação"}
                  </Button>
                </form>
              </div>
            )}

          </div>

          <div className="mt-auto text-center text-[9px] text-[#a6a9ab] font-black tracking-wider">
            © 2026 Sistema Societário. Todos os direitos reservados.
          </div>
        </div>
      </div>
    </div>
  );
}
