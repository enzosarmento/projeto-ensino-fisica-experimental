#include <Wire.h>
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x3F, 16, 2);

const int pinoSensor = A0; 
const float pressaoMax_PSI = 30.0; // Facilita a calibração se trocar de sensor

void setup() {
  Serial.begin(9600);

  lcd.init();          
  lcd.backlight();     
  
  lcd.setCursor(0, 0);
  lcd.print("  SISTEMA  DE  ");
  lcd.setCursor(0, 1);
  lcd.print("    PRESSAO    ");
  
  Serial.println("--- Sistema de Leitura de Pressao Inicializado ---");
  
  delay(2000);
  lcd.clear();
}

void loop() {
  // 1. Leitura com média móvel simples
  long somaADC = 0;
  for (int i = 0; i < 10; i++) {
    somaADC += analogRead(pinoSensor);
    delay(2);
  }
  
  float leituraADC = somaADC / 10.0;
  float tensao = leituraADC * (5.0 / 1024.0); 
  
  // 2. Calcula a pressão 
  float pressaoPsi = 0.0;
  if (tensao >= 0.5) {
    // Usando 30.0 como pressão máxima (que alinhou com o seu manômetro)
    pressaoPsi = (tensao - 0.5) * (pressaoMax_PSI / 4.0); 
  }
  float pressaoBar = pressaoPsi * 0.0689476;

  // 3. Atualiza Display LCD 
  lcd.setCursor(0, 0);
  lcd.print("Press: ");
  lcd.print(pressaoPsi, 1);
  lcd.print(" PSI   "); 

  lcd.setCursor(0, 1);
  lcd.print("Press: ");
  lcd.print(pressaoBar, 2);
  lcd.print(" BAR   ");

  // 4. Envia os dados no formato CSV (Para o script Python)
  Serial.print(tensao, 2);
  Serial.print(",");
  Serial.print(pressaoPsi, 1);
  Serial.print(",");
  Serial.println(pressaoBar, 2);

  delay(300); 
}