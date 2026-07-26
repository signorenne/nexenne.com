---
title: Codex Micro · firmware e product UX
lang: it
client: Work Louder · collaborazione pubblica con OpenAI
role: Sviluppatore firmware e product UX
year: Luglio 2026
summary: "Attraverso Work Louder ho contribuito al firmware e all'esperienza di Codex Micro, trasformando i flussi di Codex in interazioni fisiche chiare e coerenti."
tags: [Firmware embedded, Product UX, HMI, Integrazione, Validazione]
color: cyan
accent: Firmware embedded · interazione fisica · product UX
cover: /work/codex-micro/product.webp
spotlight: true
feature: true
metrics:
  - { k: Collaborazione, v: Work Louder · OpenAI }
  - { k: Prodotto, v: Controller fisico per Codex }
  - { k: Contributo, v: Firmware e product UX }
  - { k: Stato, v: Edizione limitata · sold out }
---

Attraverso Work Louder ho contribuito all'architettura, allo sviluppo e alla rifinitura del firmware di Codex Micro, il controller fisico realizzato nell'ambito della collaborazione pubblica tra Work Louder e OpenAI.

Il mio lavoro ha collegato i controlli del dispositivo alle funzioni di Codex: gestione di tasti, encoder, joystick e sensore touch, comunicazione RPC con l'applicazione, interpretazione degli stati ricevuti e coordinamento del feedback luminoso.

L'obiettivo, tuttavia, non era soltanto fare in modo che ogni input producesse il comando corretto. Tutti questi elementi dovevano comportarsi come parti della stessa interfaccia e restituire un'esperienza comprensibile, coerente e discreta.

## Un controller fisico per Codex

Codex Micro porta sulla scrivania alcune delle azioni e delle informazioni più utili di Codex attraverso tredici tasti meccanici, un encoder rotativo, un joystick planare, un sensore touch e un sistema di illuminazione RGB.

Il prodotto non sostituisce l'applicazione. Offre invece un punto di accesso fisico ai flussi ricorrenti e permette di comprendere rapidamente se una chat sta elaborando, ha terminato, richiede un intervento oppure ha incontrato un errore.

![Codex Micro](/work/codex-micro/product.webp)

*Codex Micro, prodotto realizzato da Work Louder in collaborazione con OpenAI.*

Le funzioni pubbliche del dispositivo ruotano attorno a quattro gruppi principali:

- gli **Agent Keys** rappresentano fino a sei chat e ne mostrano lo stato attraverso il colore;
- i **Command Keys** rendono immediate azioni frequenti come accettare, rifiutare, avviare una nuova chat o utilizzare il push-to-talk;
- il **dial** permette di regolare il reasoning effort in base al lavoro da svolgere;
- il **joystick** richiama skill e flussi configurabili, ad esempio la revisione di una pull request, il debugging di un errore o il refactoring del codice.

![Esperienza pubblica di Codex Micro: controlli fisici, funzioni Codex e risultato per lo sviluppatore](/work/codex-micro/diagrams/public-experience.svg)

*Le funzioni pubbliche del prodotto convergono in un flusso di lavoro più fisico e immediato. Il diagramma descrive l'esperienza presentata ufficialmente, non l'architettura interna.*

Codex Micro può comunicare tramite USB-C o Bluetooth ed è integrato direttamente nell'esperienza desktop di Codex. Work Louder Input amplia inoltre la configurazione generale del dispositivo con scorciatoie personalizzate e sei livelli programmabili.

Queste funzioni descrivono ciò che la persona vede. Sotto questa esperienza, però, il firmware deve mantenere sincronizzati input fisici, stato applicativo, modalità operative e feedback visivo.

## Il mio contributo

All'interno del team Work Louder ho lavorato sul firmware e sul comportamento complessivo del prodotto.

Nello specifico, mi sono occupato di:

- definire e rifinire l'architettura e la logica principale del firmware;
- gestire gli input provenienti da tasti, encoder, joystick e sensore touch;
- trasformare gli input fisici in eventi coerenti con la modalità e il livello attivi;
- contribuire all'interfaccia RPC utilizzata per scambiare comandi, configurazioni e stati con Codex;
- interpretare e validare le informazioni ricevute dall'applicazione;
- sviluppare nuovi layer per il sistema LED;
- coordinare stato degli agenti, feedback delle interazioni, modalità di connessione e indicazioni temporanee;
- provare e rifinire il comportamento direttamente sul dispositivo reale insieme al resto del team.

La difficoltà principale era mantenere semplice un prodotto che mette in relazione livelli differenti: hardware, firmware, collegamento con il computer, stato di Codex, configurazione e interazione fisica.

Un errore in uno di questi passaggi non produce necessariamente un crash evidente. Può manifestarsi come un colore non più coerente con la chat, un comando associato al controllo sbagliato, un feedback che arriva in ritardo oppure una modalità che rimane attiva più del necessario. Per questo era importante trattare il comportamento come un sistema unico.

## Dall'input fisico al comportamento

