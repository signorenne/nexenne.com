---
title: "Buzzer su ESP32 con ESP-IDF: teoria, pilotaggio, suoni e melodie"
lang: it
date: 2026-07-29
lastmod: 2026-07-29
desc: "Guida ai buzzer su ESP32: tecnologie, circuiti di pilotaggio, LEDC, suoni, melodie e player non bloccanti con ESP-IDF."
read: "60 min"
tags: ["ESP32", "ESP-IDF", "Buzzer", "PWM", "LEDC", "Audio", "Embedded"]
categories: ["Embedded", "Tutorial", "Elettronica"]
image: "/blog/covers/buzzer_esp32_esp_idf_sounds_melodies.webp"
---

## Abstract

Durante lo sviluppo di interfacce fisiche mi sono trovato più volte a usare un buzzer per confermare un comando, segnalare un errore o attirare l'attenzione dell'utente.

In apparenza il problema sembra banale: si collega il componente a un GPIO, si genera un'onda quadra e il suono è pronto.

Non proprio.

Dietro due terminali possono nascondersi tecnologie e circuiti molto differenti. Un buzzer può essere piezoelettrico oppure magnetico, può integrare un oscillatore oppure richiedere un segnale esterno, può assorbire pochi milliampere oppure richiedere un transistor, può funzionare bene a una singola frequenza di risonanza oppure riprodurre una piccola melodia con intensità molto variabile da nota a nota.

A questo si aggiunge la parte firmware. Generare un tono è semplice; costruire un motore sonoro che rispetti tempo, pause, articolazione, priorità degli eventi e concorrenza con gli altri task richiede invece qualche scelta in più.

Ho quindi deciso di ricostruire l'argomento partendo dal principio fisico e arrivando a un'implementazione completa con ESP32 ed ESP-IDF. Vedremo:

- come nasce il suono;
- la differenza tra buzzer piezoelettrici e magnetici;
- la distinzione tra indicatori con oscillatore e trasduttori pilotati esternamente;
- come leggere un datasheet;
- quando sia possibile usare direttamente un GPIO e quando serva uno stadio di potenza;
- come generare toni con LEDC;
- come rappresentare note, tempo, pause e articolazione;
- come costruire melodie e segnali acustici senza bloccare l'applicazione;
- quali limiti separino un buzzer da un vero sistema audio.

L'obiettivo non è soltanto far emettere un beep. È capire quale informazione stiamo affidando al suono e progettare hardware e firmware in modo che quella informazione rimanga riconoscibile, ripetibile e coerente con il resto del sistema.

## Ambito dell'articolo

La parte elettronica rimane generale e può essere applicata a microcontrollori differenti.

Gli esempi firmware usano invece ESP32 ed ESP-IDF 6.0.2, con le API handle e driver correnti al momento della stesura. Non useremo quindi la funzione `tone()` dell'ambiente Arduino.

Ci concentreremo sui due tipi oggi più comuni nei prodotti embedded:

- buzzer piezoelettrici;
- buzzer magnetici o elettromagnetici.

Esistono anche dispositivi meccanici ed elettromeccanici differenti, oltre a sirene e annunciatori complessi. Il loro principio può essere affine, ma alimentazione, potenza e requisiti di sicurezza meritano un'analisi separata.

È inoltre doveroso specificare che gli schemi riportati sono concettuali. Valori di resistori, transistor, diodi, tensioni e duty cycle devono essere dimensionati sul datasheet del componente effettivamente scelto.

## Che cos'è un buzzer

Un buzzer è un dispositivo di segnalazione acustica.

Riceve energia elettrica e la trasforma in una vibrazione meccanica. La vibrazione mette in movimento l'aria e produce una variazione di pressione che il nostro orecchio percepisce come suono.

Nel firmware il buzzer viene spesso trattato come un'uscita binaria:

```text
0 -> silenzio
1 -> suono
```

Questa rappresentazione è sufficiente per alcuni indicatori attivi, ma non descrive tutto ciò che può accadere.

Con un trasduttore pilotato esternamente possiamo controllare almeno:

- frequenza;
- durata;
- ritmo;
- duty cycle;
- tensione di pilotaggio;
- sequenza delle note;
- pause;
- inviluppo approssimato;
- priorità del segnale acustico.

Il buzzer non interpreta il significato del suono. È il firmware a stabilire se due impulsi brevi significhino conferma, se una sequenza alternata indichi un errore o se una melodia accompagni l'avvio del dispositivo.

## Come nasce il suono

Un tono ideale è una variazione periodica della pressione dell'aria.

La frequenza indica quante volte il fenomeno si ripete in un secondo:

```text
frequenza = cicli / secondo
```

L'unità di misura è l'hertz:

```text
1 Hz = 1 ciclo al secondo
```

Un segnale a `440 Hz` completa dunque 440 periodi in un secondo.

Il periodo è l'inverso della frequenza:

```text
T = 1 / f
```

Per un tono a `1 kHz`:

```text
T = 1 / 1000
  = 1 ms
```

Con un'onda quadra al 50%, il segnale resta alto per circa `500 µs` e basso per altri `500 µs`.

### Altezza, intensità e timbro

Nel linguaggio musicale e percettivo è utile distinguere tre aspetti.

L'*altezza* dipende principalmente dalla frequenza fondamentale. Una frequenza maggiore viene normalmente percepita come una nota più acuta.

L'*intensità* dipende dalla pressione sonora prodotta e viene spesso espressa come SPL, *Sound Pressure Level*. Il valore dichiarato nel datasheet ha senso soltanto insieme alle condizioni di misura: distanza, tensione, frequenza, forma d'onda e ambiente.

Il *timbro* dipende invece dalla distribuzione delle armoniche e dal comportamento meccanico del trasduttore e dell'involucro.

Un'onda quadra non contiene soltanto la frequenza fondamentale. Contiene anche armoniche dispari. Per questo un buzzer pilotato con PWM produce un suono più ruvido rispetto a una sinusoide alla stessa frequenza.

Questo non è necessariamente un problema. Nei segnali di interfaccia, una forma d'onda ricca di armoniche può rendere il beep più riconoscibile. Tuttavia non bisogna confondere la frequenza impostata nel timer con l'intero contenuto spettrale emesso dal componente.

## Due classificazioni differenti

Una delle principali fonti di confusione nasce dal fatto che i buzzer vengono classificati usando parole che descrivono aspetti diversi.

La prima classificazione riguarda la tecnologia fisica:

- piezoelettrica;
- magnetica o elettromagnetica.

La seconda riguarda il pilotaggio:

- indicatore con oscillatore interno;
- trasduttore pilotato esternamente.

Nel linguaggio comune questi ultimi vengono spesso chiamati rispettivamente *buzzer attivi* e *buzzer passivi*.

La terminologia è utile, ma non sempre uniforme tra produttori e distributori. Per questo nel dubbio è preferibile cercare nel datasheet espressioni come:

```text
indicator
built-in oscillating circuit
self drive
transducer
external drive
rated frequency
```

La tecnologia e il tipo di pilotaggio non sono la stessa cosa.

Un buzzer piezoelettrico può integrare un oscillatore. Un altro piezoelettrico può richiedere un'onda quadra esterna. Lo stesso vale per diversi buzzer magnetici. Same Sky distingue esplicitamente tra *indicator*, che genera il tono applicando una tensione continua, e *transducer*, che richiede una forma d'onda esterna. Murata usa una distinzione analoga tra buzzer con circuito di oscillazione integrato e sounder pilotati esternamente. ([Same Sky][1]) ([Murata][2])

| Tecnologia | Pilotaggio | Comportamento tipico |
| ---------- | ---------- | -------------------- |
| Piezoelettrica | Indicatore / attivo | emette un tono predefinito con alimentazione continua |
| Piezoelettrica | Trasduttore / passivo | la frequenza dipende dal segnale esterno |
| Magnetica | Indicatore / attivo | integra il circuito necessario a generare il tono |
| Magnetica | Trasduttore / passivo | richiede una corrente alternata nella bobina |

![Le due classificazioni indipendenti dei buzzer: tecnologia fisica e tipo di pilotaggio](/blog/images/buzzer_esp32_esp_idf_sounds_melodies/buzzer_classification.svg)

*Tecnologia e pilotaggio rispondono a domande diverse. Prima si identifica come il componente produce il suono, poi si verifica se l'oscillazione nasce al suo interno o deve arrivare dal circuito esterno.*

## Buzzer piezoelettrici

Un elemento piezoelettrico cambia leggermente forma quando viene applicato un campo elettrico.

In un buzzer il materiale piezoelettrico è normalmente accoppiato a un disco metallico. Applicando una tensione alternata, il disco si flette prima in una direzione e poi nell'altra. Questa deformazione muove l'aria e produce il suono. ([Murata][3])

Dal punto di vista elettrico, un piezo viene spesso approssimato come un carico capacitivo.

Questo significa che la corrente dipende anche dalla frequenza:

```text
I = C * dV/dt
```

Per una sinusoide possiamo ragionare in termini di reattanza capacitiva:

```text
Xc = 1 / (2 * pi * f * C)
```

Aumentando la frequenza, la reattanza diminuisce e la corrente reattiva può aumentare.

Questa approssimazione non descrive tutta la parte meccanica e la risonanza, ma è utile per capire perché un piezo non debba essere trattato come una semplice resistenza.

### Vantaggi tipici

I buzzer piezoelettrici possono offrire:

- consumo relativamente contenuto;
- struttura sottile;
- assenza di una bobina mobile;
- buona pressione sonora vicino alla frequenza di progetto;
- possibilità di lavorare con tensioni picco-picco elevate tramite driver dedicati;
- buona longevità meccanica.

### Limiti tipici

Bisogna però considerare:

- risposta in frequenza spesso irregolare;
- volume molto dipendente dalla risonanza;
- comportamento capacitivo;
- importanza della cavità acustica;
- tensione di pilotaggio richiesta;
- ridotta qualità nella riproduzione di audio complesso.

TDK, per esempio, propone trasduttori piezoelettrici con frequenze nominali di `2 kHz`, `4 kHz` o `5 kHz`. Due modelli dello stesso diametro possono produrre livelli sonori differenti a causa dell'altezza dell'involucro e della costruzione acustica. Il modello `PS1240P02CT3` è dichiarato a `60 dB` minimi, `4 kHz` e `3 V0-p`, mentre il `PS1240P02BT`, più alto, è dichiarato a `70 dB` nelle stesse condizioni nominali. Sono dati specifici di quei componenti, non una regola universale. ([TDK][4]) ([TDK][5])

## Buzzer magnetici

Un buzzer magnetico usa una bobina.

Quando la corrente attraversa la bobina, viene generato un campo magnetico che muove un diaframma ferromagnetico. Interrompendo la corrente, il diaframma torna verso la posizione di riposo. Ripetendo il processo in modo periodico otteniamo una vibrazione e quindi un suono. ([Same Sky][1])

Dal punto di vista elettrico, il componente si comporta in prima approssimazione come una resistenza in serie a un'induttanza.

La corrente non può cambiare istantaneamente. Quando il transistor che pilota la bobina viene spento, l'induttanza cerca di mantenere la corrente e può generare una sovratensione.

La soluzione?

Un percorso di ricircolo, normalmente realizzato con un diodo di flyback o con un circuito di clamp appropriato.

### Vantaggi tipici

I buzzer magnetici possono offrire:

- funzionamento a basse tensioni;
- buona pressione sonora in dimensioni compatte;
- risposta utile a frequenze relativamente basse;
- pilotaggio concettualmente simile a quello di altri piccoli carichi induttivi.

### Limiti tipici

Bisogna però considerare:

- corrente generalmente maggiore rispetto a molti piezo;
- presenza di una bobina;
- necessità di gestire la sovratensione induttiva;
- riscaldamento e duty cycle;
- volume dipendente dalla corrente disponibile.

Same Sky riporta come tendenza generale che i buzzer magnetici lavorino a tensioni inferiori e correnti superiori rispetto ai piezo. Il catalogo mostra inoltre piccoli trasduttori magnetici da `3 V` che possono richiedere correnti nell'ordine di `100 mA`: un valore decisamente incompatibile con il pilotaggio diretto da un GPIO. ([Same Sky][1]) ([Same Sky][6])

