"""
Módulo para persistência de dados em arquivo CSV.
"""

from pathlib import Path
from typing import Optional, TextIO
import csv
import sys

from medidor_pressao.models import LeituraPressao


class CSVLogger:
    """Gerencia a gravação em disco das leituras de pressão em formato CSV."""

    CABECALHO = ["Horario", "Tensao_V", "Pressao_PSI", "Pressao_BAR"]

    def __init__(self, caminho_arquivo: Path | str):
        self.caminho_arquivo = Path(caminho_arquivo)
        self._arquivo: Optional[TextIO] = None
        self._escritor = None

    def abrir(self) -> None:
        """Abre o arquivo CSV no modo append e grava o cabeçalho se o arquivo for novo ou estiver vazio."""
        if self._arquivo is not None and not self._arquivo.closed:
            return

        # Garante que o diretório pai exista
        if self.caminho_arquivo.parent:
            self.caminho_arquivo.parent.mkdir(parents=True, exist_ok=True)

        deve_escrever_cabecalho = (
            not self.caminho_arquivo.exists()
            or self.caminho_arquivo.stat().st_size == 0
        )

        self._arquivo = open(
            self.caminho_arquivo,
            mode="a",
            newline="",
            encoding="utf-8"
        )
        self._escritor = csv.writer(self._arquivo)

        if deve_escrever_cabecalho:
            self._escritor.writerow(self.CABECALHO)
            self._arquivo.flush()

    def registrar(self, leitura: LeituraPressao) -> None:
        """Grava uma leitura no arquivo CSV e descarrega o buffer em disco."""
        if self._arquivo is None or self._arquivo.closed or self._escritor is None:
            self.abrir()

        self._escritor.writerow(leitura.to_csv_row())
        if self._arquivo:
            self._arquivo.flush()

    def fechar(self) -> None:
        """Fecha o arquivo com segurança."""
        if self._arquivo is not None and not self._arquivo.closed:
            try:
                self._arquivo.flush()
                self._arquivo.close()
            except Exception as e:
                print(f"Erro ao fechar arquivo CSV: {e}", file=sys.stderr)
            finally:
                self._arquivo = None
                self._escritor = None

    def __enter__(self) -> "CSVLogger":
        self.abrir()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        self.fechar()
