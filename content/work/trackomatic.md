---

title: TrackOMatic · tracking Android, architettura e backend cloud
lang: it
client: Personale · progetto archiviato
role: Designer e sviluppatore
year: Novembre 2022–febbraio 2023
summary: "Ho progettato e sviluppato un'app Android nativa per registrare attività all'aperto, combinando tracking in background, mappe, statistiche, autenticazione e sincronizzazione Firebase all'interno di un'architettura MVVM multilivello. Il progetto è concluso e archiviato."
tags: [Android, Kotlin, Jetpack Compose, Firebase, MVVM, Clean Architecture, Dagger Hilt, Google Maps, Coroutines, Flow]
color: cyan
accent: Android nativo · background tracking · architettura reattiva
cover_fit: contain
cover: /work/trackomatic/tom_screen.png
spotlight: true
metrics:

- { k: Progetto, v: Applicazione Android completa }
- { k: Tracking, v: Fused Location Provider · foreground service }
- { k: Backend, v: Firebase Auth · Firestore · Storage · Functions }
- { k: Stato, v: Concluso · archiviato }

---

## Realizzare bene una funzione comune

TrackOMatic è nato come progetto Android personale per affrontare, all'interno della stessa applicazione, problemi che spesso vengono studiati separatamente:

* progettazione dell'interfaccia;
* architettura multilivello;
* geolocalizzazione continua;
* esecuzione in background;
* autenticazione;
* persistenza cloud;
* sincronizzazione reattiva;
* cancellazione completa dei dati dell'utente.

L'idea di partenza era relativamente semplice: registrare un'attività all'aperto, vedere il percorso sulla mappa e consultare le statistiche al termine della sessione.

La difficoltà non consisteva nell'inventare una funzione nuova.

Applicazioni per corsa, escursionismo e ciclismo esistevano già da tempo. Proprio per questo, il progetto era interessante: una funzione comune lascia poco spazio per nascondere i problemi dietro l'originalità dell'idea.

Il tracking doveva continuare anche quando l'applicazione non era visibile. La mappa doveva aggiornarsi senza diventare la fonte primaria dello stato. Le sessioni dovevano essere salvate, recuperate ed eliminate insieme alle rispettive immagini. L'autenticazione doveva convivere con verifica dell'email, recupero della password e accesso Google.

Tutto questo senza trasformare ogni schermata in un punto di incontro tra permessi, Firebase, posizione e navigazione.

TrackOMatic è quindi diventato un esercizio di equilibrio.

Da una parte volevo una struttura abbastanza ordinata da rendere comprensibile il progetto. Dall'altra, non volevo aggiungere livelli soltanto per rispettare un diagramma.

Il repository pubblico contiene il codice, la documentazione progettuale e una descrizione dettagliata di requisiti, architettura, schermate e servizi utilizzati.

