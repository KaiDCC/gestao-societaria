export const formatDateExtenso = (dateStr: string): string => {
  if (!dateStr) return "";
  
  const date = new Date(dateStr + "T00:00:00");

  return new Intl.DateTimeFormat('pt-BR', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  }).format(date);
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};


export const valorPorExtenso = (valor: number): string => {
  if (!valor) return "";
  
  const formatado = formatCurrency(valor);
  
  return `${formatado} (valor por extenso calculado aqui)`;
};
