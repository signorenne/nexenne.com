---
title: "USB host o caricatore? VBUS, enumerazione e routing nei dispositivi embedded"
lang: it
date: 2026-07-27
lastmod: 2026-07-27
desc: "Come distinguere un host USB da un caricatore usando VBUS, enumerazione, TinyUSB e una policy probe-then-commit."
read: "40 min"
tags: ["USB", "TinyUSB", "Firmware", "Embedded", "BLE"]
categories: ["Embedded", "Tutorial"]
image: "/blog/covers/usb_vbus_enumerazione_routing.webp"
---

## Abstract

Durante lo sviluppo di un dispositivo embedded alimentato a batteria e capace di comunicare sia tramite BLE sia tramite USB, mi sono trovato davanti a un problema apparentemente banale: come distinguere un vero host USB da un caricatore collegato soltanto per alimentare il dispositivo?

La prima soluzione era basata su VBUS. Quando la tensione USB diventava presente, il firmware spostava automaticamente la route di input da BLE a USB. Il ragionamento sembrava sensato: il cavo è collegato, dunque possiamo usare USB.

Non proprio.

Un alimentatore da muro, un power bank o un cavo charge-only possono fornire alimentazione senza offrire un canale dati utilizzabile. In questo scenario il dispositivo continua a funzionare, ma la route viene spostata verso un collegamento USB che non possiede alcun host a cui consegnare i report. Dal punto di vista dell'utente, l'input sembra semplicemente scomparire.

Il problema nasce da una confusione tra segnali che appartengono a livelli diversi. VBUS dimostra che è presente alimentazione. Il pull-up sulle linee dati indica che il device si è presentato sul bus. Un bus reset e i primi setup packet dimostrano che un host ha iniziato a comunicare. `SET_CONFIGURATION` con un valore non nullo indica infine che il device è entrato nello stato **Configured** e che gli endpoint delle classi selezionate possono essere usati normalmente.[^usb-concepts]

Questi stati sono correlati, ma non sono equivalenti. Il bug nasce precisamente quando uno di essi viene promosso ad autorità per tutti gli altri.

In questo articolo analizziamo quindi il funzionamento di USB dal punto di vista di un firmware embedded: VBUS, D+ e D−, pin CC di USB Type-C, ruoli host e device, bus reset, endpoint di controllo, descrittori, enumerazione e dispositivi self-powered. Useremo poi questi concetti per costruire un meccanismo di **probe-then-commit**, nel quale USB viene presentata temporaneamente ma la route applicativa viene adottata soltanto dopo una reale configurazione da parte dell'host.

L'obiettivo non è riscrivere la specifica USB. È costruire un modello mentale abbastanza preciso da scegliere, per ogni decisione, il segnale che possiede davvero l'informazione richiesta.

## Il problema concreto

Supponiamo di avere un dispositivo con due canali di comunicazione:

- BLE, normalmente utilizzato quando il dispositivo è alimentato dalla batteria;
- USB HID, disponibile quando il dispositivo viene collegato a un computer.

Una policy ingenua riduce tutto alla scorciatoia `VBUS presente → cavo collegato → route USB`.

Il limite è che VBUS descrive soltanto il percorso di alimentazione. Non dimostra che dall'altro lato del cavo esista un host capace di enumerare il device e interrogare gli endpoint HID.

La stessa tensione può provenire da:

- un computer;
- un hub USB con funzione host;
- un alimentatore da muro;
- un power bank;
- una porta di ricarica priva di dati;
- un cavo che porta soltanto VBUS e GND.

Nel primo e nel secondo caso il passaggio a USB può essere corretto. Negli altri, la route viene spostata verso un canale morto.

Il problema è particolarmente evidente con i dispositivi HID. Il firmware può continuare a leggere pulsanti, encoder o sensori e può perfino preparare correttamente i report. Tuttavia, USB resta un bus controllato dall'host: un endpoint interrupt `IN` viene servito quando l'host lo interroga secondo l'intervallo dichiarato, non quando il device decide autonomamente di trasmettere.[^hid11] Se nessun host pianifica quelle transazioni, i report non raggiungono nessuno.

La prima regola è dunque semplice:

> VBUS può avviare il tentativo di connessione, ma non dovrebbe autorizzare da sola l'adozione della route USB.

Per capire quale segnale usare, dobbiamo però separare i diversi livelli della connessione.

## USB non è soltanto un connettore

Nel linguaggio comune usiamo la parola USB per indicare contemporaneamente:

- un connettore;
- un cavo;
- una tensione di alimentazione;
- una coppia differenziale;
- un protocollo;
- una classe come HID, CDC o MSC;
- uno stack software;
- il controller integrato nel microcontrollore.

Questi elementi lavorano insieme, ma rispondono a domande differenti.

Un connettore USB Type-C, ad esempio, non garantisce automaticamente che siano disponibili USB 3.x, USB4, Power Delivery o perfino i dati USB 2.0. Le capacità dipendono dalla porta, dal controller e dal cavo.

Allo stesso modo, rilevare VBUS non significa aver ricevuto un pacchetto USB. Significa soltanto che il circuito di sensing ha rilevato una sorgente di alimentazione.

Per comodità, possiamo organizzare il problema in livelli:

![Livelli di una connessione USB embedded, dal connettore alla policy applicativa](/blog/images/usb_vbus_enumerazione_routing/usb-layers.svg)

*Ogni livello risponde a una domanda diversa. Un segnale valido in basso nella catena non autorizza automaticamente le decisioni dei livelli superiori.*

Una regressione nasce spesso quando un segnale appartenente a un livello viene usato come prova per quello successivo. È utile pensare a ogni livello come a un'autorità limitata: VBUS può rispondere a domande sulla potenza; EP0 può dimostrare che esiste traffico di controllo; la configurazione può dimostrare che il link è stato accettato dall'host; soltanto la policy del prodotto può decidere quale route adottare.

## Host e device: USB è un bus asimmetrico

USB è controllato dall'host. TinyUSB riassume questo modello in modo netto: l'host enumera, configura e avvia tutte le comunicazioni; il device risponde alle richieste e non può iniziare una transazione sul bus.[^usb-concepts]

L'host:

- rileva l'attach di una periferica;
- esegue il reset del bus;
- assegna un indirizzo;
- legge i descrittori;
- sceglie una configurazione;
- pianifica le transazioni;
- associa i driver di classe.

Il device, invece, espone descrittori ed endpoint e risponde alle richieste ricevute.

Questa distinzione è fondamentale. Una periferica non usa il bus come una UART e non trasmette liberamente quando preferisce. Anche quando ha dati pronti, deve attendere una transazione avviata dall'host.

### IN e OUT sono definiti dal punto di vista dell'host

La nomenclatura può inizialmente sembrare invertita:

- un endpoint `IN` trasporta dati dal device verso l'host;
- un endpoint `OUT` trasporta dati dall'host verso il device.

Una tastiera, ad esempio, invia normalmente i report tramite un endpoint interrupt `IN`. Il firmware prepara il report, ma è l'host che interroga periodicamente l'endpoint.

