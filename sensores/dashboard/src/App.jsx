import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function App() {
  const [sensorData, setSensorData] = useState({});
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

        setSensorData(prevData => {
          const newData = { ...prevData };
          payload.sensors.forEach(sensor => {
            if (!newData[sensor.id]) newData[sensor.id] = [];
            newData[sensor.id] = [...newData[sensor.id], { time, value: sensor.value }];
            // Limita o histórico exibido às últimas leituras.
            if (newData[sensor.id].length > 30) newData[sensor.id].shift();
          });
          return newData;
        });
      } catch (error) {
        console.error("Erro no parse:", error);
      }
    };

    return () => ws.close();
  }, []);

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
              <h2 style={{ fontSize: '1.2rem', color: '#34495e', margin: '0 0 0.5rem 0' }}>{meta?.name}</h2>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: meta?.color }}>
                  {data.length > 0 ? data[data.length - 1].value.toFixed(2) : '0.00'} 
                  <span style={{ fontSize: '1rem', color: '#7f8c8d', marginLeft: '5px' }}>{meta?.unit}</span>
                </div>
                
              </div>

              <div style={{ height: activeView === 'todos' ? '220px' : '400px', width: '100%', transition: 'height 0.3s' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="time" hide />
                    <YAxis domain={['auto', 'auto']} width={40} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke={meta?.color} strokeWidth={3} dot={false} isAnimationActive={false} />
                  </LineChart>
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
