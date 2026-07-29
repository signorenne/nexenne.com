---
title: "Encoder rotativi su ESP32 con ESP-IDF: quadratura, decoder software e PCNT"
lang: it
date: 2026-07-28
lastmod: 2026-07-28
desc: "Guida agli encoder rotativi su ESP32: quadratura, decoder software, PCNT, velocità e firmware robusto con ESP-IDF."
read: "66 min"
tags: ["ESP32", "ESP-IDF", "Encoder", "PCNT", "Embedded", "GPIO"]
categories: ["Embedded", "Tutorial"]
image: "/blog/covers/rotary_encoders_esp32_esp_idf_pcnt.webp"
---

## Abstract

Durante lo sviluppo di interfacce fisiche e sistemi di controllo motore mi sono trovato più volte a usare un encoder rotativo. In apparenza il componente è semplice: due segnali digitali, qualche fronte da contare e una variabile da incrementare o decrementare.

In un primo momento può anche funzionare così. La manopola gira lentamente, i collegamenti sono corti e un passo perso non cambia davvero il comportamento del prodotto. Basta però aumentare la velocità, avvicinare il circuito a un motore o pretendere una posizione affidabile perché emergano rimbalzi, disturbi, transizioni invalide, overflow e ambiguità sulla risoluzione reale.

Mi sono quindi chiesto quale fosse il modo corretto di affrontare il problema su ESP32 con ESP-IDF. La risposta non consiste in una singola funzione. Bisogna prima capire che cosa produca realmente un encoder, come funzioni la quadratura, quali siano le caratteristiche elettriche dell'uscita e quale parte del lavoro possa essere affidata alla periferica PCNT.

In questo articolo partiremo dunque dal principio di funzionamento degli encoder e arriveremo a una configurazione completa del driver `driver/pulse_cnt.h`, usando le API correnti di ESP-IDF 6.0. Analizzeremo inoltre rimbalzo, filtri, conteggio x1/x2/x4, overflow, watch point, velocità, low power e casi in cui PCNT non rappresenta la scelta migliore.

È doveroso specificare subito l'ambito: qui per *encoder* intendo un dispositivo fisico che trasforma una posizione o un movimento meccanico in un segnale elettrico. Non mi riferisco quindi a codec audio, video o immagini.

## Il problema non è soltanto contare impulsi

Un encoder non consegna direttamente al firmware un'informazione già pronta come:

```text
la manopola è a 127,4 gradi
```

A seconda del modello può fornire impulsi, una sequenza codificata, un angolo letto via SPI oppure una coppia differenziale da ricevere con hardware dedicato. Prima di aggiornare una variabile, il sistema deve quindi attraversare diversi livelli:

1. il movimento meccanico;
2. il principio fisico di misura;
3. il circuito di uscita;
4. il cablaggio;
5. l'ingresso del microcontrollore;
6. il decoder;
7. la logica applicativa.

Questa separazione è importante perché problemi diversi producono sintomi simili. Un conteggio errato può dipendere dal bounce dei contatti, da un livello a 5 V collegato male, da un filtro troppo aggressivo, da un fronte perso o semplicemente da una definizione ambigua di PPR.

La prima regola è dunque non trattare ogni errore come un problema software.

## Che cos'è un encoder

Un encoder di posizione è un dispositivo elettromeccanico che converte un movimento lineare o rotativo in un segnale elettrico dal quale possiamo ricavare posizione, direzione e velocità. ([Renishaw][1])

Un encoder rotativo osserva la rotazione di un albero. È il caso delle classiche manopole meccaniche, dei sensori montati sui motori e degli encoder magnetici che misurano l'orientamento di un magnete.

Un encoder lineare misura invece lo spostamento lungo un asse. Il principio può essere simile, ma la scala è disposta lungo una guida anziché attorno a un disco.

L'encoder non decide cosa significhi quel movimento. È il firmware che stabilisce se un incremento debba:

- alzare il volume;
- spostare un cursore;
- aggiornare un setpoint;
- misurare la velocità di un motore;
- chiudere un anello di posizione.

Questo sembra un dettaglio, ma distingue un semplice dispositivo di input da un vero sistema di misura.

## Encoder incrementali e assoluti

La prima distinzione utile è tra encoder incrementali e assoluti.

### Encoder incrementale

Un encoder incrementale comunica una variazione di posizione. Il controller osserva gli impulsi e costruisce la posizione accumulandoli nel tempo:

```text
nuova_posizione = posizione_precedente + incremento
```

L'informazione è quindi relativa a un punto iniziale. Dopo un reset o una perdita di alimentazione il sistema non conosce più la posizione meccanica, a meno che non l'abbia salvata o non possa ricostruirla tramite homing.

In sostanza, l'encoder non dice «sono a 90 gradi». Dice «mi sono spostato di un passo in questa direzione».

### Encoder assoluto

Un encoder assoluto associa invece un codice alla posizione. Il controller può accendersi e leggere subito l'angolo corrente senza dover prima osservare un movimento. ([Renishaw][1])

Le interfacce usate possono essere, ad esempio:

- SPI;
- SSI;
- BiSS;
- PWM;
- protocolli proprietari.

Alcuni dispositivi forniscono più rappresentazioni contemporaneamente. L'AS5047D, ad esempio, espone un angolo assoluto a 14 bit via SPI, un'uscita PWM e segnali incrementali ABI programmabili. L'uscita ABI arriva però a 2048 step per giro in modalità binaria, non a 14 bit: la risoluzione dell'interfaccia incrementale e quella del dato assoluto non sono la stessa cosa. ([ams OSRAM][12])

Questo è un punto che vale la pena ricordare: *magnetico* descrive come viene misurata la posizione, mentre *assoluto* e *incrementale* descrivono che cosa viene fornito all'esterno.

### Il canale di indice

Molti encoder incrementali aggiungono ai segnali A e B un terzo canale, normalmente chiamato `Z`, `I` o `Index`.

L'indice viene generato in una posizione specifica, spesso una volta per giro. Non rende assoluto l'encoder, ma fornisce un riferimento ripetibile.

Un asse può quindi:

1. muoversi fino a trovare l'indice;
2. correggere o azzerare il contatore;
3. continuare a lavorare in modo incrementale.

Nei sistemi reali l'indice viene spesso combinato con un fine corsa o con una finestra meccanica, perché da solo può identificare la posizione nel giro ma non necessariamente il giro corretto.

## Principi fisici di funzionamento

Incrementale e assoluto non identificano la tecnologia del sensore. Un encoder può essere meccanico, ottico, magnetico, induttivo o capacitivo.

### Encoder meccanici a contatto

Le manopole economiche, come molte varianti EC11 o PEC11, usano contatti metallici. Durante la rotazione il terminale comune viene collegato alternativamente ai canali A e B, generando una sequenza in quadratura.

Sono adatte a:

- menu;
- timer;
- regolazione del volume;
- impostazione di parametri;
- interfacce utente a bassa velocità.

Il loro vantaggio è la semplicità. Il limite è altrettanto concreto: i contatti rimbalzano e si usurano.

Il datasheet del Bourns PEC11R, come esempio, dichiara un'uscita a due bit in quadratura, un bounce massimo di 2 ms misurato a 15 RPM e una velocità operativa massima di 60 RPM. Questi valori appartengono a quel componente e non devono essere trasformati in regole universali per tutti gli encoder meccanici. ([Bourns][3])

### Encoder ottici

Un encoder ottico usa normalmente una sorgente luminosa, un disco o una scala e uno o più fotodetettori.

Le zone trasparenti e opache modulano la luce. Due sensori opportunamente sfalsati producono i segnali A e B, mentre una traccia separata può generare l'indice.

Questa tecnologia permette di ottenere velocità e risoluzioni elevate. Tuttavia richiede una geometria controllata e può risentire di contaminazione, danneggiamento della scala o disallineamento.

### Encoder magnetici

Un encoder magnetico misura l'orientamento del campo prodotto da un magnete collegato all'albero. Il chip ricostruisce l'angolo tramite elementi Hall, magnetoresistivi o strutture equivalenti.

L'assenza di contatto e di disco ottico rende questa soluzione interessante in presenza di:

- polvere;
- condensa;
- vibrazioni;
- vincoli di ingombro;
- necessità di una misura senza usura.

Non è però una soluzione priva di geometria. Distanza, centraggio, inclinazione del magnete e campi esterni influenzano il risultato. Il sensore può avere una risoluzione nominale elevata e restituire comunque un angolo poco accurato se il montaggio è sbagliato.

### Encoder induttivi e capacitivi

Gli encoder induttivi osservano variazioni di accoppiamento elettromagnetico tra piste o avvolgimenti. Quelli capacitivi misurano invece variazioni di capacità prodotte dal movimento relativo di elettrodi.

Entrambe le tecnologie possono realizzare sensori senza contatto e produrre un'uscita incrementale oppure assoluta.

| Tecnologia | Vantaggio tipico | Limite da considerare |
| --- | --- | --- |
| Meccanica | economica e semplice | bounce, usura e velocità limitata |
| Ottica | alta risoluzione e velocità | contaminazione e allineamento |
| Magnetica | compatta e senza contatto | magnete, centraggio e campi esterni |
| Induttiva | robusta in ambienti difficili | geometria ed elettronica più complesse |
| Capacitiva | integrabile e a basso consumo | sensibilità alla geometria e all'ambiente |

La tabella serve per orientarsi, non per scegliere un componente. Due encoder basati sulla stessa tecnologia possono avere prestazioni completamente diverse.

## Come funziona la quadratura

Un encoder incrementale in quadratura produce due segnali periodici, A e B, sfasati nominalmente di 90 gradi elettrici, cioè di un quarto di ciclo. ([US Digital][2])

La seconda fase permette di determinare la direzione. Con un solo canale possiamo sapere che l'albero si è mosso, ma non se stia avanzando o tornando indietro.

Una sequenza valida può essere:

```text
00 -> 01 -> 11 -> 10 -> 00
```

Nella direzione opposta la sequenza viene attraversata al contrario:

```text
00 -> 10 -> 11 -> 01 -> 00
```

L'associazione tra sequenza, rotazione oraria e segno del contatore dipende dal cablaggio, dal punto da cui si osserva l'albero e dalla configurazione del decoder. Scambiare A e B inverte normalmente il verso.

![Ciclo degli stati di quadratura 00, 01, 11 e 10 con incremento e decremento](/blog/images/rotary_encoders_esp32_esp_idf_pcnt/quadrature_state_cycle.svg)

*Le frecce continue percorrono il ciclo positivo, quelle tratteggiate lo attraversano al contrario. Ogni transizione valida cambia un solo bit.*

### Quadratura come codice ciclico

Tra due stati validi consecutivi cambia un solo bit. Da `00` si passa a `01` oppure a `10`, ma non direttamente a `11`.

Una transizione come:

```text
00 -> 11
```

è quindi sospetta. Può indicare:

- un fronte perso;
- un campionamento troppo lento;
- un disturbo elettrico;
- un rimbalzo non gestito;
- una lettura non atomica dei due segnali.

Un decoder software robusto non dovrebbe interpretare qualsiasi cambiamento come un passo valido.

### Una tabella delle transizioni

Lo stato precedente e quello corrente possono essere usati come indice di una tabella:

| Stato precedente | Stato corrente | Risultato |
| --- | --- | ---: |
| `00` | `01` | `+1` |
| `01` | `11` | `+1` |
| `11` | `10` | `+1` |
| `10` | `00` | `+1` |
| `00` | `10` | `-1` |
| `10` | `11` | `-1` |
| `11` | `01` | `-1` |
| `01` | `00` | `-1` |
| stesso stato | stesso stato | `0` |
| salto non adiacente | qualsiasi | errore oppure `0` |

Il segno può essere invertito senza cambiare il principio.

Questa macchina a stati è particolarmente utile per le manopole meccaniche, perché separa la validità della sequenza dalla semplice presenza di un fronte.

### Cosa accade durante una rotazione completa

Rappresentare la quadratura come una semplice coppia di onde quadre è corretto, ma rischia di nascondere il comportamento che interessa davvero al firmware.

Supponiamo che `A` sia il bit più significativo e `B` quello meno significativo. Durante una rotazione nella direzione che abbiamo scelto come positiva possiamo osservare:

```text
tempo       t0   t1   t2   t3   t4
A            0    0    1    1    0
B            0    1    1    0    0
stato AB    00   01   11   10   00
delta        -   +1   +1   +1   +1
conteggio    0    1    2    3    4
```

La rotazione opposta attraversa gli stessi stati al contrario:

```text
tempo       t0   t1   t2   t3   t4
A            0    1    1    0    0
B            0    0    1    1    0
stato AB    00   10   11   01   00
delta        -   -1   -1   -1   -1
conteggio    0   -1   -2   -3   -4
```

In decodifica x4 ogni riga successiva rappresenta un conteggio. In x1, invece, potremmo decidere di aggiornare la posizione soltanto quando il ciclo ritorna a `00`.

Questa differenza spiega perché lo stesso encoder possa essere descritto con numeri apparentemente incompatibili. Il componente fisico non è cambiato: è cambiata la politica con cui il firmware interpreta i fronti.

### Transizioni invalide e fronti persi

Se il firmware osserva:

```text
00 -> 11
```

non può sapere quale dei due percorsi sia avvenuto realmente:

```text
00 -> 01 -> 11
```

oppure:

```text
00 -> 10 -> 11
```

Il primo percorso vale `+2`, il secondo `-2`.

