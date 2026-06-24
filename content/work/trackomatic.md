---
title: TrackOMatic · tracker Android per attività all'aperto
lang: it
client: Personale · progetto archiviato
role: Designer e sviluppatore
year: Novembre 2022–febbraio 2023
summary: "Ho progettato e sviluppato un'app Android nativa per registrare e analizzare attività all'aperto, con tracciamento in background, mappe, statistiche e sincronizzazione Firebase. Progetto concluso e archiviato."
tags: [Android, Kotlin, Jetpack Compose, Firebase, MVVM, Dagger Hilt, Google Maps, Coroutines]
color: cyan
accent: Android nativo · tracking attento alla batteria
metrics:
  - { k: Repo, v: github.com/signorenne/trackomatic }
  - { k: Stack, v: Kotlin · Jetpack Compose }
  - { k: Stato, v: Concluso · archiviato }
---

## Il contesto

Ho costruito TrackOMatic come progetto Android personale per affrontare, in un'unica applicazione, aspetti che spesso vengono studiati separatamente: interfaccia, architettura, geolocalizzazione in tempo reale, autenticazione e backend. Volevo registrare escursioni e corse, vedere subito il percorso sulla mappa e gestire una sessione senza perdersi in menu inutili.

La difficoltà non era inventare una funzione nuova, ma realizzare bene una funzione comune. Il percorso doveva essere abbastanza preciso da risultare utile, senza consumare la batteria come un navigatore dedicato. Allo stesso tempo, il codice doveva rimanere leggibile anche quando permessi, servizi in background, dati remoti e stato dell'interfaccia iniziavano a intrecciarsi.

