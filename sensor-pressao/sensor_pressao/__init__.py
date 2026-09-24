"""
Pacote de monitoramento e aquisição de dados do Medidor de Pressão.
"""

from medidor_pressao.config import Config
from medidor_pressao.models import LeituraPressao
from medidor_pressao.serial_client import SerialReader
from medidor_pressao.csv_logger import CSVLogger
from medidor_pressao.dashboard import DashboardPressao
from medidor_pressao.app import executar_aplicacao

__version__ = "1.0.0"
__all__ = [
    "Config",
    "LeituraPressao",
    "SerialReader",
    "CSVLogger",
    "DashboardPressao",
    "executar_aplicacao",
]
