# Godinez MedLens - One Pager
## Lentes AI para Documentacion Medica

---

## PRODUCTO MVP (1 mes)

**Lentes inteligentes para documentacion de consultas medicas**

Sin quirofano. Sin FDA. Sin HIPAA (datos locales).

---

## PROPUESTA DE VALOR

El doctor dice "Godinez, documenta" y los lentes:

1. Toman foto/video de la consulta
2. Transcriben la conversacion
3. Generan nota medica automatica
4. Sync a su dispositivo (local, no cloud)

**Dolor que resuelve:** Doctores pierden 2-3 hrs/dia documentando. Esto lo reduce a 5 minutos de revision.

---

## HARDWARE (BOM: $40 USD)

| Componente | Funcion | Costo |
|------------|---------|-------|
| ESP32-CAM | Cerebro + camara | $8 |
| OLED 0.96" | Preview/status | $5 |
| Bateria LiPo 500mAh | 3-4 hrs uso | $6 |
| Cargador USB-C | Carga estandar | $3 |
| Microfono I2S | Audio consultas | $4 |
| Frame 3D print | Estructura | $9 |
| Ensamblaje | QA basico | $5 |
| **TOTAL** | | **$40** |

---

## MODELO DE NEGOCIO

### Precio al Doctor

| Concepto | Precio |
|----------|--------|
| Lentes (one-time) | $149 USD |
| Mensualidad Godinez | $99/mes |

### Margenes

| Concepto | Costo | Venta | Margen |
|----------|-------|-------|--------|
| Hardware | $40 | $149 | $109 (73%) |
| Software | $10/mes | $99/mes | $89/mes (90%) |

### Revenue Share Agencia (Frutero)

- Hardware: 35% = **$38/unidad**
- Mensualidad: 25% = **$25/mes/doctor**

---

## PROYECCION

| Doctores | Hardware (1x) | MRR | Agencia/mes |
|----------|---------------|-----|-------------|
| 10 | $1,490 | $990 | $630 |
| 50 | $7,450 | $4,950 | $3,150 |
| 100 | $14,900 | $9,900 | $6,300 |
| 500 | $74,500 | $49,500 | $31,500 |

---

## ALCANCE 1 MES

### Semana 1-2: Hardware
- Ensamblar 5 prototipos
- Firmware basico (foto, video, audio)
- Sync por WiFi a app movil

### Semana 3: Software
- App movil simple (galeria + sync)
- Integracion Godinez API (transcripcion + nota medica)
- Prompts especializados medicina

### Semana 4: Validacion
- 3-5 doctores beta testers
- Iterar segun feedback
- Ajustar prompts medicos

---

## LIMITACIONES MVP (Conscientes)

| No incluye | Por que |
|------------|---------|
| Uso en quirofano | Requiere certificacion |
| Cloud storage | Evita HIPAA por ahora |
| Integracion EMR | Complejidad, fase 2 |
| Bateria >4hrs | Limitacion ESP32 |
| Video HD | Camara basica OV2640 |

---

## SIGUIENTE FASE (Mes 2-3)

Si valida:

1. Upgrade camara (5MP+)
2. Cloud con encriptacion E2E
3. Integracion basica EMR (exportar PDF)
4. Diseno industrial (no parecer prototipo)
5. Bateria 8hrs

---

## GO-TO-MARKET

**Target inicial:** Medicos generales / consultorios privados en CDMX

**Canal:**
- Contacto directo (conocidos)
- LinkedIn medicos
- Conferencias medicas locales

**Pitch:** "Documenta tus consultas con la voz, el AI hace el resto"

---

## SIGUIENTE PASO

1. Validar interes con 5 doctores (pagarian $99/mes?)
2. Si si -> ensamblar prototipos
3. Beta cerrada 1 mes
4. Iteracion -> lanzamiento

---

*Generado: 2026-03-28 | Godinez x Frutero*
