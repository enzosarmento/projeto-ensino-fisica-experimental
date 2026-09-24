"""
Configurações da aplicação do Medidor de Pressão.
"""

from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class Config:
    """Configurações gerais para comunicação serial, logging e visualização."""
    porta: str = "/dev/ttyACM0"
    baud_rate: int = 9600
    timeout_serial: float = 1.0
    arquivo_csv: Path = field(default_factory=lambda: Path("historico_pressao.csv"))
    max_pontos: int = 50
    intervalo_ms: int = 300
    apenas_variacoes: bool = True
    margem_grafico: float = 3.0
    titulo_janela: str = "Painel de Pressão - Monitoramento em Tempo Real"
