---
title: Knob1 · firmware e HMI LVGL
lang: it
client: Work Louder · Canada
role: Sviluppatore firmware e HMI
year: Da marzo 2026
summary: "Ho stabilizzato il firmware e l'interfaccia LVGL di Knob1, intervenendo su memoria, wallpaper, batteria, ricarica e comunicazioni USB/BLE. Il lavoro principale è concluso; il prodotto resta in manutenzione e continua a ricevere nuove funzioni."
tags: [ESP32, ESP-IDF, C/C++, LVGL, BLE, TinyUSB, MAX77972]
color: coral
accent: HMI LVGL · batteria · affidabilità
metrics:
  - { k: Prodotto, v: Knob1 }
  - { k: Intervento, v: Firmware e HMI esistenti }
  - { k: Stato, v: Completato · manutenzione e aggiornamenti }
---

## Tante funzioni, un equilibrio da ritrovare

Knob1 è una tastiera meccanica con due encoder, connettività USB e Bluetooth e un display a colori utilizzato per impostazioni, stato del dispositivo, timer e wallpaper personalizzati.

La parte delicata era l'equilibrio tra questi sistemi. L'interfaccia doveva riflettere lo stato reale della batteria e del collegamento, mentre la gestione delle immagini non poteva sottrarre memoria alle comunicazioni o alla scansione dei tasti. Correggere un singolo sintomo senza guardare l'insieme avrebbe soltanto spostato il problema altrove.

![Knob1](/work/knob1/product.webp)

_Immagine del prodotto: [Work Louder, pagina ufficiale di Knob1](https://worklouder.cc/knob1)._

## Interfaccia e memoria

Sono partito dall'interfaccia LVGL. Ho corretto una perdita di memoria nella gestione dei wallpaper e rivisto il caricamento delle immagini, che ora richiede meno memoria temporanea. Ho inoltre sistemato il ciclo di vita degli oggetti grafici, evitando che risorse non più utilizzate restassero allocate.

Un altro problema riguardava le informazioni mostrate durante l'uso a batteria o in ricarica. In alcuni casi lo schermo non rappresentava lo stato effettivo del dispositivo. Ho spostato questa interpretazione fuori dalle singole schermate: l'HMI riceve ora uno stato già coerente, senza doverlo dedurre da letture che possono cambiare rapidamente.

## Batteria e MAX77972

Knob1 utilizza il MAX77972, lo stesso componente presente su Creator Micro 2. Ho integrato nel prodotto le nuove librerie di alimentazione e ricarica, riscritte a partire dalla documentazione del chip.

Il driver si occupa del componente; il resto del firmware decide come comportarsi: quando entrare in standby, quando sospendere alcune funzioni e come proteggere la batteria. Questa separazione ha permesso di correggere problemi latenti senza riempire l'applicazione di eccezioni specifiche.

## Comunicazioni

Ho integrato anche le nuove librerie condivise per BLE, USB e RPC. La scelta del canale, il pairing, la riconnessione e lo scambio di dati con Input seguono ora le stesse regole degli altri prodotti Work Louder.

Il vantaggio non è soltanto avere codice più uniforme. Comunicazioni, alimentazione e interfaccia dipendono da uno stato comune e smettono di prendere decisioni in contrasto tra loro.

## Cosa è migliorato

- Eliminata la perdita di memoria legata ai wallpaper.
- Ridotto il consumo di memoria durante il caricamento delle immagini.
- Stato di batteria e ricarica rappresentato correttamente sul display.
- Interfaccia più stabile anche durante l'uso prolungato.
- Comunicazioni USB/BLE e sincronizzazione con Input più affidabili.

Il lavoro di consolidamento è concluso. Il firmware di Knob1 continua a ricevere correzioni, ottimizzazioni e nuove funzioni.

## Stack

ESP32 · ESP-IDF · FreeRTOS · C/C++ · LVGL · NimBLE · TinyUSB · MAX77972 · RPC.
