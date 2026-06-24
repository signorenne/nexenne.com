---
title: "Recensione di openSUSE Tumbleweed"
lang: it
date: 2024-08-01
desc: "La mia esperienza con openSUSE Tumbleweed tra rolling release, KDE, stabilità e piccoli compromessi quotidiani."
read: "6 min"
tags: ["OS"]
categories: ["GNU/Linux", "Analisi"]
image: "/blog/covers/opensuse_tubleweed_review.jpeg"
---
## Introduzione
Dopo aver lasciato Arch Linux sono passato a openSUSE Tumbleweed, che nel tempo è diventato il mio sistema operativo principale. L'ho usato per diversi mesi nello sviluppo software, per il gaming, nelle attività d'ufficio e nell'uso quotidiano.

La caratteristica che apprezzo di più è l'equilibrio tra aggiornamenti frequenti e affidabilità. Tumbleweed è una distribuzione rolling release, ma usa un processo di test che riduce molti dei problemi normalmente associati a questo modello.

Dopo aver provato diverse distribuzioni negli anni, Tumbleweed si distingue soprattutto per l'integrazione con KDE Plasma, gli strumenti di amministrazione e la qualità degli aggiornamenti. In questo articolo raccolgo gli aspetti che ho apprezzato e i compromessi incontrati.

## Cosa funziona bene
### Stabile e all'avanguardia
openSUSE Tumbleweed è una distribuzione rolling release, o a rilascio continuo, che offre agli utenti le caratteristiche e gli sviluppi più recenti del mondo Linux: kernel, driver, ambienti desktop e applicazioni aggiornate.

Questo è utile per utenti avanzati, sviluppatori software e videogiocatori che hanno bisogno di pacchetti recenti.

Tumbleweed viene aggiornato continuamente, quindi non richiede grossi avanzamenti di versione ogni sei mesi come accade con altre distribuzioni GNU/Linux.

Questa distribuzione non utilizza rigidi cicli di rilascio periodici, ma si basa su Factory, la base di sviluppo di openSUSE, aggiornata frequentemente.

Ogni aggiornamento, che segue un rigido standard industriale e un rigoroso processo di garanzia di qualità, viene pubblicato dopo aver superato test approfonditi e controlli di qualità attraverso la piattaforma openQA.

In sostanza, ogni nuova versione di un pacchetto viene testata individualmente e insieme ad altri gruppi di versioni, assicurando così la coerenza complessiva del sistema.

Inoltre, openSUSE utilizza un filesystem moderno come Btrfs, che consente agli utenti di creare istantanee dello stato del sistema e di eseguire il rollback a uno stato precedente in caso di problemi.

Tutto questo rende Tumbleweed un sistema adatto all'uso quotidiano anche se resta una rolling release. Una volta installato e configurato, può essere usato con continuità, a patto di mantenerlo aggiornato.

### YaST e Snapper
Tumbleweed include YaST, un pannello di controllo molto completo.
YaST, acronimo di Yet another Setup Tool, permette di gestire utenti, stampanti, sorgenti software, boot loader, partizioni, servizi, rete, virtualizzazione, AppArmor e altre parti del sistema da un'unica interfaccia.

OST mette a disposizione anche Snapper, creato da Arvin Schnell, per gestire le istantanee dei subvolumi del file system Btrfs e dei volumi LVM thin-provisioned.
Oltre a creare ed eliminare istantanee, anche pianificate e automatiche, Snapper permette di confrontarle e ripristinare le differenze.
In pratica consente di visualizzare versioni precedenti dei file e recuperare modifiche in modo controllato.

Insieme, YaST e Snapper semplificano l'amministrazione del sistema e rendono più semplice recuperare una configurazione funzionante dopo un aggiornamento problematico.

### Configurazione intuitiva
Partiamo dall'installazione. L'installer di Tumbleweed è, a mio avviso, il più completo e semplice che ho mai incontrato.
Permette di avere pieno controllo su quello che verrà installato e fornisce una configurazione di default più che sufficiente per la maggior parte degli utenti.
Io prediligo e consiglio sempre di abilitare la cifratura completa del disco e il Logical Volume Management per gestire al meglio le risorse fisiche.

A installazione ultimata, se si dovesse avere bisogno di codec di terze parti, basterà installare opi, un front-end per accedere all'Open Build Service di openSUSE.
Per ottenere direttamente tutti i codec, basterà usare il comando `opi codecs`, che abiliterà nuovi repository e installerà i codec.

Se dovessero servirvi i driver per la vostra scheda grafica NVIDIA, potranno essere installati direttamente da YaST oppure con il semplice comando `zypper install-new-recommends --repo NVIDIA`.

## I lati negativi
Uno dei principali svantaggi di Tumbleweed è la possibile incompatibilità temporanea con alcuni moduli del kernel di terze parti o driver proprietari, soprattutto quelli grafici. Il kernel viene aggiornato frequentemente e alcuni componenti esterni potrebbero non essere subito compatibili con la nuova versione.
La soluzione è compilare direttamente da sorgente tali moduli o driver, oppure evitare di usarli completamente.

Inoltre, l'installazione di software di terze parti non presenti nei repository, anche attraverso YaST Software, provoca un errore di integrity check. L'errore può essere facilmente ignorato e il software verrà comunque installato correttamente.

Nota dolente: il continuo scontro tra PackageKit e YaST Software. Rimuovendo il pacchetto PackageKit il problema sparisce.

openSUSE rimane una distribuzione di nicchia, quindi la documentazione di terze parti è meno abbondante. La documentazione ufficiale è ottima, anche se può risultare più essenziale rispetto a quella di distribuzioni come Fedora o Ubuntu.

Chiudo con un fastidio più che con un vero problema. Abilitando repository di terze parti, soprattutto Packman, possono comparire conflitti tra versioni dei pacchetti e aggiornamenti di sistema. Di solito basta aspettare qualche giorno prima di aggiornare oppure usare le versioni Flatpak delle applicazioni interessate.

## Conclusione
Nella mia esperienza, openSUSE Tumbleweed offre pacchetti recenti senza sacrificare l'affidabilità del sistema. openQA, Btrfs, Snapper e YaST formano una base solida per una distribuzione rolling release.

I compromessi principali riguardano i moduli esterni al kernel e i possibili conflitti tra repository. Per ridurre questi problemi preferisco limitare i repository di terze parti e usare Flatpak per le applicazioni che richiedono codec proprietari. Con queste accortezze, Tumbleweed si è dimostrata una buona distribuzione per il lavoro e l'uso quotidiano.
