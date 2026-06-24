---
title: "Kill switch for wg-quick and nftables"
lang: en
translated_from: it
auto_translated: false
date: 2024-05-20
lastmod: 2024-04-20
desc: "How I moved kill-switch rules from iptables to nftables inside a wg-quick configuration."
read: "1 min"
tags: ["GNU/Linux", "HowTo", "Administration", "VPN", "Command Line"]
categories: ["Management", "Tutorial", "GNU/Linux"]
image: "/blog/covers/nftables_wg_quick_killswitch.jpeg"
---
## Introduction
A kill switch prevents traffic from leaving through the regular connection when the WireGuard tunnel is not active, avoiding accidental exposure of the real IP address.

After moving from iptables to nftables, I had to translate the rules in my wg-quick peer configuration. Since I could not find useful information at the time, I decided to share the solution I used.

## Configuration
This configuration assumes that nftables rules are reloaded through the init system.

In the wg-quick configuration file, add these two lines:

```bash
PostUp = nft insert rule <family> <table> <chain> ip oifname != "%i" mark != $(wg show %i fwmark) fib daddr type != local counter reject
PostDown = systemctl restart <service>
```

These lines need to be adapted to your system and firewall.

### PostUp
In a terminal, run `nft list ruleset` and look for the `type filter hook output` directive.

Now adjust the `PostUp` line with the information you found. In my case this directive lives in the `firewalld` table, family `inet`, chain `filter_OUTPUT`.

### PostDown
In the `PostDown` line, put the command that reloads the firewall. In this example I use systemd.

## Example
```bash
PostUp = nft insert rule ip inet firewalld filter_OUTPUT oifname != "%i" mark != $(wg show %i fwmark) fib daddr type != local counter reject
PostDown = systemctl restart firewalld.service
```
