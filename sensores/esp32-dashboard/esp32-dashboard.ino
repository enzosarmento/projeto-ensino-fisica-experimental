#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include "Dashboard.h" 
#include <DHT.h>

const char* ssid = "dashboard_fisic a_experimental";
const char* password = "teste123"; 

AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

// --- 1. CONFIGURAÇÃO DO DHT22 (Temperatura e Umidade) ---
#define DHTPIN 4 
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// --- 2. CONFIGURAÇÃO DO HC-SR04 (Distância) ---
#define TRIG_PIN 19
#define ECHO_PIN 18

// Temporizadores
unsigned long ultimoEnvioWS = 0;
unsigned long ultimaLeituraDHT = 0;
unsigned long ultimaLeituraUS = 0;

// Variáveis Globais
float tempReal = 0.0;
float humiReal = 0.0;
float distReal = 0.0;

void setup() {
  Serial.begin(115200);
  
  dht.begin();
  pinMode(TRIG_PIN, OUTPUT);
  
  pinMode(ECHO_PIN, INPUT_PULLDOWN); 

  WiFi.mode(WIFI_AP);
  WiFi.softAP(ssid, password);
  
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send_P(200, "text/html", (const uint8_t*)dashboard_html, sizeof(dashboard_html) - 1);
  });

  server.addHandler(&ws);
  server.begin();
}

void loop() {
  ws.cleanupClients();
  
  // --- LEITURA DO DHT22 (A cada 2 segundos) ---
  if (millis() - ultimaLeituraDHT > 2000) {
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    
    // Só atualiza se a leitura for válida
    if (!isnan(t) && !isnan(h)) {
      tempReal = t;
      humiReal = h;
    }
    ultimaLeituraDHT = millis();
  }

  // --- LEITURA DO HC-SR04 COM VERIFICAÇÃO ---
  if (millis() - ultimaLeituraUS > 50) {
    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2);
    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);

    // Espera até 30ms pelo retorno. 
    long duration = pulseIn(ECHO_PIN, HIGH, 30000); 
    
    if (duration == 0) {
      // Se duration for 0, o sinal nunca voltou.
      // Isso significa que o sensor ESTÁ DESCONECTADO (ou o obstáculo está longe demais).
      distReal = 0.0; 
    } else {
      float calcDist = (duration * 0.0343) / 2.0; 
      
      // Filtro de hardware: O HC-SR04 físico só mede até ~400cm de forma confiável.
      if (calcDist >= 2.0 && calcDist <= 400.0) {
        distReal = calcDist;
      } else {
        // Se der 3000cm, por exemplo, é ruído. Ignora.
        distReal = 0.0;
      }
    }
    ultimaLeituraUS = millis();
  }

  // --- ENVIO PARA O DASHBOARD (A cada 100ms) ---
  if (millis() - ultimoEnvioWS > 100) {

    String payload = "{\"sensors\": [";
    payload += "{\"id\":\"temp_1\", \"name\":\"Temperatura\", \"value\":" + String(tempReal, 1) + ", \"unit\":\"°C\", \"color\":\"#3498db\"},";
    payload += "{\"id\":\"hum_1\", \"name\":\"Umidade\", \"value\":" + String(humiReal, 1) + ", \"unit\":\"%\", \"color\":\"#9b59b6\"},";
    payload += "{\"id\":\"dist_1\", \"name\":\"Distância\", \"value\":" + String(distReal, 2) + ", \"unit\":\"cm\", \"color\":\"#f1c40f\"}";
    payload += "]}";
    
    ws.textAll(payload);
    ultimoEnvioWS = millis();
  }
}