## Indicatore attivo e trasduttore passivo

### Indicatore con oscillatore interno

Un indicatore integra il circuito che genera l'oscillazione.

Il collegamento logico è simile a quello di un carico acceso e spento:

```text
alimentazione presente -> suono
alimentazione assente  -> silenzio
```

Il firmware controlla soprattutto:

- accensione;
- spegnimento;
- durata;
- ritmo;
- numero di impulsi.

Non controlla liberamente l'altezza della nota, perché la frequenza viene stabilita dal circuito interno.

Alcuni indicatori integrano già una sequenza o un tono intermittente. Anche in questo caso il datasheet è l'unica fonte affidabile.

### Trasduttore pilotato esternamente

Un trasduttore non genera autonomamente il tono.

Serve un segnale periodico:

```text
GPIO / PWM -> driver -> trasduttore -> suono
```

La frequenza del segnale determina la frequenza fondamentale del tono. Questo rende possibile:

- scegliere note differenti;
- creare sweep;
- costruire melodie;
- modificare la cadenza;
- creare segnali riconoscibili per eventi differenti.

Il trasduttore offre maggiore libertà, ma sposta nel firmware e nell'hardware la responsabilità di generare correttamente la forma d'onda.

## Come riconoscere il componente

Il metodo corretto è leggere il codice stampato sul componente e recuperare il datasheet.

Quando il codice non è disponibile, possiamo raccogliere alcuni indizi, ma non ottenere una certezza assoluta.

### Presenza del simbolo `+`

Molti indicatori attivi sono polarizzati e riportano un simbolo `+`.

Tuttavia anche alcuni trasduttori possono avere una polarità consigliata per mantenere coerente la fase o rispettare il metodo di misura. Il simbolo non basta quindi a identificare il circuito interno.

### Prova con tensione continua

Un indicatore attivo compatibile con la tensione applicata dovrebbe produrre un tono continuo.

Un trasduttore passivo può invece generare soltanto un click durante il collegamento o la disconnessione, perché una tensione continua produce una sola deformazione iniziale e non un movimento periodico.

Questa prova deve essere eseguita soltanto conoscendo almeno la tensione plausibile del componente. Applicare `5 V` a un dispositivo progettato per tensioni inferiori non è un metodo di identificazione prudente.

### Misura della resistenza

Un trasduttore magnetico mostra normalmente una resistenza continua legata alla bobina.

Un piezo può invece apparire come circuito aperto a una misura DC, poiché si comporta principalmente come una capacità.

Un indicatore con elettronica integrata può produrre letture che dipendono dalla polarità e dal circuito interno.

Anche questa misura fornisce un indizio, non un'identificazione completa.

### Il problema dei moduli pronti

Molti moduli venduti per microcontrollori includono:

- transistor;
- resistenza di base o gate;
- LED;
- resistenza di pull-down;
- connettore a tre pin;
- buzzer attivo o passivo.

In questo caso il comportamento del modulo non coincide necessariamente con quello del componente montato sopra.

Prima di scrivere il firmware bisogna capire se il pin di controllo:

- alimenta direttamente il buzzer;
- pilota un transistor;
- è attivo alto;
- è attivo basso;
- accetta un PWM;
- supporta soltanto un comando on/off.

## Leggere il datasheet

La scritta “buzzer 5 V” non è sufficiente per progettare il circuito.

### Tensione nominale

La tensione nominale è il valore usato per dichiarare determinate prestazioni.

Può essere espressa come:

- `VDC`;
- `Vrms`;
- `V0-p`;
- `Vp-p`.

Queste grandezze non sono intercambiabili.

Per un'onda quadra unipolare da `0 V` a `3,3 V`:

```text
V0-p = 3,3 V
Vp-p = 3,3 V
```

Per un pilotaggio differenziale che porta alternativamente i terminali a `0 V` e `3,3 V` in opposizione, la tensione vista dal componente può passare da `+3,3 V` a `-3,3 V`:

```text
Vp-p = 6,6 V
```

È uno dei motivi per cui un ponte può aumentare la pressione sonora di un piezo senza aumentare la tensione di alimentazione.

### Intervallo operativo

L'intervallo operativo indica le tensioni entro cui il produttore prevede il funzionamento.

Non bisogna confonderlo con la tensione assoluta massima. Restare sotto il massimo non garantisce che il suono sia corretto, né che il componente possa lavorare continuamente in quelle condizioni.

### Frequenza nominale o di risonanza

La frequenza nominale è spesso vicina alla zona in cui il componente produce la maggiore pressione sonora.

Pilotare il buzzer lontano da quella frequenza può ridurre notevolmente il volume.

Questo aspetto diventa evidente con le melodie: una scala teoricamente corretta può sembrare sbilanciata perché alcune note cadono vicino alla risonanza e altre in zone poco efficienti.

### Sound Pressure Level

Il valore SPL deve essere letto insieme a:

- distanza di misura;
- tensione;
- frequenza;
- forma d'onda;
- temperatura;
- tolleranza minima o tipica.

Un valore come:

```text
70 dB(A) min @ 10 cm, 4 kHz, 3 V0-p, square wave
```

non significa che il componente produca sempre `70 dB`.

Cambiare distanza, frequenza, montaggio o tensione cambia il risultato.

### Corrente o consumo

Per un indicatore attivo il datasheet può dichiarare direttamente la corrente assorbita.

Per un trasduttore magnetico bisogna considerare l'impedenza della bobina e la frequenza di pilotaggio.

Per un piezo il datasheet può dichiarare capacità, impedenza o corrente in condizioni specifiche.

La corrente è uno dei parametri che stabiliscono se il componente possa essere pilotato direttamente o richieda uno stadio esterno.

### Duty cycle e tempo massimo di attivazione

Alcuni buzzer sono progettati per funzionamento intermittente.

Il datasheet può specificare:

- duty cycle massimo;
- durata massima del tono;
- tempo di pausa;
- temperatura di riferimento.

Un allarme che funziona per pochi secondi non è equivalente a un componente lasciato attivo per ore.

### Temperatura e montaggio

La risposta acustica dipende anche da:

- temperatura;
- umidità;
- metodo di saldatura;
- apertura dell'involucro;
- posizione sul PCB;
- presenza di guarnizioni;
- cavità del prodotto.

Il datasheet del componente non può prevedere automaticamente l'acustica del nostro case.

## La cavità acustica fa parte del progetto

Il suono non termina sulla superficie del buzzer.

L'involucro del prodotto crea una cavità, introduce risonanze e può attenuare o amplificare determinate frequenze.

Un buzzer molto rumoroso sul banco può diventare debole una volta chiuso dentro un case. Il problema può essere causato da:

- foro acustico troppo piccolo;
- distanza eccessiva dal foro;
- volume interno sfavorevole;
- materiale assorbente;
- guarnizione che blocca il diaframma;
- montaggio che introduce tensioni meccaniche;
- acqua o polvere davanti all'apertura.

Murata mostra come diaframma e cavità abbiano proprie frequenze di risonanza e come il circuito acustico contribuisca alla pressione sonora. TDK evidenzia a sua volta differenze marcate tra componenti con diametro simile ma altezze e strutture differenti. ([Murata][3]) ([TDK][4])

La conclusione pratica è semplice: il buzzer deve essere verificato nel prodotto assemblato, non soltanto sulla breadboard.

## Pilotaggio diretto da GPIO

Collegare un buzzer direttamente a un GPIO può funzionare soltanto quando tutte le condizioni elettriche sono compatibili.

Bisogna verificare:

- tensione richiesta;
- corrente di picco;
- corrente media;
- natura capacitiva o induttiva del carico;
- livello logico alto reale del GPIO;
- comportamento al reset;
- presenza di transitori;
- durata di attivazione.

Non esiste una regola per cui “un piccolo buzzer” sia automaticamente sicuro per il pin.

Un piezo esterno a bassa capacità può richiedere poca corrente media, ma assorbire impulsi durante i fronti. Un trasduttore magnetico può richiedere decine di milliampere. Un indicatore può essere progettato per `5 V` e non raggiungere la pressione sonora desiderata a `3,3 V`.

Per un prototipo si può essere tentati di provare il collegamento diretto. Per un progetto ripetibile preferisco separare il GPIO dal carico con un transistor quando corrente, tensione o transitori non sono chiaramente entro i limiti.

## Pilotare un indicatore con transistor

Un collegamento low-side con MOSFET a canale N è semplice e rende il firmware indipendente dalla corrente del buzzer entro i limiti del transistor.

```text
            +V_BUZZER
                |
             BUZZER
                |
                +------ drain
                       N-MOSFET
GPIO --- Rg ----- gate
                |
              Rpd
                |
GND -------------+------ source
```

La resistenza `Rpd` mantiene il MOSFET spento durante il reset. La resistenza di gate limita i transitori e smorza eventuali oscillazioni.

Il MOSFET deve essere scelto considerando:

- tensione gate disponibile a `3,3 V`;
- corrente del carico;
- tensione drain-source;
- resistenza `RDS(on)` alla tensione reale di gate;
- package e dissipazione.

Con un BJT NPN serve invece dimensionare la corrente di base per portarlo in saturazione senza sovraccaricare il GPIO.

### Polarità logica

Con il collegamento low-side:

```text
GPIO alto  -> transistor acceso -> buzzer alimentato
GPIO basso -> transistor spento -> silenzio
```

Un modulo commerciale può invertire questa logica. Per questo conviene nascondere il livello elettrico dietro funzioni come:

```c
active_buzzer_on();
active_buzzer_off();
```

anziché distribuire `gpio_set_level()` in tutta l'applicazione.

## Pilotare un trasduttore magnetico

Per un trasduttore magnetico il transistor deve commutare la corrente della bobina alla frequenza del tono.

```text
            +V
             |
         MAGNETIC
         TRANSDUCER
             |
             +---------- drain/collector
             |                transistor
             +----|<|----+
               diode     |
                         GND
```

Il disegno è soltanto concettuale: il verso del diodo deve essere tale da non condurre durante il funzionamento normale e da fornire un percorso alla corrente induttiva quando il transistor si spegne.

Same Sky raccomanda esplicitamente un diodo di clamp nel circuito tipico di un trasduttore magnetico. ([Same Sky][1])

Il diodo tradizionale riduce la sovratensione, ma rallenta anche la caduta della corrente nella bobina. In alcuni progetti acustici o ad alta velocità si usano clamp differenti per ottenere una smagnetizzazione più rapida. Per un buzzer comune, tuttavia, il circuito raccomandato dal produttore rimane il punto di partenza corretto.

## Pilotare un trasduttore piezoelettrico

Un piezo non richiede normalmente il diodo di flyback usato per una bobina.

Il problema principale è invece caricare e scaricare la capacità del componente.

Un semplice pilotaggio single-ended può usare un transistor e una resistenza che riporti il terminale allo stato di riposo quando il transistor è aperto. Same Sky mostra questa topologia e specifica che la resistenza dissipa potenza; Murata pubblica circuiti differenti per sounder a pilotaggio esterno e per dispositivi self-drive. ([Same Sky][1]) ([Murata][7])

```text
                 +V
                  |
                PIEZO
                  |
                  +------ switch ------ GND
                  |
                 Rreset
                  |
                 +V oppure GND
```

Il collegamento effettivo dipende dal circuito e dal datasheet.

### Pilotaggio push-pull

Due uscite complementari possono applicare al piezo una tensione differenziale maggiore:

```text
fase 1: A = 3,3 V, B = 0 V   -> Vpiezo = +3,3 V
fase 2: A = 0 V,   B = 3,3 V -> Vpiezo = -3,3 V
```

La variazione totale diventa:

```text
Vp-p = 6,6 V
```

Questo può aumentare la pressione sonora, ma richiede uscite perfettamente coordinate. Un errore che porti entrambe le uscite in conflitto attraverso un driver non adatto può causare correnti elevate.

Per un progetto reale è preferibile usare:

- un driver push-pull progettato per il carico;
- un ponte integrato;
- due canali hardware sincronizzati;
- le topologie raccomandate dal produttore.

