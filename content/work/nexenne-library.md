---
title: Nexenne Library · librerie C++23 modulari
lang: it
client: Personale · open source
role: Software architect e sviluppatore
year: 2026 → in corso
summary: "Sto riscrivendo da zero una raccolta di librerie C++23 indipendenti, con API vicine alla standard library, integrazione CMake, test ed esempi."
tags: [C++23, CMake, Doctest, Containers, Utilities, Open source]
color: coral
accent: C++23 · moduli indipendenti · STL-first
metrics:
  - { k: Repo, v: github.com/signorenne/nexenne }
  - { k: Stack, v: C++23 · CMake · Doctest }
  - { k: Stato, v: Sviluppo attivo }
---

## Perché ho ricominciato da zero

Enne 2D era nato come motore sperimentale. Nel tempo, però, aveva raccolto librerie e componenti molto diversi tra loro, tenuti insieme più dalla storia del progetto che da un disegno coerente.

Ho scelto di archiviarlo e ripartire con Nexenne. Non sto spostando il vecchio codice in una cartella nuova: sto riesaminando ogni idea e la mantengo soltanto se può diventare una libreria autonoma, con uno scopo preciso e dipendenze comprensibili.

## Librerie che si possono usare davvero

Ogni modulo ha un proprio target CMake ed è esposto nel namespace `nexenne`. Un progetto può quindi usare soltanto ciò che gli serve, senza collegare l'intera raccolta o accettare dipendenze nascoste.

Al momento sto lavorando su utility generiche, container, gestione del tempo e generazione casuale. Cerco di seguire le convenzioni della standard library: non per copiarla, ma perché tipi e iteratori familiari rendono più semplice capire come usare un'API e quali costi aspettarsi.

## Test, strumenti e documentazione

Ogni modulo viene sviluppato insieme ai test Doctest e a piccoli esempi d'uso. Il progetto include preset CMake e configurazioni per AddressSanitizer e UndefinedBehaviorSanitizer, che uso per controllare errori di memoria e comportamenti non definiti durante lo sviluppo.

Anche la documentazione fa parte del lavoro sull'API. Se un comportamento è difficile da spiegare in poche righe o richiede troppe eccezioni, spesso significa che l'interfaccia deve essere ripensata prima di diventare pubblica.

## Stato del progetto

Nexenne è in sviluppo attivo e la riscrittura richiederà tempo. Preferisco aggiungere pochi moduli ben definiti, anziché ricreare rapidamente tutti i componenti di Enne 2D e ritrovarmi con gli stessi limiti.

## Link

- Sorgente: [github.com/signorenne/nexenne](https://github.com/signorenne/nexenne)
