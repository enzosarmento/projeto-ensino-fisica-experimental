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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

const maxPontosGrafico = 20;

function CartaoGrafico({ titulo, unidade, dados, cor, fundo }) {
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
      <h2>{titulo}</h2>
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

function exportarCsv(dados) {
  if (dados.length === 0) {
    return;
  }

  const escapar = (valor) => `"${String(valor).replaceAll('"', '""')}"`;
  const linhas = [
    ['Horario', 'Tensao_V', 'Pressao_PSI', 'Pressao_BAR'].map(escapar).join(','),
    ...dados.map((item) =>
      [item.horarioCompleto, item.tensao, item.pressaoPsi, item.pressaoBar]
        .map(escapar)
        .join(','),
    ),
  ];
  const blob = new Blob([`\uFEFF${linhas.join('\r\n')}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'historico_pressao.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
        const agora = new Date();
        const item = {
          horario: agora.toLocaleTimeString(),
          horarioCompleto: agora.toLocaleString(),
          tensao: Number(dados.tensao),
          pressaoPsi: Number(dados.pressaoPsi),
          pressaoBar: Number(dados.pressaoBar),
        };
        if (!Number.isFinite(item.pressaoPsi) || !Number.isFinite(item.pressaoBar)) {
          throw new Error('O ESP32 retornou valores de pressão inválidos.');
        }

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
    const intervalo = window.setInterval(buscarDados, 500);
    return () => {
      ativo = false;
      window.clearInterval(intervalo);
    };
  }, []);

  const formatar = (valor, casas) => (valor == null ? '--' : valor.toFixed(casas));

  return (
    <main className="page">
      <header className="topbar">
        <div>
          <p className="eyebrow">MONITORAMENTO EM TEMPO REAL</p>
          <h1>Sensor de Pressão Boyle-Mariotte</h1>
        </div>
        <span className={`connection ${online ? 'online' : ''}`}>
          <span className="connection-dot" />
          {online ? 'Conectado' : 'Reconectando'}
        </span>
      </header>

      <section className="readings" aria-label="Leituras atuais">
        <article className="reading psi">
          <span>Pressão</span>
          <strong>{formatar(leituraAtual?.pressaoPsi, 2)}</strong>
          <span className="unit">PSI</span>
        </article>
        <article className="reading bar">
          <span>Pressão</span>
          <strong>{formatar(leituraAtual?.pressaoBar, 3)}</strong>
          <span className="unit">BAR</span>
        </article>
        <article className="reading voltage">
          <span>Tensão do sensor</span>
          <strong>{formatar(leituraAtual?.tensao, 2)}</strong>
          <span className="unit">V</span>
        </article>
      </section>

      <div className="section-heading">
        <div>
          <h2>Histórico da sessão</h2>
          <p>Exibindo os últimos {maxPontosGrafico} pontos no gráfico</p>
        </div>
        <button
          className="download"
          type="button"
          onClick={() => exportarCsv(historico)}
          disabled={historico.length === 0}
        >
          Baixar CSV
        </button>
      </div>

      <div className="charts">
        <CartaoGrafico
          titulo="Pressão em PSI"
          unidade="PSI"
          dados={historico.map((item) => ({ horario: item.horario, valor: item.pressaoPsi }))}
          cor="#61a8ff"
          fundo="rgba(97,168,255,0.13)"
        />
        <CartaoGrafico
          titulo="Pressão em BAR"
          unidade="BAR"
          dados={historico.map((item) => ({ horario: item.horario, valor: item.pressaoBar }))}
          cor="#42d6b0"
          fundo="rgba(66,214,176,0.13)"
        />
      </div>
      <footer>{historico.length} leituras coletadas desde a abertura desta página</footer>
    </main>
  );
}