Same Sky descrive diverse tecniche per aumentare la tensione picco-picco applicata a un piezo, tra cui pilotaggio a ponte e circuiti con induttore. ([Same Sky][8])

## Bias continuo sui piezo

Un trasduttore piezoelettrico viene normalmente eccitato con una tensione alternata.

Applicare una componente continua permanente può:

- spostare il punto di lavoro meccanico;
- ridurre l'escursione disponibile in una direzione;
- aumentare lo stress sul materiale;
- violare le condizioni con cui il produttore dichiara la tensione massima.

Alcuni datasheet specificano infatti il limite di ingresso con la nota “senza DC bias”. TDK usa questa condizione nei trasduttori piezoelettrici della serie PS. ([TDK][4])

Un'onda quadra unipolare tra `0 V` e `3,3 V` contiene una componente media positiva. Il componente può comunque essere progettato per questo tipo di pilotaggio, ma non bisogna dedurlo senza leggere il datasheet.

Un pilotaggio differenziale alternato tra tensione positiva e negativa rispetto ai terminali del piezo produce invece una sollecitazione più simmetrica e sfrutta una tensione picco-picco maggiore.

La soluzione corretta dipende quindi da:

- costruzione del trasduttore;
- tensione ammessa;
- circuito raccomandato;
- frequenza;
- durata;
- obiettivo di pressione sonora.

## Alimentazione, massa e disturbi

Un buzzer può introdurre disturbi sia elettrici sia acustici.

Sul lato elettrico bisogna considerare:

- impulsi di corrente;
- ritorni di massa;
- transitori della bobina;
- armoniche dei fronti PWM;
- accoppiamento verso ADC e sensori analogici;
- rumore sull'alimentazione;
- emissioni irradiate dai collegamenti.

Buone pratiche comuni comprendono:

- condensatore di bypass vicino all'indicatore attivo;
- transistor vicino al carico;
- percorso di massa corto;
- diodo vicino alla bobina;
- separazione dai nodi analogici sensibili;
- slew rate non più rapido del necessario, quando controllabile;
- resistenza di gate o serie per smorzare i fronti;
- verifica con oscilloscopio.

Un beep che causa un reset o altera una misura ADC non è un problema di melodia. È un problema di alimentazione, layout o compatibilità elettromagnetica.

## Quale periferica usare su ESP32

Su ESP32 possiamo gestire un buzzer in modi differenti.

| Esigenza | Periferica o approccio |
| -------- | ---------------------- |
| Accendere un indicatore attivo | GPIO |
| Generare un tono stabile | LEDC |
| Cambiare frequenza nel tempo | LEDC + task o timer |
| Programmare eventi con precisione | GPTimer o `esp_timer` |
| Riprodurre audio campionato semplice | PWM Audio |
| Riprodurre audio digitale più completo | I2S + codec/amplificatore |

![Percorso decisionale per scegliere GPIO, LEDC, timer, PWM Audio o I2S con un buzzer su ESP32](/blog/images/buzzer_esp32_esp_idf_sounds_melodies/peripheral_selection.svg)

*La scelta parte dal componente e dal risultato acustico richiesto. Timer e task programmano gli eventi, mentre LEDC continua a generare in hardware i fronti del tono.*

LEDC nasce per il controllo dei LED, ma Espressif specifica che può generare PWM anche per altri dispositivi. Permette di configurare frequenza e risoluzione del duty cycle, modificare la frequenza durante il funzionamento e sospendere l'uscita. ([Espressif Systems][9])

Per una melodia monofonica è quindi una scelta naturale:

```text
LEDC genera la forma d'onda
un task decide quando cambiare nota
il driver elettrico pilota il buzzer
```

GPTimer e `esp_timer` non sono necessari per produrre direttamente ogni fronte del tono: quello è il lavoro di LEDC. Sono invece utili per programmare gli eventi musicali o gli effetti con una temporizzazione più precisa. Espressif raccomanda GPTimer quando servono prestazioni più real-time o una risoluzione configurabile, mentre `esp_timer` offre timer software a risoluzione di un microsecondo con callback one-shot o periodiche. ([Espressif Systems][10]) ([Espressif Systems][11])

## Esempio minimo: indicatore attivo

Supponiamo di usare un indicatore alimentato tramite MOSFET low-side. Il GPIO controlla quindi il gate e non eroga direttamente la corrente del buzzer.

```c
#include "driver/gpio.h"
#include "esp_check.h"
#include "esp_err.h"

#define BUZZER_ENABLE_GPIO GPIO_NUM_18

static char const* TAG = "active_buzzer";

esp_err_t active_buzzer_init(void) {
  gpio_config_t const config = {
    .pin_bit_mask = 1ULL << BUZZER_ENABLE_GPIO,
    .mode = GPIO_MODE_OUTPUT,
    .pull_up_en = GPIO_PULLUP_DISABLE,
    .pull_down_en = GPIO_PULLDOWN_DISABLE,
    .intr_type = GPIO_INTR_DISABLE,
  };

  ESP_RETURN_ON_ERROR(gpio_config(&config), TAG, "Impossibile configurare il GPIO del buzzer");

  return gpio_set_level(BUZZER_ENABLE_GPIO, 0);
}

esp_err_t active_buzzer_on(void) {
  return gpio_set_level(BUZZER_ENABLE_GPIO, 1);
}

esp_err_t active_buzzer_off(void) {
  return gpio_set_level(BUZZER_ENABLE_GPIO, 0);
}
```

Un beep bloccante può essere realizzato così:

```c
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

esp_err_t active_buzzer_beep(uint32_t duration_ms) {
  ESP_RETURN_ON_ERROR(active_buzzer_on(), TAG, "Impossibile attivare il buzzer");

  vTaskDelay(pdMS_TO_TICKS(duration_ms));

  return active_buzzer_off();
}
```

Il codice funziona, ma blocca il task chiamante per tutta la durata del suono.

Questo può essere accettabile in un test o in un task dedicato. Non è una buona idea dentro un task che debba gestire contemporaneamente rete, input, display o controllo motore.

### Pattern di segnalazione con indicatore attivo

Anche senza controllo della frequenza possiamo codificare informazioni attraverso il ritmo.

```c
typedef struct {
  uint16_t on_ms;
  uint16_t off_ms;
} active_buzzer_pulse_t;

static active_buzzer_pulse_t const success_pattern[] = {
  {.on_ms = 70, .off_ms = 70},
  {.on_ms = 140, .off_ms = 0},
};

static active_buzzer_pulse_t const error_pattern[] = {
  {.on_ms = 250, .off_ms = 120},
  {.on_ms = 250, .off_ms = 120},
  {.on_ms = 250, .off_ms = 0},
};
```

```c
esp_err_t active_buzzer_play_pattern(active_buzzer_pulse_t const* pattern, size_t pulse_count) {
  if (pattern == NULL || pulse_count == 0) {
    return ESP_ERR_INVALID_ARG;
  }

  for (size_t i = 0; i < pulse_count; ++i) {
    ESP_RETURN_ON_ERROR(active_buzzer_on(), TAG, "Impossibile attivare il buzzer");

    vTaskDelay(pdMS_TO_TICKS(pattern[i].on_ms));

    ESP_RETURN_ON_ERROR(active_buzzer_off(), TAG, "Impossibile disattivare il buzzer");

    if (pattern[i].off_ms > 0) {
      vTaskDelay(pdMS_TO_TICKS(pattern[i].off_ms));
    }
  }

  return ESP_OK;
}
```

La logica è semplice:

```text
successo -> due impulsi brevi
errore   -> tre impulsi lunghi
allarme  -> sequenza ripetuta
```

È già una forma di composizione, anche se non musicale. La variabile non è l'altezza della nota, ma la struttura temporale.

## Generare un tono con LEDC

Per un trasduttore passivo dobbiamo generare una forma d'onda periodica.

Useremo LEDC con:

- un timer;
- un canale;
- una frequenza iniziale;
- duty cycle al 50%;
- GPIO collegato allo stadio di pilotaggio.

![Sequenza dal task applicativo al trasduttore quando LEDC genera un tono](/blog/images/buzzer_esp32_esp_idf_sounds_melodies/ledc_tone_path.svg)

*Il timer stabilisce la frequenza, il canale applica il duty cycle e lo stadio elettrico adatta il segnale al trasduttore. Per il silenzio il driver porta il duty a zero.*

### Driver di base

```c
#include <stdint.h>

#include "driver/ledc.h"
#include "esp_check.h"
#include "esp_err.h"
#include "esp_log.h"

#define BUZZER_PWM_GPIO GPIO_NUM_18
#define BUZZER_LEDC_MODE LEDC_LOW_SPEED_MODE
#define BUZZER_LEDC_TIMER LEDC_TIMER_0
#define BUZZER_LEDC_CHANNEL LEDC_CHANNEL_0
#define BUZZER_DUTY_BITS 10
#define BUZZER_INITIAL_HZ 1000

static char const* TAG = "buzzer";
static bool buzzer_initialized;

static uint32_t buzzer_duty_from_per_mille(uint16_t duty_per_mille) {
  uint32_t const max_duty = (1U << BUZZER_DUTY_BITS) - 1U;

  if (duty_per_mille > 1000U) {
    duty_per_mille = 1000U;
  }

  return (max_duty * duty_per_mille) / 1000U;
}

esp_err_t buzzer_init(void) {
  ledc_timer_config_t const timer_config = {
    .speed_mode = BUZZER_LEDC_MODE,
    .duty_resolution = (ledc_timer_bit_t)BUZZER_DUTY_BITS,
    .timer_num = BUZZER_LEDC_TIMER,
    .freq_hz = BUZZER_INITIAL_HZ,
    .clk_cfg = LEDC_AUTO_CLK,
    .deconfigure = false,
  };

  ESP_RETURN_ON_ERROR(
    ledc_timer_config(&timer_config), TAG, "Impossibile configurare il timer LEDC"
  );

  ledc_channel_config_t const channel_config = {
    .gpio_num = BUZZER_PWM_GPIO,
    .speed_mode = BUZZER_LEDC_MODE,
    .channel = BUZZER_LEDC_CHANNEL,
    .intr_type = LEDC_INTR_DISABLE,
    .timer_sel = BUZZER_LEDC_TIMER,
    .duty = 0,
    .hpoint = 0,
    .sleep_mode = LEDC_SLEEP_MODE_NO_ALIVE_NO_PD,
    .flags = {
      .output_invert = 0,
    },
  };

  ESP_RETURN_ON_ERROR(
    ledc_channel_config(&channel_config), TAG, "Impossibile configurare il canale LEDC"
  );

  buzzer_initialized = true;
  return ESP_OK;
}

esp_err_t buzzer_stop(void) {
  if (!buzzer_initialized) {
    return ESP_ERR_INVALID_STATE;
  }

  ESP_RETURN_ON_ERROR(
    ledc_set_duty(BUZZER_LEDC_MODE, BUZZER_LEDC_CHANNEL, 0),
    TAG,
    "Impossibile azzerare il duty cycle"
  );

  return ledc_update_duty(BUZZER_LEDC_MODE, BUZZER_LEDC_CHANNEL);
}

esp_err_t buzzer_play_tone(uint32_t frequency_hz, uint16_t duty_per_mille) {
  if (!buzzer_initialized) {
    return ESP_ERR_INVALID_STATE;
  }

  if (frequency_hz == 0 || duty_per_mille == 0) {
    return buzzer_stop();
  }

  uint32_t const actual_hz = ledc_set_freq(BUZZER_LEDC_MODE, BUZZER_LEDC_TIMER, frequency_hz);

  if (actual_hz == 0) {
    ESP_LOGE(TAG, "Frequenza %" PRIu32 " Hz non configurabile", frequency_hz);
    return ESP_FAIL;
  }

  uint32_t const duty = buzzer_duty_from_per_mille(duty_per_mille);

  ESP_RETURN_ON_ERROR(
    ledc_set_duty(BUZZER_LEDC_MODE, BUZZER_LEDC_CHANNEL, duty),
    TAG,
    "Impossibile impostare il duty cycle"
  );

  ESP_RETURN_ON_ERROR(
    ledc_update_duty(BUZZER_LEDC_MODE, BUZZER_LEDC_CHANNEL),
    TAG,
    "Impossibile aggiornare il duty cycle"
  );

  ESP_LOGD(
    TAG,
    "Tono richiesto=%" PRIu32 " Hz, reale=%" PRIu32 " Hz, duty=%u/1000",
    frequency_hz,
    actual_hz,
    duty_per_mille
  );

  return ESP_OK;
}
```