La transizione diretta contiene quindi meno informazione di quella necessaria per ricostruire la direzione. Un decoder serio dovrebbe registrarla come anomala, riallinearsi allo stato corrente e continuare. Inventare un verso significa nascondere un fronte perso.

Gli stati invalidi sono precisamente quelli in cui cambiano entrambi i bit:

```text
00 <-> 11
01 <-> 10
```

Possiamo riconoscerli con uno XOR:

```c
bool invalid = (previous_state ^ current_state) == 0x03;
```

Questo controllo non elimina ogni errore. Un disturbo può produrre una sequenza composta soltanto da transizioni formalmente valide. Tuttavia fornisce un contatore diagnostico molto utile: se le transizioni invalide aumentano durante il funzionamento, il problema non dovrebbe essere ignorato.

### Un decoder software riutilizzabile

La logica fondamentale può essere isolata dal metodo usato per acquisire i GPIO. In questo modo possiamo usare lo stesso decoder con polling, interrupt o timer periodico.

```c
#include <stdbool.h>
#include <stdint.h>

typedef struct {
  int32_t count;
  uint32_t invalid_transitions;
  uint8_t previous_state;
} quadrature_decoder_t;

/*
 * Indice: (previous_state << 2) | current_state
 *
 * La sequenza positiva scelta è:
 * 00 -> 01 -> 11 -> 10 -> 00
 */
static int8_t const quadrature_transition_table[16] = {
  0,
  +1,
  -1,
  0,
  -1,
  0,
  0,
  +1,
  +1,
  0,
  0,
  -1,
  0,
  -1,
  +1,
  0,
};

static void quadrature_decoder_init(quadrature_decoder_t* decoder, uint8_t initial_state) {
  decoder->count = 0;
  decoder->invalid_transitions = 0;
  decoder->previous_state = initial_state & 0x03;
}

static int8_t quadrature_decoder_update(quadrature_decoder_t* decoder, uint8_t current_state) {
  current_state &= 0x03;

  uint8_t const previous_state = decoder->previous_state;

  if ((previous_state ^ current_state) == 0x03) {
    decoder->invalid_transitions++;
    decoder->previous_state = current_state;
    return 0;
  }

  uint8_t const table_index = (previous_state << 2) | current_state;

  int8_t const delta = quadrature_transition_table[table_index];

  decoder->count += delta;
  decoder->previous_state = current_state;

  return delta;
}
```

La tabella contiene sedici combinazioni perché ogni stato precedente può essere seguito da quattro stati correnti.

Il decoder restituisce:

- `+1` per una transizione valida nella direzione positiva;
- `-1` per una transizione valida nella direzione negativa;
- `0` quando lo stato non cambia o quando la transizione è invalida.

Ho scelto di riallineare `previous_state` anche dopo un salto invalido. Il firmware non recupera i conteggi perduti, ma evita di restare ancorato a uno stato ormai vecchio.

### Cosa filtra davvero la macchina a stati

Consideriamo un contatto che rimbalza tra due stati adiacenti:

```text
00 -> 01 -> 00 -> 01 -> 00
```

Il decoder produce:

```text
+1 -> -1 -> +1 -> -1
```

Il risultato netto è zero. Questo è uno dei motivi per cui una macchina a stati è più robusta di un semplice incremento su ogni interrupt.

Non significa però che il bounce sia risolto in ogni situazione. Una sequenza disturbata può completare un intero ciclo valido e produrre comunque un conteggio. Inoltre alcuni encoder si fermano con il detent in `00`, altri in `11` o in stati intermedi.

Per una manopola utente conviene quindi combinare più livelli:

1. validazione delle transizioni A/B;
2. accumulo dei conteggi elettrici;
3. generazione dell'evento soltanto al raggiungimento del detent previsto;
4. eventuale limite temporale o filtro applicativo.

La macchina a stati riconosce la grammatica della quadratura. Non conosce la meccanica del componente.

### Full-step e half-step nelle manopole

Nelle librerie dedicate alle manopole, i termini *full-step* e *half-step* vengono spesso usati per descrivere quando emettere un evento logico.

Un decoder full-step può attendere il completamento dell'intero ciclo:

```text
00 -> 01 -> 11 -> 10 -> 00
                         ^ evento
```

Un decoder half-step può emettere anche nello stato opposto:

```text
00 -> 01 -> 11
          ^ evento

11 -> 10 -> 00
          ^ evento
```

Questa scelta è collegata alla geometria del detent, ma non coincide automaticamente con x1, x2 o x4.

- x1/x2/x4 descrivono quanti fronti elettrici contribuiscono al conteggio;
- full-step/half-step descrivono quando la logica applicativa considera completato un passo.

Un encoder può essere acquisito in x4 e poi convertito in full-step accumulando quattro conteggi. Questa separazione permette di mantenere tutta l'informazione disponibile senza obbligare la UI a reagire a ogni fronte.

## Conteggio x1, x2 e x4

La stessa coppia A/B può produrre numeri di conteggi diversi in base ai fronti osservati.

### Decodifica x1

Si conta un solo fronte di un solo canale, ad esempio il fronte di salita di A.

È l'approccio più semplice e produce un conteggio per ogni ciclo completo della quadratura.

Se leggiamo B nel momento in cui A sale, possiamo ricavare la direzione:

```c
/* Convenzione coerente con 00 -> 01 -> 11 -> 10. */
static int8_t decode_x1_on_a_rising(void) {
  return gpio_get_level(ENCODER_GPIO_B) ? +1 : -1;
}
```

Collegando soltanto A possiamo ancora contare impulsi e stimare una frequenza, ma perdiamo l'informazione sulla direzione. Il singolo canale è quindi sufficiente per un tachimetro unidirezionale, non per una posizione che può avanzare e retrocedere.

### Decodifica x2

Si contano entrambi i fronti di un canale:

- salita di A;
- discesa di A.

La risoluzione raddoppia rispetto a x1.

Con la convenzione usata nell'articolo, dopo ogni fronte di A la direzione positiva corrisponde ad `A == B`:

```c
static int8_t decode_x2_on_any_a_edge(void) {
  int const a = gpio_get_level(ENCODER_GPIO_A);
  int const b = gpio_get_level(ENCODER_GPIO_B);

  return a == b ? +1 : -1;
}
```

Questa regola è compatta, ma non controlla l'intera sequenza. Se perdiamo un fronte di B, il firmware può aggiornare comunque il conteggio senza accorgersi dell'anomalia.

### Decodifica x4

Si contano entrambi i fronti di entrambi i canali:

- salita di A;
- discesa di A;
- salita di B;
- discesa di B.

La risoluzione teorica diventa quattro volte quella ottenuta osservando un solo fronte per ciclo.

PCNT può realizzare questa decodifica usando due canali incrociati: A viene usato come segnale di fronte e B come controllo del verso; sul secondo canale i ruoli vengono scambiati. È la stessa architettura usata dall'esempio ufficiale `rotary_encoder` di Espressif. ([Espressif: esempio PCNT][9])

### PPR, CPR, impulsi e posizioni

La terminologia commerciale è uno dei punti più facili da interpretare male.

A seconda del produttore:

- `CPR` può significare cicli per rivoluzione;
- `PPR` può indicare impulsi prima o dopo la moltiplicazione in quadratura;
- *positions per revolution* può indicare gli stati x4;
- *steps per revolution* può riferirsi agli scatti meccanici;
- i detent possono non coincidere con un ciclo elettrico completo.

Non basta dunque leggere «600 PPR» e moltiplicare automaticamente per quattro.

Bisogna verificare nel datasheet:

1. quanti cicli produce ogni canale;
2. se il valore dichiarato include la decodifica x4;
3. quanti fronti verranno contati dal firmware;
4. se esiste un riduttore o un rapporto meccanico;
5. quanti stati elettrici corrispondono a un detent.

Per comodità, nel resto dell'articolo userò l'espressione *conteggi per giro* per indicare il valore effettivamente osservato dal software dopo la decodifica scelta.

### Conversione in angolo

Conoscendo i conteggi effettivi per giro possiamo calcolare l'angolo nel singolo giro:

```text
angolo = conteggio_modulo_giro * 360 / conteggi_per_giro
```

Con 4096 conteggi per giro:

```text
risoluzione_nominale = 360 / 4096
                       = 0,087890625 gradi per conteggio
```

Per mantenere una posizione multi-giro conviene conservare il contatore esteso e calcolare separatamente:

```text
giri_completi = conteggio / conteggi_per_giro
angolo_nel_giro = conteggio mod conteggi_per_giro
```

In C bisogna prestare attenzione ai valori negativi. L'operatore `%` restituisce un resto, non sempre il modulo matematico positivo che ci si aspetta.

Una funzione utile può essere:

```c
static int positive_modulo(int value, int modulo) {
  int result = value % modulo;
  return result < 0 ? result + modulo : result;
}
```

## Risoluzione, accuratezza e ripetibilità

Questi termini vengono spesso usati come sinonimi. Non lo sono.

### Risoluzione

La risoluzione è il più piccolo incremento rappresentabile dall'uscita.

Un sistema con 4096 conteggi per giro può distinguere nominalmente passi di circa 0,088 gradi. Questo non significa che conosca l'angolo reale con un errore massimo di 0,088 gradi.

### Accuratezza

L'accuratezza descrive quanto la posizione indicata sia vicina a quella reale.

Può essere limitata da:

- eccentricità;
- non linearità del sensore;
- errore della scala;
- disallineamento;
- magnete non centrato;
- gioco meccanico;
- temperatura;
- deformazioni strutturali;
- errore d'interpolazione.

### Ripetibilità

La ripetibilità indica la capacità di restituire lo stesso valore quando l'asse torna nella stessa posizione.

Un sistema può essere molto ripetibile e poco accurato: torna sempre allo stesso valore, ma quel valore è spostato rispetto alla posizione reale.

Renishaw distingue esplicitamente le tre grandezze: la risoluzione è il più piccolo passo d'uscita, l'accuratezza misura la vicinanza al valore reale e la ripetibilità indica la capacità di riportare la stessa posizione nei ritorni successivi. ([Renishaw: FAQ][4])

### La risoluzione del sensore non è quella dell'asse

Tra encoder e carico possono esserci:

- giunti;
- cinghie;
- pulegge;
- riduttori;
- ruote dentate;
- flessioni;
- backlash;
- vibrazioni.

Il progetto non dovrebbe quindi partire dalla domanda «quanti bit ha il sensore?», ma da una più concreta:

> Quale errore massimo posso accettare sulla parte meccanica che mi interessa davvero?

## Uscite elettriche degli encoder

Due encoder che producono la stessa quadratura possono richiedere circuiti di interfaccia completamente diversi.

### Contatti verso comune

Le manopole meccaniche hanno spesso tre terminali:

```text
A
C, comune
B
```

Il comune viene collegato a massa, mentre A e B vengono mantenuti alti tramite pull-up. Quando il contatto si chiude, la linea viene portata a livello basso.

I pull-up interni dell'ESP32 sono comodi per un prototipo. In un prodotto, resistenze esterne permettono di controllare meglio:

- corrente nei contatti;
- impedenza della linea;
- tempo di salita;
- immunità ai disturbi;
- interazione con eventuali condensatori.

Valori come 4,7 kΩ o 10 kΩ sono punti di partenza comuni, non una regola. Il dimensionamento dipende dal circuito e dalla frequenza massima.

### Uscita push-pull

Un'uscita push-pull pilota attivamente sia il livello alto sia quello basso.

I fronti sono in genere più rapidi rispetto a un open collector con pull-up elevato, ma la tensione di uscita deve essere compatibile con il GPIO del microcontrollore.

### Uscita open collector

Un'uscita open collector porta attivamente la linea verso massa e richiede un pull-up esterno per ottenere il livello alto.

In alcuni casi il pull-up può essere collegato a 3,3 V anche quando l'encoder è alimentato a una tensione superiore. Tuttavia questa possibilità deve essere confermata dal datasheet: bisogna verificare tensioni massime, correnti, leakage e circuiti interni.

### Line driver differenziale

Gli encoder industriali possono fornire coppie complementari:

```text
A  /A
B  /B
Z  /Z
```

Il ricevitore misura la differenza tra i due conduttori. Un disturbo accoppiato in modo simile sulla coppia viene quindi in gran parte rifiutato.

Le uscite line driver sono adatte a cavi lunghi e frequenze elevate, ma richiedono un ricevitore appropriato, spesso compatibile con RS-422. Omron, ad esempio, descrive le proprie uscite line driver come compatibili con RS-422A e destinate alla trasmissione su doppino intrecciato. ([Omron][5])

Non è equivalente collegare A e `/A` a due GPIO e sottrarre i livelli via software.

### Livelli a 5, 12 o 24 V

Molti encoder industriali lavorano con tensioni superiori a 3,3 V.

I GPIO degli ESP non devono essere considerati ingressi 5 V tolerant. La FAQ hardware di Espressif indica una tolleranza di 3,6 V e raccomanda un adattamento quando la tensione supera questo valore. ([Espressif: GPIO][6])

A seconda dell'interfaccia possono servire:

- un partitore resistivo;
- un transistor;
- un buffer Schmitt;
- un comparatore;
- un level shifter;
- un ricevitore RS-422;
- un optoisolatore;
- un isolatore digitale.

La scelta dipende da frequenza, lunghezza del cavo, massa comune, tensione e requisiti di isolamento.

## Rimbalzo, rumore e filtraggio

Rimbalzo meccanico e rumore elettrico non sono lo stesso problema.

