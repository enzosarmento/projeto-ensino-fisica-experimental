"""
Módulo para comunicação com a porta serial (Arduino).
"""

from typing import Optional, List, Tuple
import time
import sys

import serial
import serial.tools.list_ports

from medidor_pressao.models import LeituraPressao


class SerialReader:
    """Gerencia a comunicação serial com a placa Arduino."""

    def __init__(self, porta: str = "/dev/ttyACM0", baud_rate: int = 9600, timeout: float = 1.0):
        self.porta = porta
        self.baud_rate = baud_rate
        self.timeout = timeout
        self._serial: Optional[serial.Serial] = None

    @staticmethod
    def listar_portas() -> List[Tuple[str, str, str]]:
        """Retorna uma lista de tuplas (porta, descricao, hwid) com as portas seriais disponíveis no sistema."""
        portas = serial.tools.list_ports.comports()
        return [(p.device, p.description, p.hwid) for p in portas]

    def abrir(self) -> None:
        """Abre a conexão com a porta serial e aguarda a reinicialização do Arduino."""
        if self._serial is not None and self._serial.is_open:
            return

        try:
            print(f"Conectando ao Arduino em {self.porta} (baud rate: {self.baud_rate})...")
            self._serial = serial.Serial(self.porta, self.baud_rate, timeout=self.timeout)
            # O Arduino reinicia ao abrir a conexão serial; aguarda a estabilização
            time.sleep(2.0)
            self._serial.reset_input_buffer()
            print("Conexão serial estabelecida com sucesso.")
        except serial.SerialException as e:
            portas_disponiveis = [p[0] for p in self.listar_portas()]
            msg_portas = ", ".join(portas_disponiveis) if portas_disponiveis else "nenhuma porta detectada"
            raise ConnectionError(
                f"Falha ao conectar na porta serial '{self.porta}': {e}\n"
                f"Portas disponíveis no sistema: {msg_portas}"
            ) from e

    def fechar(self) -> None:
        """Fecha a conexão serial."""
        if self._serial is not None:
            try:
                if self._serial.is_open:
                    self._serial.close()
                print("Conexão serial encerrada.")
            except Exception as e:
                print(f"Erro ao fechar porta serial: {e}", file=sys.stderr)
            finally:
                self._serial = None

    def dados_disponiveis(self) -> bool:
        """Verifica se há bytes no buffer de entrada da porta serial."""
        if self._serial is not None and self._serial.is_open:
            return self._serial.in_waiting > 0
        return False

    def ler_leitura(self) -> Optional[LeituraPressao]:
        """Lê uma linha da porta serial e a converte para LeituraPressao."""
        if self._serial is None or not self._serial.is_open:
            return None

        try:
            linha_bytes = self._serial.readline()
            if not linha_bytes:
                return None

            linha_texto = linha_bytes.decode("utf-8", errors="replace").strip()
            return LeituraPressao.from_csv_line(linha_texto)
        except Exception:
            return None

    def __enter__(self) -> "SerialReader":
        self.abrir()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        self.fechar()
