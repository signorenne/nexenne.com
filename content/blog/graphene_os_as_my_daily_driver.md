---
title: "GrapheneOS, il mio sistema operativo per smartphone preferito"
lang: it
date: 2024-06-07
desc: "Dopo mesi di utilizzo quotidiano, GrapheneOS è diventato il mio sistema operativo preferito per smartphone."
read: "6 min"
tags: ["OS", "Android", "Smartphone"]
categories: ["Software", "Mobile"]
image: "/blog/covers/graphene_os_as_my_daily_driver.jpeg"
---
## Introduzione
Nel giugno del 2023 il mio vecchio Samsung Galaxy S10 ha deciso di passare a miglior vita dopo una rovinosa caduta dalle scale.

Stavo già pensando di sostituirlo e cercavo un dispositivo sul quale avere maggiore controllo, con un sistema orientato alla sicurezza e alla privacy.

Ho quindi confrontato diversi sistemi basati sull'Android Open Source Project (AOSP), modificati con obiettivi differenti in materia di privacy e sicurezza.

Alla fine ho ristretto la scelta a tre alternative: CalyxOS, LineageOS e GrapheneOS.

Dopo averle valutate ho scelto GrapheneOS e acquistato un dispositivo ufficialmente supportato.

Vediamo che cos'è GrapheneOS, come si installa e quali funzionalità mi hanno convinto a sceglierlo.

## Cos'è GrapheneOS? {#cos-è-grapheneos}

GrapheneOS è un sistema operativo basato su Android Open Source Project, con molte funzionalità aggiuntive per sicurezza e privacy.
È open-source, supporta ufficialmente tutti i dispositivi Google Pixel più recenti e può essere installato con grande facilità per sostituire il sistema operativo del Pixel di Google.

Per impostazione predefinita non include né applicazioni né servizi Google: in sostanza, spezza il controllo che Google esercita sul dispositivo mobile.

Il risultato è un dispositivo spartano, in senso positivo: solo applicazioni stock del progetto AOSP, tutto da configurare e senza vincoli imposti da terzi.

## Come installare GrapheneOS?
Il progetto fornisce un'interfaccia web minimale che permette di installare il sistema operativo seguendo istruzioni molto chiare.

Per iniziare si parte dalla [guida ufficiale](https://grapheneos.org/install/) e si sceglie tra l'installazione tramite WebUSB e quella classica da terminale.

Successivamente basta seguire la guida passo passo che viene fornita.

## Alcune funzionalità di GrapheneOS {#alcune-funzionalità-di-grapheneos}

Quella che segue è una panoramica non esaustiva delle funzionalità di GrapheneOS. Per i dettagli conviene consultare la [pagina ufficiale delle funzionalità](https://grapheneos.org/features).

### Protezione contro le vulnerabilità zero-day, oltre a funzionalità aggiuntive per utenti e rete. {#protezione-contro-le-vulnerabilità-zero-day-oltre-a-funzionalità-aggiuntive-per-utenti-e-rete-dot}

GrapheneOS protegge i suoi utenti dalle vulnerabilità zero-day.
Per ottenere questo risultato GrapheneOS riduce la superficie di attacco rimuovendo il codice non necessario dal sistema operativo.

Per la gestione delle applicazioni, GrapheneOS include toggle dedicati per i permessi di rete e dei sensori, quasi assenti nelle ROM personalizzate basate su AOSP.

A livello di rete, il sistema operativo supporta la randomizzazione dell'indirizzo MAC per ogni connessione e una modalità solo LTE che consente di disattivare le reti meno recenti o più nuove, riducendo la superficie di attacco.
Il Wi-Fi e il bluetooth (come il mobile hotspot) supportano la disattivazione automatica se non sono collegati a un dispositivo, risparmiando la durata della batteria e prevenendo potenziali attacchi wireless esterni.

Degna di nota è la funzione di screenshot privato che disattiva l'inclusione di metadati sensibili.

### Sandboxing e protezione dalla corruzione della memoria.
Per ridurre notevolmente le vulnerabilità del sistema operativo, il gruppo dietro a GrapheneOS dedica notevoli risorse allo sviluppo di linguaggi e librerie sicuri per la memoria, strumenti di analisi statica e dinamica e molto altro.

In GrapheneOS viene applicato il sandboxing a vari livelli, rafforzando il kernel e i componenti del sistema operativo.
In sostanza, i componenti vengono isolati in ambienti separati, limitando l'accesso delle applicazioni e l'impatto di eventuali vulnerabilità.

### Le applicazioni
GrapheneOS fornisce una serie di applicazioni rinforzate, pensate per ridurre permessi e superficie di attacco.

Innanzitutto, c'è il WebViewer e il browser Vanadium.
Vanadium è una variante di Chromium rafforzata con ulteriori misure di sicurezza e privacy.

Secure Camera, realizzata dal team di GrapheneOS, è la fotocamera predefinita del sistema. Include le funzioni tradizionali e aggiunge opzioni extra per privacy e sicurezza, come la scansione QR senza permessi di rete o accesso ai media e la rimozione opzionale dei metadati EXIF da foto e video.

Auditor fornisce invece una verifica basata sull'hardware dell'integrità del software e del firmware del dispositivo. È una funzione speciale, utile soprattutto per persone esposte a rischi mirati.

Infine, Secure PDF Viewer è un lettore PDF che non richiede permessi e opera in ambiente sandbox.

### Gestione dei profili migliorata
GrapheneOS ha migliorato la funzionalità dei profili utente e sta migliorando il monitoraggio di altri profili.

Nel dettaglio fornisce le possibilità di:

- Aggiungere più profili.
- Terminare la sessione.
- Disabilitare l'installazione di app in determinati profili.
- Installare le app disponibili di un profilo verso un altro.
- Inoltro delle notifiche dai profili non in uso verso la sessione corrente.

### Google in sandbox
Le app di Google possono essere installate su GrapheneOS attraverso un livello di compatibilità dedicato.
Le app verranno private dell'accesso speciale o dei privilegi che di solito hanno.
È possibile utilizzare le applicazioni e i servizi di Google, ma saranno modificati per ottenere elevati standard di privacy e sicurezza.

## Conclusione
Uso GrapheneOS da circa un anno e l'esperienza è stata positiva. I prodotti orientati alla privacy spesso richiedono compromessi significativi nell'usabilità; in questo caso l'impatto sull'uso quotidiano è rimasto contenuto.

Non ho dovuto cambiare radicalmente il modo in cui uso il telefono. Il passaggio più scomodo è stato sostituire molte applicazioni legate all'ecosistema Google, tema che merita un post a parte.

Il limite principale riguarda le applicazioni che dipendono dai servizi Google Play. Senza installare il livello di compatibilità dedicato, alcune funzioni, come le notifiche push basate su Firebase, possono non essere disponibili.

Nel complesso ho ottenuto un telefono più controllabile, orientato alla sicurezza e alla privacy, senza rinunciare alle funzioni che uso ogni giorno.