Il file richiede anche:

```c
#include <inttypes.h>
#include <stdbool.h>
```

Nel `CMakeLists.txt` del componente:

```cmake
idf_component_register(
    SRCS "buzzer.c"
    INCLUDE_DIRS "."
    PRIV_REQUIRES esp_driver_ledc
)
```

La sequenza operativa è:

```text
buzzer_init()
    |
    +--> configura timer LEDC
    +--> associa il canale al GPIO
    +--> parte con duty 0

buzzer_play_tone(440, 500)
    |
    +--> imposta 440 Hz
    +--> imposta duty al 50%
    +--> il trasduttore emette il tono

buzzer_stop()
    |
    +--> porta il duty a zero
    +--> il GPIO smette di commutare verso il carico
```

### Perché usare duty zero per il silenzio

LEDC espone anche `ledc_stop()`, che sospende la generazione del canale. ([Espressif Systems][9])

In un piccolo driver può essere più semplice mantenere il canale configurato e impostare duty zero. In questo modo la nota successiva richiede soltanto:

1. cambio di frequenza;
2. ripristino del duty.

`ledc_stop()` rimane utile quando si vuole disattivare esplicitamente l'uscita o controllare il livello idle. La scelta dipende dall'architettura del driver e dal comportamento richiesto durante sleep e riconfigurazioni.

## Frequenza e risoluzione del duty cycle

LEDC deve ricavare frequenza e duty cycle da un clock sorgente.

Aumentando la frequenza richiesta, può diminuire la risoluzione disponibile per il duty cycle. Espressif documenta esplicitamente questo compromesso e restituisce un errore quando la combinazione non è realizzabile. ([Espressif Systems][9])

Per un buzzer musicale non serve normalmente una risoluzione molto elevata.

Con 10 bit abbiamo:

```text
2^10 = 1024 livelli
```

Il 50% corrisponde approssimativamente a:

```text
1024 / 2 = 512
```

Anche 8 bit sarebbero spesso sufficienti. Il parametro importante è che tutte le frequenze della melodia siano generabili con un errore accettabile.

Il valore restituito da `ledc_set_freq()` rappresenta la frequenza effettivamente configurata. Registrarlo durante lo sviluppo permette di capire se l'hardware stia approssimando la nota richiesta.

## Il duty cycle non è una manopola del volume

È comune ridurre il duty cycle per abbassare il volume.

Funziona sempre?

Non proprio.

Cambiare il duty cycle di un'onda quadra modifica contemporaneamente:

- energia media;
- componente continua del segnale unipolare;
- contenuto armonico;
- durata degli impulsi;
- corrente di picco;
- risposta del driver;
- percezione del timbro.

Con un trasduttore piezoelettrico pilotato in modo simmetrico, il 50% produce una forma d'onda bilanciata e spesso una buona eccitazione della fondamentale. Same Sky indica il 50% come compromesso tipico tra volume e distorsione, ma il risultato reale dipende dal componente e dal circuito. ([Same Sky][12])

Ridurre il duty può diminuire il suono, ma non equivale a ridurre linearmente l'ampiezza di una sinusoide.

Per controllare davvero l'intensità si possono valutare:

- tensione di alimentazione del driver;
- pilotaggio differenziale;
- attenuatore o amplificatore;
- PWM ad alta frequenza filtrato, se il trasduttore e il circuito lo permettono;
- inviluppo di ampiezza tramite hardware audio dedicato.

Per i semplici beep, tre livelli di duty possono essere sufficienti. Per una melodia espressiva, un buzzer rimane uno strumento limitato.

## Dalla frequenza alle note

Una melodia non viene normalmente descritta come una lista casuale di frequenze.

È più comodo rappresentare le note tramite un indice e convertirle al momento della riproduzione.

Il sistema MIDI assegna numeri da 0 a 127 alle note. Nella comune accordatura equabile a dodici semitoni, il numero 69 corrisponde al La a `440 Hz`. La frequenza può essere calcolata con:

```text
f(n) = 440 * 2^((n - 69) / 12)
```

La formula e la corrispondenza `69 -> 440 Hz` sono documentate anche dal Computational Acoustic Modeling Laboratory della McGill University. MIDI.org usa a sua volta `A4 = 440 Hz` come riferimento, pur ricordando che le convenzioni sul numero dell'ottava possono variare. ([McGill University][13]) ([MIDI Association][14])

### Alcune note comuni

| Nota | Numero MIDI | Frequenza approssimata |
| ---- | ----------: | ---------------------: |
| C4   | 60 | 261,63 Hz |
| D4   | 62 | 293,66 Hz |
| E4   | 64 | 329,63 Hz |
| F4   | 65 | 349,23 Hz |
| G4   | 67 | 392,00 Hz |
| A4   | 69 | 440,00 Hz |
| B4   | 71 | 493,88 Hz |
| C5   | 72 | 523,25 Hz |

Il nome dell'ottava non è completamente uniforme tra software e produttori. Il numero MIDI evita l'ambiguità: `60` identifica sempre lo stesso indice, anche se un'interfaccia lo mostra come `C3` e un'altra come `C4`.

### Conversione in firmware

```c
#include <math.h>
#include <stdint.h>

uint32_t buzzer_midi_to_frequency(uint8_t midi_note) {
  double const semitones = ((int)midi_note - 69) / 12.0;
  double const frequency = 440.0 * pow(2.0, semitones);

  if (frequency < 1.0) {
    return 1;
  }

  return (uint32_t)lround(frequency);
}
```

Il risultato viene arrotondato all'hertz intero perché `ledc_set_freq()` usa una frequenza intera.

L'errore introdotto è trascurabile per un buzzer comune, la cui tolleranza meccanica e risposta in frequenza sono normalmente molto meno precise di un sintetizzatore musicale.

### Evitare il calcolo durante la riproduzione

`pow()` è comodo e chiaro, ma non è obbligatorio calcolare ogni nota in tempo reale.

Possiamo usare una tabella pre-calcolata:

```c
static uint16_t const note_frequency_hz[] = {
  [60] = 262,
  [61] = 277,
  [62] = 294,
  [63] = 311,
  [64] = 330,
  [65] = 349,
  [66] = 370,
  [67] = 392,
  [68] = 415,
  [69] = 440,
  [70] = 466,
  [71] = 494,
  [72] = 523,
};
```

Oppure generare la tabella durante la build.

La scelta dipende da:

- intervallo di note richiesto;
- uso della floating point;
- dimensione della Flash;
- leggibilità;
- necessità di accordature differenti.

## Tempo musicale e durata delle note

Il tempo viene spesso espresso in BPM, *beats per minute*.

Supponendo che il beat corrisponda a una semiminima, la durata di un beat è:

```text
durata_beat_ms = 60000 / BPM
```

A `120 BPM`:

```text
durata_beat_ms = 60000 / 120
                = 500 ms
```

Le durate comuni diventano:

| Figura | Beat | Durata a 120 BPM |
| ------ | ---: | ----------------: |
| Semibreve | 4 | 2000 ms |
| Minima | 2 | 1000 ms |
| Semiminima | 1 | 500 ms |
| Croma | 1/2 | 250 ms |
| Semicroma | 1/4 | 125 ms |

### Note puntate

Il punto aggiunge metà del valore della nota:

```text
nota puntata = durata * 1,5
```

Una semiminima puntata a `120 BPM` dura:

```text
500 ms * 1,5 = 750 ms
```

### Terzine

Tre note occupano normalmente lo spazio di due note dello stesso valore:

```text
durata terzina = durata normale * 2 / 3
```

Usare millisecondi con frazioni può introdurre arrotondamenti. Per questo nei sequencer è comune rappresentare le durate con un numero intero di tick.

## Rappresentare una melodia con tick

Definiamo `96` tick per semiminima:

```c
#define BUZZER_TICKS_PER_QUARTER 96U

#define DUR_SIXTEENTH (BUZZER_TICKS_PER_QUARTER / 4U)
#define DUR_EIGHTH (BUZZER_TICKS_PER_QUARTER / 2U)
#define DUR_QUARTER (BUZZER_TICKS_PER_QUARTER)
#define DUR_HALF (BUZZER_TICKS_PER_QUARTER * 2U)
#define DUR_WHOLE (BUZZER_TICKS_PER_QUARTER * 4U)
```

Il valore 96 è divisibile per 2, 3, 4, 6, 8 e 12. Permette quindi di rappresentare facilmente crome, semicrome, terzine e note puntate.

```c
#define DUR_DOTTED_QUARTER (DUR_QUARTER + DUR_EIGHTH)
#define DUR_EIGHTH_TRIPLET (BUZZER_TICKS_PER_QUARTER / 3U)
```

La durata in millisecondi diventa:

```text
duration_ms = 60000 * ticks
              / (BPM * ticks_per_quarter)
```

In C conviene usare un intero a 64 bit per evitare overflow durante la moltiplicazione:

```c
uint32_t buzzer_ticks_to_ms(uint32_t ticks, uint16_t bpm) {
  if (bpm == 0) {
    return 0;
  }

  uint64_t const numerator = 60000ULL * ticks;
  uint64_t const denominator = (uint64_t)bpm * BUZZER_TICKS_PER_QUARTER;

  return (uint32_t)((numerator + denominator / 2U) / denominator);
}
```

L'aggiunta di metà del denominatore produce un arrotondamento al valore più vicino anziché un semplice troncamento.

## Nota, pausa e articolazione

Una melodia non è composta soltanto da frequenza e durata.

Due note consecutive suonate senza interruzione possono fondersi, soprattutto quando hanno la stessa frequenza. Per separarle serve una breve pausa.

Definiamo quindi una nota come:

```c
#define BUZZER_REST 0xFFU

typedef struct {
  uint8_t midi_note;
  uint16_t duration_ticks;
  uint8_t gate_percent;
} buzzer_note_t;
```

I campi significano:

- `midi_note`: altezza della nota;
- `duration_ticks`: spazio temporale totale;
- `gate_percent`: percentuale della durata in cui il tono resta attivo.

Con `gate_percent = 90`:

```text
90% -> suono
10% -> silenzio
```

Questo produce un'articolazione leggermente staccata.

![Flusso di elaborazione di una nota con durata totale, tempo sonoro e pausa determinati dal gate](/blog/images/buzzer_esp32_esp_idf_sounds_melodies/note_gate_timing.svg)

*Il gate divide lo spazio temporale della nota in una parte sonora e una pausa finale. Una pausa esplicita percorre lo stesso flusso, ma mantiene sempre il duty a zero.*

Con `100` otteniamo note legate, ma due note uguali consecutive non avranno un fronte di separazione.

Una pausa usa:

```c
{ .midi_note = BUZZER_REST, .duration_ticks = DUR_QUARTER, .gate_percent = 0, }
```

## Una prima melodia originale

Definiamo alcune note tramite numero MIDI:

```c
enum {
  NOTE_C4 = 60,
  NOTE_D4 = 62,
  NOTE_E4 = 64,
  NOTE_F4 = 65,
  NOTE_G4 = 67,
  NOTE_A4 = 69,
  NOTE_B4 = 71,
  NOTE_C5 = 72,
};
```

Una piccola melodia originale può essere rappresentata così:

```c
static buzzer_note_t const startup_melody[] = {
  {NOTE_C4, DUR_EIGHTH, 88},
  {NOTE_E4, DUR_EIGHTH, 88},
  {NOTE_G4, DUR_EIGHTH, 88},
  {NOTE_C5, DUR_QUARTER, 92},

  {NOTE_G4, DUR_EIGHTH, 88},
  {NOTE_E4, DUR_EIGHTH, 88},
  {NOTE_D4, DUR_QUARTER, 92},
  {BUZZER_REST, DUR_EIGHTH, 0},

  {NOTE_F4, DUR_EIGHTH, 88},
  {NOTE_A4, DUR_EIGHTH, 88},
  {NOTE_C5, DUR_QUARTER, 92},
  {NOTE_A4, DUR_EIGHTH, 88},

  {NOTE_G4, DUR_EIGHTH, 88},
  {NOTE_E4, DUR_EIGHTH, 88},
  {NOTE_C4, DUR_HALF, 96},
};
```

