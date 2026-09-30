#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include "Dashboard.h" 
#include <Wire.h>
#include <BH1750.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

const char* ssid = "sensores-fisica-experimental";
const char* password = "teste123"; 

AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

#define TRIG_PIN 19   
#define ECHO_PIN 18   

BH1750 lightMeter;
Adafruit_MPU6050 mpu;

unsigned long ultimoEnvioWS = 0;
unsigned long ultimaLeituraSensores = 0;
unsigned long ultimaLeituraUS = 0;
unsigned long ultimaLeituraMPU = 0;

float distReal = 0.0;
float luxReal = 0.0;
float aX = 0, aY = 0, aZ = 0;
float gX = 0, gY = 0, gZ = 0;

void setup() {
  Serial.begin(115200);
  Wire.begin();
  
  // Inicializa BH1750
  if (lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, 0x23)) {
    Serial.println(F("BH1750 iniciado!"));
  } else {
    Serial.println(F("Erro BH1750"));
  }

  // Inicializa MPU6050 (Endereço padrão 0x68)
  if (mpu.begin()) {
    Serial.println(F("MPU6050 iniciado!"));
    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  } else {
    Serial.println(F("Erro MPU6050"));
  }

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT_PULLDOWN); 

  WiFi.mode(WIFI_AP);
  WiFi.softAP(ssid, password);
  
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send_P(200, "text/html", (const uint8_t*)dashboard_html, sizeof(dashboard_html) - 1);
  });

  server.addHandler(&ws);
  server.begin();
  
  Serial.println("Servidor Web Iniciado!");
  Serial.print("Conecte no Wi-Fi: ");
  Serial.println(ssid);
  Serial.print("Acesse o Dashboard no IP: ");
  Serial.println(WiFi.softAPIP());
}

void loop() {
  ws.cleanupClients();
  
  // --- LEITURA LENTA: BH1750 (A cada 2 segundos) ---
  if (millis() - ultimaLeituraSensores > 2000) {
    luxReal = lightMeter.readLightLevel();
    ultimaLeituraSensores = millis();
  }

  // --- LEITURA MÉDIA: MPU6050 (A cada 100ms) ---
  if (millis() - ultimaLeituraMPU > 100) {
    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);
    
    // Filtra ruídos próximos de zero para melhor visualização no gráfico
    aX = abs(a.acceleration.x) < 0.05 ? 0 : a.acceleration.x;
    aY = abs(a.acceleration.y) < 0.05 ? 0 : a.acceleration.y;
    aZ = a.acceleration.z; // O eixo Z naturalmente marcará ~9.8 m/s² devido à gravidade
    
    gX = g.gyro.x;
    gY = g.gyro.y;
    gZ = g.gyro.z;
    
    ultimaLeituraMPU = millis();
  }

  // --- LEITURA RÁPIDA: HC-SR04 (A cada 50ms) ---
  if (millis() - ultimaLeituraUS > 50) {
    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2);
    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);

    long duration = pulseIn(ECHO_PIN, HIGH, 30000); 
    if (duration == 0) {
      distReal = 0.0; 
    } else {
      float calcDist = (duration * 0.0343) / 2.0; 
      if (calcDist >= 2.0 && calcDist <= 400.0) {
        distReal = calcDist;
      } else {
        distReal = 0.0;
      }
    }
    ultimaLeituraUS = millis();
  }

  // --- ENVIO PARA O DASHBOARD (A cada 100ms) ---
  if (millis() - ultimoEnvioWS > 100) {
    String payload = "{\"sensors\": [";
    payload += "{\"id\":\"lux_1\", \"name\":\"Luminosidade\", \"value\":" + String(luxReal, 1) + ", \"unit\":\"lx\", \"color\":\"#f39c12\"},";
    payload += "{\"id\":\"dist_1\", \"name\":\"Distância\", \"value\":" + String(distReal, 2) + ", \"unit\":\"cm\", \"color\":\"#9b59b6\"},";
    
    // Aceleração
    payload += "{\"id\":\"accel_x\", \"name\":\"Acel. X\", \"value\":" + String(aX, 2) + ", \"unit\":\"m/s²\", \"color\":\"#e74c3c\"},";
    payload += "{\"id\":\"accel_y\", \"name\":\"Acel. Y\", \"value\":" + String(aY, 2) + ", \"unit\":\"m/s²\", \"color\":\"#c0392b\"},";
    payload += "{\"id\":\"accel_z\", \"name\":\"Acel. Z\", \"value\":" + String(aZ, 2) + ", \"unit\":\"m/s²\", \"color\":\"#d35400\"},";
    
    // Giroscópio
    payload += "{\"id\":\"gyro_x\", \"name\":\"Giro. X\", \"value\":" + String(gX, 2) + ", \"unit\":\"rad/s\", \"color\":\"#2980b9\"},";
    payload += "{\"id\":\"gyro_y\", \"name\":\"Giro. Y\", \"value\":" + String(gY, 2) + ", \"unit\":\"rad/s\", \"color\":\"#3498db\"},";
    payload += "{\"id\":\"gyro_z\", \"name\":\"Giro. Z\", \"value\":" + String(gZ, 2) + ", \"unit\":\"rad/s\", \"color\":\"#1abc9c\"}";
    
    payload += "]}";
    
    ws.textAll(payload);
    ultimoEnvioWS = millis();
  }
}