---
title: Creator Micro 2 · evoluzione del firmware
lang: it
client: Work Louder · Canada
role: Sviluppatore firmware
year: Da dicembre 2025
summary: "Ho rimesso ordine nel firmware ESP32 di Creator Micro 2, riscrivendo le librerie condivise per comunicazioni USB/BLE, sincronizzazione con Input e gestione della batteria. Lo sviluppo principale è concluso; il prodotto resta in manutenzione e continua a ricevere nuove funzionalità."
tags: [ESP32, ESP-IDF, C/C++, BLE, NimBLE, TinyUSB, RPC]
color: violet
accent: Comunicazioni BLE/USB · librerie condivise
metrics:
  - { k: Prodotto, v: Creator Micro 2 }
  - { k: Intervento, v: Evoluzione di firmware esistente }
  - { k: Stato, v: Completato · manutenzione e aggiornamenti }
---

## Un prodotto già in uso

Creator Micro 2 è un macropad configurabile con tasti, un encoder, joystick, illuminazione RGB e connettività USB e Bluetooth. Il dispositivo comunica anche con **Input**, il configuratore desktop di Work Louder, per sincronizzare profili, azioni e dati.

Quando sono entrato nel progetto, Creator Micro 2 era già nelle mani degli utenti. Non potevo trattare il firmware come un prototipo: ogni modifica doveva rispettare configurazioni e comportamenti esistenti, ma anche togliere di mezzo i problemi che rendevano più difficile costruire nuove funzioni.

![Creator Micro 2](/work/creator-micro-2/product.webp)

_Immagine del prodotto: [Work Louder, pagina ufficiale di Creator Micro 2](https://worklouder.cc/creator-micro-2)._

## Rimettere ordine nelle comunicazioni

Il lavoro più delicato è stato riscrivere la libreria di comunicazione condivisa con gli altri prodotti Work Louder. Il codice precedente concentrava nello stesso punto selezione del canale, pairing, riconnessione e invio dei dati; quando gli eventi si sovrapponevano, capire lo stato reale del dispositivo diventava lento e fragile.

Ho separato le responsabilità e reso espliciti i passaggi tra USB e Bluetooth. Ora il firmware sa quale collegamento è attivo, che cosa deve essere disconnesso e quando può riprendere a inviare input. In questo modo ho eliminato diversi casi in cui il dispositivo poteva restare in uno stato intermedio o continuare a usare il canale precedente.

Ho rivisto anche lo stack BLE e il protocollo RPC utilizzato da Input. Le operazioni più frequenti fanno meno lavoro, mentre le richieste ravvicinate vengono gestite senza dipendere da una sequenza ideale degli eventi.

Poiché queste librerie sono condivise, il risultato non è rimasto confinato a Creator Micro 2: è diventato una base più solida per le comunicazioni degli altri dispositivi della linea.

## Alimentazione e ricarica

Creator Micro 2 utilizza il MAX77972 per gestire batteria e ricarica. L'implementazione esistente presentava diversi problemi e rendeva difficile capire se un comportamento anomalo dipendesse dal firmware o dal componente.

Invece di aggiungere correzioni puntuali, sono ripartito dai datasheet e ho riscritto sia il driver sia la logica di gestione dell'alimentazione. Ho tenuto separati l'accesso al chip e le decisioni del prodotto, come interpretare lo stato della batteria o reagire a una lettura incoerente. Il risultato è un comportamento più prevedibile, più facile da verificare e soprattutto più semplice da diagnosticare quando qualcosa non va.

## Cosa è migliorato

- Il passaggio tra USB e Bluetooth è più prevedibile.
- Pairing e riconnessioni sono più semplici da seguire e diagnosticare.
- La sincronizzazione con Input gestisce in modo più affidabile richieste ravvicinate e cambi di stato.
- Le nuove librerie possono essere riutilizzate dagli altri firmware.
- Batteria e ricarica sono gestite da componenti separati e più facili da testare.

Lo sviluppo principale è concluso. Creator Micro 2 continua a ricevere correzioni, miglioramenti e nuove funzionalità, conservando il comportamento su cui gli utenti fanno già affidamento.

## Stack

ESP32 · ESP-IDF · FreeRTOS · C/C++ · NimBLE · TinyUSB · NVS · RPC.
