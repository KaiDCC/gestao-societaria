import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FilePlus, FileMinus, List } from "lucide-react";
import { AdesaoForm } from "./components/AdesaoForm";
import { DistratoForm } from "./components/DistratoForm";
import { ListagemTable } from "./components/ListagemTable";
import { ModalAssessoria } from "./components/ModalAssessoria";
import { ModalListarAssessorias } from "./components/ModalListarAssessorias";

export function ContratosPage() {
  return (
    <div className="space-y-4 p-2">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold tracking-tight text-primary uppercase">
          Gestão de Contratos
        </h2>
        <div className="flex gap-2">
          <ModalListarAssessorias />
          <ModalAssessoria onCreated={() => window.location.reload()} />
        </div>
      </div>

      <Tabs defaultValue="listagem" className="w-full">

        <TabsList className="bg-primary/10 border border-primary/30 text-primary h-9 p-1">
          <TabsTrigger value="adesao" className="gap-1.5 text-xs h-7">
            <FilePlus size={14}/> Adesão
          </TabsTrigger>
          <TabsTrigger value="distrato" className="gap-1.5 text-xs h-7">
            <FileMinus size={14}/> Distrato
          </TabsTrigger>
          <TabsTrigger value="listagem" className="gap-1.5 text-xs h-7">
            <List size={14}/> Listagem
          </TabsTrigger>
        </TabsList>

        <TabsContent value="adesao" className="mt-2">
          <AdesaoForm />
        </TabsContent>

        <TabsContent value="distrato" className="mt-2">
           <DistratoForm />
        </TabsContent>

        <TabsContent value="listagem" className="mt-2">

          <ListagemTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