Il codice è su [github.com/signorenne/trackomatic](https://github.com/signorenne/trackomatic).

![Schermata di tracking con mappa live, polyline e timer](/work/trackomatic/tom_screen.png)

## Cosa fa l'app

L'utente accede, apre la schermata di registrazione e avvia una nuova attività. La mappa mostra la posizione corrente e disegna il percorso in tempo reale, mentre il pannello inferiore aggiorna durata, distanza e statistiche principali. Al termine viene mostrato un riepilogo con velocità media, distanza, tempo e calorie stimate; la sessione entra poi nella cronologia personale con un'anteprima del percorso.

Le statistiche vengono aggregate nella schermata profilo, così l'utente può leggere l'andamento delle ultime attività senza aprire ogni sessione una per una. Dalle impostazioni può cambiare stile della mappa e sistema di misura, oltre ad aggiornare i dati del profilo usati per il calcolo delle calorie.

## Architettura

Ho organizzato l'app secondo MVVM e Clean Architecture, con tre livelli e una direzione delle dipendenze chiara: **presentation → domain → data**. I ViewModel usano i casi d'uso invece di accedere direttamente ai repository. Le operazioni restituiscono una `Response<T>` (`Loading | Success | Failure`), così caricamento, risultato ed errore vengono gestiti in modo uniforme. Lo stato arriva alla UI tramite `StateFlow`, mentre Dagger Hilt costruisce il grafo delle dipendenze.

![Diagramma ad alto livello dell'architettura di TrackOMatic](/work/trackomatic/plantuml-z3a0B9.png)

La navigazione è divisa in quattro grafi (`Root`, `Launch`, `Auth`, `Main`) per tenere separati bootstrap, autenticazione e app principale. In questo modo la `MainActivity` resta un contenitore sottile e le schermate possono evolvere senza portarsi dietro tutta la logica di avvio.

## Backend (Firebase)

Il backend è interamente su Firebase. Ho tenuto quattro responsabilità separate:

- **Auth**: accesso con email e password, verifica dell'account e Google One-Tap. Alla cancellazione dell'account viene revocato anche il token Google.
- **Firestore**: quattro collezioni indicizzate per `userID`: `users`, `profiles`, `settings`, `sessions`. Le letture arrivano come `Flow`, quindi una modifica su Firestore si riflette nello schermo senza un refresh manuale.
- **Storage**: ogni sessione conserva un'immagine della polyline nello spazio dell'utente, usata come miniatura nella cronologia.
- **Functions**: quando un account viene eliminato, una cloud function pulisce Firestore e Storage per evitare dati orfani.

Ho scelto di non accorpare `users`, `profiles` e `settings` nello stesso documento perché avevano ritmi e regole diverse. Le impostazioni possono cambiare spesso; i dati del profilo servono al calcolo delle calorie e cambiano raramente; `users` rispecchia Auth ed è in sola lettura dall'app. Separarli ha reso più chiare le modalità di lettura, le regole di sicurezza e le operazioni di scrittura.

## Pipeline di tracking

Gli aggiornamenti di posizione attraversano una piccola pipeline di `Flow` cold:

```
FusedLocationProvider → SharedLocationManager → TrackingDataSource → TrackingRepository
```

`SharedLocationManager` incapsula il fused location client ed espone un Flow che emette ogni nuovo fix. `TrackingDataSource` mantiene in memoria la sessione in corso: ultima posizione, polyline completa e millisecondi trascorsi. `TrackingRepository` espone quei dati come `MutableStateFlow`, così le schermate interessate possono aggiornarsi in modo reattivo.

Un `LifecycleService` chiamato `TrackingServices` osserva il repository in background. Quando il tracking è `STARTED` e arriva una nuova posizione, il servizio la aggiunge alla sessione attiva. Una notifica foreground (`NotificationHelper`) mantiene la sessione visibile nell'area notifiche e riduce il rischio che Android interrompa il servizio quando l'app passa in background.

Il fused provider lavora in modalità ad alta precisione, con intervalli tra 2 e 5 secondi. È un compromesso: abbastanza frequente da disegnare un percorso fluido, ma sufficientemente misurato da non consumare batteria senza motivo.

Il `ToMViewModel` è l'unico componente che accede direttamente al repository di tracciamento. È una scelta intenzionale: la schermata live ha bisogno dei flussi di posizione, percorso, stato e tempo trascorso, e aggiungere un ulteriore livello non avrebbe reso il codice più chiaro. Nel resto dell'app la separazione rimane più rigorosa.

![Tracking live con dialog di salvataggio, percorso e statistiche](/work/trackomatic/tom_dialog.png)

## UI

La UI è costruita in Jetpack Compose, con otto schermate e uno scaffold con `BottomBar` per la parte principale dell'app.

- `InitScreen`: splash che instrada verso `Auth` o `Main` in base allo stato della sessione.
- `SignInScreen`, `SignUpScreen`, `RestoreScreen`, `VerifyScreen`: login, registrazione, recupero password e verifica account, più Google One-Tap.
- `HomeScreen`: cronologia con miniature dei percorsi. Toccando una riga si apre lo `StatisticsDialog` con le statistiche complete della sessione.
- `ToMScreen`: la schermata di tracking live.
- `ProfileScreen`: statistiche aggregate con grafico timeline.
- `SettingsScreen`: stile mappa, sistema metrico, modifica profilo, logout, cancellazione account.

Ogni schermata definisce il proprio `UIState` e gli eventi che può ricevere. Il ViewModel valida i dati prima di passarli ai composable, che rimangono così più semplici da leggere, testare e provare nelle preview.

![Cronologia delle sessioni con miniature dei percorsi](/work/trackomatic/home_screen.png)

![Statistiche aggregate con timeline per sessione](/work/trackomatic/profile_screen.png)

## Cosa ho imparato

La durata della batteria fa parte dell'esperienza utente. Un tracker può sembrare ottimo nei primi cinque minuti e diventare un problema dopo un pomeriggio di utilizzo. La soluzione migliore non era quella più aggressiva, ma quella più equilibrata: campionamento legato al movimento, responsabilità più chiare tra servizio e ViewModel e una traccia accurata quanto basta, senza trattare il telefono come uno strumento da laboratorio.

Anche la Clean Architecture ha dato buoni risultati, ma ha richiesto alcuni compromessi. L'eccezione del `ToMViewModel`, che comunica direttamente con il repository di tracking, mi ha ricordato che l'architettura deve aiutare a comprendere l'app, non esistere soltanto per rispettare un diagramma.

L'altra lezione riguarda l'ambito del progetto. Quando si costruisce un flusso di salvataggio completo, con backend cloud e cancellazione dell'account, emerge subito quali astrazioni siano fragili. I dati simulati nascondono molti bug. Una cancellazione a cascata tramite `Functions` può sembrare un dettaglio eccessivo, finché non si considera un utente che vuole davvero rimuovere i propri dati: a quel punto diventa parte del prodotto.

## Stato del progetto

TrackOMatic è un progetto concluso e archiviato. Il repository resta disponibile come caso studio completo di un'app Android nativa con tracking in background, architettura a più livelli e backend cloud, ma non ha una roadmap di sviluppo attiva.

## Link

- Sorgente: [github.com/signorenne/trackomatic](https://github.com/signorenne/trackomatic)
