
export const downloadCSV = (data: any[], headers: string[], fileNamePrefix: string) => {
  if (!data || data.length === 0) {
    alert("Não há dados para exportar com os filtros atuais.");
    return;
  }

  // Add BOM for Excel compatibility with UTF-8
  const BOM = "\uFEFF";
  const csvContent = "data:text/csv;charset=utf-8," + BOM + 
    [headers.join(','), ...data.map(row => row.join(','))].join('\n');
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  
  // Format Date: YYYY-MM-DD_HH-mm
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR').split('/').reverse().join('-');
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).replace(':', '-');
  
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${fileNamePrefix}_${dateStr}_${timeStr}.csv`);
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