Di conseguenza, un dispositivo collegato a un caricatore può essere acceso, leggere gli input e aggiornare i LED, ma non avere alcun destinatario USB.

## VBUS, GND, D+ e D−

Nel percorso USB 2.0 troviamo quattro segnali fondamentali:

| Segnale | Funzione |
|---|---|
| `VBUS` | Porta l'alimentazione e permette di rilevare la presenza di una sorgente. |
| `GND` | Fornisce il riferimento elettrico e il percorso di ritorno della corrente. |
| `D+` | Prima linea della coppia differenziale USB 2.0. |
| `D-` | Seconda linea della coppia differenziale USB 2.0. |

D+ e D− trasportano i dati come coppia differenziale. VBUS appartiene invece al percorso di alimentazione.

### Che cosa dimostra VBUS

VBUS dimostra che una sorgente sta rendendo disponibile alimentazione sul collegamento USB.

Non dimostra:

- che D+ e D− siano fisicamente cablati;
- che il cavo supporti i dati;
- che dall'altro lato esista un host;
- che l'host abbia rilevato il device;
- che sia avvenuto un bus reset;
- che l'host abbia selezionato una configurazione;
- che una classe HID sia pronta.

Un power bank può quindi generare una VBUS perfettamente valida senza possedere alcun controller host. Un cavo charge-only può portare VBUS e GND ma non una coppia dati funzionante.

In sostanza, VBUS è una prova di alimentazione. Non è una prova di comunicazione. Nei dispositivi self-powered è anche un segnale indispensabile per riconoscere attach e detach, ma il fatto che sia necessario non lo rende sufficiente per dichiarare disponibile il canale dati.[^esp-self-powered]

## Che cosa aggiunge USB Type-C

USB Type-C aggiunge, tra le altre cose, i pin **Configuration Channel**, normalmente abbreviati in `CC`. Le state machine su CC risolvono l'attach, i ruoli Source/Sink e i ruoli dati iniziali DFP/UFP prima che le funzioni USB superiori vengano usate.[^typec-overview]

I pin CC vengono utilizzati per:

- rilevare l'attach tra due porte;
- stabilire i ruoli iniziali di alimentazione;
- determinare l'orientamento del connettore;
- annunciare la corrente disponibile secondo Type-C;
- configurare VCONN;
- trasportare la comunicazione USB Power Delivery, quando presente.

Questo rende l'attach e la gestione della potenza più ricchi rispetto ai vecchi connettori. Tuttavia, CC non sostituisce il protocollo USB 2.0 su D+ e D−.

### Ruolo di alimentazione e ruolo dati

USB Type-C rende espliciti due assi distinti.

Per l'alimentazione:

- **Source**: fornisce potenza su VBUS;
- **Sink**: riceve potenza da VBUS;
- **DRP**: può assumere entrambi i ruoli.

Per i dati:

- **DFP**: ruolo normalmente associato all'host;
- **UFP**: ruolo normalmente associato al device;
- **DRD**: può operare in entrambi i ruoli.

Nella connessione più comune Source e DFP sono associati, così come Sink e UFP. I concetti restano però distinti.

Un caricatore USB-C è una Source valida e può annunciare correttamente la corrente disponibile. Può perfino negoziare un contratto USB Power Delivery. Ciò non implica che implementi anche un host USB capace di inviare `GET_DESCRIPTOR`, `SET_ADDRESS` e `SET_CONFIGURATION`: la stessa panoramica USB-IF presenta la risoluzione dei ruoli e il contratto di potenza come passaggi distinti dalla scoperta e dall'attivazione delle funzioni dati.[^typec-overview]

La conseguenza pratica è semplice:

> Sapere chi fornisce alimentazione non basta a dimostrare che esista una sessione dati.

## Device bus-powered e self-powered

La gestione del distacco cambia molto in base a come il dispositivo viene alimentato.

### Device bus-powered

Un device bus-powered dipende da VBUS per funzionare. Quando il cavo viene rimosso, il microcontrollore si spegne o perde comunque l'alimentazione necessaria al funzionamento.

In questo caso lo stato software non può sopravvivere a lungo al distacco: il sistema viene spento o riavviato.

### Device self-powered

Un device self-powered dispone invece di una sorgente autonoma, ad esempio una batteria.

Quando il cavo USB viene rimosso:

- il microcontrollore rimane acceso;
- il task USB può continuare a girare;
- le variabili dello stack rimangono in memoria;
- la route applicativa può continuare a esistere;
- il dispositivo deve rilevare esplicitamente la perdita di VBUS.

Questo rende il sensing di VBUS parte integrante della macchina a stati USB. Non serve soltanto a sapere se il cavo è presente: serve a chiudere correttamente la sessione precedente.

Diverse integrazioni hardware permettono di rilevare VBUS tramite il PHY, un comparatore, un GPIO o un ADC. Il dettaglio dipende dalla piattaforma, ma il principio non cambia: il distacco fisico deve arrivare allo stack in una forma che ne azzeri lo stato. La documentazione Espressif per i device self-powered, ad esempio, richiede un monitor VBUS esterno al dominio a 5 V e specifica che il segnale di sensing debba scendere rapidamente dopo l'unplug.[^esp-self-powered] Non è una prescrizione universale per ogni MCU, ma mostra bene il tipo di contratto che l'hardware deve offrire al software.

## Come un device si presenta sul bus

La presenza di VBUS non rende automaticamente visibile il device all'host.

In USB 2.0 full-speed e low-speed, il device segnala la propria presenza tramite una terminazione di pull-up:

- su `D+` per un device full-speed;
- su `D-` per un device low-speed.

Quando il pull-up viene abilitato, la porta host rileva il cambiamento dello stato elettrico e può iniziare la procedura di connessione.

In TinyUSB la presentazione viene normalmente controllata tramite:

```cpp
tud_connect();
```

La funzione complementare è:

```cpp
tud_disconnect();
```

Il nome `connect` può essere fuorviante. La funzione non certifica che un host abbia configurato il device. Nel porting TinyUSB, `dcd_connect()` e `dcd_disconnect()` controllano la connessione elettrica del device, normalmente attraverso il pull-up sulle linee dati; la state machine USB resta un livello separato.[^tinyusb-porting]

Possiamo rappresentare la sequenza in questo modo:

![Sequenza dall'attach USB alla configurazione del device](/blog/images/usb_vbus_enumerazione_routing/enumeration-flow.svg)

*VBUS permette di iniziare il tentativo. Soltanto le richieste dell'host portano il device fino alla configurazione e alla callback di mount.*

Un caricatore può arrivare al primo passaggio. Non arriva necessariamente ai successivi.

## Il bus reset

Dopo aver rilevato l'attach, l'host esegue un bus reset.

Il reset:

- riporta il device nello stato USB iniziale;
- rende valido l'indirizzo predefinito `0`;
- azzera la configurazione precedente;
- prepara una nuova enumerazione;
- reimposta gli endpoint e i class driver nello stack.

Non si tratta di un riavvio completo del microcontrollore. È un reset della macchina a stati USB.

Un caricatore non esegue questo passaggio, perché non controlla il bus come host.

## L'endpoint di controllo 0

Ogni device USB deve implementare l'endpoint di controllo `0`, spesso abbreviato in `EP0`.

L'host lo usa per le richieste standard necessarie all'enumerazione:

- leggere i descrittori;
- assegnare un indirizzo;
- selezionare una configurazione;
- leggere o modificare lo stato del device;
- inoltrare richieste di classe o vendor-specific.

Un control transfer comprende normalmente:

1. una fase di setup;
2. un'eventuale fase dati;
3. una fase di status.

EP0 esiste prima degli endpoint HID, CDC o MSC. È il canale con cui host e device costruiscono la sessione.

## I descrittori USB

I descrittori sono strutture con cui il device descrive se stesso all'host.

### Device descriptor

Contiene informazioni globali come:

- versione USB supportata;
- identificativi vendor e product;
- classe generale;
- dimensione massima dei pacchetti su EP0;
- numero di configurazioni.

### Configuration descriptor

Descrive una configurazione completa del device e include, direttamente o indirettamente:

- consumo di corrente dichiarato;
- attributi di alimentazione;
- interfacce;
- endpoint;
- descrittori specifici delle classi.

### Interface descriptor

Raggruppa una funzione logica del device. Un dispositivo composito può esporre più interfacce, ad esempio HID e CDC nello stesso collegamento.

### Endpoint descriptor

Definisce indirizzo, direzione, tipo di trasferimento, dimensione massima del pacchetto e intervallo di polling.

### String descriptor

Fornisce stringhe leggibili come produttore, nome del prodotto e numero seriale.

## L'enumerazione passo per passo

La sequenza concreta può variare tra sistemi operativi e controller, ma il percorso logico è il seguente.

### 1. Rilevamento dell'attach

L'host rileva la terminazione del device sulle linee dati.

### 2. Bus reset

Il device torna nello stato iniziale del protocollo e risponde all'indirizzo `0`.

### 3. Prime richieste di descrittore

L'host legge le informazioni necessarie per conoscere la dimensione di EP0 e identificare la periferica.

### 4. Assegnazione dell'indirizzo

L'host invia `SET_ADDRESS`. Da quel momento il device risponde al nuovo indirizzo.

### 5. Lettura della configurazione

L'host recupera i descrittori di configurazione, interfaccia ed endpoint.

### 6. Selezione della configurazione

L'host invia `SET_CONFIGURATION` con un valore non nullo.

A questo punto il device entra nello stato **Configured**. Gli endpoint non di controllo descritti dalla configurazione vengono aperti e la normale comunicazione di classe può iniziare.[^usb-concepts][^tinyusb-porting]

### 7. Funzionamento della classe

Il sistema operativo associa il driver appropriato e inizia a usare HID, CDC, MSC o le altre interfacce esposte.

Nel caso di una tastiera, soltanto ora ha senso considerare USB come canale disponibile per i report.

## Una mappa mentale degli stati

Possiamo riassumere i livelli osservabili in questo modo:

![Stati osservabili di una connessione USB e autorità di ogni passaggio](/blog/images/usb_vbus_enumerazione_routing/usb-authority-states.svg)

*Il percorso separa alimentazione, presentazione, controllo, configurazione, disponibilità della classe e scelta applicativa.*

L'errore iniziale consisteva nel saltare direttamente dal secondo all'ultimo stato.

## `tud_connected()`, `tud_mounted()` e `tud_ready()`

TinyUSB espone diversi segnali, ognuno con un significato differente. Conviene trattarli come osservazioni della state machine, non come sinonimi di «cavo collegato».

### `tud_connected()`

Nell'API corrente è descritto come vero quando il device è uscito dal bus reset e ha ricevuto i primi dati dall'host. Nel core attuale il flag `connected` viene impostato alla ricezione del primo setup packet su EP0.[^tinyusb-api][^tinyusb-core]

È quindi una buona prova che dall'altra parte esista un attore capace di parlare USB. Non dimostra però che l'host abbia terminato l'enumerazione, scelto una configurazione o aperto gli endpoint HID.

### `tud_mounted()`

Indica che esiste una configurazione USB attiva.

Nel device core TinyUSB la funzione restituisce vero quando `cfg_num` è diverso da zero. Quel valore viene aggiornato durante la gestione di `SET_CONFIGURATION`; con una configurazione non nulla viene invocata `tud_mount_cb()`, mentre `SET_CONFIGURATION(0)` provoca l'unmount.[^tinyusb-core]

Per una policy che deve sapere se l'host abbia realmente completato il percorso fino allo stato Configured, questo è un segnale molto più autorevole di VBUS.

### `tud_ready()`

Combina `tud_mounted()` con l'assenza di suspend:[^tinyusb-api]

```cpp
bool tud_ready()
{
    return tud_mounted() && !tud_suspended();
}
```

Può essere utile prima di mettere in coda un trasferimento, ma non dovrebbe essere confuso con la policy di route.

Un device può essere correttamente configurato e poi sospeso dall'host. In questo caso la sessione continua a esistere, ma il traffico e l'eventuale remote wakeup devono rispettare le regole di suspend.

### Disponibilità della classe

Anche `mounted` non risponde a ogni domanda.

In un device composito, la configurazione può essere attiva mentre una specifica interfaccia applicativa non è ancora utilizzabile nel modo desiderato. Una CDC può richiedere che il terminale apra la porta e asserisca DTR; una classe vendor può avere un proprio handshake; un endpoint può essere occupato; una HID può essere configurata ma sospesa.

La catena di autorità diventa quindi:

1. VBUS dimostra che una sorgente di alimentazione è presente.
2. `connected` o un setup packet dimostrano che un host ha iniziato a comunicare.
3. `mounted` o `SET_CONFIGURATION != 0` dimostrano che una configurazione USB è attiva.
4. Lo stato della classe stabilisce se la specifica funzione può trasferire.
5. `route-active` registra che la policy del prodotto ha scelto USB.

### Route applicativa

La route appartiene a un livello ancora superiore. È una decisione del prodotto, non dello standard USB.

Il firmware può scegliere di mantenere BLE anche con USB configurata, può offrire una selezione manuale oppure può dare priorità a USB. Lo stack dimostra che il link è disponibile; la policy decide come usarlo.

## Perché BC1.2 non risolve il problema

Battery Charging 1.2 distingue diverse tipologie di porta, tra cui:[^bc12]

- **SDP**, Standard Downstream Port;
- **CDP**, Charging Downstream Port;
- **DCP**, Dedicated Charging Port.

Questa classificazione è utile per stabilire quanta corrente possa essere assorbita e per riconoscere alcune firme elettriche sulle linee dati.

Tuttavia, non è un'autorità sufficiente per il routing applicativo.

Le ragioni principali sono:

- descrive soprattutto capacità di alimentazione e firme elettriche;
- non dimostra che l'host abbia completato l'enumerazione;
- sorgenti moderne possono non comportarsi come i vecchi caricabatterie USB-A;
- cavi e adattatori possono rendere il risultato ambiguo;
- lega la policy di comunicazione a uno specifico charger IC o a una particolare architettura hardware.

In sostanza, BC1.2 può essere utile per la gestione della corrente e per la diagnostica. Non dovrebbe essere usato come prova definitiva della presenza di un host dati. Il compliance plan stesso tratta separatamente la rilevazione della porta, l'enumerazione e il successivo `Set Configuration 1`: è una distinzione utile anche a livello di firmware.[^bc12-compliance]

Lo stesso vale per USB Power Delivery. Un contratto di potenza dimostra che due port partner hanno negoziato l'alimentazione. Non dimostra, da solo, che una classe USB 2.0 sia stata enumerata e configurata.[^typec-overview]

## Il problema dei device self-powered: uno stato mounted può diventare obsoleto

Nei dispositivi alimentati esternamente, il distacco del cavo non spegne il firmware. Se il controller o l'integrazione del PHY non notificano correttamente l'unplug, lo stack può conservare parte dello stato della sessione precedente.

Questo è particolarmente insidioso quando una policy usa `tud_mounted()` come autorità.

La sequenza problematica può essere la seguente:

![Uno stato mounted che sopravvive al distacco e viene letto durante una nuova sessione con un caricatore](/blog/images/usb_vbus_enumerazione_routing/stale-mount-session.svg)

*Se l'unplug non raggiunge lo stack, un valore corretto per la sessione precedente può diventare un falso positivo nella successiva.*

A questo punto anche il segnale corretto viene interpretato nel modo sbagliato, perché non descrive più la sessione corrente.

### Che cosa accade nel core di TinyUSB

Nell'implementazione corrente, `tud_mounted()` verifica se il numero di configurazione attiva sia diverso da zero.[^tinyusb-core]

Lo stato viene azzerato in diversi percorsi coerenti con il protocollo, tra cui:

- bus reset;
- evento di unplug;
- `SET_CONFIGURATION(0)` inviato dall'host;
- deinizializzazione dello stack.

Il punto importante è che `tud_disconnect()` delega la rimozione elettrica a `dcd_disconnect()`. Nel core non esegue direttamente `configuration_reset()`: l'azzeramento dello stato avviene quando arrivano eventi come bus reset o `DCD_EVENT_UNPLUGGED`, quando l'host invia `SET_CONFIGURATION(0)` oppure durante la deinizializzazione.[^tinyusb-core]

Se il distacco fisico non produce un vero evento di unplug, la sessione precedente può quindi sopravvivere più del previsto. Sono stati riportati casi pubblici in cui `tud_connected()` e `tud_mounted()` restavano veri dopo il distacco su un device alimentato esternamente, oltre a problemi analoghi nell'integrazione ESP-IDF.[^tinyusb-2478][^esp-idf-12360]

### La regola progettuale

Per un device self-powered dobbiamo assicurarci che:

1. VBUS venga rilevata in modo affidabile;
2. la scomparsa di VBUS venga propagata immediatamente al livello USB;
3. lo stack riceva l'evento di distacco previsto dalla piattaforma;
4. la configurazione attiva venga azzerata;
5. le callback di unmount e i livelli applicativi vengano aggiornati.

Il modo preciso dipende dal controller e dal relativo DCD. Su alcune piattaforme il PHY genera l'evento automaticamente. Su altre è necessario un monitor esterno e un adattatore software.

È doveroso specificare che generare manualmente un evento low-level non dovrebbe essere la prima soluzione copiata alla cieca. Prima bisogna verificare il contratto della piattaforma, la gestione della coda eventi e il contesto di esecuzione richiesto dallo stack.

## Dimostrare che il mount appartiene alla sessione corrente

Controllare soltanto il valore istantaneo di `tud_mounted()` non basta quando il device può conservare uno stato obsoleto.

Una policy più robusta richiede una **nuova evidenza** prodotta durante il probe corrente. Il modo più semplice è contare gli eventi di mount:

```cpp
static uint32_t mount_sequence;

void tud_mount_cb()
{
    ++mount_sequence;
    on_usb_mounted();
}
```

All'inizio del probe memorizziamo il valore corrente:

```cpp
probe.mount_sequence_at_start = mount_sequence;
```

Il commit è autorizzato soltanto se:

```cpp
bool probe_has_fresh_mount()
{
    return tud_mounted()
        && mount_sequence != probe.mount_sequence_at_start;
}
```

Questa condizione non sostituisce la corretta gestione dell'unplug. Evita però che un `mounted = true` ereditato dalla sessione precedente venga interpretato come successo immediato del nuovo probe.

La stessa idea può essere espressa con un `session_id`, un contatore incrementato alla caduta di VBUS o al bus reset, oppure con un latch armato all'inizio del probe e chiuso da `tud_mount_cb()`. Ciò che conta è il requisito:

> Il commit deve dipendere da un evento osservato dopo l'inizio del tentativo corrente, non soltanto da uno stato letto in memoria.

## Il meccanismo: probe, poi commit

A questo punto possiamo tornare alla domanda iniziale: come distinguere un host da un caricatore senza affidarsi a VBUS o alla classificazione della sorgente?

La soluzione consiste nel cambiare il significato dell'attach.

VBUS non provoca più direttamente il passaggio a USB. Avvia invece un **probe**.

Durante il probe:

1. il canale USB viene inizializzato, se necessario;
2. il device viene presentato sul bus;
3. la route applicativa rimane sul canale precedente;
4. il firmware attende una configurazione reale;
5. se arriva un nuovo evento di mount e `tud_mounted()` è vero, la route viene adottata;
6. se scade il timeout, il probe viene chiuso senza cambiare route.

La sequenza diventa:

![Meccanismo probe-then-commit per adottare USB soltanto dopo un mount fresco](/blog/images/usb_vbus_enumerazione_routing/probe-then-commit.svg)

*Il probe rende il device visibile senza sottrarre subito la route al canale precedente. Il commit avviene soltanto dopo una nuova configurazione.*

Il punto centrale è la separazione tra **presentare il device** e **instradare l'input verso USB**.

### Perché il probe funziona

Un host reale può:

- rilevare il pull-up;
- eseguire il bus reset;
- inviare richieste su EP0;
- assegnare un indirizzo;
- selezionare una configurazione.

Un caricatore non può completare questa sequenza.

Non stiamo quindi cercando di classificare meglio la sorgente. Stiamo chiedendo all'altra estremità di dimostrare di essere un host attraverso il protocollo USB stesso.

## Separare la presentazione dalla route

Una possibile implementazione mantiene almeno questi stati:

```cpp
struct UsbRouteState {
    bool vbus_present;
    bool probe_active;
    bool route_active;
};
```

La presentazione sul bus può essere riconciliata con una regola simile:

```cpp
void reconcile_usb_presentation(const UsbRouteState& state)
{
    const bool should_present =
        state.vbus_present && (state.probe_active || state.route_active);

    if (should_present) {
        tud_connect();
    } else {
        tud_disconnect();
    }
}
```

Il codice reale dovrebbe mantenere anche lo stato di presentazione già applicato, in modo da chiamare `tud_connect()` o `tud_disconnect()` soltanto sulle transizioni. Deve inoltre rispettare il contratto del controller: in TinyUSB il comportamento concreto è implementato dal DCD della piattaforma.[^tinyusb-porting]

La relazione logica resta quella importante: `presentazione USB = VBUS && (probe || route attiva)`.

Quando il probe ha successo, il passaggio da `probe_active` a `route_active` non dovrebbe produrre un falso disconnect. Il device è già configurato; la policy deve soltanto trasferire la proprietà logica del collegamento.

## Sicurezza dei report durante il probe

Durante il probe il device è visibile sul bus, ma la route rimane ancora su BLE.

Il percorso di invio deve quindi essere protetto indipendentemente dalla presentazione elettrica:

```cpp
bool can_send_usb_report()
{
    return usb_route_active()
        && tud_mounted()
        && !tud_suspended();
}
```

La condizione esatta dipende dall'architettura, ma il principio è fondamentale:

> Presentare temporaneamente USB non deve permettere al canale di sottrarre o duplicare input prima del commit.

In un dispositivo HID, questo evita che i report vengano inviati contemporaneamente su BLE e USB oppure che vengano rimossi dalla coda BLE mentre il probe è ancora in corso.

### Il passaggio di route deve chiudere lo stato precedente

Per HID non basta cambiare il puntatore al trasporto. Una route può essere abbandonata mentre l'host precedente crede ancora che un tasto o un modificatore siano premuti.

Una transizione robusta dovrebbe quindi:

1. impedire la generazione di nuovi report sulla route uscente;
2. inviare, quando il link lo consente, un report neutro che rilasci tasti, pulsanti e modifier;
3. svuotare o invalidare i report appartenenti alla vecchia route;
4. ricostruire lo stato corrente sulla route entrante;
5. riaprire il flusso degli eventi.

Questo passaggio evita i classici «tasti bloccati» e rende il commit una transazione applicativa, non una semplice assegnazione booleana.

## La macchina a stati

Una macchina a stati semplificata può essere descritta così:

![Macchina a stati Idle, Probing e Active per la route USB](/blog/images/usb_vbus_enumerazione_routing/route-state-machine.svg)

*Lo stato Probing rende esplicito un tentativo cancellabile. Active viene raggiunto soltanto con evidenza prodotta nella sessione corrente.*

Una possibile implementazione in pseudocodice:

```cpp
void evaluate_usb_policy()
{
    switch (usb_state) {
    case UsbState::Idle:
        if (confirmed_vbus_attach()) {
            ensure_usb_initialized();
            begin_usb_probe();
            probe_deadline = now() + probe_timeout;
            usb_state = UsbState::Probing;
        }
        break;

    case UsbState::Probing:
        if (!vbus_present() || usb_disabled() || entering_standby()) {
            end_usb_probe();
            usb_state = UsbState::Idle;
            break;
        }

        if (probe_has_fresh_mount()) {
            commit_usb_route_transaction();
            usb_state = UsbState::Active;
            break;
        }

        if (now() >= probe_deadline) {
            end_usb_probe();
            usb_state = UsbState::Idle;
        }
        break;

    case UsbState::Active:
        if (!vbus_present() || !tud_mounted()) {
            fallback_to_previous_route();
            usb_state = UsbState::Idle;
        }
        break;
    }
}
```

Non è necessario che la macchina reale usi esattamente questi stati. È però importante che il probe sia un episodio esplicito, cancellabile e osservabile, e che il commit sia atomico dal punto di vista applicativo: o la proprietà del flusso passa interamente a USB, oppure resta sul canale precedente.

## Due consumatori, due tempi diversi

VBUS può essere usata da almeno due sottosistemi:

- lo stack USB, che deve sapere rapidamente quando la sessione fisica è terminata;
- la policy applicativa, che vuole evitare transizioni dovute a glitch o brevi cadute di tensione.

Questi consumatori non hanno necessariamente bisogno dello stesso debounce.

### Reazione rapida per lo stack

Quando VBUS scompare, il livello USB dovrebbe ricevere l'informazione il prima possibile. Ritardare l'unplug può lasciare endpoint, callback e configurazione in uno stato non più veritiero.

Il segnale può comunque attraversare il filtro hardware necessario a eliminare impulsi impossibili, ma non dovrebbe attendere per forza il debounce lungo usato dalla policy.

### Debounce per la route

La route, invece, può richiedere che la presenza o l'assenza restino stabili per alcune centinaia di millisecondi.

Un breve sag di VBUS non dovrebbe:

- far cadere la route attiva;
- avviare un nuovo probe;
- forzare una riconnessione BLE;
- produrre animazioni o cambi di modalità visibili all'utente.

La regola generale è quindi:

![Separazione tra il filtro rapido usato dallo stack USB e il debounce usato dalla policy](/blog/images/usb_vbus_enumerazione_routing/vbus-consumers.svg)

*Lo stack deve chiudere rapidamente la sessione fisica, mentre la route può attendere un segnale stabile prima di cambiare comportamento.*

Usare un solo booleano per entrambi i livelli rende il comportamento più semplice da scrivere, ma spesso meno corretto.

## Suspend non significa detach

Un'altra confusione frequente riguarda il suspend.

Il bus può entrare in suspend mentre il device resta configurato. In TinyUSB `tud_ready()` diventa falso perché combina mount e assenza di suspend, ma `tud_mounted()` può restare vero.[^tinyusb-api]

La policy deve quindi separare due domande:

- **la sessione USB esiste ancora?**: usare mount, VBUS e gli eventi di unplug;
- **posso trasferire adesso?**: considerare suspend, endpoint busy e stato della classe.

Far ricadere immediatamente la route su BLE a ogni suspend può produrre oscillazioni inutili, duplicazioni e ri-enumerazioni. In molti prodotti è più corretto mantenere la proprietà della route USB e sospendere temporaneamente l'invio, eventualmente usando remote wakeup quando è stato abilitato dall'host e quando la classe lo consente.

## Come scegliere timeout e intervalli

Non esiste un valore universale valido per ogni host.

L'enumerazione può dipendere da:

- sistema operativo;
- hub;
- KVM;
- stato di resume;
- carico della macchina;
- ritardi del firmware;
- inizializzazione del controller.

Un timeout troppo breve può rifiutare host validi. Un timeout eccessivamente lungo mantiene il pull-up presentato inutilmente a un caricatore e rallenta la chiusura del probe.

Un approccio prudente consiste nel:

1. misurare la latenza su più host reali;
2. includere un margine per hub e KVM;
3. mantenere il timeout configurabile;
4. registrare il tempo impiegato dall'enumerazione;
5. distinguere timeout di laboratorio da valori di produzione.

Nella pratica, il debounce della route viene spesso misurato in centinaia di millisecondi, mentre il probe può concedere alcuni secondi. Questi numeri sono ordini di grandezza, non costanti da copiare senza misure.

## Prima insidia: inizializzazione lazy del canale USB

Molte architetture inizializzano i canali di comunicazione soltanto quando diventano attivi.

Prima del meccanismo di probe, USB poteva essere inizializzata nel momento stesso in cui la route veniva selezionata. Dopo l'introduzione del gate, iniziare il probe prima di installare lo stack impedisce di presentare il device, quindi nessun host può enumerarlo e USB non verrà mai adottata.

Qualunque meccanismo che presenti il device prima di attivare la route deve quindi forzare l'inizializzazione del canale.

La sequenza corretta diventa:

![Ordine corretto tra inizializzazione lazy, probe e presentazione USB](/blog/images/usb_vbus_enumerazione_routing/lazy-initialization.svg)

*L'inizializzazione prepara lo stack senza adottare la route. Il pull-up viene abilitato soltanto quando il probe è pronto a osservare la nuova sessione.*

È una regressione facile da introdurre, perché il codice del probe può sembrare corretto mentre lo stack non è mai stato installato. Nelle versioni recenti TinyUSB l'inizializzazione del device stack e il controllo della connessione elettrica sono API distinte; l'ordine esatto resta dipendente dal BSP e dal DCD.[^tinyusb-api]

## Seconda insidia: rami di policy che bypassano il gate

Non basta proteggere il ramo che reagisce al fronte di attach.

Una policy complessa può adottare USB anche in altri casi, ad esempio:

- recupero da una route non valida;
- boot con VBUS già presente;
- ripristino dopo standby;
- fallback quando BLE non è disponibile;
- selezione automatica basata sulla semplice presenza del canale.

Se anche uno solo di questi rami usa `vbus_present` come prova sufficiente, un caricatore può ancora catturare la route.

Conviene quindi rendere esplicito un concetto come:

```cpp
bool usb_adoption_allowed = tud_mounted();
```

oppure, durante la macchina a stati:

```cpp
bool usb_adoption_allowed = probe_succeeded;
```

Il gate deve essere applicato a tutti i percorsi automatici che portano a USB.

Una scelta manuale dell'utente è diversa. Se il prodotto permette di forzare USB, quella decisione può bypassare il gate, perché rappresenta un'intenzione esplicita. Il comportamento va comunque documentato: forzare USB verso un caricatore significa scegliere consapevolmente una route senza link.

## Terza insidia: cache e snapshot obsoleti

Gli eventi USB possono aggiornarsi più rapidamente degli snapshot applicativi.

Un'interfaccia o una macchina a stati di livello superiore potrebbe memorizzare:

- route corrente;
- disponibilità BLE;
- stato mounted;
- ultimo link valido;
- modalità di configurazione;
- timestamp dell'ultima transizione.

Se lo snapshot viene aggiornato soltanto da alcuni eventi e non da mount/unmount, la policy può reagire usando informazioni vecchie.

Un esempio tipico è una modalità di recovery che si attiva quando nessun link è disponibile. Se il link-down USB viene osservato immediatamente ma lo stato BLE nello snapshot è ancora obsoleto, il sistema può entrare nella modalità di recovery proprio mentre BLE sta tentando di riconnettersi.

La soluzione non è necessariamente aggiungere un ritardo arbitrario. Prima bisogna chiarire:

- quali eventi rendono invalida la cache;
- quale stato deve essere letto live;
- quanto dura la finestra di riconnessione attesa;
- chi possiede la decisione finale.

Quando una transizione dipende dall'esistenza reale di un link, leggere il segnale autorevole al momento della decisione è spesso più sicuro che affidarsi a uno snapshot longevo.

## Una tabella delle autorità

Quando il firmware cresce, è utile rendere esplicita la domanda a cui ogni segnale può rispondere.

| Segnale | Dimostra | Non dimostra |
|---|---|---|
| VBUS valida | Una sorgente sta alimentando il collegamento | Presenza di un host dati |
| Attach su CC | Esiste un partner Type-C e sono stati risolti i ruoli iniziali | Enumerazione USB 2.0 completata |
| Pull-up presentato | Il device si è reso rilevabile sul bus | Ricezione di traffico dall'host |
| Bus reset | Un host controlla il bus e apre una nuova sessione | Configurazione selezionata |
| Primo setup packet / `tud_connected()` | L'host ha iniziato il controllo su EP0 | Endpoint di classe pronti |
| `SET_CONFIGURATION != 0` / `tud_mounted()` | Una configurazione è attiva | Classe utilizzabile in ogni istante |
| `tud_ready()` | Configurato e non sospeso | Endpoint libero o handshake applicativo completato |
| `usb_route_active` | La policy ha assegnato il flusso a USB | Salute futura del collegamento |

Questa tabella evita il booleano onnipotente `usb_connected`, che tende ad accumulare significati incompatibili fino a diventare impossibile da usare correttamente.

## Comportamento atteso end-to-end

### Collegamento a un caricatore durante l'uso BLE

1. VBUS viene rilevata.
2. Dopo il debounce della policy inizia il probe.
3. Il device si presenta sulle linee dati.
4. Nessun host esegue il bus reset o completa l'enumerazione.
5. Il timeout scade.
6. Il pull-up viene rimosso.
7. La route rimane BLE.

L'utente continua a usare il dispositivo senza interruzioni.

### Collegamento a un host durante l'uso BLE

1. VBUS viene rilevata.
2. Il probe presenta USB.
3. L'host rileva il device.
4. Avvengono bus reset ed enumerazione.
5. arriva `tud_mount_cb()` e `tud_mounted()` diventa vero.
6. La policy riconosce un mount fresco per il probe corrente e adotta USB.
7. BLE può essere mantenuto, sospeso o disconnesso secondo le regole del prodotto.

Il commit non dovrebbe produrre una nuova disconnessione elettrica: il device è già enumerato.

### Scollegamento da un host

1. VBUS scompare.
2. Lo stack riceve immediatamente l'unplug.
3. La configurazione viene azzerata.
4. I trasferimenti USB vengono bloccati.
5. La policy conferma il distacco.
6. La route torna al canale di fallback.
7. Un'eventuale finestra di reconnect evita modalità di recovery premature.

### Boot con un host già collegato

Il firmware deve inizializzare correttamente lo stato VBUS anche senza attendere un fronte hardware che potrebbe non arrivare.

Una volta confermata la presenza:

1. viene inizializzato il canale USB;
2. parte il probe;
3. l'host enumera il device;
4. USB viene adottata.

### Boot con un caricatore già collegato

La presenza iniziale avvia il probe, ma nessuna configurazione viene completata. La route automatica resta sul canale disponibile, senza considerare la sola alimentazione come un link dati.

### Unplug e replug rapido

Un unplug molto rapido può essere assorbito dal debounce della policy, mentre lo stack riceve comunque gli eventi fisici necessari a ricostruire la sessione.

Questo scenario va testato con attenzione. Il comportamento dipende da host, controller e durata effettiva del distacco.

## Telemetria utile durante il debug

Quando USB «non funziona», una singola variabile booleana raramente basta.

Conviene osservare almeno:

- VBUS raw;
- VBUS debounced;
- stato del pull-up;
- inizio e fine del probe;
- ricezione del bus reset;
- ricezione del primo setup packet;
- indirizzo assegnato;
- configurazione attiva;
- contatore o generation ID della sessione;
- contatore degli eventi di mount;
- `tud_connected()`;
- `tud_mounted()`;
- stato di suspend;
- route applicativa;
- motivo dell'ultima transizione;
- risultato dell'ultimo trasferimento HID;
- timestamp degli eventi.

Una timeline rende molti problemi immediatamente visibili:

![Confronto tra la sequenza osservata con un host USB e quella osservata con un caricatore](/blog/images/usb_vbus_enumerazione_routing/host-vs-charger-timeline.svg)

*Un host produce reset, traffico di controllo e configurazione. Con un caricatore il probe arriva al timeout e la route precedente resta attiva.*

I valori sono soltanto illustrativi. Ciò che conta è la sequenza degli eventi.

## Matrice minima di test

| Scenario | Risultato atteso |
|---|---|
| Boot senza cavo | Nessuna sessione USB; route di fallback disponibile. |
| Boot con host | Enumerazione e successiva adozione USB. |
| Boot con caricatore | Nessuna adozione automatica di USB. |
| BLE attivo, poi host | Passaggio a USB soltanto dopo la configurazione. |
| BLE attivo, poi caricatore | BLE continua a trasportare l'input. |
| Host scollegato | Unmount coerente e fallback controllato. |
| Host, unplug, poi caricatore | Nessuno stato mounted ereditato e nessun commit senza un nuovo mount. |
| Cavo charge-only | VBUS presente, nessuna enumerazione. |
| Hub alimentato | Enumerazione entro il timeout previsto. |
| Hub non alimentato | Comportamento coerente anche durante sag di VBUS. |
| KVM lento | Nessun falso rifiuto con il timeout di produzione. |
| USB disabilitata durante il probe | Probe annullato e presentazione rimossa. |
| Ingresso in standby durante il probe | Probe chiuso secondo la policy energetica. |
| Selezione manuale USB | Comportamento coerente con l'intenzione esplicita. |
| Suspend e resume | La route resta coerente; l'invio si ferma e riprende senza falso detach. |
| Cambio route con tasto premuto | Nessun tasto o modifier resta bloccato sul trasporto uscente. |
| Unplug/replug rapido | Nuova sessione valida o fallback controllato. |

È utile ripetere i test su:

- GNU/Linux;
- macOS;
- Windows;
- hub differenti;
- KVM, se supportati;
- caricatore USB-A;
- caricatore USB-C;
- power bank;
- cavo dati;
- cavo charge-only.

## Errori concettuali comuni

### «VBUS alta significa host collegato»

No. Significa soltanto che è presente una sorgente di alimentazione.

### «USB Type-C significa automaticamente dati»

No. Type-C descrive il connettore e parte del sistema di attach e alimentazione. Le capacità dati dipendono da porte, controller e cavo.

### «Se il charger IC rileva una porta dati, allora esiste sicuramente un host»

Non necessariamente. La classificazione elettrica non equivale a un'enumerazione completata.

### «`tud_connect()` significa che USB è pronta»

No. Significa che il device viene presentato sul bus.

### «`tud_connected()` e `tud_mounted()` sono equivalenti»

No. Nel core corrente il primo viene marcato alla ricezione del primo setup packet; il secondo riflette una configurazione attiva.[^tinyusb-core]

### «`tud_disconnect()` azzera sempre tutta la sessione»

Non è una garanzia universale. Il comportamento dipende dal DCD e dall'arrivo degli eventi di reset o unplug allo stack.

### «Se `tud_mounted()` è vero, il mount appartiene sicuramente al cavo attuale»

Non in un device self-powered con detach non propagato correttamente. La policy dovrebbe richiedere un nuovo evento di mount o una generation della sessione coerente con il probe corrente.

### «Un solo debounce va bene per tutto»

Non sempre. Lo stack e la policy hanno obiettivi temporali differenti.

## Limitazioni e compromessi

Il meccanismo probe-then-commit risolve il problema principale, ma non elimina ogni decisione progettuale.

### Il timeout resta una scelta

Un host estremamente lento può non completare l'enumerazione entro la finestra prevista. Il valore deve quindi essere misurato e verificato sui casi d'uso reali.

### L'enumerazione dimostra un host USB, non l'intera salute applicativa

Un device può risultare configurato e incontrare successivamente errori di trasferimento, suspend anomalo o problemi di classe. Può anche restare enumerato mentre l'applicazione host non consuma più i report come previsto. La disponibilità iniziale del link non sostituisce il monitoraggio operativo.

### Il comportamento manuale va definito

Se l'utente forza USB, bisogna decidere se mantenere la scelta anche senza host, mostrare un errore o tornare automaticamente al fallback.

### Il low-level rimane dipendente dalla piattaforma

VBUS sensing, generazione dell'unplug e gestione del pull-up dipendono dal controller, dal PHY e dal porting TinyUSB. Il pattern di policy è portabile; l'integrazione fisica non lo è completamente.

### Resta un caso limite nelle sostituzioni molto rapide

Una sostituzione host-caricatore più rapida del debounce può produrre una breve finestra in cui la route non rappresenta ancora la nuova realtà fisica. Il sistema deve comunque recuperare tramite la perdita del mount, gli errori di trasferimento o il successivo controllo di presenza.

## Come scegliere il segnale corretto

Prima di usare una variabile in una policy, conviene formulare esplicitamente la domanda.

### «È presente una sorgente di alimentazione?»

Usare VBUS o il segnale equivalente del power-management hardware.

### «Quanta corrente posso assorbire?»

Usare Type-C current advertisement, BC1.2, USB Power Delivery o il meccanismo previsto dalla piattaforma.

### «Un host ha iniziato a comunicare?»

Osservare bus reset, setup packet o `tud_connected()`.

### «Il device è stato configurato?»

Osservare `SET_CONFIGURATION`, le callback di mount o `tud_mounted()`. Nei device self-powered, verificare anche che l'evidenza appartenga alla sessione corrente.

### «Posso inviare dati in questo momento?»

Considerare configurazione, suspend, endpoint busy e stato della classe.

### «Devo spostare la route applicativa?»

Combinare il link autorevole con le regole del prodotto, la scelta dell'utente e gli eventuali fallback.

Non esiste dunque un unico booleano chiamato «USB connessa» capace di rispondere correttamente a tutte queste domande.

## Conclusione

Abbiamo visto come una connessione USB sia composta da passaggi distinti.

VBUS dimostra la presenza di alimentazione. I pin CC di USB Type-C gestiscono attach, orientamento e ruoli iniziali. Il pull-up presenta il device sul bus USB 2.0. Il bus reset apre una nuova sessione. EP0 permette all'host di leggere i descrittori, assegnare un indirizzo e selezionare una configurazione. Soltanto dopo `SET_CONFIGURATION` una classe come HID può essere considerata realmente disponibile.

Nei dispositivi self-powered la questione è ancora più delicata, perché il distacco del cavo non spegne il microcontrollore. VBUS deve quindi essere monitorata e l'unplug deve raggiungere correttamente lo stack, altrimenti lo stato della sessione precedente può sopravvivere.

La soluzione al problema host-versus-caricatore non consiste quindi nel classificare meglio la sorgente di alimentazione. Consiste nel lasciare che sia il protocollo a fornire la prova.

Presentiamo temporaneamente USB, attendiamo che un host completi l'enumerazione e adottiamo la route soltanto dopo un mount nuovo, appartenente al probe corrente. Il passaggio di route viene poi completato come una transazione: chiusura dello stato HID precedente, trasferimento della proprietà e apertura del nuovo canale. Un host reale supera il probe. Un caricatore no.

In sostanza, alimentazione, attach, enumerazione e route applicativa non sono sinonimi. Trattarli come stati separati rende il firmware più preciso, più facile da diagnosticare e meno incline a regressioni difficili da riprodurre.

## Riferimenti

### Specifiche e documentazione

- [USB 2.0 Specification]: specifica di base e raccolta degli ECN USB 2.0.
- [USB Type-C System Overview]: panoramica USB-IF su CC, ruoli, VBUS, VCONN e USB Power Delivery.
- [Battery Charging v1.2 Spec]: specifica BC1.2 ed errata.
- [USB Battery Charging 1.2 Compliance Plan]: procedure che distinguono rilevazione della porta, enumerazione e configurazione.
- [HID 1.11]: definizione della classe HID e comportamento degli endpoint interrupt.
- [TinyUSB USB Concepts]: modello host/device, trasferimenti, stati ed enumerazione.
- [TinyUSB Device API]: semantica pubblica di `tud_connected()`, `tud_mounted()`, `tud_ready()` e callback.
- [TinyUSB Porting]: contratto del Device Controller Driver, eventi di bus e gestione degli endpoint.
- [Self-Powered USB Device Solutions]: esempio di monitor VBUS per un device self-powered.

### Sorgenti e casi upstream

- [TinyUSB usbd.c]: implementazione di `connected`, `cfg_num`, bus reset, unplug e `SET_CONFIGURATION`.
- [TinyUSB issue #2478]: caso pubblico di stato connected/mounted persistente dopo il distacco su un device alimentato esternamente.
- [ESP-IDF issue #12360]: caso pubblico di unplug non rilevato in uno scenario self-powered.
- [ZMK issue #841]: problema di selezione USB quando è presente soltanto alimentazione.

### Crediti immagine

- Immagine di copertina: [USB Type-C plug 20170626.jpg] di [Santeri Viinamäki], Wikimedia Commons, licenza [CC BY-SA 4.0]. Immagine ritagliata e convertita in WebP per il layout del sito.

[^usb-concepts]: TinyUSB, [USB Concepts], in particolare ruoli host/device, stati, trasferimenti ed enumerazione.
[^hid11]: USB-IF, [Device Class Definition for HID 1.11]. Gli endpoint interrupt sono interrogati dall'host secondo il polling interval dichiarato.
[^typec-overview]: USB-IF, [USB Type-C System Overview], slide sul processo di discovery: CC risolve Source/Sink e DFP/UFP, mentre USB PD stabilisce il contratto di potenza e le funzioni dati seguono passaggi distinti.
[^esp-self-powered]: Espressif, [USB Device Driver: Self-Powered Device]. La pagina descrive il monitoraggio di VBUS necessario perché un device alimentato autonomamente riconosca connessione e disconnessione.
[^tinyusb-porting]: TinyUSB, [Porting]. La documentazione descrive `dcd_connect()`/`dcd_disconnect()`, gli eventi di bus e l'apertura degli endpoint dopo la selezione della configurazione.
[^tinyusb-api]: TinyUSB, [`src/device/usbd.h`]. I commenti dell'API distinguono connected, mounted, suspended e ready.
[^tinyusb-core]: TinyUSB, [`src/device/usbd.c`]. Nel core corrente `tud_mounted()` dipende da `cfg_num`; il primo setup packet imposta `connected`; bus reset e unplug richiamano il reset della configurazione; `SET_CONFIGURATION` aggiorna `cfg_num` e invoca mount/unmount.
[^bc12]: USB-IF, [Battery Charging v1.2 Spec and Adopters Agreement].
[^bc12-compliance]: USB-IF, [USB Battery Charging 1.2 Compliance Plan]. Le procedure di test trattano separatamente la detection elettrica e la successiva enumerazione/configurazione.
[^tinyusb-2478]: TinyUSB, [issue #2478: `tud_connected()` and `tud_mounted()` stay true after disconnected].
[^esp-idf-12360]: Espressif, [issue #12360: TinyUSB problems with USB unplugging detection].

[USB 2.0 Specification]: https://www.usb.org/document-library/usb-20-specification
[USB Type-C System Overview]: https://www.usb.org/sites/default/files/D1T1-2%20-%20USB%20Type-C%20System%20Overview.pdf
[Battery Charging v1.2 Spec]: https://www.usb.org/document-library/battery-charging-v12-spec-and-adopters-agreement
[USB Battery Charging 1.2 Compliance Plan]: https://www.usb.org/document-library/usb-battery-charging-12-compliance-plan
[HID 1.11]: https://www.usb.org/sites/default/files/documents/hid1_11.pdf
[Device Class Definition for HID 1.11]: https://www.usb.org/sites/default/files/documents/hid1_11.pdf
[TinyUSB USB Concepts]: https://docs.tinyusb.org/en/latest/reference/usb_concepts.html
[USB Concepts]: https://docs.tinyusb.org/en/latest/reference/usb_concepts.html
[TinyUSB Device API]: https://github.com/hathach/tinyusb/blob/master/src/device/usbd.h
[`src/device/usbd.h`]: https://github.com/hathach/tinyusb/blob/master/src/device/usbd.h
[TinyUSB Porting]: https://docs.tinyusb.org/en/latest/porting.html
[Porting]: https://docs.tinyusb.org/en/latest/porting.html
[Self-Powered USB Device Solutions]: https://docs.espressif.com/projects/esp-idf/en/v5.1.1/esp32s2/api-reference/peripherals/usb_device.html#self-powered-device
[USB Device Driver: Self-Powered Device]: https://docs.espressif.com/projects/esp-idf/en/v5.1.1/esp32s2/api-reference/peripherals/usb_device.html#self-powered-device
[TinyUSB usbd.c]: https://github.com/hathach/tinyusb/blob/master/src/device/usbd.c
[`src/device/usbd.c`]: https://github.com/hathach/tinyusb/blob/master/src/device/usbd.c
[TinyUSB issue #2478]: https://github.com/hathach/tinyusb/issues/2478
[issue #2478: `tud_connected()` and `tud_mounted()` stay true after disconnected]: https://github.com/hathach/tinyusb/issues/2478
[ESP-IDF issue #12360]: https://github.com/espressif/esp-idf/issues/12360
[issue #12360: TinyUSB problems with USB unplugging detection]: https://github.com/espressif/esp-idf/issues/12360
[ZMK issue #841]: https://github.com/zmkfirmware/zmk/issues/841
[Battery Charging v1.2 Spec and Adopters Agreement]: https://www.usb.org/document-library/battery-charging-v12-spec-and-adopters-agreement
[USB Type-C plug 20170626.jpg]: https://commons.wikimedia.org/wiki/File:USB_Type-C_plug_20170626.jpg
[Santeri Viinamäki]: https://commons.wikimedia.org/wiki/User:Zunter
[CC BY-SA 4.0]: https://creativecommons.org/licenses/by-sa/4.0/