La sequenza sale con l'accordo di Do maggiore, torna verso il centro, introduce una seconda frase e chiude sulla tonica.

Non serve conoscere tutta l'armonia per iniziare. È sufficiente capire che una melodia efficace per un buzzer dovrebbe:

- usare un intervallo di frequenze in cui il trasduttore sia udibile;
- non contenere note troppo brevi per il sistema;
- alternare tensione e risoluzione;
- lasciare pause riconoscibili;
- evitare un numero eccessivo di salti estremi.

## Player bloccante ma temporalmente stabile

Una prima implementazione può vivere in un task dedicato e usare `xTaskDelayUntil()`.

A differenza di `vTaskDelay()`, che ritarda rispetto al momento della chiamata, `xTaskDelayUntil()` usa una scadenza assoluta rispetto al riferimento aggiornato. Questo riduce la deriva accumulata. In ESP-IDF 6.0 la vecchia funzione deprecata `vTaskDelayUntil()` è stata rimossa e va usata `xTaskDelayUntil()`. ([Espressif Systems][15])

```c
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

esp_err_t
buzzer_play_sequence_blocking(buzzer_note_t const* notes, size_t note_count, uint16_t bpm) {
  if (notes == NULL || note_count == 0 || bpm == 0) {
    return ESP_ERR_INVALID_ARG;
  }

  TickType_t wake_time = xTaskGetTickCount();

  for (size_t i = 0; i < note_count; ++i) {
    buzzer_note_t const* note = &notes[i];
    uint32_t const total_ms = buzzer_ticks_to_ms(note->duration_ticks, bpm);

    uint32_t sound_ms = 0;

    if (note->midi_note != BUZZER_REST) {
      sound_ms = (total_ms * note->gate_percent) / 100U;
    }

    if (sound_ms > total_ms) {
      sound_ms = total_ms;
    }

    uint32_t const silence_ms = total_ms - sound_ms;

    if (sound_ms > 0) {
      uint32_t const frequency_hz = buzzer_midi_to_frequency(note->midi_note);

      ESP_RETURN_ON_ERROR(
        buzzer_play_tone(frequency_hz, 500),
        TAG,
        "Impossibile riprodurre la nota %u",
        note->midi_note
      );

      xTaskDelayUntil(&wake_time, pdMS_TO_TICKS(sound_ms));
    }

    ESP_RETURN_ON_ERROR(buzzer_stop(), TAG, "Impossibile fermare il buzzer");

    if (silence_ms > 0) {
      xTaskDelayUntil(&wake_time, pdMS_TO_TICKS(silence_ms));
    }
  }

  return buzzer_stop();
}
```

L'utilizzo:

```c
ESP_ERROR_CHECK(buzzer_play_sequence_blocking(
  startup_melody, sizeof(startup_melody) / sizeof(startup_melody[0]), 132
));
```

### Limite della conversione in tick FreeRTOS

`pdMS_TO_TICKS()` converte i millisecondi nella granularità del tick del sistema operativo.

Una durata molto breve può diventare zero tick. Per evitare note eliminate conviene imporre almeno un tick quando la durata richiesta è maggiore di zero:

```c
static TickType_t buzzer_ms_to_os_ticks(uint32_t duration_ms) {
  if (duration_ms == 0) {
    return 0;
  }

  TickType_t ticks = pdMS_TO_TICKS(duration_ms);

  if (ticks == 0) {
    ticks = 1;
  }

  return ticks;
}
```

Bisogna poi sostituire `pdMS_TO_TICKS()` con questa funzione.

Il limite non scompare: una durata inferiore al tick viene arrotondata. Se servono eventi più precisi, possiamo usare `esp_timer` o GPTimer per programmare il cambio di nota, lasciando comunque a LEDC la generazione della portante audio.

## Capire cosa accade durante la riproduzione

Aggiungiamo un log per ogni evento:

```c
ESP_LOGI(
  TAG,
  "index=%u note=%u freq=%" PRIu32 "Hz total=%" PRIu32 "ms sound=%" PRIu32 "ms rest=%" PRIu32 "ms",
  (unsigned)i,
  note->midi_note,
  frequency_hz,
  total_ms,
  sound_ms,
  silence_ms
);
```

Un possibile output è:

```text
I buzzer: index=0 note=60 freq=262Hz total=227ms sound=199ms rest=28ms
I buzzer: index=1 note=64 freq=330Hz total=227ms sound=199ms rest=28ms
I buzzer: index=2 note=67 freq=392Hz total=227ms sound=199ms rest=28ms
I buzzer: index=3 note=72 freq=523Hz total=455ms sound=418ms rest=37ms
```

Dal punto di vista delle periferiche:

```text
nota C4
    |
    +--> MIDI 60
    +--> conversione a 262 Hz
    +--> LEDC cambia il timer a circa 262 Hz
    +--> duty passa da 0 a 50%
    +--> il transistor commuta il trasduttore
    +--> il diaframma vibra
    +--> dopo il gate time il duty torna a 0
    +--> pausa di articolazione
    +--> nota successiva
```

Questa separazione aiuta a diagnosticare i problemi.

Se il log mostra la frequenza corretta ma il suono non cambia, il problema può essere:

- buzzer attivo invece che passivo;
- modulo che filtra il PWM;
- transistor troppo lento;
- componente usato lontano dalla sua banda utile;
- frequenza condivisa con un altro canale LEDC;
- cablaggio errato.

## Perché un player non dovrebbe bloccare l'applicazione

La funzione precedente blocca il task chiamante fino alla fine della melodia.

In un firmware reale possiamo voler:

- accettare una nuova notifica mentre un suono è in corso;
- interrompere un tono di conferma per riprodurre un allarme;
- fermare immediatamente il buzzer;
- cambiare volume o tempo;
- evitare che la UI attenda la fine della sequenza;
- serializzare richieste provenienti da task differenti.

La soluzione più semplice consiste nel dedicare un task al buzzer e comunicare con una queue.

```text
UI task --------+
network task ---+--> command queue --> buzzer task --> LEDC
sensor task ----+
```

In questo modo soltanto il task del buzzer modifica la periferica.

## Comandi e priorità

Definiamo una sequenza:

```c
typedef struct {
  buzzer_note_t const* notes;
  size_t note_count;
  uint16_t bpm;
  uint8_t priority;
  bool loop;
} buzzer_sequence_t;
```

E i comandi:

```c
typedef enum {
  BUZZER_COMMAND_PLAY,
  BUZZER_COMMAND_STOP,
} buzzer_command_type_t;

typedef struct {
  buzzer_command_type_t type;
  buzzer_sequence_t sequence;
} buzzer_command_t;
```

La memoria puntata da `notes` deve rimanere valida per tutta la riproduzione. Le sequenze `static const` soddisfano questo requisito. Passare un array locale creato sullo stack e poi uscire dalla funzione produrrebbe invece un puntatore non valido.

### Politica di priorità

Una possibile politica è:

```text
priority 0 -> feedback UI
priority 1 -> notifica
priority 2 -> errore
priority 3 -> allarme
```

Quando arriva una nuova richiesta:

- se ha priorità inferiore, può essere ignorata o accodata;
- se ha priorità uguale, può sostituire quella corrente;
- se ha priorità superiore, interrompe il suono corrente;
- `STOP` interrompe sempre.

![Politica di gestione dei comandi e delle priorità nel player non bloccante](/blog/images/buzzer_esp32_esp_idf_sounds_melodies/player_priority.svg)

*La queue serializza i comandi e un solo task possiede LEDC. Le richieste con priorità più alta possono interrompere la sequenza corrente, mentre il comportamento di quelle uguali o inferiori resta una scelta applicativa esplicita.*

Non esiste una politica universale. L'importante è renderla esplicita anziché lasciare che l'ultimo task che chiama LEDC vinca casualmente.

## Player non bloccante con queue

Il seguente esempio mantiene la logica leggibile e controlla la queue durante il suono e durante la pausa.

```c
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"
#include "freertos/task.h"

#define BUZZER_QUEUE_LENGTH 6

static QueueHandle_t buzzer_command_queue;
static TaskHandle_t buzzer_task_handle;

static bool buzzer_wait_for_command(TickType_t timeout, buzzer_command_t* command) {
  return xQueueReceive(buzzer_command_queue, command, timeout) == pdTRUE;
}

static bool
buzzer_should_preempt(buzzer_sequence_t const* current, buzzer_command_t const* incoming) {
  if (incoming->type == BUZZER_COMMAND_STOP) {
    return true;
  }

  return incoming->sequence.priority >= current->priority;
}

static bool buzzer_wait_interruptible(
  TickType_t duration, buzzer_sequence_t const* current, buzzer_command_t* replacement
) {
  if (duration == 0) {
    return false;
  }

  TickType_t const start = xTaskGetTickCount();
  TickType_t remaining = duration;

  while (remaining > 0) {
    buzzer_command_t incoming;

    if (!buzzer_wait_for_command(remaining, &incoming)) {
      return false;
    }

    if (buzzer_should_preempt(current, &incoming)) {
      *replacement = incoming;
      return true;
    }

    ESP_LOGD(
      TAG,
      "Comando ignorato: priorità nuova=%u, corrente=%u",
      incoming.sequence.priority,
      current->priority
    );

    TickType_t const elapsed = xTaskGetTickCount() - start;

    if (elapsed >= duration) {
      return false;
    }

    remaining = duration - elapsed;
  }

  return false;
}

static bool buzzer_play_one_note(
  buzzer_note_t const* note,
  uint16_t bpm,
  buzzer_sequence_t const* current,
  buzzer_command_t* replacement
) {
  uint32_t const total_ms = buzzer_ticks_to_ms(note->duration_ticks, bpm);

  uint32_t sound_ms = 0;

  if (note->midi_note != BUZZER_REST) {
    sound_ms = (total_ms * note->gate_percent) / 100U;
  }

  if (sound_ms > total_ms) {
    sound_ms = total_ms;
  }

  uint32_t const rest_ms = total_ms - sound_ms;

  if (sound_ms > 0) {
    uint32_t const frequency_hz = buzzer_midi_to_frequency(note->midi_note);

    if (buzzer_play_tone(frequency_hz, 500) != ESP_OK) {
      ESP_LOGE(TAG, "Errore durante l'avvio della nota");
      buzzer_stop();
      return false;
    }

    if (buzzer_wait_interruptible(buzzer_ms_to_os_ticks(sound_ms), current, replacement)) {
      buzzer_stop();
      return true;
    }
  }

  buzzer_stop();

  if (
    rest_ms > 0 && buzzer_wait_interruptible(buzzer_ms_to_os_ticks(rest_ms), current, replacement)
  ) {
    return true;
  }

  return false;
}

static void buzzer_task(void* argument) {
  (void)argument;

  buzzer_command_t command;

  while (true) {
    if (xQueueReceive(buzzer_command_queue, &command, portMAX_DELAY) != pdTRUE) {
      continue;
    }

    if (command.type == BUZZER_COMMAND_STOP) {
      buzzer_stop();
      continue;
    }

    buzzer_sequence_t current = command.sequence;
    size_t index = 0;

    while (true) {
      if (current.notes == NULL || current.note_count == 0 || current.bpm == 0) {
        buzzer_stop();
        break;
      }

      buzzer_command_t replacement;
      bool const interrupted =
        buzzer_play_one_note(&current.notes[index], current.bpm, &current, &replacement);

      if (interrupted) {
        if (replacement.type == BUZZER_COMMAND_STOP) {
          buzzer_stop();
          break;
        }

        current = replacement.sequence;
        index = 0;
        continue;
      }

      ++index;

      if (index >= current.note_count) {
        if (current.loop) {
          index = 0;
        } else {
          buzzer_stop();
          break;
        }
      }
    }
  }
}
```

Inizializzazione:

