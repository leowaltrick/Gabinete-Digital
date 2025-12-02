import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("Iniciando Gabinete Digital (Main)...");

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("ERRO CRÍTICO: Elemento 'root' não encontrado no HTML.");
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("React montado com sucesso via src/main.tsx");
  } catch (e) {
    console.error("Erro ao montar React:", e);
    rootElement.innerHTML = '<div style="color:red; padding: 20px;">Erro ao carregar a aplicação. Verifique o console.</div>';
  }
}