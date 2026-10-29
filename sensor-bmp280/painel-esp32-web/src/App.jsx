import { useEffect, useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js';
import './App.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

const maxPontosGrafico = 20;

function exportarCsv(dados, sensor) {
  if (dados.length === 0) {
    return;
  }

  const configuracoes = {
    temperatura: {
      coluna: 'Temperatura_C',
      arquivo: 'bmp280_temperatura.csv',
    },
    pressao: {
      coluna: 'Pressao_hPa',
      arquivo: 'bmp280_pressao.csv',
    },
  };
  const config = configuracoes[sensor];
  const escapar = (valor) => `"${String(valor).replaceAll('"', '""')}"`;
  const linhas = [
    ['Horario', config.coluna].map(escapar).join(','),
    ...dados.map((item) => [item.horarioCompleto, item[sensor]].map(escapar).join(',')),
  ];
  const blob = new Blob([`\uFEFF${linhas.join('\r\n')}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = config.arquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function CartaoGrafico({ titulo, unidade, dados, cor, fundo, sensor }) {
  const chartData = useMemo(
    () => ({
      labels: dados.slice(-maxPontosGrafico).map((item) => item.horario),
      datasets: [
        {
          label: `${titulo} (${unidade})`,
          data: dados.slice(-maxPontosGrafico).map((item) => item.valor),
          borderColor: cor,
          backgroundColor: fundo,
          pointRadius: 2,
          pointHoverRadius: 5,
          fill: true,
          tension: 0.35,
        },
      ],
    }),
    [cor, dados, fundo, titulo, unidade],
  );

  return (
    <section className="card">
      <div className="card-heading">
        <h2>{titulo}</h2>
        <button
          className="download"
          type="button"
          onClick={() => exportarCsv(dados, sensor)}
          disabled={dados.length === 0}
          aria-label={`Baixar CSV de ${titulo.toLowerCase()}`}
        >
          Baixar CSV
        </button>
      </div>
      <div className="chart">
        <Line
          data={chartData}
          options={{
            animation: false,
            maintainAspectRatio: false,
            responsive: true,
            interaction: { intersect: false, mode: 'index' },
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: '#91a0b7', maxTicksLimit: 6 }, grid: { display: false } },
              y: { ticks: { color: '#91a0b7' }, grid: { color: 'rgba(255,255,255,0.07)' } },
            },
          }}
        />
      </div>
    </section>
  );
}

export default function App() {
  const [leituraAtual, setLeituraAtual] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [online, setOnline] = useState(false);

  useEffect(() => {
    let ativo = true;

    const buscarDados = async () => {
      try {
        const resposta = await fetch('/dados', { cache: 'no-store' });
        if (!resposta.ok) {
          throw new Error(`Resposta HTTP ${resposta.status}`);
        }

        const dados = await resposta.json();
        const temperatura = Number(dados.temperatura);
        const pressao = Number(dados.pressao);
        if (!Number.isFinite(temperatura) || !Number.isFinite(pressao)) {
          throw new Error('O ESP32 retornou valores de temperatura ou pressão inválidos.');
        }

        const agora = new Date();
        const item = {
          horario: agora.toLocaleTimeString(),
          horarioCompleto: agora.toLocaleString(),
          temperatura,
          pressao,
        };

        if (ativo) {
          setLeituraAtual(item);
          setHistorico((anterior) => [...anterior, item]);
          setOnline(true);
        }
      } catch (erro) {
        console.error('Erro ao buscar dados do ESP32:', erro);
        if (ativo) {
          setOnline(false);
        }
      }
    };

    buscarDados();
    const intervalo = window.setInterval(buscarDados, 2000);
    return () => {
      ativo = false;
      window.clearInterval(intervalo);
    };
  }, []);

  const formatar = (valor, casas) => (valor == null ? '--' : valor.toFixed(casas));
  const dadosTemperatura = useMemo(
    () => historico.map((item) => ({ ...item, valor: item.temperatura })),
    [historico],
  );
  const dadosPressao = useMemo(
    () => historico.map((item) => ({ ...item, valor: item.pressao })),
    [historico],
  );

  return (
    <main className="page">
      <header className="topbar">
        <div>
          <p className="eyebrow">MONITORAMENTO EM TEMPO REAL</p>
          <h1>Sensor BMP280</h1>
        </div>
        <span className={`connection ${online ? 'online' : ''}`}>
          <span className="connection-dot" />
          {online ? 'Conectado' : 'Reconectando'}
        </span>
      </header>

      <section className="readings" aria-label="Leituras atuais">
        <article className="reading temperature">
          <span>Temperatura</span>
          <strong>{formatar(leituraAtual?.temperatura, 2)}</strong>
          <span className="unit">°C</span>
        </article>
        <article className="reading pressure">
          <span>Pressão</span>
          <strong>{formatar(leituraAtual?.pressao, 2)}</strong>
          <span className="unit">hPa</span>
        </article>
      </section>

      <div className="section-heading">
        <div>
          <h2>Histórico da sessão</h2>
          <p>Exibindo os últimos {maxPontosGrafico} pontos em cada gráfico</p>
        </div>
      </div>

      <div className="charts">
        <CartaoGrafico
          titulo="Temperatura"
          unidade="°C"
          dados={dadosTemperatura}
          sensor="temperatura"
          cor="#ff7185"
          fundo="rgba(255,113,133,0.13)"
        />
        <CartaoGrafico
          titulo="Pressão"
          unidade="hPa"
          dados={dadosPressao}
          sensor="pressao"
          cor="#61a8ff"
          fundo="rgba(97,168,255,0.13)"
        />
      </div>
      <footer>{historico.length} leituras coletadas desde a abertura desta página</footer>
    </main>
  );
}