### Rimbalzo meccanico

Quando un contatto si chiude, il passaggio non è istantaneo. Il segnale può oscillare prima di stabilizzarsi:

```text
0 -> 1 -> 0 -> 1 -> 0 -> 1
```

Un decoder che conta ogni fronte interpreta questa sequenza come più movimenti.

### Rumore elettrico

Il rumore può essere generato da:

- motori;
- PWM;
- relè;
- alimentatori switching;
- cavi lunghi;
- masse condivise male;
- scariche elettrostatiche;
- accoppiamento capacitivo o induttivo;
- radio Wi-Fi e Bluetooth in un layout poco curato.

Può produrre impulsi brevi o spostare il segnale attorno alla soglia logica.

### Filtro RC

Un filtro RC attenua le variazioni rapide, ma rallenta i fronti.

Se la costante di tempo è troppo elevata:

- si riduce la frequenza massima;
- si altera la relazione temporale tra A e B;
- si perdono transizioni valide;
- l'ingresso attraversa lentamente la soglia;
- le inversioni rapide diventano ambigue.

Un condensatore più grande non rende automaticamente il segnale migliore.

Il filtro va dimensionato partendo dalla durata minima dell'impulso valido e verificato sul circuito reale. Quando i fronti diventano lenti può essere opportuno aggiungere un buffer con isteresi di Schmitt.

### Debounce temporale software

Un approccio semplice consiste nell'ignorare ogni transizione ricevuta entro un intervallo fisso.

Può funzionare per una manopola lenta, ma non distingue un rimbalzo da un movimento reale veloce. Una finestra troppo lunga elimina passi validi; una troppo corta lascia passare il bounce.

### Decoder a stati

Per gli encoder meccanici è spesso preferibile validare l'intera sequenza A/B.

Il firmware può accumulare le transizioni ammesse e generare un evento applicativo soltanto dopo il completamento di un ciclo o il raggiungimento di un detent.

Questo separa tre concetti che spesso vengono confusi:

- fronte elettrico;
- conteggio in quadratura;
- passo percepito dall'utente.

## Come leggere un encoder con ESP-IDF

Non esiste un unico modo corretto di leggere un encoder. La scelta dipende dalla frequenza dei fronti, dalla precisione richiesta, dalla periferica disponibile e dal tipo di informazione che vogliamo ottenere.

| Metodo | Informazione principale | Vantaggio | Limite |
| --- | --- | --- | --- |
| Polling in un task | posizione e direzione | semplice da osservare e debuggare | jitter e fronti persi |
| Interrupt GPIO | posizione e direzione | nessun lavoro quando il segnale è fermo | carico ISR e possibili salti di stato |
| GPTimer + macchina a stati | posizione e direzione | campionamento periodico deterministico | interrupt continuo anche a encoder fermo |
| PCNT | posizione e direzione | conteggio hardware x4 | periferica non presente su tutti i target |
| MCPWM Capture | periodo e velocità | timestamp hardware dei fronti | non è un decoder di posizione completo |
| SPI, SSI o BiSS | posizione assoluta | angolo disponibile all'avvio | protocollo e campionamento seriale |
| PWM assoluto | posizione nel giro | un solo segnale | misura del duty cycle e latenza |
| Ricevitore RS-422 + PCNT | quadratura industriale | robustezza su cavi lunghi | hardware aggiuntivo |

![Percorso decisionale tra PCNT, decoder software, MCPWM Capture e interfacce assolute](/blog/images/rotary_encoders_esp32_esp_idf_pcnt/acquisition_decision.svg)

*La periferica si sceglie partendo dal segnale disponibile, dalla frequenza massima e dall'informazione richiesta, non dalla comodità dell'API.*

Prima del codice conviene calcolare la frequenza massima degli eventi.

Se `counts_per_revolution` rappresenta i conteggi effettivi dopo la moltiplicazione scelta, la frequenza dei conteggi è:

```text
f_count = counts_per_revolution * RPM / 60
```

Un encoder da 600 periodi per giro letto in x4 produce 2400 conteggi per giro. A 3000 RPM otteniamo:

```text
f_count = 2400 * 3000 / 60
        = 120000 conteggi al secondo
```

Centoventimila eventi al secondo rendono poco sensato un task che legge i GPIO ogni millisecondo. Per una manopola da interfaccia, invece, la frequenza può essere inferiore di diversi ordini di grandezza.

### Leggere lo stato dei due GPIO

Negli esempi software useremo una funzione comune:

```c
#include "driver/gpio.h"

#define ENCODER_GPIO_A GPIO_NUM_18
#define ENCODER_GPIO_B GPIO_NUM_19

static inline uint8_t encoder_read_gpio_state(void) {
  uint8_t const a = (uint8_t)gpio_get_level(ENCODER_GPIO_A);
  uint8_t const b = (uint8_t)gpio_get_level(ENCODER_GPIO_B);

  return (uint8_t)((a << 1) | b);
}
```

Le due chiamate a `gpio_get_level()` non rappresentano necessariamente una fotografia atomica dei pin. Se A cambia tra la prima e la seconda lettura, il firmware può costruire uno stato che non è mai esistito come coppia stabile.

Per un encoder meccanico lento il rischio è spesso accettabile. Ad alta velocità o con requisiti stretti, questa è un'altra ragione per preferire una periferica hardware come PCNT.

### Configurazione GPIO comune

Per un encoder meccanico con terminale comune collegato a massa possiamo partire da:

```c
static esp_err_t encoder_gpio_init(gpio_int_type_t interrupt_type) {
  gpio_config_t const config = {
    .pin_bit_mask = (1ULL << ENCODER_GPIO_A) | (1ULL << ENCODER_GPIO_B),
    .mode = GPIO_MODE_INPUT,
    .pull_up_en = GPIO_PULLUP_ENABLE,
    .pull_down_en = GPIO_PULLDOWN_DISABLE,
    .intr_type = interrupt_type,
  };

  return gpio_config(&config);
}
```

I pull-up interni sono comodi durante il bring-up. In un prodotto, resistenze esterne permettono di controllare meglio corrente, impedenza e immunità ai disturbi.

### Metodo 1: Polling in un task

Il polling è il metodo più semplice da comprendere. Un task campiona A e B, aggiorna il decoder e inoltra gli incrementi alla logica applicativa.

```c
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#define ENCODER_POLL_PERIOD_MS 1

static quadrature_decoder_t polling_decoder;

static void encoder_polling_task(void* argument) {
  (void)argument;

  quadrature_decoder_init(&polling_decoder, encoder_read_gpio_state());

  TickType_t last_wake_time = xTaskGetTickCount();

  while (true) {
    uint8_t const state = encoder_read_gpio_state();
    int8_t const delta = quadrature_decoder_update(&polling_decoder, state);

    if (delta != 0) {
      process_encoder_delta(delta);
    }

    xTaskDelayUntil(&last_wake_time, pdMS_TO_TICKS(ENCODER_POLL_PERIOD_MS));
  }
}
```

L'inizializzazione può essere ridotta a:

```c
ESP_ERROR_CHECK(encoder_gpio_init(GPIO_INTR_DISABLE));

BaseType_t task_created = xTaskCreate(encoder_polling_task, "encoder_poll", 3072, NULL, 5, NULL);

if (task_created != pdPASS) {
  ESP_LOGE("encoder", "Impossibile creare il task di polling");
}
```

Un periodo di 1 ms equivale nominalmente a 1 kHz. Non significa che possiamo leggere in modo affidabile un segnale da 1 kHz.

Per osservare ogni stato servono più campioni per transizione e bisogna considerare:

- jitter dello scheduler;
- sezioni critiche;
- task con priorità superiore;
- operazioni Flash;
- Wi-Fi e Bluetooth;
- tempo impiegato dal codice eseguito nel task.

Io userei il polling soltanto quando la frequenza massima è molto più bassa della frequenza di campionamento e la perdita occasionale di un passo non rappresenta un problema.

### Metodo 2: Interrupt GPIO su entrambi i canali

Gli interrupt eliminano il campionamento continuo. Il firmware viene eseguito soltanto quando A o B cambiano.

ESP-IDF permette di installare un servizio ISR globale e associare handler distinti ai singoli GPIO tramite `gpio_isr_handler_add()`. La callback rimane comunque in contesto interrupt e dispone di uno stack più piccolo rispetto a un task. ([Espressif: GPIO][14])

Un'implementazione minimale può aggiornare il decoder nella ISR e notificare un task:

```c
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

static portMUX_TYPE encoder_isr_lock = portMUX_INITIALIZER_UNLOCKED;
static quadrature_decoder_t interrupt_decoder;
static TaskHandle_t encoder_consumer_task_handle;

static void encoder_gpio_isr(void* argument) {
  (void)argument;

  uint8_t const state = encoder_read_gpio_state();

  portENTER_CRITICAL_ISR(&encoder_isr_lock);
  int8_t const delta = quadrature_decoder_update(&interrupt_decoder, state);
  portEXIT_CRITICAL_ISR(&encoder_isr_lock);

  if (delta != 0 && encoder_consumer_task_handle != NULL) {
    BaseType_t task_woken = pdFALSE;

    vTaskNotifyGiveFromISR(encoder_consumer_task_handle, &task_woken);

    if (task_woken == pdTRUE) {
      portYIELD_FROM_ISR();
    }
  }
}
```

Il task non deve assumere che ogni notifica corrisponda a un singolo conteggio. Le notifiche possono accumularsi o fondersi. Conviene leggere una fotografia del contatore:

```c
static void encoder_interrupt_consumer_task(void* argument) {
  (void)argument;

  int32_t previous_count = 0;

  while (true) {
    ulTaskNotifyTake(pdTRUE, portMAX_DELAY);

    int32_t current_count;
    uint32_t invalid_transitions;

    portENTER_CRITICAL(&encoder_isr_lock);
    current_count = interrupt_decoder.count;
    invalid_transitions = interrupt_decoder.invalid_transitions;
    portEXIT_CRITICAL(&encoder_isr_lock);

    int32_t const delta = current_count - previous_count;
    previous_count = current_count;

    if (delta != 0) {
      process_encoder_delta(delta);
    }

    if (invalid_transitions != 0) {
      ESP_LOGW("encoder", "Transizioni invalide: %" PRIu32, invalid_transitions);
    }
  }
}
```

L'inizializzazione:

```c
static esp_err_t encoder_gpio_interrupt_init(void) {
  ESP_RETURN_ON_ERROR(
    encoder_gpio_init(GPIO_INTR_ANYEDGE), "encoder", "Impossibile configurare i GPIO"
  );

  quadrature_decoder_init(&interrupt_decoder, encoder_read_gpio_state());

  esp_err_t ret = gpio_install_isr_service(0);

  if (ret != ESP_OK && ret != ESP_ERR_INVALID_STATE) {
    return ret;
  }

  ESP_RETURN_ON_ERROR(
    gpio_isr_handler_add(ENCODER_GPIO_A, encoder_gpio_isr, NULL),
    "encoder",
    "Impossibile registrare la ISR A"
  );

  ESP_RETURN_ON_ERROR(
    gpio_isr_handler_add(ENCODER_GPIO_B, encoder_gpio_isr, NULL),
    "encoder",
    "Impossibile registrare la ISR B"
  );

  return ESP_OK;
}
```

Nel sorgente completo servono anche:

```c
#include <inttypes.h>

#include "esp_check.h"
#include "esp_log.h"
```

Il task consumatore deve essere creato prima di abilitare gli handler, così la ISR dispone già di un destinatario valido:

```c
BaseType_t task_created = xTaskCreate(
  encoder_interrupt_consumer_task, "encoder_consumer", 4096, NULL, 6, &encoder_consumer_task_handle
);

if (task_created != pdPASS) {
  ESP_LOGE("encoder", "Impossibile creare il task consumer");
  return ESP_ERR_NO_MEM;
}

ESP_ERROR_CHECK(encoder_gpio_interrupt_init());
```

Questo approccio funziona bene a frequenze moderate, ma presenta un limite importante. Se due fronti arrivano prima che la ISR riesca a leggere lo stato intermedio, il decoder può osservare un salto invalido.

In altre parole, l'interrupt segnala che qualcosa è cambiato; non garantisce che il firmware riesca a ricostruire ogni fase quando la frequenza cresce.

### Metodo 3: GPTimer e campionamento periodico

Un GPTimer può generare un allarme periodico e campionare i GPIO con una cadenza più deterministica rispetto a un normale task.

La callback del timer viene eseguita in ISR. Deve quindi restare breve e non può contenere operazioni bloccanti. ESP-IDF permette di configurare l'auto-reload dell'allarme per ottenere un evento periodico. ([Espressif: GPTimer][15])

Il seguente esempio campiona a 1 kHz:

