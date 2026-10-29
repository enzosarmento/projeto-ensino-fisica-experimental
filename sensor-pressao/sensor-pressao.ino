#include <WiFi.h>
#include <WebServer.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

#include "pagina_web.h"

const char* ssid = "sensor-pressao-boyle-mariotte";
const int pinoSensor = 34;  // GPIO34 pertence ao ADC1 e funciona com o Wi-Fi ativo.
const float pressaoMaxPsi = 30.0f;
const float tensaoMinSensor = 0.5f;
const float tensaoMaxSensor = 4.5f;
const float resistorSuperior = 10000.0f;
const float resistorInferior = 20000.0f;
const unsigned long intervaloLeituraMs = 300;

WebServer server(80);
LiquidCrystal_I2C lcd(0x3F, 16, 2);

float tensaoSensor = 0.0f;
float pressaoPsi = 0.0f;
float pressaoBar = 0.0f;
unsigned long tempoAnterior = 0;

void enviarPagina() {
  server.sendHeader("Cache-Control", "no-store");
  server.send_P(200, "text/html; charset=utf-8", pagina_html);
}

void enviarDados() {
  char json[128];
  snprintf(
      json,
      sizeof(json),
      "{\"tensao\":%.3f,\"pressaoPsi\":%.2f,\"pressaoBar\":%.3f,\"tempoMs\":%lu}",
      tensaoSensor,
      pressaoPsi,
      pressaoBar,
      millis());
  server.sendHeader("Cache-Control", "no-store");
  server.send(200, "application/json; charset=utf-8", json);
}

void enviarNaoEncontrado() {
  server.send(404, "text/plain; charset=utf-8", "Rota nao encontrada");
}

void atualizarLeitura() {
  uint32_t somaTensaoAdcMv = 0;
  for (int i = 0; i < 10; i++) {
    somaTensaoAdcMv += analogReadMilliVolts(pinoSensor);
    delay(2);
  }

  const float tensaoAdc = (somaTensaoAdcMv / 10.0f) / 1000.0f;
  const float fatorDivisor = resistorInferior / (resistorSuperior + resistorInferior);
  tensaoSensor = tensaoAdc / fatorDivisor;

  if (tensaoSensor <= tensaoMinSensor) {
    pressaoPsi = 0.0f;
  } else {
    const float tensaoLimitada = constrain(tensaoSensor, tensaoMinSensor, tensaoMaxSensor);
    pressaoPsi = (tensaoLimitada - tensaoMinSensor) *
                 (pressaoMaxPsi / (tensaoMaxSensor - tensaoMinSensor));
  }
  pressaoBar = pressaoPsi * 0.0689476f;

  char linha[17];
  snprintf(linha, sizeof(linha), "Press: %5.1f PSI", pressaoPsi);
  lcd.setCursor(0, 0);
  lcd.print(linha);
  lcd.setCursor(0, 1);
  snprintf(linha, sizeof(linha), "Press: %5.2f BAR", pressaoBar);
  lcd.print(linha);

  // Mantem compatibilidade com o coletor serial existente.
  Serial.print(tensaoSensor, 2);
  Serial.print(",");
  Serial.print(pressaoPsi, 1);
  Serial.print(",");
  Serial.println(pressaoBar, 2);
}

void setup() {
  Serial.begin(9600);
  analogReadResolution(12);
  analogSetPinAttenuation(pinoSensor, ADC_11db);
  Wire.begin(21, 22);

  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Inicializando...");

  WiFi.mode(WIFI_AP);
  if (!WiFi.softAP(ssid)) {
    Serial.println("Erro ao criar a rede Wi-Fi.");
    lcd.clear();
    lcd.print("Erro no Wi-Fi!");
    while (true) {
      delay(1000);
    }
  }

  server.on("/", HTTP_GET, enviarPagina);
  server.on("/dados", HTTP_GET, enviarDados);
  server.onNotFound(enviarNaoEncontrado);
  server.begin();

  const IPAddress ip = WiFi.softAPIP();
  Serial.println("--- Rede Wi-Fi criada ---");
  Serial.print("Rede: ");
  Serial.println(ssid);
  Serial.print("Acesse: http://");
  Serial.println(ip);

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Wi-Fi: ");
  lcd.print(ssid);
  lcd.setCursor(0, 1);
  lcd.print(ip);
  delay(2500);
  lcd.clear();
}

void loop() {
  server.handleClient();

  const unsigned long agora = millis();
  if (agora - tempoAnterior >= intervaloLeituraMs) {
    tempoAnterior = agora;
    atualizarLeitura();
  }
}
