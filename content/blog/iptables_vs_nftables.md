---
title: "iptables vs nftables"
lang: it
date: 2024-05-10
lastmod: 2024-04-20
desc: "Perché nftables rende più ordinata la gestione delle regole firewall rispetto a iptables e ip6tables."
read: "2 min"
tags: ["GNU/Linux", "HowTo", "Administration", "Command Line"]
categories: ["Analisi"]
image: "/blog/covers/iptables_vs_nftables.png"
---
## Introduzione
nftables è il framework del progetto Netfilter introdotto nel kernel Linux come successore di iptables. Nasce per offrire un'interfaccia più coerente e flessibile, sostituendo strumenti separati come `iptables`, `ip6tables`, `arptables` ed `ebtables`.

Con iptables era necessario mantenere separati i set di regole IPv4 e IPv6, gestiti rispettivamente da `iptables` e `ip6tables`.

A parte una nuova sintassi e alcuni aggiornamenti, il funzionamento di nftables è simile a quello del suo predecessore.

## Catene e regole
Le tabelle più comuni di iptables usano catene predefinite come `INPUT`, `OUTPUT` e `FORWARD`. Ogni catena contiene regole valutate in ordine; se nessuna corrisponde, viene applicata la politica predefinita, per esempio `ACCEPT` o `DROP`.

iptables può diventare inefficiente perché i pacchetti attraversano le catene previste anche quando alcune non sono realmente necessarie, introducendo controlli superflui.

nftables mantiene un modello basato su tabelle, catene e regole, ma non impone catene predefinite: è possibile creare soltanto quelle necessarie e collegarle agli hook del kernel appropriati.

## Differenza di sintassi
La sintassi di iptables può diventare difficile da leggere quando le regole crescono. nftables usa una grammatica più uniforme e permette di esprimere molti casi con meno duplicazioni.

Per creare una nuova `rule` si usa una forma simile a questa:

```bash
nft add rule family_type table_name chain_name handle handle_value statement
```

Vediamo alcuni esempi equivalenti tra iptables e nftables.

### Blocco di una connessione
Questo comando blocca il traffico in ingresso dall'indirizzo IP `192.168.7.5`.

```bash
# iptables
iptables -A INPUT -s 192.168.7.5 -j DROP

# nftables
nft add rule ip filter INPUT ip saddr 192.168.7.5 counter drop
```

### Abilitare la connessione SSH in entrata
Questo comando abilita la connessione SSH in entrata.

```bash
# iptables
iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT

# nftables
nft add rule ip filter INPUT tcp dport 22 ct state new,established counter accept
```

Questo comando abilita la connessione SSH in entrata per tutta la rete 192.168.155.0/24.

```bash
# iptables
iptables -A INPUT -p tcp -s 192.168.155.0/24 --dport 22 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT

# nftables
nft add rule ip filter INPUT ip saddr 192.168.155.0/24 tcp dport 22 ct state new,established counter accept
```

### Abilitare la connessione MySQL sull'interfaccia di rete eth0
Con questo comando si abilitano le connessioni sull'interfaccia di rete eth0 verso il server di MySQL.

```bash
# iptables
iptables -A INPUT -i eth0 -p tcp --dport 3306 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT

# nftables
nft add rule ip filter INPUT iifname eth0 tcp dport 3306 ct state new,established counter accept
```

### Abilitare il traffico HTTP e HTTPS
Con questo comando si abilita il traffico sulla porta 80 e sulla 443.

```bash
# iptables
iptables -A INPUT -p tcp -m multiport --dports 80,443 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT

# nftables
nft add rule ip filter INPUT ip protocol tcp tcp dport { 80, 443 } ct state new,established counter accept
```

## Conclusione
nftables offre un modello più uniforme per gestire IPv4, IPv6 e altri protocolli, con una sintassi più leggibile e una configurazione più flessibile. Per approfondire la creazione di tabelle e catene si può consultare la [documentazione di Arch Linux](https://wiki.archlinux.org/title/Nftables).
