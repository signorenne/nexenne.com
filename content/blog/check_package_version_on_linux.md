---
title: "Come verificare la versione di un pacchetto su GNU/Linux"
lang: it
date: 2024-04-09
desc: "Un modo rapido per controllare la versione di un pacchetto installato senza eseguire direttamente il binario."
read: "1 min"
tags: ["GNU/Linux", "HowTo", "Administration"]
categories: ["Management", "Tutorial"]
image: "/blog/covers/check_package_version_on_linux.jpg"
---
## Introduzione
Dopo la scoperta della backdoor in XZ Utils ([CVE-2024-3094](https://nvd.nist.gov/vuln/detail/CVE-2024-3094)), in molti suggerivano di eseguire direttamente `xz --version` per controllare la versione installata.

Se si sospetta che un eseguibile possa essere compromesso, è preferibile non avviarlo nemmeno per conoscerne la versione. Il package manager può fornire la stessa informazione senza eseguire il binario.

Vediamo dunque come verificare correttamente la versione di un pacchetto installato su sistemi GNU/Linux.
Per comodità ho separato le distribuzioni in base al gestore dei pacchetti.

Tenete presente che i comandi seguenti filtrano esplicitamente i pacchetti con `xz` nel nome.

## Debian
Questi comandi funzionano su tutte le distribuzioni basate su Debian.

```bash
# apt
apt list xz

# or with more details
apt show xz

# or with dpkg
dpkg-query -l '*xz*'

# or
dpkg-query -l | grep xz
```

## Fedora
Questi comandi valgono per Fedora e per le distribuzioni che usano RPM e DNF.
Si può usare anche RPM Package Manager (RPM).

```bash
# dnf
dnf list installed xz*

# or
dnf list installed | grep xz

# or with yum
yum list installed | grep xz

# or via RPM
rpm -qa | grep xz
```

## Arch Linux
Questi comandi funzionano anche per le distribuzioni basate su Arch.
Tra cui Manjaro, EndeavourOS e persino SteamOS.

```bash
# pacman
pacman -Qs xz

# or
pacman -Q | grep xz
```

## openSUSE Tumbleweed
I comandi sono validi anche per le distribuzioni basate su SUSE e openSUSE come GeckoLinux e Linux Kamarada.
Si può anche usare RPM.

```bash
# zypper
zypper info xz

# or
rpm -qa | grep xz
```
