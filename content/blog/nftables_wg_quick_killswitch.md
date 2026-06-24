---
title: "Kill switch per wg-quick e nftables"
lang: it
date: 2024-05-20
lastmod: 2024-04-20
desc: "Come ho portato le regole di kill switch da iptables a nftables dentro una configurazione wg-quick."
read: "1 min"
tags: ["GNU/Linux", "HowTo", "Administration", "VPN", "Command Line"]
categories: ["Management", "Tutorial", "GNU/Linux"]
image: "/blog/covers/nftables_wg_quick_killswitch.jpeg"
---
## Introduzione
Un kill switch impedisce al traffico di uscire attraverso la connessione ordinaria quando il tunnel WireGuard non è attivo, evitando di esporre accidentalmente l'indirizzo IP reale.

Dopo il passaggio da iptables a nftables, ho dovuto tradurre le regole nella configurazione del peer di wg-quick.
Dato che non ho trovato informazioni utili al momento della configurazione, ho deciso di condividere la soluzione che ho usato.

## Configurazione
Questa configurazione presuppone che le regole nftables vengano ricaricate tramite il sistema di init.

Nel file di configurazione di wg-quick aggiungiamo queste due righe.

```bash
PostUp = nft insert rule <family> <table> <chain> ip oifname != "%i" mark != $(wg show %i fwmark) fib daddr type != local counter reject
PostDown = systemctl restart <service>
```

Queste righe vanno adattate al vostro sistema e al vostro firewall.

### PostUp
Eseguiamo `nft list ruleset` e cerchiamo la catena che contiene `type filter hook output`.

Ora adattiamo la riga `PostUp` con le informazioni trovate. Nel mio caso questa istruzione si trova nella tabella `firewalld`, parte della famiglia `inet`, nella chain `filter_OUTPUT`.

### PostDown
Nella riga `PostDown` inseriamo il comando necessario a ricaricare il firewall. Nell'esempio viene usato systemd.

## Esempio
```bash
PostUp = nft insert rule ip inet firewalld filter_OUTPUT oifname != "%i" mark != $(wg show %i fwmark) fib daddr type != local counter reject
PostDown = systemctl restart firewalld.service
```
