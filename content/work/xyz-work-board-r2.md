---
title: XYZ Work Board r2 · dal PCB al firmware
lang: it
client: Work Louder · Canada
role: Sviluppatore firmware
year: Da gennaio 2026
summary: "Ho trasformato il PCB di XYZ Work Board r2 in un firmware ESP32 completo, occupandomi di architettura, configurazione tramite Input e test di produzione. Lo sviluppo iniziale è concluso; il prodotto resta in manutenzione e continua a ricevere aggiornamenti."
tags: [ESP32, ESP-IDF, C/C++, TinyUSB, RPC, RGB, Self-test]
color: cyan
accent: Firmware da scheda · USB · test di produzione
metrics:
  - { k: Prodotto, v: XYZ Work Board r2 }
  - { k: Connettività, v: USB cablata }
  - { k: Stato, v: Completato · manutenzione e aggiornamenti }
---

## La scheda c'era, il prodotto no

XYZ Work Board r2 è una tastiera compatta cablata con 47 tasti, encoder, livelli configurabili e illuminazione. Le azioni vengono personalizzate tramite Input e salvate nella memoria del dispositivo.

Quando ho iniziato, esistevano la nuova scheda e una struttura iniziale del progetto, ma mancava il firmware che l'avrebbe trasformata in un prodotto. Partendo dal PCB, dai datasheet e dalle specifiche del team hardware, ho definito l'organizzazione del software e sviluppato le funzioni necessarie al rilascio.

![XYZ Work Board r2](/work/xyz-work-board-r2/product.webp)

_Immagine del prodotto: [Work Louder, pagina ufficiale di XYZ Work Board r2](https://worklouder.cc/xyz-work-board-2)._

## Dalla scheda al firmware

Il primo passo è stato ricostruire il funzionamento della scheda: pin, periferiche, collegamenti e vincoli dei componenti. Ho raccolto queste informazioni in moduli dedicati all'hardware, così la logica della tastiera può concentrarsi su tasti, encoder, livelli, illuminazione e configurazioni senza conoscere i dettagli della scheda.

XYZ Work Board r2 è un prodotto esclusivamente cablato. La comunicazione USB è gestita tramite TinyUSB, ma passa attraverso la stessa interfaccia adottata dagli altri firmware. Questo permette di condividere il codice di configurazione senza portare i dettagli del collegamento USB nel resto dell'applicazione.

## Input e RPC

Ho implementato il collegamento RPC con Input, il software desktop usato per configurare il dispositivo. Il firmware riceve le modifiche, le valida, le salva e aggiorna soltanto la parte interessata.

In questo modo la gestione del protocollo rimane separata dalla logica della tastiera. Aggiungere nuove opzioni diventa più semplice, perché non richiede di riscrivere ogni volta il percorso USB.

## Test di produzione

Ho sviluppato anche una modalità di test per verificare tasti, encoder, controlli touch e LED durante la produzione. L'operatore riceve un riscontro visivo per ogni elemento controllato; il test può concludersi automaticamente oppure essere avviato dal software tramite RPC.

Questa procedura rende più rapido capire se un difetto dipende dall'assemblaggio, da un componente o dal firmware. Soprattutto, dà al team un controllo ripetibile su ogni unità invece di affidarsi a verifiche manuali isolate.

## Cosa ho consegnato

- Firmware completo per la nuova scheda.
- Gestione di tasti, encoder, livelli, illuminazione e memoria interna.
- Configurazione del dispositivo tramite Input.
- Comunicazione USB separata dalla logica applicativa.
- Modalità di test dedicata alla produzione e ripetibile su ogni unità.

Lo sviluppo iniziale è concluso e il prodotto è stato rilasciato. Il firmware resta in manutenzione per correzioni, aggiornamenti e nuove funzionalità.

## Stack

ESP32 · ESP-IDF · FreeRTOS · C/C++ · TinyUSB · NVS · RPC · LED RGB.