Un tasto premuto non dovrebbe tradursi immediatamente in una funzione scelta in modo rigido.

Prima di decidere che cosa fare, il firmware deve comprendere:

- quale controllo ha generato l'evento;
- se si tratta di una pressione, un rilascio, una rotazione o un movimento;
- quale livello o modalità è attivo;
- se l'input appartiene alle funzioni di Codex oppure alla configurazione generale;
- quale stato deve essere aggiornato localmente;
- quale informazione deve essere inviata al computer;
- quale feedback deve essere mostrato sul dispositivo.

Ho quindi lavorato affinché gli input venissero trasformati in eventi interni più chiari e indipendenti dal singolo componente hardware.

Questa separazione rende il firmware più leggibile e permette alla logica di prodotto di ragionare in termini di intenzioni: selezionare una chat, eseguire un comando, cambiare modalità o regolare un valore, invece di dipendere direttamente da pin, letture e dettagli elettrici.

È un passaggio importante anche per la coerenza. Lo stesso gesto deve produrre una risposta prevedibile, mentre gesti differenti possono richiedere trattamenti diversi. Ad esempio, la documentazione pubblica distingue la pressione singola dalla doppia pressione degli Agent Keys: la prima seleziona una chat in background, la seconda porta Codex in primo piano. Questa differenza deve essere riconosciuta senza rendere l'interazione lenta o ambigua.

## L'interfaccia RPC tra Codex e il dispositivo

Codex Micro non è soltanto una periferica che invia scorciatoie. Deve anche ricevere informazioni dall'applicazione e trasformarle in uno stato fisico.

La comunicazione RPC costituisce il confine tra questi due ambienti.

Da una parte si trova Codex, che conosce chat, attività, configurazione e azioni disponibili. Dall'altra si trova il firmware, che conosce tasti, encoder, joystick, modalità di connessione e LED. L'interfaccia deve permettere ai due sistemi di scambiarsi informazioni senza confondere le rispettive responsabilità.

Nel flusso generale:

1. Codex invia al dispositivo uno stato o una configurazione;
2. il firmware riceve il messaggio attraverso l'interfaccia RPC;
3. i dati vengono interpretati e verificati prima di modificare lo stato interno;
4. la logica applicativa decide quali parti del dispositivo devono cambiare;
5. il sistema di output aggiorna il feedback visivo o il comportamento dei controlli;
6. quando l'utente interagisce con il dispositivo, il percorso avviene nella direzione opposta e l'evento viene comunicato a Codex.

Ho contribuito a questa interfaccia e alla gestione delle informazioni provenienti da Codex, mantenendo separati comunicazione, interpretazione e comportamento.

Questa distinzione evita che un dettaglio del protocollo si propaghi direttamente nella logica degli input o nei LED. Permette inoltre di gestire con maggiore chiarezza dati mancanti, aggiornamenti fuori ordine, stati non ancora disponibili e cambi di configurazione.

Per correttezza, questa pagina descrive il flusso e le responsabilità del sistema senza pubblicare dettagli interni del protocollo o dell'implementazione.

## Dare una forma fisica allo stato di Codex

Un'applicazione può utilizzare finestre, testi, notifiche e cronologie. Un oggetto sulla scrivania dispone di segnali molto più sintetici.

Nel caso degli Agent Keys, la legenda pubblica associa i colori a stati precisi:

- bianco per una chat inattiva;
- blu durante l'elaborazione;
- verde quando il lavoro è terminato;
- ambra quando è richiesto un input;
- rosso in presenza di un errore;
- LED spento quando non è assegnata alcuna chat.

Mostrare un colore, tuttavia, è soltanto l'ultimo passaggio.

Il firmware deve prima ricevere lo stato corretto, associarlo al controllo corrispondente e decidere se quel dato debba essere mostrato immediatamente oppure se un feedback temporaneo abbia, per qualche istante, una priorità maggiore.

Per questo ho lavorato su nuovi layer LED. L'obiettivo era separare responsabilità differenti, ad esempio:

- lo stato persistente delle chat;
- la modalità o il livello attivo;
- la connessione tramite USB-C o Bluetooth;
- la conferma visiva di un input;
- un'indicazione temporanea;
- una condizione che richiede attenzione.

I layer permettono di comporre il risultato finale senza perdere lo stato sottostante. Un'animazione breve può quindi confermare un'azione e poi lasciare nuovamente spazio allo stato della chat. Allo stesso modo, una modalità di configurazione può avere la precedenza per il tempo necessario senza cancellare le informazioni ricevute da Codex.

La parte importante non è soltanto assegnare colori differenti. È definire priorità, durata e condizioni di uscita, in modo che il feedback rimanga stabile e prevedibile.

## Un'esperienza costruita attorno al lavoro reale

Ho trattato Codex Micro come un prodotto unico, non come una raccolta di scorciatoie.

Tasti, luce, movimento e risposta del dispositivo dovevano usare lo stesso linguaggio. Ogni controllo doveva suggerire il tipo di azione disponibile, mentre ogni risposta doveva confermare ciò che era accaduto senza richiedere di osservare continuamente il controller.

