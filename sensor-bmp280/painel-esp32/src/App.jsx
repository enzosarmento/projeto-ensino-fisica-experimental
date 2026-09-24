import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, 
  PointElement, LineElement, Title, Tooltip, Legend 
} from 'chart.js';

// Regista os componentes do Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function App() {
  const maxPontos = 20;
  const [temperatura, setTemperatura] = useState('--');
  const [pressao, setPressao] = useState('--');
  
  const [histTemp, setHistTemp] = useState([]);
  const [histPres, setHistPres] = useState([]);
  const [labels, setLabels] = useState([]);

  useEffect(() => {
    const buscarDados = async () => {
      try {
        // Ao testar no computador local, pode dar erro de rede (CORS). 
        // Quando estiver a rodar no ESP32, isto funcionará perfeitamente.
        const res = await fetch('/dados');
        const json = await res.json();
        
        const agora = new Date().toLocaleTimeString();

        setTemperatura(json.temperatura.toFixed(2));
        setPressao(json.pressao.toFixed(2));

        setLabels(prev => {
          const newLabels = [...prev, agora];
          if (newLabels.length > maxPontos) newLabels.shift();
          return newLabels;
        });

        setHistTemp(prev => {
          const newHist = [...prev, json.temperatura];
          if (newHist.length > maxPontos) newHist.shift();
          return newHist;
        });

        setHistPres(prev => {
          const newHist = [...prev, json.pressao];
          if (newHist.length > maxPontos) newHist.shift();
          return newHist;
        });
      } catch (e) {
        console.error("Erro a procurar dados do ESP32");
      }
    };

    const intervalo = setInterval(buscarDados, 2000);
    return () => clearInterval(intervalo);
  }, []);

  // Opções comuns para remover animações para não sobrecarregar dispositivos móveis
  const options = { animation: false, responsive: true };

  return (
    <div style={{ textAlign: 'center', padding: '20px', fontFamily: 'Arial, sans-serif', backgroundColor: '#222', color: '#fff', minHeight: '100vh' }}>
      <h1 style={{ color: '#4cd137' }}>Sensor BMP280</h1>
      
      <div style={{ background: '#333', margin: '20px auto', padding: '20px', maxWidth: '600px', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.5)' }}>
        <h2>Temperatura: <span style={{ color: '#ff4757' }}>{temperatura}</span> °C</h2>
        <Line 
          options={options}
          data={{
            labels,
            datasets: [{
              label: 'Temperatura (°C)', data: histTemp, borderColor: '#ff4757', backgroundColor: 'rgba(255, 71, 87, 0.2)', fill: true, tension: 0.4
            }]
          }} 
        />
      </div>
      
      <div style={{ background: '#333', margin: '20px auto', padding: '20px', maxWidth: '600px', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.5)' }}>
        <h2>Pressão: <span style={{ color: '#1e90ff' }}>{pressao}</span> hPa</h2>
        <Line 
          options={options}
          data={{
            labels,
            datasets: [{
              label: 'Pressão (hPa)', data: histPres, borderColor: '#1e90ff', backgroundColor: 'rgba(30, 144, 255, 0.2)', fill: true, tension: 0.4
            }]
          }} 
        />
      </div>
    </div>
  );
}

export default App;