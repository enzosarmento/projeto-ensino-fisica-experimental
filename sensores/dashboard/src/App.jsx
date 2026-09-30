import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function App() {
  const [sensorData, setSensorData] = useState({});
  const [fullSensorData, setFullSensorData] = useState({}); // Armazena o histórico completo para o CSV
  const [sensorMeta, setSensorMeta] = useState({});
  const [status, setStatus] = useState('Desconectado');
  const [activeView, setActiveView] = useState('todos');

  useEffect(() => {
    const ws = new WebSocket('ws://192.168.4.1/ws');

    ws.onopen = () => setStatus('Conectado ao ESP32');
    ws.onclose = () => setStatus('Desconectado');
    
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const time = new Date().toLocaleTimeString();
        
        setSensorMeta(prevMeta => {
          const newMeta = { ...prevMeta };
          payload.sensors.forEach(sensor => {
            newMeta[sensor.id] = { name: sensor.name, unit: sensor.unit, color: sensor.color };
          });
          return newMeta;
        });

        // Atualiza os dados do gráfico (limitado a 30 pontos para performance da UI)
        setSensorData(prevData => {
          const newData = { ...prevData };
          payload.sensors.forEach(sensor => {
            if (!newData[sensor.id]) newData[sensor.id] = [];
            newData[sensor.id] = [...newData[sensor.id], { time, value: sensor.value }];
            if (newData[sensor.id].length > 30) newData[sensor.id].shift();
          });
          return newData;
        });

        // Atualiza o histórico completo (sem limite, usado apenas para o CSV)
        setFullSensorData(prevData => {
          const newData = { ...prevData };
          payload.sensors.forEach(sensor => {
            if (!newData[sensor.id]) newData[sensor.id] = [];
            newData[sensor.id] = [...newData[sensor.id], { time, value: sensor.value }];
          });
          return newData;
        });

      } catch (error) {
        console.error("Erro no parse:", error);
      }
    };

    return () => ws.close();
  }, []);

  // Função para gerar e baixar o CSV de um sensor específico
  const exportToCSV = (sensorId) => {
    const data = fullSensorData[sensorId];
    const meta = sensorMeta[sensorId];
    
    if (!data || data.length === 0) {
      alert("Nenhum dado para exportar ainda.");
      return;
    }

    // Cria o cabeçalho do CSV
    let csvContent = `Tempo,${meta.name} (${meta.unit})\n`;
    
    // Adiciona as linhas de dados
    data.forEach(row => {
      // Troca o ponto por vírgula se precisar importar no Excel em português, 
      // ou mantém o ponto se for analisar via Python/Pandas
      csvContent += `${row.time},${row.value}\n`; 
    });

    // Cria um Blob e força o download no navegador
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${sensorId}_experimento.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sensorsToRender = activeView === 'todos' 
    ? Object.keys(sensorData) 
    : [activeView].filter(id => sensorData[id]);

  return (
    <div style={{ padding: '3%', fontFamily: 'sans-serif', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <header style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <h1 style={{ color: '#2c3e50', fontSize: '1.8rem', margin: '0 0 0.5rem 0' }}>Dashboard - Sensores</h1>
        <p style={{ fontWeight: 'bold', margin: 0, color: status.includes('Conectado') ? '#27ae60' : '#e74c3c' }}>
          Status: {status}
        </p>
      </header>

      <nav style={{ display: 'flex', gap: '10px', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '10px' }}>
        <button
          onClick={() => setActiveView('todos')}
          style={{
            padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap', transition: '0.2s',
            backgroundColor: activeView === 'todos' ? '#2c3e50' : '#e0e0e0',
            color: activeView === 'todos' ? 'white' : '#333'
          }}
        >
          Visão Geral
        </button>
        {Object.entries(sensorMeta).map(([id, meta]) => (
          <button
            key={id}
            onClick={() => setActiveView(id)}
            style={{
              padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap', transition: '0.2s',
              backgroundColor: activeView === id ? meta.color : '#e0e0e0',
              color: activeView === id ? 'white' : '#333'
            }}
          >
            {meta.name}
          </button>
        ))}
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: activeView === 'todos' ? 'repeat(auto-fit, minmax(320px, 1fr))' : '1fr', gap: '1.5rem' }}>
        {sensorsToRender.map(sensorId => {
          const meta = sensorMeta[sensorId];
          const data = sensorData[sensorId];
          
          return (
            <div key={sensorId} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
              
              {/* Cabeçalho do Cartão com o Botão de CSV */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h2 style={{ fontSize: '1.2rem', color: '#34495e', margin: '0' }}>{meta?.name}</h2>
                <button 
                  onClick={() => exportToCSV(sensorId)}
                  style={{ 
                    padding: '5px 12px', fontSize: '0.85rem', backgroundColor: '#ecf0f1', 
                    border: '1px solid #bdc3c7', borderRadius: '5px', cursor: 'pointer', 
                    color: '#2c3e50', fontWeight: 'bold', transition: '0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#e0e6ed'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#ecf0f1'}
                >
                  📥 CSV
                </button>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: meta?.color }}>
                  {data.length > 0 ? data[data.length - 1].value.toFixed(2) : '0.00'} 
                  <span style={{ fontSize: '1rem', color: '#7f8c8d', marginLeft: '5px' }}>{meta?.unit}</span>
                </div>
              </div>

              <div style={{ height: activeView === 'todos' ? '220px' : '400px', width: '100%', transition: 'height 0.3s' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="time" hide />
                    <YAxis domain={['auto', 'auto']} width={40} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke={meta?.color} 
                      fill={meta?.color} 
                      fillOpacity={0.2} 
                      strokeWidth={3} 
                      isAnimationActive={false} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
        {Object.keys(sensorData).length === 0 && (
          <div style={{ textAlign: 'center', color: '#7f8c8d', gridColumn: '1 / -1', padding: '2rem' }}>
            Aguardando dados do laboratório...
          </div>
        )}
      </div>
    </div>
  );
}