```c
esp_err_t buzzer_player_init(void) {
  ESP_RETURN_ON_ERROR(buzzer_init(), TAG, "Impossibile inizializzare LEDC");

  buzzer_command_queue = xQueueCreate(BUZZER_QUEUE_LENGTH, sizeof(buzzer_command_t));

  if (buzzer_command_queue == NULL) {
    return ESP_ERR_NO_MEM;
  }

  BaseType_t const created = xTaskCreate(buzzer_task, "buzzer", 4096, NULL, 5, &buzzer_task_handle);

  if (created != pdPASS) {
    vQueueDelete(buzzer_command_queue);
    buzzer_command_queue = NULL;
    return ESP_ERR_NO_MEM;
  }

  return ESP_OK;
}
```

Invio di una sequenza:

```c
esp_err_t buzzer_player_play(buzzer_sequence_t const* sequence, TickType_t timeout) {
  if (
    sequence == NULL || sequence->notes == NULL || sequence->note_count == 0 || sequence->bpm == 0
    || buzzer_command_queue == NULL
  ) {
    return ESP_ERR_INVALID_ARG;
  }

  buzzer_command_t const command = {
    .type = BUZZER_COMMAND_PLAY,
    .sequence = *sequence,
  };

  return xQueueSend(buzzer_command_queue, &command, timeout) == pdTRUE ? ESP_OK : ESP_ERR_TIMEOUT;
}
```

Stop:

```c
esp_err_t buzzer_player_stop(TickType_t timeout) {
  if (buzzer_command_queue == NULL) {
    return ESP_ERR_INVALID_STATE;
  }

  buzzer_command_t const command = {
    .type = BUZZER_COMMAND_STOP,
  };

  return xQueueSendToFront(buzzer_command_queue, &command, timeout) == pdTRUE ? ESP_OK
                                                                              : ESP_ERR_TIMEOUT;
}
```

### Un limite della queue di esempio

Il task controlla nuovi comandi soltanto nei confini dei due intervalli:

- parte sonora;
- parte silenziosa.

Se una nota dura due secondi, un comando può comunque interromperla perché `xQueueReceive()` resta in attesa con timeout per l'intera durata sonora.

Tuttavia un comando a priorità inferiore viene consumato e ignorato. In un sistema che non voglia perdere notifiche, bisogna usare una politica più articolata:

- queue separate per priorità;
- priority queue;
- reinserimento del comando;
- scheduler di eventi;
- memoria delle notifiche pendenti.

L'esempio mostra la logica fondamentale, non pretende di essere un sequencer universale.

## Usare `esp_timer` per gli eventi musicali

Quando la precisione del tick FreeRTOS non è sufficiente, possiamo programmare la fine di una nota con un timer one-shot.

Il callback non dovrebbe eseguire una lunga elaborazione. Può invece notificare il task del buzzer:

```c
#include "esp_timer.h"

static TaskHandle_t precise_buzzer_task_handle;

static void buzzer_timer_callback(void* argument) {
  (void)argument;

  xTaskNotifyGive(precise_buzzer_task_handle);
}
```

Configurazione:

```c
static esp_timer_handle_t buzzer_event_timer;

esp_err_t buzzer_event_timer_init(void) {
  esp_timer_create_args_t const args = {
    .callback = buzzer_timer_callback,
    .arg = NULL,
    .dispatch_method = ESP_TIMER_TASK,
    .name = "buzzer_event",
    .skip_unhandled_events = true,
  };

  return esp_timer_create(&args, &buzzer_event_timer);
}
```

Nel task:

```c
ESP_ERROR_CHECK(buzzer_play_tone(frequency_hz, 500));
ESP_ERROR_CHECK(esp_timer_start_once(buzzer_event_timer, sound_duration_us));

ulTaskNotifyTake(pdTRUE, portMAX_DELAY);
ESP_ERROR_CHECK(buzzer_stop());
```

Espressif raccomanda callback brevi perché i callback task-dispatch vengono eseguiti in serie nel task di `esp_timer`. Per temporizzazioni più real-time indica GPTimer come alternativa. ([Espressif Systems][10]) ([Espressif Systems][11])

Per una melodia normale la risoluzione millisecondo è generalmente sufficiente. `esp_timer` diventa interessante quando:

- il tempo è elevato;
- le note sono molto brevi;
- bisogna sincronizzare suoni e animazioni;
- il tick FreeRTOS è troppo grossolano;
- si vuole ridurre la deriva senza busy wait.

## Sweep di frequenza

Uno sweep cambia gradualmente la frequenza.

È utile per:

- startup;
- conferme;
- allarmi;
- ricerca della frequenza di risonanza;
- test del trasduttore e del case.

```c
esp_err_t
buzzer_sweep_blocking(uint32_t start_hz, uint32_t end_hz, uint32_t step_hz, uint32_t step_ms) {
  if (start_hz == 0 || end_hz == 0 || step_hz == 0 || step_ms == 0) {
    return ESP_ERR_INVALID_ARG;
  }

  if (start_hz <= end_hz) {
    for (uint32_t hz = start_hz; hz <= end_hz;) {
      ESP_RETURN_ON_ERROR(buzzer_play_tone(hz, 500), TAG, "Errore sweep a %" PRIu32 " Hz", hz);

      vTaskDelay(pdMS_TO_TICKS(step_ms));

      if (end_hz - hz < step_hz) {
        break;
      }

      hz += step_hz;
    }
  } else {
    for (uint32_t hz = start_hz; hz >= end_hz;) {
      ESP_RETURN_ON_ERROR(buzzer_play_tone(hz, 500), TAG, "Errore sweep a %" PRIu32 " Hz", hz);

      vTaskDelay(pdMS_TO_TICKS(step_ms));

      if (hz - end_hz < step_hz) {
        break;
      }

      hz -= step_hz;
    }
  }

  return buzzer_stop();
}
```

Esempio:

```c
ESP_ERROR_CHECK(buzzer_sweep_blocking(500, 4000, 50, 10));
```

Durante il test il volume può aumentare bruscamente vicino alla risonanza.

Un log della frequenza insieme a una misura microfonica o SPL permette di costruire una curva approssimata del sistema assemblato.

## Glissando musicale

Uno sweep lineare in hertz non corrisponde a un movimento lineare in semitoni.

La percezione musicale è logaritmica. Per passare da una nota MIDI a un'altra in passi uniformi possiamo interpolare il numero di nota e convertirlo in frequenza:

```c
esp_err_t
buzzer_glissando_blocking(uint8_t start_note, uint8_t end_note, uint16_t total_ms, uint16_t steps) {
  if (steps == 0 || total_ms == 0) {
    return ESP_ERR_INVALID_ARG;
  }

  int const start = start_note;
  int const distance = (int)end_note - start;
  uint32_t const step_ms = total_ms / steps;

  for (uint16_t i = 0; i <= steps; ++i) {
    double const position = (double)i / steps;
    double const midi = start + distance * position;
    double const frequency = 440.0 * pow(2.0, (midi - 69.0) / 12.0);

    ESP_RETURN_ON_ERROR(
      buzzer_play_tone((uint32_t)lround(frequency), 500), TAG, "Errore durante il glissando"
    );

    vTaskDelay(pdMS_TO_TICKS(step_ms));
  }

  return buzzer_stop();
}
```

Il risultato dipende dalla velocità con cui LEDC cambia frequenza e dalla risposta del trasduttore.

Con pochi step si sentirà una scala discreta. Con molti step il passaggio diventerà più continuo, ma aumenterà il numero di riconfigurazioni.

## Arpeggi e accordi

Un singolo canale PWM genera una frequenza fondamentale alla volta.

Di conseguenza, un solo buzzer passivo è naturalmente monofonico.

Un accordo richiede più frequenze simultanee. Possiamo aggirare il limite con un arpeggio:

```text
C4 -> E4 -> G4 -> C5
```

Le note vengono riprodotte rapidamente una dopo l'altra e il cervello percepisce una struttura armonica, pur non essendo un vero accordo.

```c
static buzzer_note_t const major_arpeggio[] = {
  {NOTE_C4, DUR_SIXTEENTH, 85},
  {NOTE_E4, DUR_SIXTEENTH, 85},
  {NOTE_G4, DUR_SIXTEENTH, 85},
  {NOTE_C5, DUR_SIXTEENTH, 85},
};
```

È possibile alternare rapidamente due frequenze o generare una forma d'onda software che ne sommi diverse, ma il risultato:

- richiede una frequenza di aggiornamento molto più alta;
- produce aliasing e armoniche;
- non è più un semplice uso di LEDC;
- dipende fortemente dal trasduttore;
- rimane lontano dalla qualità di un altoparlante.

Se la polifonia è un requisito reale, conviene cambiare architettura.

## Comporre segnali acustici prima delle melodie

In un prodotto embedded la musica non è sempre l'obiettivo principale.

Spesso dobbiamo costruire un linguaggio acustico.

Un buon segnale dovrebbe essere:

- riconoscibile;
- breve;
- coerente;
- non ambiguo;
- proporzionato alla gravità dell'evento;
- distinguibile dal rumore ambientale;
- non eccessivamente fastidioso.

Una possibile grammatica:

| Evento | Pattern |
| ------ | ------- |
| Pressione valida | tono breve medio-acuto |
| Operazione completata | due note ascendenti |
| Operazione annullata | due note discendenti |
| Errore recuperabile | tre impulsi medi |
| Errore critico | alternanza ripetuta di due frequenze |
| Batteria bassa | impulso breve ripetuto a intervalli lunghi |
| Avvio | arpeggio ascendente |
| Spegnimento | arpeggio discendente |

Il significato deve rimanere coerente in tutto il prodotto.

Usare la stessa sequenza per “operazione riuscita” e “errore” rende il feedback inutile, anche se la melodia è tecnicamente corretta.

## Costruire una melodia leggibile

Per comporre una piccola melodia su buzzer conviene lavorare per livelli.

### 1. Scegliere un intervallo utile

Prima di scrivere le note, eseguire uno sweep e identificare la zona in cui il buzzer è sufficientemente udibile.

Supponiamo che il componente lavori bene tra `600 Hz` e `2500 Hz`.

Una nota `C4` a circa `262 Hz` potrebbe risultare debole. Potremmo quindi trasporre la melodia di un'ottava:

```text
C4 -> C5
E4 -> E5
G4 -> G5
```

Un'ottava raddoppia la frequenza:

```text
f_octave = 2 * f
```

La trasposizione non cambia le relazioni musicali, ma può adattare la sequenza al trasduttore.

### 2. Definire il ritmo

Una melodia riconoscibile ha bisogno di una struttura temporale.

Possiamo partire da una cellula semplice:

```text
croma, croma, semiminima
```

Ripeterla con note differenti crea coerenza.

### 3. Usare pause reali

La pausa non è tempo sprecato.

Serve a:

- separare frasi;
- rendere distinguibili note uguali;
- ridurre l'affaticamento;
- creare aspettativa;
- codificare il significato.

### 4. Limitare la durata

Un feedback UI dovrebbe essere normalmente breve.

Una melodia di avvio può essere più lunga, ma non dovrebbe impedire all'utente di interagire né mascherare allarmi più importanti.

### 5. Provare sul dispositivo reale

La stessa sequenza può risultare gradevole su un altoparlante e sgradevole su un piezo risonante.

Bisogna ascoltarla:

- dentro il case;
- alla tensione reale;
- con l'alimentazione reale;
- durante Wi-Fi e altri carichi;
- a diverse temperature, se rilevante;
- alla distanza d'uso prevista.

## Scale utili per iniziare

Una scala maggiore contiene sette note prima dell'ottava.

Per Do maggiore:

```text
C D E F G A B C
```

Numeri MIDI:

```c
static uint8_t const c_major_scale[] = {60, 62, 64, 65, 67, 69, 71, 72};
```

Una scala pentatonica maggiore usa cinque note:

```text
C D E G A
```

```c
static uint8_t const c_major_pentatonic[] = {60, 62, 64, 67, 69, 72};
```

La pentatonica è utile nei piccoli effetti perché riduce il rischio di combinazioni fortemente dissonanti.

Una scala minore naturale di La:

```text
A B C D E F G A
```

```c
static uint8_t const a_natural_minor[] = {69, 71, 72, 74, 76, 77, 79, 81};
```