Il codice è disponibile su [github.com/signorenne/trackomatic](https://github.com/signorenne/trackomatic).

![Schermata di tracking con mappa live, polyline e timer](/work/trackomatic/tom_screen.png)

## Il prodotto, in breve

TrackOMatic permette di registrare attività di movimento come corsa, jogging ed escursionismo, pur non imponendo una disciplina specifica.

Durante una sessione, l'applicazione mostra:

* la posizione corrente;
* il percorso sulla mappa;
* il tempo trascorso;
* la distanza;
* lo stato del tracking;
* le informazioni necessarie per interrompere, riprendere o terminare la registrazione.

Al termine, l'utente può decidere se salvare la sessione, eliminarla oppure tornare al tracking. Una sessione salvata contiene durata, distanza, velocità media, calorie stimate, data, polyline, configurazione grafica della mappa e riferimento all'immagine utilizzata come anteprima.

L'applicazione offre inoltre:

* registrazione e accesso tramite email e password;
* accesso tramite Google One Tap;
* verifica dell'indirizzo email;
* recupero della password;
* cronologia delle attività;
* dettaglio di una singola sessione;
* statistiche aggregate;
* personalizzazione dello stile della mappa;
* scelta del sistema di misura;
* modifica dei dati personali;
* logout;
* cancellazione dell'account e dei dati associati.

Il repository descrive TrackOMatic come un prototipo funzionante e semplificato di una moderna applicazione di tracking. Questa definizione rappresenta bene l'obiettivo: non competere con un prodotto commerciale maturo, ma costruire l'intero percorso tecnico necessario per sostenerne le funzioni fondamentali.

## Il tracking è uno stato, non una schermata

Una delle decisioni più importanti è stata non trattare il tracking come una funzione appartenente esclusivamente alla schermata con la mappa.

La schermata può mostrare il percorso e permettere all'utente di controllare la sessione. Tuttavia, non dovrebbe possedere la sessione stessa.

L'applicazione può infatti passare in background, essere temporaneamente coperta da un'altra attività o perdere la composizione della schermata. Il tracking, invece, deve continuare finché l'utente non decide esplicitamente di sospenderlo o terminarlo.

Il sistema deve quindi distinguere tra **interfaccia visibile** e **sessione di tracking attiva**, perché hanno cicli di vita differenti.

Questa separazione ha guidato la struttura della pipeline.

La UI osserva lo stato e invia comandi.

Il servizio e il repository mantengono invece la sessione indipendentemente dalla presenza della schermata.

## La pipeline della posizione

Gli aggiornamenti attraversano una sequenza esplicita:

![Pipeline dei dati di posizione di TrackOMatic](/work/trackomatic/diagrams/location-pipeline.svg)

*Pipeline dei dati di posizione di TrackOMatic.*

`SharedLocationManager` incapsula il `FusedLocationProviderClient` e converte gli aggiornamenti di posizione in un `Flow`.

`TrackingDataSource` mantiene i dati della sessione in corso.

`TrackingRepository` espone posizione, percorso, stato e tempo trascorso attraverso flussi osservabili.

`TrackingServices` raccoglie gli aggiornamenti in background, mentre `ToMViewModel` presenta alla schermata live lo stato necessario per il rendering. Il README conferma che il repository espone `MutableStateFlow` per polyline, stato del tracking e tempo trascorso.

La pipeline separa due responsabilità:

1. ottenere una nuova posizione;
2. decidere se quella posizione debba entrare nella sessione.

Il provider può produrre un nuovo fix anche mentre il tracking è sospeso. In quel caso la posizione può essere utile per aggiornare lo stato corrente, ma non deve necessariamente estendere la polyline o aumentare la distanza.

La decisione appartiene al modello della sessione, non al client di localizzazione.

## `SharedLocationManager` e i `Flow` cold

`SharedLocationManager` utilizza il Fused Location Provider di Google Play Services e apre un `Flow` che emette i nuovi fix.

Nel progetto, le richieste lavorano in modalità ad alta precisione con intervalli compresi tra circa due e cinque secondi. Il requisito progettuale indicava inoltre una nuova posizione almeno ogni cinque secondi e il minor consumo energetico possibile.

Questi due obiettivi sono naturalmente in tensione.

Una frequenza elevata produce un percorso più fluido e riduce gli spazi tra i punti. Tuttavia, può mantenere più attivi i sistemi di localizzazione e aumentare il consumo energetico.

Una frequenza più bassa riduce il lavoro, ma può perdere cambi di direzione e rendere il percorso meno rappresentativo.

La soluzione adottata non pretendeva di ottenere precisione scientifica. Cercava un compromesso sufficientemente utile tra precisione, leggibilità del percorso e consumo energetico.

Il Fused Location Provider è adatto a questo tipo di architettura perché rappresenta il punto di accesso principale ai servizi di localizzazione Google e permette di richiedere aggiornamenti continui con priorità e intervalli configurabili. Oggi, come allora, l'accesso continuativo in background richiede particolare attenzione a permessi e stato foreground dell'applicazione.

## Il servizio di tracking

`TrackingServices` estende `LifecycleService`.

Il servizio osserva i dati del repository e, quando lo stato è `STARTED`, aggiunge alla sessione ogni nuova posizione ricevuta. La stessa componente aggiorna la notifica attraverso `NotificationHelper`.

In forma semplificata:

![Decisione e aggiornamenti prodotti da una nuova posizione in TrackOMatic](/work/trackomatic/diagrams/tracking-decision.svg)

*Decisione e aggiornamenti prodotti da una nuova posizione in TrackOMatic.*

Il vantaggio di questa struttura è che il servizio non deve conoscere il funzionamento della schermata.

Allo stesso modo, `ToMScreen` non deve mantenere direttamente il ciclo di vita della posizione.

Entrambi osservano e modificano lo stesso stato tramite il repository, ma con responsabilità differenti.

## La notifica foreground

Durante una sessione attiva, una notifica mantiene il tracking visibile nel pannello di sistema.

Questo elemento non rappresenta soltanto un requisito tecnico.

È anche una parte dell'esperienza utente.

Quando un'applicazione continua a utilizzare la posizione mentre non è aperta, l'utente deve poter capire che il processo è ancora attivo. La notifica offre:

* visibilità;
* conferma della sessione in corso;
* accesso rapido all'applicazione;
* maggiore continuità durante il background;
* un'indicazione esplicita dell'uso della posizione.

Il foreground service riduce inoltre il rischio che il processo venga trattato come lavoro completamente in background, soggetto alle limitazioni più aggressive applicate da Android.

La struttura adottata era corretta per il periodo del progetto. Tuttavia, una versione moderna dovrebbe dichiarare esplicitamente il tipo di foreground service `location` e gestire i permessi aggiuntivi previsti dalle versioni recenti di Android. A partire da Android 14, il tipo e i relativi permessi devono essere indicati nel manifest e rispettati anche durante l'avvio del servizio.

## Stato della sessione

Una sessione di tracking non è soltanto una lista di coordinate.

Possiede un proprio ciclo di vita:

![Macchina a stati delle sessioni di TrackOMatic](/work/trackomatic/diagrams/session-state.svg)

*Macchina a stati delle sessioni di TrackOMatic.*

A ogni stato corrispondono decisioni differenti:

* se accettare nuove posizioni;
* se aggiornare il timer;
* quali controlli mostrare;
* se mantenere la notifica;
* se permettere il salvataggio;
* se eliminare i dati temporanei.

Rappresentare esplicitamente lo stato evita che la UI debba dedurre il comportamento da combinazioni di variabili come `isRunning`, `hasStarted` e `isPaused`.

Il repository diventa quindi la fonte condivisa per:

* stato;
* ultima posizione;
* percorso;
* tempo;
* dati della sessione.

## Una sessione in memoria prima del cloud

Durante il tracking, i dati rimangono in memoria.

Non avrebbe avuto senso inviare ogni singolo punto immediatamente a Firestore.

Una strategia del genere avrebbe:

* aumentato il numero di operazioni remote;
* legato la continuità del tracking alla rete;
* reso più complessa la cancellazione di una sessione non conclusa;
* introdotto più condizioni intermedie;
* aumentato il costo operativo del backend.

`TrackingDataSource` mantiene quindi il percorso corrente e le informazioni necessarie fino al termine della sessione. Solo quando l'utente decide di salvarla viene costruito il modello persistente e avviato il flusso verso Firebase.

Questa distinzione separa la **sessione temporanea**, ancora appartenente al processo di tracking, dalla **sessione salvata**, validata dall'utente e resa persistente.

Una sessione temporanea appartiene al processo di tracking.

Una sessione salvata appartiene alla cronologia dell'utente e deve rispettare regole di persistenza, sincronizzazione ed eliminazione.

## Calcolo e presentazione delle statistiche

Il modello `Session` conserva:

* velocità media;
* distanza;
* durata;
* calorie stimate;
* polyline;
* timestamp;
* configurazione della mappa;
* URI dell'immagine;
* identificatori della sessione e dell'utente.

Il profilo contiene inoltre età, genere, altezza e peso, mentre le impostazioni conservano stile della mappa e sistema metrico.

La separazione permette di distinguere tra:

* dati prodotti dalla sessione;
* dati personali usati per l'elaborazione;
* preferenze di visualizzazione.

Un cambiamento allo stile della mappa non dovrebbe alterare il significato della distanza. Allo stesso modo, la modifica del peso dell'utente non dovrebbe riscrivere implicitamente ogni dato storico senza una decisione esplicita.

Questa distinzione è importante anche se il progetto non affronta tutti i problemi di versionamento delle statistiche.

Mostra comunque che preferenze, profilo e attività possiedono cicli di vita differenti.

## Architettura MVVM e Clean Architecture

L'applicazione è organizzata secondo una struttura a tre livelli:

![Architettura a livelli di TrackOMatic](/work/trackomatic/diagrams/app-architecture.svg)

*Architettura a livelli di TrackOMatic.*

La direzione indica quale livello può conoscere il successivo.

### Presentation

Contiene:

* schermate Compose;
* ViewModel;
* `UIState`;
* eventi della UI;
* navigazione;
* validazione legata alla presentazione.

### Domain

Contiene:

* modelli;
* use case;
* validatori;
* adattatori;
* rappresentazione uniforme delle risposte.

### Data

Contiene:

* repository;
* accesso a Firebase;
* tracking data source;
* location manager;
* servizi;
* implementazioni remote.

Il README descrive i use case come interfaccia tra ViewModel e repository e assegna a ogni schermata un proprio ViewModel, stato ed eventi.

L'obiettivo non era soltanto distribuire i file in cartelle.

Era rendere esplicita la domanda:

> Quale componente possiede questa decisione?

Una schermata possiede la disposizione degli elementi.

Un ViewModel possiede lo stato necessario alla schermata.

Un use case descrive un'operazione del dominio.

Un repository decide come ottenere o modificare i dati.

## `Response<T>`

Le operazioni asincrone utilizzano una sealed class comune:

```kotlin
sealed class Response<out T> {
    object Loading : Response<Nothing>()

    data class Success<out T>(
        val data: T?
    ) : Response<T>()

    data class Failure(
        val e: Exception
    ) : Response<Nothing>()
}
```

Il wrapper distingue tra:

* operazione in corso;
* risultato disponibile;
* errore.

Questo permette ai ViewModel di trasformare risposte provenienti da repository differenti in un modello uniforme per la UI. Il repository può comunicare con Auth, Firestore o Storage, ma lo schermo continua a ricevere uno stato comprensibile.

La soluzione è semplice e presenta alcuni limiti.

`Failure` conserva direttamente un'eccezione, quindi il livello superiore deve ancora decidere come tradurla in un messaggio utile. `Success<T?>` permette inoltre valori nulli che possono richiedere controlli ulteriori.

Per il progetto, tuttavia, forniva un linguaggio comune sufficiente per evitare che ogni operazione inventasse un proprio sistema di caricamento ed errore.

## Eventi e `UIState`

Ogni schermata definisce gli eventi che può produrre.

Ad esempio, una schermata di registrazione può generare eventi per:

* modifica dell'email;
* modifica della password;
* cambio del focus;
* accettazione dei termini;
* conferma della registrazione.

Il ViewModel riceve questi eventi, valida i valori e aggiorna il rispettivo `UIState`.

![Flusso unidirezionale degli eventi e dello stato UI di TrackOMatic](/work/trackomatic/diagrams/ui-state-flow.svg)

*Flusso unidirezionale degli eventi e dello stato UI di TrackOMatic.*

Questo riduce il numero di funzioni esposte direttamente dal ViewModel e rende più esplicito l'insieme delle azioni accettate da una schermata. Il pattern è documentato nel repository attraverso classi come `SignUpUIEvent` e i relativi `UIState`.

## L'eccezione del `ToMViewModel`

La struttura non viene applicata in modo completamente rigido.

`ToMViewModel` è l'unico ViewModel che accede direttamente a `TrackingRepository`, evitando il passaggio attraverso un gruppo di use case dedicati.

La scelta è dichiarata esplicitamente nel repository. Il ViewModel osserva direttamente:

* stato del tracking;
* ultima posizione;
* percorso completo;
* tempo trascorso.

Continua invece a utilizzare use case per profilo, impostazioni, salvataggio della sessione e caricamento dell'immagine.

In una lettura puramente formale, questa è un'incoerenza.

Dal punto di vista del progetto, è un compromesso ragionato.

La schermata live consuma diversi flussi strettamente collegati, prodotti dallo stesso repository e aggiornati con alta frequenza. Aggiungere un use case differente per ogni `StateFlow` avrebbe aumentato il numero di classi senza introdurre una reale decisione di dominio.

La regola utile non è quindi:

> Ogni repository deve sempre essere nascosto dietro un use case.

È piuttosto:

> Un livello aggiuntivo deve esistere quando chiarisce una responsabilità.

La Clean Architecture rimane uno strumento.

Non deve diventare l'obiettivo del progetto.

## Navigazione separata per responsabilità

La navigazione utilizza quattro grafi:

![Responsabilità dei grafi di navigazione di TrackOMatic](/work/trackomatic/diagrams/navigation-structure.svg)

*Responsabilità dei grafi di navigazione di TrackOMatic.*

`LaunchNavGraph` gestisce l'avvio e conduce a `InitScreen`.

`AuthNavGraph` contiene:

* `SignInScreen`;
* `SignUpScreen`;
* `RestoreScreen`;
* `VerifyScreen`.

`MainNavGraph` contiene:

* `HomeScreen`;
* `ToMScreen`;
* `ProfileScreen`;
* `SettingsScreen`.

`RootNavGraph` compone i grafi e decide quale ramo rendere attivo. La `MainActivity` rimane così un contenitore sottile che crea il grafo principale.

Complessivamente, il progetto contiene nove schermate principali:

1. `InitScreen`;
2. `SignInScreen`;
3. `SignUpScreen`;
4. `RestoreScreen`;
5. `VerifyScreen`;
6. `HomeScreen`;
7. `ToMScreen`;
8. `ProfileScreen`;
9. `SettingsScreen`.

A queste si aggiungono dialog e componenti strutturali, come `SaveDialog`, `PermissionDialog`, `StatisticsDialog`, `EditProfileDialog` e la barra di navigazione inferiore.

La divisione evita che autenticazione, bootstrap e applicazione principale condividano indiscriminatamente le stesse route.

## Jetpack Compose

L'interfaccia è costruita interamente con Jetpack Compose.

Il progetto utilizza Compose `1.3.3`, Navigation Compose, Maps Compose, Coil, Accompanist, Lottie e componenti aggiuntivi per screenshot e selezione dei colori. È compilato con Kotlin `1.8.0`, `compileSdk 33`, `targetSdk 33` e `minSdk 21`.

Compose si adattava bene al modello reattivo dell'applicazione. Repository, `Flow` e `StateFlow` alimentano il `ViewModel`, che produce lo `UIState` renderizzato dai `Composable`. Questo percorso è incluso nell'architettura applicativa mostrata in precedenza.

La schermata non deve chiedere continuamente se i dati siano cambiati.

Osserva uno stato e viene ricomposta quando quel valore cambia.

Questo approccio è particolarmente utile nella schermata di tracking, dove tempo, posizione, polyline e stato dei controlli evolvono durante la sessione.

## Le schermate principali

### `InitScreen`

È il punto di ingresso.

Interroga lo stato dell'utente e decide se proseguire verso autenticazione o applicazione principale.

### `SignInScreen`

Gestisce email, password e accesso Google One Tap.

### `SignUpScreen`

Gestisce registrazione, validazione dei campi e accettazione delle condizioni.

### `RestoreScreen`

Avvia il recupero della password.

### `VerifyScreen`

Blocca l'accesso alle funzioni principali finché l'indirizzo email non è stato verificato, quando la registrazione utilizza email e password.

### `HomeScreen`

Mostra la cronologia delle sessioni e le relative miniature. Da ogni elemento è possibile aprire `StatisticsDialog` e consultare o eliminare l'attività.

### `ToMScreen`

È la schermata centrale del tracking. Mostra mappa, posizione, polyline, timer e controlli per avvio, pausa e conclusione.

### `ProfileScreen`

Presenta le statistiche aggregate e una timeline ordinata per data.

### `SettingsScreen`

Gestisce mappa, metriche, dati del profilo, logout e cancellazione dell'account.

Questa struttura è documentata nel README del progetto insieme ai rispettivi ViewModel e use case.

![Cronologia delle sessioni con miniature dei percorsi](/work/trackomatic/home_screen.png)

![Statistiche aggregate con timeline per sessione](/work/trackomatic/profile_screen.png)

## Google Maps e la polyline

Google Maps viene utilizzato sia durante il tracking sia nella consultazione delle sessioni salvate.

Durante la registrazione, ogni posizione valida contribuisce alla polyline corrente. La schermata osserva il percorso e aggiorna la rappresentazione senza diventare responsabile della raccolta dei punti.

La mappa deve quindi combinare:

* posizione corrente;
* movimento della camera;
* polyline;
* stile scelto dall'utente;
* spessore e colore;
* stato della sessione;
* permessi.

Il modello `MapConfig` conserva stile, larghezza e colore della traccia. Questa configurazione viene inoltre salvata nella sessione, così la relativa anteprima può mantenere la stessa rappresentazione visiva.

Al termine della sessione, l'applicazione genera un'immagine del percorso e la carica su Firebase Storage. L'URI viene associato alla sessione e utilizzato come miniatura nella cronologia. Il repository include infatti dipendenze dedicate agli screenshot Compose e a Coil per il caricamento delle immagini.

## Firebase come backend completo

TrackOMatic utilizza quattro servizi Firebase distinti:

![Architettura dell'integrazione Firebase e dei dati di TrackOMatic](/work/trackomatic/diagrams/firebase-architecture.svg)

*Architettura dell'integrazione Firebase e dei dati di TrackOMatic.*

La separazione riflette responsabilità differenti.

### Authentication

Gestisce:

* email e password;
* verifica dell'email;
* recupero della password;
* sessione utente;
* accesso Google;
* logout;
* revoca dell'accesso Google.

### Firestore

Conserva dati strutturati nelle collezioni:

* `users`;
* `profiles`;
* `settings`;
* `sessions`.

Le query utilizzano `userID` come riferimento per recuperare i dati dell'utente. I repository espongono inoltre profili, impostazioni e sessioni attraverso `Flow`, permettendo alla UI di aggiornarsi quando Firestore produce nuovi valori.

### Storage

Conserva le immagini associate alle sessioni.

Ogni utente dispone di un proprio spazio logico, e l'immagine viene poi richiamata attraverso l'URI salvato nella sessione.

### Functions

Gestisce la pulizia dei dati quando l'account viene eliminato.

La funzione rimuove i riferimenti dell'utente da Firestore e Storage, evitando di lasciare dati non più raggiungibili dopo la cancellazione dall'autenticazione.

## Separare `users`, `profiles` e `settings`

Il progetto utilizza documenti distinti per:

* identità applicativa;
* dati personali;
* preferenze.

Questa separazione evita di trasformare il documento utente in un contenitore generico modificato da qualsiasi funzione.

I tre gruppi hanno infatti cicli di vita differenti.

`users` segue principalmente lo stato di autenticazione.

`profiles` contiene dati come età, genere, altezza e peso.

`settings` contiene preferenze come stile della mappa e sistema metrico.

In forma semplificata, `users` possiede l'identità applicativa, `profiles` i dati utilizzati per le statistiche e `settings` le preferenze di presentazione. Questa proprietà è resa esplicita nel diagramma Firebase precedente.

Separarli rende più leggibili repository, regole e aggiornamenti.

Una modifica al colore della polyline non deve riscrivere il profilo. Una modifica del peso non deve necessariamente coinvolgere il documento delle impostazioni.

## Il ciclo di salvataggio

Al termine della sessione, `SaveDialog` permette di:

* annullare e tornare al tracking;
* eliminare la sessione;
* salvarla.

Il percorso di salvataggio comprende almeno due operazioni remote:

1. caricare l'immagine;
2. salvare i dati della sessione.

La schermata rimane bloccata finché l'operazione non è conclusa correttamente, poi torna alla cronologia.

Questo introduce una piccola transazione distribuita.

Firestore e Storage non vengono aggiornati attraverso un'unica operazione atomica. Di conseguenza, il codice deve stabilire un ordine e gestire i possibili fallimenti intermedi.

Lo stesso vale per l'eliminazione di una singola sessione: `HomeViewModel` utilizza use case distinti per eliminare i dati e la relativa immagine.

Il progetto non implementa un sistema transazionale completo tra i due servizi, ma rende esplicita la relazione tra le risorse.

È un dettaglio importante.

Quando un dato logico è distribuito tra database e storage, eliminarne soltanto una parte produce inconsistenze.

## Cancellazione dell'account

La cancellazione dell'account è uno dei flussi più completi dell'applicazione.

Non basta rimuovere l'utente da Firebase Authentication.

Devono essere gestiti anche:

* token Google;
* documenti Firestore;
* immagini in Storage;
* sessione locale;
* navigazione verso l'area di autenticazione.

Il repository descrive l'uso di una Cloud Function per eliminare tutti i riferimenti collegati allo `userID` da Firestore e Storage.

Questo rende il backend responsabile della pulizia anche nel caso in cui l'applicazione venga chiusa durante la procedura.

La lezione è semplice: la cancellazione dei dati non è un pulsante.

È una funzione di prodotto con conseguenze distribuite tra più sistemi.

## Dagger Hilt

Dagger Hilt costruisce il grafo delle dipendenze.

Viene utilizzato per fornire:

* repository;
* servizi;
* data source;
* componenti Firebase;
* location manager;
* ViewModel.

Il vantaggio principale non è evitare ogni chiamata al costruttore.

È rendere esplicito quali componenti vivano a livello di applicazione, quali appartengano a una schermata e quali debbano essere condivisi. Il repository documenta l'uso di Hilt proprio per ridurre l'iniezione manuale e collegare le dipendenze al ciclo di vita Android.

In una pipeline di tracking questo aspetto è particolarmente importante.

Repository, servizio e ViewModel devono osservare la stessa sessione, non istanze differenti costruite accidentalmente in punti separati.

## Batteria e precisione

Una delle lezioni principali del progetto riguarda il rapporto tra qualità del dato e costo energetico.

Richiedere la massima precisione disponibile non significa automaticamente produrre l'esperienza migliore.

Un tracker deve considerare:

* frequenza degli aggiornamenti;
* qualità del segnale;
* movimento reale;
* durata prevista della sessione;
* rendering della mappa;
* attività in background;
* frequenza di aggiornamento della notifica;
* lavoro svolto per ogni nuovo punto.

Ridurre il consumo non significa soltanto aumentare l'intervallo della posizione.

Significa anche evitare lavoro duplicato.

Il provider deve ottenere il fix.

Il repository deve aggiornare lo stato.

Il servizio deve decidere se aggiungerlo.

La UI deve limitarsi a rappresentare il risultato.

Se ogni livello eseguisse nuovamente calcoli o trasformazioni, il consumo aumenterebbe senza migliorare la qualità del percorso.

## Correttezza prima dell'astrazione

TrackOMatic utilizza un'architettura più strutturata di quanto sarebbe strettamente necessario per un piccolo prototipo.

Questo ha reso visibili sia i vantaggi sia i costi della separazione.

I vantaggi:

* responsabilità riconoscibili;
* schermate più semplici;
* repository sostituibili;
* stato uniforme;
* flussi asincroni espliciti;
* backend suddiviso per responsabilità.

I costi:

* numerose classi;
* più passaggi per seguire una funzione;
* use case molto piccoli;
* adattatori e wrapper che non sempre aggiungono logica;
* maggiore lavoro iniziale.

L'eccezione del `ToMViewModel` è probabilmente la parte più utile dell'intero esperimento architetturale.

Mostra che una regola può essere infranta quando il risultato è più comprensibile e il confine rimane comunque chiaro.

## Un progetto del suo periodo

TrackOMatic riflette lo stack Android con cui è stato costruito tra la fine del 2022 e l'inizio del 2023.

Il repository utilizza:

* Kotlin `1.8.0`;
* Jetpack Compose `1.3.3`;
* Hilt `2.44.2`;
* Firebase BoM `31.0.3`;
* Google Play Services Location `21.0.1`;
* `compileSdk` e `targetSdk` 33;
* Google One Tap tramite `play-services-auth`.

Queste versioni sono coerenti con il periodo del progetto, ma non rappresentano una base che pubblicherei oggi senza un lavoro di aggiornamento.

In particolare, One Tap per Android è oggi deprecato. Google raccomanda di migrare a Credential Manager, che unifica password, passkey e identità federate come Sign in with Google. Anche Firebase indirizza le nuove integrazioni Google verso Credential Manager.

Una ripresa del progetto richiederebbe inoltre di rivedere:

* target SDK;
* permessi di localizzazione;
* foreground service type;
* restrizioni sull'avvio dei servizi;
* autenticazione Google;
* dipendenze Compose e Firebase;
* comportamento in caso di posizione approssimativa;
* gestione delle versioni recenti di Android.

Questo non riduce il valore del progetto.

Al contrario, rende esplicito che si tratta di un caso studio storico e completo, non di un'applicazione pronta per una pubblicazione immediata nel 2026.

## Cosa ho imparato

### Il tracking non appartiene alla mappa

La mappa rappresenta la sessione.

Non deve possederla.

Quando questa distinzione è chiara, background, notifica e ricomposizione diventano più semplici da gestire.

### La batteria fa parte dell'UX

Un percorso preciso per cinque minuti non è sufficiente se la stessa strategia rende inutilizzabile il telefono durante un'escursione lunga.

La precisione deve essere proporzionata allo scopo del prodotto.

### L'architettura deve spiegare il codice

Un livello che non aggiunge una decisione, un confine o una trasformazione può essere soltanto rumore.

Il bypass intenzionale del domain layer nel tracking è stato un compromesso più utile di una separazione applicata meccanicamente.

### Il backend completa il prodotto

Finché i dati sono simulati, molti problemi non esistono.

Quando entrano autenticazione, Storage, Firestore e cancellazione dell'account, emergono immediatamente:

* fallimenti intermedi;
* dati orfani;
* sincronizzazione;
* proprietà delle risorse;
* autorizzazione;
* consistenza.

### Eliminare è difficile quanto salvare

Salvare una sessione significa creare dati e immagini correlate.

Eliminarla significa rimuovere entrambe senza lasciare residui.

Eliminare un account estende lo stesso problema a ogni risorsa dell'utente.

## Stato del progetto

TrackOMatic è un progetto concluso e archiviato.

Il repository rimane pubblico come documentazione di un'app Android nativa che combina:

* Jetpack Compose;
* MVVM;
* Clean Architecture;
* StateFlow e Coroutines;
* tracking in background;
* foreground notification;
* Google Maps;
* Firebase Authentication;
* Firestore;
* Storage;
* Functions;
* dependency injection con Hilt.

Il README include inoltre requisiti, modelli, descrizione delle schermate, repository, use case, navigazione e possibili sviluppi futuri, tra cui OpenStreetMap, importazione ed esportazione GPX, condivisione delle sessioni, punti di interesse e percorsi fantasma.

Non esiste però una roadmap di sviluppo attiva.

Il suo valore attuale è quello di un caso studio completo: mostra come avevo affrontato, in quel momento, un problema Android che attraversava UI, architettura, sistema operativo e backend.

## Conclusione

TrackOMatic è nato per registrare un percorso.

Il progetto è diventato rapidamente qualcosa di più ampio.

Una posizione prodotta dal telefono doveva attraversare sensori e servizi Google, `Flow`, data source e repository. Da lì, servizio foreground e `ViewModel` mantenevano la sessione e lo stato visibile, mentre interfaccia e Firebase fornivano presentazione e persistenza.

Ogni passaggio introduceva una responsabilità:

* ottenere il dato;
* decidere se conservarlo;
* aggiornare la sessione;
* rappresentarlo;
* salvarlo;
* sincronizzarlo;
* eliminarlo.

La parte più importante del progetto non è quindi la polyline disegnata sulla mappa.

È il percorso architetturale che permette a quella linea di continuare a esistere quando la schermata scompare, di diventare una sessione quando l'utente la salva e di essere eliminata completamente quando non serve più.

In sostanza, TrackOMatic mi ha mostrato che una funzione apparentemente comune diventa interessante nel momento in cui viene trattata come un prodotto completo.

Ed è proprio questo il valore che il progetto conserva ancora oggi.

## Stack

Android · Kotlin · Jetpack Compose · MVVM · Clean Architecture · Coroutines · Flow · StateFlow · LifecycleService · Fused Location Provider · Google Maps · Firebase Auth · Firestore · Storage · Functions · Dagger Hilt
