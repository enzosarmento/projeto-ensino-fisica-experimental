"""
Modelo de dados para leituras de pressão enviadas pelo sensor/Arduino.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass(frozen=True)
class LeituraPressao:
    """Representa uma leitura individual de pressão e tensão do sensor."""
    horario: str
    tensao: float
    pressao_psi: float
    pressao_bar: float

    @classmethod
    def from_csv_line(cls, linha: str, horario: Optional[str] = None) -> Optional["LeituraPressao"]:
        """
        Converte uma linha de texto no formato 'tensao,pressao_psi,pressao_bar' em um objeto LeituraPressao.
        Retorna None se a linha for inválida ou uma mensagem de texto do Arduino.
        """
        if not linha:
            return None

        partes = linha.strip().split(",")
        if len(partes) != 3:
            return None

        try:
            tensao = float(partes[0].strip())
            pressao_psi = float(partes[1].strip())
            pressao_bar = float(partes[2].strip())
            
            timestamp = horario if horario is not None else datetime.now().strftime("%H:%M:%S")
            return cls(
                horario=timestamp,
                tensao=tensao,
                pressao_psi=pressao_psi,
                pressao_bar=pressao_bar,
            )
        except (ValueError, TypeError):
            return None

    def to_csv_row(self) -> list[str]:
        """Converte a leitura em uma lista de strings pronta para gravação em CSV."""
        return [self.horario, f"{self.tensao:.2f}", f"{self.pressao_psi:.1f}", f"{self.pressao_bar:.2f}"]

    def __str__(self) -> str:
        return (
            f"[{self.horario}] Tensão: {self.tensao:5.2f} V | "
            f"Pressão: {self.pressao_psi:5.1f} PSI ({self.pressao_bar:5.2f} BAR)"
        )