Queste strutture non obbligano a scrivere musica tonale. Forniscono soltanto un insieme iniziale di frequenze con relazioni prevedibili.

## Generare una melodia da gradi della scala

Separare la melodia dalla tonalità permette di trasporla facilmente.

```c
typedef struct {
  int8_t degree;
  int8_t octave_offset;
  uint16_t duration_ticks;
  uint8_t gate_percent;
} scale_event_t;
```

Con una scala di sette note:

```c
uint8_t
scale_degree_to_midi(uint8_t const* scale, size_t scale_size, int degree, int octave_offset) {
  int octave = octave_offset;

  while (degree < 0) {
    degree += (int)scale_size;
    --octave;
  }

  while (degree >= (int)scale_size) {
    degree -= (int)scale_size;
    ++octave;
  }

  return (uint8_t)(scale[degree] + octave * 12);
}
```

Una frase può essere descritta come:

```c
static scale_event_t const phrase[] = {
  {.degree = 0, .octave_offset = 0, .duration_ticks = DUR_EIGHTH, .gate_percent = 88},
  {.degree = 2, .octave_offset = 0, .duration_ticks = DUR_EIGHTH, .gate_percent = 88},
  {.degree = 4, .octave_offset = 0, .duration_ticks = DUR_QUARTER, .gate_percent = 92},
  {.degree = 0, .octave_offset = 1, .duration_ticks = DUR_HALF, .gate_percent = 95},
};
```

Usando la scala maggiore otteniamo una frase maggiore. Usando una scala minore con lo stesso schema di gradi otteniamo un carattere differente.

Questa rappresentazione è utile quando il firmware genera variazioni procedurali o deve adattare la tonalità a un profilo utente.

## Articolazione e inviluppo

Un buzzer pilotato con una semplice onda quadra passa istantaneamente da silenzio a piena eccitazione.

Un inviluppo musicale classico viene spesso descritto con:

```text
Attack -> Decay -> Sustain -> Release
```

Con LEDC possiamo tentare un'approssimazione modificando il duty cycle nel tempo.

Tuttavia, come abbiamo visto, duty cycle e ampiezza non sono equivalenti. L'effetto ottenuto cambia anche il timbro.

Una versione semplice:

```c
static esp_err_t buzzer_attack(
  uint32_t frequency_hz, uint16_t start_duty, uint16_t end_duty, uint16_t steps, uint16_t step_ms
) {
  if (steps == 0) {
    return ESP_ERR_INVALID_ARG;
  }

  for (uint16_t i = 0; i <= steps; ++i) {
    uint32_t const duty = start_duty + ((uint32_t)(end_duty - start_duty) * i) / steps;

    ESP_RETURN_ON_ERROR(
      buzzer_play_tone(frequency_hz, (uint16_t)duty), TAG, "Errore durante l'attacco"
    );

    vTaskDelay(pdMS_TO_TICKS(step_ms));
  }

  return ESP_OK;
}
```

Questo codice assume `end_duty >= start_duty`. Un driver riutilizzabile dovrebbe gestire anche la rampa discendente senza underflow.

LEDC possiede inoltre un motore hardware di fade per modificare gradualmente il duty cycle senza intervento continuo della CPU. La periferica è stata progettata per i LED, ma la stessa funzione può essere sperimentata per inviluppi rudimentali, tenendo presente che il risultato acustico dipende dal circuito. ([Espressif Systems][9])

## Frequenza condivisa tra canali LEDC

I canali LEDC sono associati a timer.

La frequenza appartiene al timer, non soltanto al canale.

Se il buzzer condivide `LEDC_TIMER_0` con un LED o con un'altra uscita PWM, chiamare `ledc_set_freq()` modifica il timer e quindi può alterare tutti i canali collegati a esso.

Per questo conviene riservare al buzzer:

- un timer LEDC dedicato;
- un canale dedicato;
- un GPIO compatibile con il target.

L'architettura LEDC e l'associazione tra timer e canali sono descritte nella documentazione Espressif. ([Espressif Systems][9])

Il problema è facile da riconoscere:

```text
il buzzer cambia nota
        |
        +--> contemporaneamente un LED cambia comportamento
```

La causa non è FreeRTOS. È la condivisione del timer PWM.

## Sleep e comportamento dell'uscita

LEDC permette di configurare il comportamento del canale durante Light-sleep tramite `sleep_mode`. Il supporto effettivo dipende dal target e dal clock selezionato. La modalità predefinita non mantiene necessariamente il segnale vivo durante il sonno. ([Espressif Systems][9])

Prima di entrare in sleep bisogna decidere:

- il buzzer deve fermarsi?
- un allarme deve continuare?
- il suono deve risvegliare il sistema?
- il timer conserva la frequenza?
- il GPIO assume un livello sicuro?
- il transistor rimane spento?

Per la maggior parte delle interfacce è preferibile:

1. inviare `STOP` al player;
2. attendere lo spegnimento;
3. mettere il pin nello stato sicuro;
4. entrare in sleep.

Un allarme che deve funzionare mentre la CPU dorme richiede invece un'analisi specifica del target, del clock e dei domini di alimentazione.

## Quando usare PWM Audio

Espressif fornisce un componente PWM Audio che usa LEDC per produrre audio PWM senza codec esterno. È pensato per applicazioni sensibili al costo e con requisiti di qualità ridotti; supporta campionamenti da 8 a 48 kHz e risoluzioni PWM da 8 a 10 bit. ([Espressif Systems][16])

Questo approccio è differente dal semplice tono:

```text
melodia a note
    -> LEDC cambia frequenza per ogni nota

PWM Audio
    -> un flusso di campioni modifica rapidamente il duty
    -> un filtro / trasduttore ricostruisce il segnale medio
```

PWM Audio diventa interessante quando vogliamo:

- effetti sonori campionati;
- forme d'onda differenti dall'onda quadra;
- brevi clip vocali a bassa qualità;
- sintesi più complessa.

Richiede però:

- maggiore banda di memoria;
- più CPU o DMA, secondo implementazione;
- filtraggio;
- amplificazione adeguata;
- trasduttore con banda sufficiente.

Un buzzer risonante resta comunque un pessimo altoparlante. Anche con campioni perfetti, il componente può enfatizzare una stretta zona di frequenze e rendere il parlato incomprensibile.

## Quando passare a I2S e a un altoparlante

Se il requisito comprende:

- voce comprensibile;
- musica;
- polifonia;
- file WAV o MP3;
- controllo reale del volume;
- risposta in frequenza più ampia;
- qualità ripetibile;

conviene usare un altoparlante con amplificatore e, quando necessario, codec o DAC.

ESP32 offre periferiche I2S per trasferire campioni audio digitali. La documentazione Espressif descrive I2S come un bus sincrono per la comunicazione tra dispositivi audio digitali. ([Espressif Systems][17])

In sostanza:

```text
buzzer -> segnali e melodie semplici
speaker -> audio
```

Tentare di trasformare un buzzer economico in un sistema audio completo aumenta il firmware senza superare i limiti meccanici del componente.

## Errori frequenti

### Usare un buzzer attivo per una melodia

La frequenza interna rimane dominante. Il PWM esterno può soltanto interrompere il tono e creare una modulazione ritmica.

### Collegare un trasduttore magnetico direttamente al GPIO

La corrente può superare quella compatibile con il pin e la bobina può generare una sovratensione allo spegnimento.

### Aggiungere il diodo sbagliato a un piezo

Il piezo non è una bobina. Il circuito va scelto in base al modello elettrico e alle indicazioni del produttore.

### Ignorare la tensione `Vp-p`

`3 V0-p`, `3 Vrms` e `3 Vp-p` descrivono eccitazioni differenti. Il confronto diretto dei datasheet diventa errato.

### Assumere che tutte le note abbiano lo stesso volume

La risposta del buzzer e della cavità varia con la frequenza. Una melodia può risultare fortemente sbilanciata.

### Usare il duty cycle come volume lineare

Il duty modifica anche il contenuto armonico e la forma d'onda. Il volume percepito non segue necessariamente una relazione lineare.

### Condividere il timer LEDC

Cambiare la nota del buzzer modifica anche gli altri canali collegati allo stesso timer.

### Usare `vTaskDelay()` in una lunga sequenza

Il tempo impiegato da calcoli, log e scheduling si somma ai delay relativi e può introdurre deriva.

### Fare logging pesante durante note brevi

La serializzazione dei log può alterare la temporizzazione e rendere il comportamento differente tra build di debug e release.

### Lasciare il buzzer attivo durante un errore

Un return anticipato può saltare `buzzer_stop()` e produrre un tono permanente.

Per questo ogni percorso di uscita dovrebbe riportare l'hardware in uno stato sicuro.

### Passare alla queue una melodia locale

Il task del buzzer riceve un puntatore a memoria che non esiste più quando la funzione chiamante termina.

Le melodie condivise devono avere una durata di vita sufficiente, per esempio `static const`.

### Non considerare il reset

Durante il boot il GPIO può essere flottante o assumere funzioni speciali. Una resistenza hardware di pull-down sul transistor evita beep indesiderati prima dell'inizializzazione software.

## Diagnostica

Per diagnosticare un buzzer servono strumenti differenti.

### Multimetro

Permette di verificare:

- alimentazione;
- continuità;
- resistenza della bobina;
- polarità;
- stato medio del GPIO.

Non mostra correttamente la forma d'onda PWM.

### Oscilloscopio

Permette di osservare:

- frequenza reale;
- duty cycle;
- tensione picco-picco;
- overshoot;
- flyback;
- tempi di salita e discesa;
- rumore sull'alimentazione;
- sincronizzazione push-pull.

Le misure differenziali su un ponte richiedono particolare attenzione. Collegare la massa di una sonda tradizionale al nodo sbagliato può cortocircuitare il circuito attraverso la terra dello strumento.

### Logic analyzer

È utile per verificare:

- sequenza delle note;
- durata degli impulsi;
- intervalli;
- jitter;
- relazione tra buzzer e altri eventi digitali.

Non misura correttamente transitori analogici o tensioni fuori dai livelli logici.

### Microfono o fonometro

Permette di confrontare:

- frequenze;
- case differenti;
- tensioni differenti;
- distanze;
- orientamento;
- esemplari.

Uno smartphone può aiutare durante una prova comparativa, ma non sostituisce automaticamente una misura SPL calibrata.

## Logica di test del firmware

Un test utile non dovrebbe limitarsi a “si sente qualcosa”.

Possiamo costruire una procedura:

1. inizializzare il driver;
2. suonare frequenze fisse;
3. verificare la frequenza con oscilloscopio;
4. eseguire uno sweep;
5. individuare la risonanza;
6. riprodurre una scala;
7. verificare il tempo totale;
8. inviare un comando di interruzione;
9. entrare e uscire dallo sleep;
10. ripetere con radio e carichi attivi.

Esempio di task di test:

```c
static void buzzer_test_task(void* argument) {
  (void)argument;

  uint32_t const test_frequencies[] = {
    500,
    1000,
    2000,
    4000,
  };

  for (size_t i = 0; i < sizeof(test_frequencies) / sizeof(test_frequencies[0]); ++i) {
    ESP_LOGI(TAG, "Test tono: %" PRIu32 " Hz", test_frequencies[i]);

    ESP_ERROR_CHECK(buzzer_play_tone(test_frequencies[i], 500));

    vTaskDelay(pdMS_TO_TICKS(500));
    ESP_ERROR_CHECK(buzzer_stop());
    vTaskDelay(pdMS_TO_TICKS(250));
  }

  ESP_ERROR_CHECK(buzzer_sweep_blocking(300, 5000, 50, 15));

  ESP_ERROR_CHECK(buzzer_play_sequence_blocking(
    startup_melody, sizeof(startup_melody) / sizeof(startup_melody[0]), 132
  ));

  vTaskDelete(NULL);
}
```

## Misurare l'errore temporale

Possiamo confrontare durata teorica e durata reale usando `esp_timer_get_time()`:

