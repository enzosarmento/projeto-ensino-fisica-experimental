# Sensor de Pressão Boyle-Mariotte (ESP32 + React)

O ESP32 lê um sensor de pressão, exibe PSI e BAR em um LCD I2C e cria uma rede Wi-Fi própria com um painel React. O painel mostra as leituras em gráficos em tempo real e permite baixar em CSV os dados coletados enquanto a página está aberta. O firmware também mantém a saída serial CSV para uso com o coletor Python existente.

---

## 📁 Estrutura do Projeto

```text
medidor-pressao/
├── main.py                     # Ponto de entrada principal da aplicação (CLI com argparse)
├── coleta_dados.py             # Script de entrada para retrocompatibilidade
├── requirements.txt            # Dependências Python (pyserial, matplotlib)
├── historico_pressao.csv       # Histórico de leituras gravadas
├── sensor-pressao.ino          # Firmware ESP32: sensor, LCD, ponto de acesso e API
├── pagina_web.h                # Painel React compilado, servido pelo ESP32
├── painel-web/                 # Código-fonte do painel React
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

### Painel React servido pelo ESP32

1. Instale o Node.js e entre na pasta do painel:
   ```bash
   cd painel-web
   npm install
   npm run build:esp32
   ```
   O comando compila o painel como um único HTML e atualiza `pagina_web.h`, incluído pelo firmware.
2. No Arduino IDE, instale a biblioteca `LiquidCrystal_I2C`, selecione uma placa ESP32 e carregue `sensor-pressao.ino`.
3. Conecte-se à rede Wi-Fi aberta `sensor-pressao-boyle-mariotte` e acesse `http://192.168.4.1`.

#### Ligação do sensor e do LCD

- O firmware usa o GPIO34 (ADC1), SDA no GPIO21 e SCL no GPIO22.
- Para um sensor com saída de 0,5 a 4,5 V, use um divisor resistivo: 10 kΩ entre a saída do sensor e o GPIO34; 20 kΩ entre o GPIO34 e GND. Una os GNDs do sensor e do ESP32. Essa divisão reduz 4,5 V para cerca de 3,0 V, dentro da faixa do ADC.
- **Não conecte uma saída de 5 V diretamente ao ESP32.** O fator de divisão e a faixa de 0,5–4,5 V devem corresponder ao sensor utilizado.
- Alimente o LCD conforme o módulo. Se o adaptador I2C tiver pull-ups para 5 V, use um conversor de nível lógico ou pull-ups para 3,3 V nas linhas SDA/SCL.

O CSV baixado pelo painel contém horário local, tensão do sensor, pressão em PSI e pressão em BAR. Os registros ficam no navegador enquanto a página estiver aberta; não são armazenados permanentemente no ESP32. A saída serial permanece em `tensão,pressão_psi,pressão_bar`, a 9600 baud.

### Coletor Python opcional

Para coletar pela porta serial padrão (`/dev/ttyACM0` a `9600` baud):

```bash
python main.py
```

### 3. Opções e Parâmetros (CLI)

O script aceita parâmetros de linha de comando para customização:

| Parâmetro | Descrição | Padrão |
|---|---|---|
| `-p`, `--porta` | Porta serial do ESP32 (ex: `/dev/ttyACM0`, `/dev/ttyUSB0`, `COM3`) | `/dev/ttyACM0` |
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

- **Especificar outra porta serial:**
  ```bash
  python main.py --porta /dev/ttyUSB0 --baud 9600
  ```

- **Registrar em um arquivo CSV personalizado:**
  ```bash
  python main.py --csv ensaio_01.csv
  ```
