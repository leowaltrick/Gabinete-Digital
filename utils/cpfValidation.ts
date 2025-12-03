
export const formatPhone = (value: string) => {
  const v = value.replace(/\D/g, "");
  
  if (v.length > 11) return value.slice(0, 15); // Limita tamanho

  // Máscara para 11 dígitos: (00) 00000-0000
  if (v.length > 10) {
    return v
      .replace(/^(\d\d)(\d{5})(\d{4}).*/, "($1) $2-$3");
  } 
  
  // Máscara para 10 dígitos: (00) 0000-0000
  if (v.length > 5) {
    return v
      .replace(/^(\d\d)(\d{4})(\d{0,4}).*/, "($1) $2-$3");
  } 
  
  // Máscara parcial: (00
  if (v.length > 2) {
    return v.replace(/^(\d\d)(\d{0,5})/, "($1) $2");
  } 
  
  return v;
};

export const formatCEP = (value: string) => {
  const v = value.replace(/\D/g, "");
  if (v.length > 5) {
    return v.replace(/^(\d{5})(\d{1,3})/, "$1-$2");
  }
  return v;
};

export const stripNonDigits = (value: string) => {
    return value.replace(/\D/g, '');
};

// Funções de Data para corrigir Timezone
export const getLocalDate = (dateString: string): Date => {
  if (!dateString) return new Date();
  
  // Se for formato YYYY-MM-DD (sem hora), trata como data local
  if (dateString.length === 10 && dateString.includes('-')) {
     const [year, month, day] = dateString.split('-').map(Number);
     return new Date(year, month - 1, day);
  }
  
  // Caso contrário (ISO string com hora), usa construtor padrão
  return new Date(dateString);
};

export const formatDate = (dateString: string): string => {
   if(!dateString) return '';
   const date = getLocalDate(dateString);
   return date.toLocaleDateString('pt-BR');
};
