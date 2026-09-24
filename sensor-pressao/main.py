#!/usr/bin/env python3
"""
Ponto de entrada principal para a aplicação do Medidor de Pressão.
Permite executar via linha de comando com opções customizáveis.
"""

import argparse
import sys
from pathlib import Path

from medidor_pressao.config import Config
from medidor_pressao.serial_client import SerialReader
from medidor_pressao.app import executar_aplicacao


def criar_argument_parser() -> argparse.ArgumentParser:
    """Cria e configura o analisador de argumentos de linha de comando."""
    parser = argparse.ArgumentParser(
        description="Sistema de Monitoramento e Aquisição de Dados de Pressão (Arduino + Python).",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )

    parser.add_argument(
        "-p", "--porta",
        type=str,
        default="/dev/ttyACM0",
        help="Porta serial onde o Arduino está conectado (ex: /dev/ttyACM0, /dev/ttyUSB0, COM3)",
    )

    parser.add_argument(
        "-b", "--baud",
        type=int,
        default=9600,
        help="Velocidade de transmissão (baud rate)",
    )

    parser.add_argument(
        "-o", "--csv",
        type=Path,
        default=Path("historico_pressao.csv"),
        help="Caminho do arquivo CSV de saída para registro histórico",
    )

    parser.add_argument(
        "-m", "--max-pontos",
        type=int,
        default=50,
        help="Quantidade máxima de pontos visíveis na janela do gráfico",
    )

    parser.add_argument(
        "-i", "--intervalo",
        type=int,
        default=300,
        help="Intervalo de atualização do gráfico em milissegundos",
    )

    parser.add_argument(
        "--todas-leituras",
        action="store_true",
        help="Registra todas as leituras recebidas (por padrão registra apenas variações)",
    )

    parser.add_argument(
        "--listar-portas",
        action="store_true",
        help="Lista todas as portas seriais disponíveis no computador e encerra",
    )

    return parser


def main() -> None:
    parser = criar_argument_parser()
    args = parser.parse_args()

    if args.listar_portas:
        print("\n--- Portas Seriais Disponíveis no Sistema ---")
        portas = SerialReader.listar_portas()
        if not portas:
            print("Nenhuma porta serial detectada.")
        else:
            for porta, desc, hwid in portas:
                print(f"• {porta:<15} | {desc} [{hwid}]")
        print()
        sys.exit(0)

    config = Config(
        porta=args.porta,
        baud_rate=args.baud,
        arquivo_csv=args.csv,
        max_pontos=args.max_pontos,
        intervalo_ms=args.intervalo,
        apenas_variacoes=not args.todas_leituras,
    )

    executar_aplicacao(config)


if __name__ == "__main__":
    main()
