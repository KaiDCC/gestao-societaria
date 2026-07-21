import { useState, useEffect } from "react";
import { 
  Home, Building2, FileText, FileSignature, 
  Award, UserCircle, 
  LogOut, ChevronDown, User, ChevronLeft, ChevronRight
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useNavigate, Link, useLocation } from '@tanstack/react-router';
import { authApi } from '@/features/auth/services/authApi';
import { api } from "@/lib/api";

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

const mainMenuItems = [
  { label: "Início", icon: Home, href: "/" },
  { label: "Empresas", icon: Building2, href: "/empresas" },  
  { label: "Alvarás", icon: FileText, href: "/alvaras" },
  { label: "Contratos", icon: FileSignature, href: "/contratos" },
  { label: "Usuários", icon: UserCircle, href: "/usuarios" },
];

export function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
  const [isCertificadosOpen, setIsCertificadosOpen] = useState(false);
  const [nomeUsuario, setNomeUsuario] = useState("Carregando...");
  const [isAdmin, setIsAdmin] = useState(false);
  
  const navigate = useNavigate();
  
  const location = useLocation();
  const pathname = location.pathname;

  useEffect(() => {
    api.get('/api/usuarios/me')
      .then(response => {
        if (response.data?.user) {
          setIsAdmin(response.data.user.is_admin);

          const nomeCompleto = response.data.user.nome;
          if (nomeCompleto) {
            const partes = nomeCompleto.trim().split(" ");
            if (partes.length > 1) {
              setNomeUsuario(`${partes[0]} ${partes[1].charAt(0)}.`);
            } else {
              setNomeUsuario(partes[0]);
            }
          }
        }
      })
      .catch(err => {
        console.error("Erro ao buscar usuário logado", err);
        setNomeUsuario("Usuário");
      });
  }, []);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error("Erro ao deslogar no backend", error);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate({ to: "/login" });
    }
  };

  const isCertificadosActive = pathname.startsWith("/certificados");

  return (
    <aside className={cn(
      "h-screen sticky top-0 p-3 flex flex-col transition-all duration-300 ease-in-out shrink-0",
      isCollapsed ? "w-20" : "w-64"
    )}>
      <div className="flex-1 bg-brandSurface rounded-[2rem] flex flex-col overflow-hidden shadow-xl border border-white/5 relative">
        
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute right-2 top-6 bg-brand hover:bg-brand-hover text-brandSurface rounded-full p-1 shadow-lg transition-transform"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="py-8 flex items-center justify-center">
          <div className="text-white font-bold tracking-tight">
            {isCollapsed ? <span className="text-brand text-xl">S</span> : (
              <span className="text-xl">Sistema<span className="text-brand">Societário</span></span>
            )}
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          {mainMenuItems.map((item) => {
            if (item.label === "Usuários" && !isAdmin) {
              return null;
            }

            const isActive = item.href === "/" 
              ? pathname === "/" 
              : pathname.startsWith(item.href);

            return (
              <Link 
                key={item.label}
                to={item.href}
                title={isCollapsed ? item.label : ""}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group",
                  isActive ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white",
                  isCollapsed && "justify-center px-0"
                )}
              >
                <item.icon className="h-5 w-5 text-brand shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}

          {/* Submenu Certificados */}
          <div>
            <button 
              onClick={() => !isCollapsed && setIsCertificadosOpen(!isCertificadosOpen)}
              className={cn(
                "flex items-center justify-between w-full gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all",
                isCertificadosActive ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white",
                isCollapsed && "justify-center px-0"
              )}
            >
              <div className="flex items-center gap-3">
                <Award className="h-5 w-5 text-brand shrink-0" />
                {!isCollapsed && <span>Certificados</span>}
              </div>
              {!isCollapsed && <ChevronDown size={14} className={cn("transition-transform", (isCertificadosOpen || isCertificadosActive) && "rotate-180")} />}
            </button>
            
            {!isCollapsed && (isCertificadosOpen || isCertificadosActive) && (
              <div className="ml-4 mt-1 space-y-1 animate-in fade-in">
                <Link 
                  to="/certificados/e-cnpj" 
                  className={cn(
                    "flex items-center gap-2 py-2 pl-4 text-[11px] hover:text-brand transition-colors",
                    pathname === "/certificados/e-cnpj" ? "text-brand font-bold" : "text-slate-400"
                  )}
                >
                  e-CNPJ
                </Link>
                <Link 
                  to="/certificados/e-cpf" 
                  className={cn(
                    "flex items-center gap-2 py-2 pl-4 text-[11px] hover:text-brand transition-colors",
                    pathname === "/certificados/e-cpf" ? "text-brand font-bold" : "text-slate-400"
                  )}
                >
                  e-CPF
                </Link>
              </div>
            )}
          </div>
        </nav>

        {/* Footer */}
        <div className={cn("px-4 py-4 border-t border-white/10 bg-black/5", isCollapsed && "px-0 flex justify-center")}>
          {isCollapsed ? (
             <LogOut className="h-5 w-5 text-brand cursor-pointer" onClick={handleLogout} />
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <div className="h-7 w-7 rounded-full bg-brand/20 flex flex-shrink-0 items-center justify-center">
                  <User className="h-3.5 w-3.5 text-brand" />
                </div>
                <span className="text-[11px] font-bold text-white truncate max-w-[70px]" title={nomeUsuario}>
                  {nomeUsuario}
                </span>
              </div>
              <button onClick={handleLogout} className="text-primary font-bold text-sm uppercase hover:underline">
                SAIR
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
