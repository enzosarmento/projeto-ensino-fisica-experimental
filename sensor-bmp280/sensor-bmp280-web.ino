#include <WiFi.h>
#include <WebServer.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BMP280.h>
#include <LiquidCrystal_I2C.h>

// Importa a página web que está na outra aba
#include "pagina_web.h" 

// ==========================================
// CONFIGURAÇÕES DA REDE WI-FI (MODO ACCESS POINT)
// ==========================================
const char* ssid = "sensor-bmp280";
const char* password = "teste123"; 

// Inicializa o Servidor Web na porta 80
WebServer server(80);

// Configura o LCD (Endereço 0x27) e o Sensor BMP280
LiquidCrystal_I2C lcd(0x27, 16, 2); 
Adafruit_BMP280 bmp;

// Variáveis globais para os dados e temporizador
float temperatura = 0.0;
float pressao = 0.0;
unsigned long tempoAnterior = 0;
const long intervalo = 2000; // Atualiza as leituras a cada 2 segundos (2000 ms)

// ==========================================
// ROTAS DO SERVIDOR WEB
// ==========================================
void enviarPaginaHtml() {
  // Envia o conteúdo da variável 'pagina_html' (que está no arquivo .h) para o navegador
  server.send_P(200, "text/html", pagina_html);
}

void enviarDadosJson() {
  // Cria o JSON com os dados reais para o React consumir
  String json = "{\"temperatura\": " + String(temperatura) + ", \"pressao\": " + String(pressao) + "}";
  server.send(200, "application/json", json);
}

// ==========================================
// SETUP - INICIALIZAÇÃO
// ==========================================
void setup() {
  Serial.begin(115200);

  // 1. Inicializa o LCD
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Criando Wi-Fi...");

  // 2. Inicializa o Sensor BMP280 (Endereço 0x76)
  if (!bmp.begin(0x76)) {
    Serial.println("Erro: BMP280 não encontrado!");
    lcd.clear();
    lcd.print("Erro Sensor!");
    while (1); // Trava o código se o sensor falhar
  }
  
  // Configuração recomendada de amostragem
  bmp.setSampling(Adafruit_BMP280::MODE_NORMAL,
                  Adafruit_BMP280::SAMPLING_X2,
                  Adafruit_BMP280::SAMPLING_X16,
                  Adafruit_BMP280::FILTER_X16,
                  Adafruit_BMP280::STANDBY_MS_500);

  // 3. Cria a própria rede Wi-Fi
  WiFi.softAP(ssid, password);
  IPAddress IP = WiFi.softAPIP(); // Geralmente é 192.168.4.1
  
  Serial.println("\n--- Rede Wi-Fi Criada ---");
  Serial.print("Nome da Rede: "); Serial.println(ssid);
  Serial.print("Senha: "); Serial.println(password);
  Serial.print("Endereço IP (Acesse no navegador): "); Serial.println(IP);

  // Mostra o IP no LCD para facilitar o acesso
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Rede Criada!");
  lcd.setCursor(0, 1);
  lcd.print(IP); 
  delay(3000); 

  // 4. Configura as respostas do Servidor Web
  server.on("/", enviarPaginaHtml);       // Quando acessar o IP, manda a página do React
  server.on("/dados", enviarDadosJson);   // Quando o React pedir, manda os dados do sensor
  server.begin();
  
  lcd.clear();
}

// ==========================================
// LOOP PRINCIPAL
// ==========================================
void loop() {
  // Mantém o servidor web ouvindo e respondendo aos navegadores conectados
  server.handleClient();

  // Verifica se já passaram 2 segundos desde a última leitura
  unsigned long tempoAtual = millis();
  if (tempoAtual - tempoAnterior >= intervalo) {
    tempoAnterior = tempoAtual;

    // Faz a leitura atualizada do sensor
    temperatura = bmp.readTemperature();
    pressao = bmp.readPressure() / 100.0F;

    // Atualiza as informações no display LCD
    lcd.setCursor(0, 0);
    lcd.print("Temp: ");
    lcd.print(temperatura);
    lcd.print(" C  "); 

    lcd.setCursor(0, 1);
    lcd.print("Pres: ");
    lcd.print(pressao);
    lcd.print(" hPa");
  }
}