```c
#include "driver/gptimer.h"

#define ENCODER_SAMPLE_TIMER_HZ 1000000
#define ENCODER_SAMPLE_PERIOD_US 1000

static gptimer_handle_t encoder_sample_timer;
static portMUX_TYPE encoder_timer_lock = portMUX_INITIALIZER_UNLOCKED;
static quadrature_decoder_t timer_decoder;

static bool encoder_sample_timer_callback(
  gptimer_handle_t timer, gptimer_alarm_event_data_t const* event_data, void* user_context
) {
  (void)timer;
  (void)event_data;
  (void)user_context;

  uint8_t const state = encoder_read_gpio_state();

  portENTER_CRITICAL_ISR(&encoder_timer_lock);
  quadrature_decoder_update(&timer_decoder, state);
  portEXIT_CRITICAL_ISR(&encoder_timer_lock);

  return false;
}

static esp_err_t encoder_sample_timer_init(void) {
  quadrature_decoder_init(&timer_decoder, encoder_read_gpio_state());

  gptimer_config_t const timer_config = {
    .clk_src = GPTIMER_CLK_SRC_DEFAULT,
    .direction = GPTIMER_COUNT_UP,
    .resolution_hz = ENCODER_SAMPLE_TIMER_HZ,
  };

  ESP_RETURN_ON_ERROR(
    gptimer_new_timer(&timer_config, &encoder_sample_timer), "encoder", "Impossibile creare GPTimer"
  );

  gptimer_event_callbacks_t const callbacks = {
    .on_alarm = encoder_sample_timer_callback,
  };

  ESP_RETURN_ON_ERROR(
    gptimer_register_event_callbacks(encoder_sample_timer, &callbacks, NULL),
    "encoder",
    "Impossibile registrare la callback GPTimer"
  );

  gptimer_alarm_config_t const alarm_config = {
    .reload_count = 0,
    .alarm_count = ENCODER_SAMPLE_PERIOD_US,
    .flags.auto_reload_on_alarm = true,
  };

  ESP_RETURN_ON_ERROR(
    gptimer_set_alarm_action(encoder_sample_timer, &alarm_config),
    "encoder",
    "Impossibile configurare l'allarme"
  );

  ESP_RETURN_ON_ERROR(
    gptimer_enable(encoder_sample_timer), "encoder", "Impossibile abilitare GPTimer"
  );

  return gptimer_start(encoder_sample_timer);
}
```

Nel `CMakeLists.txt` va aggiunto:

```cmake
PRIV_REQUIRES esp_driver_gptimer esp_driver_gpio
```

Un task può leggere periodicamente una fotografia del decoder senza eseguire la logica applicativa dentro la callback:

```c
static void encoder_timer_consumer_task(void* argument) {
  (void)argument;

  int32_t previous_count = 0;

  while (true) {
    int32_t current_count;

    portENTER_CRITICAL(&encoder_timer_lock);
    current_count = timer_decoder.count;
    portEXIT_CRITICAL(&encoder_timer_lock);

    int32_t const delta = current_count - previous_count;
    previous_count = current_count;

    if (delta != 0) {
      process_encoder_delta(delta);
    }

    vTaskDelay(pdMS_TO_TICKS(10));
  }
}
```

L'avvio completo può essere organizzato così:

```c
ESP_ERROR_CHECK(encoder_gpio_init(GPIO_INTR_DISABLE));

BaseType_t task_created =
  xTaskCreate(encoder_timer_consumer_task, "encoder_timer_consumer", 3072, NULL, 5, NULL);

if (task_created != pdPASS) {
  ESP_LOGE("encoder", "Impossibile creare il task GPTimer");
  return ESP_ERR_NO_MEM;
}

ESP_ERROR_CHECK(encoder_sample_timer_init());
```

Questa soluzione è interessante per una manopola lenta con bounce perché rende costante il ritmo della macchina a stati. Tuttavia genera interrupt anche quando l'encoder è fermo.

A 1 kHz significa mille callback al secondo per non fare nulla nella maggior parte del tempo. Il costo può essere accettabile in un dispositivo semplice, ma va misurato quando il firmware contiene radio, audio, display o loop di controllo.

### Metodo 4: PCNT come decoder hardware

PCNT significa *Pulse Counter*.

La periferica conta fronti in hardware e può usare un secondo segnale come controllo del verso. Combinando ingresso di fronte e ingresso di livello, una unità PCNT può agire come decoder di quadratura. ([Espressif: PCNT][8])

Il vantaggio non è soltanto ridurre il numero di interrupt. Il conteggio continua mentre la CPU esegue altri task, purché la periferica e il dominio di clock siano operativi.

PCNT permette inoltre di usare:

- filtro hardware per glitch brevi;
- limiti del contatore;
- accumulatore software per estendere il conteggio;
- watch point;
- notifiche a passo costante;
- callback in ISR;
- lettura periodica del valore senza intervenire su ogni fronte.

PCNT non fornisce però un contatore di transizioni A/B semanticamente invalide. Configura azioni su fronti e livelli, ma non ricostruisce una cronologia software completa degli stati. Per diagnosticare cablaggio e rumore rimane utile osservare il segnale con un logic analyzer.

### Metodo 5: MCPWM Capture per misurare il periodo

MCPWM Capture non sostituisce PCNT per la posizione. Il suo punto di forza è registrare in hardware il timestamp di un fronte.

È quindi utile quando vogliamo stimare la velocità a bassa frequenza misurando il periodo tra due impulsi. La periferica espone il valore catturato e il tipo di fronte nella callback, mentre la risoluzione del timer permette di convertire i tick in secondi. ([Espressif: MCPWM][16])

Vedremo un esempio completo nella sezione dedicata al calcolo della velocità.

### Metodo 6: Interfacce assolute e segnali codificati

Un encoder assoluto seriale non deve essere trattato come una quadratura.

A seconda del componente possiamo dover leggere:

- una word SPI con parità e bit di errore;
- un frame SSI o BiSS sincronizzato da clock;
- un duty cycle PWM proporzionale all'angolo;
- una coppia analogica seno/coseno;
- un protocollo industriale proprietario.

In questi casi la logica cambia:

```text
quadratura -> ricostruisco il movimento dai fronti
assoluto   -> campiono una posizione già codificata
```

Il firmware deve rispettare il datasheet del sensore. Non esiste una funzione generica `read_absolute_encoder()` che possa sostituire formato del frame, timing, diagnostica e gestione degli errori.

## PCNT non è presente su ogni ESP32

La famiglia ESP32 non è un singolo microcontrollore. Le periferiche cambiano tra un target e l'altro.

La documentazione del componente `knob` indica PCNT hardware su ESP32, ESP32-S2, ESP32-S3, ESP32-C6 ed ESP32-H2, mentre ESP32-C2 ed ESP32-C3 usano la decodifica software. ([Espressif: Knob][7])

Questa lista non va trattata come eterna o completa. Le famiglie più recenti possono aggiungere altri target. Prima di costruire l'architettura conviene verificare:

1. la pagina *Peripherals API* del target;
2. il datasheet del SoC;
3. la tabella *Supported Targets* dell'esempio PCNT nella versione di ESP-IDF usata.

Se la documentazione del target non contiene la sezione PCNT, includere `driver/pulse_cnt.h` non farà comparire la periferica per magia.

## Il driver PCNT corrente

A partire da ESP-IDF 6.0 il vecchio header `driver/pcnt.h` è stato rimosso. Il driver corrente si trova nel componente `esp_driver_pcnt` e usa l'header `driver/pulse_cnt.h`. ([Espressif: migrazione 6.0][10])

Gli oggetti principali sono:

- `pcnt_unit_handle_t`;
- `pcnt_channel_handle_t`.

L'unità contiene il contatore. I canali stabiliscono come gli ingressi modificano quel contatore.

Per ogni canale possiamo configurare:

- GPIO del segnale di fronte;
- GPIO del segnale di livello;
- azione sul fronte di salita;
- azione sul fronte di discesa;
- comportamento quando il controllo è alto;
- comportamento quando il controllo è basso;
- eventuale inversione degli ingressi.

La logica può essere riassunta così:

```text
sul fronte di salita incrementa
sul fronte di discesa decrementa
quando il secondo segnale cambia livello, conserva o inverte il verso
```

Con due canali incrociati, sia A sia B contribuiscono al conteggio x4.

![Due canali PCNT incrociati usano alternativamente A e B come ingresso edge e level](/blog/images/rotary_encoders_esp32_esp_idf_pcnt/pcnt_crossed_channels.svg)

*Ogni segnale pilota i fronti di un canale e controlla il verso dell'altro. Le due azioni confluiscono nella stessa unità PCNT.*

## Configurare PCNT per un encoder in quadratura

Passiamo dunque al codice.

L'esempio seguente è pensato per le API handle-based di ESP-IDF 6.0.x. Configura due canali incrociati, abilita il conteggio esteso oltre i limiti del registro hardware e applica un filtro per i glitch molto brevi.

È doveroso specificare una cosa: il valore del filtro e i GPIO sono soltanto esempi. Non vanno copiati senza verificare il segnale reale e le caratteristiche del target.

```c
#include <stddef.h>

#include "driver/gpio.h"
#include "driver/pulse_cnt.h"
#include "esp_check.h"
#include "esp_err.h"
#include "esp_log.h"

#define ENCODER_GPIO_A GPIO_NUM_18
#define ENCODER_GPIO_B GPIO_NUM_19

#define ENCODER_PCNT_LOW_LIMIT -30000
#define ENCODER_PCNT_HIGH_LIMIT 30000

static char const* TAG = "encoder";

static pcnt_unit_handle_t encoder_unit;
static pcnt_channel_handle_t encoder_channel_a;
static pcnt_channel_handle_t encoder_channel_b;

esp_err_t encoder_init(void) {
  esp_err_t ret;

  pcnt_unit_config_t unit_config = {
    .low_limit = ENCODER_PCNT_LOW_LIMIT,
    .high_limit = ENCODER_PCNT_HIGH_LIMIT,
    .flags.accum_count = true,
  };

  ESP_RETURN_ON_ERROR(
    pcnt_new_unit(&unit_config, &encoder_unit), TAG, "Impossibile creare l'unita PCNT"
  );

  /*
   * Il filtro elimina soltanto impulsi più brevi della soglia.
   * Non sostituisce il debounce di un encoder meccanico.
   */
  pcnt_glitch_filter_config_t const filter_config = {
    .max_glitch_ns = 1000,
  };

  ESP_GOTO_ON_ERROR(
    pcnt_unit_set_glitch_filter(encoder_unit, &filter_config),
    error_delete_unit,
    TAG,
    "Impossibile configurare il filtro PCNT"
  );

  /*
   * Questa configurazione presuppone contatti verso massa.
   * In un prodotto reale sono spesso preferibili pull-up esterni.
   */
  ESP_GOTO_ON_ERROR(
    gpio_pullup_en(ENCODER_GPIO_A),
    error_delete_unit,
    TAG,
    "Impossibile abilitare il pull-up sul canale A"
  );

  ESP_GOTO_ON_ERROR(
    gpio_pullup_en(ENCODER_GPIO_B),
    error_delete_unit,
    TAG,
    "Impossibile abilitare il pull-up sul canale B"
  );

  pcnt_chan_config_t const channel_a_config = {
    .edge_gpio_num = ENCODER_GPIO_A,
    .level_gpio_num = ENCODER_GPIO_B,
  };

  ESP_GOTO_ON_ERROR(
    pcnt_new_channel(encoder_unit, &channel_a_config, &encoder_channel_a),
    error_delete_unit,
    TAG,
    "Impossibile creare il canale A"
  );

  pcnt_chan_config_t const channel_b_config = {
    .edge_gpio_num = ENCODER_GPIO_B,
    .level_gpio_num = ENCODER_GPIO_A,
  };

  ESP_GOTO_ON_ERROR(
    pcnt_new_channel(encoder_unit, &channel_b_config, &encoder_channel_b),
    error_delete_channel_a,
    TAG,
    "Impossibile creare il canale B"
  );

  /*
   * Le azioni seguono il decoder dell'esempio rotary_encoder
   * ufficiale di Espressif.
   */
  ESP_GOTO_ON_ERROR(
    pcnt_channel_set_edge_action(
      encoder_channel_a, PCNT_CHANNEL_EDGE_ACTION_DECREASE, PCNT_CHANNEL_EDGE_ACTION_INCREASE
    ),
    error_delete_channels,
    TAG,
    "Impossibile configurare i fronti del canale A"
  );

  ESP_GOTO_ON_ERROR(
    pcnt_channel_set_level_action(
      encoder_channel_a, PCNT_CHANNEL_LEVEL_ACTION_KEEP, PCNT_CHANNEL_LEVEL_ACTION_INVERSE
    ),
    error_delete_channels,
    TAG,
    "Impossibile configurare il livello del canale A"
  );

  ESP_GOTO_ON_ERROR(
    pcnt_channel_set_edge_action(
      encoder_channel_b, PCNT_CHANNEL_EDGE_ACTION_INCREASE, PCNT_CHANNEL_EDGE_ACTION_DECREASE
    ),
    error_delete_channels,
    TAG,
    "Impossibile configurare i fronti del canale B"
  );

  ESP_GOTO_ON_ERROR(
    pcnt_channel_set_level_action(
      encoder_channel_b, PCNT_CHANNEL_LEVEL_ACTION_KEEP, PCNT_CHANNEL_LEVEL_ACTION_INVERSE
    ),
    error_delete_channels,
    TAG,
    "Impossibile configurare il livello del canale B"
  );

  /*
   * Con accum_count attivo, i limiti vanno aggiunti come watch point
   * affinché il driver possa compensare gli overflow hardware.
   */
  ESP_GOTO_ON_ERROR(
    pcnt_unit_add_watch_point(encoder_unit, ENCODER_PCNT_LOW_LIMIT),
    error_delete_channels,
    TAG,
    "Impossibile aggiungere il limite inferiore"
  );

  ESP_GOTO_ON_ERROR(
    pcnt_unit_add_watch_point(encoder_unit, ENCODER_PCNT_HIGH_LIMIT),
    error_remove_low_watch_point,
    TAG,
    "Impossibile aggiungere il limite superiore"
  );

  ESP_GOTO_ON_ERROR(
    pcnt_unit_enable(encoder_unit), error_remove_watch_points, TAG, "Impossibile abilitare PCNT"
  );

  /*
   * Il clear applica i watch point appena aggiunti e azzera
   * contatore hardware e accumulatore software.
   */
  ESP_GOTO_ON_ERROR(
    pcnt_unit_clear_count(encoder_unit), error_disable_unit, TAG, "Impossibile azzerare PCNT"
  );

  ESP_GOTO_ON_ERROR(
    pcnt_unit_start(encoder_unit), error_disable_unit, TAG, "Impossibile avviare PCNT"
  );

  return ESP_OK;

error_disable_unit:
  pcnt_unit_disable(encoder_unit);

error_remove_watch_points:
  pcnt_unit_remove_watch_point(encoder_unit, ENCODER_PCNT_HIGH_LIMIT);

error_remove_low_watch_point:
  pcnt_unit_remove_watch_point(encoder_unit, ENCODER_PCNT_LOW_LIMIT);

error_delete_channels:
  pcnt_del_channel(encoder_channel_b);
  encoder_channel_b = NULL;

error_delete_channel_a:
  pcnt_del_channel(encoder_channel_a);
  encoder_channel_a = NULL;

error_delete_unit:
  pcnt_del_unit(encoder_unit);
  encoder_unit = NULL;

  return ret;
}

esp_err_t encoder_get_count(int* count) {
  if (count == NULL || encoder_unit == NULL) {
    return ESP_ERR_INVALID_ARG;
  }

  return pcnt_unit_get_count(encoder_unit, count);
}

esp_err_t encoder_reset(void) {
  if (encoder_unit == NULL) {
    return ESP_ERR_INVALID_STATE;
  }

  return pcnt_unit_clear_count(encoder_unit);
}

esp_err_t encoder_deinit(void) {
  if (encoder_unit == NULL) {
    return ESP_OK;
  }

  ESP_RETURN_ON_ERROR(pcnt_unit_stop(encoder_unit), TAG, "Impossibile arrestare PCNT");

  ESP_RETURN_ON_ERROR(pcnt_unit_disable(encoder_unit), TAG, "Impossibile disabilitare PCNT");

  ESP_RETURN_ON_ERROR(
    pcnt_del_channel(encoder_channel_b), TAG, "Impossibile eliminare il canale B"
  );

  ESP_RETURN_ON_ERROR(
    pcnt_del_channel(encoder_channel_a), TAG, "Impossibile eliminare il canale A"
  );

  ESP_RETURN_ON_ERROR(pcnt_del_unit(encoder_unit), TAG, "Impossibile eliminare l'unita PCNT");

  encoder_channel_b = NULL;
  encoder_channel_a = NULL;
  encoder_unit = NULL;

  return ESP_OK;
}
```

