# Medidor de Pressão (Arduino + Python)

Sistema modular em Python para aquisição, registro em arquivo CSV e visualização gráfica em tempo real dos dados de pressão coletados por um sensor acoplado ao Arduino.

---

## 📁 Estrutura do Projeto

```text
medidor-pressao/
├── main.py                     # Ponto de entrada principal da aplicação (CLI com argparse)
├── coleta_dados.py             # Script de entrada para retrocompatibilidade
├── requirements.txt            # Dependências Python (pyserial, matplotlib)
├── historico_pressao.csv       # Histórico de leituras gravadas
├── medidor-pressao.ino         # Código C++ / Arduino para leitura do sensor e LCD
│
└── medidor_pressao/            # Pacote modular da aplicação
    ├── __init__.py             # Exportações principais do pacote
    ├── config.py               # Classe de configuração (Config)
    ├── models.py               # Modelo de dados (LeituraPressao)
    ├── serial_client.py        # Comunicação serial (SerialReader)
    ├── csv_logger.py           # Persistência em disco e tratamento seguro de cabeçalho
    ├── dashboard.py            # Interface gráfica e animação em tempo real (Matplotlib)
    └── app.py                  # Orquestração do ciclo de vida da aplicação
```

---

## 🚀 Como Executar

### 1. Pré-requisitos e Instalação

Certifique-se de que as dependências estão instaladas:

```bash
pip install -r requirements.txt
```

### 2. Execução Padrão

Para rodar conectando à porta serial padrão (`/dev/ttyACM0` a `9600` baud):

```bash
python main.py
```

### 3. Opções e Parâmetros (CLI)

O script aceita parâmetros de linha de comando para customização:

| Parâmetro | Descrição | Padrão |
|---|---|---|
| `-p`, `--porta` | Porta serial do Arduino (ex: `/dev/ttyACM0`, `/dev/ttyUSB0`, `COM3`) | `/dev/ttyACM0` |
| `-b`, `--baud` | Velocidade de comunicação (baud rate) | `9600` |
| `-o`, `--csv` | Caminho do arquivo CSV de histórico | `historico_pressao.csv` |
| `-m`, `--max-pontos` | Quantidade máxima de pontos no gráfico | `50` |
| `-i`, `--intervalo` | Intervalo de atualização gráfica (ms) | `300` |
| `--todas-leituras` | Registra todas as leituras (não apenas variações) | `False` |
| `--listar-portas` | Lista as portas seriais disponíveis e encerra | `False` |

#### Exemplos de Uso:

- **Listar portas disponíveis:**
  ```bash
  python main.py --listar-portas
  ```

- **Especificar outra porta serial ou velocidade:**
  ```bash
  python main.py --porta /dev/ttyUSB0 --baud 9600
  ```

- **Registrar em um arquivo CSV personalizado:**
  ```bash
  python main.py --csv ensaio_01.csv
  ```