```c
#include "esp_timer.h"

int64_t const start_us = esp_timer_get_time();

ESP_ERROR_CHECK(buzzer_play_sequence_blocking(
  startup_melody, sizeof(startup_melody) / sizeof(startup_melody[0]), 132
));

int64_t const elapsed_us = esp_timer_get_time() - start_us;

ESP_LOGI(TAG, "Durata reale: %.3f s", elapsed_us / 1000000.0);
```

La durata teorica è la somma dei tick:

```c
uint64_t buzzer_sequence_duration_ms(buzzer_note_t const* notes, size_t note_count, uint16_t bpm) {
  uint64_t total_ticks = 0;

  for (size_t i = 0; i < note_count; ++i) {
    total_ticks += notes[i].duration_ticks;
  }

  return (60000ULL * total_ticks + ((uint64_t)bpm * BUZZER_TICKS_PER_QUARTER) / 2U)
         / ((uint64_t)bpm * BUZZER_TICKS_PER_QUARTER);
}
```

Differenze di pochi millisecondi possono derivare da:

- arrotondamento;
- granularità del tick;
- scheduling;
- log;
- riconfigurazione LEDC.

Se l'errore cresce nota dopo nota, il problema è probabilmente la deriva della logica temporale. Se rimane quasi costante, può essere un overhead iniziale o finale.

## Separare driver, sequencer e significato

Una struttura pulita può essere suddivisa in tre livelli.

![Architettura a livelli dal significato applicativo al trasduttore](/blog/images/buzzer_esp32_esp_idf_sounds_melodies/firmware_layers.svg)

*Il dominio richiede un intento sonoro, il sequencer lo traduce in eventi temporali e il driver controlla la periferica. Circuito elettrico e trasduttore rimangono dettagli confinati sotto questa interfaccia.*

### Driver

Responsabile di:

- GPIO;
- LEDC;
- frequenza;
- duty;
- stop;
- stato elettrico sicuro.

Interfaccia:

```c
esp_err_t buzzer_init(void);
esp_err_t buzzer_play_tone(uint32_t hz, uint16_t duty_per_mille);
esp_err_t buzzer_stop(void);
```

### Sequencer

Responsabile di:

- note;
- BPM;
- tick;
- gate;
- queue;
- priorità;
- loop;
- interruzioni.

Interfaccia:

```c
esp_err_t buzzer_player_play(buzzer_sequence_t const* sequence, TickType_t timeout);

esp_err_t buzzer_player_stop(TickType_t timeout);
```

### Dominio applicativo

Responsabile del significato:

```c
void ui_sound_confirm(void);
void ui_sound_cancel(void);
void system_sound_error(void);
void system_sound_alarm(void);
```

L'applicazione non dovrebbe conoscere numeri MIDI o canali LEDC.

Esempio:

```c
void ui_sound_confirm(void) {
  static buzzer_sequence_t const sequence = {
    .notes = success_melody,
    .note_count = sizeof(success_melody) / sizeof(success_melody[0]),
    .bpm = 180,
    .priority = 0,
    .loop = false,
  };

  esp_err_t const error = buzzer_player_play(&sequence, 0);

  if (error != ESP_OK) {
    ESP_LOGW(TAG, "Feedback acustico non accodato");
  }
}
```

Questa separazione permette di cambiare hardware senza riscrivere la semantica dell'interfaccia.

## Tabella di scelta

| Applicazione | Componente | Pilotaggio consigliato |
| ----------- | ---------- | ---------------------- |
| Click di conferma | indicatore attivo | GPIO + transistor |
| Pattern di errore | indicatore attivo | task + sequenza on/off |
| Melodia semplice | trasduttore passivo | LEDC + transistor/driver |
| Sweep di allarme | trasduttore passivo | LEDC + scheduler |
| Elevata pressione sonora | piezo + driver dedicato | ponte o circuito raccomandato |
| Buzzer magnetico | trasduttore magnetico | transistor + clamp |
| Audio campionato economico | altoparlante o trasduttore adatto | PWM Audio + filtro/amplificatore |
| Voce o musica | altoparlante | I2S + DAC/codec/amplificatore |
| Allarme normato | componente qualificato | architettura conforme allo standard applicabile |

## Checklist hardware

Prima di chiudere lo schema conviene rispondere a queste domande:

1. Il componente è piezoelettrico o magnetico?
2. È un indicatore o un trasduttore?
3. Integra un oscillatore?
4. Qual è la tensione nominale?
5. Il dato è espresso in `VDC`, `Vrms`, `V0-p` o `Vp-p`?
6. Qual è la corrente richiesta?
7. Qual è la frequenza nominale?
8. Qual è la capacità o l'impedenza?
9. Serve un transistor?
10. Serve un diodo di flyback?
11. Serve una resistenza di scarica?
12. Il GPIO assume uno stato sicuro al reset?
13. Il buzzer deve essere attivo durante sleep?
14. La cavità acustica è stata progettata?
15. Il foro del case è sufficiente?
16. Il componente è protetto da acqua e polvere?
17. Il duty cycle continuo è consentito?
18. Il circuito è stato verificato con oscilloscopio?
19. La misura è stata eseguita alla tensione reale?
20. Il test è stato ripetuto nel prodotto assemblato?

## Checklist firmware

1. Il driver nasconde la polarità elettrica?
2. LEDC usa un timer dedicato?
3. La frequenza effettiva viene controllata?
4. Lo stop viene eseguito anche in caso di errore?
5. Le melodie hanno memoria con durata sufficiente?
6. Le durate usano interi a 64 bit nei calcoli?
7. Le note brevi vengono arrotondate ad almeno un tick?
8. La sequenza accumula deriva?
9. Il player vive in un task dedicato?
10. Esiste una politica di priorità?
11. Un allarme può interrompere un feedback UI?
12. Lo stop può interrompere una nota lunga?
13. I log alterano la temporizzazione?
14. Il comportamento in sleep è definito?
15. Il player reagisce al reset o alla deinizializzazione?
16. Il firmware distingue pausa e nota?
17. Due note uguali consecutive vengono separate?
18. Il duty cycle è trattato con prudenza?
19. Le frequenze sono adatte al componente reale?
20. I suoni hanno un significato coerente nell'interfaccia?

## Conclusione

La mia conclusione è che un buzzer sia semplice soltanto finché lo consideriamo un componente capace di produrre un rumore qualsiasi.

Quando vogliamo ottenere un feedback riconoscibile e ripetibile, entrano in gioco diversi livelli.

La tecnologia fisica stabilisce come nasce la vibrazione. Il circuito interno determina se sia sufficiente una tensione continua o serva una forma d'onda esterna. Lo stadio di pilotaggio deve rispettare corrente, tensione e natura del carico. Il case modifica la risposta acustica. LEDC genera il tono, mentre il sequencer attribuisce durata, ritmo e priorità agli eventi. L'applicazione decide infine cosa debba significare quel suono.

Confondere questi livelli porta ai problemi più comuni: usare un buzzer attivo per una melodia, pilotare una bobina direttamente dal GPIO, interpretare il duty cycle come volume lineare, ignorare la risonanza o bloccare l'intera applicazione durante un jingle.

Su ESP-IDF, LEDC rappresenta una soluzione naturale per i trasduttori passivi perché genera in hardware una PWM stabile e permette di cambiare frequenza durante il funzionamento. Un task dedicato può poi trasformare note, BPM, pause e priorità in una sequenza temporale senza distribuire il controllo della periferica in tutto il firmware.

Tuttavia il buzzer rimane un dispositivo di segnalazione. Può riprodurre melodie semplici, sweep e pattern sorprendentemente efficaci, ma non diventa un altoparlante soltanto perché il firmware genera più campioni.

In sostanza, la scelta migliore non è il suono più lungo o la melodia più complessa. È il segnale che il componente riesce a produrre in modo affidabile e che l'utente riesce a interpretare senza esitazione.

## Fonti principali consultate

La distinzione tra tecnologia piezoelettrica e magnetica, tra indicatori e trasduttori e i relativi circuiti di pilotaggio è stata verificata sulla documentazione tecnica di Same Sky e Murata. ([Same Sky][1]) ([Murata][2]) ([Murata][7])

Le caratteristiche di frequenza, tensione e pressione sonora sono state confrontate con le pagine prodotto e la guida di selezione TDK, usando valori concreti soltanto come esempi riferiti ai modelli citati. ([TDK][4]) ([TDK][5])

La parte ESP-IDF è basata sulla documentazione stabile di LEDC, GPTimer, `esp_timer`, PWM Audio, I2S e sulle note di migrazione FreeRTOS di ESP-IDF 6.0. ([Espressif Systems][9]) ([Espressif Systems][10]) ([Espressif Systems][11]) ([Espressif Systems][15]) ([Espressif Systems][16]) ([Espressif Systems][17])

La conversione tra numero MIDI e frequenza è stata verificata sulla documentazione didattica della McGill University e sulle risorse della MIDI Association relative ad A440 e alla numerazione delle note. ([McGill University][13]) ([MIDI Association][14])

### Crediti immagine

- Immagine di copertina: [Ideenwelt EM2862 - Piezoelectric buzzer-91800.jpg] di [Raimond Spekking], Wikimedia Commons, licenza [CC BY-SA 4.0]. Immagine ritagliata, ridimensionata e convertita in WebP per il layout del sito; la versione adattata resta disponibile con la stessa licenza.

[1]: https://www.sameskydevices.com/blog/buzzer-basics-technologies-tones-and-driving-circuits "Buzzer Basics - Technologies, Tones, and Drive Circuits"
[2]: https://www.murata.com/products/sound/library/basic/soundtype "Types of Sound Components and Piezoelectric Sound Components"
[3]: https://www.murata.com/products/sound/library/basic/mechanism "Mechanism of sound"
[4]: https://product.tdk.com/en/products/selectionguide/piezo-buzzer.html "TDK Piezoelectric Buzzer Selection Guide"
[5]: https://product.tdk.com/en/search/sw_piezo/sw_piezo/piezo-buzzer/info?part_no=PS1240P02BT "TDK PS1240P02BT"
[6]: https://www.sameskydevices.com/catalog/audio/buzzers/audio-transducers "Same Sky Audio Transducers Catalog"
[7]: https://www.murata.com/products/sound/library/basic/circuit "Basic Circuits and Circuit Diagrams of Piezoelectric Sound Components"
[8]: https://www.sameskydevices.com/blog/how-to-increase-the-audio-output-of-a-piezoelectric-transducer-buzzer "How to Increase the Audio Output of a Piezoelectric Transducer Buzzer"
[9]: https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/peripherals/ledc.html "LED Control (LEDC) - ESP-IDF Programming Guide"
[10]: https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/peripherals/gptimer.html "General Purpose Timer (GPTimer) - ESP-IDF Programming Guide"
[11]: https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/system/esp_timer.html "ESP Timer - ESP-IDF Programming Guide"
[12]: https://www.sameskydevices.com/blog/pulse-width-modulation-pwm-how-it-works-and-why-its-essential-in-electronics "Pulse Width Modulation: How it Works and Why it is Essential"
[13]: https://caml.music.mcgill.ca/~gary/307/week1/node11.html "MIDI/Frequency Conversion"
[14]: https://midi.org/microtuning-and-alternative-intonation-systems "Microtuning and Alternative Intonation Systems"
[15]: https://docs.espressif.com/projects/esp-idf/en/stable/esp32/migration-guides/release-6.x/6.0/system.html "ESP-IDF 6.0 System Migration Guide"
[16]: https://docs.espressif.com/projects/esp-iot-solution/en/latest/audio/pwm_audio.html "PWM Audio - ESP-IoT-Solution"
[17]: https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/peripherals/i2s.html "Inter-IC Sound (I2S) - ESP-IDF Programming Guide"
[Ideenwelt EM2862 - Piezoelectric buzzer-91800.jpg]: https://commons.wikimedia.org/wiki/File:Ideenwelt_EM2862_-_Piezoelectric_buzzer-91800.jpg "Piezoelectric buzzer: Raimond Spekking"
[Raimond Spekking]: https://commons.wikimedia.org/wiki/User:Raymond "Raimond Spekking on Wikimedia Commons"
[CC BY-SA 4.0]: https://creativecommons.org/licenses/by-sa/4.0/ "Creative Commons Attribution-ShareAlike 4.0 International"