La configurazione delle azioni riprende l'esempio `rotary_encoder` ufficiale. In particolare, un canale usa A come ingresso di fronte e B come controllo, mentre l'altro fa l'opposto. ([Espressif: esempio PCNT][9])

Il verso risultante può non coincidere con quello desiderato dall'applicazione. Non si tratta necessariamente di un errore.

Possiamo:

- scambiare A e B;
- invertire il segno a livello applicativo;
- usare i flag di inversione degli ingressi;
- modificare le azioni associate ai fronti.

Io preferisco mantenere il driver coerente con il cablaggio e convertire il segno soltanto una volta, nel livello che attribuisce al movimento un significato applicativo.

Nel `CMakeLists.txt` del componente vanno dichiarate le dipendenze corrette:

```cmake
idf_component_register(
    SRCS "encoder.c"
    INCLUDE_DIRS "."
    PRIV_REQUIRES esp_driver_pcnt esp_driver_gpio
)
```

La documentazione corrente associa il driver all'header `driver/pulse_cnt.h` e al componente `esp_driver_pcnt`. ([Espressif: PCNT][8])

### Una nota sulla gestione degli errori

Il codice precedente include un percorso di pulizia perché le periferiche possono esaurirsi e ogni chiamata può fallire.

Per un esempio didattico sarebbe stato più breve usare `ESP_ERROR_CHECK()`. Tuttavia, dentro un componente riutilizzabile, riavviare l'intero firmware perché una risorsa non è disponibile non è sempre il comportamento desiderato.

La scelta dipende dal progetto:

- durante il bring-up, `ESP_ERROR_CHECK()` rende immediato individuare il problema;
- in un prodotto, può essere preferibile restituire l'errore e lasciare al livello superiore la decisione;
- se l'encoder è indispensabile per la sicurezza, l'errore di inizializzazione deve portare il sistema in uno stato noto.

## Limiti del contatore e posizione estesa

Il registro hardware di PCNT non è infinito.

Nel caso dell'ESP32, il contatore hardware è signed a 16 bit. Inoltre i limiti alto e basso configurati non sono semplici soglie informative: quando vengono raggiunti, il contatore hardware torna a zero. ([Espressif: PCNT][8])

Se ci limitassimo a leggere il registro, una posizione crescente potrebbe quindi comportarsi così:

```text
29998
29999
30000
0
1
2
```

Per una manopola che regola un valore compreso tra 0 e 100 potrebbe non essere un problema. Per un asse multi-giro, invece, il salto renderebbe la posizione inutilizzabile.

Il flag:

```c
.flags.accum_count = true
```

chiede al driver di compensare gli overflow in software. La configurazione non è però completa finché i limiti alto e basso non vengono aggiunti come watch point. ([Espressif: PCNT][8])

La sequenza corretta è dunque:

1. configurare limiti sufficientemente ampi;
2. abilitare `accum_count`;
3. aggiungere entrambi i limiti come watch point;
4. abilitare l'unità;
5. chiamare `pcnt_unit_clear_count()`;
6. avviare il conteggio.

`pcnt_unit_get_count()` restituirà a quel punto la somma tra contatore hardware e accumulatore software.

Tenete presente che ogni overflow richiede comunque la gestione di un evento interno. Limiti troppo stretti aumentano inutilmente la frequenza degli interrupt. Espressif consiglia di mantenerli sufficientemente ampi da ridurre il rischio che più overflow avvengano prima di essere elaborati. ([Espressif: PCNT][8])

Infine, `pcnt_unit_clear_count()` azzera sia la parte hardware sia l'accumulatore. Non va quindi chiamato come semplice operazione di sincronizzazione se la posizione estesa deve essere conservata.

## Il glitch filter non è un debounce

Il filtro PCNT ignora gli impulsi più brevi del valore indicato in `max_glitch_ns`:

```text
larghezza impulso < max_glitch_ns -> impulso ignorato
larghezza impulso >= max_glitch_ns -> impulso osservabile
```

Questo meccanismo è utile contro disturbi elettrici molto brevi. Non conosce però la quadratura e non sa nulla della meccanica dell'encoder.

Un rimbalzo da 500 µs è enormemente più lungo di un filtro impostato a 1000 ns. Dal punto di vista della periferica, è dunque un fronte perfettamente valido.

La domanda corretta non è:

> Quanto posso alzare il filtro finché il bounce sparisce?

È piuttosto:

> Qual è l'impulso valido più breve alla massima velocità prevista, e quale margine posso lasciare rispetto ai glitch reali?

Supponiamo che il segnale raggiunga una frequenza massima `f` e abbia un duty cycle vicino al 50%. Il periodo vale:

```text
T = 1 / f
```

La durata nominale di ogni semiperiodo sarà circa:

```text
T_high ≈ T_low ≈ T / 2
```

La soglia del filtro deve restare sensibilmente inferiore al semiperiodo minimo. Altrimenti comincerà a cancellare informazioni reali.

Il filtro usa il clock APB. Quando il Dynamic Frequency Scaling è attivo, il driver acquisisce un power-management lock mentre l'unità è abilitata, in modo da mantenere stabile la temporizzazione richiesta. ([Espressif: PCNT][8])

Questo dettaglio è facile da ignorare, ma incide sul consumo. Un filtro apparentemente innocuo può impedire al clock APB di scendere alla frequenza minima mentre PCNT è attivo.

## Watch point e callback

I watch point permettono di generare un evento quando il conteggio raggiunge un valore specifico.

Possono essere utili per:

- notificare lo zero;
- rilevare un limite software;
- aggiornare un task ogni certo numero di conteggi;
- compensare gli overflow;
- individuare una posizione di interesse.

Le risorse sono limitate. Non conviene quindi creare un watch point per ogni posizione possibile.

Dopo aver aggiunto un nuovo watch point, la documentazione richiede una chiamata a `pcnt_unit_clear_count()` affinché la configurazione diventi immediatamente effettiva. ([Espressif: PCNT][8])

La callback `on_reach` viene eseguita in contesto ISR. Questo significa che non deve:

- bloccare;
- allocare memoria;
- eseguire log pesanti;
- accedere a periferiche lente;
- chiamare API FreeRTOS prive del suffisso `FromISR`.

Una callback minimale può inviare il valore a una queue:

```c
#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"

static bool encoder_on_reach(
  pcnt_unit_handle_t unit, pcnt_watch_event_data_t const* event, void* user_context
) {
  (void)unit;

  QueueHandle_t queue = (QueueHandle_t)user_context;
  BaseType_t higher_priority_task_woken = pdFALSE;

  xQueueSendFromISR(queue, &event->watch_point_value, &higher_priority_task_woken);

  return higher_priority_task_woken == pdTRUE;
}
```

La registrazione avviene prima di abilitare l'unità:

```c
pcnt_event_callbacks_t callbacks = {
  .on_reach = encoder_on_reach,
};

ESP_ERROR_CHECK(pcnt_unit_register_event_callbacks(encoder_unit, &callbacks, event_queue));
```

La callback non dovrebbe contenere la logica dell'interfaccia o del controllo motore. Il suo compito è trasferire l'informazione verso un contesto in cui possiamo lavorare con tempi e API normali.

Per una manopola utente, nella maggior parte dei casi non serve alcuna callback. Possiamo lasciare che PCNT accumuli i fronti e leggere periodicamente la posizione:

```c
int previous_count = 0;

while (true) {
  int current_count;

  ESP_ERROR_CHECK(encoder_get_count(&current_count));

  int const delta = current_count - previous_count;
  previous_count = current_count;

  if (delta != 0) {
    process_encoder_delta(delta);
  }

  vTaskDelay(pdMS_TO_TICKS(10));
}
```

Il task non deve essere schedulato su ogni fronte. È proprio questo uno dei vantaggi principali del conteggio hardware.

### Watch step: notifiche ogni N conteggi

ESP-IDF 6.0.2 espone anche `pcnt_unit_add_watch_step()`. A differenza di un watch point statico, la notifica a passo viene generata quando l'incremento accumulato raggiunge un intervallo positivo o negativo. ([Espressif: PCNT][8])

Per una manopola con quattro conteggi per detent possiamo richiedere eventi in entrambe le direzioni:

```c
#define COUNTS_PER_DETENT 4

ESP_ERROR_CHECK(pcnt_unit_add_watch_step(encoder_unit, +COUNTS_PER_DETENT));

ESP_ERROR_CHECK(pcnt_unit_add_watch_step(encoder_unit, -COUNTS_PER_DETENT));
```

La stessa callback `on_reach` viene chiamata sia per i watch point sia per le notifiche a passo. Il campo `watch_point_value` contiene il valore del contatore al momento dell'evento.

Questo meccanismo evita di creare una lunga lista di soglie assolute. Tuttavia non trasforma automaticamente quattro fronti in uno scatto affidabile.

Se il segnale rimbalza fino a produrre quattro conteggi netti, la notifica verrà comunque generata. La periferica vede impulsi e direzione; non conosce il significato meccanico del detent.

Io userei `watch step` quando serve svegliare un task ogni N conteggi senza leggere continuamente il contatore. Per una UI semplice, la lettura periodica rimane spesso più facile da controllare e da debuggare.

## Dal conteggio elettrico allo scatto della manopola

Una manopola meccanica può produrre quattro conteggi x4 per ogni scatto percepito dall'utente.

In questo caso, aggiornare la UI a ogni conteggio farebbe avanzare il valore di quattro unità per detent.

Possiamo accumulare il delta e generare un evento soltanto quando è stata completata la quantità prevista di transizioni:

```c
#define COUNTS_PER_DETENT 4

static int residual_count;

void process_encoder_delta(int delta) {
  residual_count += delta;

  while (residual_count >= COUNTS_PER_DETENT) {
    residual_count -= COUNTS_PER_DETENT;
    ui_encoder_step(+1);
  }

  while (residual_count <= -COUNTS_PER_DETENT) {
    residual_count += COUNTS_PER_DETENT;
    ui_encoder_step(-1);
  }
}
```

Il valore `4` non è universale.

Alcuni encoder completano un ciclo elettrico per detent. Altri si fermano in uno stato intermedio. In certi modelli il numero di impulsi dichiarato non coincide con il numero di scatti meccanici.

La soluzione?

Ruotare lentamente l'encoder, osservare A e B e misurare:

- lo stato stabile di ogni detent;
- il numero di fronti tra due scatti;
- il comportamento durante l'inversione;
- il conteggio prodotto da un giro completo.

Solo a quel punto possiamo stabilire la relazione tra conteggio elettrico ed evento utente.

### Esempio completo: da PCNT all'evento della UI

Possiamo ora unire lettura periodica, residuo e logica applicativa:

