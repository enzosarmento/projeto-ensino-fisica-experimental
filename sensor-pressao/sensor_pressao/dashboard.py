"""
Módulo para visualização gráfica em tempo real usando Matplotlib.
"""

from collections import deque
from typing import Optional, Callable
import matplotlib.pyplot as plt
import matplotlib.animation as animation

from medidor_pressao.config import Config
from medidor_pressao.models import LeituraPressao
from medidor_pressao.serial_client import SerialReader
from medidor_pressao.csv_logger import CSVLogger


class DashboardPressao:
    """Painel de visualização gráfica da pressão em tempo real."""

    def __init__(
        self,
        config: Config,
        leitor: SerialReader,
        logger: Optional[CSVLogger] = None,
        on_leitura_registrada: Optional[Callable[[LeituraPressao], None]] = None,
    ):
        self.config = config
        self.leitor = leitor
        self.logger = logger
        self.on_leitura_registrada = on_leitura_registrada

        self.eixo_x = deque(maxlen=config.max_pontos)
        self.eixo_y_psi = deque(maxlen=config.max_pontos)
        self.contador_leituras = 0
        self.ultima_pressao_psi: Optional[float] = None

        self._configurar_grafico()

    def _configurar_grafico(self) -> None:
        """Configura a janela e os elementos visuais do gráfico."""
        self.fig, self.ax = plt.subplots(figsize=(10, 5))
        
        # Define o título da janela do Matplotlib se o backend suportar
        manager = plt.get_current_fig_manager()
        if manager and hasattr(manager, "set_window_title"):
            manager.set_window_title(self.config.titulo_janela)

        (self.linha_psi,) = self.ax.plot(
            [], [],
            color="#e74c3c",
            linewidth=2,
            marker="o",
            markersize=4,
            label="Pressão (PSI)"
        )

        self.ax.set_title("Monitoramento de Pressão em Tempo Real", fontsize=12, fontweight="bold")
        self.ax.set_xlabel("Amostras Registradas (Variações)" if self.config.apenas_variacoes else "Amostras")
        self.ax.set_ylabel("Pressão (PSI)")
        self.ax.grid(True, linestyle="--", alpha=0.6)
        self.ax.legend(loc="upper left")
        plt.tight_layout()

    def atualizar_frame(self, _frame: int):
        """Função chamada periodicamente pela animação para processar novas leituras."""
        houve_novo_ponto = False

        while self.leitor.dados_disponiveis():
            leitura = self.leitor.ler_leitura()
            if leitura is None:
                continue

            # Filtro: registra se for o primeiro ponto ou se a pressão mudou
            deve_registrar = (
                not self.config.apenas_variacoes
                or self.ultima_pressao_psi is None
                or leitura.pressao_psi != self.ultima_pressao_psi
            )

            if deve_registrar:
                self.ultima_pressao_psi = leitura.pressao_psi

                # 1. Salva no CSV
                if self.logger:
                    self.logger.registrar(leitura)

                # 2. Atualiza buffers do gráfico
                self.eixo_x.append(self.contador_leituras)
                self.eixo_y_psi.append(leitura.pressao_psi)
                self.contador_leituras += 1
                houve_novo_ponto = True

                # 3. Executa callback (ex.: log no terminal)
                if self.on_leitura_registrada:
                    self.on_leitura_registrada(leitura)
                else:
                    print(leitura)

        # Atualiza a renderização se houver pontos
        if houve_novo_ponto and len(self.eixo_x) > 0:
            self.linha_psi.set_data(list(self.eixo_x), list(self.eixo_y_psi))
            
            # Ajuste dinâmico do eixo X
            if len(self.eixo_x) > 1:
                self.ax.set_xlim(self.eixo_x[0], self.eixo_x[-1] + 1)
            else:
                self.ax.set_xlim(self.eixo_x[0] - 0.5, self.eixo_x[0] + 1.5)

            # Ajuste dinâmico do eixo Y com margem de segurança
            min_y = min(self.eixo_y_psi)
            max_y = max(self.eixo_y_psi)
            margem = self.config.margem_grafico
            if min_y == max_y:
                self.ax.set_ylim(max(0, min_y - margem), max_y + margem)
            else:
                self.ax.set_ylim(max(0, min_y - margem), max_y + margem)

        return (self.linha_psi,)

    def iniciar(self) -> None:
        """Inicia o loop de animação e exibe a interface gráfica."""
        self._ani = animation.FuncAnimation(
            self.fig,
            self.atualizar_frame,
            interval=self.config.intervalo_ms,
            blit=False,
            cache_frame_data=False,
        )
        plt.show()
