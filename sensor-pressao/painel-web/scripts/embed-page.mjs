import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(scriptDirectory, '..');
const htmlPath = resolve(projectDirectory, 'dist/index.html');
const headerPath = resolve(projectDirectory, '..', 'pagina_web.h');
const html = await readFile(htmlPath, 'utf8');
const delimiter = 'rawliteral';

if (html.includes(`)${delimiter}"`)) {
  throw new Error(`O HTML contém o delimitador C++ reservado: ${delimiter}`);
}

const header = `#pragma once

#include <Arduino.h>

const char pagina_html[] PROGMEM = R"${delimiter}(${html})${delimiter}";
`;

await writeFile(headerPath, header);
console.log(`Painel incorporado em ${headerPath}`);