```c
#include "esp_timer.h"

#define ENCODER_READ_PERIOD_MS 10
#define COUNTS_PER_DETENT 4

static void encoder_application_task(void* argument) {
  (void)argument;

  int previous_count = 0;
  int residual_count = 0;

  while (true) {
    int current_count;

    esp_err_t const ret = encoder_get_count(&current_count);

    if (ret != ESP_OK) {
      ESP_LOGE("encoder", "Lettura PCNT fallita: %s", esp_err_to_name(ret));

      vTaskDelay(pdMS_TO_TICKS(100));
      continue;
    }

    int const raw_delta = current_count - previous_count;
    previous_count = current_count;
    residual_count += raw_delta;

    while (residual_count >= COUNTS_PER_DETENT) {
      residual_count -= COUNTS_PER_DETENT;
      ui_encoder_step(+1);
    }

    while (residual_count <= -COUNTS_PER_DETENT) {
      residual_count += COUNTS_PER_DETENT;
      ui_encoder_step(-1);
    }

    vTaskDelay(pdMS_TO_TICKS(ENCODER_READ_PERIOD_MS));
  }
}
```

Il task legge il valore assoluto del contatore e calcola una differenza. Questo dettaglio è importante.

Se il task viene ritardato, PCNT continua a contare e `raw_delta` può valere, ad esempio, `+12`. Non abbiamo perso il movimento: abbiamo semplicemente ricevuto tre detent insieme.

Un log di esempio potrebbe apparire così:

```text
raw_count=1   raw_delta=1   residual=1   ui_step=0
raw_count=2   raw_delta=1   residual=2   ui_step=0
raw_count=3   raw_delta=1   residual=3   ui_step=0
raw_count=4   raw_delta=1   residual=0   ui_step=+1
```

Con una lettura ritardata:

```text
raw_count=16  raw_delta=12  residual=0   ui_step=+3
```

Questa architettura separa chiaramente:

- il conteggio hardware;
- il delta osservato dal task;
- i conteggi residui;
- l'evento logico della UI.

È molto più semplice da verificare rispetto a una callback che modifica direttamente menu, display e stato applicativo.

### Accelerazione della manopola

Molte interfacce aumentano la variazione quando l'encoder viene ruotato rapidamente.

Una strategia semplice consiste nel misurare il tempo tra due eventi logici:

```text
intervallo lungo  -> passo 1
intervallo medio  -> passo 5
intervallo breve  -> passo 10
```

L'accelerazione va applicata dopo la decodifica e il raggruppamento per detent. Altrimenti il bounce o le transizioni parziali possono essere interpretati come una rotazione veloce.

È inoltre opportuno limitare l'incremento massimo. Una manopola rapida è comoda; una manopola che salta casualmente metà intervallo non lo è.

## Calcolare velocità e RPM

Dalla variazione del conteggio possiamo stimare la velocità di rotazione.

Se dentro un intervallo `Δt` osserviamo `Δcount`, i giri al secondo sono:

```text
giri_al_secondo =
    Δcount / (conteggi_per_giro * Δt)
```

Gli RPM diventano:

```text
RPM =
    Δcount * 60
    / (conteggi_per_giro * Δt)
```

con `Δt` espresso in secondi.

Supponiamo di avere:

```text
Δcount = 200
conteggi_per_giro = 4000
Δt = 0,1 s
```

Otteniamo:

```text
RPM = 200 * 60 / (4000 * 0,1)
    = 30 RPM
```

### Conteggio dentro una finestra temporale

Il metodo precedente conta gli impulsi dentro una finestra.

Una finestra più lunga:

- riduce il rumore relativo;
- migliora la risoluzione a velocità costante;
- aumenta la latenza;
- smussa le accelerazioni rapide.

Una finestra più corta:

- reagisce prima;
- segue meglio le variazioni;
- diventa più irregolare a bassa velocità.

Non esiste una durata universalmente corretta. Dipende dalla dinamica del sistema e dalla risoluzione dell'encoder.

### Misurare il periodo tra i fronti

A bassa velocità può essere più efficace misurare il tempo tra due eventi.

Se ogni evento rappresenta `1/N` di giro:

```text
RPM = 60 / (N * periodo_evento)
```

Questo approccio offre una buona risoluzione quando gli eventi sono distanti, ma diventa sensibile al jitter e alle irregolarità della scala.

Un sistema più completo può cambiare metodo in base alla velocità:

- misura del periodo a bassa velocità;
- conteggio in finestra ad alta velocità.

![Scelta tra conteggio in finestra e misura del periodo per stimare gli RPM](/blog/images/rotary_encoders_esp32_esp_idf_pcnt/speed_estimation.svg)

*Un estimatore ibrido usa il periodo quando i fronti sono radi e una finestra temporale quando diventano frequenti, mantenendo un timeout esplicito per lo zero.*

Tenete inoltre presente che la derivata amplifica il rumore. La velocità calcolata da una posizione quantizzata necessita spesso di un filtro, ma un filtro troppo aggressivo introduce ritardo. Anche qui, il compromesso non può essere scelto fuori dal contesto del controllo.

### Un estimatore firmware della velocità

Per un controllo o una telemetria possiamo incapsulare il calcolo in una struttura che conserva conteggio e timestamp precedenti.

`esp_timer_get_time()` restituisce il tempo trascorso dall'avvio in microsecondi ed è adatto a misure fini sia nei task sia nelle ISR, tenendo presente che riparte da zero dopo il deep sleep. ([Espressif: ESP Timer][17])

```c
#include <stdint.h>

#include "esp_timer.h"

typedef struct {
  int previous_count;
  int64_t previous_time_us;
  float filtered_rpm;
} encoder_speed_estimator_t;

static void encoder_speed_estimator_init(encoder_speed_estimator_t* estimator, int initial_count) {
  estimator->previous_count = initial_count;
  estimator->previous_time_us = esp_timer_get_time();
  estimator->filtered_rpm = 0.0f;
}

static bool encoder_speed_estimator_update(
  encoder_speed_estimator_t* estimator,
  int current_count,
  int counts_per_revolution,
  float filter_alpha,
  float* rpm_out
) {
  if (counts_per_revolution <= 0 || rpm_out == NULL) {
    return false;
  }

  int64_t const now_us = esp_timer_get_time();
  int64_t const elapsed_us = now_us - estimator->previous_time_us;

  if (elapsed_us <= 0) {
    return false;
  }

  int const delta_count = current_count - estimator->previous_count;

  float const instant_rpm =
    ((float)delta_count * 60.0f * 1000000.0f) / ((float)counts_per_revolution * (float)elapsed_us);

  if (filter_alpha < 0.0f) {
    filter_alpha = 0.0f;
  } else if (filter_alpha > 1.0f) {
    filter_alpha = 1.0f;
  }

  estimator->filtered_rpm += filter_alpha * (instant_rpm - estimator->filtered_rpm);

  estimator->previous_count = current_count;
  estimator->previous_time_us = now_us;

  *rpm_out = estimator->filtered_rpm;
  return true;
}
```

Con `filter_alpha = 1.0f` non viene applicato alcun filtraggio. Valori più piccoli riducono le variazioni ma aumentano il ritardo.

È doveroso specificare che il filtro esponenziale non risolve una finestra scelta male. Se in una finestra breve non arriva alcun conteggio, la velocità istantanea diventa zero anche se l'albero sta ancora ruotando lentamente.

### MCPWM Capture per la velocità a bassa frequenza

Quando i fronti sono distanti, misurare il periodo può offrire più informazione rispetto a contare quanti eventi cadano in una finestra.

MCPWM dispone di un capture timer dedicato e di canali associati ai GPIO. La callback riceve `cap_value`, cioè il timestamp hardware del fronte, e `cap_edge`. ([Espressif: MCPWM][16])

Il seguente esempio cattura i fronti di salita del canale A:

```c
#include <inttypes.h>
#include <stdbool.h>
#include <stdint.h>

#include "driver/mcpwm_cap.h"
#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"

#define ENCODER_EVENTS_PER_REVOLUTION 600

typedef struct {
  uint32_t period_ticks;
  uint32_t capture_value;
} encoder_period_event_t;

static mcpwm_cap_timer_handle_t capture_timer;
static mcpwm_cap_channel_handle_t capture_channel;
static QueueHandle_t period_queue;
static uint32_t previous_capture_value;
static bool previous_capture_valid;

static bool encoder_capture_callback(
  mcpwm_cap_channel_handle_t channel,
  mcpwm_capture_event_data_t const* event_data,
  void* user_context
) {
  (void)channel;

  QueueHandle_t queue = (QueueHandle_t)user_context;
  BaseType_t task_woken = pdFALSE;

  if (previous_capture_valid) {
    encoder_period_event_t const event = {
      .period_ticks = event_data->cap_value - previous_capture_value,
      .capture_value = event_data->cap_value,
    };

    xQueueSendFromISR(queue, &event, &task_woken);
  }

  previous_capture_value = event_data->cap_value;
  previous_capture_valid = true;

  return task_woken == pdTRUE;
}

static esp_err_t encoder_capture_init(void) {
  period_queue = xQueueCreate(8, sizeof(encoder_period_event_t));

  if (period_queue == NULL) {
    return ESP_ERR_NO_MEM;
  }

  mcpwm_capture_timer_config_t const timer_config = {
    .group_id = 0,
    .clk_src = MCPWM_CAPTURE_CLK_SRC_DEFAULT,
    .resolution_hz = 0,
  };

  ESP_RETURN_ON_ERROR(
    mcpwm_new_capture_timer(&timer_config, &capture_timer),
    "encoder",
    "Impossibile creare il capture timer"
  );

  mcpwm_capture_channel_config_t const channel_config = {
    .gpio_num = ENCODER_GPIO_A,
    .prescale = 1,
    .flags.pos_edge = true,
    .flags.neg_edge = false,
    .flags.pull_up = true,
  };

  ESP_RETURN_ON_ERROR(
    mcpwm_new_capture_channel(capture_timer, &channel_config, &capture_channel),
    "encoder",
    "Impossibile creare il canale capture"
  );

  mcpwm_capture_event_callbacks_t const callbacks = {
    .on_cap = encoder_capture_callback,
  };

  ESP_RETURN_ON_ERROR(
    mcpwm_capture_channel_register_event_callbacks(capture_channel, &callbacks, period_queue),
    "encoder",
    "Impossibile registrare la callback capture"
  );

  ESP_RETURN_ON_ERROR(
    mcpwm_capture_timer_enable(capture_timer), "encoder", "Impossibile abilitare il capture timer"
  );

  ESP_RETURN_ON_ERROR(
    mcpwm_capture_channel_enable(capture_channel),
    "encoder",
    "Impossibile abilitare il capture channel"
  );

  return mcpwm_capture_timer_start(capture_timer);
}
```

Il task converte i tick in RPM. Il valore `ENCODER_EVENTS_PER_REVOLUTION` deve rappresentare il numero di fronti catturati sul solo canale A per ogni giro, non necessariamente i conteggi x4 di PCNT:

```c
static void encoder_period_task(void* argument) {
  (void)argument;

  uint32_t capture_resolution_hz;

  ESP_ERROR_CHECK(mcpwm_capture_timer_get_resolution(capture_timer, &capture_resolution_hz));

  encoder_period_event_t event;

  while (true) {
    if (xQueueReceive(period_queue, &event, portMAX_DELAY) != pdTRUE) {
      continue;
    }

    if (event.period_ticks == 0) {
      continue;
    }

    float const event_frequency_hz = (float)capture_resolution_hz / (float)event.period_ticks;

    float const rpm = event_frequency_hz * 60.0f / (float)ENCODER_EVENTS_PER_REVOLUTION;

    ESP_LOGI("encoder", "period_ticks=%" PRIu32 ", rpm=%.2f", event.period_ticks, rpm);
  }
}
```

Nel `CMakeLists.txt`:

```cmake
PRIV_REQUIRES esp_driver_mcpwm
```

Questo esempio misura soltanto la frequenza dei fronti di A. La direzione può essere ricavata leggendo B al momento del fronte oppure, in modo più robusto, mantenendo PCNT come decoder della posizione.

Una combinazione pratica può quindi essere:

- PCNT per posizione e direzione;
- MCPWM Capture per il periodo a bassa velocità;
- finestra di conteggio PCNT ad alta velocità.

La misura deve anche gestire il timeout. Se non arriva alcun fronte per un intervallo sufficientemente lungo, l'ultima velocità non può rimanere valida all'infinito.

## Usare il canale Z senza perdere conteggi

L'indice può essere usato per correggere la posizione una volta per giro. Una soluzione ingenua consiste nell'azzerare immediatamente PCNT quando Z cambia stato.

Può funzionare, ma rende più difficile distinguere:

- l'istante fisico dell'indice;
- la latenza della ISR;
- i conteggi avvenuti dopo l'indice;
- un falso impulso su Z.

Un approccio più informativo cattura il conteggio corrente nella ISR e applica un offset software nel task.

`pcnt_unit_get_count()` è consentita in contesto ISR dal driver corrente. ([Espressif: PCNT][8])

```c
typedef struct {
  int raw_count_at_index;
  int64_t timestamp_us;
} encoder_index_event_t;

static QueueHandle_t index_queue;

static void encoder_index_isr(void* argument) {
  (void)argument;

  encoder_index_event_t event;

  if (pcnt_unit_get_count(encoder_unit, &event.raw_count_at_index) != ESP_OK) {
    return;
  }

  event.timestamp_us = esp_timer_get_time();

  BaseType_t task_woken = pdFALSE;

  xQueueSendFromISR(index_queue, &event, &task_woken);

  if (task_woken == pdTRUE) {
    portYIELD_FROM_ISR();
  }
}
```