Questo ha richiesto di ragionare su domande apparentemente semplici:

- quale stato merita di rimanere sempre visibile?
- quando una conferma temporanea è davvero utile?
- quale feedback può essere compreso con uno sguardo?
- che cosa deve accadere quando Codex non è disponibile o il dispositivo cambia connessione?
- come mantenere coerente il comportamento tra funzioni dedicate e livelli personalizzabili?
- quando il dispositivo deve comunicare e quando, invece, deve rimanere discreto?

La product UX, in questo caso, non è una fase separata dal firmware. È il risultato delle decisioni che stabiliscono tempi, priorità, transizioni e significato di ogni risposta.

## Configurazione senza perdere l'identità del prodotto

Codex Micro offre funzioni dedicate, ma può anche adattarsi a flussi differenti.

La configurabilità introduce un compromesso. Un controller deve permettere alla persona di organizzare il proprio lavoro, tuttavia deve rimanere comprensibile appena viene collegato e non può perdere le funzioni che ne definiscono l'identità.

I sei livelli programmabili di Work Louder Input permettono di raggruppare scorciatoie e azioni. Il sensore touch e gli indicatori dedicati rendono visibile il livello attivo, mentre AppSense può associare automaticamente un livello all'applicazione in primo piano.

Nel firmware, questa flessibilità richiede di mantenere distinti almeno tre concetti:

- il controllo fisico utilizzato;
- la funzione assegnata nel contesto corrente;
- il feedback necessario per rendere visibile quel contesto.

Separare questi concetti permette di cambiare configurazione senza riscrivere la logica di ogni componente e riduce il rischio che una personalizzazione interferisca con gli stati provenienti da Codex.

## Validare sul dispositivo reale

Il comportamento di un controller non può essere valutato soltanto leggendo il codice.

Una temporizzazione corretta sulla carta può sembrare lenta durante l'uso. Un colore riconoscibile in una schermata può risultare ambiguo attraverso il diffusore del prodotto. Una doppia pressione può funzionare nei test automatici e rimanere poco naturale nella pratica.

Il lavoro è quindi avanzato attraverso un ciclo continuo:

1. definire il comportamento atteso;
2. implementarlo nel firmware;
3. provarlo sul dispositivo reale;
4. confrontarlo con il flusso di Codex;
5. osservare ambiguità, ritardi o sovrapposizioni;
6. rifinire logica, priorità e feedback insieme al team.

Questo confronto tra codice e prodotto ha guidato molte decisioni. L'obiettivo non era soltanto verificare che il dispositivo funzionasse, ma controllare che il suo comportamento fosse comprensibile.

## Risultato

Il lavoro ha contribuito alla realizzazione di un controller compatto e riconoscibile, progettato attorno ai flussi di Codex e presentato ufficialmente il 15 luglio 2026 come parte della collaborazione tra OpenAI e Work Louder.

Il risultato collega:

- stato di fino a sei chat;
- azioni frequenti;
- skill configurabili;
- regolazione del reasoning effort;
- livelli personalizzabili;
- feedback RGB;
- connessione USB-C e Bluetooth.

Dal punto di vista del firmware, questi elementi non sono funzioni isolate. Condividono input, stato, comunicazione e output e devono quindi rispettare una logica comune.

È proprio questo l'aspetto dello sviluppo embedded che trovo più interessante: collegare hardware e software fino a far scomparire la complessità tecnica dall'esperienza finale.

## Un progetto costruito insieme

Sono orgoglioso di aver contribuito a Codex Micro attraverso Work Louder, nell'ambito della collaborazione pubblica con OpenAI.

Ringrazio il team di Work Louder e tutte le persone coinvolte nel progetto per il confronto continuo tra firmware, hardware, prodotto e interazione. È stato questo lavoro condiviso a permettere di trasformare un insieme di controlli fisici in un'esperienza coerente.

## Cosa racconta del mio lavoro

Codex Micro riunisce diverse competenze che porto nei progetti embedded:

- architettura e sviluppo di firmware orientato al comportamento del prodotto;
- gestione e astrazione di input fisici differenti;
- integrazione RPC tra applicazione e dispositivo;
- modellazione dello stato ricevuto da un sistema esterno;
- composizione e priorità del feedback LED;
- progettazione dell'interazione tra software e controlli fisici;
- validazione e rifinitura sul prodotto reale;
- collaborazione tra team e discipline differenti.

Il progetto mostra come il firmware diventi davvero parte del prodotto quando ogni risposta tecnica corrisponde a un significato chiaro per chi lo utilizza.

## Link ufficiali

- [OpenAI · Codex Micro](https://openai.com/supply/co-lab/work-louder/)
- [OpenAI · What's new in Codex](https://learn.chatgpt.com/docs/whats-new)
- [Work Louder · Codex Micro](https://worklouder.cc/codex-micro)
- [Work Louder · Configurazione di Codex Micro](https://worklouder.cc/openai-micro-setup)
