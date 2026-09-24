"""
Orquestrador da aplicação de medição de pressão.
"""

import sys
from medidor_pressao.config import Config
from medidor_pressao.serial_client import SerialReader
from medidor_pressao.csv_logger import CSVLogger
from medidor_pressao.dashboard import DashboardPressao


def executar_aplicacao(config: Config) -> None:
    """
    Inicializa todos os componentes (leitor serial, gravador CSV e dashboard)
    e executa o ciclo de vida da aplicação com encerramento seguro de recursos.
    """
    leitor = SerialReader(
        porta=config.porta,
        baud_rate=config.baud_rate,
        timeout=config.timeout_serial
    )
    logger = CSVLogger(caminho_arquivo=config.arquivo_csv)

    print("=" * 60)
    print("      SISTEMA DE MONITORAMENTO DE PRESSÃO")
    print("=" * 60)
    print(f"Porta Serial:     {config.porta} @ {config.baud_rate} bps")
    print(f"Arquivo CSV:      {config.arquivo_csv}")
    print(f"Janela de pontos: {config.max_pontos}")
    print(f"Intervalo:        {config.intervalo_ms} ms")
    print(f"Filtro:           {'Apenas variações de pressão' if config.apenas_variacoes else 'Todas as leituras'}")
    print("=" * 60)

    try:
        # Abre recursos
        logger.abrir()
        leitor.abrir()

        # Cria e inicia o dashboard
        dashboard = DashboardPressao(
            config=config,
            leitor=leitor,
            logger=logger,
            on_leitura_registrada=lambda l: print(f"-> {l}"),
        )

        print("\nJanela gráfica aberta. Pressione Ctrl+C ou feche a janela para sair.")
        dashboard.iniciar()

    except KeyboardInterrupt:
        print("\nInterrupção solicitada pelo usuário (Ctrl+C).")
    except ConnectionError as e:
        print(f"\n[ERRO DE CONEXÃO] {e}", file=sys.stderr)
    except Exception as e:
        print(f"\n[ERRO INESPERADO] {e}", file=sys.stderr)
    finally:
        print("\nEncerrando recursos e salvando arquivos...")
        logger.fechar()
        leitor.fechar()
        print("Finalização concluída com sucesso.")
