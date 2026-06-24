---
title: "iptables vs nftables"
lang: en
translated_from: it
auto_translated: false
date: 2024-05-10
lastmod: 2024-04-20
desc: "Why nftables makes firewall rules easier to organize than separate iptables and ip6tables configurations."
read: "2 min"
tags: ["GNU/Linux", "HowTo", "Administration", "Command Line"]
categories: ["Analysis"]
image: "/blog/covers/iptables_vs_nftables.png"
---
## Introduction
nftables is the Netfilter framework introduced in the Linux kernel as the successor to iptables. It provides a more consistent and flexible interface, replacing separate tools such as `iptables`, `ip6tables`, `arptables`, and `ebtables`.

With iptables, IPv4 and IPv6 rules often had to be maintained separately through `iptables` and `ip6tables`.

Aside from a new syntax and a few updates, nftables works similarly to its predecessor.

## Chains and rules
The most common iptables tables use predefined chains such as `INPUT`, `OUTPUT`, and `FORWARD`. Each chain contains rules evaluated in order; if none matches, the default policy, such as `ACCEPT` or `DROP`, is applied.

iptables can become inefficient because packets traverse the expected chains even when some of them are not actually needed, adding unnecessary checks.

nftables keeps the same conceptual model of tables, chains, and rules, but it does not force predefined chains. You create only the chains you need and attach them to the appropriate kernel hooks.

## Syntax difference
iptables syntax can become hard to read as rules grow. nftables uses a more uniform grammar and can express many cases with less duplication.

To create a new rule you use a form similar to this:

```bash
nft add rule family_type table_name chain_name handle handle_value statement
```

Let's compare a few equivalent examples.

### Blocking a connection
This command blocks an inbound connection from IP 192.168.7.5.

```bash
# iptables
iptables -A INPUT -s 192.168.7.5 -j DROP

# nftables
nft add rule ip filter INPUT ip saddr 192.168.7.5 counter drop
```

### Allowing incoming SSH connections
This command allows incoming SSH connections.

```bash
# iptables
iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT

# nftables
nft add rule ip filter INPUT tcp dport 22 ct state new,established counter accept
```

This command allows incoming SSH connections from the whole 192.168.155.0/24 network.

```bash
# iptables
iptables -A INPUT -p tcp -s 192.168.155.0/24 --dport 22 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT

# nftables
nft add rule ip filter INPUT ip saddr 192.168.155.0/24 tcp dport 22 ct state new,established counter accept
```

### Allowing MySQL traffic on the eth0 network interface
This command allows connections on the eth0 network interface toward the MySQL server.

```bash
# iptables
iptables -A INPUT -i eth0 -p tcp --dport 3306 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT

# nftables
nft add rule ip filter INPUT iifname eth0 tcp dport 3306 ct state new,established counter accept
```

### Allowing HTTP and HTTPS traffic
This command allows traffic on ports 80 and 443.

```bash
# iptables
iptables -A INPUT -p tcp -m multiport --dports 80,443 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT

# nftables
nft add rule ip filter INPUT ip protocol tcp tcp dport { 80, 443 } ct state new,established counter accept
```

## Conclusion
nftables offers a more uniform model for managing IPv4, IPv6, and other protocols, with clearer syntax and more flexible configuration. For more details on creating tables and chains, the [Arch Linux nftables documentation](https://wiki.archlinux.org/title/Nftables) is a good starting point.
