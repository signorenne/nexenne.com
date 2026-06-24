---
title: Nomad [E] 2 · firmware e HMI LVGL
lang: it
client: Work Louder · Canada
role: Sviluppatore firmware e HMI
year: Da marzo 2026 · in sviluppo
summary: "Sto costruendo il firmware e l'interfaccia LVGL della nuova piattaforma ESP32 di Nomad [E] 2, trasformando PCB, datasheet e specifiche in driver, funzioni di prodotto, comunicazioni e HMI."
tags: [ESP32, ESP-IDF, C/C++, LVGL, BLE, TinyUSB, RPC]
color: lime
accent: Nuova piattaforma · driver · HMI LVGL
metrics:
  - { k: Prodotto, v: "Nomad [E] 2" }
  - { k: Intervento, v: Firmware e HMI della nuova piattaforma }
  - { k: Stato, v: Sviluppo attivo }
---

## Una piattaforma nuova da costruire

Nomad [E] 2 è una tastiera meccanica con display a colori, encoder, illuminazione, connettività USB e Bluetooth e funzioni configurabili tramite Input.

Il progetto è nato da una nuova scheda e da una struttura software iniziale. Il mio compito è trasformare quella base nel firmware del prodotto: studio PCB e datasheet, definisco i confini dei moduli e sviluppo sia il codice vicino all'hardware sia l'interfaccia visibile all'utente.

![Nomad [E] 2](/work/nomad-e-2/product.webp)

_Immagine del prodotto: [Work Louder, pagina ufficiale di Nomad [E] 2](https://worklouder.cc/nomad-e-2)._

## Hardware e funzioni di base

Ho scritto i driver per display, encoder, espansori di I/O, LED, buzzer e alimentazione. Ogni componente è gestito da un modulo dedicato, così il resto del firmware non deve conoscere registri, dettagli di comunicazione o particolarità del singolo chip.

A partire da questi driver sto costruendo la scansione dei tasti, la configurazione dei comandi, l'illuminazione, la telemetria e la gestione energetica. Le comunicazioni USB e Bluetooth e il collegamento RPC con Input fanno parte della stessa architettura, invece di essere aggiunti come livelli separati.

## L'interfaccia LVGL

Il display non è un semplice indicatore: raccoglie configurazione, stato del dispositivo e funzioni di uso quotidiano. Sto sviluppando schermate per configurazione iniziale, batteria, scelta del canale, illuminazione, controlli multimediali, timer Pomodoro, wallpaper e impostazioni.

Per evitare che ogni schermata gestisca gli input a modo proprio, ho centralizzato la navigazione. Encoder e tasti rapidi generano eventi comuni, poi interpretati dalla schermata attiva. Il comportamento rimane così uniforme anche quando vengono aggiunte nuove funzioni.

Ho prestato particolare attenzione alla memoria grafica, che su un dispositivo embedded è limitata. Gli oggetti vengono creati e distrutti in modo controllato, mentre i wallpaper sono caricati in porzioni più piccole per non sottrarre memoria alle comunicazioni e alla tastiera.

## Configurazione e stato del dispositivo

Input comunica con il firmware tramite RPC per modificare configurazioni, illuminazione e altre impostazioni. Ogni richiesta viene controllata e inoltrata al modulo competente; protocollo, salvataggio dei dati e aggiornamento dell'interfaccia restano distinti.

Anche HMI e gestione energetica leggono lo stesso stato del dispositivo. Il display può quindi rappresentare correttamente ricarica, standby e riattivazione senza dover ricostruire queste informazioni da solo.

## A che punto è

- Architettura firmware definita per la nuova piattaforma ESP32.
- Driver dedicati alle diverse periferiche della scheda.
- Interfaccia LVGL con navigazione e prime funzioni integrate.
- Collegamenti USB e Bluetooth.
- Configurazione e sincronizzazione tramite Input.
- Gestione della memoria progettata per i vincoli del dispositivo.

Nomad [E] 2 è ancora in sviluppo. Firmware, interfaccia e funzioni del prodotto continuano a evolvere insieme alla piattaforma hardware, con l'obiettivo di arrivare al rilascio su una base già ordinata e manutenibile.

## Stack

ESP32 · ESP-IDF · FreeRTOS · C/C++ · LVGL · NimBLE · TinyUSB · NVS · RPC.