Il task può trasformare il conteggio grezzo in posizione corretta:

```c
static portMUX_TYPE encoder_index_lock = portMUX_INITIALIZER_UNLOCKED;
static int64_t encoder_position_offset;

static int64_t encoder_get_corrected_position(void) {
  int raw_count;

  ESP_ERROR_CHECK(pcnt_unit_get_count(encoder_unit, &raw_count));

  portENTER_CRITICAL(&encoder_index_lock);
  int64_t const offset = encoder_position_offset;
  portEXIT_CRITICAL(&encoder_index_lock);

  return (int64_t)raw_count + offset;
}

static void encoder_index_task(void* argument) {
  (void)argument;

  encoder_index_event_t event;

  while (true) {
    xQueueReceive(index_queue, &event, portMAX_DELAY);

    int64_t const expected_reference = 0;

    int64_t const new_offset = expected_reference - (int64_t)event.raw_count_at_index;

    portENTER_CRITICAL(&encoder_index_lock);
    encoder_position_offset = new_offset;
    portEXIT_CRITICAL(&encoder_index_lock);
  }
}
```

In un sistema reale non accetterei ogni impulso Z alla cieca. Verificherei almeno:

- che l'indice cada in una finestra plausibile;
- che la direzione sia coerente;
- che non arrivino più indici nello stesso giro;
- che la distanza dal precedente sia vicina ai conteggi per giro attesi;
- che il fine corsa o la fase di homing abbiano identificato il giro corretto.

Il canale Z è un riferimento, non una garanzia contro disturbi o errori meccanici.

## Encoder assoluti tramite SPI

Quando il sensore fornisce direttamente l'angolo via SPI, PCNT non è necessario per leggere la posizione assoluta.

Il flusso tipico diventa:

1. il task avvia una transazione SPI;
2. il sensore restituisce il registro angolare;
3. il firmware controlla parità e bit di errore;
4. il valore viene convertito in gradi o radianti;
5. l'applicazione gestisce il passaggio tra fine e inizio giro.

Con un valore a 14 bit:

```text
posizioni = 2^14 = 16384
```

La conversione nominale è:

```text
angolo_gradi = valore * 360 / 16384
```

L'AS5047D è un esempio concreto: fornisce un angolo assoluto a 14 bit via SPI e può generare anche segnali ABI incrementali, PWM e UVW. ([ams OSRAM][12])

Questa combinazione permette un'architettura interessante:

- SPI per conoscere l'angolo assoluto all'avvio;
- ABI verso PCNT per seguire il movimento con bassa latenza;
- letture SPI periodiche per verificare o correggere la posizione incrementale.

Non significa però che i due percorsi siano automaticamente equivalenti. Bisogna verificare:

- offset e orientamento;
- risoluzione ABI configurata;
- ritardo interno del sensore;
- latenza della transazione SPI;
- diagnostica del campo magnetico;
- eventuali errori di parità;
- comportamento sul passaggio 0/360 gradi.

Una lettura seriale è un campionamento. Non osserva ogni movimento avvenuto tra due transazioni. Il percorso incrementale, invece, può contare continuamente i fronti, purché rimanga alimentato e configurato.

### Gestire il passaggio tra 359 e 0 gradi

Un sensore assoluto single-turn restituisce normalmente un valore dentro un intervallo circolare. Se confrontiamo direttamente due campioni vicini al punto di wrap possiamo ottenere un salto enorme:

```text
campione precedente = 16380
campione corrente   = 4
delta ingenuo       = -16376
```

Il movimento reale potrebbe essere soltanto di otto conteggi in avanti.

Possiamo calcolare il delta circolare più corto:

```c
#include <stdint.h>

static int32_t circular_delta(int32_t current, int32_t previous, int32_t modulus) {
  int32_t delta = current - previous;

  int32_t const half = modulus / 2;

  if (delta > half) {
    delta -= modulus;
  } else if (delta < -half) {
    delta += modulus;
  }

  return delta;
}
```

Per un sensore a 14 bit:

```c
#define ABSOLUTE_MODULUS 16384

static int64_t multi_turn_position;
static uint16_t previous_absolute_sample;

void process_absolute_sample(uint16_t current_sample) {
  int32_t const delta = circular_delta(current_sample, previous_absolute_sample, ABSOLUTE_MODULUS);

  multi_turn_position += delta;
  previous_absolute_sample = current_sample;
}
```

Questa logica ricostruisce una posizione multi-giro soltanto se tra due campioni il movimento rimane inferiore a mezzo giro. Se l'albero può ruotare più velocemente, il firmware non può distinguere quanti wrap siano avvenuti.

La soluzione può essere:

- aumentare la frequenza di campionamento;
- usare l'uscita ABI con PCNT;
- usare un encoder assoluto multi-turn;
- aggiungere un modello dinamico, accettando però che diventi una stima.

### Confrontare SPI e ABI per rilevare errori

Quando un sensore espone entrambe le interfacce, possiamo usare la lettura assoluta come controllo del percorso incrementale.

Il flusso può essere:

1. leggere l'angolo assoluto all'avvio;
2. inizializzare l'offset del contatore PCNT;
3. seguire il movimento tramite ABI;
4. leggere periodicamente SPI;
5. confrontare le due posizioni modulo giro;
6. segnalare o correggere una differenza oltre soglia.

```c
int32_t pcnt_mod = positive_modulo(pcnt_position, counts_per_revolution);

int32_t absolute_as_pcnt = absolute_value * counts_per_revolution / absolute_modulus;

int32_t error = circular_delta(absolute_as_pcnt, pcnt_mod, counts_per_revolution);
```

Una correzione brusca può propagarsi al controllo motore. In molti sistemi è preferibile:

- registrare prima l'errore;
- verificare che persista per più campioni;
- applicare una correzione graduale;
- entrare in fault se la divergenza supera una soglia di sicurezza.

## Encoder nel controllo motore

In un sistema di controllo, la posizione dell'encoder può chiudere più anelli.

### Anello di posizione

```text
errore_posizione =
    posizione_target - posizione_misurata
```

### Anello di velocità

```text
errore_velocità =
    velocità_target - velocità_misurata
```

### Commutazione

In un motore BLDC, la posizione del rotore può contribuire alla scelta delle fasi da alimentare.

Questi problemi non hanno gli stessi requisiti.

Una manopola utente può tollerare un conteggio perso. In un servo, lo stesso errore può trasformarsi in:

- oscillazione;
- rumore meccanico;
- errore di posizione;
- instabilità;
- collisione con un fine corsa.

L'esempio ufficiale ESP-IDF per il controllo in velocità di un motore DC usa PCNT per decodificare la quadratura dell'encoder di feedback. ([Espressif: controllo motore][11])

PCNT risolve l'acquisizione dei fronti, non il controllo.

Restano da progettare:

- la frequenza del loop;
- il filtro della velocità;
- i guadagni del controllore;
- i limiti dell'attuatore;
- la saturazione;
- l'anti-windup;
- il comportamento in caso di perdita del sensore;
- il rilevamento di un encoder bloccato o scollegato.

Un controllo che assume sempre valido il feedback non è robusto. Se il motore riceve comando ma il conteggio non cambia, il firmware deve stabilire se il sistema sia fermo, in stallo o privo di segnale.

## Organizzare il firmware a livelli

Gli esempi precedenti mostrano diverse API, ma il punto più importante è l'architettura che le collega.

Io separerei almeno quattro livelli:

![Livelli del firmware dall'encoder fisico all'applicazione](/blog/images/rotary_encoders_esp32_esp_idf_pcnt/firmware_layers.svg)

*Il driver espone conteggi e timestamp, la misura li trasforma in campioni, il dominio applica le regole del prodotto e soltanto l'applicazione aggiorna UI o controllori.*

Questa separazione evita che una ISR debba conoscere il menu visualizzato o che il driver PCNT contenga regole specifiche del prodotto.

Un'interfaccia comune può essere:

```c
typedef struct {
  int64_t position;
  int32_t delta;
  float rpm;
  uint32_t invalid_transitions;
  bool index_seen;
  bool signal_fault;
  int64_t timestamp_us;
} encoder_sample_t;
```

Il task di misura aggiorna `encoder_sample_t`. Gli altri componenti leggono o ricevono campioni senza conoscere il metodo di acquisizione.

In questo modo possiamo sostituire:

- polling con PCNT;
- ABI con SPI;
- una manopola meccanica con un sensore magnetico;

senza riscrivere tutta la logica applicativa.

### Rilevare encoder fermo, scollegato o incoerente

Un conteggio che non cambia può significare cose diverse:

- l'albero è fermo;
- il motore è in stallo;
- l'encoder è scollegato;
- A e B sono bloccati;
- la periferica non è stata avviata;
- il livello elettrico non raggiunge la soglia.

Il firmware deve confrontare il feedback con ciò che il sistema si aspetta.

```c
typedef struct {
  int64_t last_motion_time_us;
  int64_t last_count;
  uint32_t invalid_transition_limit;
  int64_t no_motion_timeout_us;
} encoder_monitor_t;

bool encoder_monitor_update(
  encoder_monitor_t* monitor,
  int64_t current_count,
  uint32_t invalid_transitions,
  bool actuator_commanded
) {
  int64_t const now_us = esp_timer_get_time();

  if (current_count != monitor->last_count) {
    monitor->last_count = current_count;
    monitor->last_motion_time_us = now_us;
  }

  if (invalid_transitions > monitor->invalid_transition_limit) {
    return false;
  }

  if (actuator_commanded && now_us - monitor->last_motion_time_us > monitor->no_motion_timeout_us) {
    return false;
  }

  return true;
}
```

Questa logica non è universale. Un asse può avere inerzia, gioco o fasi in cui il comando non produce subito movimento. Le soglie devono derivare dal sistema reale.

### Non usare il log come parte del timing

I log sono utilissimi nei task. Dentro una ISR o una callback ad alta frequenza possono alterare proprio il comportamento che stiamo cercando di osservare.

Una strategia migliore consiste nel raccogliere contatori diagnostici:

```c
typedef struct {
  uint32_t valid_forward;
  uint32_t valid_backward;
  uint32_t invalid_transitions;
  uint32_t queue_overflows;
  uint32_t index_events;
} encoder_diagnostics_t;
```

Un task a bassa frequenza può stamparli una volta al secondo:

```text
forward=4218 backward=17 invalid=3 queue_overflow=0 index=12
```

Il dato rimane leggibile e il percorso temporale critico non viene riempito di formattazione e I/O seriale.

## Cache, IRAM e latenza degli eventi

Il conteggio hardware riduce la dipendenza dallo scheduler, ma non rende ogni evento istantaneo.

Le callback PCNT vengono eseguite da interrupt. Per impostazione predefinita, l'esecuzione può essere ritardata quando la cache è disabilitata durante alcune operazioni sulla Flash.

ESP-IDF espone due opzioni rilevanti:

```text
CONFIG_PCNT_ISR_IRAM_SAFE
CONFIG_PCNT_CTRL_FUNC_IN_IRAM
```

La prima permette all'ISR del driver di funzionare mentre la cache è disabilitata, a condizione che callback, dati e funzioni richiamate siano collocati in memoria accessibile. La seconda porta in IRAM alcune funzioni di controllo, tra cui lettura, start, stop e clear, secondo quanto indicato dalla documentazione della versione usata. ([Espressif: PCNT][8])

Non le abiliterei per abitudine.

Per una manopola, un ritardo nell'elaborazione dell'evento è spesso irrilevante: il contatore hardware continua a catturare i fronti.

Per un controllo motore o un evento di protezione, invece, bisogna analizzare:

- priorità dell'interrupt;
- durata delle sezioni critiche;
- operazioni Flash;
- logging;
- Wi-Fi e Bluetooth;
- task ad alta priorità;
- quantità di IRAM disponibile;
- frequenza degli eventi.

Portare codice in IRAM riduce alcune latenze, ma consuma una risorsa limitata. La scelta deve derivare da un requisito misurabile, non da un'impostazione attivata “per sicurezza”.

## Light sleep, deep sleep e perdita della posizione

Un encoder usato nell'interfaccia può anche risvegliare il sistema.

L'esempio ufficiale per EC11 configura il wake-up su livello basso, perché il segnale viene mantenuto alto e il contatto lo porta a massa. ([Espressif: esempio PCNT][9])

Questo non implica che ogni transizione avvenuta durante il sonno venga conservata.

Bisogna distinguere almeno quattro aspetti:

- quale GPIO può risvegliare il chip;
- quali domini e periferiche rimangono alimentati;
- quale stato dei pin viene osservato al risveglio;
- dove viene conservata la posizione software.

In light sleep alcune risorse possono rimanere attive in base al target e alla configurazione. In deep sleep, invece, gran parte del sistema viene spenta e l'esecuzione riparte sostanzialmente da un nuovo avvio.

Un encoder incrementale non recupera da solo la posizione assoluta dopo una perdita di alimentazione.

Le alternative sono:

- procedura di homing;
- indice Z e ricerca del riferimento;
- salvataggio periodico in memoria non volatile;
- encoder assoluto;
- sensore multi-turn;
- batteria o dominio sempre alimentato, quando disponibile.

Salvare ogni conteggio in Flash non è una buona soluzione: aumenta latenza, consumo e usura della memoria. È preferibile salvare a intervalli ragionati, durante uno shutdown controllato oppure usare una tecnologia adatta alla frequenza di aggiornamento richiesta.

