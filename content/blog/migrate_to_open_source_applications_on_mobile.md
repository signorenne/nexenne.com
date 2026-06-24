---
title: "Migrare verso applicazioni open source su smartphone"
lang: it
date: 2024-06-29
desc: "Dopo il passaggio a GrapheneOS ho iniziato a sostituire le app principali con alternative più rispettose della privacy."
read: "5 min"
tags: ["OSS", "Android"]
categories: ["Software", "Mobile"]
image: "/blog/covers/migrate_to_open_source_applications_on_mobile.jpg"
---
## Introduzione
Dopo essere passato a GrapheneOS ho deciso di sostituire molte app con alternative più rispettose della privacy.
Mi sono accorto, però, di quanto dipendessi dalle applicazioni delle grandi piattaforme.

Le applicazioni che usavo di più sul mio vecchio Samsung S10 erano queste:

- WhatsApp.
- Suite Google: Mail, Calendar e Drive.
- Suite Google Workspace.
- YouTube.
- Google Maps.
- Google Play Store.

Ovviamente queste sono solo alcune delle applicazioni principali che utilizzavo.
In pratica, buona parte della mia vita digitale passava da Google, Microsoft e Meta.

Ho quindi cercato alternative open source e più attente alla privacy, accettando alcuni compromessi rispetto ai servizi che usavo in precedenza.

## Sostituire WhatsApp
Questa è stata la fase più difficile, non per la scelta dell'app ma per la migrazione.
Oggi quasi tutti usano WhatsApp, che per molte persone è diventato il canale principale.
Ho dovuto avvisare tutti i miei contatti del cambiamento e del fatto che a breve non sarei più stato reperibile su WhatsApp.
Le domande non sono mancate.
Alla fine sono passato a Signal Messenger e mi hanno seguito in pochi. Per me non era un grande problema: chi voleva contattarmi poteva comunque chiamarmi, invece di mandarmi messaggi o audio interminabili.

Perché Signal e non alternative come Session, Briar, Element o SimpleX Chat?

In breve:

Gli elenchi di contatti su Signal sono crittografati utilizzando il PIN di Signal e il server non ha accesso ad essi.
Anche i profili personali sono crittografati e condivisi solo con i contatti con cui si chatta.
Signal supporta i gruppi privati, in cui il server non ha alcuna traccia dell'appartenenza al gruppo, dei titoli del gruppo, degli avatar del gruppo o degli attributi del gruppo.
Signal ha metadati minimi quando è abilitato il Sealed Sender.
L'indirizzo del mittente è crittografato insieme al corpo del messaggio e solo l'indirizzo del destinatario è visibile al server.
Sealed Sender è abilitato solo per le persone presenti nell'elenco dei contatti, ma può essere abilitato per tutti i destinatari, con un rischio maggiore di ricevere spam.

Inoltre, il protocollo è stato sottoposto a verifiche indipendenti e le sue specifiche sono pubbliche.

Ciliegina sulla torta: l'interfaccia utente di Signal è molto simile a quella di WhatsApp.

## Sostituire la suite Google: Mail, Calendar e Drive
Questi sono alcuni dei provider che ho valutato, suddivisi per categoria.

Servizi email:

- Proton Mail
- Tutanota
- Mailbox.org

Servizi cloud storage:

- Proton Drive
- Tresorit
- Peergos

Servizi di calendario:

- Proton Calendar
- Tuta (calendario di Tutanota)

Le opzioni erano due: separare tutti i servizi o affidarsi a un'unica azienda.

Ho quindi fatto la mia scelta, passando al pacchetto di Proton.
Le motivazioni che mi hanno portato a questa conclusione sono molteplici.
Ho scelto Proton perché riunisce posta, calendario e spazio cloud in un unico servizio, con applicazioni curate e un modello orientato alla privacy.

In sintesi ho sostituito Gmail, Google Calendar e Google Drive con Proton Mail, Proton Calendar e Proton Drive.

## Rimpiazzare la suite Google Workspace
Purtroppo per questa non ho trovato una valida alternativa.
La scelta che ho fatto è stata abbinare Collabora Office per l'editing dei documenti a Syncthing per la sincronizzazione.

Questo perché Collabora Online (Office) non è un software autonomo.
Al contrario, la suite per ufficio online si integra in un'infrastruttura esistente e richiede una soluzione cloud come base (NextCloud, Dropbox, ecc...).

## Rimpiazzare YouTube
Uso YouTube principalmente per documentarmi, ma anche per svago.
In questo caso continuo a usare la piattaforma di Google, ma attraverso un client di terze parti.

Fortunatamente non ho dovuto fare molta ricerca: usavo già NewPipe da diversi anni.

NewPipe è un'applicazione open source, ricca di funzioni e rispettosa della privacy, che permette di guardare i video pubblicati su YouTube.
L'app offre molte funzioni dell'esperienza YouTube senza annunci invasivi e senza le autorizzazioni richieste dall'app ufficiale.
In più è open source e il codice è consultabile su GitHub.

## Rimpiazzare Google Maps
Qui l'unica soluzione è passare a un client basato su OpenStreetMap.

Le alternative sono:

- OsmAnd
- Organic Maps
- Magic Earth

Le prime due sono eccezionali sia nella consultazione delle mappe che nelle funzionalità offerte, tuttavia peccano nella navigazione in tempo reale. Durante la navigazione, spesso consigliano strade secondarie molto scomode o selezionano percorsi che allungano inutilmente il tragitto.
La terza eccelle dove le altre falliscono, tuttavia il codice sorgente di questo applicativo non è consultabile.

Uso principalmente Organic Maps per l'interfaccia pulita e per le escursioni. Quando devo guidare su percorsi stradali che non conosco, preferisco invece Magic Earth.

## Rimpiazzare Google Play Store
Come per YouTube, una soluzione consiste nell'usare un client alternativo per accedere al catalogo del Play Store.
L'unica app che svolge questa mansione impeccabilmente è Aurora Store.
Aurora Store è una alternativa gratuita al Google Play Store.
Con questa app è possibile scaricare applicazioni, aggiornare quelle già esistenti, ricevere dettagli sui tracker in-app, nascondere la propria posizione, cercare applicazioni e fare molto altro.
Gli sviluppatori di Aurora hanno anche curato molto il design e l'interfaccia dell'app.

## Conclusione
Sostituire le applicazioni più diffuse richiede compromessi: a volte si perde comodità, altre volte si guadagna controllo. Per me il passaggio ha avuto senso perché ha ridotto la dipendenza dalle piattaforme principali senza rendere lo smartphone scomodo da usare.
