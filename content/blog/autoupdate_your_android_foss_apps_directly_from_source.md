---
title: "Aggiornamenti automatici direttamente dalla fonte"
lang: it
date: 2024-07-13
desc: "Come uso Obtainium per aggiornare app Android open source direttamente dalle fonti ufficiali."
read: "5 min"
tags: ["OSS", "Android"]
categories: ["Software", "Mobile"]
image: "/blog/covers/autoupdate_your_android_foss_apps_directly_from_source.jpg"
---
## Introduzione
F-Droid è spesso raccomandato dagli appassionati di sicurezza e privacy, e immagino che molti lo usino per scaricare, installare e aggiornare le proprie app preferite su smartphone.
Anch'io ho usato F-Droid per molto tempo, ma dopo aver letto [l'articolo di PrivSec](https://privsec.dev/posts/android/f-droid-security-issues/) sui problemi di sicurezza dell'applicazione ho deciso di cercare un'alternativa.

All'inizio usavo i feed RSS per seguire gli aggiornamenti delle applicazioni che mi interessavano.
Scaricavo l'app direttamente dalla pagina GitHub o GitLab dello sviluppatore, mi iscrivevo al feed RSS e aspettavo le notifiche sugli aggiornamenti.
Quando usciva una nuova release, tornavo alla pagina dedicata, scaricavo l'APK e installavo manualmente l'aggiornamento.
In poco tempo, però, mi sono accorto che era un processo macchinoso, lento e snervante.

Mi serviva uno strumento capace di fare la stessa cosa automaticamente dopo una configurazione iniziale. La soluzione che ho scelto è `Obtainium`.

## Cos'è Obtainium? {#cos-è-obtainium}

Obtainium è un'app che automatizza il download e l'installazione degli aggiornamenti delle app Android direttamente dai siti web di origine, cioè dai siti in cui i file sono disponibili per il download diretto.

## Come scaricare Obtainium?
Per installare Obtainium bisogna partire dalla [pagina ufficiale di GitHub](https://github.com/ImranR98/Obtainium).

Nella sezione di installazione selezioniamo "Get it on GitHub", apriamo gli asset della release e scegliamo l'APK adatto al dispositivo. Per un Google Pixel, per esempio, la variante è generalmente `app-arm64-v8a`.
Al termine del download possiamo procedere con la normale installazione.
Terminata l'installazione, sarà possibile aprire l'app. Consiglio di consentire la ricezione delle notifiche: vengono gestite localmente e non richiedono i servizi di Google Play.

## L'interfaccia
Quando ho aperto Obtainium per la prima volta, sono rimasto piacevolmente sorpreso dal design.

Il progetto viene aggiornato spesso, quindi nomi e disposizione delle schermate potrebbero cambiare, ma il flusso generale resta simile.

L'app presenta una bottom navigation con queste voci:

-   Apps, l'elenco completo delle app aggiunte a Obtainium.
-   Add App, per registrare una nuova app da tracciare.
-   Import/Export, per importare o esportare la lista delle app e la configurazione di Obtainium.
-   Settings, per configurare l'applicazione.

## Aggiungere un'app
Per aggiungere una nuova applicazione, clicchiamo su "Add App".
In basso c'è un pulsante per vedere le fonti supportate. Alcune, come GitHub e Codeberg, sono etichettate come ricercabili: in questi casi si può cercare direttamente da Obtainium.
Ci sono due campi di testo: nel primo possiamo inserire direttamente l'URL di origine dell'app che vogliamo aggiungere, mentre il secondo permette di cercarla tramite una stringa alfanumerica.

In questo caso cerchiamo NewPipe, dato che il progetto è su GitHub. La ricerca può restituire molti risultati, soprattutto per un progetto popolare; nel mio caso il primo era quello ufficiale del team di NewPipe.
Per sicurezza, suggerisco sempre di verificare che il progetto sia quello corretto; ancora meglio, si può cercare la pagina dal browser e inserire manualmente l'URL.

Una volta convalidata la fonte, possiamo selezionarla premendo "Select".

Appare poi una sezione con opzioni aggiuntive. Tra le più importanti:

-   Include prereleases, da abilitare soltanto se si desidera ricevere versioni di anteprima potenzialmente instabili.
-   Fallback to older releases, è utile quando gli sviluppatori su GitHub non eseguono correttamente i rilasci e potrebbero avere un rilascio per iPhone e uno per Android. Se sono elencate in release diverse, quando Obtainium va a controllare qual è la versione più recente, se quella per iPhone è stata rilasciata per ultima, vedrà che non c'è un APK per Android disponibile da installare.
-   Filter Release Titles by Regular Expression, per filtrare i titoli delle versioni in base a un'espressione regolare. È un caso limite, ma può capitare che nell'URL inserito siano presenti più applicazioni scaricabili.
-   Track Only, solo tracciamento e niente aggiornamenti automatici. Io lascio questa opzione disattivata perché voglio che Obtainium scarichi gli APK per me, così da poterli installare automaticamente.

Ora possiamo selezionare "Add". L'applicazione viene scaricata sul dispositivo e, al termine, viene mostrata la schermata con i relativi dettagli.
Cliccando su "Install", Android chiederà di abilitare l'installazione da sorgenti sconosciute per Obtainium. Accettiamo e installiamo l'app.

Terminata l'installazione, tornando all'elenco delle applicazioni possiamo vedere che NewPipe è ora monitorata, con l'ultima versione installata correttamente.

Sembra un processo lungo, ma una volta capiti i passaggi principali si fa tutto in pochi secondi.

## E se Obtainium fosse affetto da malware?
Come sempre, bisogna essere scettici nei confronti di tutto ciò che si scarica dal web, che sia open source o meno.
Una precauzione aggiuntiva consiste nell'installare manualmente la prima versione dalla fonte ufficiale e aggiungerla soltanto dopo a Obtainium. Android accetta infatti gli aggiornamenti solo quando la firma corrisponde a quella dell'app già installata; un APK firmato con una chiave diversa verrebbe rifiutato.

## Limitazioni
Ci sono alcune limitazioni da tenere presenti.
La prima è che le installazioni delle app avvengono in modo asincrono e non è possibile determinare direttamente il successo o il fallimento di un'installazione.
Questo implica che gli stati e le versioni dell'installazione non siano sincronizzati con il sistema operativo fino al lancio successivo o fino a quando il problema non viene corretto manualmente.
In sostanza, bisogna riavviare l'applicazione.

La seconda è che per alcune fonti, i dati sono raccolti tramite web scraping, che può facilmente fallire a causa di cambiamenti nel design del sito web.
Chiunque abbia usato NewPipe avrà notato che, a ogni cambiamento dell'interfaccia di YouTube, l'extractor di NewPipe rischia di rompersi e di non riuscire più a estrarre dati fondamentali.
Con Obtainium può succedere qualcosa di simile: è una conseguenza della natura fragile del web scraping.

## Conclusione
Obtainium permette di seguire gli aggiornamenti direttamente dalle fonti ufficiali e riduce il lavoro manuale necessario per scaricare nuove release. Richiede attenzione nella scelta dei repository e non elimina i rischi legati alla distribuzione degli APK, ma offre un buon compromesso per chi vuole gestire applicazioni open source fuori dagli store tradizionali.