## Errori frequenti

### Confondere PPR, CPR e conteggi x4

Il valore angolare risulta errato di un fattore due o quattro.

### Confondere conteggi e detent

La manopola avanza di più unità per scatto oppure sembra poco sensibile.

### Collegare A e B senza un livello definito

Gli ingressi flottanti producono transizioni casuali. Servono pull-up, pull-down o un'uscita che piloti attivamente entrambi i livelli.

### Collegare 5, 12 o 24 V direttamente al GPIO

Un segnale apparentemente funzionante può superare i limiti elettrici del chip. Va previsto un adattamento adeguato.

### Trattare il glitch filter come debounce

PCNT continua a contare i rimbalzi più lunghi della soglia.

### Usare un filtro RC troppo lento

I fronti attraversano lentamente la soglia, A e B perdono la relazione di fase e vengono cancellati impulsi validi.

### Fare logging dalla callback

Il comportamento dipende dal backend del logger e può introdurre latenze, contesa o watchdog.

### Dimenticare i watch point dei limiti

`accum_count` non può compensare correttamente gli overflow se i limiti non generano gli eventi necessari.

### Usare `.accum_count = true`

Nella struttura corrente il flag è annidato:

```c
.flags.accum_count = true
```

La forma piatta non corrisponde alla definizione di `pcnt_unit_config_t` in ESP-IDF 6.0.2. ([Espressif: header PCNT][13])

### Copiare codice per il driver legacy

Gli esempi basati su `driver/pcnt.h` non sono direttamente compatibili con ESP-IDF 6.0, dove il driver precedente è stato rimosso. ([Espressif: migrazione 6.0][10])

### Non verificare il verso

Scambiare A e B o osservare l'albero dall'altro lato inverte la direzione.

### Non gestire i valori negativi nel modulo

In C, il resto di una divisione negativa può essere negativo. Per ottenere un angolo nel range `[0, conteggi_per_giro)` possiamo normalizzare così:

```c
int normalize_count(int count, int counts_per_revolution) {
  int normalized = count % counts_per_revolution;

  if (normalized < 0) {
    normalized += counts_per_revolution;
  }

  return normalized;
}
```

### Correggere via firmware un problema elettrico

Se il segnale supera le soglie, oscilla o contiene disturbi, aggiungere ritardi casuali al decoder può nascondere il problema senza risolverlo.

## Diagnosticare il segnale reale

Lo strumento più utile è spesso un logic analyzer. Per livelli analogici, fronti lenti e sovraelongazioni serve invece un oscilloscopio.

Bisogna osservare A e B insieme e verificare:

- livello minimo e massimo;
- sequenza degli stati;
- durata degli impulsi;
- duty cycle;
- rimbalzo;
- numero di transizioni per detent;
- comportamento all'inversione;
- frequenza massima;
- salti di stato non validi;
- disturbi quando motori, radio e alimentatori sono attivi.

Un logic analyzer mostra bene la sequenza digitale. Non mostra necessariamente quanto il segnale sia vicino alla soglia elettrica.

Un ingresso può apparire come `0` o `1` nella cattura e avere comunque:

- fronti troppo lenti;
- ringing;
- overshoot;
- sottotensioni;
- rumore vicino alla soglia;
- problemi di massa.

Per un encoder magnetico assoluto aggiungerei anche verifiche su:

- centraggio del magnete;
- distanza assiale;
- inclinazione;
- diagnostica del campo;
- bit di errore;
- parità;
- offset;
- non linearità;
- passaggio 0/360 gradi.

Il test deve essere svolto sul prodotto reale e nelle condizioni peggiori previste:

- massima velocità;
- cavo più lungo;
- temperatura limite;
- motore sotto carico;
- PWM attivo;
- Wi-Fi o Bluetooth attivi;
- alimentazione nello stato più rumoroso.

Una breadboard con fili corti è utile per iniziare. Non certifica il comportamento finale.

## Scegliere l'architettura

| Applicazione | Encoder tipico | Acquisizione consigliata |
| --- | --- | --- |
| Menu o impostazione lenta | Meccanico con detent | Macchina a stati oppure PCNT |
| Controllo volume | Meccanico con detent | PCNT e conversione in eventi logici |
| Misura della velocità di un motore | Ottico o magnetico incrementale | PCNT a finestra oppure MCPWM Capture |
| Servo di posizione | Incrementale ad alta risoluzione o assoluto | PCNT o interfaccia dedicata |
| Posizione nota subito dopo l'avvio | Assoluto magnetico, ottico o induttivo | SPI, SSI, BiSS o protocollo specifico |
| Cavo industriale lungo | Line driver differenziale | Ricevitore differenziale e PCNT |
| Target senza PCNT, manopola lenta | Meccanico | Polling, interrupt GPIO o GPTimer |
| Ambiente sporco o con condensa | Magnetico o induttivo | SPI, ABI o interfaccia dedicata |
| Sistema multi-giro | Assoluto multi-turn oppure homing | Interfaccia seriale e gestione dei giri |

La scelta migliore non è l'encoder con il numero più alto stampato sul datasheet.

Deve soddisfare contemporaneamente:

- accuratezza richiesta;
- risoluzione utile;
- velocità massima;
- comportamento all'avvio;
- ambiente;
- lunghezza del cavo;
- immunità al rumore;
- latenza;
- durata meccanica;
- costo;
- risorse del microcontrollore;
- strategia in caso di guasto.

Per una UI, semplicità e sensazione meccanica possono contare più della precisione assoluta. Per un asse, invece, ripetibilità, latenza e diagnostica diventano centrali.

## Checklist di progetto

Prima di chiudere schema e firmware, conviene rispondere a queste domande:

1. L'encoder è incrementale o assoluto?
2. Il valore dichiarato è PPR, CPR, cicli, linee o conteggi x4?
3. Quanti conteggi produce realmente per giro?
4. Quanti conteggi produce per detent?
5. Qual è la frequenza massima dei fronti?
6. Quale accuratezza serve sull'asse reale?
7. Il movimento deve essere noto dopo reset o perdita di alimentazione?
8. L'uscita è a contatto, push-pull, open collector o differenziale?
9. Quali tensioni produce?
10. Serve un ricevitore, un buffer o un level shifter?
11. I pin scelti sono compatibili con target, boot e sleep?
12. I livelli hanno pull-up o pull-down definiti?
13. Il rumore è elettrico, meccanico o entrambi?
14. Il filtro conserva l'impulso valido più breve?
15. PCNT è presente sul target scelto?
16. La versione di ESP-IDF usa il driver corrente o quello legacy?
17. I limiti del contatore sono sufficientemente ampi?
18. `accum_count` e watch point sono configurati correttamente?
19. Serve una callback oppure basta leggere periodicamente il conteggio?
20. Le callback usano soltanto API compatibili con ISR?
21. Come viene convertito il conteggio in eventi utente?
22. Come viene stimata la velocità?
23. Cosa succede durante light sleep e deep sleep?
24. Come viene rilevato un encoder scollegato o bloccato?
25. La frequenza di campionamento conserva ogni stato della quadratura?
26. Le transizioni invalide vengono contate e diagnosticate?
27. Il canale Z viene validato dentro una finestra plausibile?
28. La stima della velocità gestisce il timeout senza fronti?
29. Il segnale è stato misurato alla massima velocità?
30. Il test include motori, radio e alimentazione nello stato reale?

Non tutte le domande hanno bisogno di una soluzione complessa. Devono però avere una risposta esplicita.

## Conclusione

Un encoder non è difficile per il numero di fili. Lo diventa quando pretendiamo che tutti i livelli del sistema rimangano coerenti.

La meccanica produce un movimento. Il principio di misura lo trasforma in una variazione fisica. L'elettronica genera un segnale. Il cablaggio deve conservarne l'integrità. Il decoder ricostruisce direzione e conteggio. Il firmware attribuisce infine un significato alla posizione.

Confondere questi livelli porta ai problemi più comuni: usare il debounce per correggere un cablaggio rumoroso, aumentare un filtro per compensare livelli incompatibili, trattare la risoluzione come accuratezza o usare una manopola meccanica come feedback per un controllo che richiede affidabilità deterministica.

Su ESP-IDF, la scelta può partire da una macchina a stati software per una manopola lenta, passare agli interrupt o a GPTimer quando serve un'acquisizione più controllata e arrivare a PCNT quando il conteggio deve continuare in hardware. Per la velocità a bassa frequenza, MCPWM Capture permette inoltre di misurare direttamente il periodo tra i fronti.

PCNT rimane la soluzione naturale per gli encoder incrementali quando il target la mette a disposizione. Conta i fronti in hardware, usa il secondo segnale per determinare il verso, filtra glitch brevi, supporta notifiche a passo e può estendere il conteggio oltre i limiti del registro.

Non fa però magie.

PCNT non sostituisce il datasheet, il progetto elettrico, il controllo dei livelli, il debounce semantico e la verifica con strumenti reali. Inoltre, con ESP-IDF 6.0 bisogna usare il driver corrente `driver/pulse_cnt.h`, configurando correttamente anche dettagli meno evidenti come `.flags.accum_count` e i watch point dei limiti.

In sostanza, l'encoder fornisce informazioni sul movimento. L'affidabilità nasce da come il sistema decide di acquisirle, validarle e trasformarle in stato.

## Fonti

La teoria generale e la distinzione tra encoder incrementali e assoluti sono state verificate sulla documentazione tecnica Renishaw. La quadratura è stata confrontata con la guida US Digital. ([Renishaw][1]) ([US Digital][2])

Le caratteristiche degli encoder meccanici e magnetici sono state confrontate con i datasheet Bourns PEC11R e ams OSRAM AS5047D. ([Bourns][3]) ([ams OSRAM][12])

La parte ESP-IDF si basa sulla documentazione PCNT, GPIO, GPTimer, MCPWM Capture ed ESP Timer, oltre che sull'esempio ufficiale `rotary_encoder`, sulla guida di migrazione a ESP-IDF 6.0 e sulla definizione pubblica dell'header del driver. ([Espressif: PCNT][8]) ([Espressif: esempio PCNT][9]) ([Espressif: migrazione 6.0][10]) ([Espressif: header PCNT][13]) ([Espressif: GPIO][14]) ([Espressif: GPTimer][15]) ([Espressif: MCPWM][16]) ([Espressif: ESP Timer][17])

### Crediti immagine

- Immagine di copertina: [VW Rot enc.jpg] di [Lambtron], Wikimedia Commons, licenza [CC BY-SA 4.0]. Immagine convertita in WebP per il layout del sito; la versione adattata resta disponibile con la stessa licenza.

[1]: https://www.renishaw.com/en/what-is-an-encoder--47256 "What is an encoder?: Renishaw"
[2]: https://www.usdigital.com/news/blog/what-is-quadrature/ "What is Quadrature?: US Digital"
[3]: https://www.bourns.com/docs/product-datasheets/pec11r.pdf "PEC11R Series 12 mm Incremental Encoder: Bourns"
[4]: https://www.renishaw.com/en/optical-encoders-frequently-asked-questions--34674 "Optical encoders: frequently asked questions: Renishaw"
[5]: https://www.ia.omron.com/data_pdf/cat/e6b2-c_ds_e_6_3_csm491.pdf "E6B2-C Rotary Encoder Datasheet: OMRON"
[6]: https://docs.espressif.com/projects/esp-faq/en/latest/hardware-related/hardware-design.html "Hardware Design: ESP-FAQ"
[7]: https://docs.espressif.com/projects/esp-iot-solution/en/release-v2.0/input_device/knob.html "Knob: ESP-IoT-Solution"
[8]: https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/peripherals/pcnt.html "Pulse Counter: ESP-IDF Programming Guide"
[9]: https://github.com/espressif/esp-idf/blob/v6.0.2/examples/peripherals/pcnt/rotary_encoder/main/rotary_encoder_example_main.c "Rotary encoder PCNT example: ESP-IDF"
[10]: https://docs.espressif.com/projects/esp-idf/en/stable/esp32/migration-guides/release-6.x/6.0/peripherals.html "Peripheral drivers migration: ESP-IDF 6.0"
[11]: https://github.com/espressif/esp-idf/blob/v6.0.2/examples/peripherals/mcpwm/mcpwm_bdc_speed_control/README.md "MCPWM brushed DC motor speed control: ESP-IDF"
[12]: https://look.ams-osram.com/m/e535639512ec7dc/original/AS5047D-DS000394.pdf "AS5047D Datasheet: ams OSRAM"
[13]: https://raw.githubusercontent.com/espressif/esp-idf/v6.0.2/components/esp_driver_pcnt/include/driver/pulse_cnt.h "pulse_cnt.h: ESP-IDF v6.0.2"

[14]: https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/peripherals/gpio.html "GPIO: ESP-IDF Programming Guide"
[15]: https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/peripherals/gptimer.html "General Purpose Timer: ESP-IDF Programming Guide"
[16]: https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/peripherals/mcpwm.html "MCPWM Capture: ESP-IDF Programming Guide"
[17]: https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/system/esp_timer.html "ESP Timer: ESP-IDF Programming Guide"
[VW Rot enc.jpg]: https://commons.wikimedia.org/wiki/File:VW_Rot_enc.jpg
[Lambtron]: https://commons.wikimedia.org/wiki/User:Lambtron
[CC BY-SA 4.0]: https://creativecommons.org/licenses/by-sa/4.